#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# 轻量类型/契约检查：不引入 TypeScript 编译器，避免增加部署负担。
mapfile -t JS_FILES < <(find . -type f \( -name '*.js' -o -name '*.cjs' \) -not -path './node_modules/*' -not -path './.git/*' | sort)
for f in "${JS_FILES[@]}"; do
  node --check "$f" >/dev/null
done

node --input-type=module <<'NODE'
import fs from 'node:fs';
const files = fs.readdirSync('./tools').filter(f => f.endsWith('.js') && f !== 'index.js').sort();
for (const file of files) {
  const source = fs.readFileSync(`./tools/${file}`, 'utf8');
  if (!/module\.exports\s*=/.test(source)) throw new Error(`${file}: missing module.exports`);
  if (!/inputSchema\s*:/.test(source)) throw new Error(`${file}: missing inputSchema`);
  if (!/async\s+run\s*\(/.test(source)) throw new Error(`${file}: missing async run(args)`);
}
for (const file of fs.readdirSync('.').filter(f => f.endsWith('.json'))) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
}
console.log(`typecheck OK: JS/CJS syntax + ${files.length} tool contracts + JSON`);
NODE
