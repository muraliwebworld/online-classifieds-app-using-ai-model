import { Router } from 'express';
import Together from 'together-ai';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db';
import { qdrant, COLLECTION_NAME } from '../config/qdrant';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Create New Listing (Post Ad & Sync Vector DB)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { title, description, price, location, category } = req.body;
  const userId = req.user?.userId;

  if (!title || !description || !price || !location || !category) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const adId = uuidv4();

  try {
    // 1. Save Relational Data into MySQL
    await pool.execute(
      'INSERT INTO listings (id, user_id, title, description, price, location, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [adId, userId, title, description, price, location, category]
    );

    // 2. Format Context Payload for Vector Embedding
    const textToEmbed = `Title: ${title}. Category: ${category}. Description: ${description}. Price: ${price} INR. Location: ${location}.`;

    // 3. Generate Vector Embedding using Together AI
    const embeddingResponse = await together.embeddings.create({
      model: 'BAAI/bge-large-en-v1.5', // Or text-embedding-3-small
      input: textToEmbed,
    });
    const vector = embeddingResponse.data[0].embedding;

    // 4. Upsert Vector + Payload into Qdrant
    await qdrant.upsert(COLLECTION_NAME, {
      points: [
        {
          id: adId,
          vector,
          payload: { adId, location, category, price: Number(price) },
        },
      ],
    });

    res.status(201).json({ message: 'Listing created successfully', adId });
  } catch (error: any) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Listing
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  const adId = req.params.id;
  const userId = req.user?.userId;

  try {
    const [result]: any = await pool.execute(
      'DELETE FROM listings WHERE id = ? AND user_id = ?',
      [adId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Unauthorized or listing not found' });
    }

    // Delete vector from Qdrant
    await qdrant.delete(COLLECTION_NAME, { points: [adId] });

    res.json({ message: 'Listing deleted from database and vector index' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;