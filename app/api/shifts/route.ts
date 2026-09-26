import { getD1 } from "@/db";
import { getEmployeeSession } from "@/lib/employee-auth";

type ShiftRow = { id: string; clockIn: number; clockOut: number | null };

function mondayStart(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

async function loadWeek(employeeId: string) {
  const weekStart = mondayStart();
  const rows = await getD1().prepare(`
    SELECT id, clock_in AS clockIn, clock_out AS clockOut
    FROM shifts
    WHERE employee_id = ? AND clock_in >= ?
    ORDER BY clock_in ASC
  `).bind(employeeId, weekStart).all<ShiftRow>();
  return rows.results;
}

export async function GET(request: Request) {
  try {
    const employee = await getEmployeeSession(request);
    if (!employee) return Response.json({ error: "Sign in required." }, { status: 401 });
    return Response.json({ employee, shifts: await loadWeek(employee.id), weekStart: mondayStart() });
  } catch (error) {
    console.error("Timesheet load failed", error);
    return Response.json({ error: "Timesheet is temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const employee = await getEmployeeSession(request);
    if (!employee) return Response.json({ error: "Sign in required." }, { status: 401 });
    const body = await request.json() as { action?: "clock_in" | "clock_out" };
    const db = getD1();
    const active = await db.prepare(`
      SELECT id, clock_in AS clockIn, clock_out AS clockOut
      FROM shifts WHERE employee_id = ? AND clock_out IS NULL
      ORDER BY clock_in DESC LIMIT 1
    `).bind(employee.id).first<ShiftRow>();
    const now = Date.now();

    if (body.action === "clock_in") {
      if (active) return Response.json({ error: "You are already clocked in." }, { status: 409 });
      await db.prepare("INSERT INTO shifts (id, employee_id, clock_in) VALUES (?, ?, ?)").bind(crypto.randomUUID(), employee.id, now).run();
    } else if (body.action === "clock_out") {
      if (!active) return Response.json({ error: "There is no active shift to clock out." }, { status: 409 });
      await db.prepare("UPDATE shifts SET clock_out = ? WHERE id = ? AND employee_id = ? AND clock_out IS NULL").bind(now, active.id, employee.id).run();
    } else {
      return Response.json({ error: "Choose clock in or clock out." }, { status: 400 });
    }

    return Response.json({ employee, shifts: await loadWeek(employee.id), weekStart: mondayStart() });
  } catch (error) {
    console.error("Clock action failed", error);
    return Response.json({ error: "The clock action could not be saved." }, { status: 500 });
  }
}
