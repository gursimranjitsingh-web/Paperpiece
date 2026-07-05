# Deployment guide

Paperpiece has **two runtimes** that deploy to **two different places**:

| Part | What it is | Where to deploy |
| --- | --- | --- |
| `apps/web` | Next.js 15 client (static + SSR) | **Vercel** ✅ |
| `apps/server` | Long-running Socket.IO game server (stateful, 20 TPS loop, in-memory rooms) | **Render / Railway / Fly.io** (a persistent host) |
| Database | MongoDB (persistence only) | **MongoDB Atlas** (you already have this) |
| Cache/scale | Redis (Socket.IO adapter — optional) | **Upstash** (managed Redis) |

> **Why not the backend on Vercel?** Vercel runs stateless, short-lived serverless/edge
> functions. The game server keeps **live match state in memory** and runs a persistent
> WebSocket loop — it must be an always-on process, which Vercel doesn't provide. Put it
> on Render/Railway/Fly instead.

Deploy order: **backend first** (you need its URL), then **frontend**, then set the
backend's `CORS_ORIGIN` to the frontend URL.

---

## 1. MongoDB Atlas

- Atlas → **Network Access** → allow your server's IP. Render/Railway IPs are dynamic, so
  the simplest is to allow `0.0.0.0/0` (any IP) for the cluster, or use each host's static
  IP add-on.
- Copy the SRV connection string → this is `MONGODB_URI`.

## 2. Redis (optional, for horizontal scaling)

- Create a free database at [Upstash](https://upstash.com) → copy the `redis://…` URL →
  `REDIS_URL`. Omit it entirely to run single-node (fine for one server instance).

## 3. Backend → Render (Docker)

**Option A — Blueprint (one click):** the repo ships [`render.yaml`](./render.yaml).
1. [render.com](https://render.com) → **New +** → **Blueprint** → connect this GitHub repo.
2. Render reads `render.yaml` and creates the `paperpiece-server` web service (built from
   `infra/docker/server.Dockerfile`).
3. Fill the secret env vars when prompted:
   - `MONGODB_URI` = your Atlas SRV string
   - `REDIS_URL` = your Upstash URL (or leave blank)
   - `CORS_ORIGIN` = your Vercel URL (set after step 4; you can update it later)
4. Deploy → note the service URL, e.g. `https://paperpiece-server.onrender.com`.

**Option B — manual:** New Web Service → Docker → Dockerfile path
`infra/docker/server.Dockerfile`, Docker context `.`, health check `/api/health`, and the
same env vars.

> Free tier sleeps after inactivity (first request wakes it, ~30 s). Use the **Starter**
> plan for always-on.

**Railway / Fly.io** work the same way — point them at `infra/docker/server.Dockerfile`
with the same env vars. Both inject `PORT`; the server binds to it automatically.

## 4. Frontend → Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → import this GitHub repo.
2. **Root Directory:** set to **`apps/web`** (Vercel auto-detects Next.js + Turborepo and
   installs the whole workspace).
3. **Environment Variable:**
   - `NEXT_PUBLIC_SERVER_URL` = your backend URL from step 3
     (e.g. `https://paperpiece-server.onrender.com`)
4. Deploy → note the domain, e.g. `https://paperpiece.vercel.app`.

Build/install commands can stay at their defaults (Next.js preset). `output: 'standalone'`
in `next.config.ts` is harmless on Vercel.

## 5. Close the loop (CORS)

Set the backend's `CORS_ORIGIN` env var to your exact Vercel domain and redeploy the
backend:

```
CORS_ORIGIN=https://paperpiece.vercel.app
```

You can pass multiple origins comma-separated (e.g. add a custom domain). Preview
deployments have dynamic URLs — either add them or test against the production domain.

---

## Environment variable reference

**Backend (`apps/server`):**

| Var | Required | Example |
| --- | --- | --- |
| `MONGODB_URI` | for persistence | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/paperpiece` |
| `REDIS_URL` | optional | `redis://…upstash.io:6379` |
| `CORS_ORIGIN` | yes | `https://paperpiece.vercel.app` |
| `NODE_ENV` | yes | `production` |
| `PORT` | injected by host | (leave unset on Render/Railway/Fly) |

**Frontend (`apps/web`):**

| Var | Required | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | yes | `https://paperpiece-server.onrender.com` |

## Local production build (sanity check)

```
npm run build            # builds server (tsup) + web (next build)
npm run docker:up        # or run the whole stack locally in Docker
```

## Notes

- The server runs **without** MongoDB (degraded, non-persistent) if `MONGODB_URI` is
  unreachable — handy while wiring things up.
- Sounds live in `apps/web/public/sounds/` and ship with the frontend (they're committed).
- Scaling to multiple backend instances requires `REDIS_URL` (the Socket.IO Redis adapter
  shares rooms/broadcasts). A single instance needs no Redis.
