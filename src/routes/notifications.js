import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({ read: z.boolean().optional().default(true) });
    const { read } = schema.parse(req.body ?? {});

    const existing = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.userId },
      select: { id: true }
    });

    if (!existing) {
      const err = new Error('Notification introuvable');
      err.statusCode = 404;
      throw err;
    }

    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: read ? new Date() : null }
    });

    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

export default router;
