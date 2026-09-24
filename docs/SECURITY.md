# Opal Line — Security

## Authentication

- **JWT (Bearer)** issued by `utils/jwt`, enforced by `middleware/auth.js`:
  `authenticate` → `authorize(...roles)` → `authorizePermission('perm')`.
  `authorizePermission` special‑cases `SUPER_ADMIN` (passes all).
- `authenticate` **reloads the user from the DB on every request** (rejects
  disabled users immediately; role/permission changes take effect even without a
  new login). Expired/invalid tokens ⇒ 401.
- Login (`auth.service.js`) is deliberately information‑opaque:
  - identical error **"Invalid email or password"** for unknown email vs wrong
    password (no user enumeration at the endpoint),
  - the same response is returned for a disabled/missing account,
  - password hashes are **bcrypt**.
  The uniform‑message behaviour is asserted by integration tests.
- Password change requires the current password (`authService.changePassword`).
- **Reset‑code flow** (`forgotPassword` → `verifyResetCode` → `resetPassword`):
  6‑digit numeric code, hashed (bcrypt) at rest, expires (`passwordResetExpires`),
  same generic success response whether or not the email exists, sent via
  SMTP (`email.service.js`); when no SMTP host is configured the code is logged
  to the console so it is never lost in dev. Length/min‑strength are enforced by
  validators.

## Authorization (RBAC)

- Roles are seeded in `prisma/seed.js`:
  `SUPER_ADMIN ['*']`, `MANAGER`, `EMPLOYEE` (counter: billing, customers, orders).
- Each role has a `permissions: Json` array. Users can have a per‑user
  `customPermissions` array: in the frontend (`AuthContext.hasPermission`, which
  drives the nav and page gates), a non‑empty `customPermissions` list replaces
  the role's list for that login (`'*'` still passes everything). Note the stale
  asymmetry: the **backend** `authorizePermission` looks at the *role's*
  permissions only (SUPER_ADMIN always passes) — per‑user overrides currently
  work UI‑side, not API‑side. Treat APIs as role‑enforced.
- Audit logs are effectively ADMIN‑only: the endpoint and service refuse to
  expose the trail to `MANAGER`/`EMPLOYEE`.

## Transport & headers

- `helmet()` sets sane security headers on every response.
- **CORS** is allow‑listed (`CORS_ORIGIN`/`CLIENT_URL`); requests without an
  Origin are allowed (Shopify webhooks / API consumers), dev origin is relaxed.
- `trust proxy 1` — Express trusts the Railway proxy, which makes
  `express-rate-limit` behave correctly (it would otherwise count every visitor
  as one IP and let brute force through).

## Rate limiting

- Global `/api` limiter: 300 req / 15 min per IP.
- Stricter `authLimiter`: **10 req / 15 min** on `/api/auth/*` (login,
  forgot‑password, reset, etc.) — the brute‑force backstop.
- Shopify outbound REST is throttled in the client (~600 ms).

## Secrets & failure modes

- `config/env.js` **fails fast** on missing `DATABASE_URL` / `JWT_SECRET` — the
  server refuses to boot with no encryption secret or DB.
- `.env.example` documents every variable; **real secrets never live in the
  repo** (`.env*` are git‑ignored; only `backend/.env.example` is tracked — the
  frontend has no committed `.env.example`, dev uses `frontend/.env.development`).
- Shopify placeholder tokens matching `PASTE*` are rejected by the client
  (`integrations/shopify/client.js`) to stop fake creds reaching production.

## Error handling (no info leak)

`errorHandler` (`middleware/errorHandler.js`) decides what a client sees:

- `ApiError` → its public `message` (operational errors only: validation,
  404s, "no stock", permissions…).
- `ShopifyApiError` → maps to realistic status (unreachable Shopify ⇒ 502).
- **anything unexpected** → generic **"Internal server error"** — no stack,
  file paths, or SQL leaked to the client (details only in server logs).
Zod validation failures return the field errors explicitly (that's intentional).

## Shopify webhook security

- Payloads are HMAC‑SHA256 signed with the store secret; `middleware/shopifyWebhook.js`
  verifies on the **raw body** (the router is mounted **before** `express.json`,
  which would otherwise destroy the digest) using `crypto.timingSafeEqual`.
- Processing is idempotent via the unique `WebhookEvent.eventId`, so replays
  (Shopify retries, or an attacker replaying a captured body) cannot double‑deduct
  stock or duplicate orders.
- Webhook topics are subscribed at boot and only the topics on the allow list
  (`webhookRegister.service.js` `REQUIRED_TOPICS`) are registered.

## Audit trail

- `auditLog.service.js` writes an audit row (who, action, entity, details, IP)
  for sensitive operations (login, rate changes, order/invoice lifecycle,
  payments, purchases, user management, Shopify syncs). Read via the ADMIN-only
  `GET /api/audit-logs` with action/entity/search/limit/cursor filters.

## Data integrity

- Money math is `Prisma.Decimal`; reconciliation invariants (header = Σ lines,
  etc.) are described in `PRD.md` §Reconciliation rules.
- `ensureSchema()` (boot‑time) is **additive only** (`IF NOT EXISTS`, guarded
  `DO $$ ... EXCEPTION`); it never drops columns/tables.
- Backup/restore (`backup.service.js`) produces a full JSON snapshot; restoring
  is an upsert inside a transaction.

## Known gaps / notes for operators

- JWTs are stateless — there is no server‑side revocation until expiry (a
  disabled user is rejected by the per‑request DB reload, which covers the
  practical case).
- `localStorage` holds the token (XSS could exfiltrate it) — this is a standard
  SPA trade‑off, mitigated by CSP headers from `helmet` and by not rendering
  unsanitized HTML.
- The legacy `demo-token-opal-line` guard in `api/client.js` bypasses the 401
  redirect — keep it only if demo/demo‑standalone UX is still required.