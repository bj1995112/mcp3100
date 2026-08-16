/**
 * 工具: git - 管理 git 仓库
 */
const { run } = require("../lib/exec");

module.exports = {
  name: "git",
  description: "Manage git repositories",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" }
    },
    required: ["command"]
  },
  async run(args) {
    return run(args.command, { timeout: 300000 });
  }
};
