# 🏰 Sheriff of Nottingham: Digital Edition (2nd Edition)

A full-fidelity, web-based digital adaptation of the acclaimed bluffing, bribery, and smuggling board game **Sheriff of Nottingham** (2nd Edition, CMON). Built for modern web browsers with real-time multiplayer networking, an immersive top-down 2D tabletop arena, tactile physical interactions, and an authoritative headless rules engine.

---

## 🛠 Tech Stack

* **Server:** [Colyseus 0.18.x](https://docs.colyseus.io/) (`defineServer`, `defineRoom`), `@colyseus/schema` 5.0 (decorator-free schema builder), Express 4.
* **Client:** React 18, Vite 6, TypeScript 5, Tailwind CSS, Framer Motion (physics spring animations), `@dnd-kit/core` (pointer & keyboard accessible drag-and-drop), Lucide Icons, Canvas Confetti.
* **Audio Engine:** Custom procedural Web Audio API synthesizer (`soundManager.ts`) with zero external sound file dependencies (ambient tavern hearth rumble, ember crackles, card slide SFX, metallic scale tipping, bag snaps, and fanfares).
* **Shared Layer:** `@sheriff/shared` containing canonical rulebook card catalogs, constants, message protocols, and type definitions.
* **Infrastructure & Hosting:** Docker, Docker Compose, Nginx reverse proxy (unified HTTP, HTTPS, WS, and WSS routing on ports 80/443).
* **Testing:** [Vitest 3](https://vitest.dev/) with V8 coverage (88 passing unit and integration tests across 14 test files).

---

## 🏛 Architecture

The repository is configured as an npm workspaces monorepo:

```
BlackMarketDigi/
├── packages/
│   ├── shared/                # Core domain types, card catalog, constants, message schemas
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
│       ├── src/ui/table2d/    # Top-down 2D Tabletop Arena (TableBoard2D, PlayerStand2D, HandCardFan, etc.)
│       ├── src/ui/            # Tavern UI, HUD, Inspection Examination Desk, BribeScale, Modals
│       ├── src/net/           # Colyseus SDK 0.18 client manager with dynamic runtime WS URL autodetection
│       ├── src/state/         # Zustand client game store (gameStore.ts)
│       ├── src/audio/         # Procedural Web Audio API sound manager
│       └── src/theme/         # Centralized design tokens (parchment, walnut, emerald, crimson, royal)
├── deploy/                    # Turnkey cloud deployment scripts (Azure VM, Linux VPS, Let's Encrypt SSL)
├── docs/                      # Comprehensive technical specifications & guides
│   ├── architecture.md        # PRIMARY Digital GDD & system specifications
│   ├── consultation-rulebook.md # Canonical CMON rulebook reference
│   ├── hosting.md             # Multi-cloud and self-hosted deployment documentation
│   ├── azure-deployment-guide.md # Step-by-step Azure Cloud VM deployment guide
│   ├── 2d-design-overhaul.md  # 2D visual system & interaction specifications
│   └── manual-tests.md        # Subjective & multi-client test scripts
├── nginx/                     # Production Nginx reverse proxy configuration
├── Dockerfile.server          # Multi-stage production container for Colyseus Node.js server
├── Dockerfile.client          # Multi-stage production container for Vite SPA & Nginx proxy
├── docker-compose.yml         # Unified production orchestration stack
└── init.md                    # Project roadmap and phase tracking
```

---

## 🎲 Rulebook & Engine Highlights

* **Exact Card Counts & Deck Composition (`docs/architecture.md` §2.1):**
  * **3-Player Base Deck:** 156 cards (108 Legal Goods: 48 Apples, 36 Cheese, 0 Bread, 24 Chickens; 48 Contraband: 18 Pepper, 16 Mead, 9 Silk, 5 Crossbow).
  * **3-Player with Royal Goods:** 162 cards (6 Royal Goods included; 6 marked 4+ removed).
  * **4–6 Player Base Deck:** 204 cards (144 Legal Goods: 48 Apples, 36 Cheese, 36 Bread, 24 Chickens; 60 Contraband: 22 Pepper, 21 Mead, 12 Silk, 5 Crossbow).
  * **4–6 Player with Royal Goods:** 216 cards (all 12 Royal Goods included).
* **Zero-Knowledge Privacy (`docs/architecture.md` §6.1):** Merchant bag contents and player hands are isolated authoritatively on the server via `@colyseus/schema` 5.0's `.view()`; non-owning clients only receive card counts until bags are formally opened.
* **4-Step Debt Liquidation Order (`docs/architecture.md` §2.2):**
  1. Cash on hand.
  2. Legal goods from merchant stand.
  3. Contraband goods from merchant stand (revealed).
  4. Empty stand wipes debt: if stand is completely exhausted, any remaining penalty debt is forgiven.
  * *Overpayment rule strictly enforced: surrendering a card with value exceeding the debt does not return change.*
* **King & Queen Bonuses (`docs/architecture.md` §2.3):**
  * Floored integer division on ties: Tied King adds King + Queen bonuses, divides equally between tied players (floored), and skips the Queen bonus. Tied Queen divides Queen bonus equally between tied players (floored).
  * Multi-tier tiebreakers: Total Score → Most Legal Goods → Most Contraband → Shared Victory.
* **All Expansion Modules Included (`docs/architecture.md` §3):**
  * **Royal Goods:** 12 special cards offering high legal bonus conversions.
  * **6-Player Deputies:** 2 rotating deputies, communal Booty Tile, and joint/solo pass/inspect decisions.
  * **Black Market:** High-stakes trade-in demand orders for contraband sets.

---

## 🚀 Quickstart & Local Development

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

## ☁️ Production Hosting & Deployment

The game is fully containerized and ready for cloud deployment on **Microsoft Azure**, AWS, DigitalOcean, Hetzner, or private VPS servers:

* **Comprehensive Hosting Guide:** See [`docs/hosting.md`](file:///C:/projects/BlackMarketDigi/docs/hosting.md).
* **Azure Step-by-Step Guide:** See [`docs/azure-deployment-guide.md`](file:///C:/projects/BlackMarketDigi/docs/azure-deployment-guide.md).

### 1-Command VM Provisioning (Ubuntu 22.04 / 24.04 LTS)
```bash
git clone https://github.com/xrayian/BlackMarketDigi.git
cd BlackMarketDigi
chmod +x deploy/*.sh
sudo ./deploy/azure-setup.sh
```

### 1-Command Free Let's Encrypt SSL (HTTPS & WSS)
```bash
sudo ./deploy/setup-ssl.sh game.yourdomain.com your-email@example.com
```

### Zero-Downtime Updates
```bash
./deploy/update.sh
```

---

## 🗺 Implementation Roadmap

* [x] **Phase 0: Project Scaffolding & Colyseus 0.18 Baseline**
  * Monorepo setup, Schema 5.0 models, NottinghamRoom lobby, 4-character room codes, tavern lobby UI.
* [x] **Phase 1: Headless Rules Engine (100% Branch Coverage)**
  * Pure TypeScript deck generation, market discard/redraw, sealed bag loading, declaration, inspection, 4-step debt liquidation, endgame scoring with floored King/Queen splits, and expansion modules.
* [x] **Phase 2: Wire Rules Engine into NottinghamRoom**
  * Authoritative Colyseus 0.18 state transitions, zero-knowledge client views (`.view()`), atomic bribe negotiation protocol with sequence number buffer, 4-player integration tests.
* [x] **Phase 3: Top-Down 2D Tabletop Arena Retrofit**
  * Top-down 2D tabletop arena (`TableBoard2D`) seating 3–6 players with local player anchored in foreground, `PlayerStand2D` with coin purse and goods bins, `MarketBoard2D` with illustrated draw/discard piles, collapsible `ActionLedger`, and theme design tokens.
* [x] **Phase 4: 2D Core Loop UI: Market → Load Bag → Declaration**
  * Accessible `@dnd-kit/core` drag-and-drop card loading, curved `HandCardFan` with hover lift, tactile burlap sack drop target with squash-and-settle animations, inline parchment `DeclarationPanel` with wax seal stamping, and start player selector.
* [x] **Phase 5: 2D Examination Desk & Bribe Negotiation**
  * 1-on-1 examination desk viewport, spring-weighted illustrated `BribeScale` with tipping audio, sustained 1.2s radial progress hold clasp with tension ramp, staggered card flip reveals, scroll-unfurl debt liquidation receipt, and 1.5s reaction buffer lock.
* [x] **Phase 6: Expansion Modules**
  * Royal Goods (12 cards, bonus conversions), 6-Player Deputies (2 rotating deputies, communal Booty Tile, joint/solo resolutions), and Black Market (3 order piles, trade-ins, client order board).
* [x] **Phase 7: Procedural Audio, Visual Polish & Accessibility**
  * Procedural Web Audio API sound synthesizer (`soundManager.ts`) with continuous tavern ambience, settings modal with SFX/music toggles, reduced motion modes, and color-independent card classification guides.
* [x] **Phase 8: Anti-Cheat Hardening & Fuzzing**
  * Strict server-side action validation returning `{ message }` errors, fuzz test suite simulating malicious client packets, adversarial bag/declaration tampering prevention, and 88 passing tests.
* [x] **Phase 9: Cloud Deployment & Containerization**
  * Production Dockerfiles (`Dockerfile.server`, `Dockerfile.client`), unified Nginx reverse proxy (`nginx/default.conf`), runtime protocol/host autodetection, turnkey deployment scripts (`deploy/`), and comprehensive hosting documentation.
