# VidexPulse Classifieds

> An AI-assisted local marketplace where people can discover, buy, and sell useful things nearby.

[![Frontend](https://img.shields.io/badge/frontend-Next.js-black?logo=next.js)](apps/web)
[![Backend](https://img.shields.io/badge/backend-Express%20%2B%20TypeScript-blue?logo=typescript)](apps/api)
[![Database](https://img.shields.io/badge/database-PostgreSQL-336791?logo=postgresql)](apps/api/prisma/schema.prisma)
[![Vector search](https://img.shields.io/badge/vector%20search-Qdrant-ff4f64)](https://qdrant.tech/)
[![Automation](https://img.shields.io/badge/automation-n8n-ea4b71)](https://n8n.io/)

VidexPulse Classifieds is a modern online classifieds platform designed for natural-language discovery, trusted listing workflows, and affordable AI usage. The platform supports a normal marketplace experience for free users while reserving AI moderation, embeddings, and semantic RAG search for paid and administrator accounts.

Production domains:

- Website: [classifieds.videxpulse.com](https://classifieds.videxpulse.com)
- API: [api.videxpulse.com](https://api.videxpulse.com)

## Product vision

Traditional classified websites force users to search with exact keywords and browse endless pages. VidexPulse lets a buyer describe intent naturally:

```text
comfortable wooden furniture for a small dining room under ₹20,000
```

Paid and administrator accounts can use AI-powered semantic retrieval. Free users receive a fast, database-backed keyword and category search without consuming paid AI credits.

## Highlights

- Attractive, responsive marketplace UI
- Natural-language search interface
- Subscription-aware AI access
- AI moderation and tag extraction through n8n
- OpenAI or OpenRouter provider support
- Embeddings stored in local Qdrant
- PostgreSQL as the source of truth
- Hybrid lexical and vector ranking
- Category, price, and published-status filtering
- Authenticated listing submission
- Favorites and buyer-seller messaging APIs
- Image upload endpoint with persistent storage support
- Rate limiting and secure webhook callbacks
- Admin APIs and an initial admin dashboard
- Coolify-ready Docker deployments

## How the platform works

```text
                         ┌─────────────────────────┐
                         │   Next.js marketplace   │
                         │ classifieds.videxpulse │
                         └────────────┬────────────┘
                                      │ HTTPS
                         ┌────────────▼────────────┐
                         │      Express API        │
                         │ api.videxpulse.com      │
                         └─────┬──────────┬─────────┘
                               │          │
                    PostgreSQL│          │Qdrant search
                               │          │paid/admin only
                    ┌──────────▼───┐  ┌───▼──────────┐
                    │ App database │  │ Local Qdrant │
                    │ source truth │  │ vector index │
                    └──────────────┘  └──────────────┘
                               │
                         paid/admin listings
                               │
                         ┌─────▼─────┐
                         │    n8n    │
                         │ AI worker │
                         └─────┬─────┘
                               │
                    OpenAI or OpenRouter API
```

### Listing submission

1. A signed-in user submits a listing through Next.js.
2. Express validates the payload and stores the listing in PostgreSQL.
3. Free users are published immediately with normal moderation status.
4. Paid/admin users are marked `PROCESSING` and sent to the n8n webhook.
5. n8n moderates the content, cleans text, and extracts tags.
6. n8n creates an embedding through OpenAI or OpenRouter.
7. The vector and searchable payload are upserted into Qdrant.
8. n8n calls the protected Express callback.
9. Express changes the listing to `PUBLISHED` or `REJECTED`.

### Search behavior

| Account type | Listing creation | Search mode | AI cost |
|---|---|---|---|
| Free user | Normal PostgreSQL publication | Keyword/category search | No embedding cost |
| Paid user | AI moderation and indexing | Hybrid semantic + lexical search | Uses configured provider |
| Administrator | AI moderation and indexing | Hybrid semantic + lexical search | Uses configured provider |

PostgreSQL remains authoritative. Qdrant is an index and can be rebuilt from published listings.

## Repository structure

```text
.
├── apps/
│   ├── api/
│   │   ├── prisma/                 # Schema, migrations, and seed data
│   │   ├── src/                    # Express API source
│   │   ├── n8n/                   # Importable AI workflow
│   │   ├── Dockerfile
│   │   └── COOLIFY_DEPLOYMENT.md
│   └── web/
│       ├── app/                    # Next.js App Router pages
│       ├── components/
│       ├── lib/
│       └── Dockerfile
├── docs/
│   └── ai-classifieds-platform-plan.md
└── old-app-code/                  # Historical prototypes kept for reference
```

## Main applications

### Next.js frontend

Location: [`apps/web`](apps/web)

Routes currently include:

```text
/                 Marketplace homepage
/search           Search results
/listing/[id]     Listing details
/login            Sign in
/post             Authenticated listing form
/admin            Initial administrator dashboard
```

### Express API

Location: [`apps/api`](apps/api)

The API provides authentication, listing management, catalog data, search, uploads, favorites, messaging, subscription-aware access control, and administrator operations.

### n8n workflow

Import:

```text
apps/api/n8n/classifieds-listing-ingestion.json
```

Workflow sequence:

```text
Listing webhook
  → Validate payload
  → AI moderation and tags
  → Create embedding
  → Prepare Qdrant point
  → Qdrant upsert
  → Publish listing callback
```

The workflow supports both OpenAI-compatible providers by changing environment variables. No workflow redesign is required when switching providers.

## API reference

### Health and authentication

```text
GET  /health
POST /api/auth/register
POST /api/auth/login
```

### Listings and catalog

```text
POST /api/listings                 Authenticated listing submission
GET  /api/listings/:id             Published listing details
GET  /api/catalog/categories
GET  /api/catalog/locations
```

### Search

```text
GET /api/search?q=furniture
GET /api/search?q=phone&maxPrice=40000
GET /api/search?q=vehicles&category=<category-id>
```

Unauthenticated and free-user requests use PostgreSQL keyword/category search. Paid/admin requests use embeddings, Qdrant filtering, and hybrid lexical scoring.

### Images

```text
POST /api/uploads
```

Use an authenticated `multipart/form-data` request with the field name `images`. The API accepts up to eight images per request, with a 5 MB limit per file for JPEG, PNG, WebP, and GIF files.

For production, mount persistent storage at `/app/uploads` in Coolify.

### Favorites and messaging

```text
POST   /api/favorites/:listingId
DELETE /api/favorites/:listingId
GET    /api/favorites

POST /api/threads
GET  /api/threads
```

### Administrator APIs

All administrator routes require an authenticated user with role `ADMIN`:

```text
GET    /api/admin/users
PATCH  /api/admin/users/:id
GET    /api/admin/listings
PATCH  /api/admin/listings/:id
POST   /api/admin/categories
PATCH  /api/admin/categories/:id
DELETE /api/admin/categories/:id
GET    /api/admin/plans
POST   /api/admin/plans
PATCH  /api/admin/plans/:id
DELETE /api/admin/plans/:id
GET    /api/admin/theme
PUT    /api/admin/theme/:key
```

## Local development

### API

Requirements: Node.js 20+, PostgreSQL, and optionally Qdrant.

```bash
cd apps/api
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name local
npm run db:seed
npm run dev
```

The API runs on `http://localhost:5000`.

### Frontend

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

Set the frontend API URL:

```text
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Environment configuration

### API

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/classifieds_app?schema=public
JWT_SECRET=at-least-32-random-characters
FRONTEND_ORIGIN=https://classifieds.videxpulse.com
QDRANT_URL=http://classifieds-qdrant:6333
QDRANT_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=provider-key
AI_EMBEDDING_MODEL=text-embedding-3-small
N8N_LISTING_WEBHOOK_URL=https://n8n.videxpulse.com/webhook/classifieds-listing
N8N_WEBHOOK_SECRET=shared-secret
UPLOAD_DIR=/app/uploads
```

Use `classifieds_app` for the API database and keep n8n in its separate `classifieds_db` database.

### n8n

For OpenAI:

```text
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-openai-key
AI_CHAT_MODEL=gpt-4o-mini
AI_EMBEDDING_MODEL=text-embedding-3-small
```

For OpenRouter:

```text
AI_PROVIDER=openrouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=your-openrouter-key
AI_CHAT_MODEL=openai/gpt-4o-mini
AI_EMBEDDING_MODEL=openai/text-embedding-3-small
```

The API key and webhook secret must be stored in Coolify runtime environment variables, never committed to GitHub or placed in frontend code.

## Coolify deployment

This repository is a monorepo with independently deployable applications.

### API application

```text
Repository: muraliwebworld/online-classifieds-app-using-ai-model
Base directory: /apps/api
Dockerfile: /Dockerfile
Container port: 5000
Domain: https://api.videxpulse.com
```

Mount a persistent volume:

```text
Destination: /app/uploads
```

### Frontend application

```text
Base directory: /apps/web
Dockerfile: /Dockerfile
Container port: 3000
Domain: https://classifieds.videxpulse.com
```

Frontend environment variable:

```text
NEXT_PUBLIC_API_URL=https://api.videxpulse.com
```

### Internal networking

API, n8n, PostgreSQL, Redis, and Qdrant must share the Coolify predefined `coolify` network. Use the actual internal Qdrant hostname shown by Coolify if the service does not expose the `classifieds-qdrant` alias.

## Database migrations

Production containers run migrations before starting the API:

```text
npx prisma migrate deploy
npm run db:seed
node dist/server.js
```

Never run `prisma db push --accept-data-loss` against the production database. Keep the API database separate from n8n’s database.

## Security and operational notes

- Never expose PostgreSQL or Qdrant publicly unless temporarily required for diagnosis.
- Use a long random JWT secret and webhook secret.
- Keep AI keys in Coolify runtime variables.
- Rate limiting is enabled on `/api` routes.
- Image uploads are authenticated, size-limited, and MIME-filtered.
- Use persistent storage for uploads and scheduled backups for PostgreSQL/Qdrant.
- AI moderation is an assistive control; administrator review remains important for prohibited items and abuse.
- Use the admin role carefully and protect administrator accounts with strong passwords and 2FA at the hosting layer.

## Project documentation

- [Full phased platform plan](docs/ai-classifieds-platform-plan.md)
- [API setup](apps/api/README.md)
- [API Coolify deployment](apps/api/COOLIFY_DEPLOYMENT.md)
- [Frontend Coolify deployment](apps/web/COOLIFY_DEPLOYMENT.md)
- [n8n workflow](apps/api/n8n/classifieds-listing-ingestion.json)

## Roadmap

- Payment-provider integration for subscription plans
- Stronger hybrid search and configurable similarity thresholds
- Image thumbnails and object storage such as S3/R2
- Email/phone verification and CAPTCHA
- Duplicate listing detection
- Saved searches and notifications
- Full admin forms and moderation queue
- Messaging notifications and abuse reporting workflows
- Analytics and promoted listings

## License

This project is currently intended for private development and deployment. Add a formal license before redistributing it publicly.
