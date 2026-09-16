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

## Current Phase: Phase 0 Completed — Ready for Phase 1 (Rules Engine)
- Monorepo scaffolded and verified with npm workspaces (`shared`, `server`, `client`)
- Colyseus 0.18 server boots and exposes `NottinghamRoom`
- Client connects with `@colyseus/sdk` 0.18 using `Callbacks.get(room)`
- Room code generator creates clean 4-character uppercase codes
- End-to-end integration test passes in Vitest (`packages/server/test/rooms/NottinghamRoom.test.ts`)
- Acceptance criteria for Phase 0 verified: `npm run dev` boots both, two tabs join same room and see each other in lobby

## Gotchas & Architecture Decisions
- **Colyseus 0.18 & Schema 5.0**: Use `schema({ ... })` builder pattern instead of decorators for class fields with default collection factories to avoid ES2022 define property bugs.
- **Client SDK**: Use `@colyseus/sdk` 0.18 with `Callbacks.get(room)` instead of legacy `colyseus.js` 0.16. State callbacks use `callbacks.listen(...)`, `callbacks.onAdd(...)`, and `room.onStateChange(...)`.
- **Room IDs**: Default Colyseus nanoids are mixed-case 9-char strings; `NottinghamRoom` sets `this.roomId = generateRoomCode()` to provide clean 4-letter uppercase codes without visual ambiguity.

## Build Plan Reference
The full phased build plan is in `init.md`. Work through phases in order — each has acceptance criteria that must pass before starting the next.
