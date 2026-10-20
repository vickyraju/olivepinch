#!/usr/bin/env bash
# One-off bootstrap for a fresh Ubuntu 24.04 VM (Vultr 1 vCPU / 1 GB). Run as root:
#   DOMAIN=example.com ADMIN_DOMAIN=admin.example.com API_DOMAIN=api.example.com DB_PASSWORD='...' bash setup-server.sh
set -euo pipefail
: "${DOMAIN:?}" "${ADMIN_DOMAIN:?}" "${API_DOMAIN:?}" "${DB_PASSWORD:?}"

apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
DEBIAN_FRONTEND=noninteractive apt-get -y install ufw unattended-upgrades curl rsync postgresql debian-keyring debian-archive-keyring apt-transport-https gpg

# 2 GB swap: the 1 GB box needs it for builds and photo resizing.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=20' > /etc/sysctl.d/99-swap.conf && sysctl -p /etc/sysctl.d/99-swap.conf
fi

# Firewall: SSH + web only. Postgres stays on localhost.
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get -y install nodejs

# Caddy (automatic HTTPS)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get -y install caddy

# Postgres, tuned for 1 GB and listening on localhost only
PGCONF=$(ls /etc/postgresql/*/main/postgresql.conf)
cat > "$(dirname "$PGCONF")/conf.d/olivepinch.conf" <<PG
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 128MB
effective_cache_size = 384MB
work_mem = 4MB
maintenance_work_mem = 64MB
PG
systemctl restart postgresql
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='olivepinch'" | grep -q 1 || sudo -u postgres psql -c "CREATE ROLE olivepinch LOGIN PASSWORD '${DB_PASSWORD}'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='olivepinch'" | grep -q 1 || sudo -u postgres createdb -O olivepinch olivepinch

# App user and folders
id olivepinch-app >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin olivepinch-app
mkdir -p /opt/olivepinch/server /var/www/olivepinch/customer /var/www/olivepinch/admin /var/backups/olivepinch
chown -R olivepinch-app:olivepinch-app /opt/olivepinch /var/backups/olivepinch
chown -R www-data:www-data /var/www/olivepinch

# Config files shipped next to this script
HERE=$(cd "$(dirname "$0")" && pwd)
sed "s/__DOMAIN__/${DOMAIN}/g; s/__ADMIN_DOMAIN__/${ADMIN_DOMAIN}/g; s/__API_DOMAIN__/${API_DOMAIN}/g" "$HERE/Caddyfile" > /etc/caddy/Caddyfile
cp "$HERE/olivepinch-api.service" /etc/systemd/system/
cp "$HERE/olivepinch-backup.service" "$HERE/olivepinch-backup.timer" "$HERE/olivepinch-sweep.service" "$HERE/olivepinch-sweep.timer" /etc/systemd/system/
install -m 750 -o olivepinch-app "$HERE/backup.sh" /opt/olivepinch/backup.sh
[ -f /opt/olivepinch/.env ] || { install -m 600 -o olivepinch-app /dev/null /opt/olivepinch/.env; echo "Create /opt/olivepinch/.env (see deploy/env.example), then run deploy.sh from your machine."; }
systemctl daemon-reload
systemctl enable --now olivepinch-backup.timer olivepinch-sweep.timer
systemctl reload caddy || systemctl restart caddy
echo "Server ready."
