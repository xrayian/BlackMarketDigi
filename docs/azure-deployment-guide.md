# ☁️ Azure Cloud VM Deployment Guide: Sheriff of Nottingham Digital Edition

This guide walks you step-by-step through deploying **Sheriff of Nottingham: Digital Edition** onto a Virtual Machine (VM) in Microsoft Azure Cloud.

> 💡 **Looking for other hosting options?** For generic Linux VPS (AWS, DigitalOcean, Hetzner), home server self-hosting, or local LAN setups, see the general [Hosting & Deployment Guide](hosting.md).

---

## 🏗️ Architecture Overview

The production architecture containerizes the full-stack monorepo into two lightweight Docker services running behind an Nginx reverse proxy:

```mermaid
flowchart LR
    subgraph Internet
        Browser["Player Browser(s)"]
    end

    subgraph Azure["Azure Cloud Infrastructure"]
        NSG["Azure Network Security Group (NSG)<br/>Ports 22, 80, 443, 2567"]
        
        subgraph VM["Ubuntu Linux VM (Standard_B1s / Standard_B2s)"]
            subgraph Docker["Docker Compose Stack (sheriff_net)"]
                Nginx["client (Nginx:Alpine)<br/>Port 80 (HTTP) & 443 (HTTPS/WSS)<br/>• Serves React SPA & Assets<br/>• Proxies /matchmake & WebSocket"]
                Server["server (Node 22 Alpine)<br/>Port 2567<br/>• Colyseus 0.18 Room Engine<br/>• Authoritative Game Loop & Anti-Cheat"]
            end
        end
    end

    Browser -->|HTTP / HTTPS| NSG
    Browser -->|WebSocket (WS / WSS)| NSG
    NSG -->|80 / 443| Nginx
    NSG -.->|Optional Direct 2567| Server
    Nginx -->|Proxy WS / Room Matchmaking| Server
```

### Key Advantages
- **Single Port Simplicity:** Nginx handles static asset delivery (HTML/JS/CSS/audio) AND proxies Colyseus matchmaking HTTP requests and WebSocket streams over standard port 80 / 443. Players behind strict enterprise firewalls can connect without blocking port 2567.
- **Dynamic Connection Discovery:** The client's [`colyseus.ts`](file:///C:/projects/BlackMarketDigi/packages/client/src/net/colyseus.ts) inspects `window.location` at runtime, supporting direct IP access (`http://<ip>`), standard domain (`https://game.example.com`), and automatic upgrade to `wss://`.
- **Ultra Cost-Effective:** Can run comfortably on Azure's **Standard_B1s** (1 vCPU, 1 GB RAM, free-tier eligible) or **Standard_B2s** (2 vCPU, 4 GB RAM, ~$15/month).

---

## 📋 Prerequisites

1. An active [Microsoft Azure Account](https://portal.azure.com/).
2. Git installed locally and an SSH key pair (or Azure will generate one for you).
3. (Optional for SSL): A custom domain name or an Azure DNS Name Label.

---

## 🚀 Method 1: Deploy via Azure Portal (GUI)

### Step 1: Create an Azure Resource Group & Virtual Machine
1. Open the [Azure Portal](https://portal.azure.com/).
2. In the search bar, type **Virtual Machines** and click **Create** > **Azure virtual machine**.
3. Fill in the **Basics** tab:
   - **Subscription:** Select your subscription.
   - **Resource group:** Click *Create new* and enter `rg-sheriff-game`.
   - **Virtual machine name:** `vm-sheriff-prod`.
   - **Region:** Choose a region close to your players (e.g., `East US`, `West Europe`, or `Southeast Asia`).
   - **Availability options:** `No infrastructure redundancy required`.
   - **Security type:** `Standard`.
   - **Image:** **Ubuntu Server 22.04 LTS - x64 Gen2** (or 24.04 LTS).
   - **Size:**
     - Budget / Test: `Standard_B1s` (1 vCPU, 1 GiB memory)
     - Recommended Production: `Standard_B2s` (2 vCPUs, 4 GiB memory)
   - **Authentication type:** `SSH public key`.
   - **Username:** `azureuser`.
   - **SSH key source:** `Generate new key pair` (download `.pem` file when prompted) or `Use existing public key`.
4. In **Inbound port rules**:
   - Select `Allow selected ports`: **SSH (22)**, **HTTP (80)**, **HTTPS (443)**.

### Step 2: Configure Azure Network Security Group (NSG) Inbound Rules
To ensure all traffic can flow cleanly to both Nginx (80/443) and direct Colyseus (2567):
1. Go to your newly created Virtual Machine in Azure Portal.
2. In the left navigation menu, under **Networking**, click **Network settings**.
3. Under the **Inbound port rules** tab, click **Add inbound rule**:
   - **Source:** `Any`
   - **Source port ranges:** `*`
   - **Destination:** `Any`
   - **Service:** `Custom`
   - **Destination port ranges:** `2567`
   - **Protocol:** `TCP`
   - **Action:** `Allow`
   - **Priority:** `310`
   - **Name:** `Allow-Colyseus-2567`
4. Click **Add**. Verify you have rules allowing ports **22, 80, 443, and 2567**.

### Step 3: Configure a DNS Name Label (Recommended for SSL)
1. In the VM Overview page, click on the **Public IP address** link.
2. In the left menu, select **Configuration**.
3. Under **DNS name label (optional)**, enter a unique prefix (e.g. `sheriff-of-nottingham`).
4. Click **Save**.
5. Your VM now has a fully qualified domain name (FQDN):  
   `sheriff-of-nottingham.<region>.cloudapp.azure.com`

---

## ⚡ Method 2: Fast 1-Command Provisioning via Azure CLI (`az`)

If you prefer terminal commands, run this from your local PowerShell or Bash terminal:

```bash
# 1. Login to Azure
az login

# 2. Create Resource Group
az group create --name rg-sheriff-game --location eastus

# 3. Create Ubuntu 22.04 LTS VM with SSH keys and ports open
az vm create \
  --resource-group rg-sheriff-game \
  --name vm-sheriff-prod \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --public-ip-address-dns-name sheriff-nottingham-game

# 4. Open HTTP (80), HTTPS (443), and Colyseus (2567) in the NSG
az vm open-port --resource-group rg-sheriff-game --name vm-sheriff-prod --port 80 --priority 300
az vm open-port --resource-group rg-sheriff-game --name vm-sheriff-prod --port 443 --priority 301
az vm open-port --resource-group rg-sheriff-game --name vm-sheriff-prod --port 2567 --priority 302
```

---

## 🎮 Step 4: Turnkey Server Deployment

### 1. SSH into the Azure VM
```bash
# Replace with your VM's public IP or FQDN
ssh -i /path/to/key.pem azureuser@<AZURE_PUBLIC_IP>
```

### 2. Clone the Repository
```bash
git clone https://github.com/xrayian/digital-sheriff-of-nottingham.git
cd digital-sheriff-of-nottingham
```

### 3. Run Turnkey Setup Script
Run the automated Azure VM setup script:
```bash
chmod +x deploy/*.sh
sudo ./deploy/azure-setup.sh
```

**What the script automates:**
1. Installs latest system security updates.
2. Installs Docker Engine & official Docker Compose plugin.
3. Configures host UFW firewall (allowing 22, 80, 443, 2567).
4. Multi-stage builds both the Node 22 server container and the Nginx client container.
5. Launches containers with automatic restart policies.
6. Displays the public IP and live health status.

---

## 🔐 Step 5: Enable Free Let's Encrypt SSL (HTTPS & WSS)

Modern browsers require secure WebSockets (`wss://`) when the web application is hosted over `https://`. To enable SSL in one command:

```bash
# Run the SSL setup script with your domain or Azure DNS FQDN
sudo ./deploy/setup-ssl.sh <your-domain-or-azure-fqdn> <your-email>

# Example:
# sudo ./deploy/setup-ssl.sh sheriff-nottingham-game.eastus.cloudapp.azure.com player@example.com
```

**What this script does:**
1. Installs `certbot`.
2. Obtains a free, trusted Let's Encrypt SSL certificate.
3. Configures Nginx for modern TLS (TLSv1.2/1.3, HTTP -> HTTPS auto-redirect, WSS proxying).
4. Mounts certificates safely into the client container via `docker-compose.override.yml`.
5. Schedules an automatic renewal cron job at 03:00 AM daily with `--pre-hook` and `--post-hook` to seamlessly handle port 80 during standalone ACME challenges.

---

## 🔄 Ongoing Maintenance & Operations

### Applying Updates After Git Commits
When you push code updates to GitHub, update the live Azure VM instantly with zero downtime:
```bash
cd ~/digital-sheriff-of-nottingham
./deploy/update.sh
```
This pulls latest commits, rebuilds changed layers, swaps containers without dropping existing connections, and prunes stale images.

### Viewing Live Server & Matchmaking Logs
```bash
# View Colyseus game server logs
docker compose logs -f server

# View Nginx access & error logs
docker compose logs -f client
```

### Checking Container Resource Usage
```bash
docker stats
```

### Restarting the Services
```bash
docker compose restart
```

---

## 🛠️ Troubleshooting & FAQ

### Q1: "Connection timeout when opening http://<ip>"
- **Check Azure NSG:** Verify in the Azure Portal that port 80 (HTTP) has an **Allow** rule with Priority < 4096.
- **Check UFW:** On the VM, run `sudo ufw status` and verify `80/tcp` and `443/tcp` say `ALLOW`.
- **Check Containers:** Run `docker compose ps` to ensure both `sheriff_server` and `sheriff_client` show status `Up`.

### Q2: "WebSocket connection failed in browser console"
- If accessing via `https://`: Ensure you ran `./deploy/setup-ssl.sh`. Browsers block unencrypted `ws://` connections from an `https://` origin (Mixed Content Policy).
- Verify Nginx is routing WebSocket upgrade headers properly by testing direct port 2567 (`http://<ip>:2567`).

### Q3: How do I change the game server port?
- Modify `SERVER_PORT` in `docker-compose.yml` and the corresponding upstream port in `nginx/default.conf`.
