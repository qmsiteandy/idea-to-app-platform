import { Client, isFullPage } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ProjectStatus =
  | "discussing"
  | "prd_review"
  | "building"
  | "live"
  | "iterating";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  discussing: "討論中",
  prd_review: "PRD 待審",
  building: "建置中",
  live: "已上線",
  iterating: "迭代中",
};

export type Project = {
  id: string;
  name: string;
  idea: string;
  status: ProjectStatus;
  repo_url: string | null;
  prod_url: string | null;
  current_version: string | null;
  created_at: string;
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
    name: plain(p.Name),
    idea: plain(p.Idea),
    status: (status && STATUS_BY_LABEL[status]) || "discussing",
    repo_url: url(p.Repo),
    prod_url: url(p["Prod URL"]),
    current_version: plain(p.Version) || null,
    created_at: page.created_time,
  };
}

const LOCAL_FILE = path.join(process.cwd(), ".data", "projects.json");

async function readLocal(): Promise<Project[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
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
    created_at: new Date().toISOString(),
  };
  await writeLocal([project, ...(await readLocal())]);
  return project;
}
