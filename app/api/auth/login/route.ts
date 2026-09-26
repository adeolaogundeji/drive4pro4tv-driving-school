import { getD1 } from "@/db";
import { createSession, hashPassword, secureEqual } from "@/lib/employee-auth";

type EmployeeRow = { id: string; fullName: string; email: string; passwordHash: string; passwordSalt: string };

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const employee = await getD1().prepare(`
      SELECT id, full_name AS fullName, email, password_hash AS passwordHash, password_salt AS passwordSalt
      FROM employees WHERE email = ?
    `).bind(email).first<EmployeeRow>();
    if (!employee) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    const candidate = await hashPassword(password, employee.passwordSalt);
    if (!secureEqual(candidate, employee.passwordHash)) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    const session = await createSession(employee.id, request);
    return Response.json({ employee: { id: employee.id, fullName: employee.fullName, email: employee.email } }, { headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    console.error("Employee login failed", error);
    return Response.json({ error: "Sign in is temporarily unavailable." }, { status: 500 });
  }
}
