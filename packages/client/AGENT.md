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

## Current Phase: Phase 3 Completed (3D Table & Scene)
- **GameScene.tsx**: Orchestrates 3D Canvas, TavernLighting, TavernEffects, Table, and 2D HUD overlays (round counter, sheriff marker, phase banner, player status bar).
- **Table.tsx**: Circular banquet table with brass rim and dark green felt. Mathematically distributes 3–6 player stands around the perimeter, oriented facing the center. Local player is always anchored in the foreground at `-PI/2`.
- **MerchantStand.tsx**: Carved wooden tray with player nameplate, instanced `CoinPile`, 4 legal goods compartments (Apples, Cheese, Bread, Chicken) with stacked cards, and facedown contraband vault with crimson wax seal medallion showing only aggregate count (zero-knowledge privacy).
- **MerchantBag3D.tsx**: 3D pouch mesh in player's livery color, brass cinch ring, metallic snap clasp, and floating status indicator.
- **Card3D.tsx**: High-resolution procedural canvas textures for card fronts (Apples, Cheese, Bread, Chicken, Pepper, Mead, Silk, Crossbow, Royal Goods) and Nottingham heraldic card back.
- **CoinPile.tsx**: Instanced cylinder mesh stacks scaling visually with player gold (1-10, 11-25, 26-50, 50+ coins) with floating 3D numeric gold count badge. Single draw call per stand.
- **CameraRig.tsx**: Positioned for local player seat with clamped OrbitControls (polar angle 30°–75°, distance 8–24 units) to prevent ground clipping.
- **TavernLighting.tsx & TavernEffects.tsx**: Candle flicker animation (`useFrame`), soft warm ambient fill, directional key light with shadows, fireplace rim light, subtle bloom and vignette post-processing.
- **Reactive Sync**: `room.onStateChange` maps into Zustand `gameStore`, passing state down as props to 3D components without manual re-render wiring.
- Ready for Phase 4: Core Loop UI (Market -> Load Bag -> Declaration).

## Gotchas & Decisions
- **Angular Seating Formula**: `angle = ((player.seatIndex - localSeatIndex) / totalSeats) * Math.PI * 2 - Math.PI / 2` ensures the local player is always in the foreground facing the center, while other players arrange clockwise.
- **Instancing vs Multiple Meshes**: Coins use `instancedMesh` to keep draw calls minimal across 6 players with hundreds of coins.
- **Zero-Knowledge 3D Rendering**: Never inspect or render faces of cards in the contraband vault or uninspected opponent bags. Stand renders facedown backs with aggregate count badge.
- **Vite 6 strict TS**: `noUnusedLocals` is enabled. All imports must be actively referenced in TSX files.

