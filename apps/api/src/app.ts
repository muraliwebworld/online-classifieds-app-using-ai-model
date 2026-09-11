import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { z, ZodError } from 'zod';
import { env } from './config.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { listingsRouter } from './routes/listings.js';
import { catalogRouter } from './routes/catalog.js';
import { searchRouter } from './routes/search.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((pinoHttp as unknown as () => express.RequestHandler)());

app.get('/', (_req, res) => res.json({ name: 'classifieds-api', version: '0.1.0' }));
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/search', searchRouter);

app.get('/api/docs', (_req, res) => res.json({ message: 'OpenAPI documentation will be expanded in Phase 3.' }));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: z.treeifyError(error) });
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
});
