<!--
NOTE FOR AI AGENTS:
This is the PRIMARY Digital Game Design Document (GDD) and Technical Architecture Spec.
It contains the authoritative section references (§1–§6) cited throughout init.md and the codebase:
§1 System Vision, §2 Rules Engine, §3 Expansion Modules, §4 State Models/Schemas, §5 UI/UX Paradigms, §6 Security & Anti-Cheat.
For the physical board game rulebook consultation, refer to: docs/consultation-rulebook.md.
-->

# Game Design & Technical Architecture Document: Sheriff of Nottingham (2nd Edition Digital)

---

## 1. System Vision & Core Game Loop

The objective of this system is to translate *Sheriff of Nottingham (2nd Edition)* into a high-stakes, server-authoritative web application for 3 to 6 players[cite: 1]. The digital medium must avoid feeling like a flat board-game port; it requires tactile micro-interactions, low-latency negotiation states, and cryptographic-grade hidden information security.

```
+-------------------------------------------------------------------------------+
|                                  GAME LOOP                                    |
|                                                                               |
|  [SETUP] ---> [PHASE 1: MARKET] -------> [PHASE 2: LOAD BAG]                  |
|                   ^                             |                             |
|                   |                             v                             |
|  [PHASE 5: END] <-+-- [PHASE 4: INSPECT] <--- [PHASE 3: DECLARATION]          |
|         |                                                                     |
|         +---> (Condition Met) ---> [FINAL SCORING & WINNER]                   |
+-------------------------------------------------------------------------------+
```

The game progresses through five sequential phases per round[cite: 1]:
1. **Market:** Clockwise from the starting player chosen by the Sheriff, merchants discard up to 5 cards and draw back to 6[cite: 1]. The Sheriff does not participate[cite: 1].
2. **Load Merchant Bag:** Merchants secretly pack 1 to 5 cards into their bag and snap it shut[cite: 1].
3. **Declaration:** Clockwise from the Sheriff’s left, merchants declare the exact card count and exactly one Legal Good type[cite: 1].
4. **Inspection:** The Sheriff interrogates merchants, negotiates bribes, and either passes or inspects each bag[cite: 1].
5. **End of Round:** Bag contents are stashed or discarded[cite: 1], hands replenish to 6[cite: 1], the Sheriff role rotates clockwise[cite: 1], and win-checks trigger[cite: 1].

---

## 2. Rule Engine & Mechanic Specifications

### 2.1 Game Setup & Player Scaling
* **Player Counts:** 3 to 6 players[cite: 1].
* **Starting Currency:** Exactly 50 Gold per player[cite: 1].
* **Hand Capacity:** Default 6 cards (or 7 if using the optional Seven Card Hand variant)[cite: 1].
* **Deck Filtration (3-Player Game):** Remove all cards marked with the `4+` icon before shuffling[cite: 1]:
  * Remove 36 Bread, 4 Pepper, 5 Mead, and 3 Silk[cite: 1].
  * If Royal Goods are active: remove 1 Golden Apple, 1 Blue Cheese, 2 Rye Bread, 1 Pumpernickel Bread, and 1 Royal Rooster[cite: 1].
* **Card Breakdown Table[cite: 1]:**

| Card Name | Classification | 3-Player Count | 4–6 Player Count | Value (Gold) | Inspection Penalty |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Apples** | Legal | 48 | 48 | 2 | 2 |
| **Cheese** | Legal | 36 | 36 | 3 | 2 |
| **Bread** | Legal | 0 | 36 | 3 | 2 |
| **Chickens** | Legal | 24 | 24 | 4 | 2 |
| **Pepper** | Contraband | 18 | 22 | 6 | 4 |
| **Mead** | Contraband | 16 | 21 | 7 | 4 |
| **Silk** | Contraband | 9 | 12 | 8 | 4 |
| **Crossbow** | Contraband | 5 | 5 | 9 | 4 |
| *Green Apples* | Royal (Contraband) | 2 | 2 | 4 | 3 |
| *Golden Apples* | Royal (Contraband) | 1 | 2 | 6 | 4 |
| *Gouda Cheese* | Royal (Contraband) | 2 | 2 | 6 | 4 |
| *Blue Cheese* | Royal (Contraband) | 0 | 1 | 9 | 5 |
| *Rye Bread* | Royal (Contraband) | 0 | 2 | 6 | 4 |
| *Pumpernickel* | Royal (Contraband) | 0 | 1 | 9 | 5 |
| *Royal Rooster* | Royal (Contraband) | 1 | 2 | 8 | 4 |

### 2.2 Phase-by-Phase Mechanics

#### Phase 1: Market
* The active Sheriff selects the starting player[cite: 1].
* Moving clockwise, each merchant sets aside 0 to 5 cards faceup from their hand, then draws an equivalent count from the facedown draw pile to restore a 6-card hand[cite: 1].
* Players cannot draw from the discarded cards[cite: 1].
* Once all merchants complete their draw, the Sheriff sweeps all set-aside cards into a single faceup discard pile next to the Goods deck[cite: 1].
* If the draw pile empties, the discard pile is shuffled to form a new facedown deck[cite: 1].

#### Phase 2: Load Merchant Bag
* All merchants act simultaneously[cite: 1].
* Valid input: Array of card IDs between 1 and 5 items long[cite: 1].
* Once the player triggers the "Snap Bag" action, their selection is immutable for the remainder of the round[cite: 1]. The client UI locks immediately.

#### Phase 3: Declaration
* Sequential order starting from the player to the Sheriff’s left[cite: 1].
* Validation logic:
  * `declared_count` must strictly equal `bag.cards.length`[cite: 1].
  * `declared_good` must strictly be one of: `APPLES`, `CHEESE`, `BREAD`, `CHICKENS`[cite: 1].
  * Declaring Contraband or multiple goods is forbidden by the input validator[cite: 1].

#### Phase 4: Inspection & Escrow
* The Sheriff inspects bags sequentially in any order desired[cite: 1].
* **Bribe Components:** Gold, Legal Goods from stand, Contraband from stand, Goods promised from inside the bag, and non-binding future promises[cite: 1]. Cards currently in hand or Gold exceeding current balance cannot be offered[cite: 1].
* **Inspection Outcomes:**
  * **Pass Unopened:** Merchant reveals only Legal Goods to their public stand[cite: 1]. Contraband is placed facedown above their stand; only the quantity of smuggled contraband cards is announced/visible to opponents[cite: 1]. Any agreed bribe is transferred to the Sheriff[cite: 1].
  * **Inspected — Honest:** If all cards match the declared good, the Sheriff pays the merchant a penalty equal to the sum of the penalties on all cards in the bag[cite: 1]. The merchant places all goods faceup on their stand[cite: 1].
  * **Inspected — Dishonest:** Declared goods matching the claim are placed faceup on the merchant's stand[cite: 1]. All undeclared goods (both legal and contraband) are confiscated and moved directly to the discard pile[cite: 1]. The merchant pays the Sheriff a fine equal to the sum of penalties of all confiscated cards[cite: 1].

#### Debt Resolution Algorithm (Running Out of Gold)
If a player owes penalties exceeding their liquid Gold, the engine enforces the following liquidation order[cite: 1]:
1. Deduct all liquid Gold[cite: 1].
2. Require the player to select Legal Goods from their stand with total value greater than or equal to the remaining debt[cite: 1]. Overpayment does not return change[cite: 1]. Transferred goods move to the creditor's stand[cite: 1].
3. If still indebted, require selection and revelation of facedown Contraband from their stand until debt is satisfied[cite: 1]. These move to the creditor's stand[cite: 1].
4. If the player's stand is completely empty and a deficit remains, the outstanding balance is wiped clean[cite: 1].

#### Phase 5: End of Round & Endgame Trigger
* All players draw cards to restore a 6-card hand[cite: 1].
* Pass the Sheriff role clockwise to the next player[cite: 1].
* **Game End Conditions[cite: 1]:**
  * 3-Player Game: Each player has been Sheriff 3 times[cite: 1].
  * 4- or 5-Player Game: Each player has been Sheriff 2 times[cite: 1].
  * 6-Player Game (Deputies Module): The Deputy deck has run out for the 3rd time[cite: 1].

### 2.3 Final Scoring Computation
Final points are tallied as follows[cite: 1]:
* Total Value of all Legal Goods in Merchant Stand[cite: 1].
* Total Value of all Contraband Goods in Merchant Stand[cite: 1].
* Remaining Liquid Gold coins[cite: 1].
* King and Queen Bonuses[cite: 1].
* Value of claimed Black Market cards (if active)[cite: 1].

King and Queen bonuses award victory points to the 1st and 2nd highest quantities of each Legal Good[cite: 1]:
* Apples: King = 20, Queen = 10[cite: 1].
* Cheese: King = 15, Queen = 10[cite: 1].
* Bread: King = 15, Queen = 10[cite: 1].
* Chickens: King = 10, Queen = 5[cite: 1].

**Tie-Breaking Rules[cite: 1]:**
* *Tied King:* Sum King + Queen bonuses, divide equally among tied players (floored)[cite: 1]. No Queen bonus is awarded[cite: 1].
* *Tied Queen:* Divide Queen bonus equally among tied players (floored)[cite: 1].
* *Overall Game Ties:* Tiebreaker 1 = Most Legal Goods on stand[cite: 1]. Tiebreaker 2 = Most Contraband Goods on stand[cite: 1]. Tiebreaker 3 = Shared victory[cite: 1].

---

## 3. Expansion Modules Specification

### 3.1 Royal Goods Module
* Royal Goods cards are shuffled into the main deck during setup[cite: 1].
* Treated as Contraband during bag loading, declarations, and inspections (subject to confiscation and listed penalties)[cite: 1].
* Smuggled Royal Goods sit facedown above the merchant stand[cite: 1].
* At final scoring, Royal Goods convert to their depicted legal equivalents (e.g., a Gouda Cheese card adds 2 Cheese units toward the Cheese King/Queen count) in addition to awarding their face victory value[cite: 1].

### 3.2 6-Player Deputy Module
* Setup involves 2 Deputy standees, 6 Deputy cards, and a Booty tile[cite: 1].
* Two players serve as Deputies per round, drawn via the Deputy deck[cite: 1].
* Inspection rules[cite: 1]:
  * **Joint Pass:** Both Deputies agree to pass[cite: 1]. Bribes are placed onto the communal Booty tile[cite: 1].
  * **Joint Inspect:** Both agree to inspect[cite: 1]. If honest, each Deputy pays 50% of the penalty to the merchant out of personal gold (rounded down)[cite: 1]. If lying, fines go to the Booty tile[cite: 1].
  * **Split Decision (Solo Action):** If Deputies disagree, one Deputy may act alone[cite: 1]. The solo Deputy collects the bribe or pays/receives all penalties individually[cite: 1].
* At phase end, Gold and cards on the Booty tile are split evenly between both Deputies; remainders are discarded unless mutually resolved[cite: 1].

### 3.3 Black Market Module
* Setup contains 3 stacks of 2 faceup cards (one stack each for Pepper, Mead, Silk), ordered with higher-value cards on top[cite: 1].
* After receiving their bag back in Phase 4, a merchant may trade in 3 matching Contraband cards from their stand to claim the top card of that type[cite: 1].
* Claimed cards are placed in the merchant's contraband pile and score points at game end[cite: 1]. Limit: 1 Black Market claim per merchant per round[cite: 1].

---

## 4. State Models & JSON Schemas

### 4.1 Abstract State Interface (TypeScript)

```typescript
export type GoodType = 'APPLE' | 'CHEESE' | 'BREAD' | 'CHICKEN';
export type ContrabandType = 'PEPPER' | 'MEAD' | 'SILK' | 'CROSSBOW';
export type CardType = 'LEGAL' | 'CONTRABAND' | 'ROYAL';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  baseGood?: GoodType;
  royalBonusCount?: number;
  value: number;
  penalty: number;
}

export interface BribeOffer {
  gold: number;
  standCardIds: string[];
  inBagCardClaims: { goodType: GoodType | ContrabandType; count: number }[];
  nonBindingTerms?: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';
}

export interface PlayerState {
  id: string;
  gold: number;
  hand: Card[]; // Private to player
  standLegal: Record<GoodType, Card[]>; // Public
  standContraband: Card[]; // Public count, private card data until endgame
  sealedBag?: {
    cardCount: number; // Public
    cards: Card[]; // Cryptographically hidden on server
    declaration: { count: number; goodType: GoodType };
  };
}

export interface GameState {
  lobbyId: string;
  phase: 'MARKET' | 'LOAD_BAG' | 'DECLARATION' | 'INSPECTION' | 'ROUND_END' | 'GAME_OVER';
  round: number;
  sheriffId: string;
  deputyIds?: string[];
  activeMerchantId?: string;
  marketTurnPlayerId?: string;
  discardPile: Card[];
  players: Record<string, PlayerState>;
  activeBribe?: BribeOffer;
  bootyTile?: { gold: number; cards: Card[] };
}
```

### 4.2 Concrete State Instance (Active Inspection Turn)

```json
{
  "lobbyId": "match_nottingham_902",
  "phase": "INSPECTION",
  "round": 3,
  "sheriffId": "usr_sheriff_dave",
  "activeMerchantId": "usr_merchant_robin",
  "discardPile": [
    { "id": "card_chick_12", "name": "Chicken", "type": "LEGAL", "value": 4, "penalty": 2 }
  ],
  "players": {
    "usr_sheriff_dave": {
      "id": "usr_sheriff_dave",
      "gold": 46,
      "standLegal": { "APPLE": [], "CHEESE": [], "BREAD": [], "CHICKEN": [] },
      "standContrabandCount": 1
    },
    "usr_merchant_robin": {
      "id": "usr_merchant_robin",
      "gold": 38,
      "standLegal": {
        "APPLE": [{ "id": "card_app_01", "name": "Apple", "type": "LEGAL", "value": 2, "penalty": 2 }],
        "CHEESE": [],
        "BREAD": [],
        "CHICKEN": []
      },
      "standContrabandCount": 2,
      "sealedBag": {
        "cardCount": 4,
        "declaration": {
          "count": 4,
          "goodType": "CHEESE"
        }
      }
    }
  },
  "activeBribe": {
    "gold": 6,
    "standCardIds": ["card_app_01"],
    "inBagCardClaims": [
      { "goodType": "PEPPER", "count": 1 }
    ],
    "nonBindingTerms": "Will not smuggle contraband next round",
    "status": "PROPOSED"
  }
}
```

---

## 5. UI/UX Paradigm: Calibrated for Digital Medium

### 5.1 Dynamic Viewport Architecture
* **Table View (Global Arena):** 
  * Circular or horseshoe seating displaying 3D-styled merchant stands with visible coin piles and faceup legal cards.
  * Opponent contraband appears as stacked, facedown, wax-sealed card backs showing aggregate count.
* **The Examination Desk (Phase 4 Focus):**
  * When the Sheriff initiates inspection on a player, the viewport transitions into an over-the-shoulder 1-on-1 negotiation layout.
  * The center stage features the active Merchant Bag, an interactive Scale/Bribe Plate, and real-time ledger updates.

### 5.2 Micro-Interactions & Haptic Tactility
* **The "Snap Bag" Latch:**
  * Dragging cards into the bag triggers physics-based insertion with a soft leather sound effect.
  * Confirming bag closure requires the merchant to pull down an animated metal snap fastener. An audible, punchy *SNAP* sound plays across the room, permanently locking the bag.
* **The Sheriff's Snap Tension:**
  * Instead of a conventional "Inspect" button, the Sheriff holds down a "Unsnap Bag" clasp. 
  * The button requires a 1.2-second sustained hold while a tension sound ramps up. The action can be canceled at 1.1 seconds; at 1.2 seconds, the snap cracks, triggering irreversible bag opening.
* **The Bribe Scale:**
  * Offers populate a balance scale between the Merchant and Sheriff. Coins and cards visually weigh down the tray, providing instant feedback on bribe value.

---

## 6. System Architecture & Anti-Cheat Security

```
+---------------------------------------------------------------------------------+
|                               SERVER BOUNDARY                                   |
|                                                                                 |
|   [PostgreSQL] <---> [Prisma ORM] <---> [NestJS Game Engine] <---> [Redis]      |
|                                                  ^                (Locks/Room   |
|                                                  |                 State Cache) |
+--------------------------------------------------|------------------------------+
                                            WSS Events
                                       (Delta Serialized)
                                                   |
                                                   v
                                   [Nuxt 3 / Vue 3 Pinia Client]
                                     - Canvas / WebGL Layer
                                     - Web Audio Context Engine
                                     - Local Escrow Prediction
```

### 6.1 Information Masking (Zero-Knowledge Serialization)
* **Client-Side Packet Sanitization:** Bag card IDs are stored exclusively in the server-side Redis game state. Payloads transmitted via WebSocket gatekeeper sanitize all `cards` arrays for sealed bags, broadcasting only `{ cardCount: number, declaration: DeclarationDTO }` to non-owners.
* **Deck Integrity:** The draw pile is stored solely on the server. Clients receive draw notifications only after cards have left the deck and been committed to a private player hand payload.

### 6.2 Race Conditions & Transactional Escrow
* **Optimistic Action Locks:** All bribe offers and counter-offers trigger an atomic CAS (Compare-And-Swap) transaction in Redis.
* **The 1.5-Second Reaction Buffer:** If a merchant alters their bribe offer (e.g., increments Gold from 2 to 8), any pending "Accept" action by the Sheriff is invalidated, and the Sheriff's action buttons are disabled for 1500ms to eliminate bait-and-switch network latency exploits.
* **Network Reconnection Protocol:** Upon socket reconnection, the client receives a deterministic room snapshot containing only the data points their specific authenticated session is authorized to view, instantaneously rehydrating the local Pinia store.