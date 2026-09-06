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
| Homepage live board mobile pass | PR mobile-musthaves | Done |
| Calendly popup mobile + mailto fallback | PR mobile-musthaves | Done |
| Sample-gate success path on phone | PR mobile-musthaves | Done |
| Sticky CTAs: two-weeks + packages | PR mobile-musthaves | Done |
| solutions/nursing-overtime + trust mobile bar | PR mobile-musthaves | Done |
| PWA manifest / icons / apple-touch smoke | PR mobile-musthaves | Done |
| Hamburger scroll lock + focus trap + Escape | PR mobile-musthaves | Done |
| Homepage before/after silent punch (CSS/SVG loop) | PR homepage-ba-punch | Done |
| Gated sample gallery (1-col unlock @390) | PR sample-gallery-gated | Done |
| Trust page stacked cards + trust FAQ-lite @390 | PR trust-poster-polish | Done |
| Homepage BA poster-first silent punch polish | PR trust-poster-polish | Done |

---

## Must-have next (gaps)

Priority order for the next mobile passes:

1. **Live Payment Links UX on phone** — once Stripe links are live, verify Buy → Stripe Checkout → return on 390px (packages + any deposit CTAs). Soft-fail still OK until links land.
2. **Demo drill paths** — scorecard Acute→Harbor breadcrumb, pipeline stage rail, shift-board rank: all usable at 390px after #16 (regression after sticky CTA / nav a11y pass).

---

## Feature backlog (include only if mobile-native)

When we add any of these, they go live with a 390px acceptance check in the PR:

| Feature | Mobile requirement |
|---------|-------------------|
| Stripe Live Board / Ops Pulse / BI hours Checkout | Full-width Start buttons; Checkout mobile web; success/cancel return |
| Monthly Board Care deposit/link | Same as above; range copy wraps cleanly |
| Retainer / Slack support upsell | Card stacks; no desktop-only hover reveal |
| More sample boards / gated packs | Shipped — unlock gallery 1-col @390; invented orgs only |
| Before/after demo loops or short video | Shipped poster-first + silent CSS/SVG loop (playsinline/no-sound/max-width 100%) |
| Client login / portal (future) | Thumb auth, no hover menus |
| Blog / case studies (anonymized) | Readable type scale; images `max-width:100%` |
| FAQ accordion | Trust FAQ-lite shipped on trust.html; packages/two-weeks accordion remains HOLD on PR #22 |
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

Last updated: 2026-09-06 (trust stack + BA poster polish)
