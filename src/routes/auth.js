import { Router } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { hashPassword, verifyPassword, randomToken, sha256, randomOtpCode } from '../lib/security.js';
import { signAccessToken } from '../lib/tokens.js';
import { sendMail } from '../lib/email.js';

const router = Router();

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    name: user.name,
    organisation: user.organisation,
    language: user.language,
    picture: user.picture,
    localLanguages: user.localLanguages,
    emailVerifiedAt: user.emailVerifiedAt
  };
}

async function issueTokens(userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = randomToken(48);
  const tokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { accessToken, refreshToken };
}

router.post('/register', async (req, res, next) => {
  try {
    const schema = z.object({
      firstname: z.string().min(1).optional().nullable(),
      lastname: z.string().min(1).optional().nullable(),
      organisation: z.string().optional().nullable(),
      email: z.string().email(),
      password: z.string().min(8),
      language: z.string().optional().default('fr')
    });

    const body = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      const err = new Error('Email déjà utilisé');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        firstname: body.firstname ?? null,
        lastname: body.lastname ?? null,
        name: `${body.firstname ?? ''} ${body.lastname ?? ''}`.trim() || null,
        organisation: body.organisation ?? null,
        language: body.language ?? 'fr'
      }
    });

    // Envoi d'un email de bienvenue / vérification (non bloquant)
    (async () => {
      try {
        const frontendBase = env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, '') : '';
        const verifyLink = `${frontendBase}/verify-email`;

        await sendMail({
          to: user.email,
          subject: 'Bienvenue sur AgriOrbit — confirmez votre adresse',
          text: `Bonjour ${user.firstname ?? ''},\n\nMerci de vous être inscrit(e) sur AgriOrbit. Pour vérifier votre adresse email, veuillez visiter : ${verifyLink}\n\nSi vous n'avez pas créé de compte, ignorez ce message.\n\nMerci,\nL'équipe AgriOrbit`
        });
      } catch (mailErr) {
        console.error('Failed to send welcome email:', mailErr);
      }
    })();

    const tokens = await issueTokens(user.id);

    res.json({ user: userPayload(user), ...tokens });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });

    const body = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      const err = new Error('Identifiants invalides');
      err.statusCode = 401;
      throw err;
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      const err = new Error('Identifiants invalides');
      err.statusCode = 401;
      throw err;
    }

    const tokens = await issueTokens(user.id);
    res.json({ user: userPayload(user), ...tokens });
  } catch (err) {
    next(err);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const schema = z.object({ credential: z.string().min(1) });
    const { credential } = schema.parse(req.body);

    if (!googleClient) {
      const err = new Error('Google auth non configuré');
      err.statusCode = 500;
      throw err;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      const err = new Error('Erreur d\'authentification Google');
      err.statusCode = 401;
      throw err;
    }

    const email = payload.email.toLowerCase();
    const emailVerifiedAt = payload.email_verified ? new Date() : null;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstname: payload.given_name ?? null,
          lastname: payload.family_name ?? null,
          name: payload.name ?? null,
          picture: payload.picture ?? null,
          language: 'fr',
          emailVerifiedAt
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstname: user.firstname ?? payload.given_name ?? null,
          lastname: user.lastname ?? payload.family_name ?? null,
          name: user.name ?? payload.name ?? null,
          picture: user.picture ?? payload.picture ?? null,
          emailVerifiedAt: user.emailVerifiedAt ?? emailVerifiedAt
        }
      });
    }

    const tokens = await issueTokens(user.id);

    res.json({ user: userPayload(user), ...tokens });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const schema = z.object({ refreshToken: z.string().min(1) });
    const body = schema.parse(req.body);

    const tokenHash = sha256(body.refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
      const err = new Error('Session expirée');
      err.statusCode = 401;
      throw err;
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    const tokens = await issueTokens(stored.userId);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    const normalized = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalized } });

    const code = randomOtpCode(6);
    const codeHash = sha256(`${code}.${env.OTP_SECRET}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: user?.id ?? null,
        email: normalized,
        purpose: 'PASSWORD_RESET',
        codeHash,
        expiresAt
      }
    });

    await sendMail({
      to: normalized,
      subject: 'Votre code de réinitialisation AgriOrbit',
      text: `Votre code de réinitialisation est : ${code}. Il expire dans 10 minutes.`
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().min(6).max(6),
      newPassword: z.string().min(8)
    });

    const body = schema.parse(req.body);
    const email = body.email.toLowerCase();
    const codeHash = sha256(`${body.code}.${env.OTP_SECRET}`);

    const record = await prisma.verificationCode.findFirst({
      where: {
        email,
        purpose: 'PASSWORD_RESET',
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record) {
      const err = new Error('Code invalide ou expiré');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const err = new Error('Utilisateur introuvable');
      err.statusCode = 404;
      throw err;
    }

    const passwordHash = await hashPassword(body.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.verificationCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-email/request', async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    const normalized = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      const err = new Error('Utilisateur introuvable');
      err.statusCode = 404;
      throw err;
    }

    if (user.emailVerifiedAt) {
      res.json({ ok: true, alreadyVerified: true });
      return;
    }

    const code = randomOtpCode(6);
    const codeHash = sha256(`${code}.${env.OTP_SECRET}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: normalized,
        purpose: 'EMAIL_VERIFY',
        codeHash,
        expiresAt
      }
    });

    await sendMail({
      to: normalized,
      subject: 'Votre code de vérification AgriOrbit',
      text: `Votre code de vérification est : ${code}. Il expire dans 10 minutes.`
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-email/confirm', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().min(6).max(6)
    });

    const body = schema.parse(req.body);
    const email = body.email.toLowerCase();
    const codeHash = sha256(`${body.code}.${env.OTP_SECRET}`);

    const record = await prisma.verificationCode.findFirst({
      where: {
        email,
        purpose: 'EMAIL_VERIFY',
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record) {
      const err = new Error('Code invalide ou expiré');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const err = new Error('Utilisateur introuvable');
      err.statusCode = 404;
      throw err;
    }

    if (user.emailVerifiedAt) {
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      });
      res.json({ ok: true, alreadyVerified: true });
      return;
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now }
      }),
      prisma.verificationCode.update({
        where: { id: record.id },
        data: { usedAt: now }
      })
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
