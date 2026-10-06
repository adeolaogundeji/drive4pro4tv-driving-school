import { getD1 } from "@/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { formatProgramPrice, getDrivingProgram } from "@/lib/programs";

const GITHUB_PAGES_ORIGIN = "https://adeolaogundeji.github.io";
const LOCAL_ORIGINS = new Set(["http://127.0.0.1:8765", "http://localhost:8765"]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = origin === GITHUB_PAGES_ORIGIN || LOCAL_ORIGINS.has(origin) ? origin : "";
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 20_000) return Response.json({ error: "Booking details are too large." }, { status: 413, headers });

    const body = await request.json() as {
      programId?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      appointmentStart?: string;
      notes?: string;
      website?: string;
    };
    if (body.website) return Response.json({ ok: true }, { status: 201, headers });

    const program = getDrivingProgram(body.programId?.trim() ?? "");
    const customerName = body.customerName?.trim() ?? "";
    const customerEmail = body.customerEmail?.trim().toLowerCase() ?? "";
    const customerPhone = body.customerPhone?.trim() ?? "";
    const notes = body.notes?.trim().slice(0, 1000) ?? "";
    const appointmentStart = Date.parse(body.appointmentStart ?? "");

    if (!program) return Response.json({ error: "Choose a valid driving program." }, { status: 400, headers });
    if (customerName.length < 2 || customerName.length > 100) return Response.json({ error: "Enter your full name." }, { status: 400, headers });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 160) return Response.json({ error: "Enter a valid email address." }, { status: 400, headers });
    if (customerPhone.length < 7 || customerPhone.length > 40) return Response.json({ error: "Enter a valid phone number." }, { status: 400, headers });
    if (!Number.isFinite(appointmentStart) || appointmentStart <= Date.now()) return Response.json({ error: "Choose a future appointment date and time." }, { status: 400, headers });

    const id = crypto.randomUUID();
    const db = getD1();
    await db.prepare(`
      INSERT INTO bookings (
        id, program_id, program_name, price_cents, duration_minutes,
        customer_name, customer_email, customer_phone, appointment_start, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      program.id,
      program.title,
      program.priceCents,
      program.durationMinutes,
      customerName,
      customerEmail,
      customerPhone,
      appointmentStart,
      notes,
    ).run();

    const appointmentLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(appointmentStart));
    const email = await sendEmail({
      idempotencyKey: `booking/${id}`,
      replyTo: customerEmail,
      subject: `New booking request: ${program.title} — ${customerName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#171717">
        <h1 style="font-size:24px">New Drive4Pro4TV booking request</h1>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#666">Customer</td><td style="padding:8px 0;font-weight:700">${escapeHtml(customerName)}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0">${escapeHtml(customerEmail)}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Phone</td><td style="padding:8px 0">${escapeHtml(customerPhone)}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Program</td><td style="padding:8px 0">${escapeHtml(program.title)}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Price</td><td style="padding:8px 0">${formatProgramPrice(program.priceCents)}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Requested time</td><td style="padding:8px 0">${escapeHtml(appointmentLabel)}</td></tr>
        </table>
        ${notes ? `<h2 style="font-size:18px">Notes</h2><p>${escapeHtml(notes).replace(/\n/g, "<br>")}</p>` : ""}
        <p style="margin-top:24px;color:#666">Booking ID: ${id}</p>
      </div>`,
    });
    await db.prepare("UPDATE bookings SET email_status = ? WHERE id = ?").bind(email.status, id).run();

    return Response.json({
      booking: {
        id,
        program: program.title,
        priceCents: program.priceCents,
        appointmentStart,
        status: "pending",
      },
      emailStatus: email.status,
    }, { status: 201, headers });
  } catch (error) {
    console.error("Booking creation failed", error);
    return Response.json({ error: "The booking could not be saved. Please try again." }, { status: 500, headers });
  }
}
