#!/usr/bin/env node
// 把 /shared/src 的共享模块复制到某个 app 的 _shared 目录。
//
// 用法：
//   node shared/sync.mjs --out <target_dir>        （从仓库根运行，如 admin）
//   node ../shared/sync.mjs --out <target_dir>     （从子 app 运行）
//
// 设计要点：
//   - 源目录基于本脚本自身位置解析，与运行时 cwd 无关；
//   - 目标目录相对 cwd（即各 app 自己的目录）解析；
//   - 复制结果带 AUTO-GENERATED 头注释，已提交到 git，
//     因此 Netlify / EAS 构建即使不跑本脚本也能拿到最新副本；
//   - 各 app 的 prestart/prebuild 钩子会运行本脚本，保证开发期始终最新。

import { fileURLToPath } from "node:url";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "src");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out.out = argv[++i];
  }
  return out;
}

const { out } = parseArgs(process.argv.slice(2));
if (!out) {
  console.error('[sync:shared] 缺少 --out <target_dir> 参数');
  process.exit(1);
}

const targetDir = resolve(process.cwd(), out);

const BANNER =
  "// ⚠️ AUTO-GENERATED from /shared/src — 请勿在此文件直接修改。\n" +
  '// 修改请编辑 /shared/src 下的源文件，并运行 "npm run sync:shared"。\n\n';

try {
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });

  const files = readdirSync(SRC_DIR).filter((f) => f.endsWith(".ts"));
  for (const file of files) {
    const content = readFileSync(join(SRC_DIR, file), "utf8");
    writeFileSync(join(targetDir, file), BANNER + content, "utf8");
  }
  console.log(
    `[sync:shared] 已同步 ${files.length} 个共享模块 → ${out}`,
  );
} catch (err) {
  console.error("[sync:shared] 同步失败:", err);
  process.exit(1);
}
