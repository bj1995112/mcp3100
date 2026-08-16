# ChatGPT 连接配置说明

MCP3100 第一次部署不需要填写 ChatGPT 连接数据。

当前核心服务先独立运行：

- MCP 地址：`http://127.0.0.1:3100/mcp`
- 服务名：`termux-mcp-std`
- 本地端口：`3100`
- 鉴权：Bearer Token

## 后续接入 ChatGPT / Tunnel 时

需要根据届时实际使用的连接方案准备：

1. Tunnel / 控制平面的 Tunnel ID（如果采用 Tunnel 方案）
2. 对应的 API Key / 凭据
3. MCP Server URL
4. MCP 的 Bearer Authorization Token
5. 如果连接方案要求 OAuth，再填写对应 OAuth 参数

## 安全要求

- 真实 Token、API Key 不提交 GitHub。
- `.env` 已加入 `.gitignore`。
- `.env.example` 只保留变量名称和说明。
- 第一次安装可以完全不配置 ChatGPT。

## 当前项目设计

ChatGPT/Tunnel 是可选依赖，不影响 MCP3100 核心服务的安装、启动和健康检查。
