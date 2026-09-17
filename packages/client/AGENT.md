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

## Current Phase: Phase 4 Completed (Core Loop UI)
- **Phase 3 components** (Table, MerchantStand, Card3D, CoinPile, MerchantBag3D, CameraRig, TavernLighting, TavernEffects) remain unchanged.
- **MarketPanel.tsx**: Sheriff picks starting merchant, active merchant selects 0–5 cards to discard with card selection, confirms exchange, turn advances clockwise. Shows draw/discard pile counts.
- **BagLoadingPanel.tsx**: Merchants select 1–5 cards from hand, "Snap Bag Shut!" button locks selection via `load_bag` message. Shows snap status for all merchants. Sheriff sees waiting view.
- **DeclarationPanel.tsx**: Modal overlay with 4 legal good type picker buttons (🍎🧀🍞🐔), auto-counted card count from sealed bag. Sequential declaration per server turn order with live status updates.
- **CardDisplay.tsx**: Reusable 2D card component with type-colored backgrounds (emerald/amber/orange/yellow for legal, crimson for contraband, purple for royal), emoji icons, card name, value badge, and gold ring selection glow via Framer Motion.
- **ErrorToast.tsx**: Subscribes to `room.onMessage('error')` via Zustand store. Shows crimson toast with auto-dismiss (5s) and manual close.
- **GameScene.tsx**: Integrates MarketPanel, BagLoadingPanel, DeclarationPanel, and ErrorToast into the 2D overlay layer above the 3D Canvas.
- **gameStore.ts**: Extended with `selectedCardIds`, `toggleCardSelection`, `clearSelection`, `errorMessage`, `setError`, `clearError`. Auto-clears selection on phase transitions.
- **colyseus.ts**: Added `room.onMessage('error')` listener to surface server validation errors.
- Ready for Phase 5: Inspection & Bribe Negotiation ("The Examination Desk").

## Gotchas & Decisions
- **Angular Seating Formula**: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2` ensures the local player is always in the foreground facing the center, while other players arrange clockwise.
- **Instancing vs Multiple Meshes**: Coins use `instancedMesh` to keep draw calls minimal across 6 players with hundreds of coins.
- **Zero-Knowledge 3D Rendering**: Never inspect or render faces of cards in the contraband vault or uninspected opponent bags. Stand renders facedown backs with aggregate count badge.
- **Vite 6 strict TS**: `noUnusedLocals` is enabled. All imports must be actively referenced in TSX files.

