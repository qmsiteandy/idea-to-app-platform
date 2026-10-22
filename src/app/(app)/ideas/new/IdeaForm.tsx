"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

export type IdeaState = {
  error?: string;
  done?: boolean;
  title?: string;
  details?: string;
  type?: "新專案" | "新功能";
  target?: string;
};

const field =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10";

// 送出期間 disabled，避免連點重複送出
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "送出中…" : "送出想法"}
    </button>
  );
}

export function IdeaForm({
  action,
}: {
  action: (prev: IdeaState, formData: FormData) => Promise<IdeaState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const [type, setType] = useState<"新專案" | "新功能">("新專案");

  if (state.done) {
    return (
      <div role="status" className="space-y-4 rounded-xl border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-semibold">已收到你的想法</h2>
        <p className="text-sm text-neutral-600">
          系統約每 15 分鐘會處理一次收件匣，約 15 分鐘內會接手；新專案產生 PRD 後會出現在首頁的「待你處理」。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            回首頁
          </Link>
          <Link
            href="/ideas/new"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-900 hover:border-neutral-500"
          >
            再新增一個
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-neutral-300 bg-white p-6">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">想法標題</span>
        <input
          name="title"
          required
          maxLength={80}
          defaultValue={state.title}
          placeholder="例如：個人記帳小幫手"
          className={field}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">詳細說明</span>
        <textarea
          name="details"
          rows={6}
          maxLength={2000}
          defaultValue={state.details}
          placeholder="要解決什麼問題？給誰用？想要哪些功能？"
          className={field}
        />
        <span className="text-xs text-neutral-600">最多 2000 字，可以先留白。</span>
      </label>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">類型</legend>
        <div className="flex gap-2">
          {(["新專案", "新功能"] as const).map((t) => (
            <label
              key={t}
              className={`inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm transition sm:min-h-0 sm:py-2 ${type === t ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:border-neutral-500"}`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      {type === "新功能" && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">目標專案</span>
          <input
            name="target"
            required
            maxLength={80}
            defaultValue={state.target}
            placeholder="要加在哪個專案？填專案名稱"
            className={field}
          />
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
          取消
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
