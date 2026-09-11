import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

export const COLLECTION_NAME = 'classified_ads';

// Initialize collection with 1536 dimensions for text-embedding-3-small
export async function initQdrantCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: 1536, distance: 'Cosine' },
      });
      console.log(`Qdrant collection '${COLLECTION_NAME}' created.`);
    }
  } catch (error) {
    console.error('Error initializing Qdrant:', error);
  }
}