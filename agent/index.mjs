#!/usr/bin/env node
// 常駐 agent：輪詢 Notion 的「討論中」專案，用本機 Claude Code 與使用者討論，並產生 PRD。
import { loadEnv, getConfig } from "./lib/env.mjs";
import { log } from "./lib/logbuf.mjs";
import { makeNotion } from "./lib/notion.mjs";
import { makeStore } from "./lib/store.mjs";
import { runClaude } from "./lib/claude.mjs";
import { makeServer } from "./lib/server.mjs";
import { firstTurn, FINALIZE } from "./lib/prompts.mjs";
import path from "node:path";

loadEnv();
const { cfg, missing } = getConfig();
if (missing.length) {
  console.error(`缺少設定：${missing.join(", ")}。請參考 agent/.env.example 建立 agent/.env`);
  process.exit(1);
}

const notion = makeNotion(cfg);
const store = makeStore(cfg.stateDir);
const errMsg = (e) => (e instanceof Error ? e.message : String(e));

// ---- 單一 Claude 佇列 ----
const queue = [];
let running = null;
let stopping = false;
const busy = () => !!running || queue.length > 0;

function enqueue(job) {
  if (job.kind === "chat") {
    // 聊天訊息絕不丟棄：同一專案已在排隊、尚未開始的訊息合併成一次 Claude 呼叫
    const pending = queue.find((j) => j.id === job.id && j.kind === "chat");
    if (pending) {
      pending.text += `\n\n${job.text}`;
      return true;
    }
  } else if (queue.some((j) => j.id === job.id && j.kind === job.kind) || (running?.id === job.id && running.kind === job.kind)) {
    return false;
  }
  queue.push(job);
  pump();
  return true;
}

async function pump() {
  if (running || stopping) return;
  const job = queue.shift();
  if (!job) return;
  running = job;
  try {
    await handle(job);
  } catch (e) {
    log(`任務失敗（${job.kind} ${job.id}）：${errMsg(e)}`);
    try {
      const s = await store.load(job.id);
      if (s) await store.add(s, "system", `發生錯誤：${errMsg(e)}`);
    } catch {
      /* ignore */
    }
  } finally {
    running = null;
    setImmediate(pump);
  }
}

async function handle(job) {
  const s = await store.load(job.id);
  if (!s) return;
  const cwd = path.join(cfg.workdir, s.id);
  const prompt = job.kind === "start" ? firstTurn(s.name, s.idea) : job.kind === "prd" ? FINALIZE : job.text;
  const { text, sessionId } = await runClaude(cfg, { cwd, prompt, sessionId: job.kind === "start" ? null : s.sessionId });
  s.sessionId = sessionId ?? s.sessionId;

  // 只有「同時有 <PRD> 與 </PRD>，且結尾標籤是回覆的最後內容」才視為 PRD
  const trimmed = text.trimEnd();
  const open = trimmed.lastIndexOf("<PRD>");
  const m = open >= 0 && /<\/PRD>$/i.test(trimmed) ? { 1: trimmed.slice(open + 5, -6), 0: trimmed.slice(open) } : null;
  if (m) {
    const visible = trimmed.slice(0, open).trim();
    await store.add(s, "assistant", `${visible ? `${visible}\n\n` : ""}（PRD 已整理完成，正在寫入 Notion…）`);
    await finalizePrd(s, m[1].trim());
    return;
  }
  await store.add(s, "assistant", text);
  if (job.kind === "start" && !s.notified) {
    s.notified = true;
    await store.save(s);
    await notion.comment(s.id, "AI 想先跟你討論幾個問題。").catch((e) => log(`Notion 留言失敗：${errMsg(e)}`));
  }
  if (job.kind === "prd") await store.add(s, "system", "Claude 沒有輸出 PRD 內容，請再按一次「產生 PRD」或回覆「請直接產生 PRD」。");
}

async function finalizePrd(s, md) {
  try {
    const n = await notion.writePrd(s.id, md);
    s.done = true;
    await store.save(s);
    await store.add(s, "system", `PRD 已寫入 Notion（${n} 個區塊），狀態改為「PRD 待審」。`);
    log(`PRD 已寫入 ${s.id}`);
  } catch (e) {
    log(`PRD 寫入失敗 ${s.id}：${errMsg(e)}`);
    await store.add(s, "system", `PRD 寫入 Notion 失敗：${errMsg(e)}。可再按一次「產生 PRD」重試。`);
    return; // 已通知使用者，不要再丟出去造成重複訊息
  }
  await notion.comment(s.id, "PRD 已產生，請審閱。").catch((e) => log(`Notion 留言失敗：${errMsg(e)}`));
}

// ---- 輪詢 Notion ----
let polling = false;
async function poll() {
  if (polling || stopping) return;
  polling = true;
  try {
    for (const p of await notion.listDiscussing()) {
      if (await store.load(p.id)) continue;
      if (await notion.hasBody(p.id)) continue; // 已有內容（可能已有 PRD），不介入
      await store.create(p);
      log(`發現新專案「${p.name}」，開始討論`);
      enqueue({ kind: "start", id: p.id });
    }
  } catch (e) {
    log(`輪詢 Notion 失敗：${errMsg(e)}`);
  } finally {
    polling = false;
  }
}

// 平台直接開啟聊天室時，若專案尚無對話就建立
async function ensure(id) {
  let s = await store.load(id);
  if (s) return s;
  const p = await notion.getProject(id).catch((e) => {
    log(`讀取專案失敗：${errMsg(e)}`);
    return null;
  });
  if (!p || p.status !== "討論中") return null;
  s = await store.create(p);
  enqueue({ kind: "start", id });
  return s;
}

// 第一輪尚未完成：若沒有進行中的 start（先前失敗），重新排入
async function notReady(s) {
  const pending = queue.some((j) => j.id === s.id && j.kind === "start") || (running?.id === s.id && running.kind === "start");
  if (!pending) {
    enqueue({ kind: "start", id: s.id });
    throw Object.assign(new Error("第一輪討論先前失敗，已重新啟動，請稍候"), { status: 409 });
  }
  throw Object.assign(new Error("Claude 還在準備第一輪問題，請稍候"), { status: 409 });
}

const app = {
  busy,
  async chat(id, after) {
    const s = await ensure(id);
    if (!s) return { messages: [], busy: busy(), done: false, exists: false };
    return { messages: s.messages.filter((m) => m.n > after), busy: busy(), done: s.done, exists: true };
  },
  async postChat(id, text) {
    const s = await ensure(id);
    if (!s) throw Object.assign(new Error("找不到討論中的專案"), { status: 404 });
    if (s.done) throw Object.assign(new Error("PRD 已產生，討論已結束"), { status: 409 });
    if (!s.sessionId) await notReady(s);
    const m = await store.add(s, "user", text);
    enqueue({ kind: "chat", id, text });
    return { ok: true, message: m, busy: true };
  },
  async requestPrd(id) {
    const s = await ensure(id);
    if (!s) throw Object.assign(new Error("找不到討論中的專案"), { status: 404 });
    if (s.done) throw Object.assign(new Error("PRD 已產生"), { status: 409 });
    if (!s.sessionId) await notReady(s);
    await store.add(s, "system", "已要求 Claude 產生 PRD…");
    enqueue({ kind: "prd", id });
    return { ok: true, busy: true };
  },
};

// 重啟後把「已開始但還沒有 session（被中斷）」的對話重新排入
async function resume() {
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(cfg.stateDir).catch(() => []);
  for (const f of files.filter((x) => x.endsWith(".json"))) {
    const s = await store.load(f.slice(0, -5));
    if (s && !s.done && !s.sessionId) enqueue({ kind: "start", id: s.id });
  }
}

const server = makeServer(cfg, app);
server.on("error", (e) => {
  console.error(`HTTP 伺服器錯誤：${e.message}`);
  process.exit(1);
});
server.listen(cfg.port, "127.0.0.1", () => {
  log(`agent 啟動，監聽 http://127.0.0.1:${cfg.port}${cfg.fake ? "（AGENT_FAKE_NOTION 測試模式）" : ""}`);
});

await resume();
poll();
const timer = setInterval(poll, cfg.pollMs);

function shutdown(sig) {
  if (stopping) process.exit(0);
  stopping = true;
  log(`收到 ${sig}，關閉中…`);
  clearInterval(timer);
  server.close();
  setTimeout(() => process.exit(0), 500).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (e) => log(`未處理的錯誤：${errMsg(e)}`));
process.on("uncaughtException", (e) => log(`未捕捉的例外：${errMsg(e)}`));
