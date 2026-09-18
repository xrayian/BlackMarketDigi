# 🏰 Sheriff of Nottingham: Digital Edition (2nd Edition)

<div align="center">

[![Players](https://img.shields.io/badge/Players-3_to_6_Online-amber.svg?style=for-the-badge&logo=users)](https://github.com/xrayian/digital-sheriff-of-nottingham)
[![Rules](https://img.shields.io/badge/Rules-2nd_Edition_Official-emerald.svg?style=for-the-badge&logo=book)](https://github.com/xrayian/digital-sheriff-of-nottingham)
[![Multiplayer](https://img.shields.io/badge/Networking-Colyseus_0.18-blue.svg?style=for-the-badge&logo=webrtc)](https://github.com/xrayian/digital-sheriff-of-nottingham)
[![Frontend](https://img.shields.io/badge/Client-React_18_+_Vite_6-61dafb.svg?style=for-the-badge&logo=react)](https://github.com/xrayian/digital-sheriff-of-nottingham)
[![Tests](https://img.shields.io/badge/Tests-114_Passed_(100%25)-success.svg?style=for-the-badge&logo=vitest)](https://github.com/xrayian/digital-sheriff-of-nottingham)

**Bluff, bribe, and smuggle your way to riches in Nottingham's bustling medieval marketplace!**

*A full-fidelity, web-based digital tabletop adaptation of the acclaimed bluffing and social deduction board game **Sheriff of Nottingham** (2nd Edition, CMON). No downloads, no sign-ups — join a room code and play directly in your browser with 3 to 6 friends!*

[✨ Game Features](#-game-features) • [🎲 How to Play](#-how-to-play-in-60-seconds) • [👑 Expansions Included](#-all-expansions-included) • [🚀 Host Your Own Game](#-host-your-own-game-in-5-minutes) • [💻 Developer Guide](#-developer-guide--technical-architecture)

</div>

---

## 🌟 What is Sheriff of Nottingham?

You are an ambitious merchant in Prince John's Nottingham. The city gates are locked, guarded by the greedy and suspicious **Sheriff**. To win, you must smuggle the most valuable goods through the city gate into your market stand.

Will you play it safe with legal trade like **Apples**, **Cheese**, **Bread**, and **Chickens**? Or will you risk sneaking in illicit **Silk**, **Pepper**, **Mead**, and **Crossbows** for massive profits?

When the Sheriff eyes your sealed burlap bag, you'll need a steady gaze, a silver tongue, and perhaps a hefty bribe of gold coins to ensure safe passage. But beware: your rival merchants might offer the Sheriff an even sweeter bribe just to see your bag torn open!

---

## ✨ Game Features

### 🎭 High-Stakes Bluffing & Bribery
* **The Living Merchant Bag:** Drag and drop 1 to 5 goods into your burlap sack, snap the bronze clasp shut, and swear by the King's honor what lies inside.
* **Under-the-Table Deals:** Slide coins across the table, promise goods from your stand, or swear future favors.
* **Rival Counter-Offers:** Other merchants can jump into the bidding war! A competitor can pay the Sheriff to force an inspection of your goods or pay to let you pass.

### 🎪 Tactile 2D Tabletop Arena
* **Curved Hand Fan:** Smooth card fan animations that lift and tilt as you plan your smuggling run.
* **Tipping Brass Bribe Scale:** Physical animated scales that realistically tilt as coins and goods are weighed during negotiations.
* **Wax Seal Declarations:** Stamp your official royal merchant declaration with genuine medieval parchment flair.
* **Town Ledger:** Track who discarded what cards each turn, audit past inspections, and examine the discard pile in real time.

### 🛡️ Zero-Knowledge Fairness
* **Cryptographic Privacy:** Merchant hands and sealed bag contents are isolated server-side. Not even browser dev tools can peek into your bag until the Sheriff formally unsnaps the clasp!
* **100% Authoritative Rules Engine:** Comprehensive rule compliance with automatic debt liquidation, fair tiebreakers, and zero client tampering.

### 🎵 Procedural Tavern Ambience
* **Zero Asset Downloads:** A custom procedural Web Audio synthesizer creates authentic medieval soundscapes—crackling hearth fire embers, clinking gold coins, wood table thumps, and triumphant brass fanfares—instantly synthesized in your browser.

---

## 🎲 How to Play in 60 Seconds

A game consists of rotating rounds where each player takes turns wearing the Sheriff's badge:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             THE 5-PHASE ROUND                               │
│                                                                             │
│  [1. The Market] ──> [2. Pack Bag] ──> [3. Declare] ──> [4. The Gate]       │
│   Discard & draw      1-5 cards in      Swear 1 legal    Bribes, bluffs,    │
│   fresh stock         secret pouch      good type        & inspections      │
│                                                              │              │
│                                                              ▼              │
│                                                     [5. End of Round]       │
│                                                      Score stashes &        │
│                                                      pass Sheriff badge     │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phase | What You Do | The Stakes |
| :--- | :--- | :--- |
| **1. The Market** | Discard up to 5 unwanted cards and draw fresh stock from the merchant deck. | Craft your winning hand without revealing your strategy to opponents. |
| **2. Pack Bag** | Secretly stash 1 to 5 cards into your burlap merchant bag and snap the clasp. | Keep it 100% legal... or slip in valuable contraband for huge gold payouts! |
| **3. Declare** | Announce to the Sheriff the number of cards and **exactly one legal good** (e.g., *"4 Apples!"*). | You may never declare contraband. If you lie, you must stick to your story! |
| **4. Inspection & Bribes** | The Sheriff interrogates you! Negotiate bribes, sweet-talk, or call their bluff. | **If the Sheriff inspects:**<br>• *You were honest:* The Sheriff pays **you** a fine for the insult!<br>• *You were caught:* All contraband is confiscated and you pay the penalty fine!<br>**If the Sheriff lets you pass:** Everything in your bag slips safely into your stand! |
| **5. End of Round** | Stash goods into your merchant stand, replenish hands to 6, and pass the Sheriff badge clockwise. | The game ends when every merchant has served as Sheriff twice (or three times in 3p). |

🏆 **Winning the Game:** The wealthiest merchant wins! Points come from your Gold coins, legal goods values, successfully smuggled contraband, plus massive end-game **King & Queen Bonuses** for whoever holds the most of each good!

---

## 👑 All Expansions Included

Play with classic base rules or mix and match official 2nd Edition expansion modules with a single toggle:

* ⚜️ **Royal Goods Expansion (12 Special Cards):** Smuggle rare luxuries like *Golden Apples*, *Gouda Cheese*, *Rye Bread*, and the prized *Royal Rooster* for extra contraband gold AND bonus points in King/Queen standings!
* 👥 **6-Player Deputies Module:** Bring a 6th player to the table! Two rotating deputies share the inspection duties, pool confiscated gold into a shared Booty Tile, and can agree to split bribes or act alone.
* 🏴‍☠️ **The Black Market Expansion:** Fulfill high-paying contraband trade-in contracts from the underground market for massive end-game score multipliers!

---

## 🚀 Host Your Own Game in 5 Minutes

Want to play with friends on your own private server? It's turnkey and ready to go!

### Option 1: 1-Command Cloud VM (Azure, AWS, DigitalOcean, Hetzner)
Any budget Linux VM (including Azure's **Standard_B2ats_v2** or free-tier eligible **Standard_B1s**) can be launched with our automated setup script:

```bash
# 1. Clone the repository
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham

# 2. Run the automated cloud setup script
sudo ./deploy/azure-setup.sh
```
*What this script does:*
* Sets up a 4GB swapfile and memory limits to prevent out-of-memory errors on small VMs.
* Installs Docker & Docker Compose.
* Builds and launches both the game server and web client containers.
* Sets up host firewall rules and outputs your public game URL!

### Option 2: 1-Command Free SSL (HTTPS & WSS)
If you have a domain or subdomain pointing to your server:
```bash
sudo ./deploy/setup-ssl.sh game.yourdomain.com your-email@example.com
```

### Option 3: Local Wi-Fi / LAN Party (Home Play)
Host a game night with friends on the same Wi-Fi network using [Docker Desktop](https://www.docker.com/products/docker-desktop/):
```bash
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham
docker compose up -d --build
```
Open `http://localhost` (or share your local IP, e.g. `http://192.168.1.100`) and start playing immediately!

📖 **Need more details?** Check our beginner-friendly **[Hosting & Deployment Guide](docs/hosting.md)** and **[Step-by-Step Azure VM Guide](docs/azure-deployment-guide.md)**.

---

## 💻 Developer Guide & Technical Architecture

<details>
<summary><b>🛠️ Click to expand Technical Stack & Architecture Details</b></summary>

<br>

### Technology Stack
* **Game Server:** [Colyseus 0.18.x](https://docs.colyseus.io/) authoritative multiplayer room server, Node 22 runtime, Express 4.
* **Client Frontend:** React 18, Vite 6, TypeScript 5, Tailwind CSS, Framer Motion, `@dnd-kit/core` (drag-and-drop).
* **State Sync:** `@colyseus/schema` 5.0 schema synchronization with binary delta compression and zero-knowledge `.view()` privacy filtering.
* **Server Bundler:** `esbuild` for instant, self-contained standalone server distribution.
* **Testing:** [Vitest 3](https://vitest.dev/) with 114 passing unit, integration, and security fuzz tests.
* **Reverse Proxy:** Nginx Alpine with single-port routing (port 80/443 for HTTP, HTTPS, WebSockets, and WSS).

### Monorepo Structure
```
digital-sheriff-of-nottingham/
├── packages/
│   ├── shared/                # Core domain types, card definitions, game rules, constants
│   ├── server/                # Authoritative Colyseus 0.18 game server & rules engine
│   └── client/                # React 18 + Vite 6 client SPA & 2D Tabletop Arena
├── deploy/                    # Turnkey VM provisioning & Let's Encrypt SSL automation
├── docs/                      # Technical architecture documents & rulebook specs
│   ├── hosting.md             # Multi-cloud & local network hosting guide
│   ├── azure-deployment-guide.md # Azure Cloud VM step-by-step walkthrough
│   ├── architecture.md        # Complete game design document & technical specs
│   ├── consultation-rulebook.md # Canonical 2nd Edition physical rulebook reference
│   └── development/           # Development history, phase plans, and audits
├── nginx/                     # Production Nginx reverse proxy configuration
├── Dockerfile.server          # Multi-stage container for Colyseus server
├── Dockerfile.client          # Multi-stage container for Vite SPA & Nginx
├── docker-compose.yml         # Unified container orchestration stack
└── Issues.md                  # Comprehensive rulebook compliance audit
```

### Local Development Setup
```bash
# 1. Install workspace dependencies
npm install

# 2. Run both server and client in development mode
npm run dev

# 3. Run all 114 test suites
npm test

# 4. Build production bundles
npm run build
```

</details>

---

## 📜 Acknowledgments & Disclaimer

This project is an open-source, non-commercial digital tribute to the board game **Sheriff of Nottingham (2nd Edition)**, originally designed by **Sérgio Halaban** and **André Zatz**, published by **CMON Games**. All rights to the original game, trademark, and game universe belong to their respective copyright holders.

---

<div align="center">
Made with 🛡️ for tabletop fans everywhere. Grab a coin pouch, look honest, and enjoy the game!
</div>
