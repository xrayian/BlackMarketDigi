# Client Package — AGENT.md

## Tech Stack
- React 18 + Vite 6 + TypeScript 5
- Tailwind CSS with centralized theme tokens (`src/theme/tokens.ts`)
- Framer Motion for 2D tabletop animations, fanned card hover, and bag squash-and-settle
- `@dnd-kit/core` & `@dnd-kit/utilities` for accessible drag-and-drop interactions (pointer + keyboard)
- Zustand for client-side state (`gameStore.ts`)
- `@colyseus/sdk` 0.18 for server connection and reactive state sync
- Procedural Web Audio API synthesizer in `soundManager.ts` (zero external audio dependencies)

## Architecture
- `/ui/table2d` — 2D Tabletop Arena (`TableBoard2D`), Player Stands (`PlayerStand2D`), Market Board (`MarketBoard2D`), Event Ledger (`ActionLedger`), Card Fan (`HandCardFan`), Bag Drop Zone (`MerchantBagDropZone`)
- `/ui` — Core HUD, Dialogs, Modals (`BagLoadingPanel`, `DeclarationPanel`, `MarketPanel`, `ExaminationDesk`, `SettingsModal`, `ErrorToast`, `BlackMarketPanel`)
- `/theme` — Theme design tokens (`tokens.ts`) defining colors, typography, good tokens, and motion presets
- `/scene` — Main 2D game arena shell (`GameScene.tsx`)
- `/net` — Colyseus client connection manager (`colyseus.ts`) with dynamic runtime host/protocol inference
- `/state` — Zustand store (`gameStore.ts`)
- `/audio` — Procedural Web Audio synthesizer (`soundManager.ts`)

## Conventions
- Pure 2D DOM rendering with Tailwind CSS and Framer Motion. Zero 3D dependencies.
- Network layer syncs Colyseus state → Zustand store. Components read from Zustand only.
- Centralized color tokens in `src/theme/tokens.ts` (walnut, parchment, gold, crimson, emerald, contraband, royal).
- Font: Cinzel (`font-display`) for titles/badges/labels, Inter (`font-body`) for body text.

## Phase History & Verified Milestone Status: All Complete (Phases 0–9)
- **Phase 3 (2D Table & Board Scene Retrofit):**
  - Top-down 2D tabletop arena (`TableBoard2D`) supporting 3–6 seats with local player anchored in foreground.
  - `PlayerStand2D`: Nameplate, connection status, role badges, gold coin purse, legal goods bins, vaulted contraband count, royal goods count, and sealed bag indicator.
  - `MarketBoard2D`: Central market board with illustrated draw and discard piles displaying count badges and discard statistics.
  - `ActionLedger`: Collapsible event log keeping historical record of phase changes, trades, and inspection results.
- **Phase 4 (2D Core Loop UI Retrofit):**
  - `HandCardFan`: Card fan with arc curvature (`(i - c) * angle`), hover-to-lift (`y: -32`, `scale: 1.12`, `rotate: 0`), and selection badges.
  - `MerchantBagDropZone`: Tactile burlap sack drop target with `@dnd-kit/core` droppable integration, glowing hover ring, Framer Motion puff animation on card add, and squash-then-settle animation on bag snap.
  - `@dnd-kit/core` Drag-and-Drop: Accessible via both pointer/touch and keyboard (`KeyboardSensor`).
  - `DeclarationPanel`: Compact inline parchment panel (non-blocking) with 4 legal good tokens (`GOOD_TOKENS`), auto-locked declared count equal to bag size, and wax-seal stamp animation on proclamation.
  - `MarketPanel`: Discard-and-draw market stalls using fanned hand card tray and tactile start player picker for Sheriff. Minimizable via bottomsheet toggle.
- **Phase 5 (2D Examination Desk & Inspection Retrofit):**
  - `ExaminationDesk`: Full-screen 2D overlay framing Sheriff/Deputy and Merchant portrait cards around a large central sealed bag and declaration banner.
  - `BribeScale`: 2D illustrated brass balance beam with hanging pans, tilting proportionally via Framer Motion spring physics based on bribe weight, with tipping audio.
  - `UnsnapClasp`: 2D radial SVG progress ring around a wax-seal clasp with exact 1.2s hold duration, tension audio ramp, and clean cancellation at <1.1s.
  - `StaggeredCardReveal`: Staggered card flip reveal (~140ms delay) with radiant color-coded halos (emerald for legal, violet/crimson for contraband).
  - `UnfurlingLedger`: Scroll-unfurl parchment receipt displaying statutory 4-step debt liquidation order (Gold → Stand Legal → Stand Contraband → Debt Forgiveness) with animated strikethroughs and checkmarks.
  - `BribeNegotiationPanel`: Atomic proposal builder with 1.5s reaction buffer lock on modified offers.
- **Phase 6 (Expansion Modules UI):**
  - Royal goods icons and bonus card indicators.
  - 6-Player Deputies inspection banner with communal Booty Tile gold/goods counter.
  - `BlackMarketPanel` order board showing available contraband contracts and claim buttons.
- **Phase 7 (Micro-interactions, Audio & Accessibility):**
  - `soundManager.ts`: Full procedural Web Audio suite (hearth ambient loop, card slides, brass scale tips, bag snap, victory fanfare, discord stinger).
  - `SettingsModal.tsx`: Controls for SFX volume, tavern ambience toggle, reduced motion toggle, and color-independent card guides.
  - `CardDisplay.tsx`: Color-independent badges (⚖️ Legal, ⚜️ Contraband, 👑 Royal).
- **Phase 8 (Anti-Cheat & UX Hardening - Issues.md Resolutions):**
  - Resolved self-set bribe crash in `ExaminationDesk.tsx`.
  - Added multi-merchant bribe offer queue tabs in `ExaminationDesk.tsx` allowing the Sheriff to review and accept offers from any merchant without state collisions.
  - Fixed card hover z-index stacking trap in `HandCardFan.tsx`.
  - Corrected wax seal button sizing in `UnsnapClasp.tsx` (`w-18` typo fixed to `w-20`).
  - Added minimizable bottomsheets to `MarketPanel.tsx` and `BagLoadingPanel.tsx` so merchants can inspect the tabletop arena during their turn.
  - Reset discard card selections on turn/phase transitions in `gameStore.ts`.
- **Phase 9 (Deployment Configuration):**
  - Dynamic runtime WebSocket protocol and host detection (`getWsUrl()`) in `colyseus.ts`.
  - Multi-stage Docker build via `Dockerfile.client` and Nginx reverse proxy.

## Gotchas & Decisions
- **Dynamic Host Discovery**: `colyseus.ts` derives WebSocket connection URL from `window.location.host` and `window.location.protocol`. Never hardcode `localhost` in client components.
- **Zero-Knowledge State**: Client never receives other players' hand cards or sealed bag contents; only public counts are synchronized.
- **Vite 6 Strict TS**: `noUnusedLocals` is enabled. All imports must be actively referenced in TSX files.
- **Z-Index Traps**: In CSS absolute/fixed layouts, ensure hovering elements assign appropriate dynamic z-indices (`isHovered ? 50 : index`) to prevent parent stacking contexts from swallowing clicks.
