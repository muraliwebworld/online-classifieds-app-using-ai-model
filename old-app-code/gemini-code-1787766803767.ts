import { Router } from 'express';
import Together from 'together-ai';
import Groq from 'groq-sdk';
import { pool } from '../config/db';
import { qdrant, COLLECTION_NAME } from '../config/qdrant';

const router = Router();
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// RAG Search API (Streams output to Client via SSE)
router.post('/chat', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    // 1. Embed User Search Query
    const queryEmbedding = await together.embeddings.create({
      model: 'BAAI/bge-large-en-v1.5',
      input: query,
    });
    const vector = queryEmbedding.data[0].embedding;

    // 2. Query Qdrant for Top 3 Closest Match IDs
    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector,
      limit: 3,
    });

    const adIds = searchResults.map((res) => res.id as string);

    let contextListings: any[] = [];
    if (adIds.length > 0) {
      // 3. Enrich with MySQL data to get up-to-date pricing/availability
      const placeholders = adIds.map(() => '?').join(',');
      const [rows]: any = await pool.execute(
        `SELECT id, title, description, price, location, category FROM listings WHERE id IN (${placeholders}) AND status = 'active'`,
        adIds
      );
      contextListings = rows;
    }

    // 4. Construct Prompt Context
    const contextText = contextListings.length > 0
      ? contextListings.map((ad, i) => `${i + 1}. Title: ${ad.title} | Price: ${ad.price} INR | Location: ${ad.location} | Description: ${ad.description}`).join('\n')
      : 'No active listings found matching this context.';

    const systemPrompt = `You are an AI assistant for an online classifieds platform. Help users find items using ONLY the provided listings context below. Be concise and friendly.
    
Context Listings:
${contextText}`;

    // 5. Setup Server-Sent Events (SSE) Header for Streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 6. Request Stream from Groq (Llama 3 8B)
    const chatStream = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      model: 'llama-3.1-8b-instant',
      stream: true,
    });

    for await (const chunk of chatStream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('RAG Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;