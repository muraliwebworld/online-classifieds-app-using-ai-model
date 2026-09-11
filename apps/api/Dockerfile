FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# The compiler and Prisma CLI are needed while building. Explicitly include
# dev dependencies even if the platform injects NODE_ENV=production at build time.
RUN npm ci --include=dev

COPY prisma ./prisma
COPY tsconfig.json ./tsconfig.json
COPY src ./src

RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

RUN chown -R node:node /app

EXPOSE 5000

USER node

#CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
#CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && node dist/server.js"]
