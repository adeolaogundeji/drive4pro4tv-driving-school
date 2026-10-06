# Drive4Pro4TV Learning Hub

Public video-learning companion for Fontaine Driving School. The site directs students and families to the Drive4Pro4TV YouTube channel and Fontaine's online-school resources.

## Live website

[drive4pro4tv.com](https://drive4pro4tv.com)

The application is deployed as a Vinext/Vite Cloudflare Worker through OpenAI Sites. Both `drive4pro4tv.com` and `www.drive4pro4tv.com` point to the same production deployment.

## Public-site scope

- Drive4Pro4TV YouTube learning resources
- Common driving topics, including parking, road awareness, and confidence behind the wheel
- Fontaine Driving School phone numbers, address, and online-school link
- No published prices, payments, lesson booking, or enrollment flow

The `/api/bookings` endpoint returns `410 Gone` so booking requests cannot be created through this site. Fontaine Driving School handles official classes, enrollment, scheduling, and services directly.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

The application retains its private employee timekeeping endpoints and D1 data for internal use. Production secrets are configured through the Sites hosting environment and are not stored in this repository.
