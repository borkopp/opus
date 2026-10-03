# Account OTP abuse protection

Account sign-in and signup use the same Better Auth OTP flow. Requesting a code
does not create an account. Sending protection is enforced in Convex before the
email provider is called.

## Policy

- Explicit database-backed rate limiting is enabled regardless of `NODE_ENV`.
- Code requests allow 3 attempts per client IP per 60 seconds, across recipients.
- OTP verification allows 5 attempts per client IP per 60 seconds, in addition to
  the existing 5 attempts per OTP and 5-minute expiry.
- CAPTCHA is exempt only for IP countries `MK` (North Macedonia), `RS` (Serbia),
  and `AL` (Albania). All other countries and unknown locations require Turnstile.
- IP country is approximate. A VPN is treated according to its exit IP's country.
  This exemption does not establish nationality or prevent bots using those IPs.
- Browser locale, phone number, and submitted country headers cannot grant the
  exemption. Vercel's location is signed by the Next.js server; Convex verifies
  the signature, body, CAPTCHA token, route, hostname, and 60-second lifetime.
- Direct unsigned requests to Convex's code-sending and OTP sign-in endpoints are
  rejected. Other unsigned auth requests cannot choose their rate-limit IP.
- Foreign code requests validate tokens with Cloudflare Siteverify, requiring a
  matching hostname and the `auth-otp` action. Tokens are single-use. Provider
  failure or missing configuration blocks a send rather than skipping CAPTCHA.

This applies to account OTP emails. Guest appointment verification uses its own
existing booking flow and is not changed by this protection.

## Configuration and activation

Turnstile works without Cloudflare DNS or CDN. Keep OPUS's current hosting and
DNS. Create a Managed Turnstile widget with `studio.opus.mk` as an allowed hostname.
Add only additional real auth hosts that need to render this same account form.
Keep pre-clearance disabled; this integration validates the widget token directly.

| Environment variable   | Where                           | Purpose                                                                                     |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `TURNSTILE_SITE_KEY`   | Dashboard and owner Vercel      | Public widget key; returned by the uncached `/api/auth/security` endpoint                   |
| `TURNSTILE_SECRET_KEY` | Convex                          | Private Siteverify key; never sent to a browser                                             |
| `AUTH_PROXY_SECRET`    | Dashboard, owner Vercel, Convex | The same random secret of at least 32 characters, used to sign trusted location information |

The country policy and request signing are shared in `shared/auth-security.ts`.
Local development with a localhost frontend and localhost Convex `SITE_URL`
does not require production keys. Rate limiting still applies locally.
Non-local previews require their own configured keys and matching hostname.
Never put production secrets in `NEXT_PUBLIC_*`, source files, or command output.

Configure all keys before deploying this change. Coordinate the Next.js and
Convex releases: the hardened backend requires the signed requests from the new
frontend. Verify both sides after deployment; implementation and passing local
tests do not establish production protection.

## Validation

Run `npm test -- tests/auth-protection.test.ts tests/auth-rate-limit.test.ts`.
Tests cover the three exemptions, unknown and other countries, forged direct
requests, signed payload tampering and expiry, provider rejection and outage,
hostname/action checks, and real Better Auth rate-limit enforcement with an
isolated database and a mocked delivery provider. No test sends production email.

Live validation should confirm local-country requests omit CAPTCHA; other IP
countries require a real widget; a fourth request in a minute returns 429; direct
Convex requests are rejected; valid code verification and resend still work.

## Production configuration

The Cloudflare widget is **OPUS sign-in**, Managed, with `studio.opus.mk` and
`admin.opus.mk` as its hostnames and pre-clearance disabled. Its public site key is
`0x4AAAAAAFMcTk6y8MMiLtxt`. The Siteverify secret is configured only in Convex;
the shared proxy secret is configured in Convex and both Vercel projects.

Dashboard Vercel also has explicit `NEXT_PUBLIC_CONVEX_URL` and
`NEXT_PUBLIC_CONVEX_SITE_URL` pointing to `calm-dachshund-294`, so the frontend
can be released separately from a Convex push when coordinating auth changes.

The proxy materializes Vercel's incoming request using its URL, headers, and
body bytes. Passing that framework-wrapped request directly to the global
`Request` constructor fails its private-state check in the production runtime.
The regression test covers this request wrapper as well as body integrity.

Activation was verified on October 3, 2026: dashboard Vercel deployment
`dpl_6Cbz7QH63QyFXtkYynuZsKy9nzPt` and Convex `calm-dachshund-294`.
Live checks confirmed unsigned direct requests return 403; trusted MK, RS, and
AL requests skip CAPTCHA; other and unknown countries require it; invalid
provider tokens fail; Vercel country/IP spoofing cannot grant an exemption or
change the rate-limit bucket; the fourth request returns 429. A burst of 12
requests allowed three to reach CAPTCHA validation and rejected nine with 429.
Session reads returned 200 and the existing authenticated dashboard opened.
These checks used invalid email input and sent no email. Successful OTP sign-in
and resend were tested against an isolated database with mocked delivery;
a fresh production sign-in with a real code was not performed.

The private owner app uses the same policy and shared request-signing/widget
helpers. Its exact email allowlist and same-origin requirement remain enforced
before forwarding. Owner deployment `dpl_3u4jUqZSAgb3w3LtsPGx4pLUqm9b` was
verified with live disallowed-email/origin rejection, CAPTCHA rejection, invalid
OTP rejection, and anonymous analytics rejection. The Managed widget rendered
and completed its automatic check on the owner login form. Fifteen owner tests
passed, including proxy signature and existing access-boundary checks.

Source changes remain in the working tree. Preserve these auth files when
making the next Git-based release; the direct deployment does not commit them.

References: [Vercel request headers](https://vercel.com/docs/headers/request-headers),
[Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/),
[server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
