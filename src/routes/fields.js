import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const fields = await prisma.field.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ fields });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      latitude: z.number().finite().optional(),
      longitude: z.number().finite().optional(),
      areaHa: z.number().finite().optional(),
      crop: z.string().min(1).optional(),
      geometryGeoJson: z.unknown().optional()
    });

    const body = schema.parse(req.body);

    const field = await prisma.field.create({
      data: {
        ownerId: req.userId,
        name: body.name,
        latitude: body.latitude,
        longitude: body.longitude,
        areaHa: body.areaHa,
        crop: body.crop,
        geometryGeoJson: body.geometryGeoJson
      }
    });

    res.status(201).json({ field });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const field = await prisma.field.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });

    if (!field) {
      const err = new Error('Parcelle introuvable');
      err.statusCode = 404;
      throw err;
    }

    res.json({ field });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      latitude: z.number().finite().optional().nullable(),
      longitude: z.number().finite().optional().nullable(),
      areaHa: z.number().finite().optional().nullable(),
      crop: z.string().min(1).optional().nullable(),
      geometryGeoJson: z.unknown().optional().nullable()
    });

    const body = schema.parse(req.body);

    const existing = await prisma.field.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
      select: { id: true }
    });

    if (!existing) {
      const err = new Error('Parcelle introuvable');
      err.statusCode = 404;
      throw err;
    }

    const field = await prisma.field.update({
      where: { id: req.params.id },
      data: body
    });

    res.json({ field });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.field.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
      select: { id: true }
    });

    if (!existing) {
      const err = new Error('Parcelle introuvable');
      err.statusCode = 404;
      throw err;
    }

    await prisma.field.delete({ where: { id: req.params.id } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
