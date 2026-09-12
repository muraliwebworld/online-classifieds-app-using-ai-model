import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const marketplaceRouter = Router();

marketplaceRouter.post('/favorites/:listingId', requireAuth, async (req, res, next) => {
  try { const listingId = String(req.params.listingId); await prisma.favorite.upsert({ where: { userId_listingId: { userId: req.user!.id, listingId } }, update: {}, create: { userId: req.user!.id, listingId } }); return res.status(201).json({ saved: true }); } catch (error) { return next(error); }
});
marketplaceRouter.delete('/favorites/:listingId', requireAuth, async (req, res, next) => {
  try { await prisma.favorite.deleteMany({ where: { userId: req.user!.id, listingId: String(req.params.listingId) } }); return res.json({ saved: false }); } catch (error) { return next(error); }
});
marketplaceRouter.get('/favorites', requireAuth, async (req, res, next) => {
  try { return res.json({ favorites: await prisma.favorite.findMany({ where: { userId: req.user!.id }, include: { listing: { include: { images: true, category: true, location: true } } }, orderBy: { createdAt: 'desc' } }) }); } catch (error) { return next(error); }
});

marketplaceRouter.post('/threads', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ listingId: z.uuid(), body: z.string().trim().min(1).max(2000) }).parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: input.listingId }, select: { sellerId: true, status: true } });
    if (!listing || listing.status !== 'PUBLISHED' || listing.sellerId === req.user!.id) return res.status(400).json({ error: 'Invalid listing or seller conversation' });
    const thread = await prisma.messageThread.upsert({ where: { listingId_buyerId_sellerId: { listingId: input.listingId, buyerId: req.user!.id, sellerId: listing.sellerId } }, update: {}, create: { listingId: input.listingId, buyerId: req.user!.id, sellerId: listing.sellerId }, });
    const message = await prisma.message.create({ data: { threadId: thread.id, senderId: req.user!.id, receiverId: listing.sellerId, body: input.body } });
    return res.status(201).json({ thread, message });
  } catch (error) { return next(error); }
});

marketplaceRouter.get('/threads', requireAuth, async (req, res, next) => {
  try { return res.json({ threads: await prisma.messageThread.findMany({ where: { OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }] }, include: { listing: true, messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } }) }); } catch (error) { return next(error); }
});
