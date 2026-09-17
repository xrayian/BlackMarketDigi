# Sheriff of Nottingham Digital — AGENT.md

## Tech Stack
- **Monorepo:** npm workspaces with `packages/shared`, `packages/server`, `packages/client`
- **Server:** Colyseus 0.18.x (`defineServer`, `defineRoom`, `@colyseus/schema` 5.0 builder syntax)
- **Client:** React 18 + Vite, React Three Fiber (3D), Tailwind CSS (2D UI), Zustand (state), Framer Motion (animations), `@colyseus/sdk` 0.18 (`Callbacks.get(room)`)
- **Shared:** TypeScript types, game constants, card data — imported by both server and client
- See `init.md` §1 for full rationale on each choice

## How to Run
```bash
npm install          # from repo root
npm run dev          # starts both server (port 2567) and client (port 5173)
```

## Repository Layout
```
/docs           — consultation-rulebook.md (CMON rulebook), architecture.md (PRIMARY Digital GDD & specs)
/packages
  /shared       — types, constants, card definitions, message interfaces
  /server       — Colyseus server, room, schema, pure game engine
  /client       — React + R3F game client, Tailwind UI, Zustand stores
```

## Key Decisions
- **Colyseus over NestJS+Redis:** Schema `@filter` gives us hidden-information security as a decorator, not a hand-rolled sanitization layer. See init.md §1 for details.
- **No physics engine for MVP:** Spring animations (react-spring) provide tactile feel without cross-client non-determinism.
- **Engine decoupled from networking:** All game logic in `packages/server/src/engine/` is pure functions with zero Colyseus imports, fully unit-testable.
- **Numbers from specifications only:** Card counts, values, penalties come from `docs/architecture.md` and `docs/consultation-rulebook.md` — never from memory.

## Current Phase: Phase 4 2D Core Loop Retrofit Completed — Ready for Phase 5 (Examination Desk 2D Retrofit) & Phase 8 (Anti-Cheat Hardening)
- **Phase 0 (Scaffolding):** Monorepo with npm workspaces (`shared`, `server`, `client`), Colyseus 0.18 server, Vite 6 client, lobby UI.
- **Phase 1 (Rules Engine):** Pure headless TypeScript rules engine in `packages/server/src/engine/`. 100% branch and statement coverage on `debtResolution.ts` and `scoring.ts`. 76 engine unit tests.
- **Phase 2 (Colyseus Room):** Full engine wired into `NottinghamRoom` with Colyseus 0.18 and Schema 5.0. Zero-knowledge privacy filtering (`.view()`), atomic bribe buffer (`sequenceNumber`), and multi-player integration tests.
- **Phase 3 (2D Table & Board Scene Retrofit):**
  - Replaced legacy 3D canvas with top-down 2D tabletop arena (`TableBoard2D`) supporting 3–6 seats with local player anchored in foreground.
  - `PlayerStand2D`: Nameplate, connection status, role badges, gold coin purse, legal goods bins, vaulted contraband count, royal goods count, and sealed bag indicator.
  - `MarketBoard2D`: Central market board with illustrated draw and discard piles displaying count badges and discard statistics.
  - `ActionLedger`: Collapsible event log keeping historical record of phase changes, trades, and inspection results.
  - `tokens.ts`: Centralized theme palette (parchment, walnut, gold, crimson, emerald, contraband, royal) and motion presets.
  - Uninstalled all dead 3D dependencies (`@react-three/fiber`, `@react-three/drei`, `three`, `@react-spring/three`, `@react-three/postprocessing`).
- **Phase 4 (2D Core Loop UI Retrofit):**
  - `HandCardFan`: Card fan with arc curvature (`(i - c) * angle`), hover-to-lift (`y: -32`, `scale: 1.12`, `rotate: 0`), and selection badges.
  - `MerchantBagDropZone`: Tactile burlap sack drop target with `@dnd-kit/core` droppable integration, glowing hover ring, Framer Motion puff animation on card add, and squash-then-settle animation on bag snap.
  - `@dnd-kit/core` Drag-and-Drop: Accessible via both pointer/touch and keyboard (`KeyboardSensor`).
  - `DeclarationPanel`: Compact inline parchment panel (non-blocking) with 4 legal good tokens (`GOOD_TOKENS`), auto-locked declared count equal to bag size, and wax-seal stamp animation on proclamation.
  - `MarketPanel`: Discard-and-draw market stalls using fanned hand card tray and tactile start player picker for Sheriff.
- **Phase 5 (Inspection & Bribe Negotiation - "The Examination Desk"):**
  - Procedural sound manager generating 1.2s tension sound ramp, mechanical bag snap, coin clink, gavel strike, and outcome stingers.
  - `BribeScale`: Animated balance scale whose beam tilts dynamically using spring physics based on total bribe weight (coins, stand goods, bag claims).
  - `UnsnapClasp`: Sheriff's 1.2s sustained hold interaction with tension audio ramp, release cancellation at <1.1s without state mutation, and snap crack at 1.2s.
  - `BribeNegotiationPanel`: Bribe proposal builder with gold sliders, stand cards selection, promised goods, and 1.5s reaction buffer lock on modified offers.
  - `InspectionOutcomeModal`: Visual feedback for Pass Unopened, Honest, and Dishonest outcomes, plus guided 4-step debt liquidation display.
  - `ExaminationDesk`: Full orchestrator component connecting merchant interrogation, scale, negotiation, and inspection actions.
- **Phase 6 (Expansion Modules):**
  - **Royal Goods**: 12 royal cards (6 for 3p) filtered/shuffled into deck, treated as contraband through inspection, stored in private `standRoyal`, converted to legal equivalent counts for King/Queen bonus scoring plus face value scored.
  - **6-Player Deputies**: 2 deputies assigned per round, communal `bootyTile` collecting joint pass bribes and dishonesty fines, joint/solo pass/inspect decisions (`JOINT_PASS`, `JOINT_INSPECT`, `SOLO_PASS`, `SOLO_INSPECT`), equal booty split at round end (odd remainder discarded), game over at 9 rounds or 3 deck depletions.
  - **Black Market**: 3 order piles (Pepper 14/10, Mead 16/12, Silk 18/14), 3-matching-contraband trade-in per merchant per round via `claim_black_market`, client `BlackMarketPanel` order board.
  - **Lobby Options**: Togglable expansion settings on room creation and dynamic host controls in lobby (`update_lobby_options`).
  - **Test Suite**: 84 tests passing across 13 test files covering each module independently and a 6-player end-to-end integration test with all modules enabled.
- **Phase 7 (Micro-interactions, Audio, Visual Polish & Accessibility):**
  - `soundManager`: Full procedural Web Audio API audio suite including continuous cozy tavern ambience loop (warm hearth fireplace rumble, ember micro-crackles, low resonant drone), tactile card slide SFX (`playCardSlide`), metallic scale hinge tipping sound (`playScaleTip`), bag latch snap (`playSnap`), and outcome fanfares/discord stingers.
  - `SettingsModal`: Dedicated UI modal accessible from Lobby and Game Scene offering audio controls (SFX on/off, Tavern Ambience on/off) and accessibility preferences (Reduced Motion on/off, Color-Independent Card Guide).
  - `CardDisplay`: Color-independent card classification badges (⚖️ Legal, ⚜️ Contraband, 👑 Royal) with visible value and penalty stats.
  - `BribeScale`: Synchronized scale-tipping audio and non-overshoot spring transitions under Reduced Motion.

## Gotchas & Architecture Decisions
- **Colyseus 0.18 & Schema 5.0**: Use `schema({ ... })` builder pattern instead of decorators for class fields with default collection factories to avoid ES2022 define property bugs.
- **Client SDK**: Use `@colyseus/sdk` 0.18 with `Callbacks.get(room)`. State callbacks use `room.onStateChange(...)` mapped into Zustand `useGameStore`.
- **Table Seat Angular Formula**: To guarantee the local player is always in the foreground at `-PI/2`: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2; rotY = -angle - Math.PI / 2`.
- **Three.js Instancing & Performance**: Coin piles use `instancedMesh` with a single cylinder geometry and standard gold material, allowing hundreds of coins to render with 1 draw call.
- **Strict Client TypeScript**: Vite build enforces `noUnusedLocals` strictly. Avoid unreferenced imports in 3D components.

## Build Plan Reference
The full phased build plan is in `init.md`. Work through phases in order — each has acceptance criteria that must pass before starting the next.

