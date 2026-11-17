# Contact form protection

The existing `POST /api/consultation` validates the reviewed draft, consent, honeypot, body size and request origin, then verifies Cloudflare Turnstile and a shared Upstash Redis budget before calling Brevo. Homepage rendering, navigation, social links and the direct email link do not depend on Redis.

## Required production configuration

Set these in the existing Vercel project's **Production** environment before deploying:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public key of the owner's widget; embedded during the Next.js build. |
| `TURNSTILE_SECRET` | Private secret belonging to that same widget. |
| `TURNSTILE_HOSTNAMES` | Exact frontend hostname allowlist, initially `abrillatallada.uy`. No scheme, path, wildcard or localhost. |
| `UPSTASH_REDIS_REST_URL` | HTTPS REST origin of the owner's Upstash database. |
| `UPSTASH_REDIS_REST_TOKEN` | Its private Standard token, with write permission. |
| `RATE_LIMIT_HASH_SECRET` | Private random value of at least 32 characters for HMAC IP identifiers. |

The existing Brevo variables remain necessary. No secret belongs in a `NEXT_PUBLIC_` variable, Git, a screenshot or chat. The public Site Key is safe to publish. Restart/redeploy after environment changes; the public key requires a new build. Keep production credentials out of Preview deployments. A deployment without required security configuration blocks sending rather than bypassing protection.

The owner creates the Turnstile widget at the Cloudflare **account** level, with Managed mode, no pre-clearance, and the actual site hostname. Turnstile does not require changing DNS or enabling Cloudflare's proxy. A local real-widget test may additionally register `localhost` and `127.0.0.1`; those belong only in a development backend's hostname allowlist, never Production.

## Free services and availability

Create a database through the owner's [Upstash Console](https://console.upstash.com), explicitly choosing **Free ($0)** without a payment method. Do not use the anonymous three-day database for production. Free currently includes 500,000 Redis commands per month. An EVAL request can execute multiple Redis commands; it is not equivalent to one form submission. Adding a first payment method upgrades free resources in that account to paid plans, so keep the account without a card for this setup.

A Free database may be archived after at least 30 days without activity, after warning emails. Upstash retains a backup that can be restored into a new database; update its REST URL/token in Vercel and redeploy if they change. An archived database, an exhausted quota, a bad credential or a provider outage temporarily stops form sending. It does not stop the website. The draft and manual email contact remain available. This change does not subscribe to paid services or bypass provider quotas.

## Verification and limits

The review dialog loads the canonical Turnstile script only when needed. It keeps the token outside the draft and idempotency fingerprint, disables sending until verified, and resets the widget after each attempt. Closing a dialog removes its widget. Narrow screens use the compact widget so it fits without horizontal overflow.

Server verification requires a successful Siteverify response, action exactly `consultation`, and an exact configured hostname. Test keys and loopback hostnames are rejected in production. The backend uses the Vercel-provided `x-vercel-forwarded-for` header, validates/normalizes a single IP, and never accepts a visitor-supplied body IP or an alternative forwarding header. Local development uses a loopback identifier only for a loopback request; Turnstile and Redis verification are still required.

After verification, one Redis Lua script atomically applies:

| Budget | Maximum | Fixed window |
| --- | --- | --- |
| Per IP identifier | 5 attempts | 15 minutes |
| Whole form | 30 attempts | 1 hour |
| Whole form | 100 attempts | 24 hours |

Windows begin at the first admitted attempt. Accepted security checks count even if Brevo later fails. Denied attempts do not consume the other counters. Budgets are shared across Vercel instances. Preview deployments using the same database/prefix share them too, which is why production credentials should stay Production-only.

Redis stores HMAC-derived IP identifiers, a SHA-256 digest for each consumed verification token, and short-lived counters. It never receives the name, phone, message, email content or raw IP/token. A token-consumption marker lasts ten minutes and is checked atomically with the budgets, preventing immediate token replays even while Cloudflare's own token-reuse state converges. The existing stable Brevo idempotency UUID remains separate and survives legitimate retries with fresh verification tokens.

Rate denials return 429 with `Retry-After`; invalid/replayed verification returns 403. Configuration, verification-service and counter-service errors return 503. These are deliberate closed failures. They preserve the visitor's draft and offer the manual email route rather than sending without verification.

## Diagnostics

Security-related 503 responses produce the private `consultation_delivery_failed` event with `reason: security` and optional `securityStage` (`configuration`, `client_ip`, `turnstile` or `redis`) and numeric `securityProviderStatus`. These fields are not returned to the browser. Normal 403/429 rejections are not logged to avoid amplifying abusive traffic into logs. No credentials, provider body, personal fields or raw IP/token are logged.

An IP allowlist on the Brevo account controls which servers may use API credentials. It does not stop a bot from calling the public form on an already-authorized server. The owner chose to use these application controls with a restricted Brevo API key rather than buy fixed outbound IPs. Changing Brevo's account-wide IP blocking affects other API integrations and remains an owner-controlled setting.

Application controls reduce form abuse; they are not a promise against all traffic attacks or hosting usage. Vercel's platform-level protections remain separate.

## Verification

`npm run check` includes mocked service-boundary tests for rejected/expired tokens, exact action/hostname checks, configuration errors, trusted IP handling, shared-budget denials, dependency failures and privacy. These do not prove real provider acceptance or inbox delivery.

For real Redis semantics, start an isolated test-only Redis container named `codex-abril-*`, then run:

```sh
CONSULTATION_REDIS_TEST_CONTAINER=codex-abril-contact-test npm run test:limits
```

The integration suite uses unique test namespaces without flushing any database. It exercises concurrent IP/global limits, token replay, expiry and malformed counter state. Stop the disposable container afterward. A real production check additionally requires a fresh real Turnstile token and verified mail acceptance; do not report dummy-key or mocked checks as that result.

## Primary references

- [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)
- [Turnstile widget setup](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)
- [Server-side Siteverify and token replay](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for)
- [Upstash Redis pricing](https://upstash.com/pricing/redis)
- [Upstash Free quota errors](https://upstash.com/docs/redis/troubleshooting/max_requests_limit)
- [Upstash inactivity and archival](https://upstash.com/docs/redis/help/faq)
- [Upstash payment-method changes](https://upstash.com/docs/common/account/add-payment-method)
- [Brevo IP security](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security)
