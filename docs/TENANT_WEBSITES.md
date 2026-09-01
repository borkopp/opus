# Tenant website deployment

This is the deployment contract for automatic OPUS studio websites.

## Topology

Use two Vercel projects:

| Vercel project root | Domains                       | Purpose                                            |
| ------------------- | ----------------------------- | -------------------------------------------------- |
| `opus-landing/`     | `opus.mk`, `www.opus.mk`      | Marketing site                                     |
| `opus-dashboard/`   | `studio.opus.mk`, `*.opus.mk` | Authenticated dashboard and public tenant websites |

Do not create a Vercel project, DNS record, or certificate for each studio. Once the wildcard is configured, publishing only changes Convex state; `{slug}.opus.mk` is available automatically through the existing wildcard.

`opus-mk/` remains a dormant marketplace package and is not part of this topology. A Hetzner VPS is not required for the two active web projects once Vercel has provisioned the domains and wildcard certificate.

## Create the dashboard project

Import the repository as a separate Vercel project with these settings:

| Setting          | Value             |
| ---------------- | ----------------- |
| Root Directory   | `opus-dashboard`  |
| Framework Preset | Next.js           |
| Node.js          | `24.x`            |
| Output Directory | Framework default |

Do not set a dashboard Build or Install override. [`opus-dashboard/vercel.json`](../opus-dashboard/vercel.json) is the committed source of truth and runs:

```text
npm ci
npx convex deploy --cmd 'npm run build'
```

The Convex command injects both `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` for the selected deployment, builds the Next.js application, and only then publishes the matching Convex functions. A failed frontend build therefore does not publish a partial backend release.

## Dashboard environment

Create a production deploy key from the production Convex deployment with `deployment:deploy` permission. Store it as a **Production-only** secret in the dashboard Vercel project:

```dotenv
CONVEX_DEPLOY_KEY=<production-deploy-key>
NEXT_PUBLIC_ROOT_DOMAIN=opus.mk
```

Do not manually add `NEXT_PUBLIC_CONVEX_URL` or `NEXT_PUBLIC_CONVEX_SITE_URL` in Vercel; the build command supplies the canonical values. `NEXT_PUBLIC_MAPBOX_TOKEN` is optional and only enables the map UI.

If Vercel Preview deployments are enabled, create a separate Convex **Preview Deploy Key** and store it as Preview-only `CONVEX_DEPLOY_KEY`. Never expose the production deploy key to Preview. Preview deployments use isolated Convex data and require their own default Convex environment configuration before authentication or email flows will work.

Configure the production Convex deployment, not the Vercel browser/runtime environment, with:

```dotenv
SITE_URL=https://studio.opus.mk
BETTER_AUTH_SECRET=<long-random-secret>
BOOKING_OTP_SECRET=<separate-long-random-secret>
AUTH_EMAIL_MODE=resend
AUTH_TRUSTED_ORIGINS=https://studio.opus.mk
RESEND_API_KEY=<resend-api-key>
AUTH_EMAIL_FROM=noreply@opus.mk
```

From `opus-dashboard/`, non-secret values can be set explicitly against production:

```bash
npx convex env set --prod SITE_URL https://studio.opus.mk
npx convex env set --prod AUTH_TRUSTED_ORIGINS https://studio.opus.mk
npx convex env set --prod AUTH_EMAIL_MODE resend
```

For secret values, omit the value and enter it interactively so it does not enter shell history:

```bash
npx convex env set --prod BETTER_AUTH_SECRET
npx convex env set --prod BOOKING_OTP_SECRET
npx convex env set --prod RESEND_API_KEY
```

`AUTH_TEST_OTP` and `ALLOW_DEV_DATA` must be absent from production. The public tenant websites do not run Better Auth and do not need to be trusted auth origins. Keep optional/deferred provider secrets out of production unless the corresponding feature is explicitly activated and verified.

## Vercel and Cloudflare

Vercel's wildcard-domain flow requires Vercel nameservers. For the exact address model in this repository, `*.opus.mk` is an apex wildcard. Vercel explicitly says not to use its `_acme-challenge` external-DNS workaround for that case. Do not add an ordinary wildcard CNAME in Cloudflare and assume Vercel TLS will work.

The preferred no-VPS path is therefore:

1. inventory and recreate every DNS record that must be preserved, especially mail and verification records;
2. move authoritative nameservers for `opus.mk` to the exact Vercel nameservers shown in the Vercel dashboard;
3. keep `opus.mk` and `www.opus.mk` assigned to the landing project;
4. assign `studio.opus.mk` and `*.opus.mk` to the dashboard project;
5. verify resolution and certificate issuance before switching production traffic.

If `opus.mk` is registered through Cloudflare Registrar, or Cloudflare authority otherwise cannot be moved, stop before changing DNS. Cloudflare Registrar requires Cloudflare nameservers, while Vercel does not support the external-DNS workaround for this apex wildcard. In that case the no-VPS alternative is a separately validated Cloudflare Workers deployment; the other fallback is the existing VPS. Neither fallback is configured by this repository change.

- [Vercel: add and configure domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Vercel: wildcard domain without Vercel nameservers](https://vercel.com/kb/guide/wildcard-domain-without-vercel-nameservers)
- [Vercel: Cloudflare with Vercel](https://vercel.com/kb/guide/cloudflare-with-vercel)
- [Cloudflare Registrar nameserver requirement](https://developers.cloudflare.com/registrar/get-started/register-domain/)

Vercel also advises against placing Cloudflare's reverse proxy in front of Vercel. Do not use that as a wildcard-certificate workaround. Do not use the removed in-app custom-domain settings; OPUS subdomains are the only active tenant-domain model.

## Release checklist

1. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` from `opus-dashboard/`.
2. Confirm the production Convex environment contains every required variable above and does not contain either development-only variable.
3. Deploy `opus-landing/` and confirm `https://opus.mk` serves the landing page.
4. Deploy `opus-dashboard/` with the production deploy key and confirm `https://studio.opus.mk/login`.
5. Sign in through the real Resend OTP path and confirm the dashboard loads for an authorized staff member.
6. Attach `*.opus.mk` to the dashboard project, complete Vercel nameserver setup, and confirm the wildcard certificate was issued.
7. Confirm a random, unpublished subdomain returns the safe unavailable page rather than dashboard content.
8. Publish one real test studio from the dashboard and open its `{slug}.opus.mk` homepage.
9. Complete a guest booking and verify it appears once in that studio's calendar and that expected emails leave the notification queue.
10. Confirm the test studio did not become marketplace-published.

DNS and Vercel project configuration are external deployment steps. Repository changes alone do not perform them.
