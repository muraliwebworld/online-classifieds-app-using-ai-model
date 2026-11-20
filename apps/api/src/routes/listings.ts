import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { canUseAi, requireAuth } from '../middleware/auth.js';
import { verifyRecaptcha } from '../middleware/recaptcha.js';
import { env } from '../config.js';
import { LISTINGS_COLLECTION, qdrant } from '../qdrant.js';

export const listingsRouter = Router();

listingsRouter.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        locationId: z.uuid().optional(),
        limit: z.coerce.number().int().min(1).max(40).default(12)
      })
      .parse(req.query);

    const listings = await prisma.listing.findMany({
      where: { status: 'PUBLISHED' },
      take: query.locationId ? Math.min(query.limit * 3, 60) : query.limit,
      orderBy: { publishedAt: 'desc' },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true }
    });

    const sorted = query.locationId
      ? [
          ...listings.filter((item) => item.locationId === query.locationId),
          ...listings.filter((item) => item.locationId !== query.locationId)
        ].slice(0, query.limit)
      : listings;

    return res.json({ listings: sorted });
  } catch (error) {
    return next(error);
  }
});

const createListingSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(10000),
  price: z.coerce.number().finite().nonnegative(),
  currency: z.string().trim().length(3).default('INR'),
  categoryId: z.uuid(),
  locationId: z.uuid(),
  imageUrls: z
    .array(
      z.string().refine(
        (val) => val.startsWith('/uploads/') || z.url().safeParse(val).success,
        'Invalid image URL'
      )
    )
    .max(12)
    .default([])
});

listingsRouter.post('/', requireAuth, verifyRecaptcha, async (req, res, next) => {
  try {
    const input = createListingSchema.parse(req.body);
    const aiEnabled = canUseAi(req.user);
    const listing = await prisma.listing.create({
      data: {
        sellerId: req.user!.id,
        categoryId: input.categoryId,
        locationId: input.locationId,
        title: input.title,
        description: input.description,
        originalTitle: input.title,
        originalDescription: input.description,
        price: input.price,
        currency: input.currency,
        status: aiEnabled ? 'PROCESSING' : 'PUBLISHED',
        moderationStatus: aiEnabled ? 'PENDING' : 'APPROVED',
        publishedAt: aiEnabled ? null : new Date(),
        images: { create: input.imageUrls.map((url, sortOrder) => ({ url, sortOrder })) },
        ...(aiEnabled ? { aiJobs: { create: { status: 'queued' } } } : {})
      },
      select: { id: true, status: true, moderationStatus: true, createdAt: true }
    });

    if (aiEnabled && env.N8N_LISTING_WEBHOOK_URL) {
      void fetch(env.N8N_LISTING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(env.N8N_WEBHOOK_SECRET ? { 'x-webhook-secret': env.N8N_WEBHOOK_SECRET } : {}) },
        body: JSON.stringify({
          listingId: listing.id,
          title: input.title,
          description: input.description,
          price: input.price,
          currency: input.currency,
          categoryId: input.categoryId,
          locationId: input.locationId,
          imageUrls: input.imageUrls,
          sellerId: req.user!.id
        })
      }).catch((error) => console.error('Unable to dispatch listing to n8n', error));
    }

    return res.status(202).json({ listing });
  } catch (error) {
    return next(error);
  }
});

const aiCallbackSchema = z.object({
  listingId: z.uuid(),
  isValid: z.boolean(),
  cleanedTitle: z.string().trim().min(1).max(160).optional(),
  cleanedDescription: z.string().trim().min(1).max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  rejectionReason: z.string().max(500).nullable().optional()
});

listingsRouter.post('/ai-callback', async (req, res, next) => {
  try {
    if (env.N8N_WEBHOOK_SECRET && req.header('x-webhook-secret') !== env.N8N_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid workflow signature' });
    }
    const input = aiCallbackSchema.parse(req.body);
    const listing = await prisma.listing.update({
      where: { id: input.listingId },
      data: {
        title: input.cleanedTitle,
        description: input.cleanedDescription,
        aiTags: input.tags,
        status: input.isValid ? 'PUBLISHED' : 'REJECTED',
        moderationStatus: input.isValid ? 'APPROVED' : 'REJECTED',
        rejectionReason: input.isValid ? null : (input.rejectionReason ?? 'Listing did not pass moderation'),
        publishedAt: input.isValid ? new Date() : null,
        aiJobs: { updateMany: { where: { status: { not: 'complete' } }, data: { status: input.isValid ? 'complete' : 'rejected' } } }
      },
      select: { id: true, status: true, moderationStatus: true }
    });
    return res.json({ listing });
  } catch (error) {
    return next(error);
  }
});

listingsRouter.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { sellerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true }
    });
    return res.json({ listings });
  } catch (error) {
    return next(error);
  }
});

const updateOwnListingSchema = z.object({
  title: z.string().trim().min(5).max(160).optional(),
  description: z.string().trim().min(20).max(10000).optional(),
  price: z.coerce.number().finite().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
  categoryId: z.uuid().optional(),
  locationId: z.uuid().optional(),
  status: z.enum(['PUBLISHED', 'ARCHIVED', 'DRAFT']).optional()
});

listingsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }
    const input = updateOwnListingSchema.parse(req.body);
    const listing = await prisma.listing.update({
      where: { id: existing.id },
      data: {
        ...input,
        ...(input.status === 'PUBLISHED' && !existing.publishedAt ? { publishedAt: new Date() } : {})
      },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true }
    });
    return res.json({ listing });
  } catch (error) {
    return next(error);
  }
});

listingsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }
    await prisma.listing.delete({ where: { id: existing.id } });
    await qdrant.delete(LISTINGS_COLLECTION, { points: [existing.id] }).catch(() => undefined);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

listingsRouter.get('/:id', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true, seller: { select: { id: true, name: true } } }
    });
    if (!listing || listing.status !== 'PUBLISHED') return res.status(404).json({ error: 'Listing not found' });
    return res.json({ listing });
  } catch (error) {
    return next(error);
  }
});
