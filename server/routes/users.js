import express from 'express';
import { appState, getPool, hashPassword } from '../db.js';
import { protectRoute, requireRole } from '../middleware/auth.js';

const router = express.Router();
const dbRole = (role) => role === 'Account Manager' ? 'Operations Team' : (role || 'Viewer');
const publicUser = (user) => ({
  id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
  fullName: `${user.firstName} ${user.lastName}`.trim(), roles: user.roles, isActive: user.isActive,
});

async function findDbUser(id) {
  const result = await getPool().query(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.is_active,
      COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') roles
    FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = $1 GROUP BY u.id
  `, [id]);
  const row = result.rows[0];
  return row && { id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name, isActive: row.is_active, roles: row.roles };
}

router.get('/', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ users: appState.users.map(publicUser) });
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.is_active,
        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') roles
      FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id ORDER BY u.id
    `);
    return res.json({ users: result.rows.map((row) => publicUser({ id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name, isActive: row.is_active, roles: row.roles })) });
  } catch (error) { return next(error); }
});

router.post('/', protectRoute, requireRole('Admin'), async (req, res, next) => {
  const { firstName, lastName, email, role, isActive, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !firstName || !lastName || !password || String(password).length < 12) return res.status(400).json({ message: 'First name, last name, email, and a password of at least 12 characters are required.' });
  try {
    const pool = getPool();
    if (!pool) {
      if (appState.users.some((user) => user.email.toLowerCase() === normalizedEmail)) return res.status(409).json({ message: 'A user with this email already exists.' });
      const user = { id: Date.now(), email: normalizedEmail, password, firstName: String(firstName).trim(), lastName: String(lastName).trim(), isActive: isActive !== false, roles: [dbRole(role)] };
      appState.users.push(user);
      return res.status(201).json({ user: publicUser(user) });
    }
    const inserted = await pool.query(`INSERT INTO users (email,password_hash,first_name,last_name,is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [normalizedEmail, await hashPassword(password), String(firstName).trim(), String(lastName).trim(), isActive !== false]);
    const userId = inserted.rows[0].id;
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [dbRole(role)]);
    if (roleResult.rows[0]) await pool.query('INSERT INTO user_roles (user_id,role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, roleResult.rows[0].id]);
    return res.status(201).json({ user: publicUser(await findDbUser(userId)) });
  } catch (error) { return error.code === '23505' ? res.status(409).json({ message: 'A user with this email already exists.' }) : next(error); }
});

router.put('/:id', protectRoute, requireRole('Admin'), async (req, res, next) => {
  const userId = Number(req.params.id);
  const { firstName, lastName, email, role, isActive, password } = req.body || {};
  try {
    const pool = getPool();
    if (!pool) {
      const index = appState.users.findIndex((user) => user.id === userId);
      if (index < 0) return res.status(404).json({ message: 'User not found.' });
      const old = appState.users[index];
      appState.users[index] = { ...old, firstName: firstName || old.firstName, lastName: lastName || old.lastName, email: email?.trim().toLowerCase() || old.email, isActive: isActive === undefined ? old.isActive : Boolean(isActive), roles: [dbRole(role || old.roles[0])], password: password || old.password };
      return res.json({ user: publicUser(appState.users[index]) });
    }
    const updated = await pool.query(`UPDATE users SET first_name=COALESCE($1,first_name),last_name=COALESCE($2,last_name),email=COALESCE($3,email),is_active=COALESCE($4,is_active),updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING id`, [firstName, lastName, email?.trim().toLowerCase(), isActive === undefined ? null : Boolean(isActive), userId]);
    if (!updated.rows[0]) return res.status(404).json({ message: 'User not found.' });
    if (password) await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await hashPassword(password), userId]);
    if (role) {
      const roleResult = await pool.query('SELECT id FROM roles WHERE name=$1', [dbRole(role)]);
      if (roleResult.rows[0]) { await pool.query('DELETE FROM user_roles WHERE user_id=$1', [userId]); await pool.query('INSERT INTO user_roles (user_id,role_id) VALUES ($1,$2)', [userId, roleResult.rows[0].id]); }
    }
    return res.json({ user: publicUser(await findDbUser(userId)) });
  } catch (error) { return next(error); }
});

router.delete('/:id', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id); const pool = getPool();
    if (!pool) { const index = appState.users.findIndex((user) => user.id === id); if (index < 0) return res.status(404).json({ message: 'User not found.' }); const [user] = appState.users.splice(index, 1); return res.json({ deleted: true, user: publicUser(user) }); }
    const result = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id,email', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' });
    return res.json({ deleted: true, user: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
