/**
 * 工具: system - 查看系统信息（内存/CPU/磁盘/电池/温度/IP）
 * 用法: system.run({}) 返回完整信息；或 system.run({section:"memory"})
 */
const os = require("os");
const fs = require("fs");
const { run } = require("../lib/exec");

function readFirst(p) {
  try { return fs.readFileSync(p, "utf8").trim(); } catch (e) { return "N/A"; }
}

function cpuCores() {
  try {
    const info = fs.readFileSync("/proc/cpuinfo", "utf8");
    const n = info.match(/processor\s*:/g);
    if (n && n.length) return n.length;
  } catch (e) { /* fallback */ }
  try { return os.cpus().length; } catch (e) { return "?"; }
}

function memInfo() {
  try {
    const info = fs.readFileSync("/proc/meminfo", "utf8");
    const gb = (kb) => (kb / 1024 / 1024).toFixed(1) + "G";
    const memTotal = parseInt(info.match(/MemTotal:\s+(\d+)/)?.[1] || 0, 10);
    const memAvail = parseInt(info.match(/MemAvailable:\s+(\d+)/)?.[1] || 0, 10);
    return `内存: 总 ${gb(memTotal)} | 可用 ${gb(memAvail)} | 已用 ${gb(memTotal - memAvail)}`;
  } catch (e) { return "内存: N/A"; }
}

function cpuInfo() {
  const cores = cpuCores();
  const load = os.loadavg();
  return `CPU: ${cores} 核 | 负载(1/5/15min): ${load[0].toFixed(2)} / ${load[1].toFixed(2)} / ${load[2].toFixed(2)}`;
}

function diskInfo() {
  return new Promise((resolve) => {
    run("df -h /data 2>/dev/null | tail -1", { timeout: 5000 })
      .then((out) => resolve("磁盘: " + out.trim()))
      .catch(() => resolve("磁盘: N/A"));
  });
}

function batteryInfo() {
  // 尝试多个常见路径（Android 上 Termux 可能无权限读取）
  const paths = [
    "/sys/class/power_supply/battery",
    "/sys/class/power_supply/BAT0",
    "/sys/class/power_supply/BAT1"
  ];
  for (const p of paths) {
    const cap = readFirst(p + "/capacity");
    if (cap !== "N/A") {
      const status = readFirst(p + "/status");
      const temp = readFirst(p + "/temp");
      let tempC = "N/A";
      if (temp !== "N/A") tempC = (parseInt(temp, 10) / 10).toFixed(1) + "°C";
      return `电池: ${cap}% | 状态 ${status} | 温度 ${tempC}`;
    }
  }
  return "电池: N/A (无权限，可用 termux-battery-status)";
}

function tempInfo() {
  try {
    const zones = fs.readdirSync("/sys/class/thermal").filter((z) => z.startsWith("thermal_zone"));
    const temps = zones.map((z) => {
      const t = parseInt(readFirst(`/sys/class/thermal/${z}/temp`), 10);
      return isNaN(t) ? null : t / 1000;
    }).filter((t) => t !== null && t > 20);
    if (!temps.length) return "温度: N/A";
    return "温度: " + Math.max(...temps).toFixed(1) + "°C (最高)";
  } catch (e) { return "温度: N/A"; }
}

function ipInfo() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) ips.push(`${name}: ${iface.address}`);
    }
  }
  return "IP: " + (ips.join(" | ") || "无局域网IP");
}

module.exports = {
  name: "system",
  description: "View system info (memory/cpu/disk/battery/temp/ip)",
  inputSchema: {
    type: "object",
    properties: {
      section: { type: "string", description: "all|memory|cpu|disk|battery|temp|ip" }
    }
  },
  async run(args) {
    const s = (args.section || "all").toLowerCase();
    const lines = [];
    if (s === "all" || s === "memory") lines.push(memInfo());
    if (s === "all" || s === "cpu") lines.push(cpuInfo());
    if (s === "all" || s === "disk") lines.push(await diskInfo());
    if (s === "all" || s === "battery") lines.push(batteryInfo());
    if (s === "all" || s === "temp") lines.push(tempInfo());
    if (s === "all" || s === "ip") lines.push(ipInfo());
    if (!lines.length) return "unknown section: " + args.section;
    return lines.join("\n");
  }
};
