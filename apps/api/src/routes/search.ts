import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config.js';
import { prisma } from '../db.js';
import { LISTINGS_COLLECTION, qdrant } from '../qdrant.js';
import { canUseAi, optionalAuth } from '../middleware/auth.js';

export const searchRouter = Router();
const searchSchema = z.object({
  q: z.string().trim().min(2).max(500),
  limit: z.coerce.number().int().min(1).max(40).default(12),
  category: z.string().trim().optional(),
  maxPrice: z.coerce.number().finite().positive().optional()
});

async function embed(input: string) {
  if (!env.AI_API_KEY) throw new Error('AI_API_KEY is not configured on the API service');
  const response = await fetch(`${env.AI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.AI_EMBEDDING_MODEL, dimensions: 1536, input })
  });
  if (!response.ok) throw new Error(`Embedding provider returned ${response.status}`);
  const data = await response.json() as { data?: { embedding?: number[] }[] };
  const vector = data.data?.[0]?.embedding;
  if (!vector) throw new Error('Embedding provider returned no vector');
  return vector;
}

searchRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const input = searchSchema.parse(req.query);
    if (!canUseAi(req.user)) {
      const categoryMatch = await prisma.category.findFirst({
        where: { OR: [{ slug: input.q.toLowerCase() }, { name: { equals: input.q, mode: 'insensitive' } }] }
      });
      const terms = input.q.split(/\s+/).filter(Boolean).map((term) => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' as const } },
          { description: { contains: term, mode: 'insensitive' as const } },
          { aiTags: { has: term.toLowerCase() } }
        ]
      }));
      const listings = await prisma.listing.findMany({
        where: {
          status: 'PUBLISHED',
          categoryId: input.category ?? categoryMatch?.id,
          ...(input.maxPrice ? { price: { lte: input.maxPrice } } : {}),
          ...(categoryMatch ? {} : { OR: terms })
        },
        take: input.limit,
        orderBy: { publishedAt: 'desc' },
        include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true }
      });
      return res.json({ mode: 'keyword', listings });
    }
    const vector = await embed(input.q);
    const must: Record<string, unknown>[] = [{ key: 'status', match: { value: 'published' } }];
    if (input.category) must.push({ key: 'category_id', match: { value: input.category } });
    if (input.maxPrice) must.push({ key: 'price', range: { lte: input.maxPrice } });
    const result = await qdrant.query(LISTINGS_COLLECTION, { query: vector, limit: input.limit, filter: { must }, with_payload: true });
    const hits = result.points;
    const ids = hits.map((hit) => String(hit.id));
    const listings = ids.length ? await prisma.listing.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true } }) : [];
    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    return res.json({ mode: 'semantic', listings: hits.map((hit) => ({ ...byId.get(String(hit.id)), id: String(hit.id), score: hit.score, ...(hit.payload as object ?? {}) })).filter((item) => item.title) });
  } catch (error) {
    return next(error);
  }
});
