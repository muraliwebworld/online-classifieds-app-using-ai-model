import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { z, ZodError } from 'zod';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { env } from './config.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { listingsRouter } from './routes/listings.js';
import { catalogRouter } from './routes/catalog.js';
import { searchRouter } from './routes/search.js';
import { marketplaceRouter } from './routes/marketplace.js';
import { adminRouter } from './routes/admin.js';
import { uploadsRouter } from './routes/uploads.js';
import { profileRouter } from './routes/profile.js';
import { csrfProtection } from './middleware/csrf.js';

export const app = express();
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', csrfProtection);
app.use((pinoHttp as unknown as () => express.RequestHandler)());
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR ?? '/app/uploads')));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/', (_req, res) => res.json({ name: 'classifieds-api', version: '0.1.0' }));
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/search', searchRouter);
app.use('/api', marketplaceRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/profile', profileRouter);

app.get('/api/docs', (_req, res) => res.json({ message: 'OpenAPI documentation will be expanded in Phase 3.' }));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: z.treeifyError(error) });
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
});
