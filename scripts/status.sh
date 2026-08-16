#!/data/data/com.termux/files/usr/bin/bash
set -e
BASE="$(cd "$(dirname "$0")/.." && pwd)"
pm2 describe mcp-std || true
printf '\n--- MCP3100 ---\n'
"$BASE/scripts/health-check.sh" || true
