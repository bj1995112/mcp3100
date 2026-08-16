/**
 * 工具: container - proot 容器统一入口（环境隔离）
 *
 * ⚠️ 设计原则（解决嵌套环境问题）:
 *   - AI 操作容器 = 只允许通过本工具，禁止 shell 裸拼 proot-distro login
 *   - exec:  在容器内执行命令（自动处理 proot login、引号转义、超时进程树清理）
 *   - status: 容器状态（是否存在、是否在跑、磁盘占用）
 *   - path:   容器路径 ↔ Termux 路径转换（解决双 rootfs 路径迷局）
 *   - list:   列出已安装容器
 *
 * 路径映射规则（以 ubuntu 为例）:
 *   容器视角  /root/pi-web
 *   Termux 视角 $PREFIX/var/lib/proot-distro/containers/ubuntu/rootfs/root/pi-web
 */
const { spawn } = require("child_process");
const { execSync } = require("child_process");
const { run } = require("../lib/exec");

const DEFAULT_DISTRO = "ubuntu";

function validDistro(d) {
  return /^[a-z0-9_-]+$/.test(d || "");
}

function rootfsPath(distro) {
  return `${process.env.PREFIX}/var/lib/proot-distro/containers/${distro}/rootfs`;
}

/** 递归收集 pid 的所有子孙进程（用于超时清理） */
function collectPids(rootPid, depth = 5) {
  let all = [];
  let frontier = [rootPid];
  for (let i = 0; i < depth && frontier.length > 0; i++) {
    const parents = frontier.join(",");
    let out = "";
    try { out = execSync(`ps -o pid= --ppid ${parents} 2>/dev/null`).toString().trim(); } catch (e) {}
    const children = out ? out.split(/\s+/).map(Number) : [];
    all.push(...children);
    frontier = children;
  }
  return all;
}

function killTree(rootPid) {
  const pids = collectPids(rootPid).concat([rootPid]);
  for (const p of pids) {
    try { process.kill(p, "SIGKILL"); } catch (e) {}
  }
}

/** 在容器内执行命令（spawn + 超时进程树清理） */
function execInContainer(distro, cmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const full = `proot-distro login ${distro} -- bash -lc ${JSON.stringify(cmd)}`;
    const child = spawn("bash", ["-c", full], { env: process.env });
    let out = "";
    let err = "";

    const timer = setTimeout(() => {
      killTree(child.pid);
      reject(new Error(`container exec 超时(${timeoutMs}ms)。提示: 容器内长任务请用 nohup + 日志轮询模式，勿直接阻塞执行。`));
    }, timeoutMs);

    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(err.trim() || out.trim() || `exit code ${code}`);
      } else {
        resolve(out || err);
      }
    });
  });
}

/** 路径转换: container->termux 或 termux->container */
function convertPath(distro, path, direction) {
  const root = rootfsPath(distro);
  if (direction === "container-to-termux") {
    if (path === "/") return root;
    return root + path;
  }
  // termux-to-container
  if (path.startsWith(root)) {
    const rest = path.slice(root.length);
    return rest === "" ? "/" : rest;
  }
  // 也兼容 $HOME 写法
  const home = `${process.env.HOME}`;
  if (path.startsWith(home)) {
    return "/" + path.slice(home.length + 1);
  }
  throw new Error(`无法转换路径(不在 ${distro} rootfs 内): ${path}`);
}

module.exports = {
  name: "container",
  description: "proot container unified entry (exec/status/path/list). Container ops must use this tool, not shell.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["exec", "status", "path", "list"],
        description: "exec=run cmd inside container, status=container state, path=path convert, list=installed distros",
        default: "exec"
      },
      distro: { type: "string", description: "distro name, default ubuntu" },
      cmd: { type: "string", description: "command to run inside container (action=exec)" },
      path: { type: "string", description: "path to convert (action=path)" },
      direction: {
        type: "string",
        enum: ["container-to-termux", "termux-to-container"],
        description: "path convert direction (action=path)",
        default: "container-to-termux"
      },
      timeout: { type: "number", description: "exec timeout ms, default 90000" }
    }
  },
  async run(args) {
    const action = args.action || "exec";
    const distro = args.distro || DEFAULT_DISTRO;
    if (!validDistro(distro)) throw new Error(`非法 distro: ${distro}`);

    if (action === "list") {
      const out = await run(`ls ${process.env.PREFIX}/var/lib/proot-distro/containers/ 2>/dev/null || echo "(无容器)"`, { timeout: 10000 });
      return out;
    }

    if (action === "status") {
      const root = rootfsPath(distro);
      const exists = require("fs").existsSync(root);
      if (!exists) return `容器 ${distro} 未安装（rootfs 不存在）`;
      const out = await run(
        `echo "容器: ${distro}"; echo "rootfs: ${root}"; echo "占用: $(du -sh ${root} 2>/dev/null | cut -f1)"; echo "运行中 proot 进程: $(ps aux 2>/dev/null | grep -c "[p]root-distro.*${distro}")"`,
        { timeout: 30000 }
      );
      return out;
    }

    if (action === "path") {
      if (!args.path) throw new Error("path 参数必填");
      const converted = convertPath(distro, args.path, args.direction || "container-to-termux");
      return `容器: ${distro}\n${args.direction || "container-to-termux"}: ${args.path}\n→ ${converted}`;
    }

    // action = exec
    if (!args.cmd) throw new Error("cmd 参数必填");
    return execInContainer(distro, args.cmd, args.timeout || 90000);
  }
};
