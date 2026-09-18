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

echo "[2/7] Installing essential utilities..."
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  ufw

echo "[3/7] Configuring swap space for low-RAM Azure VM (e.g. Standard_B2ats_v2 / B1s)..."
CURRENT_SWAP_KB=$(grep SwapTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")
if [ "${CURRENT_SWAP_KB:-0}" -lt 2097152 ]; then
  if [ ! -f /swapfile ]; then
    echo "[+] Creating 4GB swapfile at /swapfile to prevent OOM freezes during container builds..."
    fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile 2>/dev/null || true
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "[+] Added /swapfile to /etc/fstab for automatic persistence across reboots."
  fi
  # Tune kernel memory parameters to prevent aggressive paging thrash
  sysctl -w vm.swappiness=20 >/dev/null 2>&1 || true
  sysctl -w vm.vfs_cache_pressure=50 >/dev/null 2>&1 || true
  if [ -d /etc/sysctl.d ]; then
    printf "vm.swappiness=20\nvm.vfs_cache_pressure=50\n" > /etc/sysctl.d/99-swap.conf
  fi
  echo "[+] Swap setup complete: $(free -h | awk '/Swap:/ {print $2}') active."
else
  echo "[+] Adequate swap space already active ($(free -h | awk '/Swap:/ {print $2}'))."
fi

echo "[4/7] Installing official Docker Engine & Docker Compose Plugin..."
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

echo "[5/7] Configuring host firewall (UFW)..."
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP (Web & Game Client)"
ufw allow 443/tcp comment "HTTPS & WSS (Secure Game Client)"
ufw allow 2567/tcp comment "Colyseus Direct Port"
ufw --force enable

echo "[6/7] Building and launching game containers with Docker Compose..."
# Resolve script directory to repository root
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

# Build sequentially to eliminate concurrent memory peaks on low-RAM instances
echo "[+] Building server container..."
docker compose build server

echo "[+] Building client container..."
docker compose build client

echo "[+] Launching containers..."
docker compose up -d

echo "[7/7] Verifying service health..."
sleep 5
docker compose ps

PUBLIC_IP=$(curl -s --connect-timeout 3 https://api.ipify.org 2>/dev/null || curl -s --connect-timeout 3 -H Metadata:true "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text" 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "<YOUR_AZURE_PUBLIC_IP>")

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
