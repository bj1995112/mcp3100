/**
 * 工具: search - 搜索文件与内容 (find/grep/tree)
 */
const { run } = require("../lib/exec");

module.exports = {
  name: "search",
  description: "Search files and content",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", description: "find grep tree" },
      path: { type: "string" },
      keyword: { type: "string" }
    },
    required: ["action"]
  },
  async run(args) {
    const { action, keyword } = args;
    const p = args.path || ".";
    let command = "";
    if (action === "find") {
      command = `find ${p} -path "*/node_modules" -prune -o -type f -print`;
    } else if (action === "grep") {
      command = `grep -R "${keyword}" ${p} --exclude-dir=node_modules`;
    } else if (action === "tree") {
      command = `tree ${p}`;
    } else {
      throw new Error("unknown search action");
    }
    return run(command, { timeout: 300000, maxBuffer: 5 * 1024 * 1024 });
  }
};
