/**
 * 工具: network - 网络诊断 (新增, 旧版未注册)
 * 用于 ping / curl / 连通性测试等网络相关命令
 * 用法示例: network.run("ping -c 3 8.8.8.8")
 *           network.run("curl -sI https://www.google.com")
 */
const { run } = require("../lib/exec");

module.exports = {
  name: "network",
  description: "Run network commands (ping/curl/traceroute etc)",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" }
    },
    required: ["command"]
  },
  async run(args) {
    return run(args.command, { timeout: 600000, maxBuffer: 5 * 1024 * 1024 });
  }
};
