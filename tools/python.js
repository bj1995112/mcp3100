/**
 * 工具: python - 运行 Python 代码
 * 改进: 临时文件用 randomUUID 命名，避免并发冲突
 * 流式模式: extra.stream + extra.onChunk 时逐块回调输出
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { run, runStream } = require("../lib/exec");

module.exports = {
  name: "python",
  description: "Run python code",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string" }
    }
  },
  async run(args, extra = {}) {
    const file = path.join(os.tmpdir(), "mcp_python_" + crypto.randomUUID() + ".py");
    fs.writeFileSync(file, args.code, "utf8");
    try {
      if (extra.stream && extra.onChunk) {
        return await runStream(`python "${file}"`, extra.onChunk, { timeout: 600000 });
      }
      return await run(`python "${file}"`, { timeout: 300000 });
    } finally {
      try { fs.unlinkSync(file); } catch (e) { /* ignore */ }
    }
  }
};
