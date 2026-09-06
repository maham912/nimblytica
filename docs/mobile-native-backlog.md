# nimblytica.com — native mobile backlog

Living list. Every new site feature must ship **mobile-first** (phone as primary, not desktop-shrink). Update this file when something ships or a gap is found.

**Target viewport:** 390×844 (iPhone) + 360×800 Android. Thumb-reach CTAs. No page-level horizontal scroll. Tap targets ≥44px.

**Hard rules (unchanged):** no Providence/PSJH/employer names; no fake testimonials; no inventing Stripe URLs.

---

## Definition of “native mobile ready”

A page/feature is done only when all of these pass:

1. **No page-level horizontal scroll** at 390px (overflow only inside intentional `table-scroll` / carousels).
2. **Nav** usable with one thumb (hamburger or bottom bar; no hover-only).
3. **Primary CTAs** full-width or ≥44px tall; sticky or always in reach on conversion pages.
4. **Forms** (sample gate, contact) single-column; inputs `font-size` ≥16px (no iOS zoom jump); email fields `type="email"` / `autocomplete`.
5. **Boards / demos** readable without pinching: KPI cards stack or 2-col max; tables/rails in `table-scroll`.
6. **Modals** (Calendly, sample gate success) fit viewport; close control reachable.
7. **Safe areas** respected if we add fixed headers/footers (`env(safe-area-inset-*)`).
8. **Clarity / GA4** events still fire; mask PII fields (`data-clarity-mask` on contact).

---

## Shipped (keep regression-testing)

| Item | Notes | Status |
|------|--------|--------|
| Global hamburger &lt;880px | PR #15 | Done |
| Tap targets / CTA rows full-width on mobile | PR #15 | Done |
| Sample gate + contact email fields | PR #15 | Done |
| What-changes / How-it-works stacks | PRs #12 / #18 | Done |
| Packages 2×2 → stack; Board Care card | PR #18 | Done |
| Soft-fail empty Stripe → diagnostic CTA | PR #13 | Done |
| Table-scroll: workforce, ops-pulse, shift-board | earlier | Done |
| Table-scroll: scorecard, pipeline, samples | PR #16 | Done |
| Calendly CTA = 20-min diagnostic | PR #17 | Done |
| Clarity project id | PR #14 | Done |

---

## Must-have next (gaps)

Priority order for the next mobile passes:

1. **Live Payment Links UX on phone** — once Stripe links are live, verify Buy → Stripe Checkout → return on 390px (packages + any deposit CTAs). Soft-fail still OK until links land.
2. **Homepage live board (Northwind hero)** — KPI strip + dual charts + Top units / New names tables: confirm stack, chart height, table-scroll, hierarchy filter usability on thumb.
3. **Calendly popup / embed on mobile** — book CTA opens usable scheduling UI (not clipped iframe); mailto fallback still works.
4. **Sample-board gate success path** — post-submit unlock / redirect to samples on phone; keyboard + autofill.
5. **two-weeks.html + packages.html conversion** — sticky or bottom primary CTA; price/SKU cards readable; no double-scroll traps.
6. **solutions/nursing-overtime.html** — same mobile bar as demos (nav, tables, CTAs).
7. **trust.html** — if public, stack content; no wide legal tables.
8. **PWA / install polish** — `site.webmanifest` already exists: icons, theme-color, apple-touch-icon; smoke-test Add to Home Screen.
9. **Fixed header overlap** — when hamburger opens, body scroll lock; focus trap; no content under sticky bar.
10. **Demo drill paths** — scorecard Acute→Harbor breadcrumb, pipeline stage rail, shift-board rank: all usable at 390px after #16.

---

## Feature backlog (include only if mobile-native)

When we add any of these, they go live with a 390px acceptance check in the PR:

| Feature | Mobile requirement |
|---------|-------------------|
| Stripe Live Board / Ops Pulse / BI hours Checkout | Full-width Start buttons; Checkout mobile web; success/cancel return |
| Monthly Board Care deposit/link | Same as above; range copy wraps cleanly |
| Retainer / Slack support upsell | Card stacks; no desktop-only hover reveal |
| More sample boards / gated packs | Gate form + unlocked gallery grid → 1 col |
| Before/after demo loops or short video | `playsinline`, poster, no auto-sound; max-width 100% |
| Client login / portal (future) | Thumb auth, no hover menus |
| Blog / case studies (anonymized) | Readable type scale; images `max-width:100%` |
| FAQ accordion | Large tap rows; one open at a time OK |
| Bottom nav / sticky Book | Safe-area padding; doesn’t cover form submit |
| Dark-mode toggle (if ever) | Respect `prefers-color-scheme`; no flash |
| Multi-language (unlikely) | Layout doesn’t break with longer strings |
| Nextdoor/SFV house-call page (if added) | Local CTA tel: / SMS friendly |

---

## Pages to re-check every pass

- `index.html`
- `packages.html`
- `two-weeks.html`
- `solutions/nursing-overtime.html`
- `trust.html`
- `demo/workforce.html`, `ops-pulse.html`, `shift-board.html`, `scorecard.html`, `pipeline.html`, `samples.html`, `program-complete.html`, `llm.html`
- `work/*` mirrors if still linked

Acceptance: headless or real Chrome at **390×844** — `document.documentElement.scrollWidth <= innerWidth` (allow 1px), primary CTAs visible without horizontal pan.

---

## Process

1. Any Cloud Desk / site PR must include a **Mobile** section: 390px screenshot or overflow audit.
2. After merge, tick items here (Done table) and drop gaps.
3. Do not ship a desktop-only layout “to polish later.”
4. Owner: **Nimblytica** maintains this file; Cloud Desk implements.

Last updated: 2026-09-06
