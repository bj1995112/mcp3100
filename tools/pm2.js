/**
 * 工具: pm2 - 管理 PM2 进程
 */
const { run } = require("../lib/exec");

module.exports = {
  name: "pm2",
  description: "Manage PM2 processes",
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
