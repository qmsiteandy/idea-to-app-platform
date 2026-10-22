"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";

export async function login(_: { error?: string }, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.APP_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) return { error: "伺服器尚未設定 APP_PASSWORD 與 SESSION_SECRET" };
  if (password !== expected) return { error: "密碼錯誤" };

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
