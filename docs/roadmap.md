# MCP3100 后续扩展规划

## 当前版本

MCP3100 当前以 Termux 为主要部署环境。

核心服务：

- Node.js
- MCP Streamable HTTP
- mcp-std
- PM2
- 3100 端口
- Bearer Token 鉴权

默认 MCP 地址：`http://127.0.0.1:3100/mcp`

## 后续可扩展方向

### 1. 支持通用 Linux

目前安装器针对 Termux 设计。后续可扩展 Ubuntu、Debian、Arch Linux、Fedora 及其他兼容 Node.js 的 Linux。

核心 MCP 服务应尽量保持不依赖 Termux。

### 2. 自动识别运行环境

未来安装器可自动检测 Termux、Ubuntu/Debian、Arch、Fedora 及其他 Linux，并选择对应安装方式。

### 3. MCP 核心与平台安装层分离

长期目标：

```text
MCP3100
├── core/                 # MCP 核心
├── installer/            # 平台安装层
│   ├── termux/
│   ├── debian/
│   ├── arch/
│   └── generic-linux/
├── config/
├── scripts/
└── docs/
```

核心 MCP 不应因为增加 Linux 平台而重复修改。

### 4. ChatGPT / Tunnel

ChatGPT 和 Tunnel 当前属于可选功能，第一次部署不要求配置。

后续可增加：

- Tunnel 自动配置
- ChatGPT 连接向导
- 外部 MCP URL 配置
- Authorization 配置
- 连接状态检测
- Tunnel 自动恢复

### 5. 配置与迁移

未来可以支持：

```text
backup
  ↓
新 Linux / 新 Termux
  ↓
install
  ↓
restore
  ↓
MCP3100 恢复
```

源码、配置、数据和密钥继续保持分离。

## 设计原则

1. 不因为增加平台破坏现有 Termux 部署。
2. MCP 核心尽量保持跨 Linux。
3. 平台相关代码放在安装层，不进入 MCP 核心。
4. ChatGPT/Tunnel 保持可选，不成为首次安装的强制依赖。
5. 不把 Token、API Key 等敏感信息提交到 GitHub。
6. 新版本升级应尽量保持现有配置和数据。
