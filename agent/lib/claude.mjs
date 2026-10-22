// 呼叫本機 `claude` CLI（使用已登入的訂閱）。
// 只使用 `claude --help` 驗證過的旗標；使用者文字一律走 stdin，不放進命令列，避免 Windows shell 引號問題與注入。
import { spawn, execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { log } from "./logbuf.mjs";

const DENY = "Bash,PowerShell,Edit,Write,NotebookEdit,Read,Glob,Grep,WebFetch,WebSearch,Task,Agent";
const MAX_LINE = 5 * 1024 * 1024;
const UUID = /^[0-9a-fA-F-]{8,64}$/;

const short = (s, n = 300) => {
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

function summarize(ev, state) {
  if (ev.type === "system" && ev.subtype === "init") {
    if (ev.session_id) state.sessionId = ev.session_id;
    log(`claude: 工作階段開始 ${ev.session_id ?? ""} model=${ev.model ?? "?"}`);
  } else if (ev.type === "assistant") {
    for (const c of ev.message?.content ?? []) {
      if (c.type === "text" && c.text) {
        state.lastText = c.text;
        log(`claude 回覆：${short(c.text)}`);
      } else if (c.type === "tool_use") log(`claude 使用工具 ${c.name} ${short(JSON.stringify(c.input ?? {}), 200)}`);
      else if (c.type === "thinking") log("claude 思考中…");
    }
  } else if (ev.type === "user") {
    for (const c of Array.isArray(ev.message?.content) ? ev.message.content : []) {
      if (c.type === "tool_result") log(`工具結果：${short(typeof c.content === "string" ? c.content : JSON.stringify(c.content), 200)}`);
    }
  } else if (ev.type === "result") {
    if (ev.session_id) state.sessionId = ev.session_id;
    state.result = ev;
    log(`claude 完成 (${ev.subtype ?? "?"}${ev.is_error ? ", 錯誤" : ""}) ${ev.duration_ms ?? ""}ms`);
  }
}

function killTree(child) {
  try {
    if (process.platform === "win32" && child.pid) execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
    else child.kill("SIGKILL");
  } catch {
    /* ignore */
  }
}

// 回傳 { text, sessionId }；失敗時 throw Error（訊息可直接寫進聊天室）
export function runClaude(cfg, { cwd, prompt, sessionId }) {
  mkdirSync(cwd, { recursive: true });
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk", "--disallowedTools", DENY, "--strict-mcp-config", "--setting-sources", "project", "--disable-slash-commands"];
  if (sessionId) {
    if (!UUID.test(sessionId)) return Promise.reject(new Error("session_id 格式不正確"));
    args.push("--resume", sessionId);
  }
  const isScript = /\.(mjs|js)$/i.test(cfg.claudeBin);
  const cmd = isScript ? process.execPath : cfg.claudeBin;
  const full = isScript ? [path.resolve(cfg.claudeBin), ...args] : args;
  log(`執行 claude ${sessionId ? `--resume ${sessionId}` : "（新對話）"}`);

  return new Promise((resolve, reject) => {
    // Windows 上 claude 是 claude.cmd，必須透過 shell 啟動；參數皆為固定安全字串
    const child = spawn(cmd, full, { cwd, shell: !isScript && process.platform === "win32", windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    const state = { sessionId: sessionId ?? null, lastText: "", result: null };
    let buf = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      killTree(child);
      finish(new Error(`Claude 執行逾時（${Math.round(cfg.claudeTimeoutMs / 1000)} 秒），已中止`));
    }, cfg.claudeTimeoutMs);

    function finish(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) return reject(err);
      const r = state.result;
      const text = (typeof r?.result === "string" && r.result) || state.lastText;
      if (r?.is_error || !text) {
        return reject(new Error(`Claude 沒有產生回覆：${short(r?.result || stderr || "未知原因", 300)}`));
      }
      resolve({ text, sessionId: state.sessionId });
    }

    const onLine = (line) => {
      if (!line.trim()) return;
      try {
        summarize(JSON.parse(line), state);
      } catch {
        log(`claude 輸出：${short(line, 200)}`);
      }
    };
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d) => {
      buf += d;
      if (buf.length > MAX_LINE && !buf.includes("\n")) {
        log("claude 輸出單行過長，已丟棄");
        buf = "";
      }
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        onLine(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (d) => {
      stderr = (stderr + d).slice(-4000);
      log(`claude stderr：${short(d, 300)}`);
    });
    child.on("error", (e) =>
      finish(new Error(e.code === "ENOENT" ? "找不到 claude 指令，請先執行 npm install -g @anthropic-ai/claude-code 並登入" : `無法啟動 claude：${e.message}`)),
    );
    child.on("close", (code) => {
      if (buf.trim()) onLine(buf);
      if (!state.result && code !== 0) {
        return finish(new Error(`claude 異常結束（代碼 ${code}）：${short(stderr || "無輸出，可能尚未登入，請在終端機執行 claude 完成登入", 300)}`));
      }
      finish();
    });
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });
}
