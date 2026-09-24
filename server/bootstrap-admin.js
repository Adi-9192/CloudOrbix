import sql from 'mssql';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (minimum 12 characters) for this one-time command.');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const pool = new sql.ConnectionPool(process.env.DATABASE_URL);

try {
  await pool.connect();
  await pool.request().query('BEGIN TRANSACTION');
  const existing = await pool.request().input('email', sql.VarChar(255), email).query('SELECT id FROM users WHERE LOWER(email) = @email');
  if (existing.recordset.length) throw new Error(`A user with ${email} already exists; no changes made.`);
  const user = await pool.request()
    .input('email', sql.VarChar(255), email)
    .input('passwordHash', sql.VarChar(255), await bcrypt.hash(password, 12))
    .input('firstName', sql.VarChar(100), 'System')
    .input('lastName', sql.VarChar(100), 'Administrator')
    .query('INSERT INTO users(email,password_hash,first_name,last_name,is_active) OUTPUT INSERTED.id AS id VALUES(@email,@passwordHash,@firstName,@lastName,1)');
  const role = await pool.request().query("SELECT id FROM roles WHERE name = 'Admin'");
  if (!role.recordset.length) throw new Error('Admin role is missing. Run npm run migrate first.');
  await pool.request()
    .input('userId', sql.Int, user.recordset[0].id)
    .input('roleId', sql.Int, role.recordset[0].id)
    .query('INSERT INTO user_roles(user_id,role_id) VALUES(@userId,@roleId)');
  await pool.request().query('COMMIT TRANSACTION');
  console.log(`Bootstrap administrator created: ${email}`);
} catch (error) {
  await pool.request().query('ROLLBACK TRANSACTION').catch(() => undefined);
  throw error;
} finally {
  await pool.close();
}
