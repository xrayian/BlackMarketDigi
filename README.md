# Sheriff of Nottingham Digital (2nd Edition)

A full-fidelity, web-based digital adaptation of the acclaimed bluffing, bribery, and smuggling board game **Sheriff of Nottingham** (2nd Edition, CMON). Built for modern web browsers with real-time multiplayer networking, interactive 3D table views, and an authoritative headless rules engine.

---

## 🛠 Tech Stack

* **Server:** [Colyseus 0.18.x](https://docs.colyseus.io/) (`defineServer`, `defineRoom`), `@colyseus/schema` 5.0 (decorator-free schema builder), Express 4.
* **Client:** React 18, Vite 6, TypeScript 5, Tailwind CSS, Three.js / React Three Fiber / Drei, Lucide Icons, Canvas Confetti.
* **Shared Layer:** `@sheriff/shared` containing canonical rulebook card catalogs, constants, message protocols, and type definitions.
* **Testing:** [Vitest 3](https://vitest.dev/) with V8 coverage.

---

## 🏛 Architecture

The repository is configured as an npm workspaces monorepo:

```
BlackMarketDigi/
├── packages/
│   ├── shared/                # Core types, card catalog, constants, message schemas
│   │   ├── src/cards.ts       # 204 base cards + 12 royal goods definitions
│   │   ├── src/constants.ts   # Rule constants, penalties, King/Queen bonuses
│   │   ├── src/messages.ts    # Client-server action payload definitions
│   │   └── src/types.ts       # Pure TypeScript interfaces (Card, Stand, Bag, etc.)
│   ├── server/                # Authoritative Colyseus 0.18 game server
│   │   ├── src/engine/        # Headless, zero-dependency rules engine (100% branch coverage)
│   │   │   ├── deck.ts        # Card generation (3p vs 4-6p), shuffle, draw, discard sweep
│   │   │   ├── phases/        # Market, load bag, declaration, and inspection engines
│   │   │   ├── debtResolution.ts # 4-step liquidation (cash -> legal -> contraband -> debt wipe)
│   │   │   ├── scoring.ts     # Endgame scoring, floored King/Queen splits, tiebreaker chain
│   │   │   └── modules/       # Royal Goods, Deputies (6p), and Black Market expansions
│   │   ├── src/rooms/         # NottinghamRoom room lifecycle and state sync
│   │   └── src/schema/        # @colyseus/schema 5.0 binary state models
│   └── client/                # React 18 + Vite 6 client application
│       ├── src/scene/         # Three.js / R3F 3D table, stands, cards, coin piles, bags, lighting
│       ├── src/ui/            # Tavern-themed UI, lobby, HUD, inspection dialogs
│       ├── src/net/           # Colyseus SDK 0.18 client connection service
│       ├── src/state/         # Zustand client game store
│       └── src/audio/         # Howler.js audio management
├── docs/                      # Game design document (GDD) and specifications
├── init.md                    # Project development plan and phase roadmap
└── docker-compose.yml         # Local development environment config
```

---

## 🎲 Rulebook & Engine Highlights

* **Exact Card Counts & Deck Composition (GDD §2.1 & §16):**
  * **3-Player Base Deck:** 156 cards (108 Legal Goods: 48 Apples, 36 Cheese, 0 Bread, 24 Chickens; 48 Contraband: 18 Pepper, 16 Mead, 9 Silk, 5 Crossbow).
  * **3-Player with Royal Goods:** 162 cards (6 Royal Goods included; 6 marked 4+ removed).
  * **4–6 Player Base Deck:** 204 cards (144 Legal Goods: 48 Apples, 36 Cheese, 36 Bread, 24 Chickens; 60 Contraband: 22 Pepper, 21 Mead, 12 Silk, 5 Crossbow).
  * **4–6 Player with Royal Goods:** 216 cards (all 12 Royal Goods included).
* **Zero-Knowledge Privacy:** Merchant bag contents and player hands are serialized authoritatively on the server; non-owning clients only receive card counts until bags are formally opened.
* **4-Step Debt Liquidation Order (GDD §2.2):**
  1. Cash on hand.
  2. Legal goods from merchant stand.
  3. Contraband goods from merchant stand (revealed).
  4. Empty stand wipes debt: if stand is completely exhausted, any remaining penalty debt is forgiven.
  * *Overpayment rule strictly enforced: surrendering a card with value exceeding the debt does not return change.*
* **King & Queen Bonuses (GDD §2.3):**
  * Floored integer division on ties: Tied King adds King + Queen bonuses, divides equally between tied players (floored), and skips the Queen bonus. Tied Queen divides Queen bonus equally between tied players (floored).
  * Multi-tier tiebreakers: Total Score → Most Legal Goods → Most Contraband → Shared Victory.
* **Expansion Modules (GDD §3):** Royal Goods, 6th Player Deputies & Booty Tile, and Black Market order fulfillment.

---

## 🚀 Quickstart

### Prerequisites
* **Node.js:** >= 20.x
* **npm:** >= 10.x

### 1. Installation
```bash
npm install
```

### 2. Development Servers
Start both the Colyseus 0.18 game server (`ws://localhost:2567`) and Vite dev server (`http://localhost:5173`):
```bash
npm run dev
```

### 3. Running Unit & Integration Tests
Run Vitest across the server engine and room tests:
```bash
npm --workspace=@sheriff/server test
```

To run test coverage report (asserting 100% statement and branch coverage on rules engine):
```bash
npm --workspace=@sheriff/server run test:coverage
```

### 4. Building Production Bundles
Build all monorepo packages (`shared`, `server`, and `client`):
```bash
npm run build
```

---

## 🗺 Implementation Roadmap

* [x] **Phase 0: Project Scaffolding & Colyseus 0.18 Baseline**
  * Monorepo setup, Schema 5.0 models, NottinghamRoom lobby, 4-character room codes, tavern lobby UI.
* [x] **Phase 1: Headless Rules Engine (100% Branch Coverage)**
  * Pure TypeScript deck generation, market discard/redraw, sealed bag loading, declaration, inspection, 4-step debt liquidation, endgame scoring with floored King/Queen splits, and expansion modules.
* [x] **Phase 2: Wire Rules Engine into NottinghamRoom**
  * Authoritative Colyseus 0.18 state transitions, zero-knowledge client views (`.view()`), atomic bribe negotiation protocol with sequence number buffer, 4-player integration tests.
* [x] **Phase 3: 3D Table & Scene**
  * React Three Fiber circular banquet table seating 3–6 players without overlap, dynamic camera rig oriented for local seat, MerchantStand with instanced coin piles, 4 legal goods compartments, facedown contraband vault with seal medallion and count badge, 3D merchant bag with clasp, candle flicker, bloom and vignette post-processing, reactive state sync.
* [x] **Phase 4: Core Loop UI: Market → Load Bag → Declaration**
  * Market panel with sheriff starting player selection, merchant discard/redraw with card selection UI, and clockwise turn advancement. Bag loading with 1–5 card selection and immutable snap. Declaration modal with legal good type picker and auto-count. Server validation errors surfaced as auto-dismissing error toasts.
* [ ] **Phase 5: Inspection & Bribe Negotiation ("The Examination Desk")**
  * 1-on-1 examination camera transition, bribe balance scale, press-and-hold unsnap bag clasp, guided debt liquidation UI.
* [ ] **Phase 6: Audio & Visual Polish**
  * Howler audio integration (bag snap, coin clink, tavern ambience, inspection tension), confetti celebrations, sound toggles.
* [ ] **Phase 7: End-to-End Testing & Hardening**
  * Multi-client browser testing, reconnection stress tests, edge case verification.

