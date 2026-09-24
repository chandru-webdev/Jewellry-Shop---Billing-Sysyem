# AGENTS.md — How to work in this repo

Instructions for human ✍️ *and* AI agents (opencode etc.) doing work here. Read
`ARCHITECTURE.md`, `PRD.md` and this file before touching code — the business
rules are the shop's accounting invariants and must not be "improved on".

## Golden rules

1. **Show real output, never "trust me".** Finish a task only after you can point
   at concrete evidence: unit/integration test output, a green build, the robots'
   `/api/health`, fresh DB rows you queried, or a screenshot of the UI. If you
   can't run it, say so — don't claim it's done.
2. **Work in small, phased batches.** Ship a focused batch, verify it live, then
   move on. Do not bundle 12 unrelated fixes into one giant change without being
   asked.
3. **Replicate before fixing.** For a bug: reproduce it in the current UI/API
   first, capture the exact input that misbehaves, then fix. "I'll make the code
   print X" without reproducing is not acceptable.
4. **Confirm before you commit or deploy.** Committing and pushing (and anything
   that redeploys Railway/Vercel) always gets an explicit yes. Staged/destructive
   changes require confirmation. Never `accept-deploy` unprompted.
5. **Never commit secrets.** `.env*` are ignored; don't add keys/tokens to code or
   docs. Watch every diff for pasted credentials (e.g. a stray `SHOPIFY_ACCESS_TOKEN`).
6. **Don't commit throwaway/demo artifacts.** The repo has a history of stray
   scripts polluting root/backend (`test-*.js`, `check-sync.js`, `e2e-check.js`,
   `uploads/`). Keep those out of the tree or out of the commit.

## Architecture cheat sheet (full detail in ARCHITECTURE.md)

- Backend: **Express 5 + Prisma 7 + PG, plain CommonJS JS** (no NestJS, no TS).
  Frontend: **React 19 + Vite 8 + Tailwind 4, JSX** (no TS).
- Frontend API base = `(VITE_API_URL || '') + '/api'`; dev proxies `/api → :5000`;
  token in `localStorage.opal_token`; 401 clears it + routes to `/login`.
- Role model: `SUPER_ADMIN ['*']` / `MANAGER` / `EMPLOYEE`;
  `authorizePermission` in `middleware/auth.js`.
- Money = `Prisma.Decimal` everywhere; floats only at JSON edges.
- `ensureSchema()` in `server.js` heals schema drift at boot (additive only) —
  deploy‑readiness depends on it.
- Live: backend `https://jewellry-shop-billing-sysyem-production.up.railway.app`
  (`/api/health`), frontend `https://zayra-jewellry-billing-software.vercel.app`.

## Commands

```bash
npm test                          # backend unit tests (node --test tests/unit/*.test.js)
npm run test:integration          # backend workflow test — needs a SEPARATE Postgres, seeded
npm run build --workspace frontend # Vite build gate
npx playwright test               # e2e (repo root)
```

## Where your attention must go first

The shop's accounting rules (from `PRD.md` §Reconciliation) are protected tests
of correctness. When editing invoice/order/pricing code, keep:

1. **Header = Σ line totals** (never trust Shopify's `total_price` wholesale;
   recompute from ERP‑matched lines).
2. **Decimal math** — don't introduce float sums, `parseFloat` chains, or
   `toFixed` before a sum.
3. **Idempotent webhooks** — keep the `WebhookEvent.eventId` guard intact.
4. **Price preservation on edit** — edits keep original per‑line selling prices.
5. **Pricing formula exists only in `pricing.service.js`.** Don't copy it into a
   page.

## Known trouble spots (they WILL bite)

- **Test/demo data leaks into production lists.** Shopify test‑store orders,
  products and customers flow in via webhooks/pulls; seeded e2e suppliers (e.g.
  “E2E Test Supplier”) land on real screens. When you see rows whose SKU/customer/
  source screams "test" (e.g. `SHOPIFY-#` prefixed or test seeded), filter them
  out of the fix, don't "fix the total" while leaving the phantom row counted.
- **Currency/locale of the Shopify test store** — price push is plain numbers
  (no conversion); a store not set to INR/en‑IN will make price comparisons and
  edge totals look wrong. Verify store currency before trusting sync reports.
- **`ensureSchema()` drift** — production schema is ahead of the migrations
  folder. Missing‑column errors after a deploy = your new column isn't in
  `ensureSchema()` yet. Never make it destructive; always `IF NOT EXISTS`.
- **No `SalesReturn` model.** Returns are orders w/ `CANCELLED`/`REFUNDED`
  (terminal). Don't invent a status transition that reopens them.
- **Orders have no edit endpoint** (invoice is the edit surface). Don't add ad
  hoc PATCH‑order routes without proposing it first.
- **live rate requests (metal‑rate "publish" flow)** touch MetalRate,
  MetalRateHistory, ProductPriceHistory + every product's selling price — always
  preview→confirm, and test the replay.
- **The legacy demo path** (`demo-token-opal-line` in `api/client.js`, `mock/`
  fallbacks) is tolerated, not loved — prefer deleting usage over wiring new
  features to it.

## Style (per CODE_STYLE.md)

CommonJS + zod-schemas on the backend; one resource = route/controller/service/
validator. Frontend: page components + ui kit + React Query (staleTime 30s);
reuse `components/sales/*` shared tables rather than forking; dark‑mode variants
mandatory; money/date via `utils/format.js`.

## Definition of done

- Change passes the TESTING.md gate (unit + build, integration where relevant,
  e2e for UI paths).
- A short summary naming the files touched and the evidence run (build output /
  test output / health / screenshots).
- Asked for (and got) the go‑ahead before committing/pushing/deploying.
- No stragglers: no tmp scripts, no secret-soup diffs, no unrelated "while I'm
  here" rewrites.