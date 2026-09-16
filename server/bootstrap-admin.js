import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (minimum 12 characters) for this one-time command.');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

try {
  await pool.query('BEGIN');
  const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
  if (existing.rowCount) throw new Error(`A user with ${email} already exists; no changes made.`);
  const user = await pool.query(
    'INSERT INTO users(email,password_hash,first_name,last_name,is_active) VALUES($1,$2,$3,$4,TRUE) RETURNING id',
    [email, await bcrypt.hash(password, 12), 'System', 'Administrator'],
  );
  const role = await pool.query("SELECT id FROM roles WHERE name = 'Admin'");
  if (!role.rowCount) throw new Error('Admin role is missing. Run npm run migrate first.');
  await pool.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)', [user.rows[0].id, role.rows[0].id]);
  await pool.query('COMMIT');
  console.log(`Bootstrap administrator created: ${email}`);
} catch (error) {
  await pool.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await pool.end();
}
