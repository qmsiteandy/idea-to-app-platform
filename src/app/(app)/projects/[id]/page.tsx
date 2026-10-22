import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Stepper } from "@/components/Stepper";
import { getProject } from "@/lib/db";
import { hostOf, relativeTime, safeHttpUrl, shortDate } from "@/lib/format";
import { NEXT_STEP } from "@/lib/status";

export const dynamic = "force-dynamic";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <dt className="shrink-0 text-neutral-600">{label}</dt>
      <dd className="min-w-0 break-words text-right [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 underline-offset-2 hover:underline"
    >
      {label ?? hostOf(href)} ↗
    </a>
  );
}

const NONE = <span className="text-neutral-600">尚未產生</span>;
const NOT_SYNCED = <span className="text-neutral-600">尚未同步</span>;

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const next = NEXT_STEP[project.status];
  const prodUrl = safeHttpUrl(project.prod_url);
  const repoUrl = safeHttpUrl(project.repo_url);

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
        ← 專案列表
      </Link>

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold [overflow-wrap:anywhere]">{project.name}</h1>
        <StatusBadge status={project.status} />
      </div>

      <section className="rounded-xl border border-neutral-300 bg-white p-6" aria-label="流程進度">
        <Stepper status={project.status} />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-neutral-300 bg-white p-6">
            <h2 className="text-sm font-medium text-neutral-600">一句話構想</h2>
            <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">
              {project.idea || <span className="text-neutral-600">尚未填寫構想</span>}
            </p>
          </section>

          <section className="rounded-xl border border-neutral-900/10 bg-neutral-900 p-6 text-white">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-200">下一步</div>
            <h2 className="mt-1 text-lg font-semibold">{next.title}</h2>
            <p className="mt-1 text-sm text-neutral-200">{next.hint}</p>
            {!next.available && (
              <p className="mt-4 inline-block rounded-md bg-white/10 px-2.5 py-1 text-xs text-neutral-200">
                此功能開發中，之後會在這裡直接開始
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit min-w-0 rounded-xl border border-neutral-300 bg-white px-5 py-2">
          <h2 className="pt-3 text-sm font-medium text-neutral-600">專案資訊</h2>
          <dl className="divide-y divide-neutral-100">
            <Fact label="正式網址">
              {prodUrl ? <ExternalLink href={prodUrl} /> : NONE}
            </Fact>
            <Fact label="GitHub">
              {repoUrl ? (
                <ExternalLink href={repoUrl} label={repoUrl.replace(/^https?:\/\/github\.com\//, "")} />
              ) : (
                NONE
              )}
            </Fact>
            <Fact label="版本">{project.current_version ?? NONE}</Fact>
            <Fact label="Notion 頁面">
              {project.notion_url ? <ExternalLink href={project.notion_url} label="開啟" /> : NOT_SYNCED}
            </Fact>
            <Fact label="建立">{shortDate(project.created_at)}</Fact>
            <Fact label="最後更新">{relativeTime(project.updated_at)}</Fact>
          </dl>
        </aside>
      </div>
    </div>
  );
}
