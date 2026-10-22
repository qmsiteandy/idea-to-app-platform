// 單人使用的簽章 cookie 登入。以 Web Crypto 實作，middleware（edge）與 server 都能用。
export const SESSION_COOKIE = "session";

const encoder = new TextEncoder();

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(secret: string): Promise<string> {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${await sign(issuedAt, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!token || !secret) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  const expected = await sign(issuedAt, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  const age = Date.now() - Number(issuedAt);
  return diff === 0 && age >= 0 && age < 1000 * 60 * 60 * 24 * 30;
}
