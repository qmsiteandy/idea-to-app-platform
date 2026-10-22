import Link from "next/link";
import { redirect } from "next/navigation";
import { createProject } from "@/lib/db";
import { NewProjectForm, type CreateState } from "./NewProjectForm";

async function create(_prev: CreateState, formData: FormData): Promise<CreateState> {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const idea = String(formData.get("idea") ?? "").trim();
  const keep = { name, idea };
  if (!name) return { ...keep, error: "請輸入專案名稱。" };
  if (name.length > 80) return { ...keep, error: "專案名稱最多 80 字。" };
  if (idea.length > 1000) return { ...keep, error: "構想最多 1000 字。" };
  const project = await createProject({ name, idea });
  redirect(`/projects/${project.id}`);
}

export default function NewProject() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
        ← 專案列表
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">新增專案</h1>
        <p className="mt-1 text-sm text-neutral-600">
          先寫下名稱與一句話構想。建立後系統會自動產生 PRD，約 15 分鐘內完成，完成時會在 Notion @ 通知你。
        </p>
      </div>
      <NewProjectForm action={create} />
    </div>
  );
}
