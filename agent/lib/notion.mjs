// 直接用 fetch 呼叫 Notion API（不需 npm install）。AGENT_FAKE_NOTION=1 時改用本機假資料。
import { markdownToBlocks, richText } from "../../scripts/markdown.mjs";
import { makeFakeNotion } from "./fake-notion.mjs";

const VERSION = "2025-09-03";
const plain = (prop) => (prop?.title ?? prop?.rich_text ?? []).map((t) => t.plain_text ?? t.text?.content ?? "").join("");
const pageToProject = (page) => ({
  id: page.id,
  name: plain(page.properties?.Name) || "未命名專案",
  idea: plain(page.properties?.Idea),
  status: page.properties?.Status?.select?.name ?? "",
});

export function makeNotion(cfg) {
  if (cfg.fake) return makeFakeNotion(cfg);

  async function api(method, path, body) {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.notionToken}`,
        "Notion-Version": VERSION,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Notion ${method} ${path.split("?")[0]} → ${res.status} ${data.message ?? ""}`.trim());
    return data;
  }

  const link = (id) => (cfg.appUrl ? `${cfg.appUrl}/projects/${id}` : "");

  return {
    async listDiscussing() {
      const out = [];
      let cursor;
      do {
        const res = await api("POST", `/data_sources/${cfg.dataSourceId}/query`, {
          filter: { property: "Status", select: { equals: "討論中" } },
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        });
        out.push(...res.results.filter((p) => p.object === "page" && !p.in_trash).map(pageToProject));
        cursor = res.has_more ? res.next_cursor : undefined;
      } while (cursor);
      return out;
    },
    async getProject(id) {
      const page = await api("GET", `/pages/${id}`);
      return page.in_trash ? null : pageToProject(page);
    },
    async hasBody(id) {
      const res = await api("GET", `/blocks/${id}/children?page_size=1`);
      return res.results.length > 0;
    },
    // 只 append，絕不刪除頁面上既有區塊
    async writePrd(id, md) {
      const blocks = markdownToBlocks(md);
      if (!blocks.length) throw new Error("PRD 內容為空，不寫入");
      for (let i = 0; i < blocks.length; i += 100) {
        await api("PATCH", `/blocks/${id}/children`, { children: blocks.slice(i, i + 100) });
      }
      await api("PATCH", `/pages/${id}`, { properties: { Status: { select: { name: "PRD 待審" } } } });
      return blocks.length;
    },
    // @ 提及才會觸發 Notion 推播；沒設定使用者 ID 時退回一般留言
    async comment(id, message) {
      const l = link(id);
      await api("POST", "/comments", {
        parent: { page_id: id },
        rich_text: [
          ...(cfg.notifyUserId
            ? [{ type: "mention", mention: { user: { id: cfg.notifyUserId } } }, { type: "text", text: { content: " " } }]
            : []),
          ...richText(`${message}${l ? ` 平台連結：${l}` : ""}`),
        ],
      });
    },
  };
}
