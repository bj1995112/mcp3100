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
- 后续 ChatGPT/Tunnel 接入说明单独维护

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
```

## 本地 MCP 地址

`http://127.0.0.1:3100/mcp`

## ChatGPT

首次安装不需要配置。后续按 `docs/chatgpt-connection.md` 填写连接所需数据。
