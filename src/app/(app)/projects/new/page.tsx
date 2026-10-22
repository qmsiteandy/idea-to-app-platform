import Link from "next/link";
import { redirect } from "next/navigation";
import { createProject } from "@/lib/db";

async function create(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const idea = String(formData.get("idea") ?? "").trim();
  if (!name) return;
  const project = await createProject({ name, idea });
  redirect(`/projects/${project.id}`);
}

const field =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10";

export default function NewProject() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← 專案列表
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">新增專案</h1>
        <p className="mt-1 text-sm text-neutral-500">
          先寫下名稱與一句話構想，之後 AI 會在需求訪談中幫你補完細節。
        </p>
      </div>
      <form action={create} className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">專案名稱</span>
          <input name="name" required maxLength={80} placeholder="例如：個人記帳小幫手" className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">一句話構想</span>
          <textarea
            name="idea"
            rows={4}
            maxLength={1000}
            placeholder="這個專案要解決什麼問題？給誰用？"
            className={field}
          />
          <span className="text-xs text-neutral-400">最多 1000 字，可以先留白。</span>
        </label>
        <div className="flex items-center justify-end gap-3">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
            取消
          </Link>
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700">
            建立專案
          </button>
        </div>
      </form>
    </div>
  );
}
