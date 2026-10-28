/** Security regression checks. Run against a throwaway database, ideally right after a server restart (it trips the login limiter). */
const BASE = process.env.TEST_URL || 'http://localhost:3990';
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { if (c) { pass++; console.log(`  ok   ${n}`); } else { fail++; console.log(`  FAIL ${n} ${x}`); } };
class Client {
  constructor() { this.cookies = {}; }
  async call(method, path, body, headers = {}) {
    const h = { ...headers }; if (Object.keys(this.cookies).length) h.cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    let payload; if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(BASE + path, { method, headers: h, body: payload });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (/Max-Age=0/i.test(c)) delete this.cookies[kv.slice(0, i)]; else this.cookies[kv.slice(0, i)] = kv.slice(i + 1); }
    const ct = res.headers.get('content-type') || ''; const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
    return { status: res.status, data, headers: res.headers, setCookie: res.headers.getSetCookie?.() ?? [] };
  }
}
const uniq = Date.now().toString(36);
const AE = process.env.TEST_ADMIN_EMAIL, AP = process.env.TEST_ADMIN_PASSWORD;

console.log('headers and cookies');
let r = await new Client().call('GET', '/login'); const h = r.headers;
ok(/default-src 'self'/.test(h.get('content-security-policy') || '') && /frame-ancestors 'none'/.test(h.get('content-security-policy') || ''), 'pages send a Content-Security-Policy that blocks framing');
ok(h.get('x-frame-options') === 'DENY' && h.get('x-content-type-options') === 'nosniff', 'X-Frame-Options and nosniff set');
r = await new Client().call('GET', '/api/auth/me'); ok(r.headers.get('x-content-type-options') === 'nosniff' && /no-store/.test(r.headers.get('cache-control') || ''), 'API responses are not cacheable and nosniff');
r = await new Client().call('POST', '/api/auth/login', { email: AE, password: AP }); const sc = r.setCookie.join('\n');
ok(/HttpOnly/i.test(sc) && /SameSite=Lax/i.test(sc), 'session cookie is HttpOnly and SameSite');
r = await new Client().call('POST', '/api/auth/login', { email: AE, password: AP }, { 'x-forwarded-proto': 'https' }); ok(/;\s*Secure/i.test(r.setCookie.join('\n')), 'session cookie is Secure behind HTTPS');

console.log('unauthenticated access');
const anon = new Client();
for (const [m, p] of [['GET', '/api/ems/me'], ['GET', '/api/ems/employees'], ['GET', '/api/ems/directory'], ['GET', '/api/ems/audit'], ['GET', '/api/ems/master'], ['GET', '/api/ems/tasks'], ['GET', '/api/ems/attendance/today'], ['POST', '/api/ems/attendance/check-in'], ['GET', '/api/ems/leave'], ['GET', '/api/ems/chat/people'], ['GET', '/api/ems/notifications'], ['GET', '/api/ems/reports/attendance'], ['GET', '/api/ems/settings'], ['GET', '/api/ems/home'], ['GET', '/api/ems/documents/1'], ['GET', '/api/ems/employees/1/photo']]) {
  const x = await anon.call(m, p, m === 'POST' ? {} : undefined); ok(x.status === 401, `${m} ${p} requires sign-in`, String(x.status));
}
r = await anon.call('GET', '/api/admin/me'); ok(r.status === 401, 'admin session check is closed to anonymous callers');
r = await anon.call('POST', '/api/admin/videos', { title: 'x' }); ok(r.status === 401 || r.status === 403 || r.status === 404, 'admin-only content routes reject anonymous writes', String(r.status));

console.log('role matrix (an ordinary employee must not reach admin features)');
const admin = new Client(); await admin.call('POST', '/api/auth/login', { email: AE, password: AP });
const mail = `sec-${uniq}@test.local`;
r = await admin.call('POST', '/api/ems/employees', { email: mail, first_name: 'Sec', temporary_password: 'Pass-Word-12345' }); const emp = r.data.employee;
const e = new Client(); await e.call('POST', '/api/auth/login', { email: mail, password: 'Pass-Word-12345' });
for (const [m, p, b] of [['GET', '/api/ems/employees'], ['POST', '/api/ems/employees', { email: 'x@test.local', first_name: 'X' }], ['GET', '/api/ems/audit'], ['GET', '/api/ems/summary'], ['POST', '/api/ems/master/departments', { name: 'Hack' }], ['PUT', '/api/ems/settings', { work_start: '01:00' }], ['POST', '/api/ems/holidays', { date: '2026-05-05', name: 'x' }], ['POST', '/api/ems/leave/types', { name: 'x', annual_quota: 1 }], ['GET', '/api/ems/reports/attendance'], ['GET', '/api/ems/leave?scope=all'], ['GET', '/api/ems/attendance/team'], ['POST', `/api/ems/employees/${emp.id}/portal-access`, { full: true }], ['POST', `/api/ems/employees/${emp.id}/reset-password`, {}], ['POST', `/api/ems/employees/${emp.id}/deactivate`, {}], ['GET', '/api/ems/employees/export.csv']]) {
  const x = await e.call(m, p, b); ok([403, 404].includes(x.status), `employee blocked from ${m} ${p}`, String(x.status));
}
r = await e.call('PATCH', '/api/ems/me', { role: 'super_admin', department_id: 1, employee_code: 'HACK-1' }); ok(r.status === 400 || r.status === 403, 'employee cannot self-edit role or company fields', String(r.status));
r = await e.call('GET', '/api/auth/me'); ok(r.data.role === 'employee' && r.data.fullAccess === false, 'role and portal access unchanged after the attempt');
r = await e.call('POST', '/api/admin/login', { email: AE, password: 'wrong-password-1' }); ok(r.status === 401, 'wrong admin password rejected');
r = await e.call('GET', '/api/admin/me'); ok(r.status === 401 || r.status === 403, 'employee session does not open the admin panel');

console.log('cross-site and malformed requests');
r = await admin.call('POST', '/api/ems/tasks', { title: 'csrf' }, { origin: 'https://evil.example' }); ok(r.status === 403, 'cross-site POST is blocked');
r = await admin.call('POST', '/api/ems/tasks', { title: 'csrf' }, { origin: 'not a url' }); ok(r.status === 403, 'garbage Origin is blocked');
const raw = await fetch(BASE + '/api/ems/tasks', { method: 'POST', headers: { 'content-type': 'text/plain', cookie: Object.entries(admin.cookies).map(([k, v]) => `${k}=${v}`).join('; ') }, body: '{"title":"x"}' }); ok(raw.status === 415, 'non-JSON body rejected');
const big = await fetch(BASE + '/api/ems/tasks', { method: 'POST', headers: { 'content-type': 'application/json', cookie: Object.entries(admin.cookies).map(([k, v]) => `${k}=${v}`).join('; ') }, body: JSON.stringify({ title: 'x'.repeat(200000) }) }); ok([400, 413].includes(big.status), 'oversized body rejected', String(big.status));
r = await admin.call('GET', "/api/ems/employees?sort=name;DROP%20TABLE%20users&q=%27%20OR%201=1--"); ok(r.status === 200, 'SQL in sort/search is treated as data');
r = await admin.call('GET', '/api/ems/me'); ok(r.status === 200, 'database still intact after injection attempts');
r = await admin.call('GET', '/api/ems/chat/abc'); ok(r.status === 404 || r.status === 400, 'non-numeric ids do not reach the database');
const tr = await fetch(BASE + '/..%2f..%2fserver%2fapi.mjs'); ok(tr.status !== 200 || !(await tr.text()).includes('createApiHandler'), 'path traversal does not expose server code');
const tr2 = await fetch(BASE + '/%2e%2e/server/start.mjs'); ok(!(await tr2.text()).includes('serveStatic'), 'encoded traversal does not expose server code');

console.log('XSS data is stored verbatim (the UI escapes it) and never executed server-side');
r = await e.call('POST', '/api/ems/tasks', { title: '<img src=x onerror=alert(1)>' }); ok(r.status === 201 && r.data.title.includes('<img'), 'markup in task titles is kept as text');

console.log('password and session lifecycle');
const a2 = new Client(); r = await a2.call('POST', '/api/admin/login', { email: AE, password: AP }); ok(r.status === 200 && a2.cookies.ieg_admin, 'admin panel login issues a cookie');
const oldCookie = a2.cookies.ieg_admin;
r = await a2.call('GET', '/api/admin/me'); ok(r.status === 200, 'admin cookie works');
const c2 = new Client(); await c2.call('POST', '/api/auth/login', { email: mail, password: 'Pass-Word-12345' });
r = await c2.call('POST', '/api/auth/change-password', { current: 'Pass-Word-12345', password: 'Better-Pass-2026' }); ok(r.status === 200, 'password change works');
r = await e.call('GET', '/api/auth/me'); ok(r.status === 401, 'changing a password signs out that user\'s other sessions');
r = await admin.call('POST', `/api/ems/employees/${emp.id}/reset-password`, {}); const tok = new URL(r.data.setupUrl).searchParams.get('token');
r = await new Client().call('POST', '/api/auth/login', { email: mail, password: 'Better-Pass-2026' }); ok(r.status === 401, 'reset kills the old password at once');
r = await new Client().call('POST', '/api/auth/setup-password', { token: tok, password: 'short' }); ok(r.status === 400, 'weak password rejected at setup');
r = await new Client().call('POST', '/api/auth/setup-password', { token: tok, password: 'Another-Pass-2026' }); ok(r.status === 200, 'setup link works once');
r = await new Client().call('POST', '/api/auth/setup-password', { token: tok, password: 'Another-Pass-2027' }); ok(r.status === 410, 'setup link cannot be reused');
r = await new Client().call('GET', '/api/auth/setup-info?token=' + 'a'.repeat(40)); ok(r.status >= 400, 'invalid setup token is refused');
r = await admin.call('POST', `/api/ems/employees/${emp.id}/deactivate`, {}); const e3 = new Client(); r = await e3.call('POST', '/api/auth/login', { email: mail, password: 'Another-Pass-2026' }); ok(r.status === 401, 'deactivated user cannot sign in');

r = await admin.call('POST', '/api/ems/employees', { email: `adm-${uniq}@test.local`, first_name: 'Adm', role: 'admin', temporary_password: 'Admin-Pass-12345' }); ok(r.status === 201, 'super admin creates an admin');
const ad = new Client(); r = await ad.call('POST', '/api/admin/login', { email: `adm-${uniq}@test.local`, password: 'Admin-Pass-12345' }); ok(r.status === 200, 'new admin signs in to the admin panel');
const stolen = ad.cookies.ieg_admin;
r = await ad.call('POST', '/api/auth/login', { email: `adm-${uniq}@test.local`, password: 'Admin-Pass-12345' }); r = await ad.call('POST', '/api/auth/change-password', { current: 'Admin-Pass-12345', password: 'Admin-Pass-67890' }); ok(r.status === 200, 'admin changes password');
const thief = new Client(); thief.cookies.ieg_admin = stolen; r = await thief.call('GET', '/api/admin/me'); ok(r.status === 401, 'an admin cookie copied before a password change stops working');
r = await thief.call('GET', '/api/ems/employees'); ok(r.status === 401, 'and so does its access to employee data');

console.log('brute-force limits');
const victim = `victim-${uniq}@test.local`; let last;
for (let i = 0; i < 12; i++) last = await new Client().call('POST', '/api/auth/login', { email: victim, password: 'wrong-pass-' + i }, { 'x-forwarded-for': `203.0.113.${i}` });
ok(last.status === 429, 'per-account lockout holds even when the attacker rotates spoofed IPs');
let lastAdmin; for (let i = 0; i < 12; i++) lastAdmin = await new Client().call('POST', '/api/admin/login', { email: `noone-${uniq}@test.local`, password: 'x'.repeat(12) + i }, { 'x-forwarded-for': `198.51.100.${i}` });
ok(lastAdmin.status === 429, 'admin panel login is limited per account too');
let spoof; for (let i = 0; i < 45; i++) spoof = await new Client().call('POST', '/api/auth/login', { email: `u${i}-${uniq}@test.local`, password: 'wrong-pass-1' }, { 'x-forwarded-for': `10.0.0.${i}, 192.0.2.77` });
ok(spoof.status === 429, 'spoofing the first X-Forwarded-For entry does not dodge the IP limit');

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
