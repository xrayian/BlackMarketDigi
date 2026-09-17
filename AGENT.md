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
/docs           — GDD (source of truth for rules/numbers), architecture notes
/packages
  /shared       — types, constants, card definitions, message interfaces
  /server       — Colyseus server, room, schema, pure game engine
  /client       — React + R3F game client, Tailwind UI, Zustand stores
```

## Key Decisions
- **Colyseus over NestJS+Redis:** Schema `@filter` gives us hidden-information security as a decorator, not a hand-rolled sanitization layer. See init.md §1 for details.
- **No physics engine for MVP:** Spring animations (react-spring) provide tactile feel without cross-client non-determinism.
- **Engine decoupled from networking:** All game logic in `packages/server/src/engine/` is pure functions with zero Colyseus imports, fully unit-testable.
- **Numbers from GDD only:** Card counts, values, penalties come from `docs/GDD.md` — never from memory.

## Current Phase: Phase 3 Completed — Ready for Phase 4 (Core Loop UI)
- **Phase 0 (Scaffolding):** Monorepo with npm workspaces (`shared`, `server`, `client`), Colyseus 0.18 server, Vite 6 client, lobby UI.
- **Phase 1 (Rules Engine):** Pure headless TypeScript rules engine in `packages/server/src/engine/`. 100% branch and statement coverage on `debtResolution.ts` and `scoring.ts`. 76 engine unit tests.
- **Phase 2 (Colyseus Room):** Full engine wired into `NottinghamRoom` with Colyseus 0.18 and Schema 5.0. Zero-knowledge privacy filtering (`.view()`), atomic bribe buffer (`sequenceNumber`), and multi-player integration tests.
- **Phase 3 (3D Table & Scene):**
  - Circular banquet table seating 3–6 players without overlap; local player always anchored in bottom foreground.
  - Dynamic `CameraRig` clamped to table with local player seat view.
  - `MerchantStand`: Instanced cylinder coin piles scaling with player gold count, 4 legal goods compartments, facedown contraband vault with wax seal medallion and aggregate count.
  - `MerchantBag3D`: Pouch mesh with livery tint, cinch ring, metallic clasp, and status tag.
  - Atmosphere: Candle flicker (`useFrame`), warm key & rim lighting, bloom and vignette post-processing (`@react-three/postprocessing`).
  - Reactive sync: `room.onStateChange` -> `useGameStore` -> 3D scene props.

## Gotchas & Architecture Decisions
- **Colyseus 0.18 & Schema 5.0**: Use `schema({ ... })` builder pattern instead of decorators for class fields with default collection factories to avoid ES2022 define property bugs.
- **Client SDK**: Use `@colyseus/sdk` 0.18 with `Callbacks.get(room)`. State callbacks use `room.onStateChange(...)` mapped into Zustand `useGameStore`.
- **Table Seat Angular Formula**: To guarantee the local player is always in the foreground at `-PI/2`: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2; rotY = -angle - Math.PI / 2`.
- **Three.js Instancing & Performance**: Coin piles use `instancedMesh` with a single cylinder geometry and standard gold material, allowing hundreds of coins to render with 1 draw call.
- **Strict Client TypeScript**: Vite build enforces `noUnusedLocals` strictly. Avoid unreferenced imports in 3D components.

## Build Plan Reference
The full phased build plan is in `init.md`. Work through phases in order — each has acceptance criteria that must pass before starting the next.

