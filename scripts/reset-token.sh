#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
BASE="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$BASE/.env" ] || { echo '[ERROR] .env 不存在，请先运行 ./install.sh'; exit 1; }
TOKEN=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")
sed -i "s#^STD_AUTH_TOKEN=.*#STD_AUTH_TOKEN=$TOKEN#" "$BASE/.env"
pm2 restart mcp-std --update-env >/dev/null
sleep 1
echo 'MCP Token 已重置。'
echo "MCP URL: http://127.0.0.1:3100/mcp"
echo "Bearer Token: $TOKEN"
