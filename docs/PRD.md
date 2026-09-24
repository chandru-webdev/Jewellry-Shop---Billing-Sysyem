# Opal Line — Product Requirements

## Purpose

Opal Line runs a 92.5 sterling‑silver jewellery shop end‑to‑end:

- ring a sale up at the counter (POS/billing),
- price jewellery from the **live silver rate** plus a per‑gram making charge and GST,
- track silver‑weighted inventory (grams, purity default 92.5),
- manage purchase orders, purchase invoices, stock transfers and inventory adjustments,
- track payments, dues, bank accounts and the ledger,
- and keep the shop's **Shopify** store in sync (products, prices, stock, orders).

## Users & roles

Seeded in `backend/prisma/seed.js`; permissions are stored as a JSON array on each
role (`backend/prisma/schema.prisma`, `Role.permissions`):

| Role | Scope |
| --- | --- |
| `SUPER_ADMIN` | `['*']` — everything, including users, roles, audit logs, backup/restore |
| `MANAGER` | most modules (products, inventory, purchases, payments, reports, Shopify) — **not** user management |
| `EMPLOYEE` | counter‑only: billing, customers, orders |

A user can also be assigned per‑user `User.customPermissions` (a JSON array of
permission strings). In the UI (`AuthContext.hasPermission`) a non‑empty
`customPermissions` list **replaces** the role's list for that login — see
`SECURITY.md` for the backend asymmetry.

## Modules (from the navigation/Sidebar grouping in `frontend/src/config/nav.js`)

**Main** — Dashboard (KPIs, revenue, payment mix, top products, recent orders).
**Sales** — Billing (new sale/POS), Invoices (tabbed: Invoices · Orders · Returns · Customers),
customer detail drawer, invoice detail/edit, order detail, returns.
**Purchase** — Purchase Orders, Purchase Invoices, Suppliers, Stock Transfers, Purchase Returns.
**Inventory** — Products, Product price history, Inventory (stock in/out/transfer/adjust),
cost price & gross profit, "Set making charge", "Repair price".
**Payments** — Payments (collect/refund/settle), Dues, Bank Accounts.
**Reports** — Analytics (revenue, receivables, income vs expense, top expenses),
Ledger (accounts, trial balance, monthly settlement), CSV/Excel/PDF export.
**Shopify** — sync status page, pull products (import → approve/discard), push prices,
push inventory, price comparison, inventory comparison, customer/order pull.
**Finance** — Expenses, Backup & Restore (server‑side JSON snapshots).
**Admin** — Users & roles, Audit Logs (read‑only, ADMIN only), Notifications, Settings.

Counter users with `EMPLOYEE` land on Billing/Sales; navigation entries are gated
by permission strings (see `frontend/src/config/nav.js`).

## The Opal Line pricing formula

Defined **once**, in the backend (`backend/src/services/pricing.service.js`)
— deliberately never re‑implemented in React:

```
baseAmount   = (silverRate + makingChargePerGram) × netWeight
             + stoneValue                     (only when > 0)
gstAmount    = baseAmount × gstPercent / 100
sellingPrice = baseAmount + gstAmount
```

Example (from the code comment): silver ₹125/g, making ₹180/g, weight 5 g
→ base (125+180)×5 = ₹1,525; GST 3% = ₹45.75; price = **₹1,570.75**.

Every Product carries `makingChargePerGram`, `gstPercent`, optional `stoneValue`,
`weight`, `purity` (default 92.5). Prices are stored as `Decimal`.

### Silver rate lifecycle

- `MetalRate` holds the single live rate for metal `silver`.
- Changing the rate goes through **rate request → preview → confirm** so the admin
  sees what *would* change before it applies (`metalRate.service.js`,
  `pricing.service.js` `previewRecalculation` / `recalculateAllProducts`).
- Every change records a `MetalRateHistory` row and a price‑history row per
  product (`ProductPriceHistory`).
- Missions like "prices defaulted to 0 because the stored rate was missing at
  build time" are repaired by `recalculateMissingSilverRate` (retail: recycles a
  current rate over products whose prices were computed with a missing rate).

## Key workflows

**Billing / new sale** — Billing page → pick customer → add line items (product,
qty) → automatic selling price per the formula → apply discount → payment (cash/
UPI/card/bank/online) → **Invoice + Order created together**, stock reduced in a
transaction, payment recorded, ledger + notifications updated. Editing an invoice
rebuilds the line items and keeps header `= Σ` line totals (see §Reconciliation).

**Invoice ↔ Order** — an Invoice has an optional link to an Order
(`Invoice.orderId`, unique). When an invoice is edited, the linked order's items
and `totalAmount` are rewritten to match the invoice (`invoice.service.js`).
Order statuses are terminal for the sale lifecycle: `PENDING → PAID →
FULFILLED`, or `CANCELLED`/`REFUNDED` (see enums below).

**Purchase order → purchase invoice** — create PO; goods‑inwards through a
purchase invoice increases product stock (ledger `StockIn/Adjustment` entries).
**Purchase returns** track the return/repair of supplied goods back to suppliers.

**Stock control** — every change is a ledger `InventoryTransaction`
(`stockIn`, `stockOut`, `Adjustment`, `StockTransfer`, `Sale`). A "three‑tier"
stock status (in stock / low / out) is computed by a shared backend helper.
Stock changes attempt a push to Shopify (inventory levels) and failures are
retryable from the Shopify page.

**Reports** — revenue vs refunds, receivables, income/expense, top expenses,
top‑selling products **by weight** as well as revenue, inventory valuation,
bank balances, trial balance, monthly settlement, due payments.

**Backup / restore** — server creates a full JSON snapshot (products, categories,
customers, suppliers, orders, invoices, payments, etc.) with Decimal fields
serialized safely; restore upserts everything inside a transaction
(`backup.service.js`).

## Shopify integration behaviour

Two channels, both under `backend/src/services/shopify.service.js`:

1. **Webhooks (live, registered at boot)** — `webhookRegister.service.js`
   subscribes to `orders/create`, `orders/paid`, `orders/cancelled`,
   `orders/fulfilled`, `refunds/create`, `products/create`, `products/update`
   (idempotent: reregistering doesn't duplicate). Each webhook is HMAC‑SHA256
   verified on the **raw body** (mounted before the JSON body parser).
2. **Manual sync pages** — pull products (→ “pending import”, approve/discard),
   pull orders, pull customers, push products, push all prices (batch sync), push inventory levels, price comparison, inventory comparison.
   Every run writes a `ShopifySyncLog`.

**orders/create webhook pipeline** (`webhook.service.js`):
1. guard on `WebhookEvent.eventId` (unique) — duplicate deliveries are ignored,
2. customer: match Shopify email → phone → create,
3. line items matched to ERP products **by SKU** (unmatched lines ignored),
4. header totals = Σ of the **matched** line totals from the **ERP** record —
   never Shopify's `total_price` (it includes unmatched lines, shipping, tax),
5. stock decreased inside the same transaction (ledger `Sale` entries) and stock
   pushed back to Shopify so ERP↔store never diverges.

### Known Shopify‑sync caveats (see also `AGENTS.md`)

- **Test‑store data leaks into production lists.** Orders/products/customers
  living on the Shopify *test store* come through webhooks/pulls as if real.
  SKU‑matching keeps totals honest, but records (and dashboard aggregates) get
  polluted by test records.
- **Currency/locale on the Shopify test store** can differ from ₹/en‑IN: prices
  are pushed as **plain numbers** — there is no currency conversion — so a store
  configured for another currency shows off‑by‑currency comparisons. Verify the
  store's currency/locale before trusting price‑comparison reports.

## Data model highlights (`backend/prisma/schema.prisma`)

Enums: `MetalType` (silver/gold), `InventoryTransactionType`, `OrderSource`
(SHOPIFY/POS), `OrderStatus` (PENDING/PAID/FULFULED/CANCELLED/REFUNDED),
`PaymentMethod` (CASH/UPI/CARD/BANK_TRANSFER/ONLINE/OTHER), `PaymentStatus`,
`InvoiceStatus` (DRAFT/FINAL/PAID/VOID), `SyncType`, `SyncStatus`.

Core models: `Role`, `User`, `Category`, `Collection`, `Product`,
`ProductPriceHistory`, `Inventory`, `InventoryTransaction`, `Customer`,
`Supplier`, `Order`, `OrderItem`, `Invoice`, `InvoiceItem`, `Payment`,
`MetalRate`, `MetalRateHistory`, `MetalRateRequest`, `ShopifySyncLog`,
`WebhookEvent`, `Setting`, `AuditLog`, `Notification`, `BankAccount`,
`PurchaseOrder`, `PurchaseOrderItem`, `PurchaseReturn`, `PurchaseInvoice`,
`PurchaseInvoiceItem`, `PurchaseInvoicePayment`, `Expense`, `Backup`.

Structural facts worth knowing:
- `Invoice.orderId Int? @unique` — order link is optional but unique.
- `ProductPriceHistory` is **created at boot** by `ensureSchema()` (raw SQL),
  because the migration history on the hosted DB predates it (see `ARCHITECTURE.md`).
- `purity` defaults to `92.5`; weights are stored in grams.

## Reconciliation rules (the non‑negotiables)

These were born from real bugs; they are the shop's accounting invariants:

1. **Header = sum of line totals.** An invoice header (subtotal, discount, GST,
   grand total, weight, making charges) must equal the arithmetic of its lines.
   Shopify totals are recomputed from ERP‑matched lines, never trusted wholesale.
2. **Money is Decimal only.** All amounts are `Prisma.Decimal`; float
   accumulation is forbidden (a host of “off‑by‑one‑paise” bugs came from
   summing numbers). Decimal results are converted to `Number` at the JSON edge.
3. **Prices are preserved on edit.** When an invoice is edited, per‑line
   `sellingPrice` overrides sent by the client are kept (original sale prices),
   and the header is recomputed from them rather than re‑pricing at today's rate.
4. **Idempotent webhooks.** `WebhookEvent.eventId` makes duplicated Shopify
   deliveries no‑ops — double processing would double‑deduct stock.

## Non‑goals / current limitations

- No dedicated **SalesReturn** model: returns are orders marked
  `CANCELLED`/`REFUNDED` (terminal). Repairs/returns to suppliers live in the
  Purchase Returns module.
- Orders (incl. Shopify ones) have no PATCH‑edit endpoint; the invoice is the
  editable document and the linked order is rewritten from it.
- No customer self‑service / public storefront in this repo (storefront is the
  Shopify theme; it talks to Shopify, not this API).
- Premium features are gated by role permissions, not by tenant plans; there is
  a single operational tenant (this shop).