import Link from "next/link";
import { STATUS_LABEL, listProjects, storageMode } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">專案</h1>
      {storageMode() === "local-file" && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          尚未設定 Notion，資料暫存在本機檔案，部署後不會保留。
        </p>
      )}
      {projects.length === 0 ? (
        <p className="text-neutral-500">還沒有專案，按右上角「新增專案」開始。</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-sm text-neutral-500">{p.idea}</div>
                </div>
                <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs">
                  {STATUS_LABEL[p.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
