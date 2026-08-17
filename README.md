# OPAL LINE ERP — Billing System

A full-stack ERP for a silver jewellery business: dynamic silver-rate pricing, inventory with a stock ledger, POS billing, invoices, orders, customers, payments/dues, suppliers, staff & roles, and a live dashboard.

- **Frontend** — React 19 + Vite + Tailwind CSS 4 + React Query + React Router (in `frontend/`)
- **Backend** — Node.js + Express 5 + Prisma ORM (in `backend/`)
- **Database** — PostgreSQL

---

## 1. Architecture

```
Browser (React SPA, :5173)
   │  /api requests proxied to backend
   ▼
Express API (:5000)
   │  JWT auth → controllers → services → Prisma
   ▼
PostgreSQL (via DATABASE_URL)
```

- Vite's dev server proxies every `/api/*` request to `http://localhost:5000` (`frontend/vite.config.js`), so no CORS pain in development.
- The backend validates every request body with **zod**, authenticates with a **JWT**, and enforces role-based access (`ADMIN` / `MANAGER` / `STAFF`).
- All money/weight math uses exact **Decimal** arithmetic (no floating-point rounding).

### Folder structure

```
billing system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # every table + enums
│   │   ├── migrations/        # SQL migrations
│   │   ├── seed.js            # roles, admin user, silver rate, categories
│   │   └── demo-products.js   # optional demo product data
│   ├── src/
│   │   ├── app.js             # express app (helmet, cors, rate-limit, routes)
│   │   ├── server.js          # entry point
│   │   ├── config/env.js      # env vars (only file that reads process.env)
│   │   ├── routes/            # one router per module
│   │   ├── controllers/       # thin HTTP layer
│   │   ├── services/          # all business logic
│   │   ├── validators/        # zod schemas
│   │   ├── middleware/        # auth (JWT + roles), validate, errorHandler
│   │   ├── prisma/client.js   # single Prisma instance
│   │   └── utils/             # ApiError, ApiResponse, asyncHandler, jwt
│   └── .env                   # secrets (never commit)
└── frontend/
    ├── src/
    │   ├── api/               # one module per API group (axios client)
    │   ├── pages/             # one page per route
    │   ├── components/        # ui/ (Button, Card, Modal, Badge…), layout/, inventory/, products/
    │   ├── context/AuthContext.jsx
    │   └── config/nav.js      # sidebar navigation
    └── vite.config.js
```

---

## 2. Prerequisites

- **Node.js 20+** (Node 24 used during development)
- **PostgreSQL** running locally (or Docker) — this project uses standard PostgreSQL, no managed provider required
- npm (comes with Node)

---

## 3. Database setup

1. Create a database, e.g. `opal_line`. With a local PostgreSQL install:

   ```bash
   psql -U postgres -c "CREATE DATABASE opal_line;"
   ```

   (If you used a different superuser or password, adjust the `-U` flag and the `DATABASE_URL` below.)

2. In `backend/`, copy the example config and fill in your values:

   ```bash
   cd backend
   copy .env.example .env      # Windows
   # or:  cp .env.example .env # macOS/Linux
   ```

   Edit `DATABASE_URL` to match your local Postgres credentials:

   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/opal_line"
   ```

3. Create the tables and seed initial data:

   ```bash
   npm install
   npx prisma migrate dev      # apply migrations
   npm run db:seed             # roles, admin user, silver rate, categories
   ```

   > Alternative: `npm run db:push` pushes the schema without a migration.

4. (Optional) Load demo products so the UI has data to show:

   ```bash
   npm run db:demo
   ```

### Browse the database in the browser

Prisma Studio is already running at **http://localhost:5555** (started from the `backend` folder).

To start it yourself later:

```bash
cd backend
npx prisma studio --port 5555
```

You'll see every table — Users, Roles, Products, Inventory, InventoryTransaction, Customers, Suppliers, Orders, Invoices, Payments, MetalRate, MetalRateHistory, AuditLog, Settings, ShopifySyncLog, WebhookEvent, Notifications.

---

## 4. Backend — run it

```bash
cd backend
npm install
npm run dev            # nodemon, restarts on save → http://localhost:5000
```

Other scripts (`backend/package.json`):

| Script | What it does |
|--------|--------------|
| `npm run dev` | Run with auto-restart (nodemon) |
| `npm start` | Run without restart |
| `npm run db:seed` | Seed roles / admin / silver rate / categories |
| `npm run db:demo` | Load demo products |
| `npm run studio` | Open Prisma Studio (DB browser) |

---

## 5. Frontend — run it

```bash
cd frontend
npm install
npm run dev            # → http://localhost:5173
```

Other scripts (`frontend/package.json`):

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Oxlint |
| `npm run preview` | Preview the production build |

### Default login

After seeding, log in at **http://localhost:5173/login**:

```
Email:    admin@opalline.com
Password: Admin@123
```

(Override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`.)

---

## 6. API reference

All endpoints live under `/api`. Every route except `/health` and `/auth/login` requires a `Bearer` token in the `Authorization` header.

| Method | Endpoint | Who | Description |
|--------|----------|-----|-------------|
| **Auth** | | | |
| POST | `/api/auth/login` | public | Log in, returns `{ token, user }` |
| POST | `/api/auth/logout` | any | Log out |
| GET | `/api/auth/me` | any | Current user + role |
| **Dashboard** | | | |
| GET | `/api/dashboard` | any | Revenue, sales, pending orders, silver rate, low stock, recent invoices/orders |
| **Products** | | | |
| GET | `/api/products` | any | List (search, category, active filters) |
| GET | `/api/products/:id` | any | One product |
| POST | `/api/products` | ADMIN/MANAGER | Create |
| PUT | `/api/products/:id` | ADMIN/MANAGER | Update |
| DELETE | `/api/products/:id` | ADMIN/MANAGER | Delete |
| **Categories** | | | |
| GET | `/api/categories` | any | List |
| POST | `/api/categories` | ADMIN/MANAGER | Create |
| **Inventory** | | | |
| GET | `/api/inventory` | any | Stock levels |
| GET | `/api/inventory/transactions` | any | Stock ledger (SALE/RETURN/STOCK_IN/STOCK_OUT) |
| POST | `/api/inventory/stock-in` | ADMIN/MANAGER | Receive stock |
| POST | `/api/inventory/stock-out` | ADMIN/MANAGER | Issue stock |
| **Metal Rates** | | | |
| GET | `/api/metal-rates` | any | Current silver rate |
| GET | `/api/metal-rates/history` | any | Rate-change history |
| POST | `/api/metal-rates/preview` | ADMIN | Dry-run price recalc |
| PUT | `/api/metal-rates/silver` | ADMIN | Publish new rate + recalc all prices |
| **Invoices** | | | |
| GET | `/api/invoices` | any | List |
| GET | `/api/invoices/:id` | any | One invoice + items + payments |
| POST | `/api/invoices` | ADMIN/MANAGER/STAFF | Create (reduces stock, optional payment) |
| **Orders** | | | |
| GET | `/api/orders` | any | List |
| GET | `/api/orders/:id` | any | One order |
| POST | `/api/orders` | ADMIN/MANAGER/STAFF | POS sale (reduces stock, links invoice+payment) |
| PATCH | `/api/orders/:id/status` | ADMIN/MANAGER | Change status (restocks on cancel/refund) |
| **Customers** | | | |
| GET | `/api/customers` | any | List (search) |
| GET | `/api/customers/:id` | any | One customer + recent invoices |
| POST | `/api/customers` | ADMIN/MANAGER/STAFF | Create |
| PUT | `/api/customers/:id` | ADMIN/MANAGER/STAFF | Update |
| **Suppliers** | | | |
| GET | `/api/suppliers` | any | List (search) |
| GET | `/api/suppliers/:id` | any | One supplier |
| POST | `/api/suppliers` | ADMIN/MANAGER/STAFF | Create |
| PUT | `/api/suppliers/:id` | ADMIN/MANAGER/STAFF | Update |
| **Payments** | | | |
| GET | `/api/payments` | any | Payment history (search/filters) |
| GET | `/api/payments/dues` | any | Outstanding invoice balances |
| GET | `/api/payments/summary` | any | Collected today/month/all-time + outstanding total |
| GET | `/api/payments/:id` | any | One payment |
| POST | `/api/payments` | ADMIN/MANAGER/STAFF | Record payment (auto-settles invoice when fully paid) |
| **Users** | | | |
| GET | `/api/users` | ADMIN | List staff (search) |
| GET | `/api/users/:id` | ADMIN | One user |
| POST | `/api/users` | ADMIN | Create (hashes password) |
| PUT | `/api/users/:id` | ADMIN | Update (role/email/password/active) |
| **Roles** | | | |
| GET | `/api/roles` | any | List (with user counts) |
| POST | `/api/roles` | ADMIN | Create |
| PUT | `/api/roles/:id` | ADMIN | Update (system roles can't be renamed) |
| DELETE | `/api/roles/:id` | ADMIN | Delete (not system, no users) |
| **Health** | | | |
| GET | `/api/health` | public | Server status |

Every response uses the same shape:

```json
{ "success": true, "message": "…", "data": { } }
```

Errors use `{ "success": false, "message": "…", "details": … }` with the right HTTP status (400/401/403/404/500).

---

## 7. Modules built vs. planned

| Module | Status |
|--------|--------|
| Auth / Login, JWT, roles | ✅ Done |
| Products & Categories | ✅ Done |
| Inventory + stock ledger | ✅ Done |
| Metal rates (dynamic pricing, history) | ✅ Done |
| Customers | ✅ Done |
| Orders (POS) with status workflow | ✅ Done |
| Invoices + print | ✅ Done |
| Payments & dues | ✅ Done |
| Suppliers | ✅ Done |
| Users & Roles management | ✅ Done |
| Dashboard | ✅ Done |
| Shopify Sync (products/prices/stock/orders) | 🔲 Planned (Phases 15–19) |
| Reports | 🔲 Planned (Phase 20) |
| Audit Logs viewer & Settings | 🔲 Planned (Phase 21) |

---

## 8. How the pricing engine works

1. Each product stores a **weight (g)**, a **making charge (₹/g)** and a **GST %**.
2. The current silver rate lives in one row in `MetalRate` (seeded at ₹120/g).
3. `src/services/pricing.service.js` computes:

   ```
   baseAmount    = weight × silverRate
   makingCharge  = weight × makingChargePerGram
   gstAmount     = (baseAmount + makingCharge) × gstPercent / 100
   sellingPrice  = baseAmount + makingCharge + gstAmount
   ```

4. Updating the silver rate **recalculates every active product** and writes a `MetalRateHistory` row for the audit trail.

## 9. Key behaviours worth knowing

- **Stock ledger is append-only.** Every change writes an `InventoryTransaction` (SALE, RETURN, STOCK_IN, STOCK_OUT, ADJUSTMENT) inside the same DB transaction as the stock update.
- **Billing & POS sales reduce stock automatically** and fail with a clear message if stock is insufficient.
- **Cancelling/refunding an order restocks the items** automatically and voids the linked invoice.
- **Payments auto-settle.** Once PAID payments cover an invoice's grand total, the invoice flips to `PAID` (and the linked order to `PAID`).
- **Audit logging hooks already exist** (order created/status changed, rate changed, invoice created, payments, users) — the viewer UI comes in Phase 21.
- **Security:** passwords bcrypt-hashed, JWT required, per-role authorization, express-rate-limit on `/api`, helmet headers, CORS locked to `CLIENT_URL`.

---

## 10. Environment variables (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` / `production` |
| `CLIENT_URL` | Allowed frontend origin for CORS |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (default `1d`) |
| `SHOPIFY_*` | Shopify credentials (Phase 15+) |
#   J e w e l l r y - S h o p - - - B i l l i n g - S y s y e m  
 