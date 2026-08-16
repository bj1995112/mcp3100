# MCP3100

Termux 原生、可重建的标准 MCP Streamable HTTP 服务。

## 特点

- MCP 核心服务：`mcp-std`
- 默认端口：`3100`
- Streamable HTTP：`/mcp`
- Bearer Token 鉴权
- PM2 管理
- `npm ci` 锁定依赖
- 第一次安装不强制填写 ChatGPT/Tunnel 数据
- `container` 支持异步长任务，避免长命令占用 MCP 请求超时
- 内置轻量 `typecheck` 预检

## 一键安装

在 Termux 宿主层执行：

```bash
./scripts/install.sh
```

## 常用操作

```bash
./scripts/start.sh
./scripts/stop.sh
./scripts/status.sh
./scripts/update.sh
./scripts/health-check.sh
npm run typecheck
```

## container 长任务

短命令继续使用同步 `exec`。预计超过请求超时的任务使用 `async=true`，拿到 `job_id` 后通过 `job_status`、`job_output`、`job_cancel` 管理。

完整说明见 [`docs/container-async.md`](docs/container-async.md)。

## 本地 MCP 地址

`http://127.0.0.1:3100/mcp`

## ChatGPT

首次安装不需要配置。后续按 `docs/chatgpt-connection.md` 填写连接所需数据。

## 后续扩展

当前主要面向 Termux，后续可扩展 Ubuntu / Debian / Arch / Fedora 等 Linux，并增加自动识别运行环境、跨 Linux 一键安装、ChatGPT / Tunnel 自动配置以及配置备份与迁移能力。

核心 MCP 服务尽量保持跨 Linux，平台差异放在安装层。完整规划见 [`docs/roadmap.md`](docs/roadmap.md)。
