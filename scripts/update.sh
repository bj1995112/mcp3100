#!/data/data/com.termux/files/usr/bin/bash
set -e
BASE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE"
npm ci
pm2 restart mcp-std --update-env
pm2 save
"$BASE/scripts/health-check.sh"
