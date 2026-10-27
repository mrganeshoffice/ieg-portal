/** MySQL / MariaDB access (mysql2) and the migration runner. Configure with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD. */
import mysql from 'mysql2/promise';
import { migrations } from './migrations.mjs';

export const dbConfigured = (env = process.env) => !!(env.DB_NAME && env.DB_USER);

export async function migrate(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(80) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
  const [rows] = await pool.query('SELECT id FROM schema_migrations');
  const done = new Set(rows.map((r) => r.id));
  for (const m of migrations) {
    if (done.has(m.id)) continue;
    for (const sql of m.statements) await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (id) VALUES (?)', [m.id]);
    console.log(`[ems] migration applied: ${m.id}`);
  }
}

export async function connect(env = process.env) {
  const pool = mysql.createPool({
    host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER, password: env.DB_PASSWORD || '', database: env.DB_NAME,
    waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4', dateStrings: true, timezone: 'Z',
  });
  pool.on('connection', (c) => c.query("SET time_zone = '+00:00'"));
  await pool.query('SELECT 1');
  await migrate(pool);
  return pool;
}

/** Run `fn(conn)` inside a transaction. */
export async function tx(pool, fn) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const out = await fn(conn); await conn.commit(); return out; }
  catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}
