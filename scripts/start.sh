#!/data/data/com.termux/files/usr/bin/bash
set -e
BASE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE"
if pm2 describe mcp-std >/dev/null 2>&1; then
  pm2 restart mcp-std --update-env
else
  pm2 start server.js --name mcp-std --cwd "$BASE"
fi
pm2 save
"$BASE/scripts/health-check.sh"
