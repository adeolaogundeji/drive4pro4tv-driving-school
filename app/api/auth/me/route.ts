import { getEmployeeSession } from "@/lib/employee-auth";

export async function GET(request: Request) {
  try {
    const employee = await getEmployeeSession(request);
    if (!employee) return Response.json({ employee: null }, { status: 401 });
    return Response.json({ employee });
  } catch (error) {
    console.error("Employee session lookup failed", error);
    return Response.json({ error: "Session lookup failed." }, { status: 500 });
  }
}
