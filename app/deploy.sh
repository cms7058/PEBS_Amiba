#!/usr/bin/env bash
# =====================================================================
# Amoeba Copilot · one-shot deploy / upgrade helper
# Usage:
#   ./deploy.sh           # build + start (or rolling update)
#   ./deploy.sh logs      # tail container logs
#   ./deploy.sh backup    # snapshot the data volume
#   ./deploy.sh restore <file.tgz>
# =====================================================================
set -euo pipefail

cd "$(dirname "$0")"

SERVICE=amoeba-copilot
VOLUME=amoeba-data

usage() { sed -n '2,12p' "$0"; }

case "${1:-up}" in
  up|"" )
    if [ ! -f .env ]; then
      echo "[deploy] .env not found — copying .env.example → .env"
      cp .env.example .env
      AUTH=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64)
      ADMIN=$(openssl rand -base64 12 2>/dev/null || head -c 12 /dev/urandom | base64)
      # macOS sed needs the '' arg; GNU sed doesn't. Use a temp file workaround.
      tmp=$(mktemp)
      sed -e "s|^AMIBA_AUTH_SECRET=.*|AMIBA_AUTH_SECRET=${AUTH}|" \
          -e "s|^AMIBA_ADMIN_PASSWORD=.*|AMIBA_ADMIN_PASSWORD=${ADMIN}|" .env > "$tmp"
      mv "$tmp" .env
      echo "[deploy] generated AMIBA_AUTH_SECRET + initial AMIBA_ADMIN_PASSWORD"
      echo "[deploy] please record the admin password:"
      grep AMIBA_ADMIN_PASSWORD .env
    fi
    echo "[deploy] building image..."
    docker compose build
    echo "[deploy] starting (rolling)..."
    docker compose up -d
    echo "[deploy] waiting for healthy state..."
    for i in {1..20}; do
      status=$(docker inspect --format='{{.State.Health.Status}}' "$SERVICE" 2>/dev/null || echo "starting")
      if [ "$status" = "healthy" ]; then
        echo "[deploy] healthy ✓"
        docker compose ps
        exit 0
      fi
      sleep 3
    done
    echo "[deploy] WARNING: not healthy after 60s — check logs with: ./deploy.sh logs"
    docker compose ps
    ;;

  logs )
    docker compose logs -f "$SERVICE"
    ;;

  restart )
    docker compose restart "$SERVICE"
    ;;

  down )
    docker compose down
    ;;

  backup )
    ts=$(date +%Y%m%d-%H%M%S)
    out="amoeba-backup-${ts}.tgz"
    docker run --rm -v "${VOLUME}:/data" -v "$(pwd):/backup" alpine \
      tar czf "/backup/${out}" -C /data .
    echo "[deploy] backup saved: ${out}"
    ;;

  restore )
    file="${2:-}"
    if [ -z "$file" ] || [ ! -f "$file" ]; then
      echo "Usage: ./deploy.sh restore <backup.tgz>"; exit 1
    fi
    read -r -p "This will OVERWRITE the data volume. Continue? [y/N] " yn
    [ "$yn" = "y" ] || { echo "aborted"; exit 1; }
    docker compose stop
    docker run --rm -v "${VOLUME}:/data" -v "$(pwd):/backup" alpine \
      sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$file") -C /data"
    docker compose start
    echo "[deploy] restored from $file"
    ;;

  *)
    usage; exit 1
    ;;
esac
