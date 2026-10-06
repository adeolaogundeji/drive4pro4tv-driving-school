import { getD1 } from "@/db";
import { escapeHtml, sendEmail } from "@/lib/email";

type ShiftReportRow = {
  employeeId: string;
  fullName: string;
  email: string;
  clockIn: number;
  clockOut: number | null;
};

const REPORT_TIME_ZONE = "America/Chicago";

function zonedParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function chicagoMidnightUtc(year: number, month: number, day: number) {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = zonedParts(guess);
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    guess += target - represented;
  }
  return guess;
}

export function previousChicagoWeek(now = Date.now()) {
  const parts = zonedParts(now);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const currentLocalDate = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const daysSinceMonday = (weekdayIndex + 6) % 7;
  const thisMondayDate = new Date(currentLocalDate - daysSinceMonday * 86_400_000);
  const previousMondayDate = new Date(thisMondayDate.getTime() - 7 * 86_400_000);
  const periodStart = chicagoMidnightUtc(previousMondayDate.getUTCFullYear(), previousMondayDate.getUTCMonth() + 1, previousMondayDate.getUTCDate());
  const periodEnd = chicagoMidnightUtc(thisMondayDate.getUTCFullYear(), thisMondayDate.getUTCMonth() + 1, thisMondayDate.getUTCDate());
  return { periodStart, periodEnd };
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", { timeZone: REPORT_TIME_ZONE, month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp));
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", { timeZone: REPORT_TIME_ZONE, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(timestamp));
}

export async function sendWeeklyTimesheetReport() {
  const { periodStart, periodEnd } = previousChicagoWeek();
  const db = getD1();
  const prior = await db.prepare("SELECT status, provider_id AS providerId FROM report_runs WHERE report_type = ? AND period_start = ? AND status = 'sent' LIMIT 1").bind("weekly_timesheet", periodStart).first<{ status: string; providerId: string | null }>();
  if (prior) return { status: "already_sent", periodStart, periodEnd, providerId: prior.providerId };

  const results = await db.prepare(`
    SELECT employees.id AS employeeId, employees.full_name AS fullName, employees.email,
           shifts.clock_in AS clockIn, shifts.clock_out AS clockOut
    FROM employees
    LEFT JOIN shifts ON shifts.employee_id = employees.id
      AND shifts.clock_in >= ? AND shifts.clock_in < ?
    ORDER BY employees.full_name, shifts.clock_in
  `).bind(periodStart, periodEnd).all<ShiftReportRow>();
  const rows = results.results ?? [];
  const employees = new Map<string, { fullName: string; email: string; shifts: ShiftReportRow[] }>();
  for (const row of rows) {
    const entry = employees.get(row.employeeId) ?? { fullName: row.fullName, email: row.email, shifts: [] };
    if (row.clockIn != null) entry.shifts.push(row);
    employees.set(row.employeeId, entry);
  }

  const employeeSections = [...employees.values()].map((employee) => {
    const totalHours = employee.shifts.reduce((sum, shift) => sum + Math.max(0, ((shift.clockOut ?? periodEnd) - shift.clockIn) / 3_600_000), 0);
    const shiftRows = employee.shifts.length ? employee.shifts.map((shift) => `<tr><td style="padding:7px;border-bottom:1px solid #eee">${escapeHtml(formatDateTime(shift.clockIn))}</td><td style="padding:7px;border-bottom:1px solid #eee">${shift.clockOut ? escapeHtml(formatDateTime(shift.clockOut)) : "Open shift"}</td><td style="padding:7px;border-bottom:1px solid #eee;text-align:right">${Math.max(0, ((shift.clockOut ?? periodEnd) - shift.clockIn) / 3_600_000).toFixed(2)}h</td></tr>`).join("") : `<tr><td colspan="3" style="padding:10px;color:#777">No shifts recorded.</td></tr>`;
    return `<section style="margin:24px 0"><h2 style="font-size:18px;margin-bottom:4px">${escapeHtml(employee.fullName)} — ${totalHours.toFixed(2)} hours</h2><p style="color:#666;margin-top:0">${escapeHtml(employee.email)}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:7px;text-align:left">Clock in</th><th style="padding:7px;text-align:left">Clock out</th><th style="padding:7px;text-align:right">Hours</th></tr></thead><tbody>${shiftRows}</tbody></table></section>`;
  }).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:760px;color:#171717"><h1>Drive4Pro4TV weekly employee hours</h1><p>${escapeHtml(formatDate(periodStart))} through ${escapeHtml(formatDate(periodEnd - 1))}</p>${employeeSections || "<p>No employee accounts were found.</p>"}</div>`;
  const email = await sendEmail({
    idempotencyKey: `weekly-timesheet/${new Date(periodStart).toISOString().slice(0, 10)}`,
    subject: `Drive4Pro4TV employee hours — week of ${formatDate(periodStart)}`,
    html,
  });
  const reportId = crypto.randomUUID();
  await db.prepare("INSERT INTO report_runs (id, report_type, period_start, period_end, status, provider_id) VALUES (?, ?, ?, ?, ?, ?)").bind(reportId, "weekly_timesheet", periodStart, periodEnd, email.status, email.status === "sent" ? email.providerId : null).run();
  return { ...email, periodStart, periodEnd, employeeCount: employees.size };
}
