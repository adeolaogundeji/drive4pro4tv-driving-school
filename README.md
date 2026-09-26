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
