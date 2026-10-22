import { Client, isFullPage } from "@notionhq/client";
import type { BlockObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { parseMarkdown, toMarkdown, toNotionBlocks, type PrdBlock, type PrdBlockType } from "./prd";
import { STATUS_LABEL, STATUS_ORDER, type ProjectStatus } from "./status";

export { STATUS_LABEL };
export type { ProjectStatus };

export type Project = {
  id: string;
  name: string;
  idea: string;
  status: ProjectStatus;
  repo_url: string | null;
  prod_url: string | null;
  current_version: string | null;
  notion_url: string | null;
  created_at: string;
  updated_at: string;
  prd?: string; // 僅本機檔案模式使用（Markdown）；Notion 模式存在頁面內容
};

export type NewProject = { name: string; idea: string };

// 資料存放在 Notion 的「專案」資料庫（id 即 Notion 頁面 id）。
// 沒設定 NOTION_TOKEN 時退回本機 JSON 檔，只供本機開發使用。
const STATUS_BY_LABEL = Object.fromEntries(
  Object.entries(STATUS_LABEL).map(([k, v]) => [v, k as ProjectStatus]),
) as Record<string, ProjectStatus>;

function notion() {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_PROJECTS_DATA_SOURCE_ID;
  return token && dataSourceId ? { client: new Client({ auth: token }), dataSourceId } : null;
}

function editLink(id: string) {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  return base ? `${base}/projects/${id}` : null;
}

const text = (v: string) => (v ? [{ type: "text" as const, text: { content: v.slice(0, 2000) } }] : []);

function fromPage(page: PageObjectResponse): Project {
  const p = page.properties;
  const plain = (prop: unknown): string => {
    const items = (prop as { title?: { plain_text: string }[]; rich_text?: { plain_text: string }[] }) ?? {};
    return (items.title ?? items.rich_text ?? []).map((t) => t.plain_text).join("");
  };
  const url = (prop: unknown) => (prop as { url?: string | null } | undefined)?.url ?? null;
  const status = (p.Status as { select?: { name: string } | null } | undefined)?.select?.name;
  return {
    id: page.id,
    name: plain(p.Name) || UNNAMED,
    idea: plain(p.Idea),
    status: (status && STATUS_BY_LABEL[status]) || "discussing",
    repo_url: url(p.Repo),
    prod_url: url(p["Prod URL"]),
    current_version: plain(p.Version) || null,
    notion_url: page.url,
    created_at: page.created_time,
    updated_at: page.last_edited_time,
  };
}

const UNNAMED = "未命名專案";

const LOCAL_FILE = path.join(process.cwd(), ".data", "projects.json");

// 本機檔案可能被手動編輯，讀入時正規化成與 Notion 模式一致
async function readLocal(): Promise<Project[]> {
  try {
    const rows: Project[] = JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
    return rows.map((p) => ({
      ...p,
      name: p.name || UNNAMED,
      status: STATUS_ORDER.includes(p.status) ? p.status : "discussing",
      current_version: p.current_version || null,
    }));
  } catch {
    return [];
  }
}

async function writeLocal(projects: Project[]) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(projects, null, 2));
}

export function storageMode(): "notion" | "local-file" {
  return notion() ? "notion" : "local-file";
}

export async function listProjects(): Promise<Project[]> {
  const n = notion();
  if (n) {
    const pages: PageObjectResponse[] = [];
    let cursor: string | undefined;
    do {
      const res = await n.client.dataSources.query({
        data_source_id: n.dataSourceId,
        start_cursor: cursor,
        sorts: [{ timestamp: "created_time", direction: "descending" }],
      });
      pages.push(...res.results.filter(isFullPage));
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return pages.map(fromPage);
  }
  return (await readLocal()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getProject(id: string): Promise<Project | null> {
  const n = notion();
  if (n) {
    try {
      const page = await n.client.pages.retrieve({ page_id: id });
      return isFullPage(page) && !page.in_trash ? fromPage(page) : null;
    } catch {
      return null;
    }
  }
  return (await readLocal()).find((p) => p.id === id) ?? null;
}

export async function createProject(input: NewProject): Promise<Project> {
  const n = notion();
  if (n) {
    const page = await n.client.pages.create({
      parent: { type: "data_source_id", data_source_id: n.dataSourceId },
      properties: {
        Name: { title: text(input.name) },
        Idea: { rich_text: text(input.idea) },
        Status: { select: { name: STATUS_LABEL.discussing } },
      },
    });
    const link = editLink(page.id);
    if (link) {
      await n.client.pages.update({
        page_id: page.id,
        properties: { "Edit in platform": { url: link } },
      });
    }
    return fromPage(page as PageObjectResponse);
  }
  const project: Project = {
    id: randomUUID(),
    name: input.name,
    idea: input.idea,
    status: "discussing",
    repo_url: null,
    prod_url: null,
    current_version: null,
    notion_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await writeLocal([project, ...(await readLocal())]);
  return project;
}

// ---- 新增想法（收件匣） ----
export type NewIdea = { title: string; details: string; type: "新專案" | "新功能"; target: string };

const INBOX_FILE = path.join(process.cwd(), ".data", "inbox.json");

export async function createIdea(input: NewIdea): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  const inboxId = process.env.NOTION_INBOX_DATA_SOURCE_ID;
  if (token && inboxId) {
    await new Client({ auth: token }).pages.create({
      parent: { type: "data_source_id", data_source_id: inboxId },
      properties: {
        Idea: { title: text(input.title) },
        Details: { rich_text: text(input.details) },
        Type: { select: { name: input.type } },
        "Target project": { rich_text: text(input.target) },
        Handled: { select: { name: "待處理" } },
      },
    });
    return;
  }
  let rows: unknown[] = [];
  try {
    rows = JSON.parse(await fs.readFile(INBOX_FILE, "utf8"));
  } catch {}
  rows.unshift({ id: randomUUID(), ...input, handled: "待處理", created_at: new Date().toISOString() });
  await fs.mkdir(path.dirname(INBOX_FILE), { recursive: true });
  await fs.writeFile(INBOX_FILE, JSON.stringify(rows, null, 2));
}

// ---- PRD（專案頁面內容） ----
const TEXT_BLOCKS = new Set<PrdBlockType>([
  "heading_1", "heading_2", "heading_3", "paragraph", "bulleted_list_item", "numbered_list_item", "to_do",
]);

export async function getPrd(id: string): Promise<PrdBlock[]> {
  const n = notion();
  if (!n) return parseMarkdown((await readLocal()).find((p) => p.id === id)?.prd ?? "");
  const out: PrdBlock[] = [];
  try {
    let cursor: string | undefined;
    do {
      const res = await n.client.blocks.children.list({ block_id: id, start_cursor: cursor, page_size: 100 });
      for (const b of res.results as BlockObjectResponse[]) {
        if (!TEXT_BLOCKS.has(b.type as PrdBlockType)) continue;
        const body = (b as unknown as Record<string, { rich_text: { plain_text: string }[]; checked?: boolean }>)[b.type];
        out.push({
          type: b.type as PrdBlockType,
          text: body.rich_text.map((t) => t.plain_text).join(""),
          ...(b.type === "to_do" ? { checked: !!body.checked } : {}),
        });
      }
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);
  } catch {
    return [];
  }
  return out;
}

export async function getPrdMarkdown(id: string) {
  return toMarkdown(await getPrd(id));
}

// 取代整份 PRD：先寫入新內容再刪舊區塊，中途失敗也不會讓內容遺失
export async function replacePrd(id: string, md: string): Promise<void> {
  const blocks = parseMarkdown(md);
  if (!blocks.length) throw new Error("PRD 內容不可為空");
  const n = notion();
  if (!n) {
    const rows = await readLocal();
    const i = rows.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("找不到專案");
    rows[i] = { ...rows[i], prd: md, updated_at: new Date().toISOString() };
    await writeLocal(rows);
    return;
  }
  const oldIds: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await n.client.blocks.children.list({ block_id: id, start_cursor: cursor, page_size: 100 });
    oldIds.push(...res.results.map((b) => b.id));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  const notionBlocks = toNotionBlocks(blocks);
  for (let i = 0; i < notionBlocks.length; i += 100) {
    await n.client.blocks.children.append({ block_id: id, children: notionBlocks.slice(i, i + 100) });
  }
  for (const b of oldIds) await n.client.blocks.delete({ block_id: b });
}

export async function setStatus(id: string, status: ProjectStatus): Promise<void> {
  const n = notion();
  if (n) {
    await n.client.pages.update({ page_id: id, properties: { Status: { select: { name: STATUS_LABEL[status] } } } });
    return;
  }
  const rows = await readLocal();
  const i = rows.findIndex((p) => p.id === id);
  if (i < 0) throw new Error("找不到專案");
  rows[i] = { ...rows[i], status, updated_at: new Date().toISOString() };
  await writeLocal(rows);
}
