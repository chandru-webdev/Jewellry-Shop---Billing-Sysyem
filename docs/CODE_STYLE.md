# Opal Line — Code Style & Conventions

Language reality check: the backend is **CommonJS JavaScript** (`.js`,
`require`/`module.exports`), the frontend is **JavaScript/JSX** (`.jsx`,
ES modules). There is intentionally no TypeScript. Don't `import` CommonJS in
backend files, don't add TS to frontend without a project‑wide decision.

## Backend (Express 5)

### File & module shape

- One resource = `routes/` + `controllers/` + `services/` + `validators/` file
  each (e.g. `product.*`). Controllers stay thin; **business logic lives in
  services**.
- Services are plain objects of async methods (`list`, `create`, `update`,
  `remove`, …) or functions; return **plain data**, throw `ApiError` for
  operational problems.
- Controllers use `asyncHandler` + `success(res, status, data, message)`
  (`utils/ApiResponse`). No `try/catch` in controllers — errors go to
  `errorHandler`.
- Validators are **zod** schemas consumed by `middleware/validate`; parse once,
  use `req.validated` (or the schema's parsed result) downstream.
- Naming: camelCase functions/vars, PascalCase file names only for components
  (not backend), kebab/snake where the schema model says so. HTTP endpoints are
  REST nouns, plural (`/api/products`).

### Middleware conventions

- `middleware/auth.js` exports `authenticate`, `authorize(...roles)`,
  `authorizePermission(perm)`. Secure a route with the *least* of these that
  matches intent (prefer permission‑based where a feature is admin gated).
- Custom middleware signature: `(req, res, next)`; validation failures and
  permission errors are thrown/forwarded as `ApiError` typed errors, never
  `res.status().send()` inline (keeps the error contract uniform).

### Money (non‑negotiable)

- All amounts are `Prisma.Decimal` — compute with `new Decimal(...)`, `plus`,
  `minus`, `mul`, `div`, `toDecimalPlaces(2)`. Sum everything as Decimal, never
  float `reduce` on `Number`.
- Convert to `Number` **only** at the service→JSON boundary.
- GST round‑styling is done per‑line then on the header; keep `baseAmount`,
  `gstAmount`, `sellingPrice`, header `grandTotal` consistent with
  `pricing.service.js`'s formula (`PRD.md`).

### BigInt / IDs / dates

- Shopify IDs are BigInt — never `JSON.stringify` them directly without the
  global replacer (already installed in `app.js`); round‑trip via strings.
- Dates: store `DateTime` in Prisma; serialize with ISO; format for humans only
  in the frontend (`utils/format.js`).

### `ensureSchema()` interplay (when schema changes land)

Whenever you add a **column, table or index**:
1. add it to `prisma/schema.prisma`,
2. generate a migration (`npx prisma migrate dev` in a scratch DB),
3. ALSO mirror it as an **idempotent, additive** `ensureSchema()` step in
   `server.js` (same pattern: `IF NOT EXISTS` / `DO $$ … EXCEPTION WHEN
   duplicate_*`), because the production DB is already ahead of the migration
   history and deploys rely on the boot step to heal drift.

### Validation & hygiene

- Zod schemas strictly type request bodies; reject unknown/extra numeric fields
  with defaults where sensible; treat `null`/`undefined` deliberately.
- No secrets in code or logs; never `console.log` tokens/passwords (reset codes
  are only logged by `email.service.js`'s SMTP‑fallback path, and that's a
  documented dev aid).
- Utilities live in `utils/` (ApiError, ApiResponse, asyncHandler, jwt,
  sanitizeSearch/escapeLike, paginate, csv/export helpers) — reuse before
  re‑implementing.

## Frontend (React + Vite)

### Structure

- **One `api` module per resource** (`src/api/products.js`, `sales.js`, …) that
  wraps `apiClient` and returns typed‑shape promises (usually `.data.data` from
  the standard `{ success, data, message }` envelope). Pages never call
  `fetch`/`axios` directly.
- **Pages are one component per route** under `src/pages/`, composed from
  `components/`. Page components co‑locate page‑specific subcomponents; reusable
  pieces go in `components/ui/` (pure UI) or `components/{module}/` (feature).
- **Server state is React Query** — `useQuery`/`useMutation` with
  `queryClient.invalidateQueries` after mutations. Global defaults
  (`main.jsx`): `staleTime 30s`, `refetchOnWindowFocus false`, `retry 1`.
  Don't hand‑roll loading state; use the query's `isLoading`/`isPending`, `error`.
- Mutations: optimistic updates or refetch after success (prefer invalidate);
  disable buttons during pending; surface errors from the API `message`.
- **Auth/theme are contexts** (`AuthContext`, `ThemeContext`); consume via
  `useAuth()`/`useTheme()` hooks. Route protection: `<ProtectedRoute permission=…>`.

### Naming

- Files: `PascalCase.jsx` for components & pages; `camelCase.js` for util/hooks/
  api modules; `statusMaps.js` style for data maps.
- Components: named default exports; one component per file.
- Hooks: `use*`.

### Styling & layout

- Tailwind utilities via `utils/cn`; never inline `style={{}}` for layout.
- Use the UI kit (`DESIGN_SYSTEM.md`): `Button`, `Card`, `Modal`, `Badge`,
  `PageHeader`, `FormControls`, `StatCard`, `ExportControls`. Tables follow the
  shared sales-table components or the documented table pattern — **reuse the
  sales components rather than forking them** (they are the canonical design).
- Every element gets `dark:` variants.
- Statuses/payment labels: `components/sales/statusMaps.js` only.

### Data & display

- Money/weight/date rendering via `utils/format.js` utils — never ad‑hoc
  `toLocaleString`, never raw `{amount}` for money.
- Line‑total/header invariants: when a page edits or displays invoice/order
  totals, compute from line `finalAmount`s (see `PRD.md` reconciliation rules);
  the backend is the source of truth for what's persisted.

## General

- Follow existing code's tone: brief, imperative comments only where the *why*
  matters (the pricing formula and reconciliation invariants are always
  commented, because they are the shop's accounting rules).
- Keep diffs small and focused; run `npm run lint`/`build` before finishing
  (see `TESTING.md` for the full gate).