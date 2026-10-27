/** Create or update an admin account:  npm run admin:create */
import readline from 'node:readline';
import { randomBytes } from 'node:crypto';
import { hashPassword, readAdmins, saveAdmins, DATA_DIR } from './api.mjs';
import { connect, dbConfigured } from './ems/db.mjs';

const forNetlify = process.argv.includes('--netlify');

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    if (hidden) rl._writeToOutput = (s) => { if (!muted) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
    muted = hidden;
  });
}

const email = (await ask('Admin email: ')).trim().toLowerCase();
if (!/^\S+@\S+\.\S+$/.test(email)) { console.error('That does not look like an email address.'); process.exit(1); }
const pw = await ask('Password (min 10 characters, typing is hidden): ', true);
if (pw.length < 10) { console.error('Password must be at least 10 characters.'); process.exit(1); }
if (pw !== (await ask('Repeat password: ', true))) { console.error('Passwords do not match.'); process.exit(1); }

const { salt, hash } = await hashPassword(pw);
if (forNetlify) {
  console.log('\nAdd these two Environment variables in Netlify (Site configuration > Environment variables):\n');
  console.log(`ADMINS_JSON=${JSON.stringify([{ email, salt, hash }])}\n`);
  console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}\n`);
  console.log('Keep SESSION_SECRET the same afterwards (changing it signs the admin out). Do not commit these values.');
  process.exit(0);
}
if (dbConfigured()) { // employee-management database: create or reset a super admin there
  const pool = await connect();
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length) await pool.query("UPDATE users SET password_salt = ?, password_hash = ?, role = 'super_admin', is_active = 1, must_change_password = 0, token_version = token_version + 1 WHERE id = ?", [salt, hash, rows[0].id]);
  else {
    const [u] = await pool.query("INSERT INTO users (email, password_salt, password_hash, role) VALUES (?,?,?, 'super_admin')", [email, salt, hash]);
    await pool.query("INSERT INTO employees (user_id, first_name, status) VALUES (?, 'Administrator', 'active')", [u.insertId]);
  }
  console.log(`\nSuper admin saved in the database: ${email}\nSign in at /admin/login or /login`);
  await pool.end();
  process.exit(0);
}
const admins = (await readAdmins()).filter((a) => a.email !== email);
admins.push({ email, salt, hash, created_at: new Date().toISOString() });
await saveAdmins(admins);
console.log(`\nAdmin saved: ${email}\nStored (hashed) in ${DATA_DIR}/admin.json\nSign in at /admin/login`);
