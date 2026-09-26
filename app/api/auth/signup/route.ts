import { getD1 } from "@/db";
import { createSalt, createSession, hashPassword, signupCodeMatches } from "@/lib/employee-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { fullName?: string; email?: string; password?: string; accessCode?: string };
    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const accessCode = body.accessCode ?? "";
    if (fullName.length < 2 || fullName.length > 80) return Response.json({ error: "Enter your full name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return Response.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
    if (!signupCodeMatches(accessCode)) return Response.json({ error: "The company access code is not correct." }, { status: 403 });

    const db = getD1();
    const existing = await db.prepare("SELECT id FROM employees WHERE email = ?").bind(email).first();
    if (existing) return Response.json({ error: "An employee account already uses this email." }, { status: 409 });

    const id = crypto.randomUUID();
    const salt = createSalt();
    const passwordHash = await hashPassword(password, salt);
    await db.prepare(`
      INSERT INTO employees (id, full_name, email, password_hash, password_salt)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, fullName, email, passwordHash, salt).run();
    const session = await createSession(id, request);
    return Response.json({ employee: { id, fullName, email } }, { status: 201, headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    console.error("Employee signup failed", error);
    return Response.json({ error: "Account creation is temporarily unavailable." }, { status: 500 });
  }
}
