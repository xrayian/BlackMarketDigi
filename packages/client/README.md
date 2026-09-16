# @sheriff/client

The frontend web client for **Sheriff of Nottingham Digital (2nd Edition)**, built with React 18, Vite 6, Tailwind CSS, and React Three Fiber.

---

## 🎨 Features & Architecture

```
packages/client/
├── src/
│   ├── components/
│   │   ├── 3d/                # Three.js 3D table environment, merchant stands, cards, bags
│   │   └── ui/                # Tavern UI components, modal dialogs, player badges
│   ├── services/
│   │   └── colyseus.ts        # Client Colyseus 0.18 SDK client manager & state listeners
│   ├── types/                 # Client UI state definitions & prop types
│   ├── App.tsx                # App root, phase screen routing, connection status
│   └── main.tsx               # Application entry point
├── public/                    # Static assets, textures, card illustrations, sound effects
├── index.html                 # HTML entry template
├── tailwind.config.js         # Medieval / tavern aesthetic theme design tokens
└── vite.config.ts             # Vite 6 configuration and local proxy
```

### Key Capabilities
* **Interactive 3D Table:** Renders the circular merchant table, merchant stands, 3D card meshes, and snap-lock pouches with dynamic lighting and camera transitions.
* **Tavern UI Aesthetic:** Wood-grain panels, parchment cards, brass coin counters, and medieval heraldry icons styled via Tailwind CSS.
* **Real-Time Multiplayer Sync:** Uses `@colyseus/sdk` 0.18 to connect to the game room, stream state changes, and handle optimistic client UI updates.
* **Phase-Specific Interfaces:**
  * **Lobby:** Room creation, 4-character room codes, seat selection, and ready checks.
  * **Market:** Discard-and-draw interface with card selection trays.
  * **Load Bag:** Interactive drag-and-drop pouch packing with snap button audio/visual feedback.
  * **Declaration:** Wheel/stepper selector for declared good and quantity.
  * **Inspection & Bribery:** Dynamic negotiation modal allowing real-time bribe proposals (gold, stand goods, pouch promises) with instant accept/counter/reject buttons.

---

## 🚀 Development

```bash
# Start Vite development server at http://localhost:5173
npm run dev

# Typecheck and build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```
