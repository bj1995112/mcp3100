#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

# 轻量预检：不引入 TypeScript 编译器，适合 Termux/Android。
# 1. Node 解析所有 JS；2. 检查工具契约；3. 校验根目录 JSON。
mapfile -t JS_FILES < <(find . -type f -name '*.js' -not -path './node_modules/*' -not -path './.git/*' | sort)
for f in "${JS_FILES[@]}"; do
  node --check "$f" >/dev/null
done
node --input-type=module <<'NODE'
import fs from 'node:fs';
const tools = [
  './tools/shell.js','./tools/file.js','./tools/python.js','./tools/pm2.js',
  './tools/git.js','./tools/search.js','./tools/container.js','./tools/network.js',
  './tools/system.js','./tools/process.js','./tools/logs.js','./tools/env.js','./tools/health.js'
];
for (const file of tools) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/module\\.exports\\s*=/.test(source)) throw new Error(`${file}: missing module.exports`);
  if (!/inputSchema\\s*:/.test(source)) throw new Error(`${file}: missing inputSchema`);
  if (!/async\\s+run\\s*\\(/.test(source)) throw new Error(`${file}: missing async run(args)`);
}
for (const file of fs.readdirSync('.').filter(x => x.endsWith('.json'))) JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`typecheck OK: ${JS_FILES.length} JS files + tool contracts + JSON`);
NODE
