import { STATUS_LABEL, STATUS_ORDER, type ProjectStatus } from "@/lib/status";

// 五階段流程進度。compact 用在列表卡片（只畫節點），預設用在詳情頁（含文字）。
export function Stepper({ status, compact = false }: { status: ProjectStatus; compact?: boolean }) {
  const current = STATUS_ORDER.indexOf(status);
  const last = STATUS_ORDER.length - 1;
  return (
    <ol
      // 詳情頁用等寬欄位，連接線絕對定位，避免文字寬度不同把線擠掉
      className={compact ? "flex items-center" : "grid grid-cols-5"}
      aria-label={`${compact ? "目前階段" : "流程進度"}：第 ${current + 1}／${STATUS_ORDER.length} 階段，${STATUS_LABEL[status]}`}
    >
      {STATUS_ORDER.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s}
            className={compact ? `flex items-center ${i < last ? "flex-1" : ""}` : "relative flex flex-col items-center gap-1.5"}
            aria-current={active ? "step" : undefined}
          >
            <span
              title={compact ? STATUS_LABEL[s] : undefined}
              className={[
                "relative z-10 grid place-items-center rounded-full border text-[10px] font-semibold",
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
            {compact ? (
              <span className="sr-only">{STATUS_LABEL[s]}</span>
            ) : (
              <span className={`text-center text-xs ${active ? "font-semibold text-neutral-900" : "text-neutral-500"}`}>
                {STATUS_LABEL[s]}
              </span>
            )}
            {i < last && (
              <span
                className={
                  compact
                    ? `mx-1 h-px flex-1 ${done ? "bg-neutral-900" : "bg-neutral-200"}`
                    : `absolute left-1/2 top-3 h-px w-full ${done ? "bg-neutral-900" : "bg-neutral-200"}`
                }
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
