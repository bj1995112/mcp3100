# container 异步长任务模式

`container` 工具的 `exec` 默认保持同步模式；需要运行构建、升级、扫描等长任务时使用 `async: true`。

```json
{
  "action": "exec",
  "distro": "ubuntu",
  "cmd": "your long command",
  "async": true
}
```

立即返回 `job_id`。随后：

- `job_status`：查询运行状态和退出码
- `job_output`：读取完整日志
- `job_cancel`：取消任务

任务日志和状态保存在 Termux 临时目录，不进入 MCP 仓库。同步 `exec` 仍保留默认超时；这套机制从根本上避免 MCP 请求被长任务阻塞。
