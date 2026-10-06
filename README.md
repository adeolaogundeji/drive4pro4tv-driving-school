# Drive4Pro4TV Driving School

Public website and employee timekeeping portal for Drive4Pro4TV Driving School.

## Live website

[drive4pro4tv-driving-school.ogundejiadeola0.chatgpt.site](https://drive4pro4tv-driving-school.ogundejiadeola0.chatgpt.site)

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

The public GitHub Pages site sends booking requests to the hosted `/api/bookings` endpoint. CORS is limited to `https://adeolaogundeji.github.io` plus local preview origins.

## Weekly employee report

The Site exposes the MCP tool `send_weekly_timesheet_report`. A linked cloud schedule should call it every Monday at 8:00 AM America/Chicago. The tool summarizes the previous Monday through Sunday from D1, emails the configured recipient, and records the result in `report_runs`. Successfully sent periods are idempotent and will not send twice.
