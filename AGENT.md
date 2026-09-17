# Sheriff of Nottingham Digital — AGENT.md

## Tech Stack
- **Monorepo:** npm workspaces with `packages/shared`, `packages/server`, `packages/client`
- **Server:** Colyseus 0.18.x (`defineServer`, `defineRoom`), `@colyseus/schema` 5.0 (decorator-free `schema()` and `t.*` builder syntax)
- **Client:** React 18 + Vite 6, Tailwind CSS with centralized design tokens (`src/theme/tokens.ts`), Framer Motion (physics spring animations), `@dnd-kit/core` & `@dnd-kit/utilities` (accessible drag-and-drop), Zustand (state store), `@colyseus/sdk` 0.18
- **Audio Engine:** Custom procedural Web Audio API synthesizer (`soundManager.ts`) with zero external sound files
- **Shared:** TypeScript types, game constants, card catalog, message interfaces
- **Deployment:** Docker Compose, Node 22 Alpine, Nginx reverse proxy with dynamic WS/WSS autodetection, Let's Encrypt SSL
- See `init.md` §1 for full rationale on each architectural choice

## How to Run
```bash
npm install          # from repo root
npm run dev          # starts both server (port 2567) and client (port 5173)
npm test             # runs all 88 unit & integration tests
npm run build        # builds shared, server, and client packages
```

## Repository Layout
```
/docs           — consultation-rulebook.md (CMON rulebook), architecture.md (PRIMARY GDD), hosting.md, azure-deployment-guide.md
/deploy         — azure-setup.sh, setup-ssl.sh, update.sh (turnkey cloud VM automation)
/nginx          — default.conf, ssl.conf (reverse proxy routing SPA assets and WebSocket upgrades)
/packages
  /shared       — types, constants, card definitions, message interfaces
  /server       — Colyseus server, room, schema, pure game engine, fuzzing tests
  /client       — React 2D tabletop client, Tailwind UI, Zustand store, procedural Web Audio synthesizer
```

## Key Decisions & Conventions
- **Colyseus over NestJS+Redis:** Schema `.view()` provides authoritative hidden-information isolation over the wire without a hand-rolled sanitization layer.
- **Pure 2D Tabletop Canvas:** Top-down DOM/SVG rendering with Framer Motion springs and `@dnd-kit/core` drag-and-drop replaces legacy 3D canvas, ensuring silky 60fps on mobile and low-tier hardware.
- **Zero External Audio Assets:** All sounds (bag snap, coin clink, scale tip, card slide, fireplace ambience, fanfares) are procedurally generated via the Web Audio API.
- **Engine Decoupled from Networking:** All game logic in `packages/server/src/engine/` consists of pure functions with zero Colyseus imports, with 100% branch and statement coverage.
- **Numbers from Specifications Only:** Card counts, values, penalties come strictly from `docs/architecture.md` and `docs/consultation-rulebook.md`.
- **Zero Port Friction & Dynamic Connection Discovery:** Nginx routes both SPA assets and WebSocket streams across port 80/443; `packages/client/src/net/colyseus.ts` discovers host/protocol at runtime without hardcoded IPs.

## Project Phases Status: All Phases 0–9 Complete (100% Verified)
- **Phase 0 (Scaffolding):** Monorepo with npm workspaces (`shared`, `server`, `client`), Colyseus 0.18 server, Vite 6 client, lobby UI.
- **Phase 1 (Rules Engine):** Pure headless TypeScript rules engine in `packages/server/src/engine/`. 100% branch and statement coverage on `debtResolution.ts` and `scoring.ts`.
- **Phase 2 (Colyseus Room):** Full engine wired into `NottinghamRoom` with Colyseus 0.18 and Schema 5.0. Zero-knowledge privacy filtering (`.view()`), atomic bribe buffer (`sequenceNumber`), and multi-player integration tests.
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
  - `MarketPanel`: Discard-and-draw market stalls using fanned hand card tray and tactile start player picker for Sheriff.
- **Phase 5 (2D Examination Desk & Inspection Retrofit):**
  - `ExaminationDesk`: Full-screen 2D overlay framing Sheriff/Deputy and Merchant portrait cards around a large central sealed bag and declaration banner.
  - `BribeScale`: 2D illustrated brass balance beam with hanging pans, tilting proportionally via Framer Motion spring physics based on bribe weight, with tipping audio.
  - `UnsnapClasp`: 2D radial SVG progress ring around a wax-seal clasp with exact 1.2s hold duration, tension audio ramp, and clean cancellation at <1.1s.
  - `StaggeredCardReveal`: Staggered card flip reveal (~140ms delay) with radiant color-coded halos (emerald for legal, violet/crimson for contraband).
  - `UnfurlingLedger`: Scroll-unfurl parchment receipt displaying statutory 4-step debt liquidation order with animated strikethroughs and checkmarks.
  - `BribeNegotiationPanel`: Atomic proposal builder with 1.5s reaction buffer lock on modified offers.
- **Phase 6 (Expansion Modules):**
  - **Royal Goods**: 12 royal cards (6 for 3p) filtered/shuffled into deck, treated as contraband through inspection, stored in private `standRoyal`, converted to legal equivalent counts for King/Queen bonus scoring plus face value scored.
  - **6-Player Deputies**: 2 deputies assigned per round, communal `bootyTile` collecting joint pass bribes and dishonesty fines, joint/solo pass/inspect decisions (`JOINT_PASS`, `JOINT_INSPECT`, `SOLO_PASS`, `SOLO_INSPECT`), equal booty split at round end (odd remainder discarded), game over at 9 rounds or 3 deck depletions.
  - **Black Market**: 3 order piles (Pepper 14/10, Mead 16/12, Silk 18/14), 3-matching-contraband trade-in per merchant per round via `claim_black_market`, client `BlackMarketPanel` order board.
- **Phase 7 (Procedural Audio, Visual Polish & Accessibility):**
  - `soundManager`: Procedural Web Audio API synthesizer with cozy tavern ambience, tactile card slide, scale tipping, bag snap, and fanfare/stinger cues.
  - `SettingsModal`: Audio controls and accessibility preferences (Reduced Motion, Color-Independent Card Guide).
  - `CardDisplay`: Color-independent card classification badges (⚖️ Legal, ⚜️ Contraband, 👑 Royal).
- **Phase 8 (Anti-Cheat Hardening & Fuzzing):**
  - Strict server-side action validation: All rejected operations emit `{ message: string }` errors.
  - `AntiCheatFuzzing.test.ts`: Fuzzing suite simulating out-of-phase messages, spoofed cards, negative bribes, bag tampering, and memory leak checks.
  - All 10 items in `Issues.md` resolved (multi-merchant bribe queue, self-set bribe crash fix, card hover z-index trap fix, clasp button sizing fix, minimizable bottomsheets, discard selection resets).
  - All 88 tests passing across 14 test files.
- **Phase 9 (Cloud VM Deployment & Containerization):**
  - Multi-stage production Dockerfiles (`Dockerfile.server`, `Dockerfile.client`).
  - Unified Nginx reverse proxy (`nginx/default.conf`) handling static assets and Colyseus WebSocket upgrade traffic.
  - Dynamic client WebSocket autodetection (`getWsUrl()`) matching host and protocol (`ws://` vs `wss://`).
  - Root `docker-compose.yml` with healthchecks and network isolation.
  - Automated deployment scripts in `deploy/` (`azure-setup.sh`, `setup-ssl.sh`, `update.sh`).
  - Comprehensive documentation in `docs/hosting.md` and `docs/azure-deployment-guide.md`.

## Gotchas & Architecture Reference
- **Colyseus 0.18 & Schema 5.0**: Use `schema({ ... })` builder pattern instead of decorators for class fields with default collection factories to avoid ES2022 define property bugs.
- **Client SDK**: Use `@colyseus/sdk` 0.18 with `Callbacks.get(room)`. State callbacks use `room.onStateChange(...)` mapped into Zustand `useGameStore`.
- **Table Seat Angular Formula**: To guarantee the local player is always in the foreground at `-PI/2`: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2`.
- **Strict Client TypeScript**: Vite build enforces `noUnusedLocals` strictly. Avoid unreferenced imports in TSX components.
- **Nginx WebSocket Keep-Alive**: Always maintain `proxy_read_timeout 86400s;` and `proxy_send_timeout 86400s;` to prevent idle connection termination.
