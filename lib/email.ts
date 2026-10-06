import { env } from "cloudflare:workers";

type SendEmailInput = {
  subject: string;
  html: string;
  replyTo?: string;
  idempotencyKey: string;
};

export type EmailResult =
  | { status: "sent"; providerId: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

export function notificationEmail() {
  return env.NOTIFICATION_EMAIL?.trim() || "drive4pro4tv@gmail.com";
}

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { status: "not_configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM?.trim() || "Drive4Pro4TV Website <onboarding@resend.dev>",
      to: [notificationEmail()],
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  const data = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok || !data.id) {
    return { status: "failed", error: data.message || data.name || `Email provider returned ${response.status}.` };
  }
  return { status: "sent", providerId: data.id };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}
