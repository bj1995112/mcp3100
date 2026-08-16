/**
 * 工具: health - 全景健康检查（防误判）
 *
 * 用途: AI 动手前先看全景——pm2 服务、关键端口、磁盘、容器状态。
 *      避免"容器里空 → 误判故障"或"服务没启动 → 乱操作"。
 *
 * 用法:
 *   health.status({})  → 全量（pm2 + 端口 + 磁盘 + 容器）
 *   health.services({}) → 只看 pm2
 *   health.ports({})   → 只看关键端口
 *
 * 注意:
 *   - Termux 无 ss 命令，端口探测用 curl 探活（HTTP code 非 000 即 UP）
 *   - jq 输出用 @tsv 格式（零反斜杠，避免 JS→sh→jq 转义地狱）
 */
const { run } = require("../lib/exec");

const KEY_PORTS = [
  { port: 3000, name: "mcp-http" },
  { port: 3100, name: "mcp-std" }
];

module.exports = {
  name: "health",
  description: "Full health check: pm2 services + key ports + disk + containers. Run before diagnosing.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["status", "services", "ports"],
        description: "status=full snapshot, services=pm2 only, ports=key ports only",
        default: "status"
      }
    }
  },
  async run(args) {
    const action = args.action || "status";
    const parts = [];

    if (action === "status" || action === "services") {
      // @tsv 输出: name \t status \t restarts \t memMB
      const pm2out = await run(
        `pm2 jlist 2>/dev/null | jq -r '.[] | [.name, .pm2_env.status, (.pm2_env.restart_time|tostring), ((.monit.memory/1048576)|floor|tostring)] | @tsv' 2>/dev/null || echo "pm2 未运行"`,
        { timeout: 15000 }
      ).catch(() => "pm2 查询失败");
      parts.push(`[pm2 服务] (name\tstatus\trestarts\tmemMB)\n${pm2out || "无"}`);
    }

    if (action === "status" || action === "ports") {
      const portLines = [];
      for (const { port, name } of KEY_PORTS) {
        const code = await run(
          `curl -s -o /dev/null -m 3 -w '%{http_code}' http://127.0.0.1:${port}/ 2>/dev/null || echo 000`,
          { timeout: 8000 }
        ).catch(() => "000");
        const c = String(code).trim();
        portLines.push(`${name} (:${port}) → ${c !== "000" && c !== "" ? `UP (HTTP ${c})` : "DOWN"}`);
      }
      parts.push(`[关键端口]\n${portLines.join("\n")}`);
    }

    if (action === "status") {
      const disk = await run(
        `df -h /data 2>/dev/null | tail -1 | awk '{print "总:"$2" 已用:"$3" 可用:"$4" 使用率:"$5}'`,
        { timeout: 8000 }
      ).catch(() => "?");
      const cont = await run(
        `ls ${process.env.PREFIX}/var/lib/proot-distro/containers/ 2>/dev/null | tr '\\n' ' ' || echo "(无容器)"`,
        { timeout: 8000 }
      ).catch(() => "?");
      parts.push(`[磁盘]\n${disk.trim()}`);
      parts.push(`[容器]\n${cont.trim()}`);
    }

    return parts.join("\n\n");
  }
};
