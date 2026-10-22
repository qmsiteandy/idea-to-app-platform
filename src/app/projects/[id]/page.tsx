import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_LABEL, getProject } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← 回專案列表
      </Link>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs">
          {STATUS_LABEL[project.status]}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-neutral-700">{project.idea || "（尚未填寫構想）"}</p>
      <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
        <dt className="text-neutral-500">正式網址</dt>
        <dd>{project.prod_url ?? "尚未部署"}</dd>
        <dt className="text-neutral-500">Repo</dt>
        <dd>{project.repo_url ?? "尚未建立"}</dd>
        <dt className="text-neutral-500">版本</dt>
        <dd>{project.current_version ?? "—"}</dd>
      </dl>
    </div>
  );
}
