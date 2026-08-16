#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
BASE="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$BASE/.env" ]; then echo '[ERROR] .env 不存在，请先运行 ./install.sh'; exit 1; fi
TOKEN=$(sed -n 's/^STD_AUTH_TOKEN=//p' "$BASE/.env")
if [ -z "$TOKEN" ] || [[ "$TOKEN" == *'安装器会自动生成'* ]]; then echo '[ERROR] 尚未生成有效 Token'; exit 1; fi
echo "MCP URL: http://127.0.0.1:3100/mcp"
echo "Bearer Token: $TOKEN"
