/**
 * 工具: logs - 查看服务/文件日志（tail 封装）
 *
 * 用法:
 *   logs.tail({ service: "tunnel-client", lines: 50, filter: "error" })
 *   logs.tail({ file: "/root/pi-web/tmp/build.log", lines: 30 })
 *   logs.list({})                    → 列出可查的 pm2 服务与日志文件
 *
 * 安全约束（与裸 shell tail 的关键区别）:
 *   - lines 上限 500，默认 50，防刷屏/超时
 *   - 禁止 tail -f 无限阻塞（只读末尾，MCP 调用不会卡死）
 *   - 支持按 pm2 服务名聚合（自动找 out/err 日志）
 *   - 支持关键字过滤（大小写不敏感）
 */
const { run } = require("../lib/exec");

function safeLines(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 50;
  return Math.min(Math.floor(v), 500);
}

function buildTailCmd({ service, file, lines, filter }) {
  const n = safeLines(lines);
  let target = "";

  if (service) {
    // 优先用 pm2 解析出日志路径（服务名安全转义）
    const esc = String(service).replace(/[^A-Za-z0-9_-]/g, "");
    target = `$(pm2 jlist 2>/dev/null | jq -r --arg s "${esc}" '.[] | select(.name==$s) | .pm2_env.pm_out_log_path // empty' | head -1)`;
    if (!target || target === "") {
      target = `$HOME/.pm2/logs/${esc}-out.log`;
    }
  } else if (file) {
    target = file.replace(/^~/, "$HOME");
  } else {
    throw new Error("must provide service or file");
  }

  let cmd = `if [ -f "${target}" ]; then tail -n ${n} "${target}"; else echo "log file not found: ${target}"; fi`;

  if (filter) {
    const f = String(filter).replace(/'/g, "'\\''");
    cmd = `if [ -f "${target}" ]; then tail -n ${n} "${target}" | grep -i -- "${f}" || echo "(no match: ${f})"; else echo "log file not found: ${target}"; fi`;
  }

  return cmd;
}

module.exports = {
  name: "logs",
  description: "View service or file logs (tail with limits)",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["tail", "list"],
        description: "tail=view log tail, list=list available services/files",
        default: "tail"
      },
      service: { type: "string", description: "pm2 service name, e.g. tunnel-client / mcp-std / pi-web" },
      file: { type: "string", description: "log file path (absolute or ~/ prefix)" },
      lines: { type: "number", description: "lines, default 50, max 500" },
      filter: { type: "string", description: "case-insensitive keyword filter" }
    }
  },
  async run(args) {
    const action = args.action || "tail";

    if (action === "list") {
      // 用 pm2 jlist + jq；避免中文引号嵌套问题，用 null 判断
      const out = await run(
        `pm2 jlist 2>/dev/null | jq -r '.[] | "\\(.name)\\tout:" + ((.pm2_env.pm_out_log_path // "none")) + "\\terr:" + ((.pm2_env.pm_err_log_path // "none"))' 2>/dev/null || echo "pm2 not running"`,
        { timeout: 15000 }
      );
      return out || "no pm2 services";
    }

    const cmd = buildTailCmd(args);
    return run(cmd, { timeout: 15000 });
  }
};
