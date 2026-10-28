/**
 * Integration test for the EMS API. Run against a server that uses a THROWAWAY database:
 *   BOOTSTRAP_ADMIN_EMAIL=boss@test.local BOOTSTRAP_ADMIN_PASSWORD='Passw0rd-Test1' ... node server/start.mjs
 *   TEST_URL=http://localhost:3990 TEST_ADMIN_EMAIL=boss@test.local TEST_ADMIN_PASSWORD='Passw0rd-Test1' node server/ems/test-api.mjs
 */
const BASE = process.env.TEST_URL || 'http://localhost:3990';
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${extra}`); } };

class Client {
  constructor() { this.cookies = {}; }
  async call(method, path, body, { raw, headers = {} } = {}) {
    const h = { ...headers };
    if (Object.keys(this.cookies).length) h.cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    let payload;
    if (raw) payload = raw; else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(BASE + path, { method, headers: h, body: payload });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/Max-Age=0/i.test(c)) delete this.cookies[k]; else this.cookies[k] = v; }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
}
const uniq = Date.now().toString(36);
const pdf = Buffer.from('%PDF-1.4\n%test file content here\n');

const admin = new Client();
let r = await admin.call('POST', '/api/auth/login', { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
ok(r.status === 200 && r.data.role === 'super_admin', 'super admin can sign in', JSON.stringify(r.data));
r = await admin.call('GET', '/api/auth/me'); ok(r.status === 200, 'me works for admin');
r = await admin.call('GET', '/api/admin/me'); ok(r.status === 200, 'admin session also opens the admin panel API (presentations/videos)');

// master data
r = await admin.call('POST', '/api/ems/master/departments', { name: `Sales ${uniq}` }); ok(r.status === 201, 'create department'); const dept = r.data.id;
r = await admin.call('POST', '/api/ems/master/departments', { name: `Sales ${uniq}` }); ok(r.status === 409, 'duplicate department rejected');
r = await admin.call('POST', '/api/ems/master/designations', { name: `Executive ${uniq}` }); const desig = r.data.id;
r = await admin.call('POST', '/api/ems/master/shift', { name: `General ${uniq}` }); ok(r.status === 201, 'create shift');
r = await admin.call('GET', '/api/ems/master?all=1'); ok(r.status === 200 && r.data.departments.some((d) => d.id === dept), 'master list');

// employees
r = await admin.call('POST', '/api/ems/employees', { email: `a-${uniq}@test.local`, first_name: 'Asha', last_name: 'Patil', department_id: dept, designation_id: desig, joining_date: '2026-01-05' });
ok(r.status === 201 && r.data.setupUrl && /^IEG-\d{4}$/.test(r.data.employee.employee_code), 'create employee A with setup link', JSON.stringify(r.data).slice(0, 200));
const A = r.data.employee, tokenA = new URL(r.data.setupUrl).searchParams.get('token');
r = await admin.call('POST', '/api/ems/employees', { email: `b-${uniq}@test.local`, first_name: 'Bala', temporary_password: 'Temp-Pass-123' }); ok(r.status === 201 && !r.data.setupUrl, 'create employee B with temporary password'); const B = r.data.employee;
r = await admin.call('POST', '/api/ems/employees', { email: `m-${uniq}@test.local`, first_name: 'Meera', role: 'manager', temporary_password: 'Mgr-Pass-12345' }); const M = r.data.employee; ok(r.status === 201 && M.role === 'manager', 'create manager');
r = await admin.call('POST', '/api/ems/employees', { email: `a-${uniq}@test.local`, first_name: 'Dup' }); ok(r.status === 409, 'duplicate email rejected');
r = await admin.call('POST', '/api/ems/employees', { email: 'bad', first_name: 'X' }); ok(r.status === 400, 'invalid email rejected');
r = await admin.call('POST', '/api/ems/employees', { email: `x-${uniq}@test.local`, first_name: 'X', salary: 5 }); ok(r.status === 400, 'unknown field rejected');
r = await admin.call('PATCH', `/api/ems/employees/${B.id}`, { manager_id: M.id, department_id: dept }); ok(r.status === 200 && r.data.manager_name === 'Meera', 'assign reporting manager');
r = await admin.call('PATCH', `/api/ems/employees/${B.id}`, { manager_id: B.id }); ok(r.status === 400, 'cannot report to self');
r = await admin.call('GET', `/api/ems/employees/${B.id}`); ok(r.data.history?.some((h) => h.field === 'manager_id'), 'employment history recorded');

// first login via setup link: single use
const a = new Client();
r = await a.call('GET', `/api/auth/setup-info?token=${tokenA}`); ok(r.status === 200, 'setup link valid');
r = await a.call('POST', '/api/auth/setup-password', { token: tokenA, password: 'short' }); ok(r.status === 400, 'weak password rejected');
r = await a.call('POST', '/api/auth/setup-password', { token: tokenA, password: 'Asha-Secret-2026' }); ok(r.status === 200 && r.data.mustChangePassword === false, 'set password via link');
r = await new Client().call('POST', '/api/auth/setup-password', { token: tokenA, password: 'Another-Pass-2026' }); ok(r.status === 410, 'setup link is single-use');

// employee isolation
r = await a.call('GET', '/api/ems/employees'); ok(r.status === 403, 'employee cannot list employees');
r = await a.call('GET', `/api/ems/employees/${B.id}`); ok(r.status === 404, 'employee cannot open another profile by id');
r = await a.call('GET', `/api/ems/employees/${B.id}/photo`); ok(r.status === 404, 'no photo, no leak');
r = await a.call('GET', '/api/ems/me'); ok(r.status === 200 && r.data.editable === 'self' && r.data.profile_completion.percent < 100, 'own profile + completion');
r = await a.call('PATCH', '/api/ems/me', { personal_mobile: '+91 98765 43210', skills: 'Excel, Sales', passing_year: 2018 }); ok(r.status === 200 && r.data.personal_mobile === '+91 98765 43210', 'employee updates own details');
r = await a.call('PATCH', '/api/ems/me', { department_id: dept }); ok(r.status === 403, 'employee cannot change department');
r = await a.call('PATCH', '/api/ems/me', { employee_code: 'HACK-1' }); ok(r.status === 403, 'employee cannot change employee ID');
r = await a.call('PATCH', '/api/ems/me', { role: 'admin' }); ok(r.status === 400, 'employee cannot set role');
r = await a.call('PATCH', `/api/ems/employees/${B.id}`, { skills: 'x' }); ok(r.status === 404, 'employee cannot edit another employee');
r = await a.call('PATCH', `/api/ems/employees/${A.id}`, { status: 'resigned' }); ok(r.status === 403, 'employee cannot change own status');
r = await a.call('GET', '/api/admin/me'); ok(r.status === 401, 'employee session does not open admin panel API');
r = await a.call('POST', '/api/ems/master/departments', { name: 'Evil' }); ok(r.status === 403, 'employee cannot edit master data');
r = await a.call('GET', '/api/ems/audit'); ok(r.status === 403, 'employee cannot read audit log');
r = await a.call('POST', `/api/ems/employees/${A.id}/deactivate`); ok(r.status === 403, 'employee cannot deactivate');

// documents
r = await a.call('POST', `/api/ems/employees/${A.id}/documents?label=ID%20Proof&filename=id.pdf`, undefined, { raw: pdf, headers: { 'content-type': 'application/octet-stream' } }); ok(r.status === 201, 'employee uploads own PDF'); const doc = r.data.id;
r = await a.call('POST', `/api/ems/employees/${A.id}/documents?label=Bad`, undefined, { raw: Buffer.from('MZ-not-a-pdf-just-an-exe-header....'), headers: { 'content-type': 'application/octet-stream' } }); ok(r.status === 400, 'non-document file rejected by content');
r = await a.call('POST', `/api/ems/employees/${B.id}/documents?label=X`, undefined, { raw: pdf, headers: { 'content-type': 'application/octet-stream' } }); ok(r.status === 404, 'cannot upload to another employee');
r = await a.call('POST', `/api/ems/employees/${A.id}/documents?label=Big`, undefined, { raw: Buffer.concat([pdf, Buffer.alloc(5.5 * 1024 * 1024)]), headers: { 'content-type': 'application/octet-stream' } }); ok(r.status === 400, 'oversized file rejected');
r = await a.call('GET', `/api/ems/documents/${doc}`); ok(r.status === 200 && /attachment/.test(r.headers.get('content-disposition')) && r.headers.get('x-content-type-options') === 'nosniff', 'owner downloads own document as attachment');
const b = new Client(); r = await b.call('POST', '/api/auth/login', { email: `b-${uniq}@test.local`, password: 'Temp-Pass-123' }); ok(r.status === 200 && r.data.mustChangePassword === true, 'temporary password login forces change');
r = await b.call('GET', `/api/ems/documents/${doc}`); ok(r.status === 404, "another employee cannot download A's document");
r = await admin.call('GET', `/api/ems/documents/${doc}`); ok(r.status === 200, 'admin can download');
r = await b.call('POST', '/api/auth/change-password', { current: 'Temp-Pass-123', password: 'Bala-New-Pass-77' }); ok(r.status === 200 && r.data.mustChangePassword === false, 'change password clears the force flag');
r = await b.call('POST', '/api/auth/change-password', { current: 'wrong', password: 'Bala-New-Pass-88' }); ok(r.status === 400, 'wrong current password rejected');

// manager scope
const m = new Client(); await m.call('POST', '/api/auth/login', { email: `m-${uniq}@test.local`, password: 'Mgr-Pass-12345' });
r = await m.call('GET', '/api/ems/employees'); ok(r.status === 200 && r.data.items.length === 1 && r.data.items[0].id === B.id, 'manager lists only own reports');
r = await m.call('GET', `/api/ems/employees/${B.id}`); ok(r.status === 200 && r.data.editable === 'none' && !('personal_mobile' in r.data) && !r.data.documents, 'manager sees professional info only');
r = await m.call('GET', `/api/ems/employees/${A.id}`); ok(r.status === 404, 'manager cannot open non-reports');
r = await m.call('PATCH', `/api/ems/employees/${B.id}`, { skills: 'x' }); ok(r.status === 403, 'manager cannot edit reports');
r = await m.call('POST', '/api/ems/employees', { email: 'n@test.local', first_name: 'N' }); ok(r.status === 403, 'manager cannot create employees');
r = await m.call('GET', '/api/ems/employees/export.csv'); ok(r.status === 403, 'manager cannot export');

// admin guards
r = await admin.call('POST', `/api/ems/employees/${(await admin.call('GET', '/api/ems/me')).data.id}/deactivate`); ok(r.status === 409, 'cannot deactivate yourself');
const hr = new Client();
r = await admin.call('POST', '/api/ems/employees', { email: `hr-${uniq}@test.local`, first_name: 'Hema', role: 'admin', temporary_password: 'Hr-Pass-123456' }); ok(r.status === 201, 'super admin creates HR admin'); const HR = r.data.employee;
await hr.call('POST', '/api/auth/login', { email: `hr-${uniq}@test.local`, password: 'Hr-Pass-123456' });
r = await hr.call('POST', '/api/ems/employees', { email: `z-${uniq}@test.local`, first_name: 'Z', role: 'admin', temporary_password: 'Zed-Pass-123456' }); ok(r.status === 403, 'HR admin cannot create admins');
r = await hr.call('POST', '/api/ems/employees', { email: `z-${uniq}@test.local`, first_name: '=HYPERLINK("x")', last_name: 'Zed', temporary_password: 'Zed-Pass-123456' }); ok(r.status === 201, 'HR admin creates employees');
r = await hr.call('PATCH', `/api/ems/employees/${HR.id}`, { role: 'employee' }); ok(r.status === 403 || r.status === 409, 'HR admin cannot change own/admin role');
r = await hr.call('GET', '/api/ems/employees/export.csv'); ok(r.status === 200 && r.data.includes("'=HYPERLINK") , 'CSV export neutralises formulas');
r = await hr.call('GET', '/api/admin/me'); ok(r.status === 200, 'HR admin reaches admin panel API');

// deactivate / reset
r = await admin.call('POST', `/api/ems/employees/${A.id}/deactivate`); ok(r.status === 200 && r.data.is_active === false, 'admin deactivates A');
r = await a.call('GET', '/api/auth/me'); ok(r.status === 401, 'deactivated user is signed out immediately');
r = await new Client().call('POST', '/api/auth/login', { email: `a-${uniq}@test.local`, password: 'Asha-Secret-2026' }); ok(r.status === 401, 'deactivated user cannot sign in');
await admin.call('POST', `/api/ems/employees/${A.id}/reactivate`);
r = await admin.call('POST', `/api/ems/employees/${A.id}/reset-password`); ok(r.status === 200 && r.data.setupUrl, 'admin resets password (gets single-use link, never sees a password)');
r = await new Client().call('POST', '/api/auth/login', { email: `a-${uniq}@test.local`, password: 'Asha-Secret-2026' }); ok(r.status === 401, 'old password stops working after reset');

// CSRF + audit + export
r = await admin.call('POST', '/api/ems/master/departments', { name: 'Csrf' }, { headers: { origin: 'https://evil.example' } }); ok(r.status === 403, 'cross-site POST blocked');
r = await admin.call('GET', '/api/ems/audit'); ok(r.status === 200 && r.data.items.some((x) => x.action === 'employee.create') && !JSON.stringify(r.data).includes('Pass'), 'audit log records actions without secrets');
r = await admin.call('GET', '/api/ems/employees?q=Asha&sort=name'); ok(r.data.total >= 1, 'search');
r = await admin.call('GET', '/api/ems/employees?sort=name;DROP TABLE users'); ok(r.status === 200, 'sort parameter is whitelisted');
r = await admin.call('GET', "/api/ems/employees?q=%27%20OR%201%3D1%20--"); ok(r.status === 200 && r.data.total === 0, 'SQL injection attempt returns nothing');

// logout
r = await admin.call('POST', '/api/auth/logout'); r = await admin.call('GET', '/api/auth/me'); ok(r.status === 401, 'logout ends the session');

// throttle (last: it blocks this IP for the window)
let last; for (let i = 0; i < 45; i++) last = await new Client().call('POST', '/api/auth/login', { email: `nobody${i}@test.local`, password: 'wrong-password-1' });
ok(last.status === 429, 'login is rate limited');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
