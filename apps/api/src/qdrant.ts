import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './config.js';

export const LISTINGS_COLLECTION = 'classifieds_listings';
export const qdrant = new QdrantClient({ url: env.QDRANT_URL, apiKey: env.QDRANT_API_KEY });
