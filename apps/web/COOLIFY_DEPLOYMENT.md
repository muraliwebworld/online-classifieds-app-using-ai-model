# Coolify deployment: Next.js frontend

Create another application from the same GitHub repository:

- Root directory: `/apps/web`
- Dockerfile: `/apps/web/Dockerfile`
- Container port: `3000`
- Domain: `https://classifieds.videxpulse.com`

Add this runtime environment variable:

```text
NEXT_PUBLIC_API_URL=https://api.videxpulse.com
```

Because this variable is used by the browser bundle, redeploy after changing it. The API must allow the frontend domain in its `FRONTEND_ORIGIN` setting.
