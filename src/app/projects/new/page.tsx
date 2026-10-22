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

export default function NewProject() {
  return (
    <form action={create} className="space-y-4">
      <h1 className="text-2xl font-semibold">新增專案</h1>
      <label className="block space-y-1">
        <span className="text-sm font-medium">專案名稱</span>
        <input
          name="name"
          required
          maxLength={80}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">一句話構想</span>
        <textarea
          name="idea"
          rows={4}
          maxLength={1000}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
        />
      </label>
      <button className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700">
        建立
      </button>
    </form>
  );
}
