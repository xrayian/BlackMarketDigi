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

