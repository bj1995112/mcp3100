/**
 * 工具: file - 文件操作（增强版）
 * actions:
 *   read   读取文件内容
 *   write  写入文件
 *   append 追加内容
 *   mkdir  创建目录 (recursive)
 *   delete 删除文件
 *   cp     复制文件
 *   mv     移动/重命名
 *   stat   文件信息
 *   list   列目录
 */
const fs = require("fs");
const path = require("path");

function statInfo(p) {
  const s = fs.statSync(p);
  return JSON.stringify({
    path: p,
    type: s.isDirectory() ? "directory" : s.isFile() ? "file" : "other",
    size: s.size,
    mode: s.mode.toString(8),
    created: s.birthtime,
    modified: s.mtime,
    isDirectory: s.isDirectory(),
    isFile: s.isFile()
  }, null, 2);
}

module.exports = {
  name: "file",
  description: "Read write and list files (read/write/append/mkdir/delete/cp/mv/stat/list)",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", description: "read write append mkdir delete cp mv stat list" },
      path: { type: "string" },
      content: { type: "string" },
      dest: { type: "string" }
    },
    required: ["action", "path"]
  },
  async run(args) {
    const { action, path: p, content } = args;
    const dest = args.dest;

    switch (action) {
      case "read":
        return fs.readFileSync(p, "utf8");
      case "write":
        fs.writeFileSync(p, content, "utf8");
        return "write success: " + p;
      case "append":
        fs.appendFileSync(p, content, "utf8");
        return "append success: " + p;
      case "mkdir":
        fs.mkdirSync(p, { recursive: true });
        return "mkdir success: " + p;
      case "delete":
        fs.unlinkSync(p);
        return "delete success: " + p;
      case "cp":
        if (!dest) throw new Error("cp 需要 dest 参数");
        fs.copyFileSync(p, dest);
        return "copy success: " + p + " -> " + dest;
      case "mv":
        if (!dest) throw new Error("mv 需要 dest 参数");
        fs.renameSync(p, dest);
        return "move success: " + p + " -> " + dest;
      case "stat":
        return statInfo(p);
      case "list":
        return fs.readdirSync(p).join("\n");
      default:
        return "unknown file action: " + action;
    }
  }
};
