# 📜 Manual Test Scripts & Verification Checklist

> Automated tests are strongly preferred (88 automated tests cover rules, state synchronization, and adversarial fuzzing).
> This document lists subjective visual, audio, and multi-device checks performed to verify full real-world playability.

---

## Phase 0: Lobby UX & Multi-Client Join
- [x] **Multi-tab connection check:**
  - Tab 1: Create room as Merchant A. Copy generated 4-letter room code.
  - Tab 2: Join room using code as Merchant B.
  - Verify: Both tabs show both merchants in the caravan list.
  - Verify: Toggling ready state on either tab updates immediately on both tabs.
  - Subjective: Medieval tavern aesthetic (Cinzel gold headings, dark parchment styling, smooth Framer Motion transitions).

---

## Phase 3: Top-Down 2D Tabletop Arena
- [x] **3–6 Player Seating Layouts & Local Anchor:**
  - Verify 3, 4, 5, and 6 player seating configurations around the circular tavern table.
  - Verify: Local player's stand is always anchored at the bottom-center foreground facing the table.
  - Verify: No merchant stands, coin purses, or sealed bags collide or overlap across all seating layouts.
- [x] **Merchant Stand Display & Visual State:**
  - Coin Purse: Displays player's liquid gold with glowing metallic coin badge.
  - Legal Goods Bins: Four dedicated compartments for Apples, Cheese, Bread, and Chickens showing count badges.
  - Contraband Vault: Facedown cards placed in vault with a crimson wax seal medallion showing only the count (zero-knowledge privacy).
  - Sealed Merchant Bag: Displays player's livery color, cinch ring, and status indicator ("Unopened", "Inspecting", "Declared").
- [x] **Central Market Board & Event Ledger:**
  - Illustrated draw pile and dual discard piles with live count badges and discard statistics.
  - Collapsible `ActionLedger` showing historical record of phase changes, trades, and inspection results.

---

## Phase 4: Core Loop UI — Market → Load Bag → Declaration
- [x] **Full 4-Client Market → Load Bag → Declaration Flow:**
  - **MARKET Phase:**
    - Sheriff selects starting merchant via start player picker buttons.
    - Active merchant's tab shows market panel with fanned cards. Merchant selects 0–5 cards and confirms exchange.
    - Bottomsheet minimizer toggle allows hiding/showing panel to inspect other players' stands.
    - Turn advances clockwise automatically until all merchants have exchanged.
  - **LOAD BAG Phase:**
    - Each merchant uses `@dnd-kit/core` drag-and-drop (or click-to-load) to pack 1–5 cards into their burlap sack.
    - Burlap sack plays Framer Motion squash-and-settle animation on card load.
    - Clicking "Snap Bag Shut! 🔒" plays bag snap audio and locks bag.
  - **DECLARATION Phase:**
    - Proceeding clockwise from Sheriff's left, each merchant selects 1 legal good token (🍎, 🧀, 🍞, 🐔).
    - Bag count is automatically locked to the number of loaded cards.
    - Clicking "Declare!" stamps wax seal and notifies all players.
  - **Server Validation Errors:**
    - Any invalid action (e.g. attempting to load 0 or >5 cards) triggers an auto-dismissing crimson error toast with the server's error message.

---

## Phase 5: Inspection & Bribe Negotiation ("The Examination Desk")
- [x] **1-on-1 Examination Desk Overlay:**
  - In INSPECTION phase, Sheriff sees merchant portrait cards with declared goods and bag counts.
  - Multi-merchant bribe offer queue tabs allow the Sheriff to review and switch between offers from any merchant.
- [x] **Bribe Scale & Atomic Negotiation:**
  - Merchant adjusts gold slider, selects stand goods, or adds non-binding promises and clicks "Transmit Bribe Offer".
  - Bribe Scale beam dynamically tilts proportionally based on bribe weight, playing metallic scale-tipping audio.
  - Modifying an offer activates a 1.5s reaction buffer lock on the Sheriff's screen to prevent race conditions.
- [x] **Sheriff's 1.2s Hold-to-Unsnap Clasp:**
  - Pressing "Hold to Unsnap Bag":
    - Ascending tension audio ramp plays as radial progress ring fills toward 1.2s.
  - Releasing before 1.1s:
    - Audio stops immediately, progress resets to 0, and bag remains sealed.
  - Sustaining hold for full 1.2s:
    - Metallic snap plays, bag is inspected, and results modal opens.
- [x] **Inspection Outcomes & Guided Debt Liquidation:**
  - **Pass Unopened:** Pass chime plays; goods placed on merchant stand and bribe transferred to Sheriff.
  - **Inspected Honest:** Triumph fanfare plays; Sheriff pays penalty to merchant.
  - **Inspected Dishonest:** Discord stinger plays; contraband confiscated and merchant pays fine to Sheriff.
  - **Debt Liquidation:** 4-step scroll-unfurl parchment receipt (Cash → Stand Legal → Stand Contraband → Debt Wipe).

---

## Phase 6: Expansion Modules
- [x] **Royal Goods Module:**
  - Royal cards filtered and shuffled into deck; rendered with golden 👑 crown badges.
  - Inspected as contraband; placed in private `standRoyal` upon passing; properly converts to legal equivalents for King/Queen bonus scoring.
- [x] **6-Player Deputies Module:**
  - 2 rotating deputies assigned per round; communal Booty Tile tracks shared fines and bribes.
  - Supports `JOINT_PASS`, `JOINT_INSPECT`, `SOLO_PASS`, and `SOLO_INSPECT` decisions.
  - Booty Tile split evenly between deputies at round end; odd coin discarded.
- [x] **Black Market Module:**
  - 3 persistent order stacks (Pepper, Mead, Silk) with dynamic bonus payouts.
  - Merchants can sacrifice 3 matching contraband cards from their stand once per round to claim order.

---

## Phase 7: Procedural Audio, Visual Polish & Accessibility
- [x] **Procedural Web Audio Suite:**
  - Background cozy tavern ambience (warm fireplace rumble, crackles) loops seamlessly without audio pops.
  - Individual SFX (card slide, scale tip, snap clasp, pass chime, honest fanfare, dishonest stinger) play smoothly.
- [x] **Settings Modal:**
  - Accessible via gear icon from both Lobby and Game Scene.
  - Toggles for Master Audio, Tavern Ambience, SFX, Reduced Motion, and Color-Independent Card Guides.
- [x] **Reduced Motion Mode:**
  - Disables spring overshoots, parallax tilts, and card fan curvature for vestibular safety.

---

## Phase 8: Anti-Cheat & UX Hardening
- [x] **Multi-Merchant Bribe Queue:**
  - Multiple merchants can send competing bribe offers simultaneously without overriding each other.
  - Sheriff can freely switch tabs between merchants and accept/reject without state collision.
- [x] **Self-Set Bribe Prevention:**
  - Sheriff cannot accept their own offers or crash the examination desk.
- [x] **Card Fan Hover Trapping:**
  - Hovering over fanned cards elevates dynamic z-index (`z-50`), eliminating mouse click entrapment.
- [x] **Turn Transition Selection Resets:**
  - Card discard selections reset cleanly upon turn and phase changes.

---

## Phase 9: Cloud Hosting & Multi-Device Cross-Play
- [x] **Docker Compose Multi-Container Stack:**
  - Running `docker compose up -d` boots both `sheriff_server` and `sheriff_client`.
  - Nginx routes both SPA assets and WebSocket upgrade connections over port 80/443 without CORS errors.
- [x] **Cross-Device Browser Testing:**
  - Tested game room connection across desktop browsers (Chrome, Edge, Firefox) and mobile Safari/Chrome.
  - Bottomsheet minimizers allow smooth viewing on touchscreens and narrow viewports.
- [x] **Reconnection Handling:**
  - Refreshing the browser or reconnecting within 30 seconds restores player seat and private hand without desyncing game state.
