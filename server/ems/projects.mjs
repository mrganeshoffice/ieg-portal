/**
 * Projects (a named piece of work with several members) and the daily work log (what each person did, date by date).
 * Mounted from work.mjs, which hands over its shared helpers. Every route re-checks access on the server:
 *  - admin / super admin see every project and every person's log;
 *  - a manager sees projects they created or belong to, and the logs of their direct reports;
 *  - an employee sees only the projects they belong to and their own log.
 */
import { HttpError } from '../core.mjs';

const STATUS = ['planning', 'active', 'on_hold', 'completed'];

export function createProjects(h) {
  const { pool, json, readJson, audit, isAdmin, notify, empInfo, employeeName, scopeIds, canSeeEmployee, validDate, clampStr, idOf, bad, iso, toDate, dateIn, addDays, attendanceStatus, attDto, attendanceRange } = h;

  /** The caller's relationship to a project, or null when they cannot see it. */
  async function accessOrNull(u, id) {
    const [r] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]); const p = r[0]; if (!p) return null;
    if (isAdmin(u)) return { p, level: 'admin' };
    const emp = u.employee_id ?? -1;
    const [m] = await pool.query('SELECT role FROM project_members WHERE project_id = ? AND employee_id = ?', [id, emp]);
    if (p.created_by === emp) return { p, level: 'creator' };
    return m[0] ? { p, level: m[0].role } : null;
  }
  async function access(u, id) { const a = await accessOrNull(u, id); if (!a) throw new HttpError(404, 'Not found.'); return a; }
  const canManage = (a) => ['admin', 'creator', 'lead'].includes(a.level);
  const isMember = async (projectId, empId) => (await pool.query('SELECT 1 FROM project_members WHERE project_id = ? AND employee_id = ?', [projectId, empId]))[0].length > 0;

  async function dtos(rows, u) {
    if (!rows.length) return [];
    const ids = rows.map((p) => p.id); const ph = ids.map(() => '?').join(',');
    const [mem] = await pool.query(`SELECT pm.project_id, pm.role, e.id, e.first_name, e.last_name FROM project_members pm JOIN employees e ON e.id = pm.employee_id WHERE pm.project_id IN (${ph}) ORDER BY pm.role, e.first_name`, ids);
    const today = dateIn('Asia/Kolkata');
    const [cnt] = await pool.query(`SELECT project_id, COUNT(*) AS total, SUM(status = 'done') AS done, SUM(status <> 'done' AND due_date < ?) AS overdue FROM tasks WHERE project_id IN (${ph}) GROUP BY project_id`, [today, ...ids]);
    const [cr] = await pool.query(`SELECT id, first_name, last_name FROM employees WHERE id IN (${rows.map(() => '?').join(',')})`, rows.map((p) => p.created_by));
    const emp = u.employee_id ?? -1;
    return rows.map((p) => {
      const c = cnt.find((x) => x.project_id === p.id); const total = Number(c?.total || 0), done = Number(c?.done || 0);
      const members = mem.filter((m) => m.project_id === p.id).map((m) => ({ id: m.id, name: employeeName(m), role: m.role }));
      const mine = members.find((m) => m.id === emp);
      return { id: p.id, name: p.name, description: p.description, status: p.status, start_date: p.start_date, due_date: p.due_date, created_at: iso(p.created_at),
        created_by: { id: p.created_by, name: employeeName(cr.find((x) => x.id === p.created_by) || {}) }, members, tasks: { total, done, overdue: Number(c?.overdue || 0) }, progress: total ? Math.round((done / total) * 100) : 0,
        can_manage: isAdmin(u) || p.created_by === emp || mine?.role === 'lead' };
    });
  }

  async function validateMembers(u, list, existing = new Set()) {
    if (!Array.isArray(list) || list.length > 60) bad('Choose up to 60 members.');
    const out = new Map();
    for (const x of list) {
      const id = idOf(typeof x === 'object' ? x.employee_id : x, 'member'); const role = x && x.role === 'lead' ? 'lead' : 'member';
      const e = await empInfo(id); if (!e || !e.is_active) bad('One of the chosen members is not an active employee.');
      if (!isAdmin(u) && id !== u.employee_id && !existing.has(id) && e.manager_id !== u.employee_id) throw new HttpError(403, 'You can only add yourself or people who report to you.');
      out.set(id, role);
    }
    return out;
  }

  async function setMembers(u, projectId, name, next, creatorId) {
    const [cur] = await pool.query('SELECT employee_id, role FROM project_members WHERE project_id = ?', [projectId]);
    const have = new Map(cur.map((c) => [c.employee_id, c.role]));
    for (const [id, role] of next) {
      if (!have.has(id)) { await pool.query('INSERT INTO project_members (project_id, employee_id, role) VALUES (?,?,?)', [projectId, id, role]); const e = await empInfo(id); if (e && id !== u.employee_id) await notify(e.user_id, 'project', 'You were added to a project', name, `/tasks?project=${projectId}`); }
      else if (have.get(id) !== role) await pool.query('UPDATE project_members SET role = ? WHERE project_id = ? AND employee_id = ?', [role, projectId, id]);
    }
    for (const id of have.keys()) if (!next.has(id) && id !== creatorId) await pool.query('DELETE FROM project_members WHERE project_id = ? AND employee_id = ?', [projectId, id]);
  }

  /* ---------------- work log helpers ---------------- */
  const tz = () => 'Asia/Kolkata';
  async function activityFor(empIds, date, cfg) {
    const ph = empIds.map(() => '?').join(','); if (!empIds.length) return [];
    const [rows] = await pool.query(`SELECT a.*, t.title, t.project_id, p.name AS project_name FROM task_activity a JOIN tasks t ON t.id = a.task_id LEFT JOIN projects p ON p.id = t.project_id WHERE a.employee_id IN (${ph}) AND a.created_at BETWEEN ? AND ? ORDER BY a.id`, [...empIds, `${addDays(date, -1)} 00:00:00`, `${addDays(date, 1)} 23:59:59`]);
    return rows.filter((a) => dateIn(cfg.timezone, toDate(a.created_at)) === date);
  }
  const logDto = (l) => ({ id: l.id, date: l.log_date, summary: l.summary, hours: l.hours == null ? null : Number(l.hours), project: l.project_id ? { id: l.project_id, name: l.project_name } : null, task: l.task_id ? { id: l.task_id, title: l.task_title } : null, created_at: iso(l.created_at) });
  const actDto = (a) => ({ id: a.id, kind: a.kind, from: a.from_value, to: a.to_value, at: iso(a.created_at), task: { id: a.task_id, title: a.title }, project: a.project_id ? { id: a.project_id, name: a.project_name } : null });
  const logSql = 'SELECT l.*, p.name AS project_name, t.title AS task_title FROM work_logs l LEFT JOIN projects p ON p.id = l.project_id LEFT JOIN tasks t ON t.id = l.task_id';

  async function route(r, user, qs, ctx) {
    const p = r.pathname, m = r.method; let mm; const { cfg, todayStr } = ctx;

    /* ================= projects ================= */
    if (p === '/api/ems/projects' && m === 'GET') {
      let rows;
      if (isAdmin(user)) rows = (await pool.query('SELECT * FROM projects ORDER BY (status = \'completed\'), updated_at DESC LIMIT 300'))[0];
      else { const e = user.employee_id ?? -1; rows = (await pool.query('SELECT * FROM projects WHERE created_by = ? OR id IN (SELECT project_id FROM project_members WHERE employee_id = ?) ORDER BY (status = \'completed\'), updated_at DESC LIMIT 300', [e, e]))[0]; }
      return json(200, await dtos(rows, user));
    }
    if (p === '/api/ems/projects' && m === 'POST') {
      if (user.role === 'employee') throw new HttpError(403, 'Only managers and HR can create projects.');
      const emp = user.employee_id; if (emp == null) throw new HttpError(404, 'No employee profile is linked to this account.');
      const b = readJson(r); const name = clampStr(b.name, 140, 'Project name', true); const description = clampStr(b.description, 4000, 'Description');
      const status = b.status ?? 'active'; if (!STATUS.includes(status)) bad('Choose a valid status.');
      for (const k of ['start_date', 'due_date']) if (b[k] && !validDate(b[k])) bad('Choose valid dates.');
      if (b.start_date && b.due_date && b.due_date < b.start_date) bad('The due date cannot be before the start date.');
      const members = await validateMembers(user, b.members ?? []); members.set(emp, 'lead');
      const [x] = await pool.query('INSERT INTO projects (name, description, status, start_date, due_date, created_by) VALUES (?,?,?,?,?,?)', [name, description, status, b.start_date || null, b.due_date || null, emp]);
      await setMembers(user, x.insertId, name, members, emp);
      await audit(user, 'project.create', 'project', x.insertId, { name, members: members.size }, r.ip);
      return json(201, (await dtos((await pool.query('SELECT * FROM projects WHERE id = ?', [x.insertId]))[0], user))[0]);
    }
    if ((mm = p.match(/^\/api\/ems\/projects\/(\d+)$/))) {
      const a = await access(user, Number(mm[1]));
      if (m === 'GET') {
        const dto = (await dtos([a.p], user))[0];
        const today = dateIn(cfg.timezone);
        const [st] = await pool.query("SELECT assignee_id, COUNT(*) AS total, SUM(status = 'done') AS done, SUM(status = 'in_progress') AS in_progress, SUM(status = 'blocked') AS blocked, SUM(status <> 'done' AND due_date < ?) AS overdue FROM tasks WHERE project_id = ? GROUP BY assignee_id", [today, a.p.id]);
        dto.members = dto.members.map((x) => { const s = st.find((y) => y.assignee_id === x.id); return { ...x, total: Number(s?.total || 0), done: Number(s?.done || 0), in_progress: Number(s?.in_progress || 0), blocked: Number(s?.blocked || 0), overdue: Number(s?.overdue || 0) }; });
        return json(200, dto);
      }
      if (m === 'PATCH') {
        if (!canManage(a)) throw new HttpError(403, 'Only the project lead or HR can change this project.');
        const b = readJson(r); const sets = [], vals = [];
        if (b.name !== undefined) { sets.push('name = ?'); vals.push(clampStr(b.name, 140, 'Project name', true)); }
        if (b.description !== undefined) { sets.push('description = ?'); vals.push(clampStr(b.description, 4000, 'Description')); }
        if (b.status !== undefined) { if (!STATUS.includes(b.status)) bad('Choose a valid status.'); sets.push('status = ?'); vals.push(b.status); }
        for (const k of ['start_date', 'due_date']) if (b[k] !== undefined) { if (b[k] && !validDate(b[k])) bad('Choose valid dates.'); sets.push(`${k} = ?`); vals.push(b[k] || null); }
        if (sets.length) await pool.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, [...vals, a.p.id]);
        if (b.members !== undefined) {
          const [cur] = await pool.query('SELECT employee_id, role FROM project_members WHERE project_id = ?', [a.p.id]);
          const next = await validateMembers(user, b.members, new Set(cur.map((c) => c.employee_id)));
          if (!isAdmin(user)) for (const c of cur) { if (next.has(c.employee_id)) continue; const e = await empInfo(c.employee_id); if (c.employee_id !== user.employee_id && e && e.manager_id !== user.employee_id) next.set(c.employee_id, c.role); }
          await setMembers(user, a.p.id, a.p.name, next, a.p.created_by);
        }
        if (!sets.length && b.members === undefined) bad('Nothing to change.');
        await audit(user, 'project.update', 'project', a.p.id, { fields: Object.keys(b) }, r.ip);
        return json(200, (await dtos((await pool.query('SELECT * FROM projects WHERE id = ?', [a.p.id]))[0], user))[0]);
      }
      if (m === 'DELETE') {
        if (!(a.level === 'admin' || a.level === 'creator')) throw new HttpError(403, 'Only HR or the project creator can delete it.');
        await pool.query('DELETE FROM projects WHERE id = ?', [a.p.id]); await audit(user, 'project.delete', 'project', a.p.id, { name: a.p.name }, r.ip);
        return json(200, { ok: true });
      }
      throw new HttpError(405, 'Method not allowed.');
    }

    /* ================= daily work log ================= */
    if (p === '/api/ems/worklog' && m === 'GET') {
      const date = qs.get('date') || todayStr; if (!validDate(date)) bad('Date must look like 2026-10-28.');
      let target = user.employee_id; const q = qs.get('employee_id');
      if (q) { target = idOf(q, 'employee'); if (!(await canSeeEmployee(user, target))) throw new HttpError(404, 'Not found.'); }
      if (target == null) throw new HttpError(404, 'No employee profile is linked to this account.');
      const info = await empInfo(target);
      const [dep] = await pool.query('SELECT d.name FROM employees e LEFT JOIN departments d ON d.id = e.department_id WHERE e.id = ?', [target]);
      const logs = (await pool.query(`${logSql} WHERE l.employee_id = ? AND l.log_date = ? ORDER BY l.id`, [target, date]))[0].map(logDto);
      const activity = (await activityFor([target], date, cfg)).map(actDto);
      const [att] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [target, date]);
      const [due] = await pool.query("SELECT t.id, t.title, t.status, t.priority, p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE t.assignee_id = ? AND t.due_date = ? ORDER BY t.id", [target, date]);
      const [open] = await pool.query("SELECT COUNT(*) AS n FROM tasks WHERE assignee_id = ? AND status <> 'done'", [target]);
      return json(200, { date, employee: { id: target, name: employeeName(info), department: dep[0]?.name ?? null }, attendance: att[0] ? { ...attDto(att[0], cfg, todayStr), status: attendanceStatus(att[0], cfg, todayStr) } : null, logs, activity, due_tasks: due.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, project: t.project_name })), open_tasks: Number(open[0].n),
        totals: { logs: logs.length, hours: Math.round(logs.reduce((s, l) => s + (l.hours || 0), 0) * 10) / 10, completed: activity.filter((a) => a.kind === 'status' && a.to === 'done').length, changed: activity.length } });
    }
    if (p === '/api/ems/worklog/range' && m === 'GET') {
      const to = qs.get('to') || todayStr; const from = qs.get('from') || addDays(to, -13); if (!validDate(from) || !validDate(to) || from > to) bad('Choose a valid date range.');
      if ((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000 > 62) bad('Choose a range of up to 62 days.');
      let target = user.employee_id; const q = qs.get('employee_id');
      if (q) { target = idOf(q, 'employee'); if (!(await canSeeEmployee(user, target))) throw new HttpError(404, 'Not found.'); }
      if (target == null) throw new HttpError(404, 'No employee profile is linked to this account.');
      const [logs] = await pool.query('SELECT log_date, COUNT(*) AS n, SUM(hours) AS hours FROM work_logs WHERE employee_id = ? AND log_date BETWEEN ? AND ? GROUP BY log_date', [target, from, to]);
      const [acts] = await pool.query('SELECT kind, to_value, created_at FROM task_activity WHERE employee_id = ? AND created_at BETWEEN ? AND ?', [target, `${addDays(from, -1)} 00:00:00`, `${addDays(to, 1)} 23:59:59`]);
      const att = await attendanceRange([target], from, to);
      const days = []; for (let d = to; d >= from; d = addDays(d, -1)) {
        const l = logs.find((x) => x.log_date === d); const a = acts.filter((x) => dateIn(cfg.timezone, toDate(x.created_at)) === d); const at = att.find((x) => x.work_date === d);
        days.push({ date: d, logs: Number(l?.n || 0), hours: Math.round(Number(l?.hours || 0) * 10) / 10, completed: a.filter((x) => x.kind === 'status' && x.to_value === 'done').length, changed: a.length, attendance: at ? attendanceStatus(at, cfg, todayStr) : null });
      }
      return json(200, { from, to, days });
    }
    if (p === '/api/ems/worklog/team' && m === 'GET') {
      if (user.role === 'employee') throw new HttpError(403, 'You do not have permission to do that.');
      const date = qs.get('date') || todayStr; if (!validDate(date)) bad('Date must look like 2026-10-28.');
      const scope = await scopeIds(user); const where = ['u.is_active = 1']; const vals = [];
      if (scope) { where.push(`e.id IN (${scope.map(() => '?').join(',')})`); vals.push(...scope); }
      const [emps] = await pool.query(`SELECT e.id, e.first_name, e.last_name, e.employee_code, COALESCE(e.joining_date, DATE(e.created_at)) AS joining_date, d.name AS department FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN departments d ON d.id = e.department_id WHERE ${where.join(' AND ')} ORDER BY e.first_name, e.id`, vals);
      const live = emps.filter((e) => !e.joining_date || e.joining_date <= date); const ids = live.map((e) => e.id);
      const logs = ids.length ? (await pool.query(`${logSql} WHERE l.log_date = ? AND l.employee_id IN (${ids.map(() => '?').join(',')}) ORDER BY l.id`, [date, ...ids]))[0] : [];
      const acts = await activityFor(ids, date, cfg); const att = ids.length ? await attendanceRange(ids, date, date) : [];
      const rows = live.map((e) => {
        const my = logs.filter((l) => l.employee_id === e.id); const ac = acts.filter((a) => a.employee_id === e.id); const at = att.find((x) => x.employee_id === e.id);
        return { employee_id: e.id, name: employeeName(e), employee_code: e.employee_code, department: e.department, logs: my.length, hours: Math.round(my.reduce((s, l) => s + Number(l.hours || 0), 0) * 10) / 10, completed: ac.filter((a) => a.kind === 'status' && a.to_value === 'done').length, changed: ac.length, attendance: at ? attendanceStatus(at, cfg, todayStr) : null, latest: my.slice(-2).map((l) => ({ summary: l.summary.slice(0, 160), project: l.project_name })) };
      });
      return json(200, { date, rows, summary: { total: rows.length, updated: rows.filter((x) => x.logs > 0).length, missing: rows.filter((x) => x.logs === 0).length, hours: Math.round(rows.reduce((s, x) => s + x.hours, 0) * 10) / 10, completed: rows.reduce((s, x) => s + x.completed, 0) } });
    }
    if (p === '/api/ems/worklog' && m === 'POST') {
      const emp = user.employee_id; if (emp == null) throw new HttpError(404, 'No employee profile is linked to this account.');
      const b = readJson(r); const date = b.date || todayStr; if (!validDate(date)) bad('Choose a valid date.');
      if (date > todayStr) bad('You cannot write an update for a future date.'); if (!isAdmin(user) && date < addDays(todayStr, -14)) bad('Updates can be added for the last 14 days only.');
      const summary = clampStr(b.summary, 2000, 'Update', true); let hours = null;
      if (b.hours !== undefined && b.hours !== null && b.hours !== '') { hours = Number(b.hours); if (!Number.isFinite(hours) || hours < 0 || hours > 24) bad('Hours must be between 0 and 24.'); hours = Math.round(hours * 2) / 2; }
      let projectId = null, taskId = null;
      if (b.task_id) { taskId = idOf(b.task_id, 'task'); const [t] = await pool.query('SELECT id, assignee_id, project_id FROM tasks WHERE id = ?', [taskId]); if (!t[0]) bad('Choose a valid task.'); const ok = t[0].assignee_id === emp || (t[0].project_id && (await accessOrNull(user, t[0].project_id))); if (!ok) bad('Choose one of your own tasks.'); projectId = t[0].project_id; }
      if (b.project_id) { const pid = idOf(b.project_id, 'project'); if (!(await accessOrNull(user, pid))) bad('Choose a project you belong to.'); projectId = pid; }
      const [x] = await pool.query('INSERT INTO work_logs (employee_id, log_date, project_id, task_id, summary, hours) VALUES (?,?,?,?,?,?)', [emp, date, projectId, taskId, summary, hours]);
      return json(201, logDto((await pool.query(`${logSql} WHERE l.id = ?`, [x.insertId]))[0][0]));
    }
    if ((mm = p.match(/^\/api\/ems\/worklog\/(\d+)$/)) && m === 'DELETE') {
      const [l] = await pool.query('SELECT * FROM work_logs WHERE id = ?', [Number(mm[1])]); const row = l[0];
      if (!row || (row.employee_id !== user.employee_id && !isAdmin(user))) throw new HttpError(404, 'Not found.');
      if (!isAdmin(user) && row.log_date < addDays(todayStr, -14)) throw new HttpError(403, 'Old updates cannot be removed.');
      await pool.query('DELETE FROM work_logs WHERE id = ?', [row.id]); return json(200, { ok: true });
    }
    return null;
  }
  return { route, access, accessOrNull, canManage, isMember };
}
