import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { canUseAi, requireAuth } from '../middleware/auth.js';
import { verifyRecaptcha } from '../middleware/recaptcha.js';
import { env } from '../config.js';

export const listingsRouter = Router();

const createListingSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(10000),
  price: z.coerce.number().finite().nonnegative(),
  currency: z.string().trim().length(3).default('INR'),
  categoryId: z.uuid(),
  locationId: z.uuid(),
  imageUrls: z.array(z.url()).max(12).default([])
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
