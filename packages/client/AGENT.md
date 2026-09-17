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

## Current Phase: Phase 5 Completed (Inspection & Bribe Negotiation — "The Examination Desk")
- **soundManager.ts**: Procedural Web Audio API sound synthesizer providing cancelable 1.2s tension sound ramp (160Hz→620Hz), mechanical snap, metallic coin drop, wooden gavel strike, and outcome chords (honest fanfare, dishonest discord stinger, pass chime).
- **CameraRig.tsx**: Smooth `useFrame` camera position & target interpolation between Table View `(0, 5.4, 6.8)` and 1-on-1 Examination Desk angle `(0, 3.4, 4.4)` when `activeMerchantId` is set.
- **BribeScale.tsx**: Interactive balance scale visualizer whose brass beam tilts dynamically using spring physics based on total bribe weight (coins, stand goods, bag claims).
- **UnsnapClasp.tsx**: Sheriff's 1.2s sustained hold clasp button with ascending audio tension ramp, release cancellation at <1.1s without state mutation, and snap crack at 1.2s. Includes "Pass Unopened" action.
- **BribeNegotiationPanel.tsx**: Bribe proposal builder with gold sliders, stand cards selection, promised goods, and 1.5s reaction buffer lock on modified offers.
- **InspectionOutcomeModal.tsx**: Visual feedback modal for Pass Unopened, Honest, and Dishonest outcomes, plus guided 4-step debt liquidation display (cash → stand legal → stand contraband → wipe).
- **ExaminationDesk.tsx**: Master Examination Desk orchestrator connecting merchant selection, scale, negotiation, and inspection actions.
- **colyseus.ts**: Added `inspection_result` listener with audio cues.
- **gameStore.ts**: Added `lastInspectionResult`, `bribeReactionCooldown`, and 1.5s cooldown timer.
- Ready for Phase 6: Expansion Modules (Royal Goods, 6-Player Deputies, Black Market).

## Gotchas & Decisions
- **Angular Seating Formula**: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2` ensures the local player is always in the foreground facing the center, while other players arrange clockwise.
- **Instancing vs Multiple Meshes**: Coins use `instancedMesh` to keep draw calls minimal across 6 players with hundreds of coins.
- **Zero-Knowledge 3D Rendering**: Never inspect or render faces of cards in the contraband vault or uninspected opponent bags. Stand renders facedown backs with aggregate count badge.
- **Vite 6 strict TS**: `noUnusedLocals` is enabled. All imports must be actively referenced in TSX files.

