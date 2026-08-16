/**
 * tools/index.js - 工具加载器
 *
 * ⚠️ 重要约定（工具调度核心）：
 * 1. 新增工具 = 在 src/tools/ 下新建一个 .js 文件，统一导出:
 *      module.exports = { name, description, inputSchema, async run(args) {} }
 * 2. 在此文件按想要的顺序 require 并加入数组。
 * 3. 无需改动 router/registry 任何代码。
 * 4. tools/list 的返回顺序 = 本数组顺序。
 */
const shell = require("./shell");
const file = require("./file");
const python = require("./python");
const pm2 = require("./pm2");
const git = require("./git");
const search = require("./search");
const container = require("./container");
const network = require("./network");
const system = require("./system");
const process = require("./process");
const logs = require("./logs");
const env = require("./env");
const health = require("./health");

module.exports = [
  shell,
  file,
  python,
  pm2,
  git,
  search,
  container,
  network,
  system,
  process,
  logs,
  env,
  health
];
