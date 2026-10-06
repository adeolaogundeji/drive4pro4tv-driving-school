# Drive4Pro4TV Driving School

Public website and employee timekeeping portal for Drive4Pro4TV Driving School.

## Live website

[drive4pro4tv.com](https://drive4pro4tv.com)

The application is deployed as a Vinext/Vite Cloudflare Worker through OpenAI
Sites. The Sites project owns the production D1 binding, runtime secrets, MCP
endpoint, and weekly report schedule. `drive4pro4tv.com` and
`www.drive4pro4tv.com` are custom hostnames on that same deployment so employee
accounts, bookings, shifts, and report history remain in one database.

## Features

- Responsive public website for prospective driving students
- Employee registration and email/password authentication
- Secure password hashing and persistent sessions
- Clock-in and clock-out tracking
- Weekly timesheets backed by Cloudflare D1
- Private company access code for employee registration

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Create a local `.dev.vars` file when testing employee registration:

```env
EMPLOYEE_SIGNUP_CODE=your-private-company-code
```

Production secrets are configured through the Sites hosting environment and are not stored in this repository.

## Booking and email delivery

Bookings are written to the production D1 `bookings` table before email delivery is attempted. Configure these Site runtime variables:

- `NOTIFICATION_EMAIL`: recipient for new bookings and weekly employee reports.
- `EMAIL_FROM`: verified Resend sender, or `Drive4Pro4TV Website <onboarding@resend.dev>` while testing with the Resend account owner.
- `RESEND_API_KEY`: secret Resend API key.

The production site submits booking requests to its same-origin `/api/bookings`
endpoint. The legacy GitHub Pages frontend is also accepted by CORS during the
DNS transition.

## Weekly employee report

The Site exposes the MCP tool `send_weekly_timesheet_report`. A linked cloud schedule should call it every Monday at 8:00 AM America/Chicago. The tool summarizes the previous Monday through Sunday from D1, emails the configured recipient, and records the result in `report_runs`. Successfully sent periods are idempotent and will not send twice.
