#!/usr/bin/env bash
set -euo pipefail

# Idempotent bootstrap for the MARKET LINK EXPRESS admin web app (Create React App).
# Safe to re-run: dependency install is deterministic and the .env is regenerated
# each time from Cursor secrets, falling back to placeholders so the dev server
# always renders even before real credentials are configured.

cd "$(dirname "$0")/.."

npm install --legacy-peer-deps

# Real values come from Cursor secrets (injected as env vars). When a secret is
# absent, a harmless placeholder keeps the app compiling and the login UI rendering.
cat > .env <<EOF
REACT_APP_SUPABASE_URL=${REACT_APP_SUPABASE_URL:-https://placeholder.supabase.co}
REACT_APP_SUPABASE_ANON_KEY=${REACT_APP_SUPABASE_ANON_KEY:-placeholder-anon-key}
REACT_APP_GOOGLE_MAPS_API_KEY=${REACT_APP_GOOGLE_MAPS_API_KEY:-placeholder-google-maps-key}
EOF
