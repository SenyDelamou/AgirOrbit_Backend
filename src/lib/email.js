import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
  return transporter;
}

export async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.log('[email:dev]', { to, subject, text });
    return;
  }
  await t.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text
  });
}
