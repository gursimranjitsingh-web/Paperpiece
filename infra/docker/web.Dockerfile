# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/game-engine/package.json packages/game-engine/
RUN npm install --no-audit --no-fund

COPY packages/shared packages/shared
COPY packages/game-engine packages/game-engine
COPY apps/web apps/web

ARG NEXT_PUBLIC_SERVER_URL=http://localhost:4000
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@paperpiece/web

# ---- Runtime stage (Next.js standalone output) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

USER app
EXPOSE 3000
ENV HOSTNAME=0.0.0.0 PORT=3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1
CMD ["node", "apps/web/server.js"]
