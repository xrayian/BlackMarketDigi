# Sheriff of Nottingham — Digital (2nd Edition) — Agentic Build Plan

## 0. How to Use This File

You are building a real-time, 3D, browser-based multiplayer adaptation of *Sheriff of
Nottingham (2nd Edition)* for 3–6 players. Work through the phases below **in order**.
Each phase has a scope, concrete tasks, and acceptance criteria — do not start a phase
until the previous phase's acceptance criteria are met. Commit after each phase.
If a phase's acceptance criteria can't be verified automatically, write a manual test
script into `docs/manual-tests.md` and flag it before moving on.

**Companion documents:**
- **`docs/architecture.md` (*Game Design & Technical Architecture Document*):** The primary **Digital GDD** containing the structured rule engine specifications (§2), expansion modules (§3), TypeScript state models & JSON schemas (§4), digital UI/UX paradigms & micro-interactions (§5), and system security & zero-knowledge specs (§6) referenced by section number throughout this build plan.
- **`docs/consultation-rulebook.md` (*CMON 2nd Edition Rules*):** The physical board game rulebook (Sergio Halaban & André Zatz / CMON 2020) for consultation and reference, serving as the baseline for card flavor, original box rules, and physical component counts.
- Every phase below references specific sections — read them before implementing that phase. Do not re-derive rules from memory or guesswork.

**IP note:** implement the mechanics only. Do not source or embed official card
artwork, box art, or trademarked logos — use original or licensed-free art assets and
your own naming/flavor for the visual skin.

**Before writing any code:** read §16 (Agent Tooling & Coding Practices) and create the
`AGENT.md` files it describes. They are how you (or a fresh agent session after a
context reset) stay oriented across a project this size — do not skip this because it
feels like overhead before "real" work starts.

---

## 1. Tech Stack & Rationale

### Client
| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18 + Vite + TypeScript** | No SSR/SEO need for a real-time multiplayer app; Vite gives the fastest dev loop. |
| 3D | **React Three Fiber (`@react-three/fiber`) + `@react-three/drei`** | Most mature web-3D ecosystem — largest helper library, best docs, fastest to ship a polished scene vs. TresJS or raw Three.js. |
| Post-processing | **`@react-three/postprocessing`** | Bloom/vignette/depth-of-field for the "high-stakes tavern" look at low implementation cost. |
| Micro-interaction animation | **`@react-spring/three`** (3D) + **Framer Motion** (2D HUD) | Spring physics *feel* for the bag-snap / scale-tip / clasp-hold interactions without a full rigid-body engine — deterministic across clients, cheap to run. |
| Client state | **Zustand** | Minimal boilerplate, plays cleanly with R3F components and Colyseus state callbacks. |
| 2D UI overlay | **Tailwind CSS** | Ledger, hand tray, buttons, toasts. |
| Audio | **Howler.js** | Snap sound, coin clink, ambient tavern loop, tension ramp. |

**Explicitly not using:** a physics engine (Rapier/cannon-es) for MVP — real rigid-body
sim adds cross-client non-determinism and performance cost for no gameplay benefit;
revisit only as a post-launch "juice" pass if desired.

### Server
| Layer | Choice | Why |
|---|---|---|
| Realtime framework | **Colyseus (Node.js + TypeScript)** | Purpose-built for room-based, phase/turn-driven multiplayer with hidden per-player information. Replaces a hand-rolled NestJS+Redis+custom-WebSocket-gatekeeper stack. |
| State sync | **`@colyseus/schema`** with `@filter()` | Per-client filtered views are a first-class feature — "hide sealed bag contents from everyone but the owner" is a decorator, not a sanitization layer you maintain. Delta-encoded sync and reconnection/resync come built in. |
| Persistence (optional, post-MVP) | **PostgreSQL + Prisma** | Only needed for match history / accounts / leaderboards. Room state itself lives in memory in Colyseus; not required to ship the core game. |
| Horizontal scaling (later) | **Colyseus Redis presence driver** | Add only when running multiple server instances; skip for MVP. |

### Why this beats the NestJS/Redis/raw-WebSocket approach
The hardest problems in the original spec — hidden bag contents, atomic bribe
compare-and-swap, reconnection resync with authorized-only data — are exactly what
Colyseus schema filtering and its room lifecycle hooks solve out of the box. Hand-rolling
them in NestJS + Redis means writing and testing a bespoke version of the same thing
with more surface area for bugs (and for cheating).

---

## 2. Repository Structure

```
/sheriff-of-nottingham
  /docs
    consultation-rulebook.md # physical board game rulebook for reference / consultation
    architecture.md          # PRIMARY digital game design doc (GDD) & technical architecture (§1–§6)
    manual-tests.md
  /packages
    /server
      /src
        /rooms
          NottinghamRoom.ts
        /schema
          GameState.ts       # Colyseus Schema classes (see §4)
          PlayerState.ts
          Card.ts
          BribeOffer.ts
        /engine
          deck.ts            # deck construction & filtration per player count
          phases/
            market.ts
            loadBag.ts
            declaration.ts
            inspection.ts
            roundEnd.ts
          debtResolution.ts
          scoring.ts
          modules/
            royalGoods.ts
            deputies.ts
            blackMarket.ts
        index.ts
      /test
        engine/              # Vitest unit tests, headless — no network
        rooms/                # Colyseus room integration tests
    /client
      /src
        /scene               # R3F components: Table, MerchantStand, Bag, Scale
        /ui                  # Tailwind HUD: hand tray, ledger, phase banner
        /net                 # Colyseus client connection + room state hooks
        /state               # Zustand stores
        /audio
        App.tsx
  docker-compose.yml
  package.json (workspaces)
```

---

## 3. Server-Authoritative State Model (Colyseus Schema)

Convert the digital GDD's TypeScript interfaces (`docs/architecture.md` §4.1) into Colyseus `Schema` classes. Sketch:

```typescript
import { Schema, MapSchema, ArraySchema, type, filter } from "@colyseus/schema";

class CardSchema extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") cardType: "LEGAL" | "CONTRABAND" | "ROYAL";
  @type("number") value: number;
  @type("number") penalty: number;
}

class SealedBagSchema extends Schema {
  @type("number") cardCount: number;         // public
  @type("string") declaredGood: string;      // public once declared
  @type("number") declaredCount: number;     // public once declared

  // Only visible to the owning client — filtered server-side.
  @filter(function (this: PlayerStateSchema, client, value, root) {
    return client.sessionId === this.id;
  })
  @type([CardSchema]) cards = new ArraySchema<CardSchema>();
}

class PlayerStateSchema extends Schema {
  @type("string") id: string;
  @type("number") gold: number;

  @filter(function (this: PlayerStateSchema, client) {
    return client.sessionId === this.id;
  })
  @type([CardSchema]) hand = new ArraySchema<CardSchema>();

  @type({ map: [CardSchema] }) standLegal = new MapSchema<ArraySchema<CardSchema>>();
  @type("number") standContrabandCount: number; // count public; identities revealed only at endgame/inspection
  @type(SealedBagSchema) sealedBag?: SealedBagSchema;
}

class GameStateSchema extends Schema {
  @type("string") lobbyId: string;
  @type("string") phase: string; // MARKET | LOAD_BAG | DECLARATION | INSPECTION | ROUND_END | GAME_OVER
  @type("number") round: number;
  @type("string") sheriffId: string;
  @type([ "string" ]) deputyIds = new ArraySchema<string>();
  @type("string") activeMerchantId?: string;
  @type({ map: PlayerStateSchema }) players = new MapSchema<PlayerStateSchema>();
  @type([CardSchema]) discardPile = new ArraySchema<CardSchema>();
  // activeBribe, bootyTile: same pattern, see docs/architecture.md §4.1
}
```

This gives you the digital GDD's "Zero-Knowledge Serialization" (`docs/architecture.md` §6.1) for free: a client only
ever receives decrypted `cards` arrays for bags/hands it owns; everyone else sees the
public counts. No manual payload-sanitizing gatekeeper required.

---

## 4. Phase 0 — Project Scaffolding

**Tasks**
- Init monorepo (`packages/server`, `packages/client`) with a shared `packages/shared`
  for types/enums used by both (GoodType, ContrabandType, phase names).
- Server: Colyseus server boots, exposes a `NottinghamRoom`, accepts a join with a
  display name, no auth for MVP (room codes only).
- Client: Vite + React scaffold, connects to the Colyseus server, renders "connected"
  state and player list.
- `docker-compose.yml` for local dev (server + optional Postgres, unused until Phase 8+).

**Acceptance criteria**
- `npm run dev` at repo root starts both server and client.
- Two browser tabs can join the same room by code and see each other in a player list.

---

## 5. Phase 1 — Rules Engine (headless, server-only, test-driven)

Build this with **zero networking and zero rendering** — pure functions/state machine,
fully unit-testable. Reference `docs/architecture.md` §2 (and `docs/consultation-rulebook.md`).

**Tasks**
- `deck.ts`: build the correct deck per player count (3 vs 4–6), including the
  Royal Goods filtration rule (`docs/architecture.md` §2.1) when that module is active.
- `phases/market.ts`: discard-and-redraw logic, sheriff picks start player, sweep to
  discard, reshuffle-on-empty.
- `phases/loadBag.ts`: validate 1–5 cards, immutable snap.
- `phases/declaration.ts`: validate `declared_count === bag.length`, `declared_good`
  is one of the four legal goods, sequencing from Sheriff's left.
- `phases/inspection.ts`: pass-unopened / inspected-honest / inspected-dishonest
  outcomes exactly as specified in `docs/architecture.md` §2.2 Phase 4 (and `docs/consultation-rulebook.md` Phase 4), including partial-honesty
  (declared goods stay, undeclared confiscated).
- `debtResolution.ts`: implement the 4-step liquidation order from `docs/architecture.md` §2.2 (and `docs/consultation-rulebook.md`) exactly,
  including "overpayment does not return change" and "empty stand wipes debt."
- `scoring.ts`: King/Queen bonuses, tie-breaking (tied king, tied queen, overall game
  ties) per `docs/architecture.md` §2.3 (and `docs/consultation-rulebook.md`).
- `modules/royalGoods.ts`, `modules/deputies.ts`, `modules/blackMarket.ts`: implement
  per `docs/architecture.md` §3, but keep them **behind feature flags** — don't wire into base rules yet.

**Acceptance criteria**
- Vitest suite covering: every card-count table value for both 3-player and 4–6-player
  decks; every inspection outcome branch; debt resolution across all 4 steps including
  the "stand fully empty" edge case; every tie-break rule with a constructed example.
- 100% branch coverage on `debtResolution.ts` and `scoring.ts` specifically — these are
  the rules most likely to have off-by-one or rounding bugs (note `docs/architecture.md`'s explicit
  "floored" division rules).

---

## 6. Phase 2 — Wire the Engine into a Colyseus Room

**Tasks**
- Implement `NottinghamRoom` using the schema from §3 and the engine from Phase 1.
- Map each engine phase transition to room state changes broadcast to clients.
- Implement the reconnection flow (`docs/architecture.md` §6.2): on reconnect, resend a snapshot filtered
  to the reconnecting client's authorization only.
- Implement the bribe offer flow as an atomic action: reject a stale "Accept" if the
  underlying offer changed (`docs/architecture.md` §6.2's 1.5s reaction buffer) — model this as a
  version/sequence number on `BribeOffer` rather than a hard timer, so it's correct
  regardless of network jitter, and add the UI-side cooldown as a presentation detail
  in Phase 5.

**Acceptance criteria**
- Colyseus integration tests (using `colyseus.js` test client) simulate a full round
  end-to-end for a 4-player game with no client UI, asserting on room state at each
  phase transition.
- A test explicitly asserts that a non-owning client's schema view never contains
  another player's `hand` or `sealedBag.cards`.

---

## 7. Phase 3 — 3D Table & Scene

Reference `docs/architecture.md` §5.1.

**Tasks**
- `Table.tsx`: circular/horseshoe seating for 3–6 players, camera positioned for the
  local player's seat.
- `MerchantStand.tsx`: coin pile (instanced meshes, scale with gold count), faceup
  legal-goods display, facedown wax-sealed contraband stack showing only aggregate
  count.
- Lighting/post-processing pass for the tavern mood (warm key light, subtle bloom on
  gold and card foil).
- Basic card and coin 3D assets (placeholder geometry/materials is fine — do not use
  official card art).

**Acceptance criteria**
- All 3–6 seat layouts render without overlap at 60fps on a mid-tier laptop GPU
  (profile with the R3F devtools / stats panel).
- Local player's stand updates reactively when Colyseus state changes (no manual
  re-render wiring needed — state → props → scene).

---

## 8. Phase 4 — Core Loop UI: Market → Load Bag → Declaration

**Tasks**
- Hand tray (2D overlay) with drag-to-discard for Market phase.
- Bag-loading UI: drag cards from hand into a 3D bag mesh; "Snap Bag" action per
  `docs/architecture.md` §5.2 — physics-flavored insertion via spring animation, then a locking
  "snap" animation + Howler sound that makes the selection immutable client-side
  (server is authoritative regardless).
- Declaration UI: count + single-good picker, sequenced by turn order, with the
  server rejecting invalid declarations (contraband, multi-good) per `docs/architecture.md` §2.2 Phase 3 (and `docs/consultation-rulebook.md` Phase 3).

**Acceptance criteria**
- A full Market → Load Bag → Declaration cycle is playable across 4 connected clients
  with correct turn ordering and correct server-side validation rejections surfaced
  as UI errors.

---

## 9. Phase 5 — Inspection & Bribe Negotiation ("The Examination Desk")

Reference `docs/architecture.md` §5.1–§5.2 for the intended feel.

**Tasks**
- Viewport transition into the 1-on-1 examination layout when the Sheriff selects a
  merchant to inspect.
- Bribe Scale component: gold/cards populate a balance-scale visualization; weight
  driven by summed value, animated with springs.
- "Unsnap Bag" clasp: press-and-hold interaction, 1.2s threshold, cancelable up to
  1.1s, tension sound ramp via Howler, per `docs/architecture.md` §5.2.
- Reflect the three inspection outcomes (pass-unopened / honest / dishonest) visually:
  goods moving to stand, gold changing hands, confiscated cards to discard.
- Debt resolution UI: when a player can't cover a penalty, walk them through the
  liquidation order (gold → legal goods → contraband → wipe) as a guided flow, not a
  single dump — this is the rule players are most likely to misunderstand.

**Acceptance criteria**
- Every inspection outcome branch is playable and visually distinguishable in a live
  4-player session.
- The clasp hold can be canceled before 1.2s with no state change, and reliably
  triggers exactly at threshold under simulated network latency (test with throttling).

---

## 10. Phase 6 — Expansion Modules

Reference `docs/architecture.md` §3 (and `docs/consultation-rulebook.md`). Ship as togglable lobby settings, each independently testable.

**Tasks**
- Royal Goods: shuffle into deck, treat as contraband through inspection, convert to
  legal-equivalent counts at scoring per `docs/architecture.md` §3.1 (and `docs/consultation-rulebook.md`).
- 6-Player Deputies: Deputy assignment, joint pass/inspect/split-decision logic,
  Booty tile split at phase end, per `docs/architecture.md` §3.2 (and `docs/consultation-rulebook.md`).
- Black Market: 3-matching-contraband trade-in, 1-claim-per-merchant-per-round limit,
  per `docs/architecture.md` §3.3 (and `docs/consultation-rulebook.md`).

**Acceptance criteria**
- Each module has its own engine unit tests (extending Phase 1's suite) and a room
  integration test with the module flag enabled.
- A 6-player game with Deputies + Royal Goods + Black Market all enabled completes a
  full game to a correct final score.

---

## 11. Phase 7 — Micro-interactions, Audio, Visual Polish

**Tasks**
- Full pass on the tactile interactions listed in `docs/architecture.md` §5.2 (bag insertion sound,
  snap latch, tension ramp, scale tipping) with final audio assets.
- Ambient ombience loop, per-action SFX (card slide, coin clink, gavel/inspection
  stinger).
- Camera easing between Table View and Examination Desk.
- Accessibility pass: color-independent contraband/legal indicators (icons, not just
  color), reduced-motion setting that disables camera transitions and spring bounce.

**Acceptance criteria**
- A full game is playable with sound and camera transitions with no dropped frames
  during transitions (profile it).
- Reduced-motion mode verified to skip camera tweening and heavy spring overshoot.

---

## 12. Phase 8 — Anti-Cheat Hardening & Testing

Reference `docs/architecture.md` §6.

**Tasks**
- Server-side re-validation of every client action already covered by Phase 1/2 tests
  — add fuzz tests that send malformed/out-of-turn actions and assert rejection.
- Reconnection stress test: kill and restore a client mid-inspection, assert state
  resync matches what that client is authorized to see.
- Load test: simulate 6 concurrent full-speed games on one server instance, check for
  memory leaks in room disposal after game end.

**Acceptance criteria**
- Fuzz test suite passes with zero successful invalid-state mutations.
- No room state leak (schema filters hold) under adversarial client testing — write a
  test client that ignores UI and sends raw malicious messages directly.

---

## 13. Phase 9 — Deployment

**Tasks**
- Containerize server; deploy to Fly.io/Render (or Colyseus Cloud if preferred) behind
  a WSS-terminating proxy.
- Static client build to a CDN/static host (Vercel/Netlify/Cloudflare Pages).
- Environment-based room code / server URL config.

**Acceptance criteria**
- A public URL supports a full 3–6 player game with strangers on different networks
  (test with mobile hotspot vs. home wifi to catch NAT/latency issues).

---

## 14. Non-Negotiable Constraints (carry through every phase)

- **Server is the only source of truth.** No game-affecting logic ever runs
  client-side as anything more than prediction/animation. Every action is
  re-validated server-side even if the UI already disabled the invalid option.
- **Hidden information never touches the wire** for unauthorized clients — enforced
  by schema `@filter`, verified by an automated test, not by code review alone.
- **Numbers come from `docs/architecture.md` and `docs/consultation-rulebook.md`**, not from memory of the physical game — card
  counts, values, and penalties differ from the real box in subtle ways per the
  provided doc; don't "correct" them without checking the doc first.
- Target **60fps** on a mid-tier laptop GPU for the Table View; the Examination Desk
  view (fewer visible elements) should never be the performance bottleneck.

---

## 15. Definition of Done

- All phases 0–9 acceptance criteria pass.
- A 6-player game (with all three expansion modules enabled) can be played start to
  finish by real users across different networks with no desyncs, no visible hidden
  information leaks, and no server crashes.
- `docs/manual-tests.md` is empty (everything that could be automated, was) or
  contains only genuinely subjective checks (e.g. "does the snap sound feel punchy").

---

## 16. Agent Tooling & Coding Practices

### 16.1 `AGENT.md` files — create before Phase 0

Context resets mid-project are the biggest source of wasted work on something this
size: a fresh agent session re-derives decisions already made, contradicts an earlier
convention, or re-reads the whole codebase to figure out "why is it built this way."
`AGENT.md` files are the fix — short, living documents that carry forward decisions and
gotchas so a new session onboards in seconds instead of re-exploring.

Create these **before writing any code**, and update the relevant one at the end of
every phase (a few minutes, not a report):

- **`/AGENT.md`** (repo root) — project-wide: the tech stack and why (link back to §1
  here rather than duplicating it), monorepo layout, how to run everything locally,
  which phase is currently in progress, and any cross-cutting decision that isn't in
  this build plan (e.g. "we chose X naming convention for schema fields because Y").
- **`packages/server/AGENT.md`** — Colyseus room lifecycle conventions, schema/filter
  patterns actually used, how the engine (`/engine`) is kept decoupled from the room
  layer, known edge cases already handled (and where — point to the test file).
- **`packages/client/AGENT.md`** — R3F scene graph conventions, where 3D vs. 2D-overlay
  responsibilities split, animation/spring conventions, asset pipeline notes.

Rules for keeping these useful rather than stale:
- Write down *decisions and gotchas*, not a narration of what the code does — the code
  already shows that. "We use X because Y broke when we tried Z" is worth writing;
  "this file exports a function called `foo`" is not.
- Update the file in the same commit as the change that makes it stale. An outdated
  `AGENT.md` is worse than none, because a future session will trust and act on it.
- Keep each file short enough to read in under a minute. If it's growing into a design
  doc, split out a `docs/decisions/` note and link to it instead.

### 16.2 MCP Tools to Use Throughout

If these MCP servers are available in your environment, use them as follows —don't
guess where an MCP would help; these two map directly onto this project's biggest risk
areas (stale library knowledge, and a multiplayer bug surface that's hard to reason
about statically):

- **Context7** (or an equivalent up-to-date-docs MCP) — before writing code against
  any fast-moving library API (`@colyseus/schema` filters and callbacks, `@react-three/fiber`
  hooks, `drei` helpers, `@react-spring/three`), pull current docs rather than relying
  on training-data memory of the API. These libraries change their APIs across minor
  versions often enough that a remembered signature is a common source of agent bugs.
  Do this once per library at the start of the phase that first uses it, not on every
  file.
- **Playwright** (or an equivalent browser-automation MCP) — this is a multiplayer game
  where the most important bugs (hidden-info leaks, desync, race conditions in the
  bribe flow) only show up with multiple concurrent clients. Use it to:
  - Drive 2–6 real browser instances against a local server for each phase's
    integration tests, not just single-client smoke tests.
  - After the Phase 5 inspection/bribe UI exists, script a check that inspects the
    network tab / page state of a non-owning client's browser and asserts no sealed-bag
    card data or other player's hand data ever appears — this is a stronger check than
    the schema-level test in §9, because it verifies nothing leaks through incidental
    channels (console logs, dev tools, DOM attributes).
  - Capture screenshots at key states per phase for visual regression as the UI
    stabilizes in Phases 7–8.

If neither is available in your environment, fall back to: the library's official docs
site fetched directly, and Vitest + `colyseus.js` test client + manual multi-tab testing,
respectively — but note the gap in the relevant `AGENT.md` so it's not forgotten.

### 16.3 General Practices to Avoid Common Agent Failure Modes

- **Don't guess an API signature — verify it.** If Context7 or docs access isn't
  available for a specific call, check the actual type definitions in
  `node_modules/@types` or the package's own `.d.ts` files before calling it. A
  plausible-looking but wrong Colyseus schema decorator fails silently in ways that are
  expensive to debug later.
- **Small, single-purpose commits**, not one commit per phase. Each commit should be
  revertible on its own without breaking the build.
- **Tests alongside implementation, not after.** For the rules engine especially
  (Phase 1), write the test for a rule from the specifications (`docs/architecture.md` / `docs/consultation-rulebook.md`) *before* implementing it — the
  numbers are precise enough that this catches transcription errors immediately.
- **No silent error handling.** A caught exception that doesn't re-throw, log, or
  surface to the room's error state is a bug waiting to be invisible. This matters more
  than usual here because a swallowed error in room logic can desync one client from
  the authoritative state without anyone noticing until much later.
- **Don't gold-plate beyond a phase's acceptance criteria.** It's tempting to add
  "nice to have" polish while inside a file — note it as a TODO in the relevant
  `AGENT.md` instead and keep moving; Phase 7 exists for polish on purpose.
- **When the specifications are ambiguous or silent on an edge case**, don't invent a plausible
  ruling and move on silently — implement the most literal reading, write a test that
  documents the assumption, and flag it in `docs/manual-tests.md` for the user to
  confirm rather than letting an invented rule become load-bearing.