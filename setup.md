# TactileType — Project Setup Guide

This document is the **canonical setup guide** for humans and coding agents. Follow it on any machine to get a working local environment.

> **Scope:** local development setup only. Production/VPS deploy is covered in `apps/api/README.md`.

---

## 1. What this project is

Monorepo (Bun workspaces) for an advanced typing-test platform:

| Path | Package | Role | Default port |
|------|---------|------|--------------|
| `apps/web` | `web` | React 19 + Vite + Tailwind frontend | **3002** |
| `apps/api` | `api` | Hono API + WebSocket server (Bun) | **3001** |
| `packages/database` | `@tactile/database` | Drizzle ORM schema, migrations, seed | — |
| `packages/types` | `@tactile/types` | Shared TypeScript types | — |

**Stack:** Bun, TypeScript, PostgreSQL, Drizzle, Hono, React, TanStack Router/Query, WebSockets, JWT (+ optional Google/GitHub OAuth).

---

## 2. Prerequisites

Install these **before** anything else:

| Tool | Version | Notes |
|------|---------|--------|
| [Bun](https://bun.sh/) | latest (1.x) | Package manager **and** API runtime |
| [PostgreSQL](https://www.postgresql.org/) | 14+ | Local server must be running |
| [Node.js](https://nodejs.org/) | 18+ | Optional; some tooling may expect it |
| Git | any recent | Clone the repo |

### macOS quick checks

```bash
bun --version
psql --version          # or use Postgres.app and ensure its bin is on PATH
pg_isready              # should say "accepting connections"
```

If `psql` / `createdb` are missing but Postgres.app is installed:

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
```

### Install Bun (if needed)

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## 3. Clone and install dependencies

```bash
git clone <repository-url> tactiletype
cd tactiletype
bun install
```

This installs all workspace packages from the root `bun.lock`.

**Do not use `npm install` / `yarn` as the primary path** — the repo is Bun-first (`bun.lock`, Bun scripts, Bun API runtime).

---

## 4. Environment files

`.env` files are gitignored. Copy the examples, then edit if needed.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 4.1 Backend — `apps/api/.env`

| Variable | Required | Default / example | Purpose |
|----------|----------|-------------------|---------|
| `DATABASE_URL` | **Yes** | `postgresql://localhost:5432/tactile` | Postgres connection string |
| `JWT_SECRET` | **Yes** (use a real value) | random long string | Signs JWTs |
| `PORT` | No | `3001` | API listen port |
| `NODE_ENV` | No | `development` | Cookie/CSRF security flags |
| `FRONTEND_URL` | **Yes** for CORS | `http://localhost:3002` | Allowed frontend origin |
| `BASE_URL` | OAuth | `http://localhost:3001` | Public API URL for OAuth redirects |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth |

Generate a local JWT secret:

```bash
openssl rand -hex 32
```

Minimal working `apps/api/.env`:

```env
DATABASE_URL=postgresql://localhost:5432/tactile
JWT_SECRET=<paste-openssl-output>
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3002
BASE_URL=http://localhost:3001
```

### 4.2 Frontend — `apps/web/.env`

| Variable | Required | Default / example | Purpose |
|----------|----------|-------------------|---------|
| `VITE_API_URL` | Recommended | `http://localhost:3001` | REST API base URL |
| `VITE_WS_URL` | Recommended | `ws://localhost:3001/ws` | WebSocket URL |

Minimal working `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws
```

### 4.3 Port map (keep these consistent)

| Service | Port | URL |
|---------|------|-----|
| API (HTTP + WS) | 3001 | `http://localhost:3001`, `ws://localhost:3001/ws` |
| Web (Vite) | 3002 | `http://localhost:3002` |

Vite proxies `/api` → `http://localhost:3001` (see `apps/web/vite.config.ts`). Still set `VITE_API_URL` / `VITE_WS_URL` so client code does not fall back to inconsistent defaults.

**If 3001 or 3002 is already in use** (other projects), either free the port or change `PORT` / Vite `server.port` **and** update `FRONTEND_URL`, `BASE_URL`, `VITE_API_URL`, and `VITE_WS_URL` to match.

---

## 5. Database setup

### 5.1 Create the database

```bash
createdb tactile
```

If that fails with “role does not exist” or auth errors, adjust `DATABASE_URL` for your Postgres user, e.g.:

```env
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/tactile
# or
DATABASE_URL=postgresql://YOUR_USER:PASSWORD@localhost:5432/tactile
```

Create manually if preferred:

```bash
psql -c "CREATE DATABASE tactile;"
```

### 5.2 Run migrations

Root scripts forward to `@tactile/database`:

```bash
# Ensure DATABASE_URL is available to the process
export DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/tactile}"

bun run db:migrate
```

Expected: `Migrations completed successfully!`

### 5.3 Seed sample data (recommended)

```bash
bun run db:seed
```

Inserts sample typing test texts used by the app. Safe to re-run (clears and re-inserts `test_texts`).

### 5.4 Other DB commands

```bash
bun run db:generate   # After editing packages/database/src/schema.ts
bun run db:studio     # Drizzle Studio GUI
```

Migrations live in `packages/database/migrations/`.

---

## 6. Start development servers

From the **repo root**:

```bash
# Both API + web
bun run dev

# Or separately (two terminals)
bun run dev:api    # http://localhost:3001
bun run dev:web    # http://localhost:3002
```

### 6.1 Health checks

```bash
# API health
curl -sS http://localhost:3001/api
# → JSON with message "tactiletype API Server", status "healthy"

# Sample texts (after seed)
curl -sS http://localhost:3001/api/tests/texts | head

# Frontend
open http://localhost:3002
# or: curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3002/
```

WebSocket (once multiplayer is exercised): `ws://localhost:3001/ws`.

---

## 7. Optional: OAuth (Google / GitHub)

Email/password auth works without OAuth. To enable social login:

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 Client
2. Authorized redirect URI (dev):  
   `http://localhost:3001/api/auth/callback/google`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`

### GitHub

1. [GitHub → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Authorization callback URL (dev):  
   `http://localhost:3001/api/auth/callback/github`
3. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `apps/api/.env`

Restart the API after changing OAuth env vars.

---

## 8. Useful root scripts

| Script | What it does |
|--------|----------------|
| `bun run dev` | Start API and web |
| `bun run dev:api` | API only (hot reload) |
| `bun run dev:web` | Vite only |
| `bun run build` | Build API then web |
| `bun run db:generate` | Generate Drizzle migrations from schema |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed content packs (hundreds of practice units) into `test_texts` |
| `bun run db:studio` | Open Drizzle Studio |

---

## 9. Agent / automation checklist

Use this checklist when setting up on a **new machine** or in a **fresh clone**:

```text
[ ] Bun installed and on PATH
[ ] PostgreSQL running (pg_isready)
[ ] git clone + cd into repo
[ ] bun install
[ ] cp apps/api/.env.example apps/api/.env
[ ] cp apps/web/.env.example apps/web/.env
[ ] Set a real JWT_SECRET in apps/api/.env
[ ] Adjust DATABASE_URL if Postgres needs user/password
[ ] createdb tactile  (if DB does not exist)
[ ] export DATABASE_URL=...   (if not loaded from .env by scripts)
[ ] bun run db:migrate
[ ] bun run db:seed
[ ] Ensure ports 3001 and 3002 are free (or remapped consistently)
[ ] bun run dev
[ ] curl http://localhost:3001/api  → healthy JSON
[ ] open http://localhost:3002
```

### Agent notes

1. **Always prefer Bun** for install and run (`bun install`, `bun run …`).
2. **Never commit** `.env` files (only `.env.example`).
3. **`DATABASE_URL` for migrations/seed:** root scripts invoke the database package; if migrate/seed cannot connect, export `DATABASE_URL` in the shell (or run from a context that loads `apps/api/.env`). Default fallback in code is `postgresql://localhost:5432/tactile`.
4. **Port conflicts:** many machines already run other apps on 3001/3002. Free the ports or remap **all** related env vars together.
5. **Seed hang (fixed):** `packages/database/src/seed.ts` must `process.exit(0)` after seeding so the postgres-js connection does not keep the process alive.
6. **Workspace packages:** `@tactile/database` and `@tactile/types` are `workspace:*` deps — install only from the monorepo root.
7. **Structure drift:** older README mentions `packages/ui`, `packages/utils`, and `docs/`; those may not exist. Trust this file + actual tree under `apps/` and `packages/`.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ECONNREFUSED` on migrate/seed | Postgres not running or wrong host/port | Start Postgres; check `DATABASE_URL`; `pg_isready` |
| `database "tactile" does not exist` | DB not created | `createdb tactile` |
| `password authentication failed` | Wrong user/password in URL | Fix `DATABASE_URL` |
| `Failed to start server. Is port 3001 in use?` | Port taken | `lsof -nP -iTCP:3001 -sTCP:LISTEN` then free port or change `PORT` |
| Vite picks 3003+ | 3002 taken | Free 3002 or set Vite port and update `FRONTEND_URL` |
| CORS errors in browser | `FRONTEND_URL` ≠ actual web origin | Align `FRONTEND_URL` with the URL in the browser |
| OAuth redirect fails | Wrong callback URL or missing secrets | Match provider console to `BASE_URL` + `/api/auth/callback/...` |
| Empty test list | Seed not run | `bun run db:seed` |
| `bun: command not found` | Bun not installed / shell not reloaded | Install Bun; open new terminal or source profile |

---

## 11. Production (pointer only)

- API Docker: `apps/api/Dockerfile`, `apps/api/docker-compose.yml`, `apps/api/deploy.sh`
- Detailed VPS steps: `apps/api/README.md`
- Cloud Build: root `cloudbuild.yaml`

For production, always set strong `JWT_SECRET`, real `DATABASE_URL`, correct `FRONTEND_URL` / `BASE_URL`, and `NODE_ENV=production`.

---

## 12. Quick copy-paste (happy path)

```bash
# Prerequisites: bun, postgres running
git clone <repository-url> tactiletype && cd tactiletype
bun install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit apps/api/.env — set JWT_SECRET at minimum

createdb tactile 2>/dev/null || true
export DATABASE_URL=postgresql://localhost:5432/tactile
bun run db:migrate
bun run db:seed

bun run dev
# API: http://localhost:3001/api
# Web: http://localhost:3002
```
