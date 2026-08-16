#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# start-tunnel.sh — 启动 tunnel-client 连接 3100 mcp-std
# 用法：
#   1. 编辑下面 TUNNEL_ID 和 OPENAI_API_KEY 两个值
#   2. bash start-tunnel.sh
# ============================================================
set -e
cd "$(dirname "$0")"

# ======== 需要你填的两个值 ========
TUNNEL_ID="tunnel_你的id"       # OpenAI 平台 tunnels 页
export OPENAI_API_KEY="sk-你的key"      # platform.openai.com/settings/organization/api-keys
# ====================================

# 自动读取 mcp-std 的 Bearer token（.env 里）
STD_AUTH_TOKEN=$(grep '^STD_AUTH_TOKEN=' .env | cut -d= -f2-)

if [ -z "$STD_AUTH_TOKEN" ]; then
  echo "❌ 找不到 STD_AUTH_TOKEN（.env）"
  exit 1
fi

echo "▶ tunnel-id : $TUNNEL_ID"
echo "▶ mcp target: http://127.0.0.1:3100/mcp"
echo "▶ health UI : http://127.0.0.1:8080/ui"
echo "（Ctrl+C 停止）"
echo

export GODEBUG=netdns=go+ipv4
# 备用：export GODEBUG=netdns=go1

exec env GODEBUG=netdns=go+ipv4 tunnel-client run \
  --control-plane.tunnel-id "$TUNNEL_ID" \
  --control-plane.api-key "env:OPENAI_API_KEY" \
  --mcp.server-url http://127.0.0.1:3100/mcp \
  --mcp.extra-headers "Authorization: Bearer ${STD_AUTH_TOKEN}" \
  --health.listen-addr 127.0.0.1:8080
