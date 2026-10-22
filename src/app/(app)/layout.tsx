import Link from "next/link";
import { logout } from "@/app/login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
        <header className="sticky top-0 z-10 border-b border-neutral-300 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid size-7 place-items-center rounded-lg bg-neutral-900 text-sm text-white">
                ◆
              </span>
              Idea to App
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/projects/new"
                className="hidden min-h-11 items-center rounded-lg border border-neutral-300 px-3.5 text-sm font-medium text-neutral-900 transition hover:border-neutral-500 sm:inline-flex sm:min-h-0 sm:py-1.5"
              >
                新增專案
              </Link>
              <Link
                href="/ideas/new"
                className="inline-flex min-h-11 items-center rounded-lg bg-neutral-900 px-3.5 text-sm sm:min-h-0 sm:py-1.5 font-medium text-white transition hover:bg-neutral-700"
              >
                ＋ 新增想法
              </Link>
              <form action={logout}>
                <button className="min-h-11 rounded-lg px-3 text-sm sm:min-h-0 sm:py-1.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900">
                  登出
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
