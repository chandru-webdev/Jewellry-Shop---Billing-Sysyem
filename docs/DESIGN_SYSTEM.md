# Opal Line — Design System

Stack: Tailwind CSS **v4** (imported via the `@tailwindcss/vite` plugin) with a
custom `@theme`. There is **no separate CSS framework** — everything is utility
classes plus a small set of shared components.

## Theme tokens (`frontend/src/index.css`)

```css
@theme {
  --color-royal-50…950   /* violet: #f5f3ff … #2e1065 (royal purple) */
  --color-gold-300…600   /* amber gold accent: #fde68a … #d97706 */
  --color-surface:  #f8f7fc;        /* page background (light mode) */
  --color-surface-elevated: #ffffff;
  --font-sans: "Inter", system-ui, "Segoe UI", Roboto, sans-serif;
}
```

Semantics:

| Token | Use |
| --- | --- |
| `royal-*` | **Primary brand colour** — headings, buttons, links, active nav, `bg-royal-600` primary actions, `text-royal-950` headings. |
| `gold-*` | **Accent** — highlights, “Opal Line” identity, gold badges/stats. |
| `surface` / `surface-elevated` | Card vs page background; dark mode inverts to `#0f0a1f` page, elevated cards. |
| `gray-*` (utilities) | Secondary text (`gray-500/600`), borders, neutral badges. |

Body defaults: light background `var(--color-surface)`, text `#1e1b4b`,
`antialiased`. Dark mode: `.dark` custom variant (`&:where(.dark, .dark *)`),
page `#0f0a1f`, text `#e2e0ea`. Thin violet scrollbars globally.

## Dark mode

- Toggled by `ThemeContext` (adds/removes `.dark` on `<html>`), persisted in
  `localStorage.opal_theme`; defaults to the OS `prefers-color-scheme`.
- **Every styled element must include `dark:` variants** — a component that
  looks right in light mode but unreadable in dark mode is a bug. Grep for
  `dark:` on any new UI.

## Shared UI kit (`frontend/src/components/ui/`)

| Component | Contract |
| --- | --- |
| `Button` | Variants: `primary` (royal solid), `secondary`, `outline`, `danger`, `ghost`, `gold`. Sizes `sm`/`md`/`lg`. Loading state shows a spinner and `aria-busy`; disabled during in‑flight mutations. Use for all actions — never raw `<button>` styling. |
| `Card` | Surface wrapper: white, rounded, subtle border; container for tables/forms/stats. |
| `Modal` | **Right‑side drawer** (slide‑over) with overlay; sizes `sm`…`2xl`; used for create/edit/detail forms. Header + body + footer. |
| `Badge` | Tones **only**: `gold, purple, green, red, gray, blue, orange`. Used for statuses/payment badges. Default `gray`. |
| `PageHeader` | Title (royal bold), optional subtitle, actions slot, brand logo. Every page starts with it. |
| `FormControls` | Exports `Label`, `Input` (+ styled select/textarea) — forms never hand‑roll fields. |
| `StatCard` | KPI card (label, value, sub/delta). |
| `ExportControls` | CSV/Excel/PDF export button group. |
| `ThemeToggle` | Dark/light switch in the topbar. |
| `ProtectedRoute` | Route guard (`permission` prop) — see SECURITY.md. |

Layout components (`components/layout/`): `Layout` (sidebar + topbar shell),
`Sidebar` (driven by `config/nav.js` groups + `hasPermission`), `Topbar`.

## Conventions

1. **Status & payment labels/tone maps are centralized** in
   `components/sales/statusMaps.js` (single source of truth — do not re‑map
   statuses per page).
2. **Money** → `formatINR` (₹, `en-IN` locale, 2 decimals); large numbers →
   `formatShortINR` (Cr/L/k); weights → `formatWeight` (`g`); dates →
   `formatDate` / `formatDateTime` — all in `utils/format.js`. Never hand‑roll
   `toLocaleString` per page.
3. **Icons** come from `lucide-react`.
4. **Class merging** goes through `utils/cn` (join + conditional). Duplicated
   long class strings in several pages should be pulled into a shared component.
5. Every page: `PageHeader` → content in `Card`s (tables in cards with
   `overflow-hidden`, `p-0` on the table wrapper; forms in `space-y` fields).
6. Table styling pattern: plain `<table>` with
   `w-full text-sm … divide-y/ border` utilities + sticky header (`thead` with
   `bg-surface`/`dark:bg-…`), zebra/interactive rows, right‑aligned ₹ columns.
7. Empty states: “No …” with a subtle icon; loading: skeletons or a spinner
   inside the Card (all querying pages show a loading state).
8. Design regression risk: **shared sales tables**
   (`components/sales/SalesInvoicesTable`, `SalesOrdersTable`, `CustomersTable`,
   `ReturnsTable`, `OrderDetailModal`, `InvoiceEditModal`, `CustomerFormModal`)
   are the canonical look for every sales page — reuse, don't fork.