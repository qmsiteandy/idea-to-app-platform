import { STATUS_LABEL, STATUS_ORDER, type ProjectStatus } from "@/lib/status";

// 五階段流程進度。compact 用在列表卡片（只畫節點），預設用在詳情頁（含文字）。
export function Stepper({ status, compact = false }: { status: ProjectStatus; compact?: boolean }) {
  const current = STATUS_ORDER.indexOf(status);
  return (
    <ol className="flex items-center" aria-label={`目前階段：${STATUS_LABEL[status]}`}>
      {STATUS_ORDER.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className={`flex items-center ${i < STATUS_ORDER.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={[
                  "grid place-items-center rounded-full border text-[10px] font-semibold",
                  compact ? "size-3" : "size-6",
                  done
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : active
                      ? "border-neutral-900 bg-white ring-4 ring-neutral-900/10"
                      : "border-neutral-300 bg-white text-neutral-400",
                ].join(" ")}
              >
                {!compact && (done ? "✓" : i + 1)}
              </span>
              {!compact && (
                <span
                  className={`whitespace-nowrap text-xs ${active ? "font-semibold text-neutral-900" : "text-neutral-500"}`}
                >
                  {STATUS_LABEL[s]}
                </span>
              )}
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <span
                className={`mx-1 h-px flex-1 ${compact ? "" : "-mt-5"} ${done ? "bg-neutral-900" : "bg-neutral-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
