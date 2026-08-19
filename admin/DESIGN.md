---
name: OlivePinch Admin
description: Internal operations console for the OlivePinch Birmingham meal-subscription pilot
colors:
  canvas: "#f4f5f4"
  surface: "#ffffff"
  ink: "#16181a"
  ink-muted: "#6b7075"
  border: "#e2e4e3"
  olive-50: "#eef2ec"
  olive-100: "#d9e5d3"
  olive-300: "#9ec28d"
  olive-500: "#4f7a4a"
  olive-600: "#3c6238"
  olive-700: "#2d4a2a"
  coral-50: "#fdf1ec"
  coral-100: "#fadecf"
  coral-500: "#d9603c"
  coral-600: "#bf4a28"
  success: "#1f7a4d"
  warning: "#a15b04"
  destructive: "#b83232"
  wordmark-dark: "#1b2a0c"
  identity-blue: "#2f5f9e"
  identity-violet: "#7c3fa8"
  identity-pink: "#b83d6b"
  identity-teal: "#1f8a6b"
  identity-amber: "#a86a1a"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "11px"
    letterSpacing: "0.05em"
  wordmark:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontWeight: 700
    fontStyle: "italic"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  full: "9999px"
spacing:
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.olive-600}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
  button-primary-hover:
    backgroundColor: "{colors.olive-700}"
---

# Design System: OlivePinch Admin

<!-- DIRECTION CONTRACT
THESIS: An internal ops console reads as a precision instrument, not the customer app's
twin — it refuses the warm cream/olive consumer palette and the soft-card sameness that
made the previous build feel generic and basic.
OWN-WORLD: An all-light shell — white sidebar and cool-neutral (#f4f5f4) content canvas,
white cards, slate ink. One restrained accent — a muted forest moss carried over from
OlivePinch's own brand — marks the active state, primary actions, and data highlights;
everything else stays quiet so dense tables stay legible. Inter throughout, tabular
figures on numbers, tighter 6-8px radii than the customer app's soft-rounded look.
(An initial dark-graphite-sidebar version shipped and was explicitly reverted to light
per direct user feedback — recorded here so the choice isn't re-litigated by accident.)
STORY: Ops staff open this mid-phone-call or mid-prep-shift; every page states its task in
one line, groups navigation by job (Overview / Operations / People / Settings), and never
makes them hunt for the one control they need.
FIRST VIEWPORT: White sidebar left (grouped nav, wordmark top, admin identity + logout
bottom), cool-neutral content area right with a consistent page header (title, one-line
context, right-aligned actions) above the task itself — a stat row on the dashboard, a
table elsewhere.
FORM: Fused from real ops-tool grammar (Stripe's restrained KPI cards, Shopify/Squarespace's
table+filter conventions, Alhaji Foods' light sidebar with a soft moss active-pill), tuned
by direct user steer away from the initial dark-sidebar direction.
-->

**Creative North Star: "The Ops Console"**

OlivePinch Admin is the instrument panel behind a small, real meal-delivery pilot — built
for a lean ops team who live in it mid-call and mid-shift, not for a glanceable executive
dashboard. It deliberately breaks from the customer app's warm, soft-rounded cream/olive
identity: an all-light, cool-neutral shell with one restrained moss-green accent doing all
the pointing. Density and legibility outrank charm; every screen answers "what do I do
here" in the first second.

**Key Characteristics:**
- All-light shell: white sidebar, cool-neutral content canvas — no dark surfaces anywhere.
- One accent color (moss), used only for active state, primary actions, and the rare data flag.
- Inter throughout; tabular numerals on every data table and stat.
- Tight, precise radii (6–8px) and whisper-quiet shadows — a flat-first system, not a soft consumer one.
- Every page opens with the same header grammar: title, one-line context, actions on the right.

## Colors

Restrained strategy: cool neutrals carry the surface, one accent carries meaning.

### Primary
- **Moss** (`#3c6238`): active nav state, primary buttons, links, focus rings, the one color allowed to mean "this is the important thing."

### Secondary
- **Ember** (`#d9603c` / coral scale): the sole warm note — reserved for the "Out for Delivery" status badge and one accent button variant. Never used decoratively.

### Neutral
- **Canvas** (`#f4f5f4`): page background in the content area.
- **Surface** (`#ffffff`): sidebar ground, cards, table backgrounds, inputs — the sidebar and cards share the same white so the sidebar reads as part of the shell, not a separate zone.
- **Ink** (`#16181a`) / **Ink Muted** (`#6b7075`): primary and secondary text on the light workspace.
- **Border** (`#e2e4e3`): hairline dividers and card edges.

### Identity (categorical, non-semantic)
- **Blue / Violet / Pink / Teal / Amber** (`#2f5f9e` / `#7c3fa8` / `#b83d6b` / `#1f8a6b` / `#a86a1a`, each on a matching pale tint): a small deterministic palette used only to tell rows of *people* apart at a glance (customer/admin/order-customer avatar initials — see Components). Picked by hashing the person's name, never by status or meaning.

### Named Rules
**The One Accent Rule.** Moss green is the only color that means "act here" or "this is active" — this governs *action and state* color, not the identity palette above. It never decorates a card corner or fills a background field to mean "important"; it marks exactly one actionable thing per view.

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui fallback)
**Body Font:** Inter

**Character:** A single workhorse grotesk carries both roles — headings lean on weight (700) and slightly tightened tracking (-0.015em) rather than a second face. This is an Operate surface: legibility and density beat typographic personality.

### Hierarchy
- **Title** (700, 1.5rem `text-2xl`): page titles, one per view.
- **Section** (600, 1rem): card headers, group labels.
- **Body** (400, 0.875rem): table cells, form values, the working density of the app.
- **Label** (600, 11px, uppercase, 0.05em tracking): table column headers and sidebar nav-group labels — sized down from the body scale on purpose so it reads as metadata, not competing text.

### Named exception
The OlivePinch wordmark (`components/ui/logo.tsx`) is the one element outside this type system — italic Georgia serif, per PRODUCT.md's brand commitment — rendered dark (`#1b2a0c`) everywhere in this all-light shell. A light-on-dark `variant` prop existed briefly for the dark-sidebar iteration and was removed once nothing called it — re-add it only if a future surface genuinely goes dark again. Never restyle the wordmark into Inter; never introduce a second off-system font anywhere else.

### Named Rules
**The Tabular Numerals Rule.** Every number in a table, stat card, or price column uses tabular figures (`font-variant-numeric: tabular-nums`, applied globally to `table`) so columns of numbers align instead of jittering.

## Layout

Fixed 240px white sidebar, content area capped at `max-w-7xl` with 24px page padding, same as the customer app's container discipline. Page rhythm: title block, then a stat row where the page has summary metrics, then the primary content card(s). Consistent 24px vertical rhythm between page sections (`space-y-6`).

## Elevation & Depth

Flat-first with whisper-quiet lift, not the customer app's soft consumer shadow. Cards sit on a 1px border plus a barely-there shadow — depth reads from contrast and hairlines more than blur.

### Shadow Vocabulary
- **Soft** (`0 1px 2px rgba(15,17,20,0.06)`): resting cards, inputs.
- **Card** (`0 1px 2px rgba(15,17,20,0.04), 0 4px 10px rgba(15,17,20,0.06)`): elevated panels, dropdowns.

### Named Rules
**The Flat-By-Default Rule.** Nothing gets a heavy shadow at rest. Depth is a hairline border first, a whisper of shadow second.

## Shapes

Tighter geometry than the customer app: 6px small radius (inputs, badges, buttons), 8px medium (cards), 12px large (modals, the sidebar's rare rounded elements). Corners read as precise, not soft.

## Components

### Buttons
- **Shape:** 6px radius, semibold label, `h-8/h-10/h-11` size scale.
- **Primary:** moss (`#3c6238`) background, white text; hover deepens to `#2d4a2a`.
- **Outline / Ghost:** border or transparent, ink text, canvas hover — the default for secondary and tertiary actions in a dense toolbar.
- **Accent (ember):** reserved for the rare "this needs attention" action; do not use as a default primary.

### Cards / Containers
- **Corner Style:** 8px radius.
- **Background:** white surface on canvas ground.
- **Shadow Strategy:** Soft at rest; see Elevation.
- **Border:** 1px hairline, always present — the border does the separating work, not the shadow.

### Inputs / Fields
- **Style:** 1px border, white background, 6px radius, `h-10`.
- **Focus:** 2px moss ring, border shifts to moss-500.

### Identity avatars
- **Shape:** 28px circle (44px on the customer-detail header), two-letter initials, semibold 11px label.
- **Color:** one of the five identity hues (see Colors), chosen deterministically from the person's name so it never shifts between page loads. Used wherever a row's subject is a specific person — customers, admins, an order's customer — never for a subscription, order, or menu item.

### Status breakdown (mini bar list)
- **Shape:** label, a thin `canvas`-track/`olive-300`-fill proportional bar, and a right-aligned tabular count — the categorical sibling of the trend bars in the revenue card. Used for any "how does this total split into a few categories" widget (today's orders, subscription status, account status, delivery zones on the Overview page).
- **Not a chart library:** no axes, no legend, no external dependency — deliberately as plain as the trend bars it sits next to.

### Segmented filter (pill tabs)
- **Shape:** full-rounded pills in a horizontal row, replacing a `<select>` wherever the filter set is small and enumerable (order/account status, meal slot). A plain dropdown still owns per-row inline status edits — the pill row is a page-level filter, not a form control.
- **Selected:** moss fill, white text. **Unselected:** surface background, hairline border, ink-muted text, canvas hover.

### Navigation (signature component)
- **Shell:** fixed 240px white sidebar, full height, separated from the content canvas by a 1px border (not a color change) — the sidebar and the surface share the same white.
- **Grouping:** nav items grouped under small uppercase muted-gray section labels (Overview / Operations / People / Settings) rather than one flat list — the previous build's single unlabeled list was the clearest "basic" signal to fix; kept even after the dark-sidebar reversal since it's independent of light/dark.
- **Active state:** olive-50 pill background with olive-700 text — the same active-state pairing the customer app's own nav conventions use, now reused here after the dark treatment was reverted.
- **Identity:** wordmark top, admin name/email + logout in a canvas-toned bottom card, visually separated by a hairline.

## Do's and Don'ts

### Do:
- **Do** keep the whole shell light — sidebar and content canvas both, no dark surfaces.
- **Do** use moss for exactly one "this is active/primary" signal per view; everything else stays neutral.
- **Do** use tabular numerals on every data table and stat card.
- **Do** open every page with the same header grammar: title, one-line context, right-aligned actions.
- **Do** use the identity palette for person avatars only — never repurpose it for status, category, or emphasis.
- **Do** use a segmented pill filter instead of a `<select>` for any small, enumerable page-level filter.

### Don't:
- **Don't** make the sidebar (or any surface) dark — explicitly tried and reverted per user feedback; the whole shell stays light.
- **Don't** reintroduce the customer app's warm cream/olive-50 card backgrounds here — this surface is deliberately cooler and flatter.
- **Don't** add a second accent color; ember stays reserved for the one status badge and one button variant.
- **Don't** use heavy/diffuse shadows — this system is flat-first with hairline borders doing the separation.
- **Don't** let a table ship without a working empty state, loading state, and (where the data supports it) a filter/search/sort control.
