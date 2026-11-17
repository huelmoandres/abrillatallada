# Consultation email

The website submits a reviewed consultation to `POST /api/consultation`. The server sends one transactional email through Brevo to the configured recipient, initially `dra.latallada@gmail.com`. It does not add the visitor to a marketing list or send an automatic reply to them.

## Environment

Copy `.env.example` to an ignored `.env.local` for local sending, or set the following in the intended Vercel project's Environment Variables:

| Variable | Value / purpose |
| --- | --- |
| `SITE_URL` | `https://abrillatallada.uy`; public origin for links and the email logo. |
| `BREVO_API_KEY` | Dedicated restricted Brevo API key with Transactional emails: All. Server only; no `NEXT_PUBLIC_` prefix. |
| `BREVO_SENDER_EMAIL` | Defaults to the owner's configured `consultas@abrillatallada.uy`; override after authenticating the domain and adding the desired sender in Brevo. |
| `BREVO_SENDER_NAME` | `Abril Latallada D’Elias`. |
| `CONSULTATION_TO_EMAIL` | `dra.latallada@gmail.com`; the browser cannot choose recipients. |

Use production-only credentials in Vercel's Production environment. Leave Preview credentials unset or use a separate test key and an inbox you control. Restart the local server or redeploy after updating environment variables. Never put a real key in `.env.example`, a Git commit, a screenshot or the browser bundle. An API key is different from a Brevo SMTP key.

The API fails safely if its key is missing or its configuration is invalid. The visitor's draft remains available and the confirmed email provides a direct fallback. Brevo may deactivate a key after 90 days without a successful API call, even if its expiry is set to none.

## Domain and sender setup

1. In Brevo, add/authenticate `abrillatallada.uy` under Settings > Senders, Domains, IPs > Domains (the new domain-setup flow may use different navigation).
2. Add the exact verification/DKIM/DMARC records supplied by Brevo in Cloudflare. Records vary by account; do not copy example values. Keep the existing website records and any existing valid email records.
3. Confirm the authenticated state in Brevo, then add the sender `consultas@abrillatallada.uy` with the professional name. Senders on an authenticated domain are verified automatically.

Receiving mail at that address is separate from authenticating it for sending. To forward `consultas@abrillatallada.uy` to Gmail, onboard the domain in Cloudflare Email Routing, add and verify `dra.latallada@gmail.com` as a destination, and create an address rule for `consultas`. Complete the routing DNS setup shown by Cloudflare. Email Routing creates a forwarding address, not a standalone mailbox.

The website notification itself goes directly to `CONSULTATION_TO_EMAIL`, so it does not rely on that forwarding rule. The form collects a Uruguayan mobile number with a fixed `+598` prefix. `091383578` and `91383578` both normalize to `+59891383578`. A single Zod schema validates form and API data, while React Hook Form manages the fields and errors. The phone is included in the notification without inventing a visitor email or a `Reply-To` address.

## Email design

`src/lib/email/consultation-template.ts` returns HTML and plain text. The HTML uses presentation tables, inline styles, a light sage/paper palette and system fonts for mail-client compatibility. The logo is loaded from the absolute HTTPS address `/brand/logo-dark.png` on `SITE_URL`; the professional name remains text when a mail client blocks images. Visitor content is escaped before insertion.

## Delivery and abuse controls

The endpoint validates fields, consent, known topics, content type, body size, a blank honeypot and a same-origin browser request before contacting Brevo. The sender, recipient and API credentials come from server configuration. It uses a bounded request timeout and does not retry automatically. A stable UUID is passed in Brevo's JSON `headers.idempotencyKey` for retries of an unchanged consultation.

These request checks are not a distributed rate limiter or a CAPTCHA: a determined caller can forge an Origin header and leave a honeypot blank. For the public production deployment, configure a Vercel Firewall rate-limiting rule for `POST /api/consultation` according to the account's available features. Further bot protection can be added if needed. No process-memory limiter is presented as global protection across serverless instances.

Only Brevo's accepted response is treated as success; that is not a guarantee of delivery to the inbox. Check Brevo Transactional > Email logs to confirm actual delivery. Provider errors and keys are never returned to the visitor, and the app does not log the consultation body.

## Verification

Run `npm run check` and `npm run build`. Offline tests mock the Brevo transport, verify validation and rejection paths, and inspect the branded HTML/plain-text payload without sending mail. A real delivery test requires an authenticated sender and a configured API key; do not report a mock test as a real email delivery.

## Primary references

- [Brevo transactional endpoint](https://developers.brevo.com/reference/send-transac-email)
- [Brevo API key permissions](https://help.brevo.com/hc/en-us/articles/40158277171474-About-API-key-permissions)
- [Brevo domain authentication](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC)
- [Brevo senders](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email)
- [Brevo idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails)
- [Cloudflare email routing](https://developers.cloudflare.com/email-service/get-started/route-emails/)
