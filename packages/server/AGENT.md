# Server Package — AGENT.md

## Tech Stack
- Colyseus 0.18.x (`defineServer`, `defineRoom`, `Room<{ state: GameState }>`)
- @colyseus/schema 5.0 with decorator-free `schema()` and `t.*` builder pattern
- TypeScript strict mode with tsx in dev

## Architecture
- `/rooms` — Colyseus room definitions. `NottinghamRoom` is the only room.
- `/schema` — Colyseus Schema classes. State is server-authoritative; clients get filtered views via `@filter()`.
- `/engine` — Pure game logic functions, zero networking/rendering. Fully unit-testable.
- `/engine/phases` — One file per game phase (market, loadBag, declaration, inspection, roundEnd).
- `/engine/modules` — Expansion module logic (royalGoods, deputies, blackMarket), behind feature flags.

## Conventions
- Engine functions are pure: they take state + action, return new state or mutations. No Colyseus imports in engine/.
- Room layer calls engine functions and applies mutations to schema state.
- All message handlers validate inputs server-side even if client UI prevents invalid actions.

## Current Phase: Phase 0 Completed
- `NottinghamRoom` supports lobby join, leave, ready toggling, and clean 4-character room codes
- Integration test in `test/rooms/NottinghamRoom.test.ts` asserts end-to-end multi-client room matchmaking and state replication
- Ready for Phase 1 (headless rules engine under `src/engine/`)
