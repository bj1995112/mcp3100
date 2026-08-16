/**
 * 工具: container - proot 容器统一入口（环境隔离）
 *
 * - exec: 容器内执行命令；支持 async=true 启动长任务并立即返回 job_id
 * - job_status/job_output/job_cancel: 管理异步长任务
 * - status/path/list: 容器状态、路径转换、已安装容器
 *
 * 命令传递铁律：exec 使用 spawn 参数数组直传，cmd 作为单个 argv 交给
 * 容器内 bash -lc，避免宿主 Termux shell 提前展开 $、反引号、换行和引号。
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { run } = require("../lib/exec");
const crypto = require("crypto");

const DEFAULT_DISTRO = "ubuntu";
const JOB_ROOT = path.join(process.env.PREFIX || "/tmp", "tmp", "mcp3100-container-jobs");

function validDistro(d) {
  return /^[a-z0-9_-]+$/.test(d || "");
}

function rootfsPath(distro) {
  return `${process.env.PREFIX}/var/lib/proot-distro/containers/${distro}/rootfs`;
}

function ensureJobRoot() {
  fs.mkdirSync(JOB_ROOT, { recursive: true, mode: 0o700 });
}

function jobPaths(jobId) {
  if (!/^[a-f0-9-]{16,64}$/.test(jobId || "")) throw new Error("非法 job_id");
  const dir = path.join(JOB_ROOT, jobId);
  return {
    dir,
    meta: path.join(dir, "meta.json"),
    log: path.join(dir, "output.log"),
    result: path.join(dir, "result.json"),
    pid: path.join(dir, "pid")
  };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function createJob(distro, cmd) {
  ensureJobRoot();
  const jobId = crypto.randomUUID();
  const p = jobPaths(jobId);
  fs.mkdirSync(p.dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(p.meta, JSON.stringify({ job_id: jobId, distro, cmd, created_at: new Date().toISOString() }, null, 2));
  const wrapper = `set +e
proot-distro login ${distro} -- bash -lc ${shellQuote(cmd)} > ${shellQuote(p.log)} 2>&1
code=$?
printf '%s\\n' "$code" > ${shellQuote(p.result)}
`;
  const child = spawn("bash", ["-lc", wrapper], { env: process.env, detached: true, stdio: "ignore" });
  child.unref();
  fs.writeFileSync(p.pid, String(child.pid));
  return { job_id: jobId, distro, status: "running", log: p.log };
}

function readJob(jobId, includeOutput = false) {
  const p = jobPaths(jobId);
  if (!fs.existsSync(p.meta)) throw new Error(`job 不存在: ${jobId}`);
  const meta = JSON.parse(fs.readFileSync(p.meta, "utf8"));
  const running = !fs.existsSync(p.result);
  const result = running ? null : Number(fs.readFileSync(p.result, "utf8").trim());
  const output = includeOutput && fs.existsSync(p.log) ? fs.readFileSync(p.log, "utf8") : undefined;
  return {
    ...meta,
    status: running ? "running" : (result === 0 ? "completed" : "failed"),
    exit_code: result,
    log: p.log,
    ...(output === undefined ? {} : { output })
  };
}

function cancelJob(jobId) {
  const p = jobPaths(jobId);
  if (!fs.existsSync(p.meta)) throw new Error(`job 不存在: ${jobId}`);
  if (fs.existsSync(p.result)) return readJob(jobId);
  const pid = Number(fs.readFileSync(p.pid, "utf8"));
  if (Number.isInteger(pid) && pid > 1) {
    try { process.kill(-pid, "SIGTERM"); } catch {}
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
  fs.writeFileSync(p.result, "143\\n");
  return readJob(jobId);
}

function collectPids(rootPid, depth = 5) {
  let all = [];
  let frontier = [rootPid];
  for (let i = 0; i < depth && frontier.length > 0; i++) {
    const parents = frontier.join(",");
    let out = "";
    try { out = execSync(`ps -o pid= --ppid ${parents} 2>/dev/null`).toString().trim(); } catch {}
    const children = out ? out.split(/\s+/).map(Number).filter(Number.isInteger) : [];
    all.push(...children);
    frontier = children;
  }
  return all;
}

function killTree(rootPid) {
  const pids = collectPids(rootPid).concat([rootPid]);
  for (const p of pids.reverse()) {
    try { process.kill(p, "SIGKILL"); } catch {}
  }
}

function execInContainer(distro, cmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn("proot-distro", ["login", distro, "--", "bash", "-lc", cmd], { env: process.env });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      killTree(child.pid);
      reject(new Error(`container exec 超时(${timeoutMs}ms)。长任务请使用 async=true。`));
    }, timeoutMs);
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(err.trim() || out.trim() || `exit code ${code}`));
      else resolve(out || err);
    });
  });
}

function convertPath(distro, targetPath, direction) {
  const root = rootfsPath(distro);
  if (direction === "container-to-termux") return targetPath === "/" ? root : root + targetPath;
  if (targetPath.startsWith(root)) {
    const rest = targetPath.slice(root.length);
    return rest === "" ? "/" : rest;
  }
  const home = `${process.env.HOME}`;
  if (targetPath.startsWith(home)) return "/" + targetPath.slice(home.length + 1);
  throw new Error(`无法转换路径(不在 ${distro} rootfs 内): ${targetPath}`);
}

module.exports = {
  name: "container",
  description: "proot container unified entry. exec 支持 async 长任务；job_status/job_output/job_cancel 用于轮询和管理。",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["exec", "status", "path", "list", "job_status", "job_output", "job_cancel"], description: "exec=执行；async exec 返回 job_id；job_* 管理异步任务", default: "exec" },
      distro: { type: "string", description: "distro name, default ubuntu" },
      cmd: { type: "string", description: "command to run inside container (action=exec)" },
      path: { type: "string", description: "path to convert (action=path)" },
      direction: { type: "string", enum: ["container-to-termux", "termux-to-container"], description: "path convert direction", default: "container-to-termux" },
      timeout: { type: "number", description: "同步 exec timeout ms, default 90000" },
      async: { type: "boolean", description: "exec=true 时启动后台长任务，立即返回 job_id，不占用 MCP 请求超时" },
      job_id: { type: "string", description: "异步任务 ID (job_status/job_output/job_cancel)" }
    }
  },
  async run(args) {
    const action = args.action || "exec";
    const distro = args.distro || DEFAULT_DISTRO;
    if (!validDistro(distro)) throw new Error(`非法 distro: ${distro}`);

    if (action === "list") {
      return run(`ls ${process.env.PREFIX}/var/lib/proot-distro/containers/ 2>/dev/null || echo "(无容器)"`, { timeout: 10000 });
    }
    if (action === "status") {
      const root = rootfsPath(distro);
      if (!fs.existsSync(root)) return `容器 ${distro} 未安装（rootfs 不存在）`;
      return run(`echo "容器: ${distro}"; echo "rootfs: ${root}"; echo "占用: $(du -sh ${root} 2>/dev/null | cut -f1)"; echo "运行中 proot 进程: $(ps aux 2>/dev/null | grep -c "[p]root-distro.*${distro}")"`, { timeout: 30000 });
    }
    if (action === "path") {
      if (!args.path) throw new Error("path 参数必填");
      const converted = convertPath(distro, args.path, args.direction || "container-to-termux");
      return `容器: ${distro}\n${args.direction || "container-to-termux"}: ${args.path}\n→ ${converted}`;
    }
    if (["job_status", "job_output", "job_cancel"].includes(action)) {
      if (!args.job_id) throw new Error("job_id 参数必填");
      if (action === "job_cancel") return cancelJob(args.job_id);
      return readJob(args.job_id, action === "job_output");
    }
    if (!args.cmd) throw new Error("cmd 参数必填");
    if (args.async === true) return createJob(distro, args.cmd);
    return execInContainer(distro, args.cmd, Number(args.timeout) || 90000);
  }
};