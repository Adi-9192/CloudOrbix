import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;

export const appState = {
  roles: [],
  users: [],
  services: [],
  clients: [],
  statusHistory: [],
  auditLogs: [],
  excelImportLogs: [],
};

let pool = null;

const databaseUrl = process.env.DATABASE_URL?.trim();

if (databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  });
}

export async function initializeDatabase() {
  if (!pool) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
    console.warn('DATABASE_URL is not configured; API data access is disabled outside production.');
    return { source: 'unconfigured', initialized: false };
  }

  try {
    await pool.query('SELECT 1');
    console.log('Database connection successful.');
    return { source: 'postgres', initialized: true };
  } catch (error) {
    await pool.end().catch(() => {});
    pool = null;
    console.warn(
      `Database connection failed (${error.code || 'unknown'}): ${error.message || 'Unable to connect to PostgreSQL.'}`,
    );
    throw error;
  }
}

export function getPool() {
  return pool;
}

export function getState() {
  return appState;
}

export async function getUserByEmail(email) {
  const value = email?.trim().toLowerCase();
  if (!value) return null;

  if (pool) {
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.is_active,
        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE LOWER(u.email) = $1
      GROUP BY u.id
    `, [value]);

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      password: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: row.is_active,
      roles: row.roles,
    };
  }

  return null;
}

export function getUserProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    isActive: user.isActive,
  };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function updateUserPassword(userId, password) {
  const hashedPassword = await hashPassword(password);
  if (pool) {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
    return;
  }
  throw new Error('Password updates require a configured database.');
}

export function createAuditEntry(userEmail, action, oldValue, newValue) {
  const entry = {
    id: Date.now(),
    userEmail,
    action,
    oldValue: oldValue ?? '—',
    newValue: newValue ?? '—',
    createdAt: new Date().toISOString(),
  };
  appState.auditLogs.unshift(entry);
  if (pool) {
    pool.query('INSERT INTO audit_logs (user_email, action, old_value, new_value) VALUES ($1, $2, $3, $4)', [userEmail, action, oldValue ?? '—', newValue ?? '—']).catch(() => undefined);
  }
}

export function createStatusHistory(clientId, previousStatus, newStatus, changedBy) {
  appState.statusHistory.unshift({
    id: Date.now(),
    clientId,
    previousStatus,
    newStatus,
    changedBy,
    changedAt: new Date().toISOString(),
  });
}

export function createImportLog(payload) {
  appState.excelImportLogs.unshift({
    id: Date.now(),
    fileName: payload.fileName,
    totalProcessed: payload.totalProcessed,
    imported: payload.imported,
    updated: payload.updated,
    duplicates: payload.duplicates,
    failed: payload.failed,
    createdAt: new Date().toISOString(),
  });
}
