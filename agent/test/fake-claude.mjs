#!/usr/bin/env node
// 假的 claude CLI：輸出貌似 --output-format stream-json 的事件，供本機測試。
// 用法：AGENT_CLAUDE_BIN=agent/test/fake-claude.mjs node agent/index.mjs
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const ri = args.indexOf("--resume");
const sessionId = ri >= 0 ? args[ri + 1] : randomUUID();
let input = "";
process.stdin.setEncoding("utf8");
for await (const c of process.stdin) input += c;

const out = (o) => process.stdout.write(`${JSON.stringify(o)}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.FAKE_CLAUDE_FAIL === "1" || /FAKE_FAIL/.test(input)) {
  process.stderr.write("fake claude: simulated failure\n");
  process.exit(1);
}

out({ type: "system", subtype: "init", session_id: sessionId, model: "fake-claude", tools: [] });
await sleep(400);
out({ type: "assistant", message: { role: "assistant", content: [{ type: "thinking", thinking: "..." }] }, session_id: sessionId });

const wantsPrd = ri >= 0 && /產生 PRD|滿意/.test(input);
let text;
if (wantsPrd) {
  text = `好的，以下是整理好的 PRD。\n<PRD>
# 測試專案

## 目標使用者
- 一人團隊的獨立開發者

## 核心功能
- 專案列表
- 與 AI 討論

## 使用流程
1. 新增點子
2. 與 AI 討論
3. 審閱 PRD

## 驗收標準
- [ ] 可新增專案
- [ ] 可看到 PRD

## 不做的事
- 多人協作

## 待確認問題
- 是否需要行動 App？
</PRD>`;
} else if (ri < 0) {
  text = "我理解你想做的是一個把點子變成產品的工具。先問幾個問題：\n1. 主要使用者是誰？\n2. 最核心的三個功能是什麼？\n3. 有沒有時程或平台限制？";
} else {
  text = "了解了。再確認：\n1. 使用者第一次進來會做什麼？\n2. 有哪些一定不做的事？\n（若已足夠，請說「我滿意了」，我會產生 PRD。）";
}
out({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Think", input: { note: "整理需求" } }] }, session_id: sessionId });
await sleep(300);
out({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] }, session_id: sessionId });
out({ type: "result", subtype: "success", is_error: false, duration_ms: 700, result: text, session_id: sessionId });
