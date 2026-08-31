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

## Dashboard environment

Configure the dashboard Vercel project with its production Convex values and:

```dotenv
NEXT_PUBLIC_ROOT_DOMAIN=opus.mk
```

Configure the production Convex deployment, not the browser bundle, with:

```dotenv
SITE_URL=https://studio.opus.mk
AUTH_TRUSTED_ORIGINS=https://studio.opus.mk
```

The public tenant websites do not run Better Auth and do not need to be trusted auth origins. Keep all other secrets in the appropriate Vercel or Convex environment; never commit them.

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

1. Deploy `opus-landing/` and confirm `https://opus.mk` serves the landing page.
2. Deploy `opus-dashboard/` with the production environment and confirm `https://studio.opus.mk/login`.
3. Attach `*.opus.mk` to the dashboard project, complete Vercel nameserver setup, and confirm the wildcard certificate was issued.
4. Confirm a random, unpublished subdomain returns the safe unavailable page rather than dashboard content.
5. Publish one real test studio from the dashboard and open its `{slug}.opus.mk` homepage.
6. Complete a guest booking and verify it appears once in that studio's calendar.
7. Confirm the test studio did not become marketplace-published.

DNS and Vercel project configuration are external deployment steps. Repository changes alone do not perform them.
