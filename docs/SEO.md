# SEO foundation

The approved design is a Spanish-language personal legal-practice site for Abril Latallada D’Elias in Rocha, Uruguay. The initial search intent is **abogada en Rocha**, supported by the professional name and geographic context. This implementation supplies technical foundations; it does not imply that a search engine has indexed the site or that rankings, Core Web Vitals, or rich results have been measured.

## Configuration and safe defaults

The owner confirmed the purchase of **abrillatallada.uy**. `.env.example` supplies `SITE_URL=https://abrillatallada.uy` and keeps `SEO_INDEXABLE=false`; buying or configuring the domain does not enable indexing. Vercel account/project ownership, DNS setup, and HTTPS verification are still pending. The origin remains environment configuration rather than a hardcoded canonical URL. Do not use a temporary deployment URL as the permanent site URL.

Copy `.env.example` to `.env.local` only when configuring a local environment. No local environment file is supplied by this change. Local and preview builds remain unindexed even with the permanent origin configured.

Indexing requires all of the following:

- `SITE_URL` is a public HTTPS origin with no credentials, path, query, or fragment.
- `SEO_INDEXABLE=true` is explicitly configured.
- `NODE_ENV=production` and `VERCEL_ENV=production` identify a production deployment.

Local, preview, unconfigured, and opted-out builds publish `noindex, nofollow` metadata and no canonical link or public sitemap entries. Preview social images can use Vercel's `VERCEL_URL` origin without declaring it canonical. With no configured or deployment origin, Next.js uses the local development origin for generated social metadata; it is not exported as a canonical URL.

`robots.txt` deliberately allows crawling so that crawlers can read the page's `noindex` directive. It declares `sitemap.xml` only for explicitly indexable production builds. This is indexation control, not access control; private previews must use Vercel access protection when needed.

## Implemented

- Typed title and description, local geographic context, Open Graph and Twitter summary cards.
- Native `opengraph-image.tsx`, 1200 × 630 PNG using the same self-hosted Bodoni Moda and DM Sans fonts as the site. It is a brand graphic, not the illustrative desk photograph.
- Conditional self-canonical root URL and a one-page sitemap; fragment anchors are not separate pages.
- Minimal server-rendered JSON-LD: `Person` and `WebSite`, with the confirmed professional name, role, language, broad location, email, Instagram profile, and LinkedIn profile. JSON is escaped before insertion in HTML.
- No invented street address, telephone, credentials, reviews, ratings, service results, or confirmed specialties. The illustrative desk image is not used as a professional portrait or office photograph in structured data.
- The owner-provided real portrait at `public/images/abril-portrait-v1.jpg` can appear as `Person.image` only when a confirmed, indexable production canonical URL exists. The image URL is absolute and uses that origin. Until indexing is explicitly enabled in production, the property is omitted; no local or temporary portrait URL is invented.
- No unnecessary language variants or `hreflang`; the current site has one genuine locale, `es-UY`.

The root layout should export `siteMetadata` from `src/lib/seo.ts`, set `<html lang="es-UY">`, and render the server component `<StructuredData />` once. Keep one descriptive H1 and a logical heading hierarchy in the content. Keep the local profession/location near the start of the visible page without keyword stuffing.

## Confirmed contact identity

The owner supplied `dra.latallada@gmail.com`, the Instagram handle `Dra.latalladadelias` (`https://www.instagram.com/dra.latalladadelias/`), the LinkedIn profile `https://www.linkedin.com/in/abril-latallada-d%E2%80%99el%C3%ADas-356727272/`, and the business WhatsApp `091958662` (`+598 91 958 662` internationally). The person's JSON-LD uses `email` and `sameAs` for the email and social profiles. It does not infer education, credentials, employment history, or platform verification from those links. The WhatsApp control uses the confirmed number by default, with an optional `WHATSAPP_NUMBER` environment override. Contact values come from the public contact module shared with the interface.

## Connect the purchased domain

The owner confirmed **NIC** as the registrar and said the domain was left at **Cloudflare**. For this connection, Cloudflare can manage DNS while Vercel hosts the app; that statement alone does not establish that a Cloudflare Pages or Workers app was deployed. The anonymous preview must first be claimed into the intended Vercel account. Use the project-specific DNS values:

Before configuring the website records, check that the Cloudflare zone is **Active** and that NIC lists the exact authoritative nameservers assigned to this zone by Cloudflare. Do not substitute example nameservers. If the zone is pending, verify delegation in NIC and allow it to update; consult [Cloudflare's nameserver setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) and [zone status](https://developers.cloudflare.com/dns/zone-setups/reference/domain-status/).

1. If the current deployment is temporary, open its claim URL, sign in to the intended Vercel account, select the owning team, and complete the transfer. Then link the local project to that same project if future CLI deployments are needed.
2. In that project's **Settings → Domains**, add `abrillatallada.uy` for production. Configure any additional hostname and redirect deliberately; the intended permanent origin is `https://abrillatallada.uy`.
3. In Cloudflare, select `abrillatallada.uy` and open **DNS → Records**. Add or edit only the website records to match the exact names, types, and values shown by Vercel. Complete a TXT ownership check if requested. Preserve existing MX, email-authentication TXT, and other verification records; no DNS target is assumed here.
4. Set the website A/AAAA/CNAME records used for Vercel to **DNS only** (gray cloud), following Vercel's direct-connection guidance. Cloudflare remains the DNS provider and Vercel handles web traffic. If changing an existing proxied website, confirm Vercel has a publicly trusted certificate for that hostname before switching it to direct access.
5. Wait for DNS propagation, check the domain configuration and certificate status in Vercel, and verify that the production domain serves the intended deployment over HTTPS.
6. Configure production `SITE_URL=https://abrillatallada.uy` and keep `SEO_INDEXABLE=false` until the content checks below are complete. Preview deployments remain unindexed.

These are preparation steps, not a claim that ownership, DNS, or production connection has been completed. See [Vercel claim deployments](https://vercel.com/docs/deployments/claim-deployments), [link a local project](https://vercel.com/docs/cli/link), and [add and configure a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

Cloudflare instructions: [manage DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/) and [proxy status](https://developers.cloudflare.com/dns/proxy-status/). The DNS-only choice follows [Vercel's Cloudflare guidance](https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment#use-dns-only-mode-for-direct-traffic). No account or DNS changes have been performed as part of this documentation.

## Before enabling production indexing

1. The domain purchase and WhatsApp number `+598 91 958 662` are confirmed. Confirm the professional presentation, practice areas, and remaining contact details with the owner.
2. Complete the account, DNS, and HTTPS steps above and configure `SITE_URL=https://abrillatallada.uy` in Vercel's production environment.
3. Set `SEO_INDEXABLE=true` in production only, then redeploy. Leave preview environment opt-out intact.
4. Inspect the rendered canonical, robots metadata, JSON-LD and social image. Check `/robots.txt` and `/sitemap.xml` on that deployment.
5. Add the real domain to Google Search Console, verify ownership, and submit the sitemap.
6. Validate structured data in the rendered browser and with Schema.org Validator / Google's Rich Results Test. `Person`/`WebSite` markup alone does not promise a rich-result feature.
7. Add genuine address/contact data and a Google Business Profile only when those facts and business eligibility are confirmed. Do not create location doorway pages or publish illustrative legal specialties as verified services.

## Checks

`node --test tests/seo.test.mjs` exercises origin validation and the production/indexing opt-in boundary with local synthetic fixtures. No fixture domain is contacted. The parent task performs the integrated TypeScript, production build, route/HTML, browser, and social-image checks once the page is assembled.

No Search Console, organic traffic, Google Business Profile, real-user field performance or ranking data is available in this task. Performance results should be labelled as lab measurements if collected later.

## Primary references

- [Next.js metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js generated social images](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Next.js JSON-LD](https://nextjs.org/docs/app/guides/json-ld)
- [Google: block indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Schema.org Person](https://schema.org/Person)
