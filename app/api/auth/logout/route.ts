import { deleteSession } from "@/lib/employee-auth";

export async function POST(request: Request) {
  try {
    const cookie = await deleteSession(request);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
  } catch (error) {
    console.error("Employee logout failed", error);
    return Response.json({ error: "Sign out failed." }, { status: 500 });
  }
}
