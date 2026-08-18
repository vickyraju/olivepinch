# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Customer app** (`src/`): Birmingham-based individuals subscribing to a fitness-oriented meal-delivery plan — choosing a goal (weight loss/gain/maintenance/muscle building), diet type, and daily meals, then managing delivery, pauses, and renewals from a dashboard.

**Admin app** (`admin/`): OlivePinch's own operations staff — a small internal team running day-to-day kitchen and delivery operations for the pilot: publishing the weekly menu, tracking orders for kitchen prep, handling customer support calls (address changes, pause overrides, missed menu selections), managing delivery zones, and reconciling payments/refunds. Used at a desk, likely alongside a phone call with a customer, throughout the workday — not a glanceable dashboard, a tool they live in for stretches of focused work.

## Product Purpose

OlivePinch is a Birmingham meal-subscription pilot: fitness-goal-matched meals delivered on a recurring schedule. The customer app runs the signup funnel, subscription management, and health tracking. The admin app is the operations backbone that makes the pilot deliverable day to day: menu publishing, order/kitchen visibility, and customer support actions performed on a caller's behalf.

## Positioning

A small, real, currently-running pilot (not a mature multi-tenant SaaS) — the admin tool exists to let a lean ops team run kitchen and delivery operations without a bigger ops platform, and to let support staff act on a customer's behalf during a phone call without needing database access.

## Operating Context

- Kitchen prep planning ahead of each delivery day/range (portions needed per item, capacity warnings).
- Phone-based customer support: an ops person pulls up a customer record while on a call and edits address, pauses/resumes specific delivery days, or updates preferences on their behalf.
- Weekly menu publishing cycle with a Friday-midnight cutoff, after which any customer who hasn't chosen needs manual admin intervention.
- Small admin team (invite-only admin user management, no role hierarchy).
- Real production data for a live pilot with real (if few) paying customers.

## Capabilities and Constraints

- Admin can: manage the menu catalog, publish weekly menus, view/update orders, edit a customer's address/preferences/delivery-day pauses on their behalf, issue refunds, reactivate accounts, manage delivery zones, invite/remove other admins, and export a kitchen-prep worksheet.
- Admin deliberately cannot: trigger a customer's renewal/payment (PCI boundary — never start a live charge on someone else's behalf), edit health log entries, delete a customer's account, or download a customer's personal-data export. These stay customer-only by identity/GDPR boundary.
- Backend: Express + Prisma + Postgres (Render), separate JWT-based admin auth from the customer app's Supabase auth.
- Frontend: React + TypeScript + Vite + Tailwind v4, deployed separately on Vercel from the customer app.

## Brand Commitments

- The OlivePinch wordmark (italic Georgia serif "OlivePinch") is the one fixed brand asset shared across both apps — keep it recognizable everywhere it appears, including inside a restyled admin surface.
- The customer-facing app owns the warm olive/cream identity; the admin app is explicitly free to run its own distinct, tool-like visual system rather than mirror the customer app 1:1 (confirmed decision when redesigning the admin panel).

## Evidence on Hand

- Real seeded/pilot data: customers, subscriptions, orders, payments, menu items, delivery zones — this is a working system, not a mockup.
- No customer testimonials, press, or case studies exist yet; do not fabricate any for either surface.

## Product Principles

- Support staff are usually mid-phone-call when they touch the admin app — every action needs to be findable and completable in seconds, not exploratory.
- Kitchen and delivery decisions run on the data the admin app shows — a misread table or unclear status is an operational mistake, not just a UX papercut.
- The pilot is small and real; design for the actual current scale (dozens of customers, a handful of admins) rather than enterprise-scale patterns that add friction here.
- Admin-side actions are support actions on someone else's account — always legible as "acting on behalf of," never blurring into the customer's own self-service surface.

## Accessibility & Inclusion

No project-specific accessibility requirement beyond standard WCAG AA practice (established earlier this session: 4.5:1 contrast, keyboard-navigable forms, visible focus states).
