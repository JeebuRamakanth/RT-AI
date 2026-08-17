# RT AI — Project Memory

## What RT AI is
RT AI is a **private, two-person universal AI assistant/agent platform** for exactly
two users: Ramakanth and his wife. There is NO public-user product model, NO
subscriptions, NO pricing pages, NO message quotas. The "T" meaning is private and
must never be exposed in the UI. The UI must feel like "my AI", not a public website.

## Stack (established Step 01)
- **Framework**: Next.js 14.2.35 (App Router) + React 18 + TypeScript (strict)
- **Styling**: Tailwind CSS 3 + CSS-variable design tokens in `src/app/globals.css`
- **Motion**: framer-motion (orchestrated entrance + micro-interactions). Reduced-motion respected globally.
- **Fonts**: Instrument Serif (display) + Hanken Grotesk (sans) + Spline Sans Mono via `next/font/google`
- **Path alias**: `@/*` -> `./src/*`

## Design system ("Quiet Futurism")
- Dark-first. Deep ink surfaces (`--ink-950..700`) + luminous warm-platinum "signal" accent.
- Light theme is preserved and coherently mapped via `:root[data-theme="light"]`.
- Tokens are CSS variables consumed by Tailwind (`tailwind.config.js` maps them).
- Reusable component classes: `.rt-surface`, `.rt-surface-raised`, `.rt-hairline`, `.rt-aurora`, `.rt-grain`.
- Theme switching: `src/lib/theme.tsx` (`ThemeProvider` + `useTheme`), persisted in `localStorage('rt-theme')`, pre-paint inline script in `layout.tsx`.

## Architecture conventions
- **Shell**: `src/components/shell/AppShell.tsx` wraps every page (header + desktop nav rail + atmospheric backdrop). Future pages render inside `<main>` automatically via layout.
- **Navigation config** is the single source of truth for shell modules: `src/lib/navigation.ts`. Each `NavItem` has `status: "available" | "soon"`. Flip a module to `available` when it ships. NEVER fake a "soon" capability as working.
- **Reusable UI primitives**: `src/components/ui/*` — RTButton, RTIconButton, RTPanel, RTSection, RTEmptyState, RTLoadingState, SoonBadge, ComingSoon.
- **Icon system**: `src/components/icons/Icon.tsx` — typed inline SVG `Icon` component, `IconName` union. Add icons here (no external icon dep).
- **Composer**: `src/components/home/RTAIComposer.tsx` owns typed draft state (text + `DraftAttachment[]`) and exposes an `onSubmit` contract. It performs NO backend calls. Extensible for multimodal (file/image/video/audio attach + drag-drop already implemented visually).

## Critical rules
- Do NOT fabricate AI responses, generated media, web research, or conversation history. Surface an honest "not connected / coming soon" affordance instead.
- Future modules live as route folders under `src/app/<module>/page.tsx` using `<ComingSoon />` until implemented.
- Preserve the existing shell, tokens, and component contracts when adding features.

## Commands
- `npm run dev` / `npm run build` / `npm run start` / `npm run lint` / `npm run typecheck`
- Build + typecheck + lint all pass clean as of Step 01.

## Security note
`next@14.2.35` is the patched 14.2.x line. Remaining npm advisories require a breaking
Next 16 upgrade and concern server-side concerns (SSRF/cache) not relevant to this
private two-user frontend foundation. Upgrade to Next 16 in a dedicated later step.
