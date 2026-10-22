import Link from "next/link";
import { UserError, createIdea } from "@/lib/db";
import { IdeaForm, type IdeaState } from "./IdeaForm";

async function submit(_prev: IdeaState, formData: FormData): Promise<IdeaState> {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const type = formData.get("type") === "新功能" ? "新功能" : "新專案";
  const target = type === "新功能" ? String(formData.get("target") ?? "").trim() : "";
  const keep = { title, details, type, target } as const;
  if (!title) return { ...keep, error: "請輸入想法標題。" };
  if (title.length > 80) return { ...keep, error: "標題最多 80 字。" };
  if (details.length > 2000) return { ...keep, error: "詳細說明最多 2000 字。" };
  if (type === "新功能" && !target) return { ...keep, error: "新功能請填寫目標專案。" };
  if (target.length > 80) return { ...keep, error: "目標專案最多 80 字。" };
  try {
    await createIdea({ title, details, type, target });
  } catch (e) {
    return { ...keep, error: e instanceof UserError ? e.message : "送出失敗，請稍後再試。" };
  }
  return { done: true };
}

export default function NewIdea() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
        ← 專案列表
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">新增想法</h1>
        <p className="mt-1 text-sm text-neutral-600">
          丟進收件匣就好，系統會自動接手：新專案會建立專案並產生 PRD，等你審核。
        </p>
      </div>
      <IdeaForm action={submit} />
    </div>
  );
}
