import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import searchRoutes from './routes/search';
import { initQdrantCollection } from './config/qdrant';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/search', searchRoutes);

// Start Server and Initialize Vector DB
app.listen(PORT, async () => {
  console.log(`Server executing on http://localhost:${PORT}`);
  await initQdrantCollection();
});