import { STATUS_LABEL, STATUS_STYLE, type ProjectStatus } from "@/lib/status";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
