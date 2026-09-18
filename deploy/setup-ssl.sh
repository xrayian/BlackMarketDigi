#!/usr/bin/env bash
# ==============================================================================
# Sheriff of Nottingham - Automated Let's Encrypt SSL / HTTPS Setup
# Configures HTTPS and WSS (WebSocket Secure) with auto-renewal.
# ==============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root or with sudo: sudo ./deploy/setup-ssl.sh <domain> <email>"
  exit 1
fi

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ]; then
  read -rp "Enter your domain name (or Azure DNS name, e.g., mysheriff.eastus.cloudapp.azure.com): " DOMAIN
fi

if [ -z "$EMAIL" ]; then
  read -rp "Enter your email address for Let's Encrypt certificate notices: " EMAIL
fi

if [ -n "$DOMAIN" ]; then
  # Strip protocol (http:// or https://), trailing slashes, whitespace, and lowercase
  DOMAIN="${DOMAIN#http://}"
  DOMAIN="${DOMAIN#https://}"
  DOMAIN="${DOMAIN%%/*}"
  DOMAIN="$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]' | xargs)"
fi

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "[-] Domain and Email are required to provision Let's Encrypt SSL certificates."
  exit 1
fi

echo "============================================================"
echo "🔐 Setting up SSL for domain: ${DOMAIN}"
echo "============================================================"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

echo "[1/5] Installing Certbot..."
apt-get update -y
apt-get install -y certbot

echo "[2/5] Stopping container on port 80 to allow Let's Encrypt ACME challenge..."
docker compose stop client || true

echo "[3/5] Obtaining SSL certificate via Certbot standalone..."
if ! certbot certonly --standalone \
  --preferred-challenges http \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL"; then
  echo "[-] Certificate generation failed. Please ensure DNS for ${DOMAIN} points to this server's public IP."
  echo "[+] Restoring client container on port 80..."
  docker compose start client 2>/dev/null || docker compose up -d client || true
  exit 1
fi

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

if [ ! -f "$CERT_PATH" ]; then
  echo "[-] Certificate file not found at ${CERT_PATH}."
  docker compose start client 2>/dev/null || docker compose up -d client || true
  exit 1
fi

echo "[4/5] Generating Nginx SSL configuration..."
cat <<EOF > "$REPO_DIR/nginx/ssl.conf"
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} _;
    return 301 https://\$host\$request_uri;
}

# Secure HTTPS + WSS Server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN};

    ssl_certificate ${CERT_PATH};
    ssl_certificate_key ${KEY_PATH};

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/json application/xml application/svg+xml image/svg+xml;

    location ^~ /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location ^~ /audio/ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files \$uri =404;
    }

    location ^~ /cards/ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files \$uri =404;
    }

    # Colyseus HTTP matchmaker
    location /matchmake/ {
        proxy_pass http://server:2567;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    # Colyseus WebSocket connection endpoints
    location ~ ^/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-]+ {
        proxy_pass http://server:2567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /colyseus {
        proxy_pass http://server:2567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
EOF

# Create docker-compose.override.yml to mount certificates and SSL conf into client container
cat <<EOF > "$REPO_DIR/docker-compose.override.yml"
services:
  client:
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./nginx/ssl.conf:/etc/nginx/conf.d/default.conf:ro
EOF

echo "[5/5] Restarting containers with SSL configuration..."
docker compose up -d

# Setup automated certificate renewal cron job
# Note: Certbot standalone renewal needs port 80 freed, so pre-hook stops client and post-hook brings it up
CRON_JOB="0 3 * * * certbot renew --quiet --pre-hook 'cd $REPO_DIR && docker compose stop client' --post-hook 'cd $REPO_DIR && docker compose up -d client'"
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -Fv "certbot renew" || true)
if [ -n "$EXISTING_CRON" ]; then
  printf "%s\n%s\n" "$EXISTING_CRON" "$CRON_JOB" | crontab -
else
  printf "%s\n" "$CRON_JOB" | crontab -
fi

echo ""
echo "============================================================"
echo "🎉 SSL is configured and active!"
echo "============================================================"
echo "Secure URLs:"
echo "  👉 HTTPS Web Client: https://${DOMAIN}"
echo "  👉 WSS Secure WebSockets: wss://${DOMAIN}"
echo "Automatic renewal configured via daily cron."
echo "============================================================"
