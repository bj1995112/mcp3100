/**
 * exec.js - 统一命令执行封装
 *
 * 提供两种执行方式:
 *  - run():       一次性执行（旧版行为，所有工具默认）
 *  - runStream(): 流式执行（spawn + 分块回调，供 SSE 进度推送用）
 *
 * 行为保证:
 *  - run 成功 resolve(stdout || stderr), 失败 reject(stderr || error.message)
 *  - runStream 失败 reject(stderr || `exit code N`)
 */
const { exec, spawn } = require("child_process");

/**
 * 一次性执行命令（默认方式，与旧版完全一致）
 * @param {string} command
 * @param {object} [opts] { timeout, maxBuffer, cwd, env }
 * @returns {Promise<string>}
 */
function run(command, opts = {}) {
  const { timeout = 300000, maxBuffer = 5 * 1024 * 1024, cwd, env } = opts;
  return new Promise((resolve, reject) => {
    exec(command, { timeout, maxBuffer, cwd, env }, (error, stdout, stderr) => {
      if (error) { reject(stderr || error.message); return; }
      resolve(stdout || stderr);
    });
  });
}

/**
 * 流式执行命令（长任务边执行边回调输出块）
 * @param {string} command
 * @param {Function} [onChunk] 每收到一块输出调用 (chunk: string)
 * @param {object} [opts] { timeout, cwd, env }
 * @returns {Promise<string>} 最终全量输出
 */
function runStream(command, onChunk, opts = {}) {
  const { timeout = 600000, cwd, env } = opts;
  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["-c", command], { cwd, env });
    let out = "";
    let err = "";

    const timer = timeout ? setTimeout(() => { try { child.kill("SIGKILL"); } catch (e) {} }, timeout) : null;

    child.stdout.on("data", (d) => {
      const s = d.toString();
      out += s;
      if (onChunk) onChunk(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      err += s;
      if (onChunk) onChunk(s);
    });
    child.on("error", (e) => { if (timer) clearTimeout(timer); reject(e.message); });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve(out || err);
      else reject(err || `exit code ${code}`);
    });
  });
}

module.exports = { run, runStream };
