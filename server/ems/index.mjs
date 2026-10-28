/**
 * Employee Management System (EMS) API: per-user authentication, role-based access, employee records, master data,
 * documents and an audit log. Mounted by server/api.mjs under /api/auth/* and /api/ems/*.
 * Every protected route re-checks the caller's role on the server; the UI hiding a menu item is never the control.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { COOKIE as ADMIN_COOKIE, HttpError, hashPassword, pwFingerprint } from '../core.mjs';
import { makeSessions, parseCookies } from '../session.mjs';
import { connect, tx } from './db.mjs';
import { createWork } from './work.mjs';

export const SESSION_COOKIE = 'ieg_session';
const DAY = 24 * 60 * 60 * 1000;
const ADMIN_ROLES = ['super_admin', 'admin'];
/** Accounts that always get the full company portal (org charts, layouts, products). Everyone else sees only the work modules unless a super admin grants it. */
const FULL_ACCESS_EMAILS = ['ieg@ieg.com'];
const ROLES = ['super_admin', 'admin', 'manager', 'employee'];
const STATUSES = ['active', 'on_leave', 'probation', 'suspended', 'resigned'];
const MASTER = { departments: { table: 'departments' }, designations: { table: 'designations' }, work_location: { table: 'lookups', kind: 'work_location' }, employment_type: { table: 'lookups', kind: 'employment_type' }, shift: { table: 'lookups', kind: 'shift' } };
const MAX_DOC = 5 * 1024 * 1024, MAX_PHOTO = 2 * 1024 * 1024, MAX_DOCS_PER_EMPLOYEE = 30;

const bad = (m) => { throw new HttpError(400, m); };
const isAdmin = (u) => ADMIN_ROLES.includes(u?.role);

/* ---------------------------------- field definitions ---------------------------------- */
const s = (max, extra = {}) => ({ t: 'str', max, ...extra });
const FIELDS = {
  // company-controlled (admin only)
  employee_code: { ...s(30), admin: true, pattern: /^[A-Za-z0-9-]{3,30}$/, label: 'Employee ID' },
  first_name: { ...s(80), admin: true, required: true, label: 'First name' },
  middle_name: { ...s(80), label: 'Middle name' },
  last_name: { ...s(80), admin: true, label: 'Last name' },
  official_email: { ...s(190), admin: true, email: true, label: 'Official email' },
  joining_date: { t: 'date', admin: true, label: 'Joining date' },
  department_id: { t: 'fk', table: 'departments', admin: true, label: 'Department' },
  designation_id: { t: 'fk', table: 'designations', admin: true, label: 'Designation' },
  manager_id: { t: 'fk', table: 'employees', admin: true, label: 'Reporting manager' },
  employment_type_id: { t: 'fk', table: 'lookups', kind: 'employment_type', admin: true, label: 'Employment type' },
  work_location_id: { t: 'fk', table: 'lookups', kind: 'work_location', admin: true, label: 'Work location' },
  shift_id: { t: 'fk', table: 'lookups', kind: 'shift', admin: true, label: 'Shift timing' },
  status: { t: 'enum', values: STATUSES, admin: true, label: 'Status' },
  probation_end_date: { t: 'date', admin: true, label: 'Probation end date' },
  confirmation_date: { t: 'date', admin: true, label: 'Confirmation date' },
  employment_end_date: { t: 'date', admin: true, label: 'Employment end date' },
  // employee-editable
  date_of_birth: { t: 'date', label: 'Date of birth' },
  gender: s(30, { label: 'Gender' }),
  personal_mobile: s(30, { phone: true, label: 'Mobile number' }),
  personal_email: s(190, { email: true, label: 'Personal email' }),
  current_address: s(500, { label: 'Current address' }),
  permanent_address: s(500, { label: 'Permanent address' }),
  emergency_name: s(120, { label: 'Emergency contact name' }),
  emergency_phone: s(30, { phone: true, label: 'Emergency contact number' }),
  highest_qualification: s(120, { label: 'Highest qualification' }),
  degree: s(160, { label: 'Degree / course' }),
  specialization: s(160, { label: 'Specialization' }),
  institute: s(190, { label: 'University / institute' }),
  passing_year: { t: 'int', min: 1950, max: 2100, label: 'Passing year' },
  additional_qualifications: s(1000, { label: 'Additional qualifications' }),
  certifications: s(1000, { label: 'Certifications' }),
  skills: s(1000, { label: 'Skills and expertise' }),
  previous_experience: s(1500, { label: 'Previous work experience' }),
  previous_employer: s(190, { label: 'Previous employer' }),
  total_experience: s(60, { label: 'Total experience' }),
  blood_group: s(10, { label: 'Blood group' }),
};
/** Fields counted for "profile completion" (what the employee is expected to fill in). */
const COMPLETION = ['personal_mobile', 'date_of_birth', 'current_address', 'permanent_address', 'emergency_name', 'emergency_phone', 'highest_qualification', 'degree', 'institute', 'passing_year', 'skills', 'total_experience'];
/** Fields a manager (who is not the employee) may see. Everything else is HR-confidential. */
const MANAGER_VISIBLE = new Set(['id', 'employee_code', 'first_name', 'middle_name', 'last_name', 'full_name', 'official_email', 'login_email', 'photo_url', 'department_id', 'department', 'designation_id', 'designation', 'manager_id', 'manager_name', 'employment_type', 'work_location', 'shift', 'status', 'joining_date', 'role', 'is_active']);
const TRACKED = ['department_id', 'designation_id', 'manager_id', 'status', 'employment_type_id', 'work_location_id', 'shift_id', 'joining_date'];

const sniffDoc = (b) => {
  if (b.length > 12 && b.subarray(0, 5).toString('latin1') === '%PDF-') return ['pdf', 'application/pdf'];
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ['jpg', 'image/jpeg'];
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ['png', 'image/png'];
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return ['webp', 'image/webp'];
  return null;
};
const csvCell = (v) => { let x = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(x)) x = `'${x}`; return /[",\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
const sha = (x) => createHash('sha256').update(x).digest('hex');
const emailOk = (e) => typeof e === 'string' && e.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function passwordProblem(pw, email) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Password must be at least 10 characters.';
  if (pw.length > 200) return 'Password is too long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain letters and at least one number.';
  if (email && pw.toLowerCase() === String(email).toLowerCase()) return 'Password must not be your email address.';
  return null;
}

/* ------------------------------------------------------------------------------------- */
export async function createEms({ getSecret, dataDir, legacyAdmins = async () => [], env = process.env }) {
  const pool = await connect(env);
  const { sign, verify } = makeSessions(getSecret);
  const UPLOADS = path.join(dataDir, 'ems-uploads');
  await mkdir(UPLOADS, { recursive: true });

  /* ---------- bootstrap: first super admin ---------- */
  const [[{ n: userCount }]] = await pool.query('SELECT COUNT(*) AS n FROM users');
  if (userCount === 0) {
    const legacy = (await legacyAdmins()).filter((a) => a && a.email && a.salt && a.hash);
    for (const a of legacy) {
      const [r] = await pool.query("INSERT INTO users (email, password_salt, password_hash, role) VALUES (?,?,?, 'super_admin')", [a.email.toLowerCase(), a.salt, a.hash]);
      await pool.query("INSERT INTO employees (user_id, first_name, status) VALUES (?, 'Administrator', 'active')", [r.insertId]);
      console.log(`[ems] imported existing admin as super admin: ${a.email}`);
    }
    if (!legacy.length && env.BOOTSTRAP_ADMIN_EMAIL && env.BOOTSTRAP_ADMIN_PASSWORD) {
      const prob = passwordProblem(env.BOOTSTRAP_ADMIN_PASSWORD, env.BOOTSTRAP_ADMIN_EMAIL);
      if (prob || !emailOk(env.BOOTSTRAP_ADMIN_EMAIL)) console.error(`[ems] BOOTSTRAP_ADMIN_* ignored: ${prob || 'invalid email'}`);
      else {
        const { salt, hash } = await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD);
        const [r] = await pool.query("INSERT INTO users (email, password_salt, password_hash, role) VALUES (?,?,?, 'super_admin')", [env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(), salt, hash]);
        await pool.query("INSERT INTO employees (user_id, first_name, status) VALUES (?, 'Administrator', 'active')", [r.insertId]);
        console.log(`[ems] created first super admin from BOOTSTRAP_ADMIN_EMAIL: ${env.BOOTSTRAP_ADMIN_EMAIL}. Remove BOOTSTRAP_ADMIN_PASSWORD from the environment now.`);
      }
    }
  }

  for (const em of FULL_ACCESS_EMAILS) await pool.query('UPDATE users SET portal_full = 1 WHERE email = ?', [em]);

  /* ---------- users and sessions ---------- */
  const userSql = `SELECT u.*, e.id AS employee_id, e.first_name, e.last_name FROM users u LEFT JOIN employees e ON e.user_id = u.id`;
  const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
  const publicUser = (u) => ({ id: u.id, email: u.email, role: u.role, name: fullName(u), employeeId: u.employee_id ?? null, mustChangePassword: !!u.must_change_password, fullAccess: !!u.portal_full });
  async function userById(id) { const [r] = await pool.query(`${userSql} WHERE u.id = ?`, [id]); return r[0] || null; }
  async function userByEmail(email) { const [r] = await pool.query(`${userSql} WHERE u.email = ?`, [String(email).trim().toLowerCase()]); return r[0] || null; }

  async function currentUser(headers) {
    const c = parseCookies(headers.cookie);
    const p = await verify(c[SESSION_COOKIE]);
    if (p?.uid) {
      const u = await userById(p.uid);
      if (u && u.is_active && u.token_version === p.tv) return u;
    }
    const a = await verify(c[ADMIN_COOKIE]); // the admin panel's own sign-in also counts
    if (a?.email) { const u = await userByEmail(a.email); if (u && u.is_active && isAdmin(u) && a.fp === pwFingerprint(u.password_hash)) return u; }
    return null;
  }
  const sessionCookie = async (u, remember, https) => {
    const token = await sign({ uid: u.id, tv: u.token_version, exp: Date.now() + (remember ? 30 * DAY : 12 * 60 * 60 * 1000) });
    return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${remember ? `; Max-Age=${30 * 24 * 3600}` : ''}${https ? '; Secure' : ''}`;
  };
  const clearCookie = (name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

  /** For the admin core: admin/super-admin accounts (same salt/hash format as the legacy admin.json). */
  const getAdmins = async () => { const [r] = await pool.query("SELECT email, password_salt AS salt, password_hash AS hash FROM users WHERE role IN ('super_admin','admin') AND is_active = 1"); return r; };
  const resolveAdmin = async (headers) => { const p = await verify(parseCookies(headers.cookie)[SESSION_COOKIE]); if (!p?.uid) return null; const u = await userById(p.uid); return u && u.is_active && u.token_version === p.tv && isAdmin(u) ? { email: u.email } : null; };

  /* ---------- helpers ---------- */
  const json = (status, obj, headers = {}) => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }, body: JSON.stringify(obj) });
  function readJson(r, limit = 64 * 1024) {
    if (!String(r.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Send JSON.');
    const raw = r.body ?? Buffer.alloc(0);
    if (raw.length > limit) throw new HttpError(413, 'That request is too large.');
    try { const b = raw.length ? JSON.parse(raw.toString('utf8')) : {}; if (!b || typeof b !== 'object' || Array.isArray(b)) bad('Invalid request.'); return b; } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'Invalid JSON.'); }
  }
  async function audit(actor, action, entity, entityId, detail, ip) {
    try { await pool.query('INSERT INTO audit_logs (actor_user_id, actor_email, action, entity, entity_id, detail, ip) VALUES (?,?,?,?,?,?,?)', [actor?.id ?? null, actor?.email ?? null, action, entity ?? null, entityId == null ? null : String(entityId), detail ? JSON.stringify(detail) : null, ip ?? null]); } catch (e) { console.error('[ems] audit failed', e.message); }
  }
  const need = (u) => { if (!u) throw new HttpError(401, 'Please sign in.'); return u; };
  const needAdmin = (u) => { need(u); if (!isAdmin(u)) throw new HttpError(403, 'You do not have permission to do that.'); return u; };

  /* login throttling: per IP and per account, in memory */
  const fails = new Map();
  const WINDOW = 10 * 60 * 1000, MAX_FAILS = 10; // per account / per link; one office often shares one IP, so the IP limit is higher
  const IP_MAX_FAILS = 40;
  const throttled = (k) => { const f = fails.get(k); if (!f) return false; if (Date.now() - f.first > WINDOW) { fails.delete(k); return false; } return f.count >= (/^[ec]:/.test(String(k)) ? MAX_FAILS : IP_MAX_FAILS); };
  const noteFail = (k) => { const f = fails.get(k); if (!f || Date.now() - f.first > WINDOW) fails.set(k, { count: 1, first: Date.now() }); else f.count++; };

  /* ---------- employee records ---------- */
  const empSql = `SELECT e.*, u.email AS login_email, u.role, u.is_active, u.must_change_password, u.last_login_at, u.portal_full,
      d.name AS department, g.name AS designation, et.name AS employment_type, wl.name AS work_location, sh.name AS shift,
      CONCAT_WS(' ', m.first_name, m.last_name) AS manager_name
    FROM employees e JOIN users u ON u.id = e.user_id
    LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN designations g ON g.id = e.designation_id
    LEFT JOIN lookups et ON et.id = e.employment_type_id LEFT JOIN lookups wl ON wl.id = e.work_location_id LEFT JOIN lookups sh ON sh.id = e.shift_id
    LEFT JOIN employees m ON m.id = e.manager_id`;

  function completion(e) {
    const missing = COMPLETION.filter((k) => e[k] == null || e[k] === '');
    return { percent: Math.round(((COMPLETION.length - missing.length) / COMPLETION.length) * 100), missing: missing.map((k) => FIELDS[k].label) };
  }
  function toDto(e, viewer) {
    const self = viewer.employee_id === e.id;
    const out = { ...e, full_name: [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' '), photo_url: e.photo_file ? `/api/ems/employees/${e.id}/photo` : null };
    delete out.photo_file; delete out.user_id;
    out.is_active = !!out.is_active; out.must_change_password = !!out.must_change_password; out.portal_full = !!out.portal_full;
    out.profile_completion = completion(e);
    if (isAdmin(viewer) || self) { out.editable = isAdmin(viewer) ? 'all' : 'self'; return out; }
    const limited = {}; for (const k of Object.keys(out)) if (MANAGER_VISIBLE.has(k)) limited[k] = out[k];
    limited.editable = 'none';
    return limited;
  }
  async function loadEmployee(id) { const [r] = await pool.query(`${empSql} WHERE e.id = ?`, [id]); return r[0] || null; }
  function canView(viewer, e) {
    if (isAdmin(viewer)) return true;
    if (viewer.employee_id === e.id) return true;
    return viewer.role === 'manager' && viewer.employee_id != null && e.manager_id === viewer.employee_id;
  }
  async function getVisible(viewer, id) {
    if (!Number.isInteger(id)) throw new HttpError(404, 'Employee not found.');
    const e = await loadEmployee(id);
    if (!e || !canView(viewer, e)) throw new HttpError(404, 'Employee not found.'); // same answer for "missing" and "not yours"
    return e;
  }

  /** Validate a body against FIELDS. `canAdmin` allows company-controlled fields; other names are rejected, not ignored. */
  async function validateFields(body, { canAdmin, partial, conn = pool, selfId = null }) {
    const out = {};
    for (const [k, v] of Object.entries(body)) {
      const f = FIELDS[k];
      if (!f) continue; // unknown keys are handled by the caller
      if (f.admin && !canAdmin) throw new HttpError(403, `${f.label} can only be changed by HR/admin.`);
      const empty = v == null || (typeof v === 'string' && v.trim() === '');
      if (empty) { if (f.required) bad(`${f.label} is required.`); out[k] = null; continue; }
      if (f.t === 'str') {
        if (typeof v !== 'string') bad(`${f.label} is invalid.`);
        const t = v.trim();
        if (t.length > f.max) bad(`${f.label} must be ${f.max} characters or fewer.`);
        if (f.email && !emailOk(t)) bad(`${f.label} must be a valid email address.`);
        if (f.phone && !/^[0-9+()\-.\s]{6,30}$/.test(t)) bad(`${f.label} must be a valid phone number.`);
        if (f.pattern && !f.pattern.test(t)) bad(`${f.label} may contain letters, numbers and hyphens (3 to 30 characters).`);
        out[k] = t;
      } else if (f.t === 'date') {
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) bad(`${f.label} must be a valid date (YYYY-MM-DD).`);
        if (k === 'date_of_birth' && (v > new Date().toISOString().slice(0, 10) || v < '1930-01-01')) bad('Enter a valid date of birth.');
        out[k] = v;
      } else if (f.t === 'int') {
        const n = Number(v); if (!Number.isInteger(n) || n < f.min || n > f.max) bad(`${f.label} must be a number from ${f.min} to ${f.max}.`); out[k] = n;
      } else if (f.t === 'enum') {
        if (!f.values.includes(v)) bad(`${f.label} is invalid.`); out[k] = v;
      } else if (f.t === 'fk') {
        const n = Number(v); if (!Number.isInteger(n) || n < 1) bad(`${f.label} is invalid.`);
        const [rows] = f.table === 'lookups' ? await conn.query('SELECT id FROM lookups WHERE id = ? AND kind = ?', [n, f.kind]) : await conn.query(`SELECT id FROM ${f.table} WHERE id = ?`, [n]);
        if (!rows.length) bad(`${f.label} was not found.`);
        if (k === 'manager_id' && selfId != null && n === selfId) bad('An employee cannot report to themselves.');
        out[k] = n;
      }
    }
    if (!partial && !out.first_name) bad('First name is required.');
    return out;
  }
  async function recordHistory(conn, employeeId, before, after, by) {
    for (const k of TRACKED) {
      if (!(k in after)) continue;
      if (String(before[k] ?? '') === String(after[k] ?? '')) continue;
      await conn.query('INSERT INTO employment_history (employee_id, field, old_value, new_value, changed_by) VALUES (?,?,?,?,?)', [employeeId, k, before[k] ?? null, after[k] ?? null, by]);
    }
  }
  const setClause = (obj) => ({ sql: Object.keys(obj).map((k) => `\`${k}\` = ?`).join(', '), vals: Object.values(obj) });
  const origin = (r) => `${r.https ? 'https' : 'http'}://${r.headers.host || r.host}`;

  async function newSetupToken(conn, userId, hours = 72) {
    const raw = randomBytes(32).toString('base64url');
    await conn.query('UPDATE password_setup_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [userId]);
    await conn.query('INSERT INTO password_setup_tokens (user_id, token_hash, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL ? HOUR))', [userId, sha(raw), hours]);
    return raw;
  }

  async function lastSuperAdminGuard(conn, userId) {
    const [rows] = await conn.query("SELECT id FROM users WHERE role = 'super_admin' AND is_active = 1 AND id <> ?", [userId]);
    if (!rows.length) throw new HttpError(409, 'There must always be at least one active super admin.');
  }

  /* ---------- listing / export ---------- */
  const SORTS = { name: 'e.first_name', code: 'e.employee_code', joining: 'e.joining_date', department: 'd.name', status: 'e.status', designation: 'g.name', created: 'e.created_at' };
  function listWhere(viewer, qs) {
    const where = [], vals = [];
    if (!isAdmin(viewer)) { where.push('e.manager_id = ?'); vals.push(viewer.employee_id ?? -1); }
    const q = (qs.get('q') || '').trim();
    if (q) { where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR u.email LIKE ? OR e.personal_mobile LIKE ?)'); const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`; vals.push(like, like, like, like, like); }
    for (const [param, col] of [['department_id', 'e.department_id'], ['designation_id', 'e.designation_id'], ['manager_id', 'e.manager_id']]) { const n = Number(qs.get(param)); if (Number.isInteger(n) && n > 0) { where.push(`${col} = ?`); vals.push(n); } }
    const st = qs.get('status'); if (st && STATUSES.includes(st)) { where.push('e.status = ?'); vals.push(st); }
    const role = qs.get('role'); if (role && ROLES.includes(role)) { where.push('u.role = ?'); vals.push(role); }
    const act = qs.get('active'); if (act === '1' || act === '0') { where.push('u.is_active = ?'); vals.push(Number(act)); }
    return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', vals };
  }
  const orderBy = (qs) => ` ORDER BY ${SORTS[qs.get('sort')] || SORTS.name} ${qs.get('dir') === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`;

  const work = createWork({ pool, json, readJson, audit, need, isAdmin });

  /* ---------- request router ---------- */
  async function route(r) {
    const p = r.pathname, m = r.method;
    if (m !== 'GET' && m !== 'HEAD') { // CSRF: state-changing calls must come from this site
      const o = r.headers.origin; let host = null;
      try { host = o ? new URL(o).host : null; } catch { throw new HttpError(403, 'Cross-site request blocked.'); }
      if (host && host !== r.host && host !== r.headers.host) throw new HttpError(403, 'Cross-site request blocked.');
    }
    const qs = new URLSearchParams(r.search || '');

    /* ----- authentication ----- */
    if (m === 'POST' && p === '/api/auth/login') {
      if (throttled(r.ip)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
      const b = readJson(r);
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      if (!emailOk(email) || typeof b.password !== 'string' || !b.password || b.password.length > 200) { noteFail(r.ip); throw new HttpError(401, 'Incorrect email or password. Check your details and try again.'); }
      if (throttled(`e:${email}`)) throw new HttpError(429, 'Too many attempts for this account. Please wait a few minutes and try again.');
      const u = await userByEmail(email);
      const { hash } = await hashPassword(b.password, u?.password_salt); // always hash: timing does not reveal valid emails
      const good = u && u.is_active && Buffer.from(hash, 'hex').length === Buffer.from(u.password_hash, 'hex').length && timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(u.password_hash, 'hex'));
      if (!good) { noteFail(r.ip); noteFail(`e:${email}`); await audit(null, 'auth.login_failed', 'user', u?.id, { email }, r.ip); throw new HttpError(401, 'Incorrect email or password. Check your details and try again.'); }
      fails.delete(r.ip); fails.delete(`e:${email}`);
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [u.id]);
      await audit(u, 'auth.login', 'user', u.id, null, r.ip);
      return json(200, publicUser(u), { 'Set-Cookie': await sessionCookie(u, b.remember === true, r.https) });
    }
    if (m === 'POST' && p === '/api/auth/logout') { const u = await currentUser(r.headers); if (u) await audit(u, 'auth.logout', 'user', u.id, null, r.ip); return { ...json(200, { ok: true }), headers: { ...json(200, {}).headers, 'Set-Cookie': [clearCookie(SESSION_COOKIE), clearCookie(ADMIN_COOKIE)] } }; }
    if (m === 'GET' && p === '/api/auth/me') return json(200, publicUser(need(await currentUser(r.headers))));
    if (m === 'GET' && p === '/api/auth/setup-info') {
      const [rows] = await pool.query('SELECT u.email, e.first_name FROM password_setup_tokens t JOIN users u ON u.id = t.user_id LEFT JOIN employees e ON e.user_id = u.id WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW() AND u.is_active = 1', [sha(String(qs.get('token') || ''))]);
      if (!rows.length) throw new HttpError(410, 'This link has expired or was already used. Ask HR for a new one.');
      return json(200, { email: rows[0].email, name: rows[0].first_name });
    }
    if (m === 'POST' && p === '/api/auth/setup-password') {
      if (throttled(r.ip)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
      const b = readJson(r);
      const [rows] = await pool.query('SELECT t.id, t.user_id FROM password_setup_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW() AND u.is_active = 1', [sha(String(b.token || ''))]);
      if (!rows.length) { noteFail(r.ip); throw new HttpError(410, 'This link has expired or was already used. Ask HR for a new one.'); }
      const u = await userById(rows[0].user_id);
      const prob = passwordProblem(b.password, u.email); if (prob) bad(prob);
      const { salt, hash } = await hashPassword(b.password);
      await tx(pool, async (c) => {
        await c.query('UPDATE users SET password_salt = ?, password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?', [salt, hash, u.id]);
        await c.query('UPDATE password_setup_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [u.id]);
      });
      const fresh = await userById(u.id);
      await audit(fresh, 'auth.password_setup', 'user', u.id, null, r.ip);
      return json(200, publicUser(fresh), { 'Set-Cookie': await sessionCookie(fresh, false, r.https) });
    }
    if (m === 'POST' && p === '/api/auth/change-password') {
      const u = need(await currentUser(r.headers));
      if (throttled(`c:${u.id}`)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
      const b = readJson(r);
      const { hash } = await hashPassword(String(b.current || ''), u.password_salt);
      if (!timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(u.password_hash, 'hex'))) { noteFail(`c:${u.id}`); throw new HttpError(400, 'Your current password is not correct.'); }
      const prob = passwordProblem(b.password, u.email); if (prob) bad(prob);
      if (b.password === b.current) bad('Choose a password different from your current one.');
      const next = await hashPassword(b.password);
      await pool.query('UPDATE users SET password_salt = ?, password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?', [next.salt, next.hash, u.id]);
      const fresh = await userById(u.id);
      await audit(fresh, 'auth.password_changed', 'user', u.id, null, r.ip);
      return json(200, publicUser(fresh), { 'Set-Cookie': await sessionCookie(fresh, false, r.https) });
    }

    if (!p.startsWith('/api/ems/')) throw new HttpError(404, 'Not found.');
    const user = need(await currentUser(r.headers));
    { const w = await work.route(r, user, qs); if (w) return w; }

    /* ----- own profile (self-service) ----- */
    if (p === '/api/ems/me' && m === 'GET') { if (user.employee_id == null) throw new HttpError(404, 'No employee profile is linked to this account.'); return json(200, toDto(await loadEmployee(user.employee_id), user)); }
    if (p === '/api/ems/me' && m === 'PATCH') {
      if (user.employee_id == null) throw new HttpError(404, 'No employee profile is linked to this account.');
      const b = readJson(r);
      const unknown = Object.keys(b).filter((k) => !FIELDS[k]); if (unknown.length) bad('Some fields cannot be edited here.');
      const vals = await validateFields(b, { canAdmin: false, partial: true });
      if (!Object.keys(vals).length) bad('Nothing to update.');
      const sc = setClause(vals);
      await pool.query(`UPDATE employees SET ${sc.sql} WHERE id = ?`, [...sc.vals, user.employee_id]);
      await audit(user, 'profile.update_self', 'employee', user.employee_id, { fields: Object.keys(vals) }, r.ip);
      return json(200, toDto(await loadEmployee(user.employee_id), user));
    }

    /* ----- master data ----- */
    if (p === '/api/ems/master' && m === 'GET') {
      const all = isAdmin(user) && qs.get('all') === '1';
      const f = all ? '' : ' WHERE is_active = 1';
      const lk = async (kind) => (await pool.query(`SELECT id, name, is_active FROM lookups WHERE kind = ?${all ? '' : ' AND is_active = 1'} ORDER BY name`, [kind]))[0];
      return json(200, {
        departments: (await pool.query(`SELECT id, name, is_active FROM departments${f} ORDER BY name`))[0],
        designations: (await pool.query(`SELECT id, name, is_active FROM designations${f} ORDER BY name`))[0],
        work_location: await lk('work_location'), employment_type: await lk('employment_type'), shift: await lk('shift'),
      });
    }
    let mm;
    if ((mm = p.match(/^\/api\/ems\/master\/([a-z_]+)(?:\/(\d+))?$/))) {
      needAdmin(user);
      const def = MASTER[mm[1]]; if (!def) throw new HttpError(404, 'Not found.');
      const kindCond = def.kind ? ' AND kind = ?' : '';
      if (m === 'POST' && !mm[2]) {
        const b = readJson(r); const name = typeof b.name === 'string' ? b.name.trim() : '';
        if (!name || name.length > 120) bad('Name must be 1 to 120 characters.');
        try {
          const [res] = def.kind ? await pool.query('INSERT INTO lookups (kind, name) VALUES (?,?)', [def.kind, name]) : await pool.query(`INSERT INTO ${def.table} (name) VALUES (?)`, [name]);
          await audit(user, 'master.create', mm[1], res.insertId, { name }, r.ip);
          return json(201, { id: res.insertId, name, is_active: true });
        } catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That name already exists.'); throw e; }
      }
      if (m === 'PATCH' && mm[2]) {
        const b = readJson(r); const sets = {}, id = Number(mm[2]);
        if ('name' in b) { const name = typeof b.name === 'string' ? b.name.trim() : ''; if (!name || name.length > 120) bad('Name must be 1 to 120 characters.'); sets.name = name; }
        if ('is_active' in b) { if (typeof b.is_active !== 'boolean') bad('Invalid status.'); sets.is_active = b.is_active ? 1 : 0; }
        if (!Object.keys(sets).length) bad('Nothing to update.');
        const sc = setClause(sets);
        try {
          const [res] = await pool.query(`UPDATE ${def.table} SET ${sc.sql} WHERE id = ?${kindCond}`, [...sc.vals, id, ...(def.kind ? [def.kind] : [])]);
          if (!res.affectedRows) throw new HttpError(404, 'Not found.');
        } catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That name already exists.'); throw e; }
        await audit(user, 'master.update', mm[1], id, sets, r.ip);
        return json(200, { ok: true });
      }
      throw new HttpError(405, 'Method not allowed.');
    }

    /* ----- audit log ----- */
    if (p === '/api/ems/audit' && m === 'GET') {
      needAdmin(user);
      const page = Math.max(1, Number(qs.get('page')) || 1), size = 50, where = [], vals = [];
      const q = (qs.get('q') || '').trim(); if (q) { where.push('(actor_email LIKE ? OR action LIKE ? OR entity LIKE ?)'); const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`; vals.push(like, like, like); }
      const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM audit_logs${w}`, vals);
      const [rows] = await pool.query(`SELECT id, actor_email, action, entity, entity_id, detail, ip, created_at FROM audit_logs${w} ORDER BY id DESC LIMIT ? OFFSET ?`, [...vals, size, (page - 1) * size]);
      return json(200, { items: rows.map((x) => ({ ...x, detail: x.detail ? JSON.parse(x.detail) : null })), total: n, page, pageSize: size });
    }

    /* ----- directory helpers (admin forms) ----- */
    if (p === '/api/ems/summary' && m === 'GET') {
      needAdmin(user);
      const [[a]] = await pool.query("SELECT COUNT(*) AS total, SUM(u.is_active = 1) AS active_logins, SUM(e.status = 'active') AS status_active, SUM(e.status = 'probation') AS probation, SUM(e.status = 'on_leave') AS on_leave FROM employees e JOIN users u ON u.id = e.user_id");
      return json(200, { total: Number(a.total), activeLogins: Number(a.active_logins || 0), active: Number(a.status_active || 0), probation: Number(a.probation || 0), onLeave: Number(a.on_leave || 0) });
    }
    if (p === '/api/ems/directory' && m === 'GET') {
      needAdmin(user);
      const [rows] = await pool.query("SELECT e.id, e.employee_code, CONCAT_WS(' ', e.first_name, e.last_name) AS name, u.role FROM employees e JOIN users u ON u.id = e.user_id WHERE u.is_active = 1 ORDER BY e.first_name");
      return json(200, rows);
    }

    /* ----- employees ----- */
    if (p === '/api/ems/employees' && m === 'GET') {
      if (!isAdmin(user) && user.role !== 'manager') throw new HttpError(403, 'You do not have permission to do that.');
      const w = listWhere(user, qs);
      const page = Math.max(1, Number(qs.get('page')) || 1), size = Math.min(100, Math.max(5, Number(qs.get('page_size')) || 20));
      const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN designations g ON g.id = e.designation_id${w.sql}`, w.vals);
      const [rows] = await pool.query(`${empSql}${w.sql}${orderBy(qs)} LIMIT ? OFFSET ?`, [...w.vals, size, (page - 1) * size]);
      return json(200, { items: rows.map((e) => toDto(e, user)), total: n, page, pageSize: size });
    }
    if (p === '/api/ems/employees/export.csv' && m === 'GET') {
      needAdmin(user);
      const w = listWhere(user, qs);
      const [rows] = await pool.query(`${empSql}${w.sql}${orderBy(qs)} LIMIT 5000`, w.vals);
      const cols = [['employee_code', 'Employee ID'], ['first_name', 'First name'], ['middle_name', 'Middle name'], ['last_name', 'Last name'], ['login_email', 'Login email'], ['official_email', 'Official email'], ['personal_mobile', 'Mobile'], ['department', 'Department'], ['designation', 'Designation'], ['manager_name', 'Reporting manager'], ['employment_type', 'Employment type'], ['work_location', 'Work location'], ['shift', 'Shift'], ['status', 'Status'], ['role', 'Role'], ['joining_date', 'Joining date']];
      const csv = [cols.map((c) => csvCell(c[1])).join(','), ...rows.map((e) => cols.map((c) => csvCell(e[c[0]])).join(','))].join('\r\n');
      await audit(user, 'employees.export', 'employee', null, { rows: rows.length }, r.ip);
      return { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ieg-employees.csv"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, body: `﻿${csv}` };
    }
    if (p === '/api/ems/employees' && m === 'POST') {
      needAdmin(user);
      const b = readJson(r);
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      if (!emailOk(email)) bad('Enter a valid login email address.');
      const role = b.role == null ? 'employee' : b.role;
      if (!ROLES.includes(role)) bad('Choose a valid role.');
      if (ADMIN_ROLES.includes(role) && user.role !== 'super_admin') throw new HttpError(403, 'Only a super admin can create admin accounts.');
      const known = Object.keys(b).filter((k) => !FIELDS[k] && !['email', 'role', 'temporary_password'].includes(k)); if (known.length) bad('Some fields are not recognised.');
      const fields = await validateFields(b, { canAdmin: true, partial: false });
      if (b.temporary_password != null && b.temporary_password !== '') { const prob = passwordProblem(b.temporary_password, email); if (prob) bad(prob); }
      if (await userByEmail(email)) throw new HttpError(409, 'An account with that email already exists.');
      let setupToken = null;
      let employeeId;
      try {
        employeeId = await tx(pool, async (c) => {
          const cred = await hashPassword(b.temporary_password ? b.temporary_password : randomBytes(24).toString('hex')); // with a setup link the password is unknowable until the employee sets one
          const [u] = await c.query('INSERT INTO users (email, password_salt, password_hash, role, must_change_password, portal_full) VALUES (?,?,?,?,1,?)', [email, cred.salt, cred.hash, role, FULL_ACCESS_EMAILS.includes(email) ? 1 : 0]);
          const cols = { user_id: u.insertId, ...fields, official_email: fields.official_email ?? email };
          const [e] = await c.query(`INSERT INTO employees (${Object.keys(cols).map((k) => `\`${k}\``).join(',')}) VALUES (${Object.keys(cols).map(() => '?').join(',')})`, Object.values(cols));
          if (!fields.employee_code) await c.query('UPDATE employees SET employee_code = ? WHERE id = ?', [`IEG-${String(e.insertId).padStart(4, '0')}`, e.insertId]);
          if (!b.temporary_password) setupToken = await newSetupToken(c, u.insertId);
          return e.insertId;
        });
      } catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That employee ID or email already exists.'); throw e; }
      await audit(user, 'employee.create', 'employee', employeeId, { email, role }, r.ip);
      return json(201, { employee: toDto(await loadEmployee(employeeId), user), setupUrl: setupToken ? `${origin(r)}/setup-password?token=${setupToken}` : null, setupExpiresHours: setupToken ? 72 : null });
    }

    if ((mm = p.match(/^\/api\/ems\/employees\/(\d+)(?:\/([a-z-]+))?$/))) {
      const id = Number(mm[1]), sub = mm[2];
      if (!sub && m === 'GET') {
        const e = await getVisible(user, id);
        const dto = toDto(e, user);
        if (isAdmin(user) || user.employee_id === e.id) {
          dto.documents = (await pool.query('SELECT id, label, original_name, mime, size_bytes, created_at FROM employee_documents WHERE employee_id = ? ORDER BY id DESC', [id]))[0];
          const hist = (await pool.query('SELECT field, old_value, new_value, changed_at FROM employment_history WHERE employee_id = ? ORDER BY id DESC LIMIT 50', [id]))[0];
          // show names instead of record numbers for linked items (department, designation, manager, ...)
          const lookup = { department_id: ['departments', 'name'], designation_id: ['designations', 'name'], employment_type_id: ['lookups', 'name'], work_location_id: ['lookups', 'name'], shift_id: ['lookups', 'name'] };
          const ids = { departments: new Set(), designations: new Set(), lookups: new Set(), managers: new Set() };
          for (const h of hist) { const L = lookup[h.field]; for (const v of [h.old_value, h.new_value]) if (/^\d+$/.test(v ?? '')) { if (L) ids[L[0]].add(Number(v)); else if (h.field === 'manager_id') ids.managers.add(Number(v)); } }
          const names = { departments: new Map(), designations: new Map(), lookups: new Map(), managers: new Map() };
          for (const t of ['departments', 'designations', 'lookups']) if (ids[t].size) for (const row of (await pool.query(`SELECT id, name FROM ${t} WHERE id IN (${[...ids[t]].map(() => '?').join(',')})`, [...ids[t]]))[0]) names[t].set(row.id, row.name);
          if (ids.managers.size) for (const row of (await pool.query(`SELECT id, CONCAT_WS(' ', first_name, last_name) AS name FROM employees WHERE id IN (${[...ids.managers].map(() => '?').join(',')})`, [...ids.managers]))[0]) names.managers.set(row.id, row.name);
          const nm = (h, v) => { if (v == null || !/^\d+$/.test(v)) return v; const L = lookup[h.field]; return (L ? names[L[0]].get(Number(v)) : h.field === 'manager_id' ? names.managers.get(Number(v)) : null) ?? v; };
          dto.history = hist.map((h) => ({ ...h, old_value: nm(h, h.old_value), new_value: nm(h, h.new_value) }));
        }
        return json(200, dto);
      }
      if (!sub && m === 'PATCH') {
        const e = await getVisible(user, id);
        const self = user.employee_id === e.id;
        if (!isAdmin(user) && !self) throw new HttpError(403, 'You do not have permission to do that.');
        const b = readJson(r);
        let role;
        if ('role' in b) {
          needAdmin(user); role = b.role; if (!ROLES.includes(role)) bad('Choose a valid role.');
          if ((ADMIN_ROLES.includes(role) || ADMIN_ROLES.includes(e.role)) && user.role !== 'super_admin') throw new HttpError(403, 'Only a super admin can change admin roles.');
          if (e.id === user.employee_id && role !== e.role) throw new HttpError(409, 'You cannot change your own role.');
          delete b.role;
        }
        const unknown = Object.keys(b).filter((k) => !FIELDS[k]); if (unknown.length) bad('Some fields cannot be edited.');
        const vals = await validateFields(b, { canAdmin: isAdmin(user), partial: true, selfId: id });
        if (!Object.keys(vals).length && !role) bad('Nothing to update.');
        await tx(pool, async (c) => {
          if (role && role !== e.role) { if (e.role === 'super_admin') await lastSuperAdminGuard(c, e.user_id); await c.query('UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ?', [role, e.user_id]); }
          if (Object.keys(vals).length) { const sc = setClause(vals); await c.query(`UPDATE employees SET ${sc.sql} WHERE id = ?`, [...sc.vals, id]); await recordHistory(c, id, e, vals, user.id); }
        }).catch((er) => { if (er.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That employee ID already exists.'); throw er; });
        await audit(user, self && !isAdmin(user) ? 'profile.update_self' : 'employee.update', 'employee', id, { fields: Object.keys(vals), role: role && role !== e.role ? role : undefined }, r.ip);
        return json(200, toDto(await loadEmployee(id), user));
      }
      if (sub === 'deactivate' && m === 'POST') {
        needAdmin(user); const e = await getVisible(user, id);
        if (e.user_id === user.id) throw new HttpError(409, 'You cannot deactivate your own account.');
        if (ADMIN_ROLES.includes(e.role) && user.role !== 'super_admin') throw new HttpError(403, 'Only a super admin can deactivate admin accounts.');
        await tx(pool, async (c) => { if (e.role === 'super_admin') await lastSuperAdminGuard(c, e.user_id); await c.query('UPDATE users SET is_active = 0, token_version = token_version + 1 WHERE id = ?', [e.user_id]); });
        await audit(user, 'employee.deactivate', 'employee', id, null, r.ip);
        return json(200, toDto(await loadEmployee(id), user));
      }
      if (sub === 'portal-access' && m === 'POST') { // who may see the company portal pages (org charts, layouts, products)
        if (user.role !== 'super_admin') throw new HttpError(403, 'Only a super admin can change portal access.');
        const e = await getVisible(user, id); const full = !!readJson(r).full;
        if (!full && FULL_ACCESS_EMAILS.includes(e.login_email)) throw new HttpError(409, 'This account always has full access.');
        await pool.query('UPDATE users SET portal_full = ? WHERE id = ?', [full ? 1 : 0, e.user_id]);
        await audit(user, 'employee.portal_access', 'employee', id, { full }, r.ip);
        return json(200, toDto(await loadEmployee(id), user));
      }
      if (sub === 'reactivate' && m === 'POST') {
        needAdmin(user); const e = await getVisible(user, id);
        await pool.query('UPDATE users SET is_active = 1 WHERE id = ?', [e.user_id]);
        await audit(user, 'employee.reactivate', 'employee', id, null, r.ip);
        return json(200, toDto(await loadEmployee(id), user));
      }
      if (sub === 'reset-password' && m === 'POST') {
        needAdmin(user); const e = await getVisible(user, id);
        if (ADMIN_ROLES.includes(e.role) && user.role !== 'super_admin') throw new HttpError(403, 'Only a super admin can reset admin passwords.');
        if (!e.is_active) throw new HttpError(409, 'Reactivate the account first.');
        const token = await tx(pool, async (c) => {
          const cred = await hashPassword(randomBytes(24).toString('hex')); // the old password stops working immediately
          await c.query('UPDATE users SET password_salt = ?, password_hash = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?', [cred.salt, cred.hash, e.user_id]);
          return newSetupToken(c, e.user_id);
        });
        await audit(user, 'employee.reset_password', 'employee', id, null, r.ip);
        return json(200, { setupUrl: `${origin(r)}/setup-password?token=${token}`, setupExpiresHours: 72 });
      }
      if (sub === 'photo') {
        const e = await loadEmployee(id); if (!e) throw new HttpError(404, 'Not found.');
        if (m === 'GET') {
          if (!e.photo_file) throw new HttpError(404, 'Not found.');
          const buf = await readFile(path.join(UPLOADS, e.photo_file)).catch(() => null); if (!buf) throw new HttpError(404, 'Not found.');
          return { status: 200, headers: { 'Content-Type': sniffDoc(buf)?.[1] || 'application/octet-stream', 'Content-Length': String(buf.length), 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" }, body: buf };
        }
        if (m === 'POST') {
          if (!isAdmin(user) && user.employee_id !== id) throw new HttpError(403, 'You do not have permission to do that.');
          const buf = r.body ?? Buffer.alloc(0); if (!buf.length || buf.length > MAX_PHOTO) bad('Photo must be a JPG, PNG or WebP image up to 2 MB.');
          const kind = sniffDoc(buf); if (!kind || kind[0] === 'pdf') bad('Photo must be a JPG, PNG or WebP image up to 2 MB.');
          const name = `photo-${randomUUID()}.${kind[0]}`;
          await writeFile(path.join(UPLOADS, name), buf, { mode: 0o600 });
          await pool.query('UPDATE employees SET photo_file = ? WHERE id = ?', [name, id]);
          if (e.photo_file) await unlink(path.join(UPLOADS, e.photo_file)).catch(() => {});
          await audit(user, 'employee.photo', 'employee', id, null, r.ip);
          return json(200, { photo_url: `/api/ems/employees/${id}/photo?v=${Date.now()}` });
        }
      }
      if (sub === 'documents') {
        const e = await loadEmployee(id); if (!e || (!isAdmin(user) && user.employee_id !== id)) throw new HttpError(404, 'Employee not found.');
        if (m === 'POST') {
          const buf = r.body ?? Buffer.alloc(0);
          if (!buf.length || buf.length > MAX_DOC) bad('Documents must be a PDF, JPG, PNG or WebP file up to 5 MB.');
          const kind = sniffDoc(buf); if (!kind) bad('Documents must be a PDF, JPG, PNG or WebP file up to 5 MB.');
          const label = (qs.get('label') || '').trim().slice(0, 120); if (!label) bad('Enter a document name.');
          const original = (qs.get('filename') || `document.${kind[0]}`).replace(/[\r\n"\\/]/g, '_').slice(0, 190);
          const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM employee_documents WHERE employee_id = ?', [id]); if (n >= MAX_DOCS_PER_EMPLOYEE) bad('Document limit reached for this employee.');
          const stored = `${randomUUID()}.${kind[0]}`;
          await writeFile(path.join(UPLOADS, stored), buf, { mode: 0o600 });
          const [res] = await pool.query('INSERT INTO employee_documents (employee_id, label, original_name, stored_name, mime, size_bytes, uploaded_by) VALUES (?,?,?,?,?,?,?)', [id, label, original, stored, kind[1], buf.length, user.id]);
          await audit(user, 'document.upload', 'employee', id, { label }, r.ip);
          return json(201, { id: res.insertId, label, original_name: original, mime: kind[1], size_bytes: buf.length });
        }
      }
      throw new HttpError(405, 'Method not allowed.');
    }
    if ((mm = p.match(/^\/api\/ems\/documents\/(\d+)$/))) {
      const [rows] = await pool.query('SELECT * FROM employee_documents WHERE id = ?', [Number(mm[1])]);
      const d = rows[0];
      if (!d || (!isAdmin(user) && user.employee_id !== d.employee_id)) throw new HttpError(404, 'Not found.');
      if (m === 'GET') {
        const buf = await readFile(path.join(UPLOADS, d.stored_name)).catch(() => null); if (!buf) throw new HttpError(404, 'Not found.');
        await audit(user, 'document.download', 'employee', d.employee_id, { document: d.id }, r.ip);
        return { status: 200, headers: { 'Content-Type': d.mime, 'Content-Length': String(buf.length), 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.original_name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" }, body: buf };
      }
      if (m === 'DELETE') {
        if (!isAdmin(user) && d.uploaded_by !== user.id) throw new HttpError(403, 'You do not have permission to do that.');
        await pool.query('DELETE FROM employee_documents WHERE id = ?', [d.id]);
        await unlink(path.join(UPLOADS, d.stored_name)).catch(() => {});
        await audit(user, 'document.delete', 'employee', d.employee_id, { label: d.label }, r.ip);
        return json(200, { ok: true });
      }
      throw new HttpError(405, 'Method not allowed.');
    }
    throw new HttpError(404, 'Not found.');
  }

  /** Same contract as core(): returns { status, headers, body }. Never leaks internals. */
  async function handle(r) {
    try { return await route(r); }
    catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message });
      console.error('[ems]', e);
      return json(500, { error: 'Something went wrong on the server.' });
    }
  }

  return { handle, getAdmins, resolveAdmin, pool, currentUser };
}
