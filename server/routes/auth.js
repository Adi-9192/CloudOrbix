import express from 'express';
import { getUserByEmail, createAuditEntry, verifyPassword, updateUserPassword } from '../db.js';
import { generateToken, protectRoute } from '../middleware/auth.js';

const router = express.Router();

function logAuthError(operation, req, error) {
  console.error('Authentication API error:', {
    operation,
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    email: req.body?.email ? String(req.body.email).trim().toLowerCase() : undefined,
    message: error?.message || String(error),
    code: error?.code,
    number: error?.number,
    stack: error?.stack,
  });
}

async function recordAudit(operation, req, userEmail, action, oldValue, newValue) {
  try {
    await createAuditEntry(userEmail, action, oldValue, newValue);
  } catch (error) {
    logAuthError(`${operation}:createAuditEntry`, req, error);
  }
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      await recordAudit('login', req, normalizedEmail, 'User Login Failed', null, 'Access denied');
      return res.status(403).json({ message: 'Access Denied. Contact Application Administrator.' });
    }

    const passwordMatches = user.password?.startsWith('$2')
      ? await verifyPassword(password, user.password)
      : String(user.password) === String(password);

    if (!passwordMatches) {
      await recordAudit('login', req, normalizedEmail, 'User Login Failed', null, 'Invalid password');
      return res.status(403).json({ message: 'Access Denied. Contact Application Administrator.' });
    }

    const token = generateToken(user);
    await recordAudit('login', req, user.email, 'User Login', null, 'Successful login');

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    logAuthError('login', req, error);
    return res.status(500).json({ message: 'Unable to complete login.' });
  }
});

router.post('/sso', async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Company email is required.' });
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      await recordAudit('sso', req, normalizedEmail, 'User Login Failed', null, 'SSO user not allowed');
      return res.status(403).json({ message: 'Access Denied. Contact Application Administrator.' });
    }

    const token = generateToken(user);
    await recordAudit('sso', req, user.email, 'User Login', null, 'Entra ID SSO login');

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    logAuthError('sso', req, error);
    return res.status(500).json({ message: 'Unable to complete SSO login.' });
  }
});

router.get('/me', protectRoute, (req, res) => {
  return res.json({ user: req.user });
});

router.post('/change-password', protectRoute, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ message: 'Old password and a new password of at least 8 characters are required.' });
    }
    const user = await getUserByEmail(req.user.email);
    const valid = user?.password?.startsWith('$2') ? await verifyPassword(oldPassword, user.password) : String(user?.password) === String(oldPassword);
    if (!valid) return res.status(403).json({ message: 'The old password is incorrect.' });
    await updateUserPassword(req.user.id, newPassword);
    await recordAudit('change-password', req, user.email, 'Password Changed', null, 'Password updated by user');
    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    logAuthError('change-password', req, error);
    return res.status(500).json({ message: 'Unable to change password.' });
  }
});

export default router;
