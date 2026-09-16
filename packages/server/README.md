# @sheriff/server

Authoritative multiplayer game server and headless rules engine for **Sheriff of Nottingham Digital (2nd Edition)**, powered by [Colyseus 0.18](https://docs.colyseus.io/) and `@colyseus/schema` 5.0.

---

## 🏗 Architecture

```
packages/server/
├── src/
│   ├── index.ts               # Server bootstrap (defineServer, defineRoom, transport)
│   ├── rooms/
│   │   └── NottinghamRoom.ts  # Room lifecycle, phase orchestration, atomic bribes, reconnection
│   ├── schema/
│   │   └── GameState.ts       # Schema 5.0 models (CardState, SealedBagState, PlayerState, GameState)
│   └── engine/                # Zero-dependency, headless rules engine (100% branch coverage)
│       ├── deck.ts            # Dynamic deck builder (3p vs 4-6p, Royal Goods), shuffle, draw
│       ├── debtResolution.ts  # 4-step debt liquidation order with strict overpayment rule
│       ├── scoring.ts         # Endgame scoring, floored King/Queen splits, multi-tier tiebreaker
│       ├── phases/
│       │   ├── market.ts      # Discard & draw exchange mechanics
│       │   ├── loadBag.ts     # Pouch card validation (1-5 cards) and snap mechanics
│       │   ├── declaration.ts # Legal goods declaration validation
│       │   └── inspection.ts  # Pass vs inspect resolutions, penalty calculations, bribe transfers
│       └── modules/
│           ├── royalGoods.ts  # Royal goods conversion and bonus scoring
│           ├── deputies.ts    # 6-player Deputies & Booty tile mechanics
│           └── blackMarket.ts # Black market demand orders & reward claims
└── test/
    ├── engine/                # Exhaustive unit tests for all engine modules
    └── rooms/                 # Colyseus 0.18 room integration tests
```

---

## 🔒 Security & Netcode Features

* **Zero-Knowledge State Isolation:** Private card data (`hand`, `sealedBag.cards`, `standContraband`, `standRoyal`) are protected using `@colyseus/schema` 5.0's `.view()`. Non-owning clients never receive private card payloads over the wire; only public counts (`handCount`, `cardCount`, `standContrabandCount`) are synchronized until cards are legally revealed.
* **Atomic Bribe Reaction Buffer:** Bribe proposals carry an auto-incrementing `sequenceNumber`. If a merchant modifies their bribe while the Sheriff is reviewing it, stale acceptances are rejected atomically.
* **Reconnection Window:** Disconnected players retain their seat and state for up to 30 seconds before voluntary drop cleanup triggers.

---

## 🧪 Testing & Coverage

The server codebase is tested with [Vitest 3](https://vitest.dev/) and V8 coverage:

```bash
# Run all unit and room integration tests
npm test

# Run tests with branch coverage report
npm run test:coverage
```

### Coverage Guarantee
* **100% statement and branch coverage** on all engine modules:
  * [`src/engine/debtResolution.ts`](./src/engine/debtResolution.ts)
  * [`src/engine/scoring.ts`](./src/engine/scoring.ts)
  * [`src/engine/deck.ts`](./src/engine/deck.ts)
  * [`src/engine/phases/*`](./src/engine/phases/)
  * [`src/engine/modules/*`](./src/engine/modules/)

---

## 🛠 Development Scripts

```bash
# Start Colyseus development server on ws://localhost:2567
npm run dev

# Build TypeScript output
npm run build
```
