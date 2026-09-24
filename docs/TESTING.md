# Opal Line — Testing

Three layers. All are runnable locally; none currently run in CI.

## 1. Backend unit tests (`node:test`)

Command: `npm test` inside `backend/` (also the root `npm test`).

Runs `node --test tests/unit/*.test.js`. Uses the built‑in `node:test` +
`node:assert` (no Jest/Mocha). Quick, no DB required. Current files:

| File | Covers |
| --- | --- |
| `pricing.test.js` | the pricing formula (silver 125 + making 180 + 5 g → base 1525, GST 45.75, price 1570.75) and `previewRecalculation`/`recalculateAllProducts` |
| `stockStatus.test.js` | the three‑tier stock status helper (in stock / low / out) |
| `shopifyMerge.test.js` | image‑URL merge + SKU matching helpers |
| `sanitizeSearch.test.js` | `escapeLike` / search sanitization |
| `purchaseValidators.test.js` | zod schemas for Purchase Orders (required fields, numeric coercions, reject negatives, status transitions) |
| `csvExport.test.js` | export row builders / CSV escaping |

## 2. Backend integration test (`supertest`)

Command: `npm run test:integration` in `backend/`.

Runs `tests/integration/workflow.test.js` against the **real app** (`src/app`),
so it needs a **running PostgreSQL** (`DATABASE_URL`) and a **seeded** DB.

> Usage admonition from the file's header: prefer a **separate test DB**
> (e.g. `opal_line_test`), never the live/production database. The test cleans
> up after itself and restores the rate, but it writes real rows while running.

The scenario it asserts (the money scene in `PRD.md`):
1. silver rate ₹120/g, product Ring (5 g, making 180, stock 10);
2. admin publishes ₹125/g → rate saved, prices recalculated, `ProductPriceHistory` recorded;
3. Shopify sends `orders/create` for qty 2 → stock 10→8, order saved;
4. the same webhook is replayed → **stock stays 8** (idempotency proven).

Also asserts the uniform login error message. The webhook HMAC is signed with the
fixed secret `opal-line-test-secret`, set **before** the app module loads.

## 3. End‑to‑end (Playwright)

Playwright lives in the repo root (`playwright.config.js`, `e2e/`), not in the
backend or frontend packages. Run with `npx playwright test` from the repo root.

- Projects:
  - `local-auth-setup` / `local-chromium` — against the local stack with a
    saved auth state in `e2e/.auth/`;
  - `prod-auth-setup` / `production-chromium` — against
    `PROD_BASE_URL=https://zayra-jewellry-billing-software.vercel.app`
    (the live Vercel app + its Railway backend).
- Setup specs (`setup.local`/`setup.prod`) create deterministic test fixtures
  (e.g. an `E2E Test Supplier` / customer) so the flow specs have stable data.
- Spec files: `login`, `navigation`, `flows`, `edit-flows`, `purchase-orders`
  (billing a sale, editing an invoice, purchase order lifecycle, navigation
  gating by role).
- `e2e/helpers/auth.js` centralizes login/demo access.

## The verify gate before you ship a change

1. `npm test` (backend unit) — must pass.
2. If the change touches DB/service logic: `npm run test:integration` locally
   against a scratch DB.
3. `npm run build` (frontend Vite build) — must succeed with no new errors;
   run `npx playwright test login flows …` (local project) for UI changes.
4. Verify on the live stack: after a Railway/PR deploy, hit `GET /api/health`
   and exercise the changed flow with the built frontend (`docs/AGENTS.md`
   demands showing real output, not “trust me”).

## Known coverage gaps (be honest about these)

- No unit tests for most services (auth, invoice, order, inventory, shopify
  service, backup/restore, analytics, ledger, payments) — protected indirectly
  by the integration test and manual e2e only.
- **No frontend unit/component tests at all** (no Vitest/Jest/RTL). UI
  regressions are caught by e2e + human review.
- No tests for the `ensureSchema()` boot DDL/backfills (they run on server
  start; a regression would show as a broken deploy — watch the boot logs).
- Webhook topics registration (`webhookRegister.service.js`) isn't covered by
  integration tests.
- No CI pipeline; the gate above is manual.

## How to extend

- New unit test → `backend/tests/unit/<name>.test.js` (import the service/util
  directly, no DB).
- New integration scenario → extend `workflow.test.js` (register it in the
  `test()` chain, keep the self‑cleanup and unique `TEST${Date.now()}` SKUs).
- New e2e spec → `e2e/<name>.spec.js` wired into both local & prod projects.