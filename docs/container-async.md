# container 长任务模式

`container` 工具的同步 `exec` 仍适合短命令；长时间构建、安装、测试、升级等任务使用 `async: true`，避免 MCP HTTP 请求被长任务占住或触发请求超时。

## 调用流程

```text
container(action=exec, cmd="...", async=true)
        ↓
立即返回 job_id
        ↓
container(action=job_status, job_id="...")
        ↓
container(action=job_output, job_id="...")
```

需要停止时：

```text
container(action=job_cancel, job_id="...")
```

异步任务会进入独立进程组。取消时向整个任务进程组发送信号，避免 proot / 子进程残留。

任务日志和状态文件保存在 Termux 临时目录下，不进入 Git 仓库。

## 什么时候使用

- `npm install`、`npm run build`
- 大型测试或构建
- Pi / DeepSeek Harness 等源码构建
- Linux 容器内升级、迁移
- 预计超过 90 秒的任务

短命令继续使用普通 `exec` 即可。
