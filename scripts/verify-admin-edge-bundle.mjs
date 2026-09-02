#!/usr/bin/env node
/** 只打包 Admin Edge（不发生产），用来验证 Windows Deno 缓存是否可用。 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { ensureNetlifyDeno } from "./ensure-netlify-deno.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deno = await ensureNetlifyDeno();
process.env.PATH = `${deno.denoDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH || ""}`;

const npmRoot = join(root, "node_modules", "netlify-cli", "node_modules");
const bundlerPath = join(npmRoot, "@netlify", "edge-bundler", "dist", "node", "index.js");
const { bundle } = await import(pathToFileURL(bundlerPath).href);
const dist = mkdtempSync(join(tmpdir(), "ml-edge-"));
try {
  const result = await bundle(
    [join(root, "netlify", "edge-functions")],
    dist,
    [{ function: "supabase-bff", path: "/__sb/*" }],
    { basePath: root },
  );
  const routes = result?.manifest?.routes || result?.functions || result;
  console.log("Edge 打包成功");
  console.log(JSON.stringify(routes, null, 2).slice(0, 1500));
} finally {
  rmSync(dist, { recursive: true, force: true });
}
