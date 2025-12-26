import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = undefined) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function optionalInt(name, fallback) {
  const raw = optional(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(name, fallback) {
  const raw = process.env[name];
  const source = raw === undefined || raw === '' ? fallback : raw;
  if (Array.isArray(source)) return source;
  return String(source).split(',').map(s => s.trim()).filter(Boolean);
}

let env;
try {
  env = {
    NODE_ENV: optional('NODE_ENV', 'development'),
    PORT: optionalInt('PORT', 4000),
    DATABASE_URL: required('DATABASE_URL'),
    JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
    OTP_SECRET: required('OTP_SECRET'),
    ACCESS_TOKEN_TTL_SECONDS: optionalInt('ACCESS_TOKEN_TTL_SECONDS', 900),
    REFRESH_TOKEN_TTL_SECONDS: optionalInt('REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 30),
    FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),
    FRONTEND_ORIGINS: parseList('FRONTEND_URLS', optional('FRONTEND_URL', 'http://localhost:5173')),
    FRONTEND_ALLOW_CREDENTIALS: optional('FRONTEND_ALLOW_CREDENTIALS', 'false'),
    GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
    SMTP_HOST: optional('SMTP_HOST'),
    SMTP_PORT: optionalInt('SMTP_PORT', 587),
    SMTP_USER: optional('SMTP_USER'),
    SMTP_PASS: optional('SMTP_PASS'),
    SMTP_FROM: optional('SMTP_FROM', 'no-reply@agriorbit.local')
  };
} catch (err) {
  console.error('\n[ENV ERROR] Missing or invalid environment variables:');
  console.error(err.message);
  console.error('\nCreate a `server/.env` from `server/.env.example` or set the required environment variables in your deployment (DATABASE_URL, JWT_ACCESS_SECRET, OTP_SECRET).');
  process.exit(1);
}

export { env };

