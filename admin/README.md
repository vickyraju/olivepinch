# OlivePinch Admin Panel

Internal ops tool for the OlivePinch pilot — menu, zones, customer support, order status, and revenue. Structurally adapted from the Alhaji Foods Agent admin panel (same auth-context/API-client/layout pattern), rebuilt in OlivePinch's design system and wired to the OlivePinch API instead of Supabase.

## Stack

Vite + React + TypeScript + Tailwind v4, plain `fetch` against the OlivePinch backend (no React Query / Supabase — this panel is small enough not to need them). Separate Vite project from both the customer app and the API server, matching the PRD's system-components split (§4).

## Setup

```bash
cp .env.example .env   # VITE_API_URL defaults to http://localhost:4000/api/admin
npm install
npm run dev              # http://localhost:5174
```

Requires the `server/` API running (see `../server/README.md`) with `CORS_ORIGIN` including `http://localhost:5174`.

**Default admin login** (from `server/prisma/seed.ts`): `admin@olivepinch.co.uk` / `ChangeMe123!` — change this before any real deployment.

## Pages

| Page | PRD requirement |
|---|---|
| Dashboard | FR-A06 — daily/weekly revenue, CSV export |
| Order Board | FR-A07 — per-day order list, manual status updates (kitchen/delivery are off-platform) |
| Menu Control | FR-A01/FR-A02 — menu item CRUD, daily capacity |
| Customers (list + detail) | FR-A04/FR-A05 — search, subscription/payment history, pause override, refund, reactivation |
| Zones | FR-A03 — postcode/zone eligibility |

## What's deferred

- No admin-side audit log of support actions (pause overrides, refunds, reactivations aren't recorded with a reason/actor) — add an `AdminAuditLog` table if that's needed for compliance.
- No pagination on the customer list (`GET /admin/customers` caps at 50) — fine for a pilot, needs proper paging before the customer base grows.
- Admin users are seed-only — no self-service admin invite/create flow.
