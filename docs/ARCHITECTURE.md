# Opal Line — Architecture

## System overview

```
                ┌────────────────────────── Shopify  (theme storefront)
                │        ▲ REST (Admin API 2025-01)        │ webhooks
                │        │                                  ▼
 Vercel         │        │                  Railway ─── Postgres (persistent)
 ┌──────────────┴──┐     │                  ┌──────────────────────────────┐
 │ React SPA (.jsx)│     │                  │ Express 5 app (CommonJS)     │
 │ axios client    │─────┼──────────────────▶ service layer → Prisma ──────┼──▶ Postgres
 │ VITE_API_URL+api│ GET/POST /api/*        │ routes→controllers→services │
 └──────────────▲──┘                        │ ensureSchema() on boot       │
                │ dev-only                  └──────────────────────────────┘
   Vite dev server │ proxy /api → localhost:5000
```

- The **frontend never talks to Shopify**; it only talks to the Railway API.
  Shopify integration is entirely backend‑side (outbound REST + inbound webhooks).
- In **dev** the SPA lives on Vite (`:5173`) and `/api` is proxied to the local
  backend (`:5000`) via `frontend/vite.config.js`.
- In **prod** the SPA is served by Vercel and calls the Railway API because
  `frontend/.env` sets `VITE_API_URL=https://jewellry-shop-billing-sysyem-production.up.railway.app`.
  The axios base is `(import.meta.env.VITE_API_URL || '') + '/api'`.

## Monorepo (npm workspaces)

Root `package.json` declares `"workspaces": ["backend", "frontend"]` with shared
`build` and `test` scripts. There is a legacy top‑level `README.md` with the
original folder tree; this `docs/` set is the maintained reference.

## Backend (`backend/`)

```
backend/
├── prisma/
│   ├── schema.prisma   # full data model (see §Data model)
│   ├── seed.js         # roles, admin, categories, default ₹120/g rate
│   └── migrations/     # Prisma migrations (history is incomplete on hosted DBs)
├── tests/              # unit + integration (see TESTING.md)
└── src/
    ├── server.js       # boots: ensureSchema() → backfill → webhooks → listen
    ├── app.js          # middleware assembly (helmet, cors, webhooks, json, limits)
    ├── config/env.js   # THE env reader + fail-fast validation
    ├── prisma/client.js# single PrismaClient instance (adapter-pg)
    ├── routes/         # Express routers, one per resource
    ├── controllers/    # thin handlers (req/res + asyncHandler)
    ├── services/       # all business logic lives here
    ├── validators/     # zod schemas per resource
    ├── middleware/     # auth, validate, errorHandler, shopifyWebhook, upload
    ├── integrations/shopify/  # REST client + webhook payload mapping
    └── utils/          # ApiError, ApiResponse, asyncHandler, jwt, sanitizeSearch, stockStatus, ...
```

**Request path**: `app.js` mounts `routes/index.js`; each router → zod
`validate` middleware → controller → service → Prisma. Services return plain
data; controllers wrap it with `success(res, status, data, message)` (or the
error middleware figures it out). Errors bubble to `errorHandler`.

### Middleware order in `app.js` (in order)

1. `helmet()` — security headers
2. `cors` — allowed origins from `CORS_ORIGIN` (`CLIENT_URL`), wildcard for
   origin‑less requests, relaxed in dev
3. **Shopify webhook router mounted BEFORE the JSON body parser** — the HMAC
   middleware needs the **raw body** (`express.raw`) to verify signatures
4. `express.json({ limit: '1mb' })`
5. `express.static('uploads')` + BigInt‑safe JSON `replacer`
6. `morgan` combined/dev logging, `express.RateLimit` (`/api`, default 300/15 min)
7. per‑route routers; login/etc. additionally behind `authLimiter` (10/15 min)
8. 404 handler → central `errorHandler`

### Boot sequence (`server.js`)

1. load `config/env.js` (throws if `DATABASE_URL` or `JWT_SECRET` missing),
2. **`ensureSchema()`** — additive, idempotent raw‑SQL DDL + backfills, so a
   fresh Railway deploy always comes up even when the checked‑in Prisma
   migration history is behind the hosted DB:
   - `CREATE TABLE IF NOT EXISTS "ProductPriceHistory"` + its FK + indexes,
   - `ADD COLUMN IF NOT EXISTS` backfills (e.g. `purity`, `lowStockThreshold`,
     `pendingAmount`, order‑item weights, `silverRateUsed`, purchasing dates),
   - guarded `DO $$ ... EXCEPTION WHEN duplicate_*` blocks so it is safe to
     re‑run. **It must remain additive — never `DROP`/destructive.**
3. `backfillMissingPayments()` — idempotent payment recovery,
4. `registerWebhooks()` — subscribes Shopify webhook topics (see PRD), retried on
   failure without crashing the boot,
5. `app.listen(PORT)`.

### Configuration (`config/env.js`)

All environment reads go through this one module; it fails fast on the two
critical secrets. Documented in `backend/.env.example`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `JWT_SECRET` | **required** — missing ⇒ process exits at boot |
| `JWT_EXPIRES_IN`, `NODE_ENV`, `PORT` | tokens / environment / port (5000) |
| `CORS_ORIGIN` / `CLIENT_URL` | allowed browser origins |
| `PUBLIC_API_URL` | absolute base used when registering Shopify webhooks |
| `API_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | rate‑limit overrides |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seeder defaults |
| `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_WEBHOOK_SECRET` | Shopify REST + webhook HMAC |
| `SMTP_HOST/PORT/USER/PASS/FROM` | password‑reset mail (falls back to console log) |

### Frontend (`frontend/`)

```
frontend/
├── vite.config.js      # react + tailwindcss plugins, /api proxy, build output
├── index.html          # mounts src/main.jsx, loads Inter, favicon
├── .env                # VITE_API_URL (Railway prod URL; git-ignored — dev uses .env.development)
└── src/
    ├── main.jsx        # StrictMode, QueryClient (staleTime 30s, refetchOnWindowFocus false, retry 1), AuthProvider, ThemeProvider
    ├── App.jsx         # Router + Layout + all routes (gated by ProtectedRoute)
    ├── api/client.js   # axios instance, Bearer token, demo-token guard, 401 → login
    ├── api/*.js        # one module per resource → apiClient methods
    ├── components/ui/  # Button, Card, Modal, Badge, PageHeader, FormControls, StatCard, ExportControls, ThemeToggle, ProtectedRoute
    ├── components/layout/  # Sidebar, Topbar, Layout
    ├── components/sales/   # shared sales table/modal components (see CODE_STYLE)
    ├── components/{inventory,products,purchase,...}/  # module-local components
    ├── config/nav.js   # nav groups + permission strings driving Sidebar
    ├── context/        # AuthContext (user + hasPermission), ThemeContext
    ├── hooks/          # shared hooks (e.g. useDebouncedSearch)
    ├── mock/           # LEGACY demo data fallback (a few pages import it)
    ├── pages/          # one component per route
    └── utils/          # cn (classnames), format (INR/weight/date)
```

**Auth wiring**: `api/client.js` reads `localStorage.opal_token`, sets
`Authorization: Bearer`. A legacy guard: the literal token
`demo-token-opal-line` skips the 401 redirect (demo mode). On any 401 the client
clears storage and routes to `/login`. `ProtectedRoute` redirects anonymous
users to `/login` and (given `permission`) permission‑less users to `/`.

## Money handling (cross‑cutting rule)

- Store/accumulate amounts as **`Prisma.Decimal`**; parse and scale with `Decimal`
  (`utils/pricing.service.js`, `invoice.service.js`, `order.service.js`, …).
- **Never accumulate floats** (summing JS numbers caused several paise‑drift
  bugs). Convert to `Number` only when serializing at the service boundary.
- `app.js` installs a global BigInt `replacer` so BigInt (e.g. Shopify IDs)
  serializes to strings in JSON without crashing.
- Currency formatting is frontend‑only (`utils/format.js`, `en-IN` locale).

## Shopify integration (detail)

- **REST client** — `integrations/shopify/client.js`: Admin REST API
  `2025-01`, `X-Shopify-Access-Token`, throttled requests (~600 ms), raises
  `ShopifyApiError` (wraps real HTTP status; connection errors ⇒ 502 at the API).
- **Credential guard** — placeholder tokens matching `PASTE*` are refused
  (`PASTE_SHOPIFY_TOKEN_HERE`) so nobody deploys with fake creds.
- **Webhooks** — `middleware/shopifyWebhook.js` verifies HMAC‑SHA256 on the raw
  body (`timingSafeEqual`). `webhookRegister.service.js` maintains the topic
  subscriptions at boot. `webhook.service.js` handles payloads (see PRD for the
  orders/create pipeline and the idempotency rule).
- **Sync service** — `shopify.service.js` implements the manual pulls (products
  → pending imports, orders, customers) and pushes (create/update product,
  metafields, video, prices, inventory levels) plus comparison/sync‑log helpers.
- **Inventory push** — `inventory.service.js::syncToShopify` updates Shopify
  levels after ERP stock changes; failures land in a retryable queue surfaced on
  the Shopify page.

## Deployment

- **Backend** — two Railway services (the Express API + its Postgres). The app
  runs `prisma generate` then `node src/server.js`. Config is via the variables
  above; the API listens on `$PORT`. `trust proxy 1` is set so Express trusts
  Railway's proxy for rate limiting and secure cookies.
  Live: `https://jewellry-shop-billing-sysyem-production.up.railway.app`
  (`GET /api/health` → `{ service: "OPAL LINE ERP API", version: "1.0.0" }`).
- **Frontend** — Vercel static hosting of `npm run build` output, auto‑deployed
  from the repo (on push to the connected branch). `VITE_API_URL` is baked in at
  build time — a backend URL change requires a rebuild.
  Live: `https://zayra-jewellry-billing-software.vercel.app`.

## Known architecture debt

- `ensureSchema()` exists because the hosted production DB drifted from the
  migration history; new columns/tables should still be added to `schema.prisma` +
  a migration, **and** as an idempotent `ensureSchema()` step so greenfield and
  drifted deploys behave identically.
- The legacy `demo-token-opal-line` branch in `api/client.js` and the `mock/`
  folder are pre‑existing compatibility shims.
- The very first release ran `db:demo` recipes that predate `ensureSchema()` —
  do not rely on migration‑only deploys for the production database.