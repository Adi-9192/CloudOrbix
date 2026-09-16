import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { getUserByEmail } from '../db.js';
import { hasAnyRole } from '../lib/permissions.js';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : crypto.randomBytes(32).toString('hex'));

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}

export function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    },
    JWT_SECRET,
    { expiresIn: '12h' },
  );
}

export async function protectRoute(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserByEmail(decoded.email);

    if (!user || !user.isActive) {
      return res.status(403).json({ message: 'Access Denied. Contact Application Administrator.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      isActive: user.isActive,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasAccess = hasAnyRole(userRoles, allowedRoles);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access Denied. Contact Application Administrator.' });
    }

    next();
  };
}
