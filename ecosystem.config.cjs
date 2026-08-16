// ecosystem.config.cjs — 启动 tunnel-client（秘密全部从 .env 读取，本文件零明文）
const fs = require("fs");

function loadDotEnv() {
  const env = {};
  try {
    const txt = fs.readFileSync(__dirname + "/.env", "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  } catch (e) {
    console.error("无法读取 .env:", e.message);
  }
  return env;
}

const dotenv = loadDotEnv();

module.exports = {
  apps: [{
    name: "tunnel-client",
    script: "/data/data/com.termux/files/usr/bin/proot",
    cwd: __dirname,
    interpreter: "none",
    start_delay: 8000,
    env: {
      GODEBUG: "netdns=cgo",
      OPENAI_API_KEY: dotenv.OPENAI_API_KEY || "",
      SSL_CERT_FILE: "/data/data/com.termux/files/usr/etc/tls/cert.pem",
      MCP_STD_AUTH: "Bearer " + (dotenv.STD_AUTH_TOKEN || "")
    },
    args: [
      "-b", "/data/data/com.termux/files/usr/etc/resolv.conf:/etc/resolv.conf",
      "/data/data/com.termux/files/usr/bin/tunnel-client", "run",
      "--control-plane.tunnel-id", dotenv.CONTROL_PLANE_TUNNEL_ID || "",
      "--control-plane.api-key", "env:OPENAI_API_KEY",
      "--mcp.server-url", "http://127.0.0.1:3100/mcp",
      "--mcp.extra-headers", "Authorization: env:MCP_STD_AUTH",
      "--health.listen-addr", "127.0.0.1:8080"
    ]
  }]
};
