import { env } from "cloudflare:workers";
import { getD1 } from "@/db";

const SESSION_COOKIE = "drive4pro_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type EmployeeSession = {
  id: string;
  fullName: string;
  email: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

export function createSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password: string, salt: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 210_000 },
    material,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export function secureEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const size = Math.max(a.length, b.length);
  for (let index = 0; index < size; index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

export function signupCodeMatches(code: string) {
  const configured = env.EMPLOYEE_SIGNUP_CODE?.trim();
  return Boolean(configured && secureEqual(code.trim(), configured));
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function createSession(employeeId: string, request: Request) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  await getD1().prepare(
    "INSERT INTO sessions (token_hash, employee_id, expires_at) VALUES (?, ?, ?)",
  ).bind(tokenHash, employeeId, expiresAt).run();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    token,
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
  };
}

export async function getEmployeeSession(request: Request): Promise<EmployeeSession | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await getD1().prepare(`
    SELECT employees.id, employees.full_name AS fullName, employees.email
    FROM sessions
    JOIN employees ON employees.id = sessions.employee_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).bind(tokenHash, now).first<EmployeeSession>();
  return row ?? null;
}

export async function deleteSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256(token);
    await getD1().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
