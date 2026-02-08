import jwt from 'jsonwebtoken';
import { findById } from '../models/users.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = findById(payload.sub) || null;
  } catch {
    req.user = null;
  }
  next();
}
