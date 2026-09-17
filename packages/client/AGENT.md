# Client Package — AGENT.md

## Tech Stack
- React 18 + Vite + TypeScript
- Tailwind CSS with centralized theme tokens (`src/theme/tokens.ts`)
- Framer Motion for 2D tabletop animations, fanned card hover, and bag squash-and-settle
- `@dnd-kit/core` & `@dnd-kit/utilities` for accessible drag-and-drop interactions (pointer + keyboard)
- Zustand for client-side state
- `@colyseus/sdk` 0.18 (`Callbacks.get(room)`) for server connection and reactive state sync
- Procedural Web Audio API synthesizer in `soundManager.ts` (zero external asset dependencies)

## Architecture
- `/ui/table2d` — 2D Tabletop Arena (`TableBoard2D`), Player Stands (`PlayerStand2D`), Market Board (`MarketBoard2D`), Event Ledger (`ActionLedger`), Card Fan (`HandCardFan`), Bag Drop Zone (`MerchantBagDropZone`)
- `/ui` — Core HUD, Dialogs, Modals (`BagLoadingPanel`, `DeclarationPanel`, `MarketPanel`, `ExaminationDesk`, `SettingsModal`, `ErrorToast`)
- `/theme` — Theme design tokens (`tokens.ts`) defining colors, typography, good tokens, and motion presets
- `/scene` — Main 2D game arena shell (`GameScene.tsx`)
- `/net` — Colyseus client connection and room state sync
- `/state` — Zustand store (`gameStore.ts`)
- `/audio` — Procedural Web Audio synthesizer (`soundManager.ts`)

## Conventions
- Pure 2D DOM rendering with Tailwind CSS and Framer Motion. All dead 3D dependencies (`three`, `@react-three/*`, etc.) have been excised.
- Network layer syncs Colyseus state → Zustand store. Components read from Zustand only.
- Centralized color tokens in `src/theme/tokens.ts` (walnut, parchment, gold, crimson, emerald, contraband, royal).
- Font: Cinzel (`font-display`) for titles/badges/labels, Inter (`font-body`) for body text.

## Current Phase: Phase 5 2D Retrofit Completed — Ready for Phase 8 (Anti-Cheat Hardening & Testing)
- **Phase 3 (2D Table & Board Scene Retrofit):**
  - Replaced legacy 3D canvas with top-down 2D tabletop arena (`TableBoard2D`) supporting 3–6 seats with local player anchored in foreground.
  - `PlayerStand2D`: Nameplate, connection status, role badges, gold coin purse, legal goods bins, vaulted contraband count, royal goods count, and sealed bag indicator.
  - `MarketBoard2D`: Central market board with illustrated draw and discard piles displaying count badges and discard statistics.
  - `ActionLedger`: Collapsible event log keeping historical record of phase changes, trades, and inspection results.
- **Phase 4 (2D Core Loop UI Retrofit):**
  - `HandCardFan`: Card fan with arc curvature (`(i - c) * angle`), hover-to-lift (`y: -32`, `scale: 1.12`, `rotate: 0`), and selection badges.
  - `MerchantBagDropZone`: Tactile burlap sack drop target with `@dnd-kit/core` droppable integration, glowing hover ring, Framer Motion puff animation on card add, and squash-then-settle animation on bag snap.
  - `@dnd-kit/core` Drag-and-Drop: Accessible via both pointer/touch and keyboard (`KeyboardSensor`).
  - `DeclarationPanel`: Compact inline parchment panel (non-blocking) with 4 legal good tokens (`GOOD_TOKENS`), auto-locked declared count equal to bag size, and wax-seal stamp animation on proclamation.
  - `MarketPanel`: Discard-and-draw market stalls using fanned hand card tray and tactile start player picker for Sheriff.
- **Phase 5 (2D Examination Desk & Inspection Retrofit):**
  - `ExaminationDesk`: Full-screen 2D overlay framing Sheriff/Deputy and Merchant portrait cards around a large central sealed bag and declaration banner.
  - `BribeScale`: 2D illustrated brass balance beam with hanging pans, tilting proportionally via Framer Motion spring physics based on bribe weight, with tipping audio.
  - `UnsnapClasp`: 2D radial SVG progress ring around a wax-seal clasp with exact 1.2s hold duration, tension audio ramp, and clean cancellation at <1.1s.
  - `StaggeredCardReveal`: Staggered card flip reveal (~140ms delay) with radiant color-coded halos (emerald for legal, violet/crimson for contraband).
  - `UnfurlingLedger`: Scroll-unfurl parchment receipt displaying statutory 4-step debt liquidation order (Gold → Stand Legal → Stand Contraband → Debt Forgiveness) with animated strikethroughs and checkmarks.
  - `BribeNegotiationPanel`: Atomic proposal builder with 1.5s reaction buffer lock on modified offers.
- **Phase 7 (Micro-interactions, Audio, Visual Polish & Accessibility):**
  - `soundManager.ts`: Procedural Web Audio API audio suite including continuous cozy tavern ambience loop (warm hearth fireplace rumble, ember micro-crackles, low resonant drone), tactile card slide SFX (`playCardSlide`), metallic scale hinge tipping sound (`playScaleTip`), bag latch snap (`playSnap`), and outcome fanfares/discord stingers.
  - `SettingsModal.tsx`: Dedicated UI modal accessible from Lobby and Game Scene offering audio controls (SFX on/off, Tavern Ambience on/off) and accessibility preferences (Reduced Motion on/off, Color-Independent Card Guide).
  - `CardDisplay.tsx`: Color-independent card classification badges (⚖️ Legal, ⚜️ Contraband, 👑 Royal) with visible value and penalty stats.

## Gotchas & Decisions
- **Zero-Knowledge State**: Client never receives other players' hand cards or sealed bag contents; only public counts are synchronized.
- **Vite 6 strict TS**: `noUnusedLocals` is enabled. All imports must be actively referenced in TSX files.

