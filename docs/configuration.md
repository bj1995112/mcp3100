# MCP3100 配置说明

## MCP 地址

默认地址：

`http://127.0.0.1:3100/mcp`

## Bearer 鉴权

MCP3100 默认开启 Bearer Token 鉴权。

首次运行 `./install.sh` 时会自动生成随机 Token，并在安装完成时显示。Token 保存在本机 `.env`，不会提交到 GitHub。

查看当前 Token：

```bash
./scripts/show-token.sh
```

重置 Token：

```bash
./scripts/reset-token.sh
```

重置后需要让外部 MCP 客户端使用新的 Token。

## 外部连接

请求需要携带：

```text
Authorization: Bearer <你的Token>
```

ChatGPT / Tunnel 的其他配置第一次安装不要求填写，参见 `docs/chatgpt-connection.md`。
