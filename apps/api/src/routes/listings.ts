import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
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

listingsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = createListingSchema.parse(req.body);
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
        status: 'PROCESSING',
        moderationStatus: 'PENDING',
        images: { create: input.imageUrls.map((url, sortOrder) => ({ url, sortOrder })) },
        aiJobs: { create: { status: 'queued' } }
      },
      select: { id: true, status: true, moderationStatus: true, createdAt: true }
    });

    if (env.N8N_LISTING_WEBHOOK_URL) {
      void fetch(env.N8N_LISTING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(env.N8N_WEBHOOK_SECRET ? { 'x-webhook-secret': env.N8N_WEBHOOK_SECRET } : {}) },
        body: JSON.stringify({ listingId: listing.id })
      }).catch((error) => console.error('Unable to dispatch listing to n8n', error));
    }

    return res.status(202).json({ listing });
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
