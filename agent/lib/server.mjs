import http from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { logsAfter } from "./logbuf.mjs";
import { validId } from "./store.mjs";

const digest = (s) => createHash("sha256").update(s).digest();

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(data);
}

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        if (size - c.length <= limit) reject(Object.assign(new Error("請求內容過大"), { status: 413 }));
        chunks.length = 0; // 先回應 413，其餘內容丟棄（不先斷線，客戶端才收得到 413）
      } else if (size <= limit) chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// app 需提供：busy()、chat(id, after)、postChat(id, text)、requestPrd(id)
export function makeServer(cfg, app) {
  const expected = digest(cfg.token);
  return http.createServer(async (req, res) => {
    try {
      const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
      if (!m || !timingSafeEqual(digest(m[1]), expected)) return send(res, 401, { error: "未授權" });

      const url = new URL(req.url ?? "/", "http://localhost");
      const p = url.pathname.replace(/\/+$/, "") || "/";
      const after = Math.max(0, parseInt(url.searchParams.get("after") ?? "0", 10) || 0);

      if (req.method === "GET" && p === "/health") return send(res, 200, { ok: true, busy: app.busy() });
      if (req.method === "GET" && p === "/logs") return send(res, 200, { lines: logsAfter(after), busy: app.busy() });

      const r = /^\/projects\/([^/]+)\/(chat|prd)$/.exec(p);
      if (r) {
        const [, id, kind] = r;
        if (!validId(id)) return send(res, 400, { error: "專案 id 格式不正確" });
        if (req.method === "GET" && kind === "chat") return send(res, 200, await app.chat(id, after));
        if (req.method === "POST" && kind === "chat") {
          let body;
          try {
            body = JSON.parse((await readBody(req)) || "{}");
          } catch (e) {
            if (e.status) throw e;
            return send(res, 400, { error: "JSON 格式錯誤" });
          }
          const text = typeof body.text === "string" ? body.text.trim() : "";
          if (!text) return send(res, 400, { error: "訊息不可為空" });
          if (text.length > 4000) return send(res, 400, { error: "訊息過長（上限 4000 字）" });
          return send(res, 200, await app.postChat(id, text));
        }
        if (req.method === "POST" && kind === "prd") {
          await readBody(req).catch(() => "");
          return send(res, 200, await app.requestPrd(id));
        }
      }
      send(res, 404, { error: "找不到" });
    } catch (e) {
      if (e.status === 413) res.setHeader("Connection", "close");
      send(res, e.status ?? 500, { error: e.status ? e.message : "agent 內部錯誤" });
    }
  });
}
