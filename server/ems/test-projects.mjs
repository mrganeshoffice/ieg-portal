/** Integration test for projects, task chat and the daily work log. Use a THROWAWAY database. */
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
const E3 = await mk('Emp3', 'employee', M.emp.id);
const cm = await login(M.email, 'Pass-Word-12345'), c1 = await login(E1.email, 'Pass-Word-12345'), c2 = await login(E2.email, 'Pass-Word-12345'), c3 = await login(E3.email, 'Pass-Word-12345');
const today = (await c1.call('GET', '/api/ems/attendance/today')).data.today;
let r;

console.log('projects');
r = await c1.call('POST', '/api/ems/projects', { name: 'Nope' }); ok(r.status === 403, 'employee cannot create a project');
r = await cm.call('POST', '/api/ems/projects', { name: 'Charger v2', members: [E1.emp.id, E2.emp.id] }); ok(r.status === 403, 'manager cannot add someone outside their team');
r = await cm.call('POST', '/api/ems/projects', { name: 'Charger v2', description: 'Redesign', members: [{ employee_id: E1.emp.id, role: 'member' }, E3.emp.id] }); ok(r.status === 201 && r.data.members.length === 3, 'manager creates a project with team', JSON.stringify(r.data).slice(0, 200));
const P = r.data; ok(P.members.find((m) => m.id === M.emp.id)?.role === 'lead', 'creator is lead');
r = await admin.call('POST', '/api/ems/projects', { name: 'HR Portal', members: [E2.emp.id, E1.emp.id] }); const P2 = r.data; ok(r.status === 201 && P2.members.length === 3, 'admin creates a project with anyone');
r = await c1.call('GET', '/api/ems/projects'); ok(r.status === 200 && r.data.length === 2, 'member sees both of their projects');
r = await c2.call('GET', '/api/ems/projects'); ok(r.data.length === 1 && r.data[0].id === P2.id, 'non-member sees only own project');
r = await c2.call('GET', `/api/ems/projects/${P.id}`); ok(r.status === 404, 'non-member gets 404 for other project');
r = await c1.call('PATCH', `/api/ems/projects/${P.id}`, { name: 'Hacked' }); ok(r.status === 403, 'plain member cannot edit project');
r = await cm.call('PATCH', `/api/ems/projects/${P.id}`, { status: 'planning', due_date: '2099-01-01' }); ok(r.status === 200 && r.data.status === 'planning', 'lead edits project');
r = await cm.call('PATCH', `/api/ems/projects/${P2.id}`, { name: 'x' }); ok(r.status === 404, 'manager cannot touch a project they are not in');
r = await cm.call('PATCH', `/api/ems/projects/${P.id}`, { members: [{ employee_id: E1.emp.id, role: 'lead' }, E3.emp.id] }); ok(r.status === 200 && r.data.members.find((m) => m.id === E1.emp.id)?.role === 'lead', 'lead can promote a member');
r = await cm.call('PATCH', `/api/ems/projects/${P.id}`, { members: [{ employee_id: E1.emp.id, role: 'member' }, E3.emp.id] });
r = await c3.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => /added to a project/.test(n.title)), 'added member is notified');

console.log('project tasks');
r = await c1.call('POST', '/api/ems/tasks', { title: 'Self task', project_id: P.id }); ok(r.status === 201 && r.data.project?.id === P.id && r.data.assignee.id === E1.emp.id, 'member creates a task for self in project');
const T1 = r.data;
r = await c1.call('POST', '/api/ems/tasks', { title: 'Give to Emp3', project_id: P.id, assignee_id: E3.emp.id }); ok(r.status === 403, 'plain member cannot assign to others');
r = await cm.call('POST', '/api/ems/tasks', { title: 'Wiring', project_id: P.id, assignee_id: E3.emp.id, due_date: today }); ok(r.status === 201 && r.data.assignee.id === E3.emp.id, 'lead assigns to a member');
const T3 = r.data;
r = await cm.call('POST', '/api/ems/tasks', { title: 'Outsider', project_id: P.id, assignee_id: E2.emp.id }); ok(r.status === 400, 'cannot assign to non-member');
r = await c2.call('POST', '/api/ems/tasks', { title: 'Sneaky', project_id: P.id }); ok(r.status === 404, 'non-member cannot add tasks to project');
r = await c1.call('GET', `/api/ems/tasks?view=project&project_id=${P.id}`); ok(r.status === 200 && r.data.length === 2, 'member sees all project tasks');
r = await c2.call('GET', `/api/ems/tasks?view=project&project_id=${P.id}`); ok(r.status === 404, 'non-member cannot list project tasks');
r = await c1.call('GET', `/api/ems/tasks/${T3.id}`); ok(r.status === 200, 'member can open a teammate task');
r = await c2.call('GET', `/api/ems/tasks/${T3.id}`); ok(r.status === 404, 'outsider cannot open it');
r = await c1.call('PATCH', `/api/ems/tasks/${T3.id}`, { status: 'done' }); ok(r.status === 403, 'non-assignee member cannot change someone else status');
r = await c3.call('PATCH', `/api/ems/tasks/${T3.id}`, { status: 'in_progress' }); ok(r.status === 200, 'assignee changes status');
r = await c3.call('PATCH', `/api/ems/tasks/${T3.id}`, { status: 'done' }); ok(r.status === 200, 'assignee completes');
r = await admin.call('GET', `/api/ems/tasks?view=all&employee_id=${E3.emp.id}`); ok(r.status === 200 && r.data.every((t) => t.assignee.id === E3.emp.id) && r.data.length >= 1, 'admin filters tasks by employee');
r = await admin.call('GET', `/api/ems/tasks?view=all&project_id=${P.id}`); ok(r.data.length === 2, 'admin filters tasks by project');
r = await cm.call('GET', '/api/ems/projects'); ok(r.data.find((p) => p.id === P.id)?.tasks.total === 2 && r.data.find((p) => p.id === P.id)?.progress === 50, 'progress counts done tasks');

console.log('task chat and notifications');
r = await c3.call('POST', `/api/ems/tasks/${T3.id}/comments`, { body: 'Need the drawing' }); ok(r.status === 201, 'assignee posts');
r = await cm.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => /Emp3/.test(n.title) && /Need the drawing/.test(n.body) && n.link === `/tasks?task=${T3.id}`), 'creator notified with deep link');
r = await admin.call('POST', `/api/ems/tasks/${T3.id}/comments`, { body: 'Admin here, drawing attached' }); ok(r.status === 201, 'admin can join the discussion');
r = await c3.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => /Admin here/.test(n.body)), 'assignee notified of admin message');
r = await cm.call('POST', `/api/ems/tasks/${T3.id}/comments`, { body: 'Thanks' });
r = await admin.call('GET', '/api/ems/notifications'); ok(r.data.items.some((n) => /Thanks/.test(n.body)), 'earlier commenter (admin) notified too');
r = await c3.call('GET', `/api/ems/tasks/${T3.id}/comments`); ok(r.data.length === 3 && r.data[0].mine === true && r.data[1].mine === false, 'comments flag own messages');
r = await c2.call('POST', `/api/ems/tasks/${T3.id}/comments`, { body: 'hi' }); ok(r.status === 404, 'outsider cannot comment');

console.log('daily work log');
r = await c3.call('POST', '/api/ems/worklog', { summary: 'Cut cables', hours: 3.5, task_id: T3.id }); ok(r.status === 201 && r.data.project?.id === P.id && r.data.hours === 3.5, 'employee writes an update (project from task)');
r = await c3.call('POST', '/api/ems/worklog', { summary: 'Review', hours: 2 }); ok(r.status === 201, 'second update');
r = await c3.call('POST', '/api/ems/worklog', { summary: '', hours: 1 }); ok(r.status === 400, 'empty update rejected');
r = await c3.call('POST', '/api/ems/worklog', { summary: 'x', hours: 30 }); ok(r.status === 400, 'hours above 24 rejected');
r = await c3.call('POST', '/api/ems/worklog', { summary: 'x', date: '2099-01-01' }); ok(r.status === 400, 'future date rejected');
r = await c3.call('POST', '/api/ems/worklog', { summary: 'x', project_id: P2.id }); ok(r.status === 400, 'project they are not in rejected');
r = await c3.call('POST', '/api/ems/worklog', { summary: 'x', date: '2000-01-01' }); ok(r.status === 400, 'too old rejected for employees');
r = await c3.call('GET', `/api/ems/worklog?date=${today}`); ok(r.status === 200 && r.data.logs.length === 2 && r.data.totals.hours === 5.5, 'own day view has logs and hours', JSON.stringify(r.data.totals));
ok(r.data.activity.some((a) => a.kind === 'status' && a.to === 'done'), 'day view shows task activity (done)');
ok(r.data.due_tasks.some((t) => t.id === T3.id), 'day view lists tasks due that day');
const logId = r.data.logs[0].id;
r = await c1.call('GET', `/api/ems/worklog?date=${today}&employee_id=${E3.emp.id}`); ok(r.status === 404, 'peer cannot read someone else log');
r = await cm.call('GET', `/api/ems/worklog?date=${today}&employee_id=${E3.emp.id}`); ok(r.status === 200 && r.data.logs.length === 2, 'manager reads report log');
r = await cm.call('GET', `/api/ems/worklog?date=${today}&employee_id=${E2.emp.id}`); ok(r.status === 404, 'manager cannot read non-report');
r = await admin.call('GET', `/api/ems/worklog?date=${today}&employee_id=${E2.emp.id}`); ok(r.status === 200, 'admin reads anyone');
r = await admin.call('GET', `/api/ems/worklog/team?date=${today}`); ok(r.status === 200 && r.data.summary.updated >= 1 && r.data.rows.find((x) => x.employee_id === E3.emp.id)?.logs === 2, 'admin team summary');
ok(r.data.rows.find((x) => x.employee_id === E2.emp.id)?.logs === 0 && r.data.summary.missing >= 1, 'team summary flags missing updates');
r = await cm.call('GET', `/api/ems/worklog/team?date=${today}`); ok(r.status === 200 && r.data.rows.every((x) => [M.emp.id, E1.emp.id, E3.emp.id].includes(x.employee_id)), 'manager team summary limited to team');
r = await c1.call('GET', `/api/ems/worklog/team?date=${today}`); ok(r.status === 403, 'employee cannot open team summary');
r = await admin.call('GET', `/api/ems/worklog/range?employee_id=${E3.emp.id}`); ok(r.status === 200 && r.data.days.length === 14 && r.data.days[0].logs === 2 && r.data.days[0].completed === 1, 'date-wise range', JSON.stringify(r.data.days[0]));
r = await admin.call('GET', `/api/ems/worklog/range?from=2020-01-01&to=2026-12-31`); ok(r.status === 400, 'range capped at 62 days');
r = await c1.call('DELETE', `/api/ems/worklog/${logId}`); ok(r.status === 404, 'cannot delete another person update');
r = await c3.call('DELETE', `/api/ems/worklog/${logId}`); ok(r.status === 200, 'owner deletes own update');

console.log('project delete');
r = await cm.call('DELETE', `/api/ems/projects/${P.id}`); ok(r.status === 200, 'creator deletes project');
r = await c3.call('GET', `/api/ems/tasks/${T3.id}`); ok(r.status === 200 && r.data.project === null, 'tasks survive without a project');
r = await c1.call('DELETE', `/api/ems/projects/${P2.id}`); ok(r.status === 403, 'member cannot delete project');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
