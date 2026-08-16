/**
 * 工具: process - 进程管理
 * actions:
 *   list  列出进程（含 CPU/内存排行，可选 top N）
 *   kill  终止进程（kill PID）
 *   mem   按内存占用排行
 */
const { run } = require("../lib/exec");

function parsePs(out) {
  const lines = out.trim().split("\n");
  if (lines.length < 2) return "无进程数据";
  const header = lines[0];
  const rows = lines.slice(1).map((l) => l.trim().replace(/\s+/g, " "));
  return header + "\n" + rows.join("\n");
}

module.exports = {
  name: "process",
  description: "Manage processes (list/kill/mem)",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", description: "list kill mem" },
      pid: { type: "string", description: "kill 时指定 PID" },
      top: { type: "string", description: "list/mem 时显示前 N 条" }
    },
    required: ["action"]
  },
  async run(args) {
    const action = args.action;
    const top = parseInt(args.top || "0", 10) || 0;

    if (action === "kill") {
      if (!args.pid) throw new Error("kill 需要 pid 参数");
      return run(`kill ${args.pid} && echo "已终止进程 ${args.pid}"`, { timeout: 10000 })
        .catch((e) => "kill 失败: " + e);
    }

    if (action === "list") {
      const out = await run("ps -eo pid,ppid,pcpu,pmem,rss,etime,comm --sort=-pcpu 2>/dev/null | head -50 || ps aux", { timeout: 10000 });
      const parsed = parsePs(out);
      if (top > 0) return "CPU 占用 TOP" + top + ":\n" + parsed.split("\n").slice(0, top + 1).join("\n");
      return parsed;
    }

    if (action === "mem") {
      const out = await run("ps -eo pid,rss,comm --sort=-rss 2>/dev/null | head -30 || ps aux --sort=-rss", { timeout: 10000 });
      const lines = out.trim().split("\n");
      const header = "PID    RSS(MB)  COMMAND";
      const rows = lines.slice(1).map((l) => {
        const parts = l.trim().split(/\s+/);
        const pid = parts[0];
        const rss = parseInt(parts[1] || "0", 10);
        const name = parts.slice(2).join(" ");
        return `${pid.padEnd(7)} ${(rss / 1024).toFixed(1).padEnd(7)} ${name}`;
      });
      const sorted = rows.sort((a, b) => parseFloat(b) - parseFloat(a));
      const result = header + "\n" + sorted.join("\n");
      if (top > 0) return "内存占用 TOP" + top + ":\n" + result.split("\n").slice(0, top + 1).join("\n");
      return result;
    }

    return "unknown process action: " + action;
  }
};
