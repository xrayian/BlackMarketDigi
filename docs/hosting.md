# 🌐 Hosting & Deployment Guide

Welcome to the hosting guide for **Sheriff of Nottingham: Digital Edition**! Whether you want to play a quick game night with family on your living room Wi-Fi, host a private server on a cheap cloud VPS for your Discord group, or deploy on Microsoft Azure with free HTTPS/SSL certificates, this guide will get you running in minutes.

---

## 🎯 Which Option is Right for You?

| Option | Best For... | Cost | Setup Time | Difficulty |
| :--- | :--- | :--- | :--- | :--- |
| **[Option 1: Home Wi-Fi / Local LAN](#option-1-home-wi-fi--local-lan-easiest--zero-cost)** | Playing with family or friends in the same room | **Free ($0)** | 2 minutes | 🟢 Beginner |
| **[Option 2: Microsoft Azure Cloud](#option-2-microsoft-azure-cloud-vm-recommended)** | 24/7 dedicated server with automated setup script | **Free Tier** or ~$4/mo | 5 minutes | 🟡 Easy (Automated) |
| **[Option 3: Any Linux Cloud VPS](#option-3-generic-linux-vps-digitalocean-aws-hetzner-etc)** | DigitalOcean, AWS EC2, Hetzner, Linode, GCP | $4–$6/month | 5 minutes | 🟡 Easy (Automated) |

---

## Option 1: Home Wi-Fi / Local LAN (Easiest & Zero Cost)

Host a private game for friends and family connected to the same home Wi-Fi network. No cloud account or domain name required!

### 1. Requirements
* Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on your Windows or Mac computer (or Docker on Linux).

### 2. Launch the Game
Open PowerShell, Terminal, or Command Prompt:

```bash
# Clone the game repository
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham

# Start the game containers
docker compose up -d --build
```

### 3. Join from Other Devices
* **On your host computer:** Open `http://localhost` in your browser.
* **For other players on the same Wi-Fi:** 
  1. Find your computer's local network IP address:
     * **Windows:** Open PowerShell and run `ipconfig` (look for `IPv4 Address`, e.g., `192.168.1.150`).
     * **Mac / Linux:** Open Terminal and run `ip a` or check your Wi-Fi network settings.
  2. Tell other players to visit: `http://192.168.1.150` (replace with your actual IP).
  3. Create a room, share the 4-letter room code, and enjoy!

---

## Option 2: Microsoft Azure Cloud VM (Recommended)

Want a permanent public link so friends across the world can join anytime from their laptops or phones? An automated script handles everything from Docker installation to memory tuning.

### Recommended VM Sizing
* **Standard_B2ats_v2** (2 vCPUs, 1 GiB RAM, ~$5/mo)
* **Standard_B1s** (1 vCPU, 1 GiB RAM, free-tier eligible)
* **Standard_B2s** (2 vCPUs, 4 GiB RAM, ~$15/mo)

> 💡 *Our automated setup script automatically creates a 4GB swapfile and optimizes Node memory limits, guaranteeing smooth builds even on budget 1GB RAM instances.*

### 1-Command Turnkey Setup
Once you have created an Ubuntu VM and connected via SSH:

```bash
# 1. Clone the repository
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham

# 2. Run the automated setup script
sudo ./deploy/azure-setup.sh
```

**What the script does automatically:**
1. Updates system security packages.
2. Allocates and activates a 4GB swapfile so the VM never runs out of memory.
3. Installs Docker Engine & Compose plugin.
4. Opens required firewall ports (22, 80, 443).
5. Sequentially builds and launches both the game server and client web app.
6. Outputs your public game URL (e.g. `http://20.120.45.67`)!

📖 **Want a complete walkthrough with screenshots of the Azure Portal?** See the **[Step-by-Step Azure Deployment Guide](azure-deployment-guide.md)**.

---

## Option 3: Generic Linux VPS (DigitalOcean, AWS, Hetzner, etc.)

You can run this game on any Ubuntu or Debian Linux VPS provider:

### 1. Firewall Requirements
Ensure your VPS provider's firewall or security group allows these inbound ports:
* **22/TCP:** SSH (remote management)
* **80/TCP:** HTTP (web game client and matchmaking)
* **443/TCP:** HTTPS & WSS (secure web client and WebSockets)

### 2. Run the Setup Script
```bash
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham
chmod +x deploy/*.sh
sudo ./deploy/azure-setup.sh
```
*(Note: Despite the name, `azure-setup.sh` is 100% cloud-agnostic and works identically on any Ubuntu or Debian cloud server.)*

---

## 🔒 Free HTTPS / SSL Setup (game.yourdomain.com)

If you own a custom domain or subdomain, you can enable free Let's Encrypt SSL with HTTPS and Secure WebSockets (`wss://`) in 1 command:

### 1. Point Your Domain DNS
In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add an **A Record**:
* **Type:** A
* **Name:** `game` (or `@` for root domain)
* **Value:** Your cloud server's Public IP address
* **TTL:** Automatic or 300 seconds

### 2. Run the SSL Setup Script
```bash
sudo ./deploy/setup-ssl.sh game.yourdomain.com your-email@example.com
```

**What this configures:**
* Requests a free, trusted certificate from Let's Encrypt via Certbot.
* Automatically creates Nginx SSL templates with HTTP-to-HTTPS redirects.
* Schedules a daily automatic renewal cron job at 3:00 AM with zero manual maintenance needed.

---

## 🔄 Updating Your Live Server

When new updates, balance tweaks, or features are pushed to GitHub, update your live cloud server with zero downtime:

```bash
cd ~/digital-sheriff-of-nottingham
./deploy/update.sh
```
This pulls the latest commits, rebuilds changed image layers sequentially, reloads containers smoothly without interrupting ongoing matches, and cleans up old Docker images.

---

## 🛠️ Viewing Live Server Logs

If you want to see what's happening on your server (player joins, room creation, or inspection results):

```bash
# View live Colyseus game server logs
docker compose logs -f server

# View live Nginx web server access logs
docker compose logs -f client
```

---

## 🏛️ Under the Hood: Technical Architecture

For developers and system administrators curious about how the stack is structured:

```
                          Player Browsers
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    Host Firewall / Router    │
                  │    (Ports: 80, 443, 2567)    │
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │   client (Nginx:Alpine)     │  <-- Port 80 / 443
                  │   • Serves React 18 SPA     │
                  │   • Reverse Proxies WS/WSS  │
                  └───────┬──────────────┬──────┘
                          │              │
       Static Web Assets  │              │  WebSocket Streams & Matchmaking
       (/, /assets/*)     │              │  (/matchmake/*, /colyseus)
                          │              │
                          ▼              ▼
                    [Browser SPA]  ┌───────────────────────────┐
                                   │   server (Node 22)        │  <-- Port 2567
                                   │   • Colyseus 0.18 Rooms   │
                                   │   • Rules & Anti-Cheat    │
                                   └───────────────────────────┘
```

### Key Technical Advantages
* **Single-Port Simplicity:** Nginx handles static file delivery AND reverse-proxies real-time WebSocket traffic over ports 80/443. Players behind strict corporate, school, or mobile carrier firewalls connect without any blocked port errors.
* **Dynamic Connection Discovery:** The client automatically detects `window.location.host` and protocol (`ws://` vs `wss://`) at runtime in [`colyseus.ts`](../packages/client/src/net/colyseus.ts), requiring zero environment configuration when switching between local and production URLs.
* **Minimal Memory Footprint:** The combined Node.js server and Alpine Nginx proxy use ~180MB RAM at idle, easily hosting dozens of concurrent games on budget VMs.
