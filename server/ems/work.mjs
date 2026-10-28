/**
 * Everyday work modules for the EMS: attendance, tasks, leave and holidays, notifications, chat, reports, settings.
 * Mounted by index.mjs after the caller is authenticated. Every route re-checks role and ownership on the server.
 * Visibility rule used throughout: an employee sees their own records, a manager also sees their direct reports',
 * an admin / super admin sees everyone's.
 */
import { HttpError } from '../core.mjs';
import { createProjects } from './projects.mjs';

const ADMIN = ['super_admin', 'admin'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const bad = (m) => { throw new HttpError(400, m); };
const csvCell = (v) => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

/** Company policy defaults. Admin can change every one of these in Settings; they are shown as "confirm with HR". */
export const SETTING_DEFAULTS = { timezone: 'Asia/Kolkata', work_start: '09:30', grace_minutes: '15', full_day_hours: '8', half_day_hours: '4', weekly_off: '0' };

export function createWork({ pool, json, readJson, audit, need, isAdmin }) {
  /* ---------------------------------- helpers ---------------------------------- */
  const cache = { at: 0, v: null };
  async function settings() {
    if (cache.v && Date.now() - cache.at < 15000) return cache.v;
    const [rows] = await pool.query('SELECT k, v FROM settings');
    const v = { ...SETTING_DEFAULTS }; for (const r of rows) v[r.k] = r.v;
    cache.v = v; cache.at = Date.now(); return v;
  }
  const dateIn = (tz, d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const minutesIn = (tz, d) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value])); return Number(p.hour) * 60 + Number(p.minute); };
  const toDate = (s) => (s ? new Date(String(s).replace(' ', 'T') + 'Z') : null);
  const toSql = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  const iso = (s) => (s ? toDate(s).toISOString() : null);
  const validDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
  const weekday = (s) => new Date(`${s}T00:00:00Z`).getUTCDay();
  const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const clampStr = (v, max, label, required = false) => { const t = typeof v === 'string' ? v.trim() : ''; if (required && !t) bad(`${label} is required.`); if (t.length > max) bad(`${label} is too long (max ${max} characters).`); return t || null; };
  const idOf = (v, label) => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) bad(`Choose a valid ${label}.`); return n; };

  /** employee ids whose records `u` may see. null = everyone. */
  async function scopeIds(u) {
    if (isAdmin(u)) return null;
    const ids = [u.employee_id ?? -1];
    if (u.role === 'manager') { const [r] = await pool.query('SELECT id FROM employees WHERE manager_id = ?', [u.employee_id ?? -1]); ids.push(...r.map((x) => x.id)); }
    return ids;
  }
  const canSeeEmployee = async (u, empId) => { const s = await scopeIds(u); return s === null || s.includes(empId); };
  const employeeName = (e) => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email || `#${e.id}`;
  async function empInfo(id) { const [r] = await pool.query('SELECT e.id, e.first_name, e.last_name, e.manager_id, COALESCE(e.joining_date, DATE(e.created_at)) AS joining_date, e.employee_code, u.id AS user_id, u.email, u.is_active FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = ?', [id]); return r[0] || null; }
  const needEmployee = (u) => { if (u.employee_id == null) throw new HttpError(404, 'No employee profile is linked to this account.'); return u.employee_id; };

  async function notify(userId, kind, title, body, link) {
    if (!userId) return;
    try { await pool.query('INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?,?,?,?,?)', [userId, kind, String(title).slice(0, 160), body ? String(body).slice(0, 300) : null, link || null]); } catch (e) { console.error('[ems] notify failed', e.message); }
  }
  const adminUserIds = async () => (await pool.query("SELECT id FROM users WHERE role IN ('super_admin','admin') AND is_active = 1"))[0].map((x) => x.id);

  /* ---------------------------------- attendance ---------------------------------- */
  function attendanceStatus(row, cfg, todayStr) {
    if (!row || !row.check_in) return 'absent';
    const inD = toDate(row.check_in);
    const late = minutesIn(cfg.timezone, inD) > Number(cfg.work_start.slice(0, 2)) * 60 + Number(cfg.work_start.slice(3, 5)) + Number(cfg.grace_minutes);
    if (!row.check_out) return row.work_date === todayStr ? 'working' : 'missed_checkout';
    const hrs = (toDate(row.check_out) - inD) / 3600000;
    if (hrs >= Number(cfg.full_day_hours)) return late ? 'late' : 'present';
    if (hrs >= Number(cfg.half_day_hours)) return 'half_day';
    return 'short';
  }
  const attDto = (row, cfg, todayStr) => ({ id: row.id, employee_id: row.employee_id, work_date: row.work_date, check_in: iso(row.check_in), check_out: iso(row.check_out), hours: row.check_in && row.check_out ? Math.round(((toDate(row.check_out) - toDate(row.check_in)) / 3600000) * 100) / 100 : null, source: row.source, note: row.note, status: attendanceStatus(row, cfg, todayStr) });

  async function attendanceRange(empIds, from, to) {
    const where = ['work_date BETWEEN ? AND ?']; const vals = [from, to];
    if (empIds) { if (!empIds.length) return []; where.push(`employee_id IN (${empIds.map(() => '?').join(',')})`); vals.push(...empIds); }
    return (await pool.query(`SELECT * FROM attendance WHERE ${where.join(' AND ')} ORDER BY work_date DESC, employee_id`, vals))[0];
  }

  /* leave days covering a date range for given employees (approved only) */
  async function approvedLeave(empIds, from, to) {
    const where = ["status = 'approved'", 'start_date <= ?', 'end_date >= ?']; const vals = [to, from];
    if (empIds) { if (!empIds.length) return []; where.push(`employee_id IN (${empIds.map(() => '?').join(',')})`); vals.push(...empIds); }
    return (await pool.query(`SELECT employee_id, start_date, end_date, half_day FROM leave_requests WHERE ${where.join(' AND ')}`, vals))[0];
  }
  async function holidaySet(from, to) { const [r] = await pool.query('SELECT holiday_date, name FROM holidays WHERE holiday_date BETWEEN ? AND ?', [from, to]); return new Map(r.map((h) => [h.holiday_date, h.name])); }

  /** Month summary rows per employee: attendance counts + absent days derived from working days with no record and no approved leave. */
  async function monthSummary(empIds, month, cfg) {
    const from = `${month}-01`; const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate(); const to = `${month}-${String(last).padStart(2, '0')}`;
    const todayStr = dateIn(cfg.timezone);
    const where = ["u.is_active = 1"]; const vals = [];
    if (empIds) { if (!empIds.length) return { from, to, rows: [] }; where.push(`e.id IN (${empIds.map(() => '?').join(',')})`); vals.push(...empIds); }
    const [emps] = await pool.query(`SELECT e.id, e.first_name, e.last_name, e.employee_code, COALESCE(e.joining_date, DATE(e.created_at)) AS joining_date, d.name AS department FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN departments d ON d.id = e.department_id WHERE ${where.join(' AND ')} ORDER BY e.first_name, e.id`, vals);
    const ids = emps.map((e) => e.id);
    const att = ids.length ? await attendanceRange(ids, from, to) : [];
    const leaves = ids.length ? await approvedLeave(ids, from, to) : [];
    const hol = await holidaySet(from, to);
    const off = new Set(String(cfg.weekly_off).split(',').filter((x) => x !== '').map(Number));
    const byEmp = new Map(); for (const a of att) { if (!byEmp.has(a.employee_id)) byEmp.set(a.employee_id, new Map()); byEmp.get(a.employee_id).set(a.work_date, a); }
    const rows = emps.map((e) => {
      const m = byEmp.get(e.id) || new Map(); const c = { present: 0, late: 0, half_day: 0, short: 0, missed_checkout: 0, leave: 0, absent: 0, hours: 0 };
      const myLeave = leaves.filter((l) => l.employee_id === e.id);
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (d > todayStr) break;
        if (e.joining_date && d < e.joining_date) continue;
        const rec = m.get(d);
        if (rec) { const st = attendanceStatus(rec, cfg, todayStr); if (st === 'working') c.present++; else if (c[st] !== undefined) c[st]++; if (rec.check_in && rec.check_out) c.hours += (toDate(rec.check_out) - toDate(rec.check_in)) / 3600000; if (st === 'present' || st === 'working') { /* counted */ } continue; }
        if (off.has(weekday(d)) || hol.has(d)) continue;
        if (myLeave.some((l) => l.start_date <= d && l.end_date >= d)) { c.leave++; continue; }
        c.absent++;
      }
      return { employee_id: e.id, name: employeeName(e), employee_code: e.employee_code, department: e.department, ...c, hours: Math.round(c.hours * 10) / 10 };
    });
    return { from, to, rows };
  }

  /* ---------------------------------- tasks ---------------------------------- */
  const TASK_STATUS = ['todo', 'in_progress', 'blocked', 'done'];
  const TASK_PRIORITY = ['low', 'medium', 'high'];
  const taskSql = `SELECT t.*, ca.first_name AS c_first, ca.last_name AS c_last, au.first_name AS a_first, au.last_name AS a_last, au.manager_id AS assignee_manager, pr.name AS project_name
     FROM tasks t JOIN employees ca ON ca.id = t.created_by JOIN employees au ON au.id = t.assignee_id LEFT JOIN projects pr ON pr.id = t.project_id`;
  const taskDto = (t) => ({ id: t.id, title: t.title, description: t.description, priority: t.priority, status: t.status, due_date: t.due_date, completed_at: iso(t.completed_at), created_at: iso(t.created_at), updated_at: iso(t.updated_at), created_by: { id: t.created_by, name: employeeName({ first_name: t.c_first, last_name: t.c_last }) }, assignee: { id: t.assignee_id, name: employeeName({ first_name: t.a_first, last_name: t.a_last }) }, project: t.project_id ? { id: t.project_id, name: t.project_name } : null, overdue: !!t.due_date && t.status !== 'done' && t.due_date < dateIn('Asia/Kolkata') });
  async function loadTask(u, id) {
    const [r] = await pool.query(`${taskSql} WHERE t.id = ?`, [id]); const t = r[0];
    if (!t) throw new HttpError(404, 'Not found.');
    const mine = u.employee_id;
    let ok = isAdmin(u) || t.created_by === mine || t.assignee_id === mine || (u.role === 'manager' && t.assignee_manager === mine);
    if (t.project_id) { const a = await projects.accessOrNull(u, t.project_id); t._plevel = a ? a.level : null; if (a) ok = true; }
    if (!ok) throw new HttpError(404, 'Not found.');
    return t;
  }

  /* ---------------------------------- leave ---------------------------------- */
  function countLeaveDays(start, end, half, off, hol) {
    if (half) return 0.5;
    let n = 0; for (let d = start; d <= end; d = addDays(d, 1)) { if (off.has(weekday(d)) || hol.has(d)) continue; n++; }
    return n;
  }
  async function leaveBalances(empId, year) {
    const [types] = await pool.query('SELECT id, name, annual_quota, is_active FROM leave_types ORDER BY name');
    const [used] = await pool.query("SELECT leave_type_id, SUM(days) AS d FROM leave_requests WHERE employee_id = ? AND status = 'approved' AND YEAR(start_date) = ? GROUP BY leave_type_id", [empId, year]);
    const [pend] = await pool.query("SELECT leave_type_id, SUM(days) AS d FROM leave_requests WHERE employee_id = ? AND status = 'pending' AND YEAR(start_date) = ? GROUP BY leave_type_id", [empId, year]);
    const u = new Map(used.map((x) => [x.leave_type_id, Number(x.d)])); const p = new Map(pend.map((x) => [x.leave_type_id, Number(x.d)]));
    return types.filter((t) => t.is_active).map((t) => ({ leave_type_id: t.id, name: t.name, quota: Number(t.annual_quota), used: u.get(t.id) || 0, pending: p.get(t.id) || 0, remaining: Number(t.annual_quota) - (u.get(t.id) || 0) }));
  }
  const leaveSql = `SELECT l.*, lt.name AS type_name, e.first_name, e.last_name, e.manager_id, e.employee_code, db.first_name AS d_first, db.last_name AS d_last
     FROM leave_requests l JOIN leave_types lt ON lt.id = l.leave_type_id JOIN employees e ON e.id = l.employee_id LEFT JOIN employees db ON db.id = l.decided_by`;
  const leaveDto = (l) => ({ id: l.id, employee: { id: l.employee_id, name: employeeName(l), code: l.employee_code }, leave_type: l.type_name, leave_type_id: l.leave_type_id, start_date: l.start_date, end_date: l.end_date, days: Number(l.days), half_day: !!l.half_day, reason: l.reason, status: l.status, decided_by: l.decided_by ? employeeName({ first_name: l.d_first, last_name: l.d_last }) : null, decided_at: iso(l.decided_at), decision_note: l.decision_note, created_at: iso(l.created_at) });

  /* ---------------------------------- router ---------------------------------- */
  /** Returns a response, or null when the path is not one of ours. */
  const projects = createProjects({ pool, json, readJson, audit, isAdmin, notify, empInfo, employeeName, scopeIds, canSeeEmployee, validDate, clampStr, idOf, bad, iso, toDate, dateIn, addDays, attendanceStatus, attDto, attendanceRange });
  const logActivity = (taskId, empId, kind, from, to) => pool.query('INSERT INTO task_activity (task_id, employee_id, kind, from_value, to_value) VALUES (?,?,?,?,?)', [taskId, empId, kind, from ?? null, to == null ? null : String(to).slice(0, 160)]).catch((e) => console.error('[ems] activity failed', e.message));

  async function route(r, user, qs) {
    const p = r.pathname, m = r.method; let mm;
    if (!/^\/api\/ems\/(attendance|tasks|leave|holidays|notifications|chat|reports|settings|home|admin\/overview|projects|worklog)/.test(p)) return null;
    need(user);
    const cfg = await settings();
    const todayStr = dateIn(cfg.timezone);
    { const x = await projects.route(r, user, qs, { cfg, todayStr }); if (x) return x; }

    /* ===== settings ===== */
    if (p === '/api/ems/settings' && m === 'GET') return json(200, { ...cfg, defaults: SETTING_DEFAULTS, can_edit: isAdmin(user) });
    if (p === '/api/ems/settings' && m === 'PUT') {
      if (!isAdmin(user)) throw new HttpError(403, 'You do not have permission to do that.');
      const b = readJson(r); const next = {};
      if (b.timezone != null) { try { new Intl.DateTimeFormat('en', { timeZone: String(b.timezone) }); } catch { bad('Unknown time zone.'); } next.timezone = String(b.timezone); }
      if (b.work_start != null) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.work_start))) bad('Start time must look like 09:30.'); next.work_start = String(b.work_start); }
      for (const [k, max] of [['grace_minutes', 240], ['full_day_hours', 24], ['half_day_hours', 24]]) if (b[k] != null) { const n = Number(b[k]); if (!Number.isFinite(n) || n < 0 || n > max) bad(`${k.replace(/_/g, ' ')} must be between 0 and ${max}.`); next[k] = String(n); }
      if (b.weekly_off != null) { const list = String(b.weekly_off).split(',').filter((x) => x !== ''); if (list.some((x) => !/^[0-6]$/.test(x)) || list.length > 6) bad('Weekly off days are invalid.'); next.weekly_off = [...new Set(list)].join(','); }
      for (const [k, v] of Object.entries(next)) await pool.query('INSERT INTO settings (k, v) VALUES (?,?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, v]);
      cache.v = null; await audit(user, 'settings.update', 'settings', null, next, r.ip);
      return json(200, { ...(await settings()), defaults: SETTING_DEFAULTS, can_edit: true });
    }

    /* ===== admin overview (dashboard) ===== */
    if (p === '/api/ems/admin/overview' && m === 'GET') {
      if (!isAdmin(user)) throw new HttpError(403, 'You do not have permission to do that.');
      const [emps] = await pool.query("SELECT e.id, e.first_name, e.last_name, e.employee_code, COALESCE(e.joining_date, DATE(e.created_at)) AS joining_date, e.created_at, d.name AS department FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN departments d ON d.id = e.department_id WHERE u.is_active = 1");
      const off = new Set(String(cfg.weekly_off).split(',').filter((x) => x !== '').map(Number));
      const from7 = addDays(todayStr, -6);
      const att = await attendanceRange(null, from7, todayStr); const lv = await approvedLeave(null, from7, todayStr); const hol = await holidaySet(from7, todayStr);
      const statusOn = (e, d) => {
        if (e.joining_date && e.joining_date > d) return null;
        const a = att.find((x) => x.employee_id === e.id && x.work_date === d);
        if (a) return attendanceStatus(a, cfg, todayStr);
        if (lv.some((l) => l.employee_id === e.id && l.start_date <= d && l.end_date >= d)) return 'leave';
        return off.has(weekday(d)) || hol.has(d) ? 'off' : 'absent';
      };
      const counts = { present: 0, late: 0, half_day: 0, short: 0, working: 0, missed_checkout: 0, absent: 0, leave: 0, off: 0 };
      const people = { absent: [], leave: [], late: [] };
      for (const e of emps) { const st = statusOn(e, todayStr); if (!st) continue; if (counts[st] !== undefined) counts[st]++; if (people[st] && people[st].length < 8) people[st].push({ id: e.id, name: employeeName(e), department: e.department }); }
      const trend = []; for (let i = 6; i >= 0; i--) { const d = addDays(todayStr, -i); const t = { date: d, present: 0, late: 0, absent: 0, leave: 0, day_off: off.has(weekday(d)) || hol.has(d) }; for (const e of emps) { const st = statusOn(e, d); if (st === 'present' || st === 'working' || st === 'half_day' || st === 'short' || st === 'missed_checkout') t.present++; else if (st === 'late') t.late++; else if (st === 'absent') t.absent++; else if (st === 'leave') t.leave++; } trend.push(t); }
      const deptMap = new Map(); for (const e of emps) deptMap.set(e.department || 'Not set', (deptMap.get(e.department || 'Not set') || 0) + 1);
      const departments = [...deptMap].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      const t = (await pool.query("SELECT SUM(status = 'todo') AS todo, SUM(status = 'in_progress') AS in_progress, SUM(status = 'blocked') AS blocked, SUM(status = 'done') AS done, SUM(status <> 'done' AND due_date < ?) AS overdue FROM tasks", [todayStr]))[0][0];
      const pending = Number((await pool.query("SELECT COUNT(*) AS n FROM leave_requests WHERE status = 'pending'"))[0][0].n);
      const [nh] = await pool.query('SELECT holiday_date, name FROM holidays WHERE holiday_date >= ? ORDER BY holiday_date LIMIT 3', [todayStr]);
      const [recent] = await pool.query('SELECT e.id, e.first_name, e.last_name, d.name AS department, e.created_at FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN departments d ON d.id = e.department_id WHERE u.is_active = 1 ORDER BY e.id DESC LIMIT 5');
      return json(200, { today: todayStr, employees: emps.length, day_off: off.has(weekday(todayStr)) || hol.has(todayStr), holiday: hol.get(todayStr) || null, counts, people, trend, departments,
        tasks: { todo: Number(t.todo || 0), in_progress: Number(t.in_progress || 0), blocked: Number(t.blocked || 0), done: Number(t.done || 0), overdue: Number(t.overdue || 0) }, pending_leave: pending,
        upcoming_holidays: nh.map((h) => ({ date: h.holiday_date, name: h.name })), recent_joiners: recent.map((r) => ({ id: r.id, name: employeeName(r), department: r.department })) });
    }

    /* ===== home summary ===== */
    if (p === '/api/ems/home' && m === 'GET') {
      const emp = user.employee_id; const out = { today: todayStr, attendance: null, open_tasks: 0, overdue_tasks: 0, pending_leave_to_decide: 0, unread_notifications: 0, unread_messages: 0, next_holiday: null };
      if (emp != null) {
        const [a] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [emp, todayStr]); out.attendance = a[0] ? attDto(a[0], cfg, todayStr) : null;
        const [t] = await pool.query("SELECT COUNT(*) AS n, SUM(due_date < ?) AS o FROM tasks WHERE assignee_id = ? AND status <> 'done'", [todayStr, emp]); out.open_tasks = Number(t[0].n); out.overdue_tasks = Number(t[0].o || 0);
      }
      const scope = await scopeIds(user);
      if (user.role === 'manager' || isAdmin(user)) {
        const w = ["l.status = 'pending'"]; const v = []; if (scope) { w.push(`l.employee_id IN (${scope.map(() => '?').join(',')})`); v.push(...scope); } w.push('l.employee_id <> ?'); v.push(emp ?? -1);
        out.pending_leave_to_decide = Number((await pool.query(`SELECT COUNT(*) AS n FROM leave_requests l WHERE ${w.join(' AND ')}`, v))[0][0].n);
      }
      out.unread_notifications = Number((await pool.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [user.id]))[0][0].n);
      out.unread_messages = Number((await pool.query('SELECT COUNT(*) AS n FROM chat_messages WHERE recipient_id = ? AND read_at IS NULL', [user.id]))[0][0].n);
      const [h] = await pool.query('SELECT holiday_date, name FROM holidays WHERE holiday_date >= ? ORDER BY holiday_date LIMIT 1', [todayStr]); out.next_holiday = h[0] || null;
      return json(200, out);
    }

    /* ===== attendance ===== */
    if (p === '/api/ems/attendance/today' && m === 'GET') {
      const emp = needEmployee(user); const [a] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [emp, todayStr]);
      return json(200, { today: todayStr, record: a[0] ? attDto(a[0], cfg, todayStr) : null, work_start: cfg.work_start });
    }
    if (p === '/api/ems/attendance/check-in' && m === 'POST') {
      const emp = needEmployee(user); const now = new Date();
      try { await pool.query("INSERT INTO attendance (employee_id, work_date, check_in, source) VALUES (?,?,?, 'self')", [emp, todayStr, toSql(now)]); }
      catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You have already checked in today.'); throw e; }
      const [a] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [emp, todayStr]);
      return json(201, attDto(a[0], cfg, todayStr));
    }
    if (p === '/api/ems/attendance/check-out' && m === 'POST') {
      const emp = needEmployee(user); const [a] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [emp, todayStr]);
      if (!a[0] || !a[0].check_in) throw new HttpError(409, 'Check in first.');
      if (a[0].check_out) throw new HttpError(409, 'You have already checked out today.');
      await pool.query('UPDATE attendance SET check_out = ? WHERE id = ?', [toSql(new Date()), a[0].id]);
      const [b] = await pool.query('SELECT * FROM attendance WHERE id = ?', [a[0].id]); return json(200, attDto(b[0], cfg, todayStr));
    }
    if (p === '/api/ems/attendance' && m === 'GET') { // list: own by default; ?employee_id= for someone in scope
      const month = qs.get('month') || todayStr.slice(0, 7); if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) bad('Month must look like 2026-10.');
      let target = user.employee_id; const q = qs.get('employee_id');
      if (q) { target = idOf(q, 'employee'); if (!(await canSeeEmployee(user, target))) throw new HttpError(404, 'Not found.'); }
      if (target == null) throw new HttpError(404, 'No employee profile is linked to this account.');
      const from = `${month}-01`; const to = `${month}-${String(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`;
      const rows = await attendanceRange([target], from, to); const hol = await holidaySet(from, to);
      return json(200, { month, employee: await empInfo(target).then((e) => ({ id: e.id, name: employeeName(e) })), records: rows.map((x) => attDto(x, cfg, todayStr)), start_date: (await empInfo(target)).joining_date, holidays: [...hol].map(([date, name]) => ({ date, name })), weekly_off: String(cfg.weekly_off).split(',').filter(Boolean).map(Number) });
    }
    if (p === '/api/ems/attendance/team' && m === 'GET') { // everyone in scope on one date
      const date = qs.get('date') || todayStr; if (!validDate(date)) bad('Date must look like 2026-10-28.');
      if (user.role === 'employee') throw new HttpError(403, 'You do not have permission to do that.');
      const scope = await scopeIds(user); const where = ['u.is_active = 1']; const vals = [];
      if (scope) { where.push(`e.id IN (${scope.map(() => '?').join(',')})`); vals.push(...scope); }
      const [emps] = await pool.query(`SELECT e.id, e.first_name, e.last_name, e.employee_code, COALESCE(e.joining_date, DATE(e.created_at)) AS joining_date, d.name AS department FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN departments d ON d.id = e.department_id WHERE ${where.join(' AND ')} ORDER BY e.first_name, e.id`, vals);
      const att = await attendanceRange(emps.map((e) => e.id), date, date); const lv = await approvedLeave(emps.map((e) => e.id), date, date); const hol = await holidaySet(date, date);
      const off = new Set(String(cfg.weekly_off).split(',').filter(Boolean).map(Number)); const isOff = off.has(weekday(date)) || hol.has(date);
      return json(200, { date, day_off: isOff, holiday: hol.get(date) || null, rows: emps.filter((e) => !e.joining_date || e.joining_date <= date).map((e) => { const a = att.find((x) => x.employee_id === e.id); const onLeave = lv.some((l) => l.employee_id === e.id); return { employee_id: e.id, name: employeeName(e), employee_code: e.employee_code, department: e.department, status: a ? attendanceStatus(a, cfg, todayStr) : onLeave ? 'leave' : isOff ? 'off' : date > todayStr ? 'upcoming' : 'absent', check_in: a ? iso(a.check_in) : null, check_out: a ? iso(a.check_out) : null }; }) });
    }
    if ((mm = p.match(/^\/api\/ems\/attendance\/(\d+)\/(\d{4}-\d{2}-\d{2})$/)) && m === 'PUT') { // admin correction
      if (!isAdmin(user)) throw new HttpError(403, 'You do not have permission to do that.');
      const emp = Number(mm[1]), date = mm[2]; if (!validDate(date)) bad('Invalid date.'); if (date > todayStr) bad('You cannot record attendance for a future date.');
      if (!(await empInfo(emp))) throw new HttpError(404, 'Not found.');
      const b = readJson(r); const parse = (v, label) => { if (v == null || v === '') return null; const d = new Date(String(v)); if (Number.isNaN(d.getTime())) bad(`${label} is not a valid date and time.`); return d; };
      const ci = parse(b.check_in, 'Check-in'), co = parse(b.check_out, 'Check-out'); if (!ci) bad('Check-in time is required.'); if (co && co <= ci) bad('Check-out must be after check-in.');
      const note = clampStr(b.note, 255, 'Note', true);
      await pool.query("INSERT INTO attendance (employee_id, work_date, check_in, check_out, source, note, edited_by) VALUES (?,?,?,?, 'admin', ?, ?) ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), check_out = VALUES(check_out), source = 'admin', note = VALUES(note), edited_by = VALUES(edited_by)", [emp, date, toSql(ci), co ? toSql(co) : null, note, user.id]);
      await audit(user, 'attendance.correct', 'employee', emp, { date, note }, r.ip);
      const info = await empInfo(emp); await notify(info.user_id, 'attendance', 'Your attendance was corrected', `${date}: ${note}`, '/attendance');
      const [a] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [emp, date]); return json(200, attDto(a[0], cfg, todayStr));
    }

    /* ===== holidays ===== */
    if (p === '/api/ems/holidays' && m === 'GET') {
      const year = Number(qs.get('year') || todayStr.slice(0, 4)); if (!Number.isInteger(year) || year < 2000 || year > 2100) bad('Year is invalid.');
      return json(200, (await pool.query('SELECT id, holiday_date AS date, name FROM holidays WHERE YEAR(holiday_date) = ? ORDER BY holiday_date', [year]))[0]);
    }
    if (p === '/api/ems/holidays' && m === 'POST') {
      if (!isAdmin(user)) throw new HttpError(403, 'You do not have permission to do that.');
      const b = readJson(r); if (!validDate(b.date)) bad('Choose a valid date.'); const name = clampStr(b.name, 120, 'Holiday name', true);
      try { const [x] = await pool.query('INSERT INTO holidays (holiday_date, name) VALUES (?,?)', [b.date, name]); await audit(user, 'holiday.add', 'holiday', x.insertId, { date: b.date, name }, r.ip); return json(201, { id: x.insertId, date: b.date, name }); }
      catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'There is already a holiday on that date.'); throw e; }
    }
    if ((mm = p.match(/^\/api\/ems\/holidays\/(\d+)$/)) && m === 'DELETE') {
      if (!isAdmin(user)) throw new HttpError(403, 'You do not have permission to do that.');
      await pool.query('DELETE FROM holidays WHERE id = ?', [Number(mm[1])]); await audit(user, 'holiday.delete', 'holiday', mm[1], null, r.ip); return json(200, { ok: true });
    }

    /* ===== leave ===== */
    if (p === '/api/ems/leave/types' && m === 'GET') return json(200, (await pool.query(`SELECT id, name, annual_quota, is_active FROM leave_types ${isAdmin(user) ? '' : 'WHERE is_active = 1'} ORDER BY name`))[0].map((t) => ({ ...t, annual_quota: Number(t.annual_quota), is_active: !!t.is_active })));
    if (p === '/api/ems/leave/types' && m === 'POST') {
      if (!isAdmin(user)) throw new HttpError(403, 'You do not have permission to do that.');
      const b = readJson(r); const name = clampStr(b.name, 80, 'Leave type name', true); const q = Number(b.annual_quota); if (!Number.isFinite(q) || q < 0 || q > 366) bad('Yearly days must be between 0 and 366.');
      try { const [x] = await pool.query('INSERT INTO leave_types (name, annual_quota) VALUES (?,?)', [name, q]); await audit(user, 'leave_type.add', 'leave_type', x.insertId, { name, quota: q }, r.ip); return json(201, { id: x.insertId, name, annual_quota: q, is_active: true }); }
      catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That leave type already exists.'); throw e; }
    }
    if ((mm = p.match(/^\/api\/ems\/leave\/types\/(\d+)$/)) && m === 'PATCH') {
      if (!isAdmin(user)) throw new HttpError(403, 'You do not have permission to do that.');
      const b = readJson(r); const sets = [], vals = [];
      if (b.name != null) { sets.push('name = ?'); vals.push(clampStr(b.name, 80, 'Leave type name', true)); }
      if (b.annual_quota != null) { const q = Number(b.annual_quota); if (!Number.isFinite(q) || q < 0 || q > 366) bad('Yearly days must be between 0 and 366.'); sets.push('annual_quota = ?'); vals.push(q); }
      if (b.is_active != null) { sets.push('is_active = ?'); vals.push(b.is_active ? 1 : 0); }
      if (!sets.length) bad('Nothing to change.');
      try { await pool.query(`UPDATE leave_types SET ${sets.join(', ')} WHERE id = ?`, [...vals, Number(mm[1])]); } catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That leave type already exists.'); throw e; }
      await audit(user, 'leave_type.update', 'leave_type', mm[1], b, r.ip); return json(200, { ok: true });
    }
    if (p === '/api/ems/leave/balance' && m === 'GET') { const emp = needEmployee(user); const year = Number(qs.get('year') || todayStr.slice(0, 4)); return json(200, { year, balances: await leaveBalances(emp, year) }); }
    if (p === '/api/ems/leave' && m === 'POST') {
      const emp = needEmployee(user); const b = readJson(r);
      const typeId = idOf(b.leave_type_id, 'leave type'); if (!validDate(b.start_date)) bad('Choose a valid start date.'); const half = !!b.half_day; const end = half ? b.start_date : b.end_date; if (!validDate(end)) bad('Choose a valid end date.'); if (end < b.start_date) bad('End date cannot be before the start date.');
      if ((new Date(`${end}T00:00:00Z`) - new Date(`${b.start_date}T00:00:00Z`)) / 86400000 > 120) bad('A single request can cover at most 120 days.');
      const reason = clampStr(b.reason, 500, 'Reason');
      const type = (await pool.query('SELECT * FROM leave_types WHERE id = ? AND is_active = 1', [typeId]))[0][0]; if (!type) bad('Choose a valid leave type.');
      const off = new Set(String(cfg.weekly_off).split(',').filter(Boolean).map(Number)); const hol = await holidaySet(b.start_date, end);
      const days = countLeaveDays(b.start_date, end, half, off, hol); if (days <= 0) bad('That period has no working days (weekly off or holidays only).');
      const [overlap] = await pool.query("SELECT id FROM leave_requests WHERE employee_id = ? AND status IN ('pending','approved') AND start_date <= ? AND end_date >= ?", [emp, end, b.start_date]); if (overlap.length) throw new HttpError(409, 'You already have a leave request that overlaps these dates.');
      const bal = (await leaveBalances(emp, Number(b.start_date.slice(0, 4)))).find((x) => x.leave_type_id === typeId);
      if (bal && Number(type.annual_quota) > 0 && days > bal.remaining - bal.pending) throw new HttpError(409, `Not enough ${type.name} balance. Remaining after pending requests: ${bal.remaining - bal.pending} day(s).`);
      const [x] = await pool.query('INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, half_day, reason) VALUES (?,?,?,?,?,?,?)', [emp, typeId, b.start_date, end, days, half ? 1 : 0, reason]);
      const me = await empInfo(emp); const approver = me.manager_id ? (await empInfo(me.manager_id))?.user_id : null; const targets = new Set(approver ? [approver] : await adminUserIds()); targets.delete(user.id);
      for (const uid of targets) await notify(uid, 'leave', `${employeeName(me)} requested leave`, `${type.name}: ${b.start_date}${end !== b.start_date ? ' to ' + end : ''} (${days} day${days === 1 ? '' : 's'})`, '/leave');
      await audit(user, 'leave.request', 'leave', x.insertId, { days }, r.ip);
      return json(201, leaveDto((await pool.query(`${leaveSql} WHERE l.id = ?`, [x.insertId]))[0][0]));
    }
    if (p === '/api/ems/leave' && m === 'GET') { // ?scope=mine|decide|all
      const sc = qs.get('scope') || 'mine'; const where = [], vals = [];
      if (sc === 'mine') { where.push('l.employee_id = ?'); vals.push(needEmployee(user)); }
      else if (sc === 'decide' || sc === 'all') {
        if (user.role === 'employee') throw new HttpError(403, 'You do not have permission to do that.');
        const scope = await scopeIds(user); if (scope) { where.push(`l.employee_id IN (${scope.map(() => '?').join(',')})`); vals.push(...scope); }
        if (sc === 'decide') { where.push("l.status = 'pending'", 'l.employee_id <> ?'); vals.push(user.employee_id ?? -1); }
      } else bad('Unknown view.');
      const st = qs.get('status'); if (st && ['pending', 'approved', 'rejected', 'cancelled'].includes(st)) { where.push('l.status = ?'); vals.push(st); }
      return json(200, (await pool.query(`${leaveSql} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY l.id DESC LIMIT 300`, vals))[0].map(leaveDto));
    }
    if ((mm = p.match(/^\/api\/ems\/leave\/(\d+)\/(approve|reject|cancel)$/)) && m === 'POST') {
      const [rows] = await pool.query(`${leaveSql} WHERE l.id = ?`, [Number(mm[1])]); const l = rows[0]; if (!l) throw new HttpError(404, 'Not found.');
      const act = mm[2]; const owner = await empInfo(l.employee_id);
      if (act === 'cancel') {
        if (l.employee_id !== user.employee_id) throw new HttpError(404, 'Not found.');
        if (l.status !== 'pending') throw new HttpError(409, 'Only a pending request can be cancelled.');
        await pool.query("UPDATE leave_requests SET status = 'cancelled' WHERE id = ?", [l.id]); await audit(user, 'leave.cancel', 'leave', l.id, null, r.ip); return json(200, { ok: true });
      }
      if (!(await canSeeEmployee(user, l.employee_id)) || user.role === 'employee') throw new HttpError(404, 'Not found.');
      if (l.employee_id === user.employee_id) throw new HttpError(403, 'You cannot decide your own leave request.');
      if (l.status !== 'pending') throw new HttpError(409, 'This request has already been decided.');
      const note = clampStr((readJson(r)).note, 255, 'Note');
      const status = act === 'approve' ? 'approved' : 'rejected';
      await pool.query('UPDATE leave_requests SET status = ?, decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ?', [status, user.employee_id, toSql(new Date()), note, l.id]);
      await notify(owner.user_id, 'leave', `Your leave was ${status}`, `${l.type_name}: ${l.start_date}${l.end_date !== l.start_date ? ' to ' + l.end_date : ''}${note ? ' · ' + note : ''}`, '/leave');
      await audit(user, `leave.${act}`, 'leave', l.id, { employee: l.employee_id }, r.ip); return json(200, { ok: true });
    }

    /* ===== tasks ===== */
    if (p === '/api/ems/tasks' && m === 'GET') { // ?view=mine|assigned|team|all  &status=
      const view = qs.get('view') || 'mine'; const emp = user.employee_id; const where = [], vals = [];
      if (view === 'mine') { where.push('t.assignee_id = ?'); vals.push(needEmployee(user)); }
      else if (view === 'assigned') { where.push('t.created_by = ?', 't.assignee_id <> ?'); vals.push(needEmployee(user), emp); }
      else if (view === 'project') { const pid = idOf(qs.get('project_id'), 'project'); await projects.access(user, pid); where.push('t.project_id = ?'); vals.push(pid); }
      else if (view === 'team' || view === 'all') {
        if (user.role === 'employee') throw new HttpError(403, 'You do not have permission to do that.');
        const scope = await scopeIds(user); if (scope) { where.push(`t.assignee_id IN (${scope.map(() => '?').join(',')})`); vals.push(...scope); }
        const fe = qs.get('employee_id'); if (fe) { where.push('t.assignee_id = ?'); vals.push(idOf(fe, 'employee')); }
        const fp = qs.get('project_id'); if (fp) { where.push('t.project_id = ?'); vals.push(idOf(fp, 'project')); }
      } else bad('Unknown view.');
      const st = qs.get('status'); if (st === 'open') where.push("t.status <> 'done'"); else if (st && TASK_STATUS.includes(st)) { where.push('t.status = ?'); vals.push(st); }
      return json(200, (await pool.query(`${taskSql} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY (t.status = 'done'), t.due_date IS NULL, t.due_date, t.id DESC LIMIT 300`, vals))[0].map(taskDto));
    }
    if (p === '/api/ems/tasks' && m === 'POST') {
      const emp = needEmployee(user); const b = readJson(r);
      const title = clampStr(b.title, 160, 'Title', true); const description = clampStr(b.description, 4000, 'Description');
      const priority = b.priority == null ? 'medium' : b.priority; if (!TASK_PRIORITY.includes(priority)) bad('Choose a valid priority.');
      if (b.due_date != null && b.due_date !== '' && !validDate(b.due_date)) bad('Choose a valid due date.');
      const assignee = b.assignee_id == null || b.assignee_id === '' ? emp : idOf(b.assignee_id, 'assignee');
      let projectId = null;
      if (b.project_id != null && b.project_id !== '') {
        projectId = idOf(b.project_id, 'project'); const pa = await projects.access(user, projectId);
        if (!(await projects.isMember(projectId, assignee))) bad('That person is not on this project. Add them to the project first.');
        if (assignee !== emp && !projects.canManage(pa)) throw new HttpError(403, 'Only the project lead or HR can assign work to other members.');
      } else
      if (assignee !== emp) { const a = await empInfo(assignee); if (!a || !a.is_active) bad('Choose a valid assignee.'); if (!isAdmin(user) && !(user.role === 'manager' && a.manager_id === emp)) throw new HttpError(403, 'You can only assign tasks to yourself' + (user.role === 'manager' ? ' or your team.' : '.')); }
      const [x] = await pool.query('INSERT INTO tasks (title, description, created_by, assignee_id, priority, due_date, project_id) VALUES (?,?,?,?,?,?,?)', [title, description, emp, assignee, priority, b.due_date || null, projectId]);
      await logActivity(x.insertId, emp, 'created', null, title);
      if (assignee !== emp) { const a = await empInfo(assignee); await notify(a.user_id, 'task', 'New task assigned to you', title, `/tasks?task=${x.insertId}`); }
      await audit(user, 'task.create', 'task', x.insertId, { assignee }, r.ip);
      return json(201, taskDto((await pool.query(`${taskSql} WHERE t.id = ?`, [x.insertId]))[0][0]));
    }
    if ((mm = p.match(/^\/api\/ems\/tasks\/(\d+)(?:\/(comments))?$/))) {
      const t = await loadTask(user, Number(mm[1]));
      if (mm[2] === 'comments') {
        if (m === 'GET') return json(200, (await pool.query('SELECT c.id, c.author_id, c.body, c.created_at, e.first_name, e.last_name FROM task_comments c JOIN employees e ON e.id = c.author_id WHERE c.task_id = ? ORDER BY c.id', [t.id]))[0].map((c) => ({ id: c.id, body: c.body, created_at: iso(c.created_at), author: employeeName(c), mine: c.author_id === user.employee_id })));
        if (m === 'POST') {
          const emp = needEmployee(user); const body = clampStr(readJson(r).body, 1000, 'Comment', true);
          const [x] = await pool.query('INSERT INTO task_comments (task_id, author_id, body) VALUES (?,?,?)', [t.id, emp, body]);
          const [prior] = await pool.query('SELECT DISTINCT author_id FROM task_comments WHERE task_id = ?', [t.id]); const me = await empInfo(emp);
          for (const eid of new Set([t.created_by, t.assignee_id, ...prior.map((x) => x.author_id)])) if (eid !== emp) { const i = await empInfo(eid); if (i && i.is_active) await notify(i.user_id, 'task', `${employeeName(me)} on "${t.title}"`, body, `/tasks?task=${t.id}`); }
          return json(201, { id: x.insertId });
        }
      } else {
        if (m === 'GET') return json(200, taskDto(t));
        if (m === 'PATCH') {
          const b = readJson(r); const emp = user.employee_id; const manage = isAdmin(user) || t.created_by === emp || t._plevel === 'creator' || t._plevel === 'lead'; const sets = [], vals = [];
          const isAssignee = t.assignee_id === emp || (user.role === 'manager' && t.assignee_manager === emp);
          if (b.status != null) { if (!TASK_STATUS.includes(b.status)) bad('Choose a valid status.'); if (!manage && !isAssignee) throw new HttpError(403, 'You do not have permission to do that.'); sets.push('status = ?', 'completed_at = ?'); vals.push(b.status, b.status === 'done' ? toSql(new Date()) : null); }
          for (const k of ['title', 'description', 'priority', 'due_date', 'assignee_id']) if (b[k] !== undefined) {
            if (!manage) throw new HttpError(403, 'Only the person who created the task, or HR, can edit its details.');
            if (k === 'title') { sets.push('title = ?'); vals.push(clampStr(b.title, 160, 'Title', true)); }
            else if (k === 'description') { sets.push('description = ?'); vals.push(clampStr(b.description, 4000, 'Description')); }
            else if (k === 'priority') { if (!TASK_PRIORITY.includes(b.priority)) bad('Choose a valid priority.'); sets.push('priority = ?'); vals.push(b.priority); }
            else if (k === 'due_date') { if (b.due_date && !validDate(b.due_date)) bad('Choose a valid due date.'); sets.push('due_date = ?'); vals.push(b.due_date || null); }
            else { const nid = idOf(b.assignee_id, 'assignee'); const a = await empInfo(nid); if (!a || !a.is_active) bad('Choose a valid assignee.'); if (t.project_id) { if (!(await projects.isMember(t.project_id, nid))) bad('That person is not on this project.'); } else if (!isAdmin(user) && !(nid === emp || (user.role === 'manager' && a.manager_id === emp))) throw new HttpError(403, 'You can only assign tasks to yourself or your team.'); sets.push('assignee_id = ?'); vals.push(nid); if (nid !== t.assignee_id && nid !== emp) await notify(a.user_id, 'task', 'A task was assigned to you', t.title, `/tasks?task=${t.id}`); }
          }
          if (!sets.length) bad('Nothing to change.');
          await pool.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, [...vals, t.id]);
          if (b.status != null && b.status !== t.status) await logActivity(t.id, emp, 'status', t.status, b.status);
          if (b.assignee_id !== undefined && Number(b.assignee_id) !== t.assignee_id) await logActivity(t.id, emp, 'assigned', String(t.assignee_id), (await empInfo(Number(b.assignee_id))) ? employeeName(await empInfo(Number(b.assignee_id))) : '');
          if (b.status === 'done' && t.created_by !== emp) { const i = await empInfo(t.created_by); await notify(i.user_id, 'task', 'A task was completed', t.title, `/tasks?task=${t.id}`); }
          return json(200, taskDto((await pool.query(`${taskSql} WHERE t.id = ?`, [t.id]))[0][0]));
        }
        if (m === 'DELETE') { if (!(isAdmin(user) || t.created_by === user.employee_id)) throw new HttpError(403, 'You do not have permission to do that.'); await pool.query('DELETE FROM tasks WHERE id = ?', [t.id]); await audit(user, 'task.delete', 'task', t.id, null, r.ip); return json(200, { ok: true }); }
      }
      throw new HttpError(405, 'Method not allowed.');
    }

    /* ===== notifications ===== */
    if (p === '/api/ems/notifications' && m === 'GET') {
      const rows = (await pool.query('SELECT id, kind, title, body, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', [user.id]))[0];
      const unread = Number((await pool.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [user.id]))[0][0].n);
      return json(200, { unread, items: rows.map((n) => ({ ...n, is_read: !!n.is_read, created_at: iso(n.created_at) })) });
    }
    if (p === '/api/ems/notifications/read' && m === 'POST') { const b = readJson(r); if (b.id != null) await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?', [user.id, idOf(b.id, 'notification')]); else await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user.id]); return json(200, { ok: true }); }

    /* ===== chat (direct messages; the page polls) ===== */
    if (p === '/api/ems/chat/people' && m === 'GET') {
      const rows = (await pool.query(`SELECT u.id AS user_id, e.first_name, e.last_name, e.photo_file, d.name AS department,
          (SELECT COUNT(*) FROM chat_messages c WHERE c.sender_id = u.id AND c.recipient_id = ? AND c.read_at IS NULL) AS unread,
          (SELECT MAX(c.id) FROM chat_messages c WHERE (c.sender_id = u.id AND c.recipient_id = ?) OR (c.sender_id = ? AND c.recipient_id = u.id)) AS last_id
        FROM users u JOIN employees e ON e.user_id = u.id LEFT JOIN departments d ON d.id = e.department_id WHERE u.is_active = 1 AND u.id <> ? ORDER BY last_id IS NULL, last_id DESC, e.first_name`, [user.id, user.id, user.id, user.id]))[0];
      return json(200, rows.map((x) => ({ user_id: x.user_id, name: employeeName(x), department: x.department, unread: Number(x.unread), has_photo: !!x.photo_file })));
    }
    if ((mm = p.match(/^\/api\/ems\/chat\/(\d+)$/))) {
      const other = Number(mm[1]); if (other === user.id) bad('Choose someone else.');
      const [o] = await pool.query('SELECT id FROM users WHERE id = ? AND is_active = 1', [other]); if (!o[0]) throw new HttpError(404, 'Not found.');
      if (m === 'GET') {
        const after = Number(qs.get('after') || 0); const af = Number.isInteger(after) && after > 0 ? after : 0;
        const rows = (await pool.query('SELECT id, sender_id, body, created_at FROM chat_messages WHERE id > ? AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) ORDER BY id DESC LIMIT 100', [af, user.id, other, other, user.id]))[0].reverse();
        await pool.query('UPDATE chat_messages SET read_at = ? WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL', [toSql(new Date()), other, user.id]);
        return json(200, rows.map((x) => ({ id: x.id, mine: x.sender_id === user.id, body: x.body, created_at: iso(x.created_at) })));
      }
      if (m === 'POST') {
        const body = clampStr(readJson(r).body, 2000, 'Message', true);
        const recent = Number((await pool.query('SELECT COUNT(*) AS n FROM chat_messages WHERE sender_id = ? AND created_at > ?', [user.id, toSql(new Date(Date.now() - 60000))]))[0][0].n); if (recent >= 40) throw new HttpError(429, 'You are sending messages too quickly. Please wait a moment.');
        const [x] = await pool.query('INSERT INTO chat_messages (sender_id, recipient_id, body) VALUES (?,?,?)', [user.id, other, body]); return json(201, { id: x.insertId, mine: true, body, created_at: new Date().toISOString() });
      }
      throw new HttpError(405, 'Method not allowed.');
    }

    /* ===== reports ===== */
    if (p.startsWith('/api/ems/reports/')) {
      if (user.role === 'employee') throw new HttpError(403, 'You do not have permission to do that.');
      const scope = await scopeIds(user); const wantCsv = qs.get('format') === 'csv';
      const send = (name, header, rows) => wantCsv ? { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, body: '﻿' + [header, ...rows].map((l) => l.map(csvCell).join(',')).join('\r\n') } : null;
      if (p === '/api/ems/reports/attendance' && m === 'GET') {
        const month = qs.get('month') || todayStr.slice(0, 7); if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) bad('Month must look like 2026-10.');
        const s = await monthSummary(scope, month, cfg); const csv = send(`attendance-${month}`, ['Employee ID', 'Name', 'Department', 'Present', 'Late', 'Half day', 'Short', 'Missed check-out', 'Leave', 'Absent', 'Hours'], s.rows.map((x) => [x.employee_code, x.name, x.department, x.present, x.late, x.half_day, x.short, x.missed_checkout, x.leave, x.absent, x.hours]));
        if (csv) { await audit(user, 'report.export', 'attendance', month, null, r.ip); return csv; } return json(200, { month, ...s });
      }
      if (p === '/api/ems/reports/leave' && m === 'GET') {
        const year = Number(qs.get('year') || todayStr.slice(0, 4)); if (!Number.isInteger(year) || year < 2000 || year > 2100) bad('Year is invalid.');
        const w = ["l.status = 'approved'", 'YEAR(l.start_date) = ?']; const v = [year]; if (scope) { w.push(`l.employee_id IN (${scope.map(() => '?').join(',')})`); v.push(...scope); }
        const rows = (await pool.query(`SELECT e.id, e.first_name, e.last_name, e.employee_code, lt.name AS type_name, SUM(l.days) AS days FROM leave_requests l JOIN employees e ON e.id = l.employee_id JOIN leave_types lt ON lt.id = l.leave_type_id WHERE ${w.join(' AND ')} GROUP BY e.id, lt.id ORDER BY e.first_name, lt.name`, v))[0].map((x) => ({ employee_id: x.id, name: employeeName(x), employee_code: x.employee_code, leave_type: x.type_name, days: Number(x.days) }));
        const csv = send(`leave-${year}`, ['Employee ID', 'Name', 'Leave type', 'Days taken'], rows.map((x) => [x.employee_code, x.name, x.leave_type, x.days]));
        if (csv) { await audit(user, 'report.export', 'leave', year, null, r.ip); return csv; } return json(200, { year, rows });
      }
      if (p === '/api/ems/reports/tasks' && m === 'GET') {
        const w = []; const v = []; if (scope) { w.push(`t.assignee_id IN (${scope.map(() => '?').join(',')})`); v.push(...scope); }
        const rows = (await pool.query(`SELECT e.id, e.first_name, e.last_name, e.employee_code, SUM(t.status = 'todo') AS todo, SUM(t.status = 'in_progress') AS in_progress, SUM(t.status = 'blocked') AS blocked, SUM(t.status = 'done') AS done, SUM(t.status <> 'done' AND t.due_date < ?) AS overdue FROM tasks t JOIN employees e ON e.id = t.assignee_id ${w.length ? 'WHERE ' + w.join(' AND ') : ''} GROUP BY e.id ORDER BY e.first_name`, [todayStr, ...v]))[0].map((x) => ({ employee_id: x.id, name: employeeName(x), employee_code: x.employee_code, todo: Number(x.todo), in_progress: Number(x.in_progress), blocked: Number(x.blocked), done: Number(x.done), overdue: Number(x.overdue) }));
        const csv = send('tasks', ['Employee ID', 'Name', 'To do', 'In progress', 'Blocked', 'Done', 'Overdue'], rows.map((x) => [x.employee_code, x.name, x.todo, x.in_progress, x.blocked, x.done, x.overdue]));
        if (csv) { await audit(user, 'report.export', 'tasks', null, null, r.ip); return csv; } return json(200, { rows });
      }
    }
    throw new HttpError(404, 'Not found.');
  }

  return { route, notify };
}
