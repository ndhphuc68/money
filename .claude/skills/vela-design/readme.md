# Vela Design System

## Context

Vela is a Vietnamese personal-finance mobile app concept (balance overview, transactions, savings goals, category budgets, profile). There is no external brand codebase or Figma file behind this system — it was extracted from a single high-fidelity HTML/React prototype built in this project (the "Finance App" mobile design). This system formalizes that prototype's visual language into reusable tokens and components so it can be reused consistently in other screens or handed to engineering.

Sources: this project's own "Finance App.dc.html" prototype (no external repo or Figma link was provided).

## Content fundamentals

- All copy is Vietnamese, second person implied but mostly label/data-driven (little narrative copy).
- Currency is VND, formatted with dot thousands separators and a trailing "₫" symbol (e.g. "24.850.000 ₫").
- Dates/times use short Vietnamese forms ("Hôm nay", "Hôm qua", "20 thg 8", "Th12/2026").
- No emoji. Tone is plain and functional — labels are short nouns/verb phrases ("Thêm giao dịch", "Xem tất cả"), not marketing voice.

## Visual foundations

- **Color**: a cool, near-white background (#F4F5FA) with white surfaces; one primary blue (#2F6FED) for interactive/active states, a coral accent (#F2734A) for a secondary highlight (goals, category tags, premium promo), plus fixed semantic green/red for income/expense. Category colors (food/shopping/bills/transport/income) are a small fixed palette used consistently for icon backgrounds across transactions and goals.
- **Gradients**: two fixed diagonal (135deg) gradients — a navy-blue one for the balance/hero card, a coral one for the premium promo banner. Gradients are used sparingly, only on 1-2 "hero" surfaces per screen, never on ordinary cards.
- **Type**: a single family, Manrope, from regular to extra-bold (800). Numbers and headings lean heavy (700-800); supporting text is medium/semibold (500-600). No serif, no second family.
- **Shape**: generously rounded — 16-22px on cards, pill-shaped (9999px) segmented controls and chips, fully circular icon badges and avatars.
- **Elevation**: soft, low-contrast shadows on white cards (`0 2px 10px rgba(16,24,40,0.05)`); a stronger shadow only under the hero balance card and floating action button.
- **Dividers**: 1px hairline (`rgba(16,24,40,0.06)`) between list rows only — never under the last row in a group.
- **Motion**: minimal — instant tab switches, no page-transition animation; the only animation is a subtle staggered pulse on the splash-screen loading dots.
- **Icons**: simple 2-color inline line icons (stroke-based, ~18-22px), no icon font/library. Category and nav icons are hand-built to match the rest of the shape language (rounded, minimal, 1.5-2px stroke).

## Iconography

No icon library is used. Icons are small inline SVGs, monochrome (white on a colored badge for categories; the token color for nav/UI icons). If this system grows, standardize on a stroke-based set (e.g. Lucide) at the same ~1.6px stroke weight rather than mixing styles.

## Assets

No logo was provided for this brand. Wherever a mark would go, the wordmark "Vela" is set in plain type (Manrope, 800 weight) — do not invent a logo mark. Flag this to whoever owns the brand for a real logo file.

## Components

See `components/` — grouped by concern:

- `components/cards/` — BalanceCard, StatCard, TransactionRow, GoalCard, BudgetRow
- `components/forms/` — SegmentedControl
- `components/navigation/` — BottomNav, SettingsList

These are the 8 primitives extracted from the prototype (this is a from-scratch system with no external component inventory to match, so this set was sized to what the app actually needed — not a generic library). Each component ships `Name.jsx` + `Name.d.ts` (props contract) + `Name.prompt.md` (usage example).

## UI kit

`ui_kits/mobile_finance_app/` — an interactive recreation of the full app (Overview, Transactions, Goals, Profile tabs, add-transaction flow, splash) composed from the primitives above. Open `index.html` directly in a browser.

## Foundations

`guidelines/` contains small HTML specimen cards for colors, typography, and spacing — open any of them directly, or view them via the Design System tab if this project supports it.

## Files index

- `styles.css` — root stylesheet, imports every token file. Link this one file to use the tokens.
- `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/radius.css`
- `components/…` — see above
- `guidelines/…` — foundation specimens
- `ui_kits/mobile_finance_app/` — full app recreation
- `SKILL.md` — Claude Code / Agent Skills-compatible entry point

## Caveats

- No real codebase, Figma file, or brand guideline was available — every token and component was reverse-engineered from the one prototype built in this chat. Treat this as a solid first draft, not a verified brand system.
- Manrope is loaded from Google Fonts by URL (`@import` in `tokens/typography.css`) rather than shipped as local font files — no .ttf/.woff files were available to copy in.
- No logo/brand mark exists yet (see Assets above).
- This project may not have the internal Design System compiler/tab active (it was authored as a Design Components project). Every `@dsCard`-tagged file is also fully self-contained (loads React/Babel from CDN) so it renders correctly if opened directly, even if the tab isn't available.
