#!/usr/bin/env bash
# Run from your machine. Usage:
#   SERVER=root@IP API_DOMAIN=api.example.com VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... ./deploy.sh [backend|customer|admin|all]
set -euo pipefail
: "${SERVER:?}"
WHAT=${1:-all}
BACKEND=/Users/macbook/olivepinch-backend/server
CUSTOMER=/Users/macbook/olivepinch-ui-change
ADMIN=/Users/macbook/olivepinch/admin

if [[ $WHAT == backend || $WHAT == all ]]; then
  rsync -az --delete --exclude node_modules --exclude dist --exclude .env "$BACKEND"/ "$SERVER":/opt/olivepinch/server/
  ssh "$SERVER" 'cd /opt/olivepinch/server && chown -R olivepinch-app:olivepinch-app . && sudo -u olivepinch-app bash -c "npm ci && npx prisma migrate deploy && npm run build" && systemctl restart olivepinch-api'
fi
if [[ $WHAT == customer || $WHAT == all ]]; then
  # Production API address is baked into the build.
  (cd "$CUSTOMER" && VITE_API_URL="https://${API_DOMAIN:?}/api" VITE_SUPABASE_URL="${VITE_SUPABASE_URL:?}" VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:?}" npm run build) && rsync -az --delete "$CUSTOMER"/dist/ "$SERVER":/var/www/olivepinch/customer/
fi
if [[ $WHAT == admin || $WHAT == all ]]; then
  (cd "$ADMIN" && VITE_API_URL="https://${API_DOMAIN:?}/api/admin" npm run build) && rsync -az --delete "$ADMIN"/dist/ "$SERVER":/var/www/olivepinch/admin/
fi
echo "Deployed $WHAT."
