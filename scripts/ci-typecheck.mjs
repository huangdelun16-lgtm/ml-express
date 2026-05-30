#!/usr/bin/env node
// 基线门禁式类型检查：在某个项目目录跑 `tsc --noEmit`，统计 error 数，
// 与 scripts/typecheck-baselines.json 中的基线比较。
//   - 错误数 > 基线 → 退出码 1（CI 失败），用于挡住「新增」的类型错误。
//   - 错误数 < 基线 → 提示可下调基线（修了历史错误后）。
//
// 用法：node scripts/ci-typecheck.mjs <projectDir>
//   <projectDir> 相对仓库根，例如 "." / "ml-express-client-web"。

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const project = process.argv[2];
if (!project) {
  console.error("usage: node scripts/ci-typecheck.mjs <projectDir>");
  process.exit(2);
}

const baselines = JSON.parse(
  readFileSync(join(__dirname, "typecheck-baselines.json"), "utf8"),
);
const baseline = Number.isFinite(baselines[project]) ? baselines[project] : 0;
const cwd = resolve(process.cwd(), project);

let output = "";
try {
  output = execSync("npx tsc --noEmit", {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  output = `${e.stdout || ""}${e.stderr || ""}`;
}

const count = (output.match(/error TS\d+/g) || []).length;
console.log(`[typecheck] ${project}: ${count} error(s) (baseline ${baseline})`);

if (count > baseline) {
  console.log("\n--- tsc output ---\n" + output);
  console.error(
    `\n❌ ${project}: 类型错误数 ${count} 超过基线 ${baseline}。\n` +
      `   请修复新增错误；若你确实减少了历史错误，请同步更新 scripts/typecheck-baselines.json。`,
  );
  process.exit(1);
}

if (count < baseline) {
  console.log(
    `✅ ${project}: 低于基线（${count} < ${baseline}）。建议把基线下调到 ${count}。`,
  );
} else {
  console.log(`✅ ${project}: 通过（与基线持平）。`);
}
