# 🌐 Hosting & Deployment Guide

This document provides a comprehensive guide for hosting and deploying **Sheriff of Nottingham: Digital Edition** across various production environments—including cloud Virtual Machines (Azure, AWS, GCP, DigitalOcean, Hetzner), self-hosted home servers, and local development networks.

---

## 🏛️ System Architecture

Sheriff of Nottingham is packaged as a two-tier containerized stack orchestrated via Docker Compose:

```
                          Internet / Clients
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │   Firewall / Port Forwarding  │
                   │    (Ports: 80, 443, 2567)     │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼──────────────┐
                   │     Nginx Web Proxy (80)     │  <-- `client` container
                   │    (SSL Termination: 443)    │
                   └───────┬──────────────┬──────┘
                           │              │
        Static SPA Assets  │              │  WebSocket & Matchmaker
    (/, /assets/, /cards/) │              │  (/matchmake/*, /:pid/:rid)
                           │              │
                           ▼              ▼
                     [Static HTML]   ┌───────────────────────────┐
                     [JS/CSS/SVG]    │  Colyseus Game Engine     │  <-- `server` container
                                     │  (Node 22, Port: 2567)    │
                                     └───────────────────────────┘
```

### Key Architectural Benefits
1. **Single-Port Operation (Ports 80 / 443):** Nginx serves the React SPA static files and reverse-proxies Colyseus WebSocket streams and matchmaker HTTP requests. Players behind restrictive corporate, school, or mobile carrier firewalls can play with zero port friction.
2. **Zero-Configuration Dynamic Host Autodetection:** The client detects `window.location.host` and protocol (`ws://` vs `wss://`) dynamically at runtime in [`packages/client/src/net/colyseus.ts`](file:///C:/projects/BlackMarketDigi/packages/client/src/net/colyseus.ts). You do not need to bake IP addresses or hostnames into the frontend build.
3. **Low Resource Footprint:** The combined Node.js server and Alpine Nginx proxy consume ~180MB RAM at idle and can easily host dozens of concurrent games on a $4–$10/month VM.

---

## 🚀 Deployment Options

### Option 1: Microsoft Azure Cloud VM (Recommended)
For an automated, production-ready cloud deployment with high reliability, use Azure Cloud:

* **Recommended VM Size:** `Standard_B1s` (1 vCPU, 1 GiB RAM - free-tier eligible) or `Standard_B2s` (2 vCPUs, 4 GiB RAM, ~$15/mo).
* **OS:** Ubuntu 22.04 LTS or 24.04 LTS x64.
* **Full Step-by-Step Guide:** Refer to [`docs/azure-deployment-guide.md`](file:///C:/projects/BlackMarketDigi/docs/azure-deployment-guide.md) for Azure Portal GUI and Azure CLI deployment walkthroughs.
* **Turnkey Setup:**
  ```bash
  git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
  cd digital-sheriff-of-nottingham
  chmod +x deploy/*.sh
  sudo ./deploy/azure-setup.sh
  ```

---

### Option 2: Generic Linux VPS (DigitalOcean, Hetzner, AWS EC2, Linode, GCP)

Any 64-bit Linux server running Ubuntu or Debian can be provisioned in minutes:

#### 1. Inbound Firewall Requirements
Ensure your cloud provider's firewall / security group allows the following inbound ports:
* **22/TCP:** SSH administrative access
* **80/TCP:** HTTP (web client and matchmaking)
* **443/TCP:** HTTPS & WSS (secure web client and WebSockets)
* **2567/TCP:** (Optional) Direct Colyseus game server port

#### 2. Run the Turnkey Script
```bash
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham
chmod +x deploy/*.sh
sudo ./deploy/azure-setup.sh
```
*Note: Although named `azure-setup.sh`, the provisioning script is completely cloud-agnostic and runs identically on any modern Ubuntu/Debian host.*

---

### Option 3: Local Network / Home Lab / LAN Hosting

To host games for friends on your local Wi-Fi or home network:

#### 1. Requirements
* Docker Desktop (Windows / macOS) or Docker Engine (Linux).
* Ensure port `80` (or your mapped port) is allowed through your local OS firewall.

#### 2. Launching Locally
```bash
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham
docker compose up -d --build
```

#### 3. Connecting Other Devices
* Find your computer's local IP address (e.g. `192.168.1.150`):
  * **Windows:** Run `ipconfig` in PowerShell
  * **macOS / Linux:** Run `hostname -I` or `ip a`
* Share the URL with friends on the same Wi-Fi network:
  `http://192.168.1.150`
* Clients will automatically discover the WebSocket host via the browser URL and connect without any configuration.

---

## 🔒 Domain Name & Free SSL/TLS Configuration (HTTPS & WSS)

When deploying to a public domain, enabling SSL/TLS is essential. Modern browsers will block insecure `ws://` connections if the web page is loaded over `https://` (Mixed Content Policy).

### 1. Point Your Domain DNS
Create an **A Record** pointing your domain or subdomain to your server's public IP:
```
Type: A
Name: game (or @ for apex domain)
Value: <YOUR_SERVER_PUBLIC_IP>
TTL: 300 (or Automatic)
```

### 2. Run Automated SSL Setup
Run the included Certbot SSL configuration script:
```bash
sudo ./deploy/setup-ssl.sh game.yourdomain.com your-email@example.com
```

### What this script configures:
1. Provisions a genuine Let's Encrypt certificate via Certbot.
2. Generates an SSL-optimized Nginx config (`nginx/ssl.conf`) with HTTP-to-HTTPS 301 redirects, TLSv1.2/1.3 ciphers, and WSS WebSocket proxies.
3. Mounts the certificate automatically into the client container via `docker-compose.override.yml`.
4. Adds a daily automated renewal cron job at 3:00 AM with zero manual maintenance needed.

---

## ⚙️ Environment Variables & Tuning

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `server` | `production` | Enables production optimizations and security checks. |
| `SERVER_PORT` | `server` | `2567` | Internal port the Colyseus game server listens on. |
| `VITE_WS_URL` | `client` | *(empty)* | Optional override for the WebSocket server URL (e.g. `wss://game.domain.com`). If unset, client autodetects the current host at runtime. |

---

## 🔄 Operations & Maintenance

### 1. Zero-Downtime Updates
To pull new updates from GitHub and redeploy:
```bash
./deploy/update.sh
```
This script pulls `main`, rebuilds only changed Docker image layers, performs a smooth container recreation, and cleans up dangling Docker images.

### 2. Viewing Live Application Logs
```bash
# Monitor Colyseus authoritative game server logs (game loops, matchmaker, anti-cheat errors)
docker compose logs -f server

# Monitor Nginx access and error logs
docker compose logs -f client
```

### 3. Service Control
```bash
# Stop all services
docker compose down

# Restart services
docker compose restart

# View running container health
docker compose ps

# View live CPU & memory statistics
docker stats
```

---

## ❓ Frequently Asked Questions & Troubleshooting

### 1. "Can't connect to room / WebSocket error in browser console"
* **Check Mixed Content:** If the web app URL starts with `https://`, your WebSocket URL must be `wss://`. Ensure you ran `./deploy/setup-ssl.sh`.
* **Check Proxy Timeout:** In `nginx/default.conf`, verify `proxy_read_timeout` is set to `86400s`. This prevents Nginx from terminating idle WebSocket connections.
* **Check Container Status:** Run `docker compose ps` to ensure both `sheriff_server` and `sheriff_client` are in status `Up (healthy)`.

### 2. "Website loads, but room creation hangs indefinitely"
* Verify that Nginx is routing HTTP POST requests on `/matchmake/*` to `http://server:2567`. Check `docker compose logs server` to see if matchmaker requests are reaching the Node.js process.

### 3. "Port 80 is already in use by another service"
* If you have Apache or another web server installed on the host, either disable it (`sudo systemctl stop apache2`) or edit `docker-compose.yml` to map to an alternate port (e.g. `"8080:80"`).
