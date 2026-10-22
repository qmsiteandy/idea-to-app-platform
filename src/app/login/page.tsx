"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {} as { error?: string });
  return (
    <form action={action} className="mx-auto mt-24 w-full max-w-xs space-y-4">
      <h1 className="text-xl font-semibold">登入</h1>
      <input
        type="password"
        name="password"
        required
        autoFocus
        placeholder="密碼"
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700 disabled:opacity-60"
      >
        登入
      </button>
    </form>
  );
}
