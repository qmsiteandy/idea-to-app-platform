"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type CreateState = { error?: string; name?: string; idea?: string };

const field =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10";

// 送出期間 disabled，避免連點重複建立
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "建立中…" : "建立專案"}
    </button>
  );
}

export function NewProjectForm({
  action,
}: {
  action: (prev: CreateState, formData: FormData) => Promise<CreateState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-neutral-300 bg-white p-6">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">專案名稱</span>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={state.name}
          placeholder="例如：個人記帳小幫手"
          className={field}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">一句話構想</span>
        <textarea
          name="idea"
          rows={4}
          maxLength={1000}
          defaultValue={state.idea}
          placeholder="這個專案要解決什麼問題？給誰用？"
          className={field}
        />
        <span className="text-xs text-neutral-600">最多 1000 字，可以先留白。</span>
      </label>
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
