# Server Package — AGENT.md

## Tech Stack
- Colyseus 0.18.x (`defineServer`, `defineRoom`, `Room<{ state: GameState }>`)
- `@colyseus/schema` 5.0 with decorator-free `schema()` and `t.*` builder pattern
- TypeScript strict mode with tsx in dev and tsc in build
- Multi-stage Node 22 Alpine Docker container (`Dockerfile.server`)

## Architecture
- `/rooms` — Colyseus room definitions. `NottinghamRoom.ts` is the authoritative room controller.
- `/schema` — Colyseus Schema classes. State is server-authoritative; clients get filtered views via `.view()`.
- `/engine` — Pure game logic functions, zero networking/rendering. Fully unit-tested (100% statement & branch coverage).
- `/engine/phases` — One file per game phase (`market.ts`, `loadBag.ts`, `declaration.ts`, `inspection.ts`, `roundEnd.ts`).
- `/engine/modules` — Expansion module logic (`royalGoods.ts`, `deputies.ts`, `blackMarket.ts`), enabled via room options.
- `/test/rooms` — Room integration tests, module tests, and adversarial fuzz tests (`AntiCheatFuzzing.test.ts`).

## Conventions
- Engine functions are pure: they take state + action, return new state or mutations. No Colyseus imports in `engine/`.
- Room layer calls engine functions and applies mutations to schema state.
- All message handlers validate inputs server-side even if client UI prevents invalid actions.
- Any invalid action must send a structured error message to the client: `client.send('error', { message: '...' })`.
- Hidden information (other players' hand cards, uninspected bag cards) must never be sent across the wire; enforce via `.view(sessionId)`.

## Phase History & Verified Milestone Status: All Complete (Phases 0–9)
- **Phase 1 (Rules Engine):** Pure TypeScript engine in `src/engine/` (zero Colyseus imports). 76 unit tests with 100% branch/statement coverage on `debtResolution.ts` and `scoring.ts`.
- **Phase 2 (Room Integration):**
  - `NottinghamRoom.ts`: Implemented using `@colyseus/schema` 5.0 builder syntax and `@colyseus/sdk` 0.18.
  - Phase state machine: Maps all engine phases (`LOBBY` -> `MARKET` -> `LOAD_BAG` -> `DECLARATION` -> `INSPECTION` -> `ROUND_END` -> `GAME_END`) to room state.
  - Zero-Knowledge Security: Schema views (`.view(sessionId)`) ensure non-owning clients never receive another player's hand cards or sealed bag cards until inspected.
  - Atomic Bribes: `BribeOffer` tracks an atomic `sequenceNumber` to invalidate stale accepts across network jitter.
- **Phase 6 (Expansion Modules Integration):**
  - `RoyalGoodsModule`: Added Royal Goods deck configuration per player count, sealed bag zero-knowledge routing to `standRoyal`, and legal equivalent bonus calculation in endgame scoring.
  - `DeputiesModule`: 6-player deputy rotation (2 deputies per round), communal `BootyTileState` (`gold` + `goods`), `deputy_inspection` handler executing `JOINT_PASS`, `JOINT_INSPECT`, `SOLO_PASS`, and `SOLO_INSPECT`, round-end even booty split (odd remainder discarded), and game termination condition (9 rounds or 3 deck depletions).
  - `BlackMarketModule`: 3 persistent order piles (`blackMarketPepperPile`, `blackMarketMeadPile`, `blackMarketSilkPile`), `claim_black_market` handler enforcing 1 claim per merchant per round and 3-contraband sacrifice from stand, resetting on round transition.
- **Phase 8 (Anti-Cheat Hardening & Fuzzing):**
  - Rigid server-side validation on every handler (`load_bag`, `declaration`, `bribe_offer`, `accept_bribe`, `pass_bag`, `inspect_bag`, `deputy_inspection`, `claim_black_market`).
  - Structured `{ message: string }` error emissions for bad phases, unowned cards, negative gold, or invalid roles.
  - Added comprehensive `AntiCheatFuzzing.test.ts` testing adversarial client tampering, bag spoofing, out-of-phase actions, and memory leak prevention on room disposal.
  - All 88 tests passing across 14 test files.
- **Phase 9 (Deployment & Containerization):**
  - Multi-stage `Dockerfile.server` with Node 22 Alpine, building shared and server workspaces, running as non-root `node` user on port 2567.
  - Integrated with `docker-compose.yml` healthcheck.

## Gotchas & Decisions
- **Reconnection Window**: When a client reconnects, Colyseus 0.18 requires `min uptime: 5000ms` for seamless seat reservation restoration.
- **Atomic Reaction Buffer**: Never accept a bribe without verifying the current offer's `sequenceNumber` matches what was received to avoid race conditions.
- **Error Propagation**: Always use `client.send('error', { message })` with clear human-readable strings so the client's `ErrorToast` can surface the violation.
