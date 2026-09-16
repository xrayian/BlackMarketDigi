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

## Current Phase: Phase 1 Completed (Headless Rules Engine)
- Headless, pure TypeScript rules engine under `src/engine/` (zero Colyseus/networking imports).
- Modules:
  - `deck.ts`: Complete deck builders for 3 vs 4-6 players (156 vs 204 base cards; 162 vs 216 with Royal Goods), card shuffling, discard sweep, draw & reshuffle-on-empty.
  - `phases/market.ts`: Discard-and-redraw logic, clockwise merchant sequencing skipping Sheriff, faceup set-aside and discard sweep.
  - `phases/loadBag.ts`: Validation of 1-5 cards from hand, immutable bag snap sealing.
  - `phases/declaration.ts`: Strict validation of declaration count equal to bag size, 1 of 4 legal goods, clockwise from Sheriff's left.
  - `phases/inspection.ts`: Pass-unopened (with bribe and bag goods claim verification), inspected honest (Sheriff pays full bag penalty), and inspected dishonest with partial honesty (matching cards stay, non-matching confiscated to discard, merchant pays fine on confiscated cards).
  - `debtResolution.ts`: Strict 4-step liquidation (1: cash on hand, 2: stand legal goods, 3: stand contraband goods, 4: empty stand wipes remaining debt) with no change on overpayment. **100% statement and branch coverage**.
  - `scoring.ts`: Stand goods value + cash on hand + floored King/Queen bonuses (King tie splits K+Q and skips Queen; Queen tie splits Queen) + tiebreaker chain (total points -> most legal goods -> most contraband -> shared victory). **100% statement and branch coverage**.
  - `modules/royalGoods.ts`, `modules/deputies.ts`, `modules/blackMarket.ts`: Full GDD expansion rules isolated behind feature flags.
- Comprehensive Vitest suite with 77 tests (76 engine unit tests + 1 room integration test), 100% statement and branch coverage across engine files.
- Ready for Phase 2: Wire engine into NottinghamRoom.

