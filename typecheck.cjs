const fs = require("fs");
const { execFileSync } = require("child_process");
const root = __dirname;
const skip = new Set(["node_modules", ".git"]);
function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const p = `${dir}/${ent.name}`;
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && (p.endsWith(".js") || p.endsWith(".cjs"))) out.push(p);
  }
  return out;
}
const files = walk(root);
for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
for (const file of ["tools/container.js"]) {
  const source = fs.readFileSync(`${root}/${file}`, "utf8");
  for (const token of ["inputSchema", "async run(args)", "job_status", "job_output", "job_cancel"]) {
    if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
  }
}
for (const file of fs.readdirSync(root).filter(x => x.endsWith(".json"))) JSON.parse(fs.readFileSync(`${root}/${file}`, "utf8"));
console.log(`typecheck OK: ${files.length} JS/CJS files + tool contract + JSON`);
