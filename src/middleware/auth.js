import { verifyAccessToken } from '../lib/tokens.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    const err = new Error('Missing authentication token');
    err.statusCode = 401;
    next(err);
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.sub;
    next();
  } catch (_err) {
    const err = new Error('Session expirée');
    err.statusCode = 401;
    next(err);
  }
}
