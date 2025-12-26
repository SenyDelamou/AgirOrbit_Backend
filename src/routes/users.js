import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        name: true,
        organisation: true,
        language: true,
        picture: true,
        localLanguages: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      const err = new Error('Utilisateur introuvable');
      err.statusCode = 404;
      throw err;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
