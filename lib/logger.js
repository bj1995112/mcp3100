/**
 * logger.js - 结构化日志
 * 输出带时间戳的 JSON 行到 stdout（pm2 接管），同时追加到 logs/mcp.log
 * 用法: logger.info("msg", {key:"value"})
 */
const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "mcp.log");

function ensureLogFile() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) { /* 忽略，日志失败不影响主流程 */ }
}

function write(level, message, extra) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(extra || {})
  };
  const line = JSON.stringify(entry);
  // stdout 给 pm2
  try { console.log(line); } catch (e) { /* ignore */ }
  // 追加到文件
  try {
    ensureLogFile();
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch (e) { /* ignore */ }
}

module.exports = {
  info: (msg, extra) => write("info", msg, extra),
  warn: (msg, extra) => write("warn", msg, extra),
  error: (msg, extra) => write("error", msg, extra),
  debug: (msg, extra) => {
    if (process.env.MCP_DEBUG === "1") write("debug", msg, extra);
  }
};
