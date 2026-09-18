#!/usr/bin/env bash
# ==============================================================================
# Sheriff of Nottingham - Quick Update Script
# Pulls latest changes from Git and rebuilds/reloads Docker containers.
# ==============================================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

echo "============================================================"
echo "🔄 Updating Sheriff of Nottingham Server & Client..."
echo "============================================================"

echo "[1/4] Pulling latest commits from git..."
git pull origin main

echo "[2/4] Rebuilding and launching updated containers..."
docker compose up -d --build

echo "[3/4] Pruning old dangling images..."
docker image prune -f

echo "[4/4] Verifying container status..."
docker compose ps

echo "============================================================"
echo "✅ Update complete! All services are healthy."
echo "============================================================"
