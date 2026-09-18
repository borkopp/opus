# OPUS Meta Pixel setup

Implementation is local until deployed. Use **one Meta web Pixel / Dataset ID** for the landing and studio applications. This ID is public; no Meta developer app, Instagram API token, Conversions API access token, or business verification is needed just to install this browser Pixel.

## Connect the business assets

Meta changes navigation labels by account. The paths below describe the normal Business Suite / Business Settings flow; reuse existing OPUS assets instead of creating duplicates.

1. Sign in to [Meta Business Suite](https://business.facebook.com/) with the Facebook account that will administer OPUS. Create or select the **OPUS business portfolio**.
2. In **Settings → Accounts → Pages** (sometimes **Business assets → Add assets**), add the existing OPUS Facebook Page or create one. A Facebook Page is the business identity for this Ads Manager setup; it does not need a separate content campaign.
3. In Instagram, open the OPUS profile → menu → **Settings and activity → Account type and tools → Switch to professional account**. Choose **Business** if it is currently personal. Add `https://opus.mk` under profile links.
4. In Business Settings, choose **Accounts → Instagram accounts → Add** and sign in to the OPUS Instagram account. Connect it to the OPUS Facebook Page, and confirm the link under the Page's **Settings → Linked accounts → Instagram** if requested. Give your administrator access to both assets.
5. Under **Accounts → Ad accounts**, add the existing ad account or create **OPUS Ads** for your business. Choose the billing currency and Skopje time zone carefully. Assign yourself access, and connect the Page and Instagram account to the ad account where Meta offers that option. Add a payment method in **Billing & payments** before publishing ads.

## Create the Pixel and copy its ID

1. Open [Events Manager](https://business.facebook.com/events_manager2/), in the OPUS portfolio.
2. First check **Data sources / Datasets** for an existing OPUS website Pixel.
3. If none exists, click **Connect data → Web → Connect**. Name the dataset **OPUS Website** and enter `https://opus.mk` when asked for the website.
4. Choose the **Meta Pixel / browser** connection and **Install code manually**. Some versions offer Pixel and Conversions API together; choose manual browser setup and leave server integration for later.
5. Open the website dataset's **Settings**. Copy the numeric **Dataset ID / Pixel ID**. Confirm it matches the number inside `fbq('init', '...')` in its browser installation instructions. Do not use a Page, Instagram, business portfolio, ad account, or developer App ID.
6. In dataset settings or **Business Settings → Data sources → Datasets → Connected assets**, assign the **OPUS Ads** ad account and give your administrator access. If the data-source controls are unavailable, check that you have full control of this portfolio.
7. Leave **automatic advanced matching** and **automatic events without code** off. OPUS emits the registration event explicitly; an Event Setup Tool rule for the same event would duplicate it.

No additional Pixel script should be pasted into the site, Google Tag Manager, or another plugin. OPUS already includes the loader.

## Configure and deploy OPUS

In **both** Vercel projects (`opus-landing` and `opus-dashboard`), open **Settings → Environment Variables** and add:

```dotenv
NEXT_PUBLIC_META_PIXEL_ID=YOUR_NUMERIC_PIXEL_ID
```

Select **Production**. For local testing, add the same variable to each app's ignored `.env.local`. Empty or invalid values disable the Pixel. Preview hostnames are excluded deliberately; test on localhost with intercepted requests or on the intended production domain.

Redeploy both projects after setting the variable: `NEXT_PUBLIC_*` values are embedded at build time. The dashboard's existing Vercel build deploys Convex first, including the creation-status response needed by the new registration event. Include files outside the Vercel app root so both projects can import `shared/analytics/` (Vercel's **Include source files outside of the Root Directory** setting).

The existing PostHog token and host remain configured as before. Analytics and advertising are separate, off by default, and the shared consent cookie lasts up to 180 days across `opus.mk` and `studio.opus.mk`. Landing-page session replay is enabled after analytics consent, with input values masked, subject to the PostHog project recording settings. Dashboard session replay remains disabled. Do not put Meta access tokens in any `NEXT_PUBLIC_*` variable.

## Verify events before running the story ad

1. In Events Manager, select **OPUS Website → Test events**, enter `https://opus.mk`, and open it using Meta's test browser flow. Use a browser without a tracking blocker for this check.
2. Start with a fresh cookie choice. Before accepting, no Meta script or events should appear. **Necessary only** should keep Meta and PostHog off. Analytics-only should keep Meta off.
3. Enable **Advertising · Meta** and save. Expect **PageView** for the landing page. Navigation to `/pricing` should produce one additional PageView; changing the language or re-rendering the page should not duplicate it.
4. Follow **Start free** to `studio.opus.mk/signup`. The same consent choice and Pixel ID should apply there. Meta's first-party `_fbp` / `_fbc` cookies provide browser/ad-click continuity across the parent domain; verify their domain and the actual ad-click journey in the browser. Consent rejection and browser restrictions can limit attribution.
5. Verify a **new** business email, then save the studio name and category in onboarding. Expect one **CompleteRegistration**. This means the free studio has been created, not that all onboarding steps or website publication are complete.
6. Sign out and back in, reload onboarding, and edit the studio category. These must not create another registration event. Opening a tenant booking website, a customer booking, or a private dashboard route must not send Meta PageView or registration events.
7. Reopen **Cookie settings** (landing footer / studio application) and disable advertising. Further Meta events stop, queued events are dropped, and `_fbp` / `_fbc` are removed where accessible. Past events are not erased.
8. Review **Diagnostics** and the selected ad account. Seeing a local test or Pixel Helper result alone does not prove Meta received and attributed the conversion; confirm it in Test events.

Only permitted marketing query parameters are accepted (`utm_*` listed in the implementation, `fbclid`, `lang`, and `step`, with simple URL-safe values). The Pixel is not loaded for unknown/authentication query parameters, private dashboard pages, tenant websites, or the owner application. No names, emails, phone numbers, organization IDs, or appointment contents are sent as Meta event parameters.

## Domain and campaign connection

If Meta asks to verify your domain, use **Business Settings → Brand safety and suitability → Domains → Add**, enter `opus.mk`, and choose **DNS TXT verification**. Copy Meta's exact TXT value to the DNS provider for `opus.mk`, then return and click **Verify** after DNS propagates. Leave existing mail and website DNS records in place. This verifies ownership; it does not install the Pixel. Complete any additional account verification only if Meta requests it for your account.

For the story campaign, choose the OPUS Page and Instagram account in the ad's **Identity**. For a website conversion campaign, select **OPUS Website** as the dataset and **CompleteRegistration** as the conversion event after it has been received. Enter `https://opus.mk` as the destination. For a single story image, select Instagram Stories placement; the profile website link is separate from the ad destination.

Useful official references: [Meta's Pixel implementation course](https://www.facebookblueprint.com/student/path/219710-technical-implementation-meta-pixel), [Meta's browser Pixel template and consent API usage](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl), [Meta Business Suite](https://business.facebook.com/), and [Events Manager](https://business.facebook.com/events_manager2/).
