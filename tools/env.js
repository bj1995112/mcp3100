/**
 * 工具: env - 环境自查与路径转换（认知纠偏）
 *
 * 目的: AI 执行命令前先确认"我在哪个环境"，避免 Termux / proot 容器混淆。
 *
 * 用法:
 *   env.current({})   → 当前环境快照（hostname/pwd/PATH/PREFIX/用户）
 *   env.path({ path:"/root/pi-web", direction:"container-to-termux", distro:"ubuntu" })
 *                     → 路径转换（与 container.path 相同规则，供快速自查）
 */
const { run } = require("../lib/exec");

const DEFAULT_DISTRO = "ubuntu";

function rootfsPath(distro) {
  return `${process.env.PREFIX}/var/lib/proot-distro/containers/${distro}/rootfs`;
}

module.exports = {
  name: "env",
  description: "Environment self-check & path convert. Run env.current() first to know which env you are in (Termux host vs proot container).",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["current", "path"],
        description: "current=env snapshot, path=path convert",
        default: "current"
      },
      path: { type: "string", description: "path to convert (action=path)" },
      direction: {
        type: "string",
        enum: ["container-to-termux", "termux-to-container"],
        description: "convert direction",
        default: "container-to-termux"
      },
      distro: { type: "string", description: "distro name for path convert, default ubuntu" }
    }
  },
  async run(args) {
    const action = args.action || "current";

    if (action === "current") {
      const out = await run(
        `echo "hostname: $(hostname)"; echo "user: $(whoami)"; echo "pwd: $(pwd)"; echo "PREFIX: $PREFIX"; echo "HOME: $HOME"; echo "PATH: $PATH" | tr ':' '\\n' | head -8; echo "---"; echo "检测: 当前在 Termux 宿主环境（$PREFIX 存在即 Termux）"`,
        { timeout: 10000 }
      );
      return out;
    }

    // action = path
    if (!args.path) throw new Error("path 参数必填");
    const distro = args.distro || DEFAULT_DISTRO;
    const direction = args.direction || "container-to-termux";
    const root = rootfsPath(distro);
    let converted;
    if (direction === "container-to-termux") {
      converted = args.path === "/" ? root : root + args.path;
    } else {
      if (args.path.startsWith(root)) {
        const rest = args.path.slice(root.length);
        converted = rest === "" ? "/" : rest;
      } else {
        throw new Error(`无法转换(不在 ${distro} rootfs 内): ${args.path}`);
      }
    }
    return `容器: ${distro}\n${direction}: ${args.path}\n→ ${converted}`;
  }
};
