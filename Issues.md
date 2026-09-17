This is a file that contains issues that are actively being tracked and reported.
Agents should read this file after all implementation is complete.

NOTE: THIS FILE WAS GENERATED MID IMPLEMENTATION. ALL REPORTED ISSUES HAVE BEEN RESOLVED AND TESTED:

- [x] **Sheriff currently can accept a bribe he himself set, but it must be accepted by the Merchant:**
  - *Resolution:* Proposer cannot respond to own bribe (`fromPlayerId === client.sessionId` check on server). Fixed recipient extraction when Sheriff makes counter-offer so pass-unopened executes on the target merchant rather than treating Sheriff as merchant. Only recipient sees Accept/Reject controls in `BribeNegotiationPanel.tsx`.

- [x] **Sheriff should be able to see other players bribe offers:**
  - *Resolution:* Added `bribeOffers: t.array(BribeOfferState)` to `GameState` schema and server. Added real-time merchant queue bar in `ExaminationDesk.tsx` showing each merchant's bribe amount and allowing instant 1-click switching.

- [x] **Cards in the UI have some z-index issues:**
  - *Resolution:* Fixed CSS stacking context trap in `HandCardFan.tsx` by elevating the outer parent container's `zIndex` to 100 on hover.

- [x] **The open seal button has UI issue, the button should be designed properly:**
  - *Resolution:* Replaced invalid Tailwind class `w-18 h-18` with fixed `w-[76px] h-[76px]`, rich wax seal styling, clear status indicators, and prominent typography in `UnsnapClasp.tsx`.

- [x] **The merchant bag loading tray should be minimizable:**
  - *Resolution:* Added a minimize/expand toggle button and floating pill status bar in `BagLoadingPanel.tsx`.

- [x] **Card discarding discard count not reset when next turn starts:**
  - *Resolution:* Fixed `updateGameState` in `gameStore.ts` so `selectedCardIds` is automatically reset to `[]` whenever the phase or active merchant changes.

- [x] **Observing market state bottom bar blocks current player from seeing their player stand:**
  - *Resolution:* Added minimize/expand toggle and floating pill bar in `MarketPanel.tsx`.

- [x] **All bottomsheets should be minimizable:**
  - *Resolution:* Both `MarketPanel.tsx` and `BagLoadingPanel.tsx` now feature minimize headers and sleek floating status pills.

- [x] **Internal game state issues causing card availability mismatch:**
  - *Resolution:* Root caused to stale `selectedCardIds` retaining previously discarded card IDs across turns/phases; fixed by resetting selections on phase/turn transitions and syncing client view permissions.

- [x] **The whole bribe mechanism needs to be reworked:**
  - *Resolution:* Server-side validation rejects non-integer/negative gold, gold > balance, unauthorized stand cards, and self-acceptance. Initial offer vs counter-offer flows implemented with clear offerer/accepter states and 1.5s reaction cooldown.