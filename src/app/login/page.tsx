"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {} as { error?: string });
  return (
    <main className="px-4 py-16">
    <form
      action={action}
      className="mx-auto w-full max-w-sm space-y-5 rounded-2xl border border-neutral-300 bg-white p-8 shadow-sm"
    >
      <div className="space-y-1 text-center">
        <div className="mx-auto grid size-10 place-items-center rounded-xl bg-neutral-900 text-white">◆</div>
        <h1 className="pt-2 text-xl font-semibold">登入 Idea to App</h1>
        <p className="text-sm text-neutral-600">輸入密碼以繼續</p>
      </div>
      <div className="space-y-2">
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="密碼"
          aria-label="密碼"
          aria-invalid={Boolean(state.error)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10"
        />
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>
      <button
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? "登入中…" : "登入"}
      </button>
    </form>
    </main>
  );
}
