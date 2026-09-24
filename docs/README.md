# Opal Line — Jewellery Billing & Shop ERP

**Opal Line** is the billing and ERP system for a 92.5 sterling‑silver jewellery
business. It covers point‑of‑sale billing, silver‑rate–driven pricing, inventory,
purchase orders, payments, reports, and two‑way reconciliation with the store's
Shopify shop (products, prices, inventory, orders, customers).

> Stack note: the backend is **Express 5 + Prisma 7 + PostgreSQL in plain
> JavaScript (CommonJS)** — it is **not** NestJS, and there is **no TypeScript**
> in either the backend or the React frontend (`.jsx`). See `ARCHITECTURE.md`.

---

## Environment & live URLs

| Where | URL |
| --- | --- |
| Backend API (Railway, production) | `https://jewellry-shop-billing-sysyem-production.up.railway.app` |
| Frontend (Vercel) | `https://zayra-jewellry-billing-software.vercel.app` |
| Local backend | `http://localhost:5000` |
| Local frontend | `http://localhost:5173` (Vite dev server, uses `localhost:5000` anyway via proxy below) |

The frontend talks to the backend through `/api`. In dev, Vite proxies
`/api` → `http://localhost:5000` (`frontend/vite.config.js`). In production the
frontend points at Railway via `VITE_API_URL`
(`frontend/.env`, e.g. `VITE_API_URL=https://jewellry-shop-billing-sysyem-production.up.railway.app`),
so the browser's `/api` requests are made absolute by the axios client.

## Repository layout (npm workspaces monorepo)

```
billing website/
├── package.json            # root: "workspaces": ["backend", "frontend"], build/test scripts
├── README.md               # existing top-level overview (architecture + folder tree)
├── docs/                   # this documentation set
│   ├── README.md           # you are here
│   ├── PRD.md              # product requirements & business rules
│   ├── ARCHITECTURE.md     # system design, data model, flows (see ARCHITECTURE.md)
│   ├── SECURITY.md         # authentication, RBAC, hardening
│   ├── DESIGN_SYSTEM.md    # Tailwind theme, UI kit conventions
│   ├── CODE_STYLE.md       # backend & frontend coding conventions
│   ├── TESTING.md          # unit / integration / e2e, how to run
│   └── AGENTS.md           # working agreement for AI coding agents
├── backend/                # Express 5 API (CommonJS .js, Prisma + PostgreSQL)
└── frontend/               # React 19 + Vite 8 + Tailwind CSS 4 (.jsx)
```

## Quick start (local)

Backend:

```bash
cd backend
npm install
copy .env.example .env          # then fill DATABASE_URL, JWT_SECRET, ...
npm run db:push                 # or rely on server boot ensureSchema()
npm run db:seed                 # roles (SUPER_ADMIN/MANAGER/EMPLOYEE), admin, categories, ₹120/g rate
npm run dev                     # nodemon → http://localhost:5000
```

Frontend:

```bash
cd frontend
npm install
# dev already points at the Vite proxy (frontend/.env.development has VITE_API_URL= blank);
# leave it unless you want the browser to hit a remote API directly.
npm run dev                     # http://localhost:5173, /api proxied to :5000
```

Health check: `GET {api}/api/health` → `{ service: "OPAL LINE ERP API", version: "1.0.0", ... }`.

Default seeded admin login: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
(see `backend/.env.example`; overrides in `prisma/seed.js`).

## Key scripts

| Where | Script | Runs |
| --- | --- | --- |
| root | `npm run build` | `npm run build --workspace frontend` (Vite build) |
| root | `npm test` | backend unit tests (`node --test tests/unit/*.test.js`) |
| backend | `npm run dev` | `nodemon src/server.js` |
| backend | `npm start` | `npx prisma generate && node src/server.js` |
| backend | `npm test` | unit tests (see `TESTING.md`) |
| backend | `npm run test:integration` | `workflow.test.js` (needs a Postgres; see `TESTING.md`) |
| backend | `npm run db:push` / `db:seed` / `db:demo` | schema push / idempotent seeder / demo product seeds |
| frontend | `npm run dev` / `build` / `preview` | Vite |

End-to-end tests live in the repo root `e2e/` and run with Playwright
(`npx playwright test`) — see `TESTING.md`.

## Documentation index

- Business behaviour → `PRD.md`
- System design & deployment → `ARCHITECTURE.md`
- Security controls → `SECURITY.md`
- Visual system → `DESIGN_SYSTEM.md`
- Conventions → `CODE_STYLE.md`
- Testing → `TESTING.md`
- Agent work instructions → `AGENTS.md`