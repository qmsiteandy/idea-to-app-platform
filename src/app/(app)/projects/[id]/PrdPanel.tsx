"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { PrdBlock } from "@/lib/prd";
import type { PrdState } from "./actions";

const btn =
  "rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const primary = `${btn} bg-neutral-900 text-white hover:bg-neutral-700`;
const secondary = `${btn} border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500`;

function Submit({ idle, busy, className = primary }: { idle: string; busy: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={className}>
      {pending ? busy : idle}
    </button>
  );
}

function Blocks({ blocks }: { blocks: PrdBlock[] }) {
  const out: React.ReactNode[] = [];
  let n = 0;
  blocks.forEach((b, i) => {
    n = b.type === "numbered_list_item" ? n + 1 : 0;
    const wrap = "break-words [overflow-wrap:anywhere]";
    switch (b.type) {
      case "heading_1":
        out.push(<h3 key={i} className={`mt-6 text-xl font-semibold first:mt-0 ${wrap}`}>{b.text}</h3>);
        break;
      case "heading_2":
        out.push(<h4 key={i} className={`mt-5 text-lg font-semibold first:mt-0 ${wrap}`}>{b.text}</h4>);
        break;
      case "heading_3":
        out.push(<h5 key={i} className={`mt-4 font-semibold first:mt-0 ${wrap}`}>{b.text}</h5>);
        break;
      case "bulleted_list_item":
        out.push(
          <div key={i} className={`flex gap-2 ${wrap}`}>
            <span aria-hidden className="text-neutral-600">•</span>
            <span className="min-w-0">{b.text}</span>
          </div>,
        );
        break;
      case "numbered_list_item":
        out.push(
          <div key={i} className={`flex gap-2 ${wrap}`}>
            <span aria-hidden className="w-5 shrink-0 text-neutral-600 tabular-nums">{n}.</span>
            <span className="min-w-0">{b.text}</span>
          </div>,
        );
        break;
      case "to_do":
        out.push(
          <div key={i} className={`flex gap-2 ${wrap}`}>
            <span aria-hidden className="text-neutral-600">{b.checked ? "☑" : "☐"}</span>
            <span className={`min-w-0 ${b.checked ? "text-neutral-600 line-through" : ""}`}>{b.text}</span>
          </div>,
        );
        break;
      default:
        out.push(<p key={i} className={`whitespace-pre-wrap ${wrap}`}>{b.text}</p>);
    }
  });
  return <div className="space-y-2 leading-relaxed">{out}</div>;
}

export function PrdPanel({
  blocks,
  loadError,
  markdown,
  canApprove,
  save,
  approve,
}: {
  blocks: PrdBlock[];
  loadError: boolean;
  markdown: string;
  canApprove: boolean;
  save: (prev: PrdState, formData: FormData) => Promise<PrdState>;
  approve: (prev: PrdState) => Promise<PrdState>;
}) {
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction] = useActionState(save, {});
  const [approveState, approveAction] = useActionState(approve, {});

  return (
    <section className="rounded-xl border border-neutral-300 bg-white p-6" aria-label="PRD">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-600">PRD（產品需求文件）</h2>
        {!editing && !loadError && (
          <button type="button" onClick={() => setEditing(true)} className={`${secondary} !py-1.5`}>
            {blocks.length ? "編輯" : "撰寫"}
          </button>
        )}
      </div>

      {loadError ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          讀取 PRD 失敗，請重新整理再試；為避免覆蓋內容，暫時無法編輯。
        </p>
      ) : editing ? (
        <form action={saveAction} className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">PRD 內容（Markdown）</span>
            <textarea
              name="markdown"
              rows={18}
              maxLength={20000}
              defaultValue={saveState.markdown ?? markdown}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10"
            />
            <span className="text-xs text-neutral-600">
              支援 # 標題、段落、- 項目、1. 編號、- [ ] 待辦。儲存會取代整份 PRD；粗體、連結等格式會存成純文字。
            </span>
          </label>
          {saveState.error && (
            <p role="alert" className="text-sm text-red-600">
              {saveState.error}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-neutral-600 hover:text-neutral-900">
              取消
            </button>
            <Submit idle="儲存 PRD" busy="儲存中…" />
          </div>
        </form>
      ) : blocks.length ? (
        <div className="mt-4">
          <Blocks blocks={blocks} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-neutral-600">尚未產生 PRD。</p>
      )}

      {canApprove && !editing && !loadError && (
        <form action={approveAction} className="mt-6 space-y-3 border-t border-neutral-200 pt-4">
          <p className="text-sm text-neutral-600">
            核准後狀態會改為「建置中」。注意：自動建置功能仍在開發中，核准後目前不會自動開始建置。
          </p>
          {approveState.error && (
            <p role="alert" className="text-sm text-red-600">
              {approveState.error}
            </p>
          )}
          <Submit idle="核准 PRD" busy="處理中…" />
        </form>
      )}
    </section>
  );
}
