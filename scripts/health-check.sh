#!/data/data/com.termux/files/usr/bin/bash
set -u
BASE="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${STD_PORT:-3100}"
URL="http://127.0.0.1:${PORT}"
PASS=0
FAIL=0
check(){
  if "$@" >/dev/null 2>&1; then echo "[OK] $*"; PASS=$((PASS+1)); else echo "[FAIL] $*"; FAIL=$((FAIL+1)); fi
}
check node --version
check npm --version
check pm2 --version
check curl --version
if curl -fsS --max-time 3 "$URL/" | grep -q 'termux-mcp-std'; then echo "[OK] MCP HTTP :$PORT"; PASS=$((PASS+1)); else echo "[FAIL] MCP HTTP :$PORT"; FAIL=$((FAIL+1)); fi
if pm2 describe mcp-std 2>/dev/null | grep -q 'online'; then echo "[OK] PM2 mcp-std online"; PASS=$((PASS+1)); else echo "[FAIL] PM2 mcp-std online"; FAIL=$((FAIL+1)); fi
echo "MCP3100 health: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
