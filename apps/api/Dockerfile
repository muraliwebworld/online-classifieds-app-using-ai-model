FROM node:26-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates

COPY package*.json ./
# The compiler and Prisma CLI are needed while building. Explicitly include
# dev dependencies even if the platform injects NODE_ENV=production at build time.
RUN npm ci --include=dev

COPY prisma ./prisma
COPY tsconfig.json ./tsconfig.json
COPY src ./src

RUN npx prisma generate
RUN npm run build

FROM node:26-alpine AS production

ENV NODE_ENV=production
ENV PORT=5000
ENV UPLOAD_DIR=/app/uploads
ENV NODE_OPTIONS=--disable-proto=throw
ENV CLAMAV_HOST=clamav
ENV CLAMAV_PORT=3310

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/uploads

RUN chown -R node:node /app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

USER node

#CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
#CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && node dist/server.js"]
