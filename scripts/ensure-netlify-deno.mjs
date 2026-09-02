#!/usr/bin/env node
/**
 * Windows / 缅甸网络下，Netlify CLI 打包 Admin Edge Function 会去拉
 * https://dl.deno.land，常报 fetch failed。
 * 本脚本把 Deno 2.4.2（当前 netlify-cli edge-bundler 要求 ^2.4.2）写进本机缓存。
 * 生产 eszip 用的是 CLI 自带的 vendor，不依赖 edge.netlify.com bootstrap。
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

export const DENO_VERSION = "2.4.2";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const toolsDir = join(root, ".tools");
const denoToolsDir = join(toolsDir, "deno");

function denoFileName() {
  return process.platform === "win32" ? "deno.exe" : "deno";
}

function denoZipName() {
  if (process.platform === "win32") return "deno-x86_64-pc-windows-msvc.zip";
  if (process.platform === "darwin") {
    return process.arch === "arm64"
      ? "deno-aarch64-apple-darwin.zip"
      : "deno-x86_64-apple-darwin.zip";
  }
  return "deno-x86_64-unknown-linux-gnu.zip";
}

function netlifyDenoCacheDirs() {
  const dirs = [];
  if (process.platform === "win32" && process.env.APPDATA) {
    dirs.push(join(process.env.APPDATA, "netlify", "Config", "deno-cli"));
    dirs.push(join(process.env.APPDATA, "netlify", "deno-cli"));
  } else {
    dirs.push(join(homedir(), ".config", "netlify", "deno-cli"));
    dirs.push(join(homedir(), "Library", "Preferences", "netlify", "deno-cli"));
  }
  return dirs;
}

function readDenoVersion(bin) {
  if (!existsSync(bin)) return "";
  const result = spawnSync(bin, ["--version"], { encoding: "utf8" });
  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  const match = text.match(/^deno\s+([\d.]+)/m);
  return match ? match[1] : "";
}

async function downloadToFile(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${url}`);
  }
  mkdirSync(dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function downloadFirstOk(urls, dest) {
  let lastError = null;
  for (const url of urls) {
    try {
      console.log(`下载 ${url}`);
      await downloadToFile(url, dest);
      return url;
    } catch (error) {
      lastError = error;
      console.warn(`失败：${error instanceof Error ? error.message : error}`);
    }
  }
  throw lastError || new Error("没有可用下载源");
}

function extractZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", destDir], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "解压失败");
  }
}

function installDenoBinary(srcBin) {
  const name = denoFileName();
  const dests = [join(denoToolsDir, name), ...netlifyDenoCacheDirs().map((dir) => join(dir, name))];
  for (const dest of dests) {
    mkdirSync(dirname(dest), { recursive: true });
    if (srcBin !== dest) copyFileSync(srcBin, dest);
    try {
      chmodSync(dest, 0o755);
    } catch {
      // Windows 无 chmod
    }
    writeFileSync(join(dirname(dest), "version.txt"), DENO_VERSION);
  }
}

async function ensureDenoBinary() {
  const name = denoFileName();
  const localBin = join(denoToolsDir, name);
  if (readDenoVersion(localBin) === DENO_VERSION) {
    installDenoBinary(localBin);
    return localBin;
  }

  for (const cacheDir of netlifyDenoCacheDirs()) {
    const cached = join(cacheDir, name);
    if (readDenoVersion(cached) === DENO_VERSION) {
      mkdirSync(denoToolsDir, { recursive: true });
      copyFileSync(cached, localBin);
      installDenoBinary(localBin);
      return localBin;
    }
  }

  const zipName = denoZipName();
  const zipPath = join(toolsDir, zipName);
  const urls = [
    `https://cdn.npmmirror.com/binaries/deno/v${DENO_VERSION}/${zipName}`,
    `https://npmmirror.com/mirrors/deno/v${DENO_VERSION}/${zipName}`,
    `https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/${zipName}`,
    `https://dl.deno.land/release/v${DENO_VERSION}/${zipName}`,
  ];
  await downloadFirstOk(urls, zipPath);
  extractZip(zipPath, denoToolsDir);
  const bin = join(denoToolsDir, name);
  if (readDenoVersion(bin) !== DENO_VERSION) {
    throw new Error(`解压后 Deno 版本不对：${readDenoVersion(bin) || "未知"}`);
  }
  installDenoBinary(bin);
  return bin;
}

export async function ensureNetlifyDeno() {
  const denoBin = await ensureDenoBinary();
  return { denoBin, denoDir: dirname(denoBin) };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const result = await ensureNetlifyDeno();
  console.log(`Deno ${DENO_VERSION} → ${result.denoBin}`);
}
