# MCP3100 后续扩展规划

## 当前版本

MCP3100 当前以 Termux 为主要部署环境。

核心服务：Node.js、MCP Streamable HTTP、mcp-std、PM2、3100 端口、Bearer Token 鉴权。

## 已完成的基础能力

- MCP 工具统一加载
- container 命令通过 spawn 参数数组直传，避免 Termux 宿主 shell 二次解析
- container 异步长任务：`async=true` + `job_status/job_output/job_cancel`
- 轻量 typecheck 预检，不额外引入 TypeScript 编译器

## 后续可扩展方向

### 1. 支持通用 Linux

目前安装器针对 Termux 设计。后续可扩展 Ubuntu、Debian、Arch Linux、Fedora 及其他兼容 Node.js 的 Linux。

### 2. 自动识别运行环境

未来安装器可自动检测 Termux、Ubuntu/Debian、Arch、Fedora 及其他 Linux，并选择对应安装方式。

### 3. MCP 核心与平台安装层分离

长期目标：

```text
MCP3100
├── core/
├── installer/
│   ├── termux/
│   ├── debian/
│   ├── arch/
│   └── generic-linux/
├── config/
├── scripts/
└── docs/
```

### 4. ChatGPT / Tunnel

ChatGPT 和 Tunnel 当前属于可选功能。后续可增加 Tunnel 自动配置、ChatGPT 连接向导、外部 MCP URL 配置、Authorization 配置、连接状态检测和自动恢复。

### 5. 配置与迁移

未来可以支持 backup → install → restore，源码、配置、数据和密钥继续保持分离。

## 设计原则

1. 不因为增加平台破坏现有 Termux 部署。
2. MCP 核心尽量保持跨 Linux。
3. 平台相关代码放在安装层，不进入 MCP 核心。
4. ChatGPT/Tunnel 保持可选。
5. 不把 Token、API Key 等敏感信息提交到 GitHub。
6. 新版本升级应尽量保持现有配置和数据。
