# Manual Test Scripts

> Automated tests are strongly preferred. Only add entries here for genuinely
> subjective checks that cannot be verified programmatically (e.g. "does the
> snap sound feel punchy").

## Phase 0: Lobby UX & Multi-Client Join
- [x] Multi-tab connection check:
  - Tab 1: Create room as Merchant A. Copy generated 4-letter room code.
  - Tab 2: Join room using code as Merchant B.
  - Verify: Both tabs show both merchants in the caravan list.
  - Verify: Toggling ready state on either tab updates immediately on both tabs.
  - Subjective: Medieval tavern aesthetic (Cinzel gold headings, dark parchment styling, smooth Framer Motion transitions).

## Phase 3: 3D Tavern Table & Scene Rendering
- [x] 3–6 Player Seating Layouts & Camera Positioning:
  - Start client dev server (`npm run dev --workspace=@sheriff/client`).
  - Verify 3, 4, 5, and 6 player seating configurations around circular banquet table.
  - Formula: `seatDiff = player.seatIndex - localSeatIndex; angle = (seatDiff / totalSeats) * Math.PI * 2 - Math.PI / 2; rotY = -angle - Math.PI / 2`.
  - Verify: Local player's stand is always anchored at the bottom-center foreground facing the table.
  - Verify: No merchant stands, coin piles, or merchant bags collide or overlap across all 3, 4, 5, and 6 player layouts.
  - Verify: Clamped OrbitControls allow smooth table inspection without camera clipping beneath the felt.
- [x] Merchant Stand Display & Visual State:
  - Coin Piles: Instanced cylinder mesh stacks scale visually based on player gold (1-10, 11-25, 26-50, 50+ coins) with floating 3D numeric gold count badge.
  - Legal Goods Slots: Four dedicated wooden compartments for Apples, Cheese, Bread, and Chicken. Stacked cards render with custom procedural heraldic card textures.
  - Contraband Vault: Facedown cards placed in velvet-lined contraband vault with a crimson wax seal medallion showing only the aggregate count (zero-knowledge privacy).
  - Merchant Bag: 3D pouch mesh in player's livery color, cinch ring, and metallic snap clasp with floating status indicator ("Unopened", "Inspecting", "Declared").
- [x] Tavern Atmosphere & Post-Processing:
  - Tavern Lighting: Center candle with dynamic flicker (`Math.sin` + `Math.cos` jitter in `useFrame`), soft ambient tavern fill, key light with shadows, and fireplace rim light.
  - Post-Processing: Subtle bloom on gold coins and card foil, atmospheric vignette framing the table.
  - Performance: Stable 60fps on mid-tier GPU with instanced coin meshes and shared canvas textures.
- [x] Reactive State Synchronization:
  - `Colyseus room.onStateChange` -> `useGameStore.getState().updateGameState(state)` -> `Table` and `MerchantStand` props.
  - Verify: Changes in player gold, stand cards, or bag status immediately reflect on the 3D table without requiring manual re-renders.

## Phase 4: Core Loop UI — Market → Load Bag → Declaration
- [ ] Full 4-client Market → Load Bag → Declaration cycle:
  - Open 4 browser tabs. Create room in tab 1, join with tabs 2–4. Toggle all ready, start game.
  - **MARKET Phase:**
    - Verify: Sheriff sees "Select Starting Merchant" with buttons for each non-sheriff player.
    - Verify: Non-sheriff players see "Waiting for Sheriff to select starting player..."
    - Sheriff clicks a merchant. That merchant's tab shows the hand tray with selectable cards.
    - Active merchant selects 0–5 cards, clicks "Confirm Exchange". Hand refreshes with new cards from draw pile.
    - Verify: Turn advances clockwise to the next merchant automatically.
    - Verify: Sheriff tab shows "Observing market exchanges... Watch for clues!" with current merchant's name.
    - Verify: Other merchants see "Waiting for [name]'s turn..."
    - After all merchants exchange → phase transitions to LOAD_BAG.
  - **LOAD BAG Phase:**
    - Verify: Sheriff sees "Merchants are loading their bags..." with status for each merchant.
    - Verify: Each merchant sees hand tray with selectable cards and "Snap Bag Shut! 🔒" button.
    - Verify: "Snap Bag Shut!" is disabled until 1–5 cards are selected.
    - Merchant selects 3 cards, clicks snap. Tab shows "🔒 Bag Sealed!" with card count and other merchants' status.
    - Verify: Attempting to select >5 cards is prevented.
    - After all merchants snap → phase transitions to DECLARATION.
  - **DECLARATION Phase:**
    - Verify: Declaration order starts from player to Sheriff's left, proceeding clockwise.
    - Active merchant sees 4 good-type buttons (🍎 Apples, 🧀 Cheese, 🍞 Bread, 🐔 Chickens) and bag card count.
    - Verify: "Declare!" button is disabled until a good type is selected.
    - Merchant selects a good and clicks "Declare!". Tab shows "You declared: X [Good]".
    - Verify: Sheriff sees each merchant's declaration status updating live.
    - Verify: Other merchants see "[Name] is declaring..." and previous declarations.
    - After all merchants declare → phase transitions to INSPECTION.
  - **Server Validation Errors:**
    - Attempt invalid declaration (e.g., modify client to send contraband type) → verify crimson error toast appears with server rejection message.
    - Error toast auto-dismisses after 5 seconds or can be manually closed with ✕.

## Phase 5: Inspection & Bribe Negotiation ("The Examination Desk")
- [ ] 1-on-1 Examination Desk Viewport Transition:
  - In INSPECTION phase, Sheriff sees list of uninspected merchants.
  - Sheriff selects a merchant → verify camera smoothly animates and eases from global table view to 1-on-1 Examination Desk angle.
  - Verify: Selected merchant's declared goods and card count display prominently.
- [ ] Bribe Scale & Atomic Negotiation:
  - Merchant adjusts gold slider, selects stand goods, or adds non-binding promises.
  - Merchant clicks "Transmit Bribe Offer" → coin sound plays.
  - Verify: Bribe Scale beam dynamically tilts with spring physics; plate shows gold and card icons.
  - Verify: Sheriff sees proposal and has "Accept Bribe" / "Reject Bribe" buttons.
  - Merchant modifies offer → verify 1.5s reaction buffer lock triggers with visual amber pulse, disabling Sheriff acceptance until cooldown clears.
- [ ] Sheriff's Unsnap Bag Clasp & Tension Hold:
  - Sheriff presses down on "Hold to Unsnap Bag":
    - Verify: Tension sound ramp immediately begins ascending in pitch.
    - Progress ring fills towards 1.2s threshold.
  - Sheriff releases button before 1.1s (e.g., at 0.5s):
    - Verify: Tension audio stops instantly, progress resets to 0, clasp returns to rest, and NO inspection occurs.
  - Sheriff presses down and sustains hold for full 1.2s:
    - Verify: At 1.2s threshold, punchy metallic SNAP sound triggers, irreversible bag inspection executes, and results modal opens.
- [ ] Three Inspection Outcomes & Guided Debt Liquidation:
  - **Pass Unopened:** Sheriff clicks "Pass Unopened" → pass chime plays, modal displays legal goods placed on stand and contraband stashed face-down; any agreed bribe transfers to Sheriff.
  - **Inspected Honest:** Merchant loaded only declared goods → triumph fanfare plays, Sheriff pays penalty to merchant, modal displays penalty breakdown.
  - **Inspected Dishonest:** Merchant smuggled contraband → discord stinger plays, contraband confiscated to discard, merchant pays fine to Sheriff.
  - **Debt Liquidation Flow:** When debtor lacks liquid gold for full penalty, modal displays guided 4-step liquidation (cash deducted → stand legal goods surrendered → stand contraband surrendered → empty stand wipes remaining debt).

