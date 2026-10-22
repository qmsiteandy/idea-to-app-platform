import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const AGENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 極簡 .env 解析（不覆蓋已存在的環境變數）
export function loadEnv(file = path.join(AGENT_DIR, ".env")) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of raw.replace(/^﻿/, "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

export function getConfig() {
  const e = process.env;
  const fake = e.AGENT_FAKE_NOTION === "1";
  const cfg = {
    fake,
    notionToken: e.NOTION_TOKEN || "",
    dataSourceId: e.NOTION_PROJECTS_DATA_SOURCE_ID || "",
    notifyUserId: e.NOTION_NOTIFY_USER_ID || "",
    appUrl: (e.APP_URL || "").replace(/\/$/, ""),
    token: e.AGENT_TOKEN || "",
    port: Number(e.PORT) || 8787,
    workdir: path.resolve(e.WORKDIR || path.join(AGENT_DIR, ".workdir")),
    stateDir: path.resolve(e.AGENT_STATE_DIR || path.join(AGENT_DIR, ".state")),
    claudeBin: e.AGENT_CLAUDE_BIN || "claude",
    pollMs: Number(e.AGENT_POLL_MS) || 10000,
    claudeTimeoutMs: Number(e.AGENT_CLAUDE_TIMEOUT_MS) || 10 * 60 * 1000,
  };
  const missing = [];
  if (!cfg.token) missing.push("AGENT_TOKEN");
  else if (cfg.token.length < 24) missing.push("AGENT_TOKEN（長度至少 24 字元，請用長隨機字串）");
  if (!fake) {
    if (!cfg.notionToken) missing.push("NOTION_TOKEN");
    if (!cfg.dataSourceId) missing.push("NOTION_PROJECTS_DATA_SOURCE_ID");
  }
  return { cfg, missing };
}
