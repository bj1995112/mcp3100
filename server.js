/**
 * termux-mcp-std — 标准 MCP Streamable HTTP 服务器（独立框架）
 * -------------------------------------------------------------
 * - 端口 3100（默认），Bearer 鉴权
 * - 官方 @modelcontextprotocol/sdk：WebStandardStreamableHTTPServerTransport
 * - Session 模式：每 session 独立 McpServer + transport（Mcp-Session-Id 关联）
 * - 工具 inputSchema：JSON Schema → zod raw shape 转换（SDK 1.30 要求）
 * - 与现有 3000 端口框架完全隔离：不碰 src/、不重启 mcp-http
 */
import fs from "node:fs";
import crypto from "node:crypto";
import http from "node:http";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import tools from "./tools/index.js";

// ---- 简易 .env 加载（可选）----
try {
  const txt = fs.readFileSync(new URL("./.env", import.meta.url), "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {}

const PORT = Number(process.env.STD_PORT || 3100);
const TOKEN = process.env.STD_AUTH_TOKEN || "bj1995112@.";

process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e?.stack || e));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e?.stack || e));

// ---- JSON Schema → zod（SDK 1.30 registerTool 要求 zod raw shape）----
function jsonSchemaToZod(s) {
  const type = s?.type || "string";
  let zt;
  switch (type) {
    case "number": zt = z.number(); break;
    case "integer": zt = z.number().int(); break;
    case "boolean": zt = z.boolean(); break;
    case "array": zt = z.array(jsonSchemaToZod(s.items || {})); break;
    case "object": zt = z.object(jsonSchemaToZodShape(s)); break;
    default: zt = z.string();
  }
  if (s?.description) zt = zt.describe(s.description);
  return zt;
}

function jsonSchemaToZodShape(schema) {
  const shape = {};
  const required = new Set(schema?.required || []);
  for (const [key, prop] of Object.entries(schema?.properties || {})) {
    let zt = jsonSchemaToZod(prop);
    if (!required.has(key)) zt = zt.optional();
    shape[key] = zt;
  }
  return shape;
}

// ---- 会话表：sessionId -> { server, transport } ----
const sessions = new Map();

function createMcpServer() {
  const s = new McpServer(
    { name: "termux-mcp-std", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  for (const tool of tools) {
    s.registerTool(
      tool.name,
      {
        description: tool.description || "",
        inputSchema: jsonSchemaToZodShape(tool.inputSchema)
      },
      async (args) => {
        const text = await tool.run(args || {});
        return { content: [{ type: "text", text: String(text) }] };
      }
    );
  }
  return s;
}

/** 按 Mcp-Session-Id 取或建会话 */
async function getSession(sessionId) {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  let entry;
  const s = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (sid) => {
      sessions.set(sid, entry);
    },
    onerror: (e) => console.error("[transport onerror]", e?.stack || e)
  });
  await s.connect(transport);
  entry = { server: s, transport };
  if (sessionId) sessions.set(sessionId, entry);
  return entry;
}

function readBodyBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** 把 web Response 流式写回 Node res（支持 SSE 长连接） */
async function writeWebResponse(nodeRes, webRes) {
  nodeRes.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
  if (webRes.body) {
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      nodeRes.write(Buffer.from(value));
    }
  }
  nodeRes.end();
}

const httpServer = http.createServer(async (nodeReq, nodeRes) => {
  try {

    // ---- OAuth 元数据端点（tunnel-client probe 需要；公开端点，无需 Bearer）----
    if (nodeReq.method === "GET" && (nodeReq.url === "/.well-known/oauth-protected-resource/mcp" || nodeReq.url === "/.well-known/oauth-protected-resource")) {
      nodeRes.writeHead(200, { "Content-Type": "application/json" });
      nodeRes.end(JSON.stringify({
        resource: `http://127.0.0.1:${PORT}/mcp`,
        authorization_servers: [`http://127.0.0.1:${PORT}`]
      }));
      return;
    }
    if (nodeReq.method === "GET" && nodeReq.url === "/.well-known/oauth-authorization-server") {
      nodeRes.writeHead(200, { "Content-Type": "application/json" });
      nodeRes.end(JSON.stringify({
        issuer: `http://127.0.0.1:${PORT}`,
        authorization_endpoint: `http://127.0.0.1:${PORT}/oauth/authorize`,
        token_endpoint: `http://127.0.0.1:${PORT}/oauth/token`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        token_endpoint_auth_methods_supported: ["none"],
        code_challenge_methods_supported: ["S256"]
      }));
      return;
    }

    if (nodeReq.method === "GET" && nodeReq.url === "/") {
      nodeRes.writeHead(200, { "Content-Type": "application/json" });
      nodeRes.end(JSON.stringify({ name: "termux-mcp-std", status: "running", port: PORT }));
      return;
    }

    if ((nodeReq.headers.authorization || "") !== `Bearer ${TOKEN}`) {
      nodeRes.writeHead(401, { "Content-Type": "application/json" });
      nodeRes.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Unauthorized" } }));
      return;
    }

    if (nodeReq.url !== "/mcp") {
      nodeRes.writeHead(404, { "Content-Type": "application/json" });
      nodeRes.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: "Not found" } }));
      return;
    }

    const url = new URL(nodeReq.url, `http://${nodeReq.headers.host || `127.0.0.1:${PORT}`}`);
    const sessionId = nodeReq.headers["mcp-session-id"];
    const entry = await getSession(sessionId);

    let webReq;
    if (nodeReq.method === "POST") {
      const buf = await readBodyBuffer(nodeReq);
      webReq = new Request(url, {
        method: "POST",
        headers: nodeReq.headers,
        body: buf.length ? new Uint8Array(buf) : undefined
      });
    } else if (nodeReq.method === "GET" || nodeReq.method === "DELETE") {
      webReq = new Request(url, { method: nodeReq.method, headers: nodeReq.headers });
    } else {
      nodeRes.writeHead(405, { "Content-Type": "application/json" });
      nodeRes.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "Method not allowed" } }));
      return;
    }

    const webRes = await entry.transport.handleRequest(webReq, {});
    await writeWebResponse(nodeRes, webRes);
  } catch (e) {
    console.error("[mcp-std] request error:", e?.stack || e);
    if (!nodeRes.headersSent) {
      nodeRes.writeHead(500, { "Content-Type": "application/json" });
      nodeRes.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: String(e) } }));
    } else {
      nodeRes.end();
    }
  }
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`[mcp-std] listening on http://127.0.0.1:${PORT}/mcp (token auth: on, session mode)`);
});
