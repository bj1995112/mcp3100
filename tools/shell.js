/**
 * 工具: shell - 执行任意 Termux 命令
 * 兼容旧版行为: 成功 resolve(stdout||stderr), 失败 reject(stderr||error.message)
 * 流式模式: 传入 extra.stream + extra.onChunk 时，边执行边回调输出块（用于 SSE 进度）
 *
 * ⚠️ 环境约定（重要）:
 *   - 本工具在 Termux 宿主环境执行，只操作 Termux 侧
 *   - proot 容器内的操作必须用 container 工具（禁止手动拼 proot-distro login）
 *   - 长任务(>60s)请用 nohup 后台 + 日志轮询，勿阻塞等待
 */
const { run, runStream } = require("../lib/exec");

module.exports = {
  name: "shell",
  description: "Execute Termux command (host env only). For proot container ops use container tool, NOT this.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" }
    },
    required: ["command"]
  },
  async run(args, extra = {}) {
    if (extra.stream && extra.onChunk) {
      return runStream(args.command, extra.onChunk, { timeout: 600000 });
    }
    return run(args.command, { timeout: 300000 });
  }
};
