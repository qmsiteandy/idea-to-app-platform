import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Stepper } from "@/components/Stepper";
import { listProjects, storageMode, type Project } from "@/lib/db";
import { hostOf, relativeTime, safeHttpUrl } from "@/lib/format";
import { STATUS_LABEL, STATUS_ORDER, STATUS_STYLE, type ProjectStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const prodUrl = safeHttpUrl(p.prod_url);
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group flex min-w-0 flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold group-hover:underline">{p.name}</h2>
          <p className="mt-1 line-clamp-2 min-h-10 break-words text-sm [overflow-wrap:anywhere] text-neutral-500">
            {p.idea || "尚未填寫構想"}
          </p>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Stepper status={p.status} compact />
        </div>
        <span className="shrink-0 text-xs text-neutral-500">
          第 {STATUS_ORDER.indexOf(p.status) + 1}／{STATUS_ORDER.length} 階段
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
        <span className="shrink-0">{p.current_version ? `版本 ${p.current_version}` : "尚無版本"}</span>
        {prodUrl ? (
          <span className="truncate text-emerald-700">● {hostOf(prodUrl)}</span>
        ) : (
          <span>更新於 {relativeTime(p.updated_at)}</span>
        )}
      </div>
    </Link>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const all = await listProjects();
  const filter = STATUS_ORDER.includes(status as ProjectStatus) ? (status as ProjectStatus) : null;
  const projects = filter ? all.filter((p) => p.status === filter) : all;

  const count = (s: ProjectStatus) => all.filter((p) => p.status === s).length;
  const active = all.filter((p) => p.status === "building" || p.status === "iterating").length;
  const latest = all.reduce<string | null>(
    (acc, p) => (!acc || p.updated_at > acc ? p.updated_at : acc),
    null,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">專案</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {latest ? `最近更新 ${relativeTime(latest)}` : "從一個點子開始，建立你的第一個專案"}
          </p>
        </div>
      </div>

      {storageMode() === "local-file" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          尚未設定 Notion，資料暫存在本機檔案，部署後不會保留。
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="總覽">
        <Stat label="全部專案" value={all.length} />
        <Stat label="已上線" value={count("live")} hint="狀態為已上線" />
        <Stat label="進行中" value={active} hint="建置中或迭代中" />
        <Stat label="待處理" value={count("discussing") + count("prd_review")} hint="等你討論或審核" />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="依階段篩選">
        <Link
          href="/"
          aria-current={!filter ? "true" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm transition sm:min-h-0 sm:py-1 ${!filter ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"}`}
        >
          全部 {all.length}
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/?status=${s}`}
            aria-current={filter === s ? "true" : undefined}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition sm:min-h-0 sm:py-1 ${filter === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"}`}
          >
            <span className={`size-1.5 rounded-full ${STATUS_STYLE[s].dot}`} />
            {STATUS_LABEL[s]} {count(s)}
          </Link>
        ))}
      </nav>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="font-medium">
            {all.length === 0 ? "還沒有專案" : `沒有「${filter ? STATUS_LABEL[filter] : ""}」的專案`}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {all.length === 0 ? "寫下一句話構想，就能建立第一個專案。" : "換一個篩選條件看看。"}
          </p>
          {all.length === 0 && (
            <Link
              href="/projects/new"
              className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              新增專案
            </Link>
          )}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2" aria-label="專案列表">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </section>
      )}
    </div>
  );
}
