# RT AI — Project Memory

## What RT AI is
RT AI is a **private, two-person universal AI assistant/agent platform** for exactly
two users: Ramakanth and his wife. There is NO public-user product model, NO
subscriptions, NO pricing pages, NO message quotas. The "T" meaning is private and
must never be exposed in the UI. The UI must feel like "my AI", not a public website.

## Stack (established Step 01A — React + Vite SPA)
- **Framework**: React 18 + TypeScript (strict) as a client-side SPA, built with Vite 5
- **Routing**: react-router-dom 6 (`BrowserRouter` + `Routes`/`Route` in `src/App.tsx`)
- **Styling**: Tailwind CSS 3 + CSS-variable design tokens in `src/styles/globals.css`
- **Motion**: framer-motion (orchestrated entrance + micro-interactions). Reduced-motion respected globally.
- **Fonts**: Instrument Serif (display) + Hanken Grotesk (sans) + Spline Sans Mono, loaded via Google Fonts `<link>` in `index.html`; CSS vars `--font-display` / `--font-sans` / `--font-mono` defined in `:root` (globals.css).
- **Entry**: `index.html` → `src/main.tsx` (renders `ThemeProvider` + `BrowserRouter` + `App`) → `src/App.tsx` (routes wrapped in `AppShell`).
- **Path alias**: `@/*` -> `./src/*` (configured in `tsconfig.json` and `vite.config.ts`).
- **No Next.js**: App Router, `next/link`, `next/navigation`, `next/font`, and `"use client"` are all removed. This is a pure client-side React app.

## Design system ("Quiet Futurism")
- Dark-first. Deep ink surfaces (`--ink-950..700`) + luminous warm-platinum "signal" accent.
- Light theme is preserved and coherently mapped via `:root[data-theme="light"]`.
- Tokens are CSS variables consumed by Tailwind (`tailwind.config.cjs` maps them).
- Reusable component classes: `.rt-surface`, `.rt-surface-raised`, `.rt-hairline`, `.rt-aurora`, `.rt-grain`.
- Theme switching: `src/lib/theme.tsx` (`ThemeProvider` + `useTheme`), persisted in `localStorage('rt-theme')`, pre-paint inline script in `index.html` reads it before first paint (no FOUC).

## Architecture conventions
- **Shell**: `src/components/shell/AppShell.tsx` wraps every route (header + desktop nav rail + atmospheric backdrop). Routes render inside `<main>` via `src/App.tsx`.
- **Routing**: Pages live in `src/pages/` (`<RoutePage>.tsx`), registered in `src/App.tsx`. A catch-all renders `NotFoundPage`.
- **Navigation config** is the single source of truth for shell modules: `src/lib/navigation.ts`. Each `NavItem` has `status: "available" | "soon"`. Flip a module to `available` when it ships. NEVER fake a "soon" capability as working. Navigation uses react-router `Link`/`useLocation` (active state derived from `location.pathname`).
- **Reusable UI primitives**: `src/components/ui/*` — Button, IconButton, Panel, Section, EmptyState, LoadingState, SoonBadge, ComingSoon. (Step 03 renamed away the `RT`-prefixed names; see Naming convention below.)
- **Icon system**: `src/components/icons/Icon.tsx` — typed inline SVG `Icon` component, `IconName` union. Add icons here (no external icon dep). Step 02 added `stop` and `retry`.
- **Composer**: `src/components/home/Composer.tsx` owns typed draft state (text + `DraftAttachment[]`) and exposes an `onSubmit` contract. Step 02 added `isStreaming` + `onCancel` props so the send button becomes a stop button while a turn is in flight. It performs NO backend calls itself — orchestration lives in the `useConversation` hook. Extensible for multimodal (file/image/video/audio attach + drag-drop already implemented visually).

## Naming convention (Step 03)
- Generic application/component names use NO `RT` prefix. Component files/exports are plain: `Home`, `Hero`, `Composer`, `QuickActions`, `CapabilityGroups`, `RecentWork`, `ResponseSurface`, `Brand`, `Header`, `Navigation`, `Button`, `IconButton`, `Panel`, `Section`, `EmptyState`, `LoadingState`.
- The `RT` token is reserved for genuine product-facing text only: the product name "RT AI" in copy/aria/comments, the brand wordmark in `Brand.tsx`, and the internal model label "RT Development". These are NOT component/identifier names.
- A guard test (`src/ai/__tests__/naming-normalization.test.ts`) asserts no `RT`-prefixed component files or internal identifiers remain in non-test source, while "RT AI" product text is preserved.
- The `.rt-surface` / `.rt-hairline` / `.rt-aurora` / `.rt-grain` CSS utility classes in `globals.css` are a design-system namespace (not component names) and are intentionally kept.

## AI Core (Steps 02–03)
A provider-agnostic, streaming-first AI pipeline lives in `src/ai/`. The Home composer talks to it only through the `useConversation` hook (`src/hooks/useConversation.ts`); Composer stays presentational.
- **Canonical types** (`src/ai/types.ts`): `AIRequest`, `AIResponse`, `StreamEvent`, `ModelDescriptor`, `ConversationMessage`, `AIErrorDescriptor`. `AIRequest` also carries optional `intelligence` + `stylePolicy` (built by the orchestrator). Provider-specific shapes NEVER reach the UI; everything is normalized here. Multimodal-ready (`ContentPart` text + attachment metadata) but text-first.
- **Pipeline**: `Orchestrator.run(request, onEvent, signal?, conversation?)` → build conversation intelligence + response style policy → `buildContext` (folds policy + topic/continuity into system instructions) → `ModelRouter.route` → resolve `AIProvider` → `stream()` → `consumeStream` normalizes → canonical `StreamEvent`s. Cancellation is end-to-end via `AbortController`. The hook passes `engine.history()` as `conversation.history` so continuity works across turns.
- **Modules**: `config.ts` (runtime config, NO secrets), `language.ts` (language + style detection with confidence/verbosity/technicalLevel/emojiPreference; script-detection is registry-driven via `LANGUAGE_SCRIPTS` for extensibility), `errors.ts` (typed `AIError` hierarchy → serializable `AIErrorDescriptor`; stack traces sanitized before reaching UI), `provider.ts` (`AIProvider` streaming interface), `registry.ts` (`ModelRegistry`), `router.ts` (`ModelRouter`), `context.ts` (system-instruction + history + policy + intelligence builder), `streaming.ts` (event folding + cancellation), `conversation.ts` (`ConversationEngine`), `orchestrator.ts` (entry point), `development.ts` (deterministic dev provider), `index.ts` (barrel + `createAI()` factory), `emoji.ts` (emoji intelligence), `intelligence.ts` (conversation intelligence), `style-policy.ts` (response style policy).

## Conversation intelligence + language/style + emoji (Step 03)
- **Conversation intelligence** (`src/ai/intelligence.ts`): per-turn `ConversationIntelligence` with active/recent topics, `UserIntent`, continuation detection, and accumulated `UserPreferences`. `buildConversationIntelligence(history, currentMessage, language)` is the entry point. Continuity resolves referential follow-ups ("first module start cheyyi" → the active topic "Agentic AI" from prior turns).
- **Response style policy** (`src/ai/style-policy.ts`): the single source of truth the generation pipeline consumes. `buildStylePolicy(intelligence, language)` produces `ResponseStylePolicy` (language, mixed-language, tone, formality, verbosity, technicalLevel, emojiPreference, + `systemGuidance`). `fallbackStylePolicy` is the safe default when no intelligence is available.
- **Emoji intelligence** (`src/ai/emoji.ts`): `buildEmojiProfile` / `preferenceForMessage` derive an `EmojiPreference` ("none" | "sparse" | "moderate" | "expressive") from the user's emoji usage. `applyTastefulEmojis` adds a small, courteous, non-repeating set of emojis gated by the preference — "none" leaves text untouched. Emojis are an accent, never content; output quality never depends on them.
- **Language metadata** (`src/ai/language.ts`): `LanguageStyleMetadata` now carries `languageConfidence`, `verbosity`, `technicalLevel`, and `emojiPreference`. Detection is data-driven through `LANGUAGE_SCRIPTS` so new languages are a registry entry + a `LanguageCode` union member — not hard-coded logic.
- **Development provider**: deterministic, streaming, NO network, NO secrets. Always marked `development: true` so output is never presented as real production AI. Mirrors detected language/style to prove the pipeline works end-to-end.
- **Real providers**: future secure backend/API gateway injects credentials. The provider interface is shaped so real models can register here without touching the orchestrator, router, or UI.

## Testing (Steps 02–03)
- **Runner**: Vitest (`vitest@^1.6.0`). Config in `vite.config.ts` `test` block (node environment, globals off, tests under `src/**/*.{test,spec}.ts` and `src/**/__tests__/**`).
- **Scripts**: `npm test` (run once), `npm run test:watch`.
- **Suite**: 87 tests across 10 files covering language/style detection (+ extended metadata + script registry), request/response creation, provider+registry+router, conversation lifecycle, error handling + stack-trace sanitization, cancellation, full Home→AI Core integration, emoji intelligence (+ tasteful application + budgets), conversation intelligence (intent, topic, continuity, preferences), mixed-language/style/emoji behaviour through the orchestrator, and naming-normalization guards.

## Critical rules
- Do NOT fabricate AI responses, generated media, web research, or conversation history. Surface an honest "not connected / coming soon" affordance instead. The Step 02 development provider is honest: it mirrors input and is clearly labelled "Development".
- Provider secrets (API keys) MUST NEVER live in source, localStorage, public files, or `VITE_` env vars. Real providers connect through a secure backend in a later step.
- Future modules live as pages in `src/pages/<Module>Page.tsx` (registered in `src/App.tsx`) using `<ComingSoon />` until implemented.
- Preserve the existing shell, tokens, and component contracts when adding features.

## Commands
- `npm run dev` (Vite dev server, port 12000) / `npm run build` (tsc + vite build) / `npm run preview` (serve dist) / `npm run lint` / `npm run typecheck` / `npm test` / `npm run test:watch`
- Build + typecheck + lint + tests (87) all pass clean as of Step 03.

## Security note
`react-router-dom@6.30.4` carries two npm advisories: (1) open redirect via backslash in `<Link>`/`useNavigate`, and (2) `deserializeErrors()` SSR hydration injection. Neither applies here — all routes are internal config (no user-supplied redirect targets) and this is a pure client-side Vite SPA with no SSR/hydration path. A breaking upgrade to react-router v7 can be done in a dedicated later step if desired.
