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

## Current Phase: Phase 0 Completed
- Medieval tavern lobby UI with create/join flow and quick room code copy
- Responsive 4-character room codes matching server generator
- Reactive room state sync via @colyseus/sdk Callbacks.get(room)
- Placeholder 3D table scene with warm tavern lighting
- Ready for Phase 2 (client state wiring and game HUD)
