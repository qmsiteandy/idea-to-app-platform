// 共用工具：Notion client、環境變數、純文字處理。純 Node ESM，無額外相依。
import { Client } from "@notionhq/client";

export const INBOX_DS = process.env.NOTION_INBOX_DATA_SOURCE_ID || "116a3153-cc28-482c-a3f4-73f112d0646a";
export const PROJECTS_DS = process.env.NOTION_PROJECTS_DATA_SOURCE_ID || "b99acfce-7dcd-4619-8c2e-65a4c6fc7df7";

export function makeClient() {
  if (!process.env.NOTION_TOKEN) throw new Error("缺少 NOTION_TOKEN");
  return new Client({ auth: process.env.NOTION_TOKEN });
}

export function platformLink(pageId) {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  return base ? `${base}/projects/${pageId}` : null;
}

// Notion rich_text 單段上限 2000 字
export function richText(s, max = 2000) {
  const out = [];
  for (let i = 0; i < s.length; i += max) out.push({ type: "text", text: { content: s.slice(i, i + max) } });
  return out;
}

export const plain = (prop) => {
  const items = prop?.title ?? prop?.rich_text ?? [];
  return items.map((t) => t.plain_text ?? t.text?.content ?? "").join("");
};

export async function queryAll(client, params) {
  const rows = [];
  let cursor;
  do {
    const res = await client.dataSources.query({ ...params, start_cursor: cursor, page_size: 100 });
    rows.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return rows;
}
