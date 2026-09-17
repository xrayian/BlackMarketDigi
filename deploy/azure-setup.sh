#!/usr/bin/env bash
# ==============================================================================
# Sheriff of Nottingham - Azure Cloud VM Turnkey Provisioning Script
# Supported OS: Ubuntu 22.04 LTS / 24.04 LTS
# ==============================================================================

set -euo pipefail

echo "============================================================"
echo "🏰 Sheriff of Nottingham: Digital Edition - Azure VM Setup"
echo "============================================================"

# Ensure script is executed with root privileges
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root or with sudo: sudo ./deploy/azure-setup.sh"
  exit 1
fi

CURRENT_USER="${SUDO_USER:-$USER}"

echo "[1/6] Updating system packages..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "[2/6] Installing essential utilities..."
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  ufw

echo "[3/6] Installing official Docker Engine & Docker Compose Plugin..."
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi

ARCH=$(dpkg --print-architecture)
CODENAME=$(lsb_release -cs)
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

# Add sudo user to docker group to allow running docker without sudo in future sessions
if [ -n "$CURRENT_USER" ] && [ "$CURRENT_USER" != "root" ]; then
  usermod -aG docker "$CURRENT_USER"
  echo "[+] Added user '$CURRENT_USER' to docker group."
fi

echo "[4/6] Configuring host firewall (UFW)..."
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP (Web & Game Client)"
ufw allow 443/tcp comment "HTTPS & WSS (Secure Game Client)"
ufw allow 2567/tcp comment "Colyseus Direct Port"
ufw --force enable

echo "[5/6] Building and launching game containers with Docker Compose..."
# Resolve script directory to repository root
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

docker compose up -d --build

echo "[6/6] Verifying service health..."
sleep 5
docker compose ps

PUBLIC_IP=$(curl -s https://api.ipify.org || echo "<YOUR_AZURE_PUBLIC_IP>")

echo ""
echo "============================================================"
echo "🎉 Deployment Successful!"
echo "============================================================"
echo "Access your live game at:"
echo "  👉 Web Client (Nginx Reverse Proxy): http://${PUBLIC_IP}"
echo "  👉 Direct Colyseus Port:             http://${PUBLIC_IP}:2567"
echo ""
echo "Next Steps:"
echo "  - In Azure Portal, ensure your VM's Network Security Group (NSG) allows inbound rules on ports 80, 443, and 2567."
echo "  - For SSL / HTTPS setup, run: sudo ./deploy/setup-ssl.sh"
echo "  - For future updates after code changes, run: ./deploy/update.sh"
echo "============================================================"
