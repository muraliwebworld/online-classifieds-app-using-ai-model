# Classifieds API

Phase 2 backend foundation for the AI classifieds application.

## Local setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name foundation
npm run dev
```

The API runs on `http://localhost:5000` by default.

## Coolify deployment

This directory is Docker-ready for deployment from GitHub. See [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md) for the required DNS, domain, port, PostgreSQL, and environment-variable settings.

## Initial endpoints

- `GET /health` — API and PostgreSQL health check
- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — obtain a bearer token
- `POST /api/listings` — authenticated listing submission; creates a `PROCESSING` listing and optionally dispatches its ID to n8n
- `GET /api/listings/:id` — fetch a published listing
- `GET /api/search?q=...` — semantic Qdrant search with published-status filtering

## Production environment

Set `DATABASE_URL`, a random `JWT_SECRET` of at least 32 characters, `FRONTEND_ORIGIN`, and the optional n8n webhook variables in Coolify. Run `npm run db:deploy` during deployment before starting the API.
