# Paperpiece

A production-oriented, **server-authoritative** multiplayer territory-conquest game
(inspired by the genre; all assets, code, and architecture are original).

- **Frontend:** Next.js 15 (App Router), TypeScript, React Three Fiber, Zustand, TanStack Query v5, TailwindCSS v4, Framer Motion
- **Backend:** Node.js, Express, Socket.IO, TypeScript (server authoritative, 20 TPS)
- **Database:** MongoDB + Mongoose (persistence only — live state stays in server memory)
- **Optional:** Redis (Socket.IO adapter for horizontal scaling), Docker / Docker Compose
- **Monorepo:** Turborepo + npm workspaces, strict TypeScript everywhere (no JavaScript)

## Layout

```
apps/
  web        # Next.js 15 client
  server     # Express + Socket.IO authoritative game server
packages/
  shared     # types, enums, constants, socket contracts, DTOs, utils
  game-engine # pure-TS game logic: Grid, flood-fill capture, spawn, scoring
```

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- (optional) Docker — for MongoDB + Redis, or the full stack

## Getting started

```bash
# 1. Install all workspace dependencies
npm install

# 2. Copy env and start infrastructure (MongoDB + Redis)
cp .env.example .env
docker compose up -d mongo redis     # or run your own MongoDB

# 3. Run everything in dev (server on :4000, web on :3000)
npm run dev
```

Open http://localhost:3000 — the landing page shows a live **Server online** indicator
when the game server is reachable.

> The server also runs **without** MongoDB (degraded, non-persistent mode) so you can
> try it before wiring up a database.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run web + server in watch mode (Turborepo) |
| `npm run build` | Build all packages and apps |
| `npm run typecheck` | Strict type-check every workspace |
| `npm run lint` | ESLint across the monorepo |
| `npm run test` | Run unit tests (game-engine, …) |
| `npm run format` | Prettier write |

## Full stack via Docker

```bash
docker compose up --build
# web → http://localhost:3000, server → http://localhost:4000
```

## Roadmap (all phases complete)

1. **Foundation:** monorepo, shared package, game-engine core (Grid, flood-fill capture, spawn, scoring), Express + Socket.IO server, Next.js client, Mongoose models, Docker.
2. **Lobby & room system:** identity, create/join by code, ready-up, host controls, reconnect grace.
3. **Authoritative engine:** movement, collision (self/enemy-trail, boundary, head-on), territory capture, respawn, 20 TPS game loop, bots.
4. **React Three Fiber rendering:** InstancedMesh grid, orthographic follow-camera, Line2 neon trails, bloom, entity interpolation.
5. **Persistence:** leaderboards, match history, statistics, profiles (MongoDB).
6. **Hardening:** delta/leaderboard bandwidth optimization, anti-cheat, rate limiting, tests, production Docker.

## Production (Docker)

```bash
# Full stack (Mongo + Redis + server + web) with health checks & restart policies
npm run docker:up            # docker compose up --build -d
npm run docker:logs          # tail server + web
npm run docker:down
```

- Server image: multi-stage, non-root, `tsup`-bundled, `HEALTHCHECK` on `/api/health`.
- Web image: Next.js **standalone** output, non-root, `HEALTHCHECK` on `:3000`.
- Redis is wired via `REDIS_URL` for the Socket.IO adapter (horizontal scaling); omit it to run single-node.

## Testing

```bash
npm run test        # engine unit tests + server (RoomService, persistence via in-memory Mongo)
```

- **Engine (12):** Grid deltas, flood-fill capture, spawn placement, scoring, movement, trail, self/boundary death, respawn.
- **Server (9):** RoomService (colours, capacity, host-only actions, host migration, ready-gating, countdown) and persistence (`recordMatch` → stats/ladder, bot exclusion, aggregation) against `mongodb-memory-server`.

## Security / anti-cheat

- **Server authoritative:** clients send only a direction; the server owns movement, collision, capture, death, and scoring.
- Every socket payload is **zod-validated**; spoofed directions and instant 180° reversals are rejected.
- **Rate limits:** per-socket input (40/s) and room-action (30/10s) limiters; REST read API limited (120/min/IP).
- Socket `maxHttpBufferSize` caps oversized packets; Helmet + strict CORS on HTTP.
- Movement speed is server-controlled, so input spam can never make a player move faster.

## Performance

- 20 TPS server tick, 60 FPS client render target.
- **Delta updates only** — a single `InstancedMesh` grid recolours just the cells that changed; the leaderboard ships at 4 Hz.
- Grid state uses flat `Int32Array`s; the client mirrors it in a non-reactive buffer read inside `requestAnimationFrame`, so 20 Hz network updates never re-render React.

## Architectural notes

- **Server authoritative:** clients send only direction input; the server owns movement,
  collision, capture, scoring, and death, then broadcasts **delta updates**.
- **Grid, never pixels:** the world is a cell grid; rendering maps cells → world units.
- **Memory-efficient state:** ownership/trails use flat `Int32Array`s; only changed cells
  are broadcast each tick.
- **MongoDB is persistence-only:** live rooms live in a server-memory `Map`, never the DB.
