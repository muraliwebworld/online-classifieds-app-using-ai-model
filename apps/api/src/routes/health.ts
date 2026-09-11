import { Router } from 'express';
import { prisma } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});
