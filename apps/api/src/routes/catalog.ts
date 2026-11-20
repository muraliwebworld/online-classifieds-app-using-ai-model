import { Router } from 'express';
import { prisma } from '../db.js';

export const catalogRouter = Router();
catalogRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            listings: { where: { status: 'PUBLISHED' } }
          }
        }
      }
    });
    return res.json({
      categories: categories.map(({ _count, ...category }) => ({
        ...category,
        publishedCount: _count.listings
      }))
    });
  } catch (error) {
    return next(error);
  }
});
catalogRouter.get('/locations', async (_req, res, next) => {
  try { return res.json({ locations: await prisma.location.findMany({ orderBy: [{ state: 'asc' }, { city: 'asc' }] }) }); } catch (error) { return next(error); }
});
