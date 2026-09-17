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

## Current Phase: Phase 2 Completed (Colyseus Room Integration)
- **Phase 1 (Rules Engine):** Pure TypeScript engine in `src/engine/` (zero Colyseus imports). 76 unit tests with 100% branch/statement coverage on `debtResolution.ts` and `scoring.ts`.
- **Phase 2 (Room Integration):**
  - `NottinghamRoom.ts`: Implemented using `@colyseus/schema` 5.0 builder syntax and `@colyseus/sdk` 0.18.
  - Phase state machine: Maps all engine phases (LOBBY -> MARKET -> LOAD_BAG -> DECLARATION -> INSPECTION -> ROUND_END -> GAME_END) to room state.
  - Zero-Knowledge Security: Schema views (`.view(sessionId)`) ensure non-owning clients never receive another player's hand cards or sealed bag cards until inspected.
  - Atomic Bribes: `BribeOffer` tracks an atomic `sequenceNumber` to invalidate stale accepts across network jitter.
  - Vitest integration suite: End-to-end 4-player test simulating round progression, state transitions, and privacy verification. All 80 tests pass.
- Ready for Phase 4: Client message handling for Market, Load Bag, and Declaration.


