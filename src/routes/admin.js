import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

const router = Router();

// GET /api/admin/users?limit=10
// Protected by X-Admin-Token header matching ADMIN_TOKEN in production.
router.get('/users', async (req, res, next) => {
  try {
    const provided = req.headers['x-admin-token'] || req.query.adminToken;

    if (env.NODE_ENV === 'production') {
      if (!provided || provided !== env.ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const limit = Math.min(Number.parseInt(req.query.limit || '10', 10) || 10, 100);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        organisation: true,
        language: true,
        createdAt: true
      }
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

export default router;
