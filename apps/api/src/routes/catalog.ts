import { Router } from 'express';
import { prisma } from '../db.js';

export const catalogRouter = Router();
catalogRouter.get('/categories', async (_req, res, next) => {
  try { return res.json({ categories: await prisma.category.findMany({ orderBy: { name: 'asc' } }) }); } catch (error) { return next(error); }
});
catalogRouter.get('/locations', async (_req, res, next) => {
  try { return res.json({ locations: await prisma.location.findMany({ orderBy: [{ state: 'asc' }, { city: 'asc' }] }) }); } catch (error) { return next(error); }
});
