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
│       ├── src/components/    # Three.js 3D table, merchant stands, cards, bags
│       ├── src/ui/            # Tavern-themed UI, lobby, inspection dialogs
│       └── src/services/      # Colyseus SDK 0.18 client connection service
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
* [ ] **Phase 2: Wire Rules Engine into NottinghamRoom**
  * Authoritative Colyseus 0.18 state transitions, zero-knowledge client views, bribe negotiation protocol with 1.5s reaction buffer, reconnection handling.
* [ ] **Phase 3: 3D Table & Scene**
  * Three.js / React Three Fiber interactive 3D table, camera perspectives (Sheriff view, Merchant view), bag snap animations.
* [ ] **Phase 4: Game HUD & Bribe Interaction UI**
  * Drag-and-drop bag loading, declaration wheel/modal, dynamic bribe negotiation tray.
* [ ] **Phase 5: Audio & Polish**
  * Bag snap sounds, coin clinks, inspection tension audio, celebration animations.
* [ ] **Phase 6: AI Bot Implementation**
  * Heuristic and bluffing bot logic for solo and fill-in gameplay.
* [ ] **Phase 7: End-to-End Testing & Hardening**
  * Full-game multi-client simulation, reconnection stress tests, edge case verification.
