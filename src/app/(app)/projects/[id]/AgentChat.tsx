"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { n: number; role: "user" | "assistant" | "system"; text: string; ts: string };
type LogLine = { n: number; ts: string; text: string };
type Conn = "checking" | "online" | "offline" | "not_configured";

const POLL_MS = 3000;
const MAX_LEN = 4000;

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; code?: string } }> {
  try {
    const res = await fetch(`/api/agent/${path}`, { cache: "no-store", ...init });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "網路錯誤", code: "offline" } as never };
  }
}

const btn = "rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const primary = `${btn} bg-neutral-900 text-white hover:bg-neutral-700`;
const secondary = `${btn} border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500`;

function Bubble({ m }: { m: Msg }) {
  if (m.role === "system") {
    return (
      <p className="mx-auto max-w-full rounded-full bg-neutral-100 px-3 py-1 text-center text-xs text-neutral-600 break-words [overflow-wrap:anywhere]">
        {m.text}
      </p>
    );
  }
  const mine = m.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${
          mine ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-neutral-50 text-neutral-900"
        }`}
      >
        {m.text}
      </div>
    </div>
  );
}

export function AgentChat({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [conn, setConn] = useState<Conn>("checking");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const last = useRef(0);
  const lastLog = useRef(0);
  const refreshed = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const pull = useCallback(async () => {
    const r = await call<{ messages: Msg[]; busy: boolean; done: boolean }>(`projects/${projectId}/chat?after=${last.current}`);
    if (!r.ok) {
      setConn(r.data.code === "not_configured" ? "not_configured" : "offline");
      return;
    }
    setConn("online");
    setBusy(!!r.data.busy);
    const fresh = r.data.messages ?? [];
    if (fresh.length) {
      last.current = Math.max(last.current, ...fresh.map((m) => m.n));
      setMsgs((prev) => [...prev, ...fresh.filter((m) => !prev.some((p) => p.n === m.n))]);
    }
    if (r.data.done) {
      setDone(true);
      // PRD 已寫入：重新載入頁面以顯示 PRD 與新狀態
      if (!refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
    }
  }, [projectId, router]);

  const pullLogs = useCallback(async () => {
    const r = await call<{ lines: LogLine[] }>(`logs?after=${lastLog.current}`);
    if (!r.ok) return;
    const fresh = r.data.lines ?? [];
    if (fresh.length) {
      lastLog.current = Math.max(...fresh.map((l) => l.n));
      setLogs((prev) => [...prev, ...fresh].slice(-300));
    }
  }, []);

  // 頁面可見時每 3 秒輪詢；切到背景就暫停
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      void pull();
      if (logOpen) void pullLogs();
    };
    const start = () => {
      if (timer || document.visibilityState !== "visible") return;
      tick();
      timer = setInterval(tick, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pull, pullLogs, logOpen]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const online = conn === "online";
  const canAct = online && !done;

  async function send() {
    const t = text.trim();
    if (!t || sending || busy || !canAct) return;
    setSending(true);
    setErr("");
    const r = await call<unknown>(`projects/${projectId}/chat`, { method: "POST", body: JSON.stringify({ text: t }) });
    setSending(false);
    if (r.ok) {
      setText("");
      setBusy(true);
      void pull();
    } else setErr(r.data.error ?? "送出失敗");
  }

  async function requestPrd() {
    if (sending || !canAct) return;
    setSending(true);
    setErr("");
    const r = await call<unknown>(`projects/${projectId}/prd`, { method: "POST", body: "{}" });
    setSending(false);
    if (r.ok) {
      setBusy(true);
      void pull();
    } else setErr(r.data.error ?? "要求失敗");
  }

  const badge =
    conn === "checking" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">檢查中…</span>
    ) : online ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        在線
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-900">
        <span className="size-1.5 rounded-full bg-red-500" />
        離線
      </span>
    );

  return (
    <section className="rounded-xl border border-neutral-300 bg-white p-6" aria-label="與 AI 討論">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-600">與 AI 討論</h2>
        <div className="flex items-center gap-2" aria-live="polite">
          {busy && online && <span className="text-xs text-neutral-600">Claude 思考中…</span>}
          {badge}
        </div>
      </div>

      {(conn === "offline" || conn === "not_configured") && (
        <div role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {conn === "not_configured" ? (
            <>平台尚未設定 AGENT_URL 與 AGENT_TOKEN，請見 agent/README.md。</>
          ) : (
            <>
              連不到本機 agent。<strong>請在你的電腦啟動 agent</strong>（<code className="break-all">node agent/index.mjs</code>
              ，並確認 Cloudflare Tunnel 仍在執行）。啟動後這裡會自動恢復，你也可以先閱讀下方的歷史對話。
            </>
          )}
        </div>
      )}

      <div ref={listRef} className="mt-4 max-h-[28rem] min-h-40 space-y-3 overflow-y-auto overflow-x-hidden rounded-lg bg-white" aria-label="對話內容">
        {msgs.length === 0 ? (
          <p className="text-sm text-neutral-600">
            {online ? "AI 正在讀取你的點子並準備第一輪問題，通常一分鐘內會出現…" : "目前沒有對話內容。"}
          </p>
        ) : (
          msgs.map((m) => <Bubble key={m.n} m={m} />)
        )}
      </div>

      {err && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {err}
        </p>
      )}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="sr-only">訊息</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                void send();
              }
            }}
            rows={3}
            maxLength={MAX_LEN}
            disabled={!canAct}
            placeholder={done ? "PRD 已產生，討論已結束" : online ? "回覆 AI 的問題…（Enter 送出，Shift+Enter 換行）" : "agent 離線中，暫時無法送出"}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-600 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10 disabled:bg-neutral-50"
          />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={requestPrd} disabled={!canAct || sending || busy} className={secondary}>
            產生 PRD
          </button>
          <button type="button" onClick={send} disabled={!canAct || sending || busy || !text.trim()} className={primary}>
            {sending ? "送出中…" : busy ? "AI 思考中…" : "送出"}
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          aria-expanded={logOpen}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          {logOpen ? "▾" : "▸"} Claude 即時 log
        </button>
        {logOpen && (
          <pre
            ref={logRef}
            className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-100 [overflow-wrap:anywhere]"
          >
            {logs.length ? logs.map((l) => `${l.ts.slice(11, 19)} ${l.text}`).join("\n") : online ? "尚無 log" : "agent 離線，無法取得 log"}
          </pre>
        )}
      </div>
    </section>
  );
}
