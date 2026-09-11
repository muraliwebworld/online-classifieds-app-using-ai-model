# Coolify deployment: API

## GitHub repository

Push the `apps/api` directory as either:

1. A standalone GitHub repository, or
2. A monorepo root configured in Coolify with `apps/api` as the build context.

The simplest setup is a standalone repository containing the contents of this directory. Coolify detects the `Dockerfile` automatically.

## Create the application in Coolify

1. Create a new **Public GitHub Repository** resource.
2. Select the API repository and its production branch.
3. Set the build pack to **Dockerfile**.
4. Set the Dockerfile location to `./Dockerfile`.
5. Set the exposed/container port to `5000`.
6. Add the environment variables from `coolify.env.example` using real values.
7. Deploy the application.

Set application environment variables as runtime variables only. Do not add
`JWT_SECRET`, `DATABASE_URL`, or other credentials as Docker build arguments.
The Dockerfile needs no secrets during the image build.

The container runs database migrations before starting the API:

```text
npx prisma migrate deploy && node dist/server.js
```

Do not use `prisma migrate dev` on the production VPS.

## Domain configuration

At the DNS provider for `videxpulse.com`, create:

```text
Type: A
Host: api
Value: YOUR_HOSTINGER_VPS_IP
TTL: Auto
```

After DNS resolves, open the Coolify application settings and set the FQDN to:

```text
https://api.videxpulse.com
```

Coolify’s reverse proxy should terminate HTTPS and forward traffic to container port `5000`.

Verify the deployment at:

```text
https://api.videxpulse.com/
https://api.videxpulse.com/health
```

Expected health response:

```json
{
  "status": "ok",
  "database": "ok"
}
```

## PostgreSQL connection

Use the internal PostgreSQL hostname and port from the Coolify network in `DATABASE_URL`. Do not use `localhost`; inside the API container, `localhost` means the API container itself.

Example:

```text
postgresql://classifieds:strong-password@postgres:5432/classifieds?schema=public
```

The exact hostname depends on the PostgreSQL resource name shown by Coolify.

## Required security settings

- Store secrets only in Coolify environment variables.
- Do not commit `.env` or production credentials.
- Keep PostgreSQL and Qdrant private on the internal network.
- Restrict n8n webhook access with `N8N_WEBHOOK_SECRET`.
- Set `FRONTEND_ORIGIN` to the real frontend origin.
- Enable Coolify backups for PostgreSQL.
