# Drive4Pro4TV

Video-learning companion for Fountain Driving School, using the original red, black, and white Drive4Pro4TV design.

## Live website

[drive4pro4tv.com](https://drive4pro4tv.com)

The application is deployed as a Vinext/Vite Cloudflare Worker through OpenAI Sites. Both `drive4pro4tv.com` and `www.drive4pro4tv.com` point to the same production deployment.

## Public-site scope

- Drive4Pro4TV YouTube learning resources
- Driving topics for new and experienced drivers
- Every appointment button navigates to https://fountaindrivingschooltx.com/request-an-appointment/
- No published prices or local booking/payment form

The legacy `/api/bookings` endpoint returns `410 Gone` so booking requests cannot be created through this site. Fountain Driving School handles official appointments on its own website.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

The employee portal retains email/password authentication, clock-in/out, and weekly timesheets backed by D1. Production secrets are configured through the Sites hosting environment and are not stored in this repository.
