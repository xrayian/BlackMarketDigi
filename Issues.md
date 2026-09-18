# Sheriff of Nottingham — Issues & Compliance Audit

> Generated: 2026-09-18 | Audited against **Sheriff of Nottingham 2nd Edition Official Rules**

---

## 🔴 Critical Issues

### ISSUE-001: Debt Resolution — No Debtor Player Choice on Goods Liquidation
**File:** [`packages/server/src/engine/debtResolution.ts`](file:///C:/projects/BlackMarketDigi/packages/server/src/engine/debtResolution.ts), [`packages/server/src/rooms/NottinghamRoom.ts`](file:///C:/projects/BlackMarketDigi/packages/server/src/rooms/NottinghamRoom.ts)
**Rule:** If a player lacks sufficient gold coins to pay a penalty (either Sheriff paying merchant for false accusation or Merchant paying Sheriff for smuggled goods), they must confiscate goods from their stand to pay the fine. The official rulebook states that the **debtor chooses** which goods to give to the creditor, and overpayment does not yield change.
**Current:** `resolveDebt` supports an optional `preferredLegalCardIds` array, but `NottinghamRoom.ts` calls `resolveDebt` synchronously during `executeInspect`. Goods are auto-liquidated based on array order (`pool.shift()`) rather than prompting the debtor player.
**Impact:** Removes player agency during penalty payments when a player is short on gold.
**Suggested Fix:** Break `executeInspect` into a two-step flow when gold is insufficient. Introduce a prompt / message to the debtor (`debt_choice_required`), allowing them to send `liquidate_goods` with their selected goods before the round continues.

---

## 🟡 Medium Issues

### ISSUE-002: Inconsistent Button Heights
**Files:** Various UI components in `packages/client/src/ui/`
**Summary:** Utility buttons alternate between `h-7`, `h-8`, and `h-9` across components. While primary execution and desk buttons have been standardized, smaller feed utility buttons (`h-7`) are slightly under the recommended minimum touch target for mobile/touchscreen players.
**Suggested Fix:** Standardize action buttons to `h-8` minimum (`32px`), preferring `h-9` (`36px`) for primary player actions.

---

## 🟢 Low Issues

### ISSUE-003: Color Contrast — Contraband vs Royal Goods Palette
**File:** [`packages/client/src/theme/tokens.ts`](file:///C:/projects/BlackMarketDigi/packages/client/src/theme/tokens.ts)
**Summary:** Contraband (`#a855f7`) and Royal goods (`#c084fc`) colors have similar purple hues. Distinction currently relies heavily on iconography (`⚜️` vs `👑`), which is functional but could be enhanced for colorblind users.
**Suggested Fix:** Increase hue separation or add distinct border styling/patterns for Royal goods.

---

## 🛠️ Resolved / Addressed Issues

### RESOLVED-001: UI Verbosity & Clutter Across Game Panels
**Files:** `packages/client/src/ui/` (MarketPanel, BagLoadingPanel, DeclarationPanel, ExaminationDesk, BribeNegotiationPanel, NegotiationLedger, NegotiationOfferModal, SettingsModal, GameScene, UnsnapClasp, etc.)
**Resolution:** Replaced clunky, overly verbose phrases with concise labels and clear medieval/table icons (e.g. `🔨` for Inspect/Check Pot, `🛡️` for Safe Passage, simplified declaration and loading banners, condensed status chips, and streamlined button actions) without altering any underlying game logic or state management.

---

## ✅ Fully Compliant Areas

| Rule Area | Status | Notes |
|-----------|--------|-------|
| Market Phase (2nd Edition) | ✅ | Discard up to 5 cards and draw back to 6; compliant 2nd Edition single discard pile with turn-by-turn ledger audit and discard pile inspection |
| Bag Loading (1-5 cards) | ✅ | `MIN_BAG_CARDS` (1) and `MAX_BAG_CARDS` (5) enforced, allows any mix of legal and contraband |
| Declaration (one legal good type) | ✅ | Must declare exactly one legal good; quantity must equal sealed bag card count |
| Inspection Penalties (honest/dishonest) | ✅ | Honest = Sheriff pays full penalty to Merchant; Dishonest = Merchant pays penalty on confiscated contraband/undeclared goods |
| Scoring (Gold + goods + King/Queen bonuses) | ✅ | Accurate King/Queen bonuses, King ties combine King+Queen split equally and skip Queen |
| Royal Goods (2nd Edition) | ✅ | Scored as contraband value plus bonus counts toward legal King/Queen standings |
| Deputies (6-Player) | ✅ | Two deputies share inspection, Booty Tile collects shared tributes, solo vs joint options |
| Black Market Orders | ✅ | 3 matching contraband sets, bonus points awarded, max 1 order claim per round |
| Sheriff Rotation | ✅ | Passes clockwise at the end of each round |
| Multi-Player Negotiation | ✅ | All players can participate simultaneously during inspection with binding table commitments |