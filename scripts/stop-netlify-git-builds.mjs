#!/usr/bin/env node
/**
 * 关掉三站 Web 的 GitHub 自动 / Trigger 构建，避免 main 旧提交盖掉 CLI 生产包。
 * 本机 `netlify deploy --prod` 上传不受影响。Token 只从本机 Netlify CLI 配置读取，不入库。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const sites = JSON.parse(readFileSync(join(root, "netlify-web-sites.json"), "utf8"));

function readCliToken() {
  if (process.env.NETLIFY_AUTH_TOKEN && !process.env.NETLIFY_AUTH_TOKEN.startsWith("nfc_")) {
    // 过期的环境变量曾导致 Unauthorized；优先用 CLI 登录态
  }
  const candidates = [
    join(process.env.APPDATA || "", "netlify", "Config", "config.json"),
    join(homedir(), ".netlify", "config.json"),
    join(homedir(), ".config", "netlify", "config.json"),
  ];
  for (const p of candidates) {
    try {
      const cfg = JSON.parse(readFileSync(p, "utf8"));
      const users = cfg.users || {};
      const preferred = cfg.userId && users[cfg.userId]?.auth?.token;
      if (preferred) return preferred;
      for (const u of Object.values(users)) {
        if (u?.auth?.token) return u.auth.token;
      }
    } catch {
      // next
    }
  }
  throw new Error("找不到 Netlify CLI 登录态，请先 netlify login");
}

const token = readCliToken();

async function api(method, path, body) {
  const res = await fetch(`https://api.netlify.com/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function updateStopBuilds(site) {
  const current = await api("GET", `/sites/${site.id}`);
  if (current.build_settings?.stop_builds === true) return true;
  const { env: _ignoreEnv, ...buildSettings } = current.build_settings || {};
  const updated = await api("PUT", `/sites/${site.id}`, {
    build_settings: { ...buildSettings, stop_builds: true },
  });
  return updated.build_settings?.stop_builds === true;
}

let failed = false;
for (const [key, site] of Object.entries(sites)) {
  try {
    const ok = await updateStopBuilds(site);
    console.log(`[${key}] ${site.name}: stop_builds=${ok ? "true" : "false"} ${ok ? "OK" : "FAILED"}`);
    if (!ok) failed = true;
  } catch (e) {
    console.error(`[${key}] ${site.name}: ${e.message}`);
    failed = true;
  }
}
if (failed) process.exit(1);
