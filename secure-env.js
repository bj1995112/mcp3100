// 安全加固：秘密收拢到 .env + ecosystem 全 env 引用 + start-tunnel.sh 脱敏
const fs = require("fs");

// 1. 从现有 ecosystem 提取 API key
const eco = fs.readFileSync("ecosystem.config.cjs", "utf8");
const keyMatch = eco.match(/OPENAI_API_KEY:\s*"([^"]+)"/);
const apiKey = keyMatch ? keyMatch[1] : "";

// 2. 从 start-tunnel.sh 提取 tunnel_id
const sh = fs.existsSync("start-tunnel.sh") ? fs.readFileSync("start-tunnel.sh", "utf8") : "";
const tidMatch = sh.match(/TUNNEL_ID="([^"]+)"/);
const tunnelId = (eco.match(/tunnel_[a-f0-9]{32}/) || [])[0] || (tidMatch ? tidMatch[1] : "");

// 3. 读 .env，更新/追加 OPENAI_API_KEY、CONTROL_PLANE_TUNNEL_ID
let envTxt = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
function setEnv(key, val) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(envTxt)) envTxt = envTxt.replace(re, `${key}=${val}`);
  else envTxt += (envTxt.endsWith("\n") ? "" : "\n") + `${key}=${val}`;
}
if (apiKey) setEnv("OPENAI_API_KEY", apiKey);
if (tunnelId) setEnv("CONTROL_PLANE_TUNNEL_ID", tunnelId);
fs.writeFileSync(".env", envTxt.trimEnd() + "\n", { mode: 0o600 });

// 4. 解析 .env 为对象
const envVars = {};
for (const line of envTxt.split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) envVars[m[1]] = m[2];
}
const mcpAuth = "Bearer " + (envVars.STD_AUTH_TOKEN || "");

// 5. 生成新 ecosystem（无明文，MCP_STD_AUTH 注入 env）
const newEco = `module.exports = {
  apps: [{
    name: "tunnel-client",
    script: "/data/data/com.termux/files/usr/bin/proot",
    cwd: ${JSON.stringify(process.cwd())},
    interpreter: "none",
    env: {
      GODEBUG: "netdns=cgo",
      OPENAI_API_KEY: ${JSON.stringify(envVars.OPENAI_API_KEY || "")},
      SSL_CERT_FILE: "/data/data/com.termux/files/usr/etc/tls/cert.pem",
      MCP_STD_AUTH: ${JSON.stringify(mcpAuth)}
    },
    args: [
      "-b", "/data/data/com.termux/files/usr/etc/resolv.conf:/etc/resolv.conf",
      "/data/data/com.termux/files/usr/bin/tunnel-client", "run",
      "--control-plane.tunnel-id", ${JSON.stringify(envVars.CONTROL_PLANE_TUNNEL_ID || "")},
      "--control-plane.api-key", "env:OPENAI_API_KEY",
      "--mcp.server-url", "http://127.0.0.1:3100/mcp",
      "--mcp.extra-headers", "Authorization: env:MCP_STD_AUTH",
      "--health.listen-addr", "127.0.0.1:8080"
    ]
  }]
};
`;
fs.writeFileSync("ecosystem.config.cjs", newEco, { mode: 0o600 });

// 6. start-tunnel.sh 脱敏
if (fs.existsSync("start-tunnel.sh")) {
  let s = sh;
  if (apiKey) s = s.split(apiKey).join("sk-你的key");
  if (tunnelId) s = s.split(tunnelId).join("tunnel_你的id");
  s = s.split("bj1995112@.").join("你的token");
  fs.writeFileSync("start-tunnel.sh", s, { mode: 0o700 });
}

console.log("✅ 完成");
console.log("   .env 变量:", Object.keys(envVars).join(", "));
console.log("   MCP_STD_AUTH 前缀:", mcpAuth.slice(0, 7) + "***");
