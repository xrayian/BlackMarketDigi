# Client Package — AGENT.md

## Tech Stack
- React 18 + Vite + TypeScript
- React Three Fiber for 3D rendering (table, stands, bags, cards)
- @react-three/drei for helpers (OrbitControls, etc.)
- @react-three/postprocessing for bloom/vignette (Phase 7)
- @react-spring/three for 3D spring animations
- Framer Motion for 2D HUD animations
- Tailwind CSS for 2D overlay UI
- Zustand for client-side state
- @colyseus/sdk 0.18 (`Callbacks.get(room)`) for server connection and reactive state sync
- Howler.js for audio (Phase 7)

## Architecture
- `/scene` — React Three Fiber components (3D world)
- `/ui` — Tailwind CSS overlay components (2D HUD, lobby, menus)
- `/net` — Colyseus client connection and room state sync
- `/state` — Zustand stores
- `/audio` — Sound management with Howler.js

## Conventions
- 3D scene components live in /scene, 2D overlay in /ui. Never mix.
- Network layer syncs Colyseus state → Zustand store. Components read from Zustand only.
- All colors use the custom Tailwind theme (tavern-*, gold-*, parchment, etc.)
- Font: Cinzel for headings/display, Inter for body text

## Current Phase: Phase 6 Completed (Expansion Modules)
- **Phase 5 (The Examination Desk):**
  - `soundManager.ts`: Procedural Web Audio API sound synthesizer providing cancelable 1.2s tension sound ramp, mechanical snap, metallic coin drop, wooden gavel strike, and outcome chords.
  - `CameraRig.tsx`: Smooth camera interpolation between Table View and 1-on-1 Examination Desk angle.
  - `BribeScale.tsx`: Interactive balance scale visualizer whose brass beam tilts dynamically using spring physics based on total bribe weight.
  - `UnsnapClasp.tsx`: Sheriff's 1.2s sustained hold clasp button with tension audio ramp, release cancellation at <1.1s, and snap crack at 1.2s.
  - `BribeNegotiationPanel.tsx`: Bribe proposal builder with 1.5s reaction buffer lock on modified offers.
  - `InspectionOutcomeModal.tsx`: Visual feedback modal for Pass Unopened, Honest, and Dishonest outcomes with guided 4-step debt liquidation.
  - `ExaminationDesk.tsx`: Master Examination Desk orchestrator.
- **Phase 6 (Expansion Modules UI & Scene):**
  - `Lobby.tsx`: Added Caravan Rules & Expansions configuration section. Host controls for player capacity (3–6), Royal Goods, 6-Player Deputies (6p only), and Black Market with dynamic `update_lobby_options` synchronization.
  - `ExaminationDesk.tsx`: Added 6-player Deputies controls allowing local deputies to execute Joint Pass, Joint Inspect, Solo Pass, and Solo Inspect. Displays communal Booty Tile gold and goods count.
  - `BlackMarketPanel.tsx`: Collapsible floating HUD panel displaying the 3 black market order piles (Pepper, Mead, Silk), remaining counts, points values, and active "Trade 3" buttons for qualified merchants.
  - `GameScene.tsx`: Added Deputies badge and Booty Tile counter in the top HUD bar; rendered `BlackMarketPanel`.
  - `MerchantStand.tsx`: Added Royal Goods 3D card stack and purple crown medallion (`standRoyalCount`), displaying Royal Goods safely isolated on player stands.
- Ready for Phase 7: Micro-interactions, audio, visual polish.

## Gotchas & Decisions
- **Angular Seating Formula**: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2` ensures the local player is always in the foreground facing the center, while other players arrange clockwise.
- **Instancing vs Multiple Meshes**: Coins use `instancedMesh` to keep draw calls minimal across 6 players with hundreds of coins.
- **Zero-Knowledge 3D Rendering**: Never inspect or render faces of cards in the contraband vault or uninspected opponent bags. Stand renders facedown backs with aggregate count badge.
- **Vite 6 strict TS**: `noUnusedLocals` is enabled. All imports must be actively referenced in TSX files.

