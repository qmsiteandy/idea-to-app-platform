import { createClient } from "@supabase/supabase-js";
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
  notion_page_id: string | null;
  created_at: string;
};

export type NewProject = { name: string; idea: string };

// 有設定 Supabase 就用 Supabase；沒有就退回本機 JSON 檔，只供本機開發使用。
function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
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

export function storageMode(): "supabase" | "local-file" {
  return supabase() ? "supabase" : "local-file";
}

export async function listProjects(): Promise<Project[]> {
  const db = supabase();
  if (db) {
    const { data, error } = await db
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as Project[];
  }
  return (await readLocal()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getProject(id: string): Promise<Project | null> {
  const db = supabase();
  if (db) {
    const { data, error } = await db.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Project | null) ?? null;
  }
  return (await readLocal()).find((p) => p.id === id) ?? null;
}

export async function createProject(input: NewProject): Promise<Project> {
  const db = supabase();
  if (db) {
    const { data, error } = await db
      .from("projects")
      .insert({ name: input.name, idea: input.idea, status: "discussing" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Project;
  }
  const project: Project = {
    id: randomUUID(),
    name: input.name,
    idea: input.idea,
    status: "discussing",
    repo_url: null,
    prod_url: null,
    current_version: null,
    notion_page_id: null,
    created_at: new Date().toISOString(),
  };
  await writeLocal([project, ...(await readLocal())]);
  return project;
}
