#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
BASE="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/data/data/com.termux/files/usr/bin:$PATH"

echo '=== MCP3100 Termux installer ==='
case "${PREFIX:-}" in
  /data/data/com.termux/files/usr) ;;
  *) echo '[ERROR] 此安装器必须在 Termux 宿主层运行。'; exit 1;;
esac

command -v pkg >/dev/null || { echo '[ERROR] 未检测到 Termux pkg'; exit 1; }
command -v node >/dev/null || { echo '[INFO] 安装 Node.js'; pkg install -y nodejs; }
command -v npm >/dev/null || { echo '[ERROR] npm 不可用'; exit 1; }
command -v pm2 >/dev/null || { echo '[INFO] 安装 PM2'; npm install -g pm2; }

cd "$BASE"
[ -f package-lock.json ] || { echo '[ERROR] 缺少 package-lock.json'; exit 1; }
if [ ! -f .env ]; then
  cp .env.example .env
  TOKEN=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")
  sed -i "s#^STD_AUTH_TOKEN=.*#STD_AUTH_TOKEN=$TOKEN#" .env
  echo '[INFO] 已自动生成 MCP Bearer Token（不会显示在终端）'
fi

echo '[INFO] 安装锁定依赖'
npm ci

echo '[INFO] 启动 MCP3100'
if pm2 describe mcp-std >/dev/null 2>&1; then
  pm2 restart mcp-std --update-env
else
  pm2 start server.js --name mcp-std --cwd "$BASE"
fi
pm2 save

echo
"$BASE/scripts/health-check.sh"
echo
echo 'MCP3100 已部署。'
echo '本地地址: http://127.0.0.1:3100/mcp'
echo 'ChatGPT/Tunnel 配置暂不要求填写，参见 docs/chatgpt-connection.md'
