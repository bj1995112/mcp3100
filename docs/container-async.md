# container 异步长任务

`container` 工具现在支持 `async=true`。这是为了解决 proot / Termux 中长任务占用 MCP 请求、触发 HTTP 或工具层超时的问题。

## 启动长任务

调用 `container`：

```json
{
  "action": "exec",
  "distro": "ubuntu",
  "cmd": "npm run build",
  "async": true
}
```

工具会立即返回 `job_id`，后台任务继续运行，输出写入任务日志。

## 查询状态

```json
{
  "action": "job_status",
  "job_id": "<job_id>"
}
```

状态包括 `running`、`completed`、`failed`，并提供 `exit_code`。

## 获取输出

```json
{
  "action": "job_output",
  "job_id": "<job_id>"
}
```

## 取消任务

```json
{
  "action": "job_cancel",
  "job_id": "<job_id>"
}
```

取消会尝试终止整个后台进程组，而不是只杀掉外层 wrapper。

## 设计原则

- 普通短命令继续使用 `exec`，默认超时 90 秒。
- 长任务不要依赖 `nohup + 手工日志` 绕过超时，直接使用 `async=true`。
- `job_id` 是任务唯一句柄；后续可以在此基础上扩展任务清理、实时 tail、重试和持久化。
