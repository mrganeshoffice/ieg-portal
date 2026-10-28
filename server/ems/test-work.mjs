/** Integration test for attendance, tasks, leave, holidays, notifications, chat, reports and portal access. Use a THROWAWAY database (see test-api.mjs). */
const BASE = process.env.TEST_URL || 'http://localhost:3990';
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { if (c) { pass++; console.log(`  ok   ${n}`); } else { fail++; console.log(`  FAIL ${n} ${x}`); } };
class Client {
  constructor() { this.cookies = {}; }
  async call(method, path, body) {
    const h = {}; if (Object.keys(this.cookies).length) h.cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    let payload; if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(BASE + path, { method, headers: h, body: payload });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (/Max-Age=0/i.test(c)) delete this.cookies[kv.slice(0, i)]; else this.cookies[kv.slice(0, i)] = kv.slice(i + 1); }
    const ct = res.headers.get('content-type') || ''; const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
    return { status: res.status, data };
  }
}
const uniq = Date.now().toString(36);
const login = async (email, password) => { const c = new Client(); const r = await c.call('POST', '/api/auth/login', { email, password }); if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status}`); return c; };
const admin = await login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
const mk = async (name, role, mgr) => { const r = await admin.call('POST', '/api/ems/employees', { email: `${name}-${uniq}@test.local`, first_name: name, role, manager_id: mgr, joining_date: '2026-01-01', temporary_password: 'Pass-Word-12345' }); if (r.status !== 201) throw new Error('create ' + name + ' ' + JSON.stringify(r.data)); return { emp: r.data.employee, email: `${name}-${uniq}@test.local` }; };
const M = await mk('Mgr', 'manager'); const E1 = await mk('Emp1', 'employee', M.emp.id); const E2 = await mk('Emp2', 'employee');
const cm = await login(M.email, 'Pass-Word-12345'), c1 = await login(E1.email, 'Pass-Word-12345'), c2 = await login(E2.email, 'Pass-Word-12345');
const today = (await c1.call('GET', '/api/ems/attendance/today')).data.today;

console.log('portal access');
let r = await c1.call('GET', '/api/auth/me'); ok(r.data.fullAccess === false, 'normal employee has no full portal access');
r = await admin.call('POST', '/api/ems/employees', { email: 'ieg@ieg.com', first_name: 'IEG', role: 'employee', temporary_password: 'Pass-Word-12345' });
if (r.status === 409) ok(true, 'ieg@ieg.com already exists'); else ok(r.status === 201 && r.data.employee.portal_full === true, 'ieg@ieg.com created with full access', JSON.stringify(r.data).slice(0, 160));
const cf = await login('ieg@ieg.com', 'Pass-Word-12345').catch(() => null); if (cf) { r = await cf.call('GET', '/api/auth/me'); ok(r.data.fullAccess === true, 'ieg@ieg.com session reports fullAccess'); }
r = await cm.call('POST', `/api/ems/employees/${E1.emp.id}/portal-access`, { full: true }); ok(r.status === 403, 'manager cannot grant portal access');
r = await admin.call('POST', `/api/ems/employees/${E1.emp.id}/portal-access`, { full: true }); ok(r.status === 200 && r.data.portal_full === true, 'super admin grants portal access');
r = await admin.call('POST', `/api/ems/employees/${E1.emp.id}/portal-access`, { full: false }); ok(r.status === 200 && r.data.portal_full === false, 'and revokes it');

console.log('attendance');
r = await c1.call('POST', '/api/ems/attendance/check-out'); ok(r.status === 409, 'cannot check out before checking in');
r = await c1.call('POST', '/api/ems/attendance/check-in'); ok(r.status === 201 && r.data.check_in, 'check in');
r = await c1.call('POST', '/api/ems/attendance/check-in'); ok(r.status === 409, 'second check-in rejected');
r = await c1.call('POST', '/api/ems/attendance/check-out'); ok(r.status === 200 && r.data.check_out, 'check out');
r = await c1.call('POST', '/api/ems/attendance/check-out'); ok(r.status === 409, 'second check-out rejected');
r = await c1.call('GET', `/api/ems/attendance?month=${today.slice(0, 7)}`); ok(r.status === 200 && r.data.records.length === 1, 'own monthly attendance');
r = await c1.call('GET', `/api/ems/attendance?employee_id=${E2.emp.id}`); ok(r.status === 404, 'employee cannot read another employee attendance');
r = await cm.call('GET', `/api/ems/attendance?employee_id=${E1.emp.id}`); ok(r.status === 200, 'manager reads direct report attendance');
r = await cm.call('GET', `/api/ems/attendance?employee_id=${E2.emp.id}`); ok(r.status === 404, 'manager cannot read non-report attendance');
r = await c1.call('GET', '/api/ems/attendance/team'); ok(r.status === 403, 'employee cannot open team attendance');
r = await cm.call('GET', '/api/ems/attendance/team'); ok(r.status === 200 && r.data.rows.every((x) => [E1.emp.id, M.emp.id].includes(x.employee_id)), 'manager team view limited to team');
r = await admin.call('GET', '/api/ems/attendance/team'); ok(r.status === 200 && r.data.rows.some((x) => x.employee_id === E2.emp.id), 'admin team view sees all');
r = await c1.call('PUT', `/api/ems/attendance/${E1.emp.id}/${today}`, { check_in: new Date().toISOString(), note: 'x' }); ok(r.status === 403, 'employee cannot correct attendance');
r = await admin.call('PUT', `/api/ems/attendance/${E2.emp.id}/${today}`, { check_in: new Date(Date.now() - 9 * 3600e3).toISOString(), check_out: new Date().toISOString() }); ok(r.status === 400, 'correction requires a note');
r = await admin.call('PUT', `/api/ems/attendance/${E2.emp.id}/${today}`, { check_in: new Date(Date.now() - 9 * 3600e3).toISOString(), check_out: new Date().toISOString(), note: 'Forgot to punch' }); ok(r.status === 200 && r.data.source === 'admin', 'admin corrects attendance with a note');
r = await c2.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => n.kind === 'attendance'), 'employee notified about correction');
r = await admin.call('PUT', `/api/ems/attendance/${E2.emp.id}/2999-01-01`, { check_in: new Date().toISOString(), note: 'x' }); ok(r.status === 400, 'future date rejected');

console.log('holidays and settings');
r = await cm.call('POST', '/api/ems/holidays', { date: '2026-12-25', name: 'Test holiday' }); ok(r.status === 403, 'manager cannot add holiday');
r = await admin.call('POST', '/api/ems/holidays', { date: '2026-12-25', name: `Holiday ${uniq}` }); ok(r.status === 201 || r.status === 409, 'admin adds holiday'); const hid = r.data.id;
r = await admin.call('POST', '/api/ems/holidays', { date: '2026-02-30', name: 'Bad' }); ok(r.status === 400, 'impossible date rejected');
r = await c1.call('GET', '/api/ems/holidays?year=2026'); ok(r.status === 200 && Array.isArray(r.data), 'everyone lists holidays');
r = await c1.call('PUT', '/api/ems/settings', { work_start: '10:00' }); ok(r.status === 403, 'employee cannot change settings');
r = await admin.call('PUT', '/api/ems/settings', { work_start: '25:00' }); ok(r.status === 400, 'invalid start time rejected');
r = await admin.call('PUT', '/api/ems/settings', { work_start: '09:30', weekly_off: '0' }); ok(r.status === 200 && r.data.work_start === '09:30', 'admin updates settings');

console.log('leave');
r = await c1.call('POST', '/api/ems/leave', { leave_type_id: 999999, start_date: '2026-12-01', end_date: '2026-12-02' }); ok(r.status === 400, 'unknown leave type rejected');
r = await c1.call('POST', '/api/ems/leave/types', { name: 'Casual', annual_quota: 5 }); ok(r.status === 403, 'employee cannot create leave type');
r = await admin.call('POST', '/api/ems/leave/types', { name: `Casual ${uniq}`, annual_quota: 3 }); ok(r.status === 201, 'admin creates leave type'); const lt = r.data.id;
r = await c1.call('POST', '/api/ems/leave', { leave_type_id: lt, start_date: '2026-12-08', end_date: '2026-12-04', reason: 'x' }); ok(r.status === 400, 'end before start rejected');
r = await c1.call('POST', '/api/ems/leave', { leave_type_id: lt, start_date: '2026-12-08', end_date: '2026-12-09', reason: 'Family' }); ok(r.status === 201 && r.data.days === 2 && r.data.status === 'pending', 'employee requests 2 days', JSON.stringify(r.data)); const lv = r.data.id;
r = await c1.call('POST', '/api/ems/leave', { leave_type_id: lt, start_date: '2026-12-09', end_date: '2026-12-10' }); ok(r.status === 409, 'overlapping request rejected');
r = await c1.call('POST', '/api/ems/leave', { leave_type_id: lt, start_date: '2026-12-15', end_date: '2026-12-18' }); ok(r.status === 409, 'request above remaining balance rejected');
r = await cm.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => n.kind === 'leave'), 'manager notified of request');
r = await c1.call('POST', `/api/ems/leave/${lv}/approve`, {}); ok(r.status === 404 || r.status === 403, 'employee cannot approve own leave');
r = await c2.call('POST', `/api/ems/leave/${lv}/approve`, {}); ok(r.status === 404 || r.status === 403, 'unrelated employee cannot approve');
r = await cm.call('GET', '/api/ems/leave?scope=decide'); ok(r.status === 200 && r.data.some((x) => x.id === lv), 'manager sees the request to decide');
r = await cm.call('POST', `/api/ems/leave/${lv}/approve`, { note: 'ok' }); ok(r.status === 200, 'manager approves');
r = await cm.call('POST', `/api/ems/leave/${lv}/approve`, {}); ok(r.status === 409, 'cannot decide twice');
r = await c1.call('GET', '/api/ems/leave/balance'); ok(r.data.balances.find((b) => b.leave_type_id === lt)?.used === 2, 'balance reflects approved days');
r = await c1.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => /approved/.test(n.title)), 'employee notified of decision');
r = await c2.call('GET', '/api/ems/leave?scope=all'); ok(r.status === 403, 'employee cannot list all leave');
r = await cm.call('POST', '/api/ems/leave', { leave_type_id: lt, start_date: '2026-12-22', end_date: '2026-12-22' }); ok(r.status === 201, 'manager requests own leave'); const mlv = r.data.id;
r = await cm.call('POST', `/api/ems/leave/${mlv}/approve`, {}); ok(r.status === 403, 'manager cannot approve own leave');
r = await admin.call('POST', `/api/ems/leave/${mlv}/reject`, { note: 'busy period' }); ok(r.status === 200, 'admin rejects manager leave');

console.log('tasks');
r = await c1.call('POST', '/api/ems/tasks', { title: '' }); ok(r.status === 400, 'title required');
r = await c1.call('POST', '/api/ems/tasks', { title: 'Self task', due_date: '2020-01-01' }); ok(r.status === 201 && r.data.overdue === true, 'employee creates own task (overdue flag)'); const ts = r.data.id;
r = await c1.call('POST', '/api/ems/tasks', { title: 'For other', assignee_id: E2.emp.id }); ok(r.status === 403, 'employee cannot assign to others');
r = await cm.call('POST', '/api/ems/tasks', { title: 'Team task', assignee_id: E1.emp.id, priority: 'high' }); ok(r.status === 201, 'manager assigns to report'); const tm = r.data.id;
r = await cm.call('POST', '/api/ems/tasks', { title: 'Not mine', assignee_id: E2.emp.id }); ok(r.status === 403, 'manager cannot assign outside team');
r = await c1.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => n.kind === 'task'), 'assignee notified');
r = await c2.call('GET', `/api/ems/tasks/${tm}`); ok(r.status === 404, 'unrelated employee cannot see task');
r = await c1.call('PATCH', `/api/ems/tasks/${tm}`, { status: 'in_progress' }); ok(r.status === 200 && r.data.status === 'in_progress', 'assignee updates status');
r = await c1.call('PATCH', `/api/ems/tasks/${tm}`, { title: 'renamed' }); ok(r.status === 403, 'assignee cannot edit details');
r = await c1.call('POST', `/api/ems/tasks/${tm}/comments`, { body: 'Working on it' }); ok(r.status === 201, 'assignee comments');
r = await c2.call('POST', `/api/ems/tasks/${tm}/comments`, { body: 'hi' }); ok(r.status === 404, 'outsider cannot comment');
r = await cm.call('GET', `/api/ems/tasks/${tm}/comments`); ok(r.data.length === 1, 'creator reads comments');
r = await c1.call('PATCH', `/api/ems/tasks/${tm}`, { status: 'done' }); ok(r.status === 200 && r.data.completed_at, 'assignee completes');
r = await cm.call('GET', '/api/ems/tasks?view=team'); ok(r.status === 200 && r.data.some((t) => t.id === tm), 'manager team task list');
r = await c1.call('GET', '/api/ems/tasks?view=team'); ok(r.status === 403, 'employee cannot list team tasks');
r = await c1.call('DELETE', `/api/ems/tasks/${tm}`); ok(r.status === 403, 'assignee cannot delete manager task');
r = await c1.call('DELETE', `/api/ems/tasks/${ts}`); ok(r.status === 200, 'creator deletes own task');

console.log('chat and notifications');
const uid = async (c) => (await c.call('GET', '/api/auth/me')).data.id; const u1 = await uid(c1), u2 = await uid(c2);
r = await c1.call('POST', `/api/ems/chat/${u2}`, { body: 'Hello <b>there</b>' }); ok(r.status === 201, 'send message');
r = await c1.call('POST', `/api/ems/chat/${u1}`, { body: 'me' }); ok(r.status === 400, 'cannot message yourself');
r = await c1.call('POST', `/api/ems/chat/${u2}`, { body: '   ' }); ok(r.status === 400, 'empty message rejected');
r = await c2.call('GET', '/api/ems/chat/people'); ok(r.data.find((p) => p.user_id === u1)?.unread === 1, 'recipient sees unread count');
r = await c2.call('GET', `/api/ems/chat/${u1}`); ok(r.data.length === 1 && r.data[0].body === 'Hello <b>there</b>' && r.data[0].mine === false, 'recipient reads thread (stored verbatim, escaped by the UI)');
r = await c2.call('GET', '/api/ems/chat/people'); ok(r.data.find((p) => p.user_id === u1)?.unread === 0, 'reading clears unread');
r = await cm.call('GET', `/api/ems/chat/${u1}`); ok(r.status === 200 && r.data.length === 0, 'third person sees an empty thread (cannot read others)');
r = await c1.call('POST', '/api/ems/notifications/read', {}); ok(r.status === 200, 'mark notifications read');
r = await c1.call('GET', '/api/ems/notifications'); ok(r.data.unread === 0, 'unread cleared');

console.log('reports and home');
r = await c1.call('GET', '/api/ems/reports/attendance'); ok(r.status === 403, 'employee cannot open reports');
r = await cm.call('GET', '/api/ems/reports/attendance'); ok(r.status === 200 && r.data.rows.every((x) => [E1.emp.id, M.emp.id].includes(x.employee_id)), 'manager attendance report limited to team');
r = await admin.call('GET', '/api/ems/reports/attendance'); ok(r.status === 200 && r.data.rows.some((x) => x.employee_id === E2.emp.id), 'admin attendance report covers everyone');
r = await admin.call('GET', '/api/ems/reports/attendance?format=csv'); ok(r.status === 200 && /Employee ID,Name/.test(r.data), 'attendance CSV');
r = await admin.call('GET', '/api/ems/reports/leave'); ok(r.status === 200 && r.data.rows.some((x) => x.days === 2), 'leave report');
r = await admin.call('GET', '/api/ems/reports/tasks'); ok(r.status === 200, 'task report');
r = await admin.call('GET', '/api/ems/reports/attendance?month=2026-13'); ok(r.status === 400, 'bad month rejected');
r = await c1.call('GET', '/api/ems/home'); ok(r.status === 200 && r.data.attendance, 'home summary');
r = await new Client().call('GET', '/api/ems/tasks'); ok(r.status === 401, 'work routes require sign-in');
r = await new Client().call('POST', '/api/ems/attendance/check-in'); ok(r.status === 401 || r.status === 403, 'unauthenticated check-in rejected');
if (hid) await admin.call('DELETE', `/api/ems/holidays/${hid}`);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
