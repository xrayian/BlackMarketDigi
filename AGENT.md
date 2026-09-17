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

## Current Phase: Phase 4 Completed — Ready for Phase 5 (Inspection & Bribe Negotiation)
- **Phase 0 (Scaffolding):** Monorepo with npm workspaces (`shared`, `server`, `client`), Colyseus 0.18 server, Vite 6 client, lobby UI.
- **Phase 1 (Rules Engine):** Pure headless TypeScript rules engine in `packages/server/src/engine/`. 100% branch and statement coverage on `debtResolution.ts` and `scoring.ts`. 76 engine unit tests.
- **Phase 2 (Colyseus Room):** Full engine wired into `NottinghamRoom` with Colyseus 0.18 and Schema 5.0. Zero-knowledge privacy filtering (`.view()`), atomic bribe buffer (`sequenceNumber`), and multi-player integration tests.
- **Phase 3 (3D Table & Scene):** Circular banquet table seating 3–6 players, dynamic camera rig, MerchantStand with instanced coin piles, facedown contraband vault, 3D merchant bag, candle flicker, bloom and vignette post-processing, reactive state sync.
- **Phase 4 (Core Loop UI):**
  - `MarketPanel`: Sheriff selects starting merchant, active merchant selects 0–5 cards to discard and confirms exchange, turn advances clockwise, draw/discard pile counters.
  - `BagLoadingPanel`: Merchants select 1–5 cards from hand, "Snap Bag Shut!" locks selection, status tracking for all merchants.
  - `DeclarationPanel`: Modal overlay with 4 legal good type buttons, auto-count from bag, sequential declaration per turn order with live status.
  - `CardDisplay`: Reusable 2D card component with type-colored backgrounds, emojis, value badges, and selection glow.
  - `ErrorToast`: Server validation errors surfaced as auto-dismissing crimson toast via `room.onMessage('error')`.
  - Zustand store extended with `selectedCardIds`, `toggleCardSelection`, `errorMessage`, `setError`.

## Gotchas & Architecture Decisions
- **Colyseus 0.18 & Schema 5.0**: Use `schema({ ... })` builder pattern instead of decorators for class fields with default collection factories to avoid ES2022 define property bugs.
- **Client SDK**: Use `@colyseus/sdk` 0.18 with `Callbacks.get(room)`. State callbacks use `room.onStateChange(...)` mapped into Zustand `useGameStore`.
- **Table Seat Angular Formula**: To guarantee the local player is always in the foreground at `-PI/2`: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2; rotY = -angle - Math.PI / 2`.
- **Three.js Instancing & Performance**: Coin piles use `instancedMesh` with a single cylinder geometry and standard gold material, allowing hundreds of coins to render with 1 draw call.
- **Strict Client TypeScript**: Vite build enforces `noUnusedLocals` strictly. Avoid unreferenced imports in 3D components.

## Build Plan Reference
The full phased build plan is in `init.md`. Work through phases in order — each has acceptance criteria that must pass before starting the next.

