/**
 * mcp-monitor - ChatGPT 502 自动修复监控（2026-08-16）
 *
 * 背景: tunnel-client 周期性 probe 3100，若撞上 mcp-std 重启/未就绪窗口
 *       → main channel 永久 disabled → ChatGPT 所有 MCP 调用 502。
 *       必须手动 pm2 restart tunnel-client 恢复。
 *
 * 本脚本: 每 60s 检查一次，异常自动重启对应服务（防抖 120s）。
 *   - 3100 不可达            → pm2 restart mcp-std
 *   - main channel 非 enabled → pm2 restart tunnel-client
 *
 * 运行: pm2 start monitor.cjs --name mcp-monitor
 * 日志: pm2 logs mcp-monitor
 */
const { exec } = require("child_process");
const http = require("http");

const CHECK_INTERVAL = 60_000;        // 检查周期
const RESTART_COOLDOWN = 120_000;     // 同一服务两次重启最小间隔
const MCP_URL = "http://127.0.0.1:3100/";
const TUNNEL_STATUS_URL = "http://127.0.0.1:8080/api/status";

const lastRestart = {};

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

/** GET 一个 URL，返回 {status, body}；任何异常返回 {status:0,body:""} */
function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, body: "" }); });
    req.on("error", () => resolve({ status: 0, body: "" }));
  });
}

/** 重启 pm2 服务（带防抖） */
function restartService(name) {
  const now = Date.now();
  if (lastRestart[name] && now - lastRestart[name] < RESTART_COOLDOWN) {
    log(`SKIP restart ${name}: cooldown (上次 ${Math.round((now - lastRestart[name]) / 1000)}s 前)`);
    return;
  }
  lastRestart[name] = now;
  log(`RESTART ${name} ...`);
  exec(`pm2 restart ${name}`, { timeout: 20000 }, (err, stdout, stderr) => {
    if (err) log(`restart ${name} FAILED: ${stderr || err.message}`);
    else log(`restart ${name} done`);
  });
}

async function checkOnce() {
  try {
    // 1. mcp-std 3100 可达性
    const mcp = await httpGet(MCP_URL);
    if (mcp.status !== 200) {
      log(`WARN mcp-std ${MCP_URL} status=${mcp.status} → restart mcp-std`);
      restartService("mcp-std");
      return;
    }

    // 2. tunnel-client main channel 状态
    const tunnel = await httpGet(TUNNEL_STATUS_URL);
    if (tunnel.status !== 200) {
      log(`WARN tunnel ${TUNNEL_STATUS_URL} status=${tunnel.status} → restart tunnel-client`);
      restartService("tunnel-client");
      return;
    }
    let main = null;
    try {
      main = JSON.parse(tunnel.body).channels?.find((c) => c.name === "main");
    } catch (e) {}
    if (!main || main.enabled !== true) {
      log(`WARN main channel enabled=${main ? main.enabled : "unknown"} → restart tunnel-client`);
      restartService("tunnel-client");
      return;
    }

    log("OK mcp-std up, main channel enabled");
  } catch (e) {
    log(`ERROR checkOnce: ${e.message}`);
  }
}

log("mcp-monitor started (interval 60s)");
checkOnce();
setInterval(checkOnce, CHECK_INTERVAL);
