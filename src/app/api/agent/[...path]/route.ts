import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// 只轉發 agent 公開的路由，避免被當成任意代理
const ALLOWED = [/^health$/, /^logs$/, /^projects\/[0-9a-fA-F-]{8,64}\/(chat|prd)$/];

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const base = process.env.AGENT_URL?.replace(/\/$/, "");
  const token = process.env.AGENT_TOKEN;
  if (!base || !token) {
    return json({ error: "平台尚未設定 AGENT_URL 與 AGENT_TOKEN", code: "not_configured" }, 503);
  }
  const path = (await ctx.params).path.join("/");
  if (!ALLOWED.some((re) => re.test(path))) return json({ error: "不支援的路徑" }, 404);

  const init: RequestInit = {
    method: req.method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  };
  if (req.method === "POST") init.body = (await req.text()).slice(0, 16 * 1024) || "{}";

  try {
    const res = await fetch(`${base}/${path}${req.nextUrl.search}`, init);
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      // 非 JSON（例如通道斷線時的 Cloudflare 錯誤頁）視為 agent 離線
      return json({ error: "agent 無回應", code: "offline" }, 502);
    }
    return json(data, res.status);
  } catch {
    return json({ error: "無法連線到 agent", code: "offline" }, 502);
  }
}

export const GET = forward;
export const POST = forward;
