# OlivePinch Admin Panel

Internal ops tool for the OlivePinch pilot — menu, zones, customer support, order status, and revenue. Visual system (colors, typography, icons, card/table/modal chrome, loading skeletons) is a direct port of the Alhaji Foods Agent admin panel, by request — same UI/UX, different business: business logic and data model follow the OlivePinch PRD, not Alhaji's (no stock/agents/fleet/commission concepts).

## Stack

Vite + React + TypeScript + Tailwind v4, plain `fetch` against the OlivePinch backend (no React Query, no Supabase — auth is our own JWT). Material Symbols Outlined + Inter (Google Fonts), matching Alhaji's icon/type system exactly rather than OlivePinch's own Outfit/Work Sans + Lucide brand. Separate Vite project from both the customer app and the API server, matching the PRD's system-components split (§4).

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
| Customers (list + detail) | FR-A04/FR-A05 — search (paginated), subscription/payment history, pause override, refund, reactivation, support-action audit log |
| Zones | FR-A03 — postcode/zone eligibility |
| Admin Users | Invite/remove other admins (any logged-in admin can; blocked from removing yourself or the last remaining admin) |

## What's deferred

- Admin invites are in-panel only — no email-based invite flow; the inviter just hands the new admin their temporary password directly.
- Support-action audit log records action/customer/admin/timestamp, not a free-text reason — add a reason field if compliance needs one.
