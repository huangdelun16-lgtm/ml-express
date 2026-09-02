#!/usr/bin/env node
/**
 * 三站 Web 唯一推荐发布入口：本机构建后上传到对应 Netlify 站点。
 * 禁止 --trigger（会按 GitHub main 重建并盖掉 CLI 生产包）。
 *
 *   node scripts/deploy-web.mjs admin|client|merchant
 *   或在各项目目录：npm run deploy:netlify
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sites = JSON.parse(readFileSync(join(root, "scripts/netlify-web-sites.json"), "utf8"));

const extra = process.argv.slice(2);
if (extra.includes("--trigger") || extra.includes("trigger")) {
  console.error(
    "禁止 netlify deploy --trigger：会按 GitHub main 重建，盖掉 Mac CLI 生产包。见 AI_GUIDE.md §15.3",
  );
  process.exit(2);
}

const key = extra.find((a) => !a.startsWith("-")) || "";
const site = sites[key];
if (!site) {
  console.error("用法: node scripts/deploy-web.mjs admin|client|merchant");
  process.exit(2);
}

const cwd = resolve(root, site.dir);
if (!existsSync(join(cwd, "package.json")) || !existsSync(join(cwd, "netlify.toml"))) {
  console.error(`目录不对：${cwd} 缺少 package.json 或 netlify.toml`);
  process.exit(2);
}

const env = { ...process.env, CI: "false" };
delete env.NETLIFY_AUTH_TOKEN;

console.log(`发布 ${site.name} → ${site.domain}`);
console.log(`目录 ${cwd}`);
console.log(`站点 ${site.id}`);
console.log("方式：本机 --prod --build 上传（不是 GitHub trigger）\n");

const result = spawnSync(
  "netlify",
  [
    "deploy",
    "--prod",
    "--build",
    "--context",
    "production",
    "--site",
    site.id,
    "--message",
    `CLI ${key} ${new Date().toISOString().slice(0, 16)}`,
  ],
  { cwd, env, stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
