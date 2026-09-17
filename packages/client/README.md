# @sheriff/client

The frontend web client for **Sheriff of Nottingham Digital (2nd Edition)**, built with React 18, Vite 6, Tailwind CSS, Framer Motion, and `@dnd-kit/core`.

---

## 🎨 Features & Architecture

```
packages/client/
├── src/
│   ├── ui/
│   │   ├── table2d/           # Top-down 2D tabletop arena
│   │   │   ├── TableBoard2D.tsx     # Circular tavern table layout (3-6 seats)
│   │   │   ├── PlayerStand2D.tsx    # Merchant stand, coin purse, goods bins, vaulted contraband
│   │   │   ├── MarketBoard2D.tsx    # Central market draw & discard stacks
│   │   │   ├── HandCardFan.tsx      # Fanned hand card view with arc curvature & hover lift
│   │   │   ├── MerchantBagDropZone.tsx # Tactile burlap sack drag-and-drop target
│   │   │   └── ActionLedger.tsx     # Collapsible real-time match ledger
│   │   ├── ExaminationDesk.tsx      # Full-screen 1-on-1 inspection overlay
│   │   ├── BribeScale.tsx           # Spring-weighted illustrated brass balance scale
│   │   ├── UnsnapClasp.tsx          # 1.2s sustained radial hold-to-unsnap wax seal
│   │   ├── StaggeredCardReveal.tsx  # Staggered card flip animation with radiant halos
│   │   ├── UnfurlingLedger.tsx      # Parchment scroll receipt with 4-step liquidation
│   │   ├── BribeNegotiationPanel.tsx# Atomic bribe builder with 1.5s reaction buffer
│   │   ├── MarketPanel.tsx          # Discard-and-draw market stalls (minimizable)
│   │   ├── BagLoadingPanel.tsx      # Pouch loading tray (minimizable)
│   │   ├── DeclarationPanel.tsx     # Proclamation modal with wax-seal stamp
│   │   ├── BlackMarketPanel.tsx     # Contraband order fulfillment board
│   │   ├── SettingsModal.tsx        # Audio & accessibility preferences
│   │   └── ErrorToast.tsx           # Auto-dismissing server validation error toasts
│   ├── net/
│   │   └── colyseus.ts              # Colyseus SDK manager with runtime WS/WSS autodetection
│   ├── state/
│   │   └── gameStore.ts             # Reactive Zustand client state store
│   ├── audio/
│   │   └── soundManager.ts          # Procedural Web Audio API sound synthesizer
│   ├── theme/
│   │   └── tokens.ts                # Theme design tokens (parchment, walnut, emerald, crimson)
│   ├── App.tsx                      # App entry point, phase routing & lobby
│   └── main.tsx                     # DOM mounting
├── public/                          # Favicon and static resources
├── index.html                       # HTML template with Cinzel and Inter webfonts
├── tailwind.config.js               # Medieval / tavern aesthetic theme configuration
└── vite.config.ts                   # Vite 6 configuration & path aliases
```

---

## 🎯 Key Capabilities

* **Top-Down 2D Tabletop Arena:** A lightweight, high-performance DOM/SVG tabletop arena seating 3–6 players with the local merchant anchored in the foreground. Runs at a locked 60fps on mobile devices and low-tier hardware.
* **Accessible Drag-and-Drop:** Powered by `@dnd-kit/core` with both mouse/touch and keyboard accessibility (`KeyboardSensor`).
* **Procedural Web Audio:** All sound effects (continuous tavern hearth ambience, card slides, brass scale tips, bag snaps, victory fanfares) are synthesized mathematically via the Web Audio API without requiring external audio asset downloads.
* **Dynamic Connection Discovery:** Automatically detects `window.location.host` and infers `ws://` vs `wss://` at runtime, enabling instant play behind reverse proxies or IP access without pre-baking URLs.
* **Zero-Knowledge UI State:** Private card data is strictly filtered by the authoritative game server; non-owning players only ever see card backings and aggregate counts until bags are formally unsealed.

---

## 🚀 Development & Building

```bash
# Start Vite development server at http://localhost:5173
npm run dev

# Typecheck and build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🐳 Production Containerization

In production, the client is built via a multi-stage Docker build (`Dockerfile.client`) and served using `nginx:alpine` on port 80/443. The Nginx reverse proxy routes all static SPA assets and forwards WebSocket connections to the Colyseus server. See [`docs/hosting.md`](../../docs/hosting.md) for full deployment details.
