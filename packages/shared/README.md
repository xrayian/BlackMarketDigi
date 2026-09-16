# @sheriff/shared

The shared foundational library for **Sheriff of Nottingham Digital (2nd Edition)**. Contains pure TypeScript type definitions, official card catalogs, rule constants, and networking message protocols consumed by both the server (`@sheriff/server`) and client (`@sheriff/client`).

---

## 📦 Contents

| Module | Description |
| :--- | :--- |
| [`src/types.ts`](./src/types.ts) | Pure domain interfaces: `Card`, `GoodType`, `ContrabandType`, `RoyalGoodType`, `PlayerStand`, `SealedBag`, `InspectionResult`, `DebtResolutionResult`, `PlayerScoreBreakdown`, and `GamePhase`. |
| [`src/cards.ts`](./src/cards.ts) | Canonical card catalog defining all 204 base cards (legal goods, contraband) and 12 Royal Goods cards with values, penalties, and identifiers. |
| [`src/constants.ts`](./src/constants.ts) | Official rulebook constants: deck composition per player count, legal/contraband values and penalties, King/Queen bonus rewards, starting gold (50), turn timers, and sheriff rounds schedule. |
| [`src/messages.ts`](./src/messages.ts) | Client-to-server action message interfaces for all phase transitions (`MarketDiscardMessage`, `LoadBagMessage`, `DeclarationMessage`, `InspectionAction`, `BribeOfferMessage`, `BribeResponseMessage`, `SelectStartPlayerMessage`). |

---

## 🚀 Usage

Import types, constants, and card catalogs across workspaces:

```typescript
import {
  Card,
  GoodType,
  KING_BONUSES,
  QUEEN_BONUSES,
  BASE_CARDS,
  ROYAL_GOODS_CARDS,
  BribeOfferMessage,
} from '@sheriff/shared';
```

---

## 🛠 Scripts

```bash
# Build TypeScript declarations and dist files
npm run build

# Watch mode for active development
npm run dev
```
