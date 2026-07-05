# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install workspace deps using only the manifests first (better layer caching).
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/game-engine/package.json packages/game-engine/
RUN npm install --no-audit --no-fund

# Copy sources and build the server (tsup bundles workspace packages).
COPY packages/shared packages/shared
COPY packages/game-engine packages/game-engine
COPY apps/server apps/server
RUN npm run build --workspace=@paperpiece/server

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/package.json ./package.json

USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "dist/index.js"]
