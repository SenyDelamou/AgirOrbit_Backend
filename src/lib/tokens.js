import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function signAccessToken(userId) {
  const ttl = env.ACCESS_TOKEN_TTL_SECONDS;
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: ttl });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}
