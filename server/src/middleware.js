import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';

export const SUPPORTED_LANGS = ['en', 'ar', 'ur', 'fr', 'tr', 'es'];

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (payload.role !== 'admin') throw new Error('bad role');
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

const limiter = (windowMs, limit) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'too_many_requests' } });

export const globalLimiter = limiter(15 * 60 * 1000, 600);
export const pledgeLimiter = limiter(60 * 60 * 1000, 20);
export const loginLimiter = limiter(15 * 60 * 1000, 10);
export const newsletterLimiter = limiter(60 * 60 * 1000, 10);

// Wrap async handlers so rejections reach the error middleware.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({ error: 'validation_failed', issues: result.error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message })) });
    }
    req[source] = result.data;
    next();
  };
}
