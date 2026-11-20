import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config.js';
import { prisma } from '../db.js';
import { LISTINGS_COLLECTION, qdrant } from '../qdrant.js';
import { canUseAi, optionalAuth } from '../middleware/auth.js';

export const searchRouter = Router();
const searchSchema = z.object({
  q: z.string().trim().max(500).default(''),
  limit: z.coerce.number().int().min(1).max(40).default(12),
  category: z.string().trim().optional(),
  maxPrice: z.coerce.number().finite().positive().optional(),
  minPrice: z.coerce.number().finite().nonnegative().optional(),
  preferredLocationId: z.uuid().optional()
});

const STOP_WORDS = new Set([
  'listing', 'listings', 'ad', 'ads', 'item', 'items', 'post', 'posts',
  'with', 'in', 'at', 'near', 'from', 'for', 'of', 'the', 'a', 'an',
  'location', 'city', 'price', 'cost', 'budget', 'rupee', 'rupees', 'rs', 'inr'
]);

function parseAmount(raw: string, suffix?: string): number {
  const base = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(base)) return NaN;
  return suffix?.toLowerCase() === 'k' ? base * 1000 : base;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function parseNaturalQuery(
  rawQuery: string,
  explicitCategory?: string,
  explicitMinPrice?: number,
  explicitMaxPrice?: number
) {
  let working = rawQuery.trim();
  let minPrice = explicitMinPrice;
  let maxPrice = explicitMaxPrice;

  const betweenMatch = working.match(
    /\bbetween\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)(k)?\s+(?:and|to|-)\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)(k)?\s*(?:rupees?|rs\.?|inr)?/i
  );
  if (betweenMatch) {
    const low = parseAmount(betweenMatch[1], betweenMatch[2]);
    const high = parseAmount(betweenMatch[3], betweenMatch[4]);
    if (Number.isFinite(low) && minPrice === undefined) minPrice = low;
    if (Number.isFinite(high) && maxPrice === undefined) maxPrice = high;
    working = working.replace(betweenMatch[0], ' ');
  }

  const maxPattern =
    /\b(?:price\s+)?(?:less\s+than|under|below|up\s*to|upto|max(?:imum)?|<=|<)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)(k)?\s*(?:rupees?|rs\.?|inr)?/i;
  const maxMatch = working.match(maxPattern);
  if (maxMatch) {
    const parsed = parseAmount(maxMatch[1], maxMatch[2]);
    if (Number.isFinite(parsed) && maxPrice === undefined) maxPrice = parsed;
    working = working.replace(maxMatch[0], ' ');
  }

  const minPattern =
    /\b(?:price\s+)?(?:more\s+than|greater\s+than|above|over|at\s+least|min(?:imum)?|>=|>)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)(k)?\s*(?:rupees?|rs\.?|inr)?/i;
  const minMatch = working.match(minPattern);
  if (minMatch) {
    const parsed = parseAmount(minMatch[1], minMatch[2]);
    if (Number.isFinite(parsed) && minPrice === undefined) minPrice = parsed;
    working = working.replace(minMatch[0], ' ');
  }

  const [categories, locations] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.location.findMany({ select: { id: true, city: true, state: true } })
  ]);

  let matchedLocationId: string | undefined;
  for (const loc of locations) {
    const cityRe = new RegExp(`\\b${escapeRegex(loc.city)}\\b`, 'i');
    if (cityRe.test(working)) {
      matchedLocationId = loc.id;
      working = working.replace(cityRe, ' ');
      break;
    }
  }

  let matchedCategoryId = explicitCategory;
  if (!matchedCategoryId) {
    for (const cat of categories) {
      const singular = cat.name.endsWith('s') ? cat.name.slice(0, -1) : cat.name;
      const catRe = new RegExp(
        `\\b(?:${escapeRegex(cat.name)}|${escapeRegex(cat.slug)}|${escapeRegex(singular)})\\b`,
        'i'
      );
      if (catRe.test(working)) {
        matchedCategoryId = cat.id;
        working = working.replace(catRe, ' ');
        break;
      }
    }
  }

  const remainingTokens = working
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));

  return {
    semanticQuery: remainingTokens.join(' '),
    terms: remainingTokens,
    categoryId: matchedCategoryId,
    locationId: matchedLocationId,
    minPrice,
    maxPrice
  };
}

async function embed(input: string) {
  if (!env.AI_API_KEY) throw new Error('AI_API_KEY is not configured on the API service');
  const response = await fetch(`${env.AI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.AI_EMBEDDING_MODEL,
      ...(env.AI_EMBEDDING_DIMENSIONS ? { dimensions: env.AI_EMBEDDING_DIMENSIONS } : {}),
      input
    })
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
    const parsed = await parseNaturalQuery(
      input.q,
      input.category,
      input.minPrice,
      input.maxPrice
    );

    const priceFilter =
      parsed.minPrice !== undefined || parsed.maxPrice !== undefined
        ? {
            ...(parsed.minPrice !== undefined ? { gte: parsed.minPrice } : {}),
            ...(parsed.maxPrice !== undefined ? { lte: parsed.maxPrice } : {})
          }
        : undefined;

    const baseWhere = {
      status: 'PUBLISHED' as const,
      ...(parsed.categoryId ? { categoryId: parsed.categoryId } : {}),
      ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
      ...(priceFilter ? { price: priceFilter } : {})
    };

    const sortWithLocationPriority = <T extends { locationId?: string }>(items: T[]): T[] => {
      if (!input.preferredLocationId || parsed.locationId) return items;
      return [
        ...items.filter((item) => item.locationId === input.preferredLocationId),
        ...items.filter((item) => item.locationId !== input.preferredLocationId)
      ];
    };

    const keywordQuery = async () => {
      const termConditions = parsed.terms.map((term) => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' as const } },
          { description: { contains: term, mode: 'insensitive' as const } },
          { aiTags: { has: term } }
        ]
      }));
      const rows = await prisma.listing.findMany({
        where: {
          ...baseWhere,
          ...(termConditions.length ? { AND: termConditions } : {})
        },
        take: input.preferredLocationId && !parsed.locationId ? Math.min(input.limit * 3, 60) : input.limit,
        orderBy: { publishedAt: 'desc' },
        include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true }
      });
      return sortWithLocationPriority(rows).slice(0, input.limit);
    };

    if (!canUseAi(req.user) || !parsed.semanticQuery) {
      const listings = await keywordQuery();
      return res.json({
        mode: canUseAi(req.user) ? 'filtered' : 'keyword',
        filters: {
          categoryId: parsed.categoryId,
          locationId: parsed.locationId,
          minPrice: parsed.minPrice,
          maxPrice: parsed.maxPrice
        },
        listings
      });
    }

    const vector = await embed(parsed.semanticQuery);
    const must: Record<string, unknown>[] = [{ key: 'status', match: { value: 'published' } }];
    if (parsed.categoryId) must.push({ key: 'category_id', match: { value: parsed.categoryId } });
    if (parsed.locationId) must.push({ key: 'location_id', match: { value: parsed.locationId } });
    if (priceFilter) must.push({ key: 'price', range: priceFilter });

    const result = await qdrant.query(LISTINGS_COLLECTION, {
      query: vector,
      limit: input.limit,
      filter: { must },
      with_payload: true
    });
    const hits = result.points;
    const ids = hits.map((hit) => String(hit.id));
    const listings = ids.length
      ? await prisma.listing.findMany({
          where: { ...baseWhere, id: { in: ids } },
          include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, location: true }
        })
      : [];
    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    const ranked = hits
      .map((hit) => {
        const dbListing = byId.get(String(hit.id));
        if (!dbListing) return null;
        const item = { ...dbListing, score: hit.score } as Record<string, any>;
        const text = `${item.title ?? ''} ${item.description ?? ''} ${(item.aiTags ?? []).join(' ')}`.toLowerCase();
        const lexicalMatches = parsed.terms.filter((term) => text.includes(term)).length;
        const locationBoost =
          input.preferredLocationId && !parsed.locationId && dbListing.locationId === input.preferredLocationId
            ? 0.15
            : 0;
        return {
          ...item,
          lexicalScore: lexicalMatches / Math.max(parsed.terms.length, 1),
          score: Number(((hit.score * 0.75) + (lexicalMatches / Math.max(parsed.terms.length, 1)) * 0.25 + locationBoost).toFixed(6))
        } as Record<string, any>;
      })
      .filter((item): item is Record<string, any> => item !== null)
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) {
      const fallback = await keywordQuery();
      return res.json({ mode: 'keyword', listings: fallback });
    }

    return res.json({
      mode: 'hybrid',
      filters: {
        categoryId: parsed.categoryId,
        locationId: parsed.locationId,
        minPrice: parsed.minPrice,
        maxPrice: parsed.maxPrice
      },
      listings: ranked
    });
  } catch (error) {
    return next(error);
  }
});
