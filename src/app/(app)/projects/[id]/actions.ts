"use server";

import { revalidatePath } from "next/cache";
import { UserError, getProject, replacePrd, setStatus } from "@/lib/db";
import { PRD_MAX_LENGTH, parseMarkdown } from "@/lib/prd";

export type PrdState = { error?: string; markdown?: string };

export async function savePrd(id: string, _prev: PrdState, formData: FormData): Promise<PrdState> {
  const markdown = String(formData.get("markdown") ?? "");
  if (!parseMarkdown(markdown).length) return { markdown, error: "PRD 內容不可為空。" };
  if (markdown.length > PRD_MAX_LENGTH) return { markdown, error: `PRD 最多 ${PRD_MAX_LENGTH} 字。` };
  if (!(await getProject(id))) return { markdown, error: "找不到這個專案。" };
  try {
    await replacePrd(id, markdown);
  } catch (e) {
    revalidatePath(`/projects/${id}`);
    return { markdown, error: e instanceof UserError ? e.message : "儲存失敗，請稍後再試。" };
  }
  revalidatePath(`/projects/${id}`);
  return {};
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function approvePrd(id: string, _prev: PrdState): Promise<PrdState> {
  const project = await getProject(id);
  if (!project) return { error: "找不到這個專案。" };
  if (project.status !== "prd_review") return { error: "只有「PRD 待審」的專案可以核准。" };
  try {
    await setStatus(id, "building");
  } catch {
    return { error: "核准失敗，請稍後再試。" };
  }
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  return {};
}
