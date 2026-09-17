# Sheriff of Nottingham — Digital (2nd Edition) — Agentic Build Plan

## 0. How to Use This File

You are building a real-time, browser-based multiplayer adaptation of *Sheriff of
Nottingham (2nd Edition)* for 3–6 players. Work through the phases below **in order**.
Each phase has a scope, concrete tasks, and acceptance criteria — do not start a phase
until the previous phase's acceptance criteria are met. Commit after each phase.
If a phase's acceptance criteria can't be verified automatically, write a manual test
script into `docs/manual-tests.md` and flag it before moving on.

**Companion documents:**
- **`docs/architecture.md` (*Game Design & Technical Architecture Document*):** The primary **Digital GDD** containing the structured rule engine specifications (§2), expansion modules (§3), TypeScript state models & JSON schemas (§4), digital UI/UX paradigms & micro-interactions (§5), and system security & zero-knowledge specs (§6) referenced by section number throughout this build plan.
- **`docs/consultation-rulebook.md` (*CMON 2nd Edition Rules*):** The physical board game rulebook for consultation and reference, serving as the baseline for card flavor, original box rules, and physical component counts.
- **`docs/2d-design-overhaul.md`:** The **current** visual/UI/UX spec for the client, written after the 3D-to-2D pivot (see §0.1). Phases 3, 4, 5, and 7 below implement *this* document's layout and interaction spec, not `docs/architecture.md` §5's original 3D staging notes — where the two disagree on visual presentation, `docs/2d-design-overhaul.md` wins; where they disagree on game rules/behavior (timing, validation, outcomes), `docs/architecture.md` still wins.
- Every phase below references specific sections — read them before implementing that phase. Do not re-derive rules from memory or guesswork.

**IP note:** implement the mechanics only. Do not source or embed official card
artwork, box art, or trademarked logos — use original or licensed-free art assets and
your own naming/flavor for the visual skin.

**Before writing any code:** read §16 (Agent Tooling & Coding Practices) and create the
`AGENT.md` files it describes, if they don't already exist. They are how you (or a fresh
agent session after a context reset) stay oriented across a project this size.

### 0.1 The 2D Pivot — What Changed and Why

This plan originally specified a 3D (React Three Fiber) client, and Phases 0–5 were
built and shipped against that spec. After playtesting through Phase 5, the game reads
and plays better as a 2D digital board game: hidden/visible information counts are
easier to parse at a glance without 3D occlusion, layout is far easier to make
responsive, and the client is lighter on hardware. `docs/2d-design-overhaul.md` is the
new client-side visual/interaction spec. It **supersedes** the 3D-specific tasks in
Phases 3, 4, 5, and 7 below.

**This is a client-rendering change only.** The rules engine, the Colyseus schema, the
hidden-information filtering, and the networking model (Phases 0–2, 6, 8, 9) are
entirely unaffected and require no changes.

### Project Status

| Phase | Status | Notes |
|---|---|---|
| 0 — Scaffolding | ✅ Done | No changes needed |
| 1 — Rules Engine | ✅ Done | No changes needed |
| 2 — Colyseus Room Wiring | ✅ Done | No changes needed |
| 3 — Table & Board Scene | 🔧 Retrofit | Was built in 3D; rebuild per §7 + `docs/2d-design-overhaul.md` |
| 4 — Core Loop UI | 🔧 Retrofit | Drag moves from 3D mesh to `dnd-kit`; see §8 |
| 5 — Inspection & Bribe Negotiation | 🔧 Retrofit | Examination Desk & scale move to 2D; see §9 |
| 6 — Expansion Modules | 🔄 In progress | Engine-level — **not** affected by the pivot; continue as scoped in §10 |
| 7 — Micro-interactions, Audio, Polish | 🔜 Rewritten | Camera-easing tasks no longer apply; see §11 |
| 8 — Anti-Cheat Hardening | 🔜 Unchanged | |
| 9 — Deployment | 🔜 Unchanged | |

---

## 1. Tech Stack & Rationale

### Client (revised for the 2D pivot)
| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18 + Vite + TypeScript** | Unchanged. |
| Rendering | **Plain DOM + CSS** (transforms, filters, CSS custom properties) with **SVG** for card/coin/icon art | Board elements are discrete (cards, tokens, a market board), not a dense 3D scene. DOM/SVG is crisp at any zoom, trivially responsive, and drops an entire dependency stack (Three.js/R3F/drei/postprocessing) along with its GPU-profiling concerns. |
| Animation | **Framer Motion** | Layout animations, drag-release springs, and the "snap" / "settle" / "flourish" motion presets defined in `docs/2d-design-overhaul.md` §5 — same tactile intent as the old `@react-spring/three` approach, without a 3D scene graph underneath it. |
| Drag & drop | **`@dnd-kit/core`** | Purpose-built, accessible (keyboard + touch) drag-and-drop for exactly this pattern: hand → bag, bribe items → scale. More robust than rolling drag gestures on top of Framer Motion alone. |
| Flourish | **`canvas-confetti`** (round-end reveal only) | One lightweight canvas call — not a particle engine. Nothing else in this UI needs per-frame simulation. |
| Client state | **Zustand** | Unchanged. |
| UI + board chrome | **Tailwind CSS** | Unchanged — now styles the board itself, not just HUD overlays. |
| Audio | **Howler.js** | Unchanged. |

**Removed:** `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`,
`@react-spring/three`. Strip these from `package.json` once the Phase 3–5 retrofit is
verified working — don't leave dead 3D dependencies installed.

### Server — unchanged
The 2D pivot is client-presentation-only.

| Layer | Choice | Why |
|---|---|---|
| Realtime framework | **Colyseus (Node.js + TypeScript)** | Purpose-built for room-based, phase/turn-driven multiplayer with hidden per-player information. |
| State sync | **`@colyseus/schema`** with `@filter()` | Per-client filtered views are a first-class feature. Delta-encoded sync and reconnection/resync come built in. |
| Persistence (optional, post-MVP) | **PostgreSQL + Prisma** | Only needed for match history / accounts / leaderboards. |
| Horizontal scaling (later) | **Colyseus Redis presence driver** | Add only when running multiple server instances. |

---

## 2. Repository Structure

```
/sheriff-of-nottingham
  /docs
    consultation-rulebook.md # physical board game rulebook for reference / consultation
    architecture.md          # PRIMARY digital game design doc (GDD) & technical architecture (§1–§6)
    2d-design-overhaul.md    # CURRENT client visual/UI/UX spec — supersedes architecture.md §5 staging notes
    manual-tests.md
  /packages
    /server
      /src
        /rooms
          NottinghamRoom.ts
        /schema
          GameState.ts       # Colyseus Schema classes (see §3 below)
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
        /board               # 2D board components: Table, MarketBoard, PlayerStand, Bag (was /scene)
        /ui                  # Tailwind HUD: hand tray, ledger, phase banner, modals
        /net                 # Colyseus client connection + room state hooks
        /state               # Zustand stores
        /audio
        /theme               # Shared color / typography / motion tokens (docs/2d-design-overhaul.md §2, §5)
        App.tsx
  docker-compose.yml
  package.json (workspaces)
```

---

## 3. Server-Authoritative State Model (Colyseus Schema)

Unchanged by the 2D pivot. Convert the digital GDD's TypeScript interfaces
(`docs/architecture.md` §4.1) into Colyseus `Schema` classes. Sketch:

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

This gives you the digital GDD's "Zero-Knowledge Serialization" (`docs/architecture.md`
§6.1) for free: a client only ever receives decrypted `cards` arrays for bags/hands it
owns; everyone else sees the public counts. No manual payload-sanitizing gatekeeper
required.

---

## 4. Phase 0 — Project Scaffolding

**Status:** ✅ Done. No changes needed for the 2D pivot.

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

**Status:** ✅ Done. No changes needed for the 2D pivot.

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
  outcomes exactly as specified in `docs/architecture.md` §2.2 Phase 4 (and
  `docs/consultation-rulebook.md` Phase 4), including partial-honesty (declared goods
  stay, undeclared confiscated).
- `debtResolution.ts`: implement the 4-step liquidation order from `docs/architecture.md`
  §2.2 (and `docs/consultation-rulebook.md`) exactly, including "overpayment does not
  return change" and "empty stand wipes debt."
- `scoring.ts`: King/Queen bonuses, tie-breaking (tied king, tied queen, overall game
  ties) per `docs/architecture.md` §2.3 (and `docs/consultation-rulebook.md`).
- `modules/royalGoods.ts`, `modules/deputies.ts`, `modules/blackMarket.ts`: implement
  per `docs/architecture.md` §3, but keep them **behind feature flags** — don't wire
  into base rules yet.

**Acceptance criteria**
- Vitest suite covering: every card-count table value for both 3-player and 4–6-player
  decks; every inspection outcome branch; debt resolution across all 4 steps including
  the "stand fully empty" edge case; every tie-break rule with a constructed example.
- 100% branch coverage on `debtResolution.ts` and `scoring.ts` specifically.

---

## 6. Phase 2 — Wire the Engine into a Colyseus Room

**Status:** ✅ Done. No changes needed for the 2D pivot.

**Tasks**
- Implement `NottinghamRoom` using the schema from §3 and the engine from Phase 1.
- Map each engine phase transition to room state changes broadcast to clients.
- Implement the reconnection flow (`docs/architecture.md` §6.2): on reconnect, resend
  a snapshot filtered to the reconnecting client's authorization only.
- Implement the bribe offer flow as an atomic action: reject a stale "Accept" if the
  underlying offer changed (`docs/architecture.md` §6.2's 1.5s reaction buffer) —
  model this as a version/sequence number on `BribeOffer` rather than a hard timer.

**Acceptance criteria**
- Colyseus integration tests (using `colyseus.js` test client) simulate a full round
  end-to-end for a 4-player game with no client UI, asserting on room state at each
  phase transition.
- A test explicitly asserts that a non-owning client's schema view never contains
  another player's `hand` or `sealedBag.cards`.

---

## 7. Phase 3 — 2D Table & Board Scene (RETROFIT)

**Status:** ✅ Done. 2D tabletop arena (`TableBoard2D`), player stands (`PlayerStand2D`),
market board (`MarketBoard2D`), event ledger (`ActionLedger`), and centralized theme
tokens (`tokens.ts`) implemented. Dead 3D dependencies (`@react-three/fiber`,
`@react-three/drei`, `three`, `@react-spring/three`) removed from client dependencies.

**Tasks**
- Remove the R3F scene tree (`Table.tsx`, `MerchantStand.tsx` 3D versions, lighting/
  post-processing setup) once its 2D replacement is confirmed working — don't run
  both in parallel past a short verification window.
- Build the 2D Table View per `docs/2d-design-overhaul.md` §4.1: Market board, player
  stands arranged around the table for 3–6 seats, phase/turn banner, collapsible
  ledger drawer.
- Build the `PlayerStand` component (coin purse + count, legal-goods bins, sealed-bag
  indicator, avatar + role badge) per §4.1.
- Wire it to the same Colyseus state the 3D version consumed — this is a rendering
  swap, not a state-model change; no schema work should be needed here.
- Apply the shared theme tokens (`/theme`) from `docs/2d-design-overhaul.md` §2 and §6
  so colors/typography are centralized, not hardcoded per component.

**Acceptance criteria**
- All 3–6 seat layouts render correctly with no overlap down to the minimum supported
  width defined in `docs/2d-design-overhaul.md` §4.1.
- Local player's stand updates reactively from Colyseus state with no manual re-render
  wiring.
- No dead 3D dependencies remain in the client's `package.json` once this phase's
  acceptance criteria pass.

---

## 8. Phase 4 — Core Loop UI: Market → Load Bag → Declaration (RETROFIT)

**Status:** ✅ Done. Hand tray with fanned card UI (`HandCardFan`), drag-and-drop
bag loading (`MerchantBagDropZone`) using `@dnd-kit/core` with mouse and keyboard accessibility,
burlap sack puff and squash-then-settle animations, and compact inline declaration panel
(`DeclarationPanel`) with 4 legal goods and wax-seal stamp animation.

**Tasks**
- Hand tray: fanned card UI at the bottom of the screen, hover-to-lift, click-to-select
  — per §4.2.
- Replace the 3D bag-mesh drag interaction with `@dnd-kit/core`: dragging a card into
  the bag's drop zone adds it; the "Snap Bag" action keeps its existing squash-and-
  settle + Howler snap sound, now driven by Framer Motion instead of a 3D spring on a
  mesh.
- Declaration UI: single-good icon picker + auto-filled count (declared count must
  equal bag size) — per §4.3.
- Server-side validation and rejection UX — unchanged behaviorally from the original
  phase; only the visual layer changes.

**Acceptance criteria**
- A full Market → Load Bag → Declaration cycle is playable across 4 connected clients
  with correct turn ordering and correct server-side validation rejections surfaced as
  UI errors.
- Drag interactions work via keyboard as well as mouse/touch (a `dnd-kit`
  accessibility feature — verify it's actually wired up, not just available).

---

## 9. Phase 5 — Inspection & Bribe Negotiation ("The Examination Desk") (RETROFIT)

**Status:** 🔧 Needs rework. Reference `docs/2d-design-overhaul.md` §4.4–§4.5.

**Tasks**
- Replace the 3D examination viewport with the full-screen 2D overlay per §4.4:
  Sheriff/Merchant portraits framing the sealed bag, bribe items as draggable chips
  onto a 2D balance-scale (CSS-transform tilt driven by summed value difference,
  spring-animated).
- Rebuild the "Unsnap Bag" clasp as a 2D press-and-hold control (radial progress ring,
  SVG `stroke-dashoffset` or `conic-gradient`) — **keep the exact timing** (1.2s
  threshold, cancelable to 1.1s) and audio cues from the original phase; only the
  visual is changing.
- Outcome reveal: staggered card flip-and-reveal animation with a color-coded halo
  (legal/contraband) before cards resolve to stand or discard, per §4.4.
- Debt resolution: rebuild the guided liquidation flow as the "unfurling ledger"
  pattern in §4.5 — same step order and behavior as originally specified (gold →
  legal goods → contraband → wipe), new visual treatment only.

**Acceptance criteria**
- Every inspection outcome branch is playable and visually distinguishable in a live
  4-player session; the clasp hold can be canceled before 1.2s with no state change
  and reliably triggers at threshold under simulated latency.
- The balance-scale tilt animation and card-flip reveal both respect
  `prefers-reduced-motion` — build this in from the start here since it's core to
  this phase's UI, not deferred polish.

---

## 10. Phase 6 — Expansion Modules

**Status:** 🔄 In progress. This phase is engine/schema work (deck composition,
deputy assignment logic, black market trade-in rules) and is **not affected by the
2D pivot** — continue exactly as scoped below.

Reference `docs/architecture.md` §3 (and `docs/consultation-rulebook.md`). Ship as
togglable lobby settings, each independently testable.

**Tasks**
- Royal Goods: shuffle into deck, treat as contraband through inspection, convert to
  legal-equivalent counts at scoring per `docs/architecture.md` §3.1 (and
  `docs/consultation-rulebook.md`).
- 6-Player Deputies: Deputy assignment, joint pass/inspect/split-decision logic,
  Booty tile split at phase end, per `docs/architecture.md` §3.2 (and
  `docs/consultation-rulebook.md`).
- Black Market: 3-matching-contraband trade-in, 1-claim-per-merchant-per-round limit,
  per `docs/architecture.md` §3.3 (and `docs/consultation-rulebook.md`).

**Acceptance criteria**
- Each module has its own engine unit tests (extending Phase 1's suite) and a room
  integration test with the module flag enabled.
- A 6-player game with Deputies + Royal Goods + Black Market all enabled completes a
  full game to a correct final score.

**One addition post-pivot:** any new UI surface this phase introduces (a deputy
indicator, a black-market trade-in panel) should follow `docs/2d-design-overhaul.md`
conventions (theme tokens, motion presets) rather than the original 3D visual
language, since Phases 3–5 will have already moved off it by the time this phase's UI
work lands.

---

## 11. Phase 7 — Micro-interactions, Audio, Visual Polish (REWRITTEN FOR 2D)

**Status:** ✅ Done. Web Audio API suite with continuous cozy tavern fireplace loop,
tactile card slide, snap, coin clink, scale tip, and gavel SFX; SettingsModal with
audio toggles, Reduced Motion mode, and color-independent card classification guides.

**Tasks**
- Full pass on the 2D motion language defined in §5: consistent "snap" / "settle" /
  "flourish" Framer Motion presets applied everywhere they're currently ad hoc from
  the Phase 3–5 retrofit.
- Hover/focus states on every interactive element (subtle lift + shadow) per §5.
- Screen-transition treatment for entering/leaving the Examination Desk overlay (a
  cross-fade or slide, not a camera move) — keep it fast; this shouldn't feel like a
  loading screen.
- Final audio pass: same SFX list as originally planned (card slide, coin clink,
  gavel/inspection stinger, ambient tavern loop) — these are audio assets, unaffected
  by the visual pivot.
- Round-end scoring flourish: parchment-scroll reveal with `canvas-confetti` accent
  per §4.6.
- Accessibility pass: color-independent contraband/legal indicators (per §7 — verify
  against the new 2D iconography), reduced-motion mode that disables non-essential
  flourishes (card-flip stagger becomes instant reveal, per §7).

**Acceptance criteria**
- A full game is playable with sound and screen transitions with no dropped frames —
  2D/DOM rendering should make this an easier bar to clear than the original 3D
  target, not a harder one; profile it anyway.
- Reduced-motion mode verified to skip transition animation and flourish effects per
  §7's checklist.

---

## 12. Phase 8 — Anti-Cheat Hardening & Testing

**Status:** 🔜 Unchanged by the 2D pivot.

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

**Status:** 🔜 Unchanged by the 2D pivot.

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
- **Numbers come from `docs/architecture.md` and `docs/consultation-rulebook.md`**,
  not from memory of the physical game — card counts, values, and penalties differ
  from the real box in subtle ways per the provided docs; don't "correct" them
  without checking first.
- Target a consistently smooth **60fps** for the Table View on typical laptop
  hardware, including integrated graphics — the 2D DOM/SVG rendering approach should
  make this an easier bar to clear than the original 3D target; if any component
  causes jank, suspect an unnecessary re-render before suspecting the rendering
  approach itself.

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

### 16.1 `AGENT.md` files — create before Phase 0 (or now, if missing)

Context resets mid-project are the biggest source of wasted work on something this
size: a fresh agent session re-derives decisions already made, contradicts an earlier
convention, or re-reads the whole codebase to figure out "why is it built this way."
`AGENT.md` files are the fix — short, living documents that carry forward decisions
and gotchas so a new session onboards in seconds instead of re-exploring.

Maintain these, updating the relevant one at the end of every phase (a few minutes,
not a report):

- **`/AGENT.md`** (repo root) — project-wide: the tech stack and why (link back to §1
  rather than duplicating it), monorepo layout, how to run everything locally, which
  phase is currently in progress, and any cross-cutting decision not in this build
  plan. **Record the 2D pivot here explicitly** if it isn't already, so a fresh
  session doesn't rediscover 3D-era code and assume it's current.
- **`packages/server/AGENT.md`** — Colyseus room lifecycle conventions, schema/filter
  patterns actually used, how the engine (`/engine`) is kept decoupled from the room
  layer, known edge cases already handled (and where — point to the test file).
- **`packages/client/AGENT.md`** — 2D board/UI conventions (theme tokens, motion
  presets, `dnd-kit` drop-zone patterns), where board vs. HUD-overlay responsibilities
  split, asset pipeline notes. **Remove any stale R3F/three.js conventions** as the
  Phase 3–5 retrofit lands.

Rules for keeping these useful rather than stale:
- Write down *decisions and gotchas*, not a narration of what the code does.
- Update the file in the same commit as the change that makes it stale.
- Keep each file short enough to read in under a minute.

### 16.2 MCP Tools to Use Throughout

- **Context7** (or an equivalent up-to-date-docs MCP) — before writing code against
  any fast-moving library API (`@colyseus/schema` filters and callbacks, `framer-motion`
  layout animations and drag, `@dnd-kit/core` sensors and drop-zone patterns), pull
  current docs rather than relying on training-data memory of the API. Do this once
  per library at the start of the phase that first uses it, not on every file.
- **Playwright** (or an equivalent browser-automation MCP) — this is a multiplayer
  game where the most important bugs (hidden-info leaks, desync, race conditions in
  the bribe flow) only show up with multiple concurrent clients. With a DOM-based 2D
  client, Playwright's role gets *more* central, not less — full-page and
  component-level screenshot diffing is now a direct, reliable check rather than a
  proxy for a 3D scene's state:
  - Drive 2–6 real browser instances against a local server for each phase's
    integration tests.
  - After the Phase 5 inspection/bribe UI exists, script a check that inspects the
    DOM and network tab of a non-owning client's browser and asserts no sealed-bag
    card data or other player's hand data ever appears — stronger than the
    schema-level test in §9 because it verifies nothing leaks through incidental
    channels (console logs, dev tools, DOM attributes).
  - Capture screenshots at key states per phase for visual regression as the 2D UI
    stabilizes in Phases 7–8, and diff them against `docs/2d-design-overhaul.md`'s
    layout spec.

If neither is available in your environment, fall back to: the library's official
docs site fetched directly, and Vitest + `colyseus.js` test client + manual multi-tab
testing, respectively — but note the gap in the relevant `AGENT.md`.

### 16.3 General Practices to Avoid Common Agent Failure Modes

- **Don't guess an API signature — verify it.** Check `node_modules/@types` or the
  package's own `.d.ts` files before calling an unfamiliar method.
- **Small, single-purpose commits**, not one commit per phase.
- **Tests alongside implementation, not after.**
- **No silent error handling.** A caught exception that doesn't re-throw, log, or
  surface to the room's error state is a bug waiting to be invisible.
- **Don't gold-plate beyond a phase's acceptance criteria.** Note "nice to have"
  ideas as a TODO in the relevant `AGENT.md` instead.
- **When the specifications are ambiguous or silent on an edge case**, implement the
  most literal reading, write a test that documents the assumption, and flag it in
  `docs/manual-tests.md` for the user to confirm — don't invent a plausible ruling and
  move on silently.