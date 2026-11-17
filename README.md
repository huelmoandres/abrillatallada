# Abril Latallada D'Elias — Next.js application

The approved editorial design, implemented as a typed Next.js App Router application. Created with the official `create-next-app` generator using TypeScript, Tailwind CSS, ESLint, and a `src/` directory.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Browsing and preparing a draft do not require an API key. Sending a consultation requires the Brevo environment configuration below.

```sh
npm run check
npm run build
npm run start
```

## Architecture

- `src/app/`: server-rendered home page, global layout, local fonts, metadata routes, social image, and 404 page.
- `src/components/sections/`: server components for the approved page content.
- `src/components/consultation/`: client-side consultation state, examples, topic guides, form, and review dialogs.
- `src/components/site-header.tsx`: responsive navigation, active section, and reading progress.
- `src/components/ui/`: reusable icons and accessible dialog composition.
- `src/lib/practice.ts`: typed source of practice topics, preparation guides, and message starters.
- `src/lib/site-config.ts` and `src/lib/seo.ts`: factual business configuration and indexing policy.
- `src/lib/contact.ts`: confirmed business channels, WhatsApp number validation and preset message.
- `src/app/api/consultation/route.ts`: validated server-side consultation delivery through Brevo.
- `src/lib/email/consultation-template.ts`: branded HTML and plain-text email.

Static page sections remain Server Components even when composed as children of the consultation provider. Interactive controls use React state rather than a global imperative page script. Drafts stay in browser memory until the visitor confirms sending the reviewed consultation. Images use `next/image`; the approved fonts use `next/font/local`.

## SEO and domain configuration

The owner reports **abrillatallada.uy** is live. `.env.example` sets `SITE_URL=https://abrillatallada.uy` and keeps `SEO_INDEXABLE=false`; the domain remains configurable through the environment. Local, preview, and temporary deployments stay `noindex`, without a canonical link or public sitemap entries.

After connecting the domain and confirming the professional content and practice areas, explicitly enable indexing in the production environment. WhatsApp remains blank until the confirmed number is available. See [docs/SEO.md](docs/SEO.md) for the claim/link, domain connection, and indexing checklist.

The app includes a Spanish title/description, `es-UY`, Open Graph/Twitter metadata, a native social-image route, robots and sitemap routes, and minimal `Person`/`WebSite` structured data based only on confirmed facts.

## Current product boundaries

- The confirmed professional identity is Abril Latallada D'Elias, lawyer in Rocha, Uruguay.
- Confirmed email: `dra.latallada@gmail.com`. Instagram and LinkedIn use the profile URLs supplied by the user.
- Practice topics and introduction copy still require professional confirmation.
- The form prepares a reviewable message, then sends it through Brevo only after the visitor confirms. Copying/download remain available; sending does not create an appointment.
- Message examples do not overwrite an existing draft or contact fields.
- The three photographs were supplied by the user. Two portraits use moderate AI-assisted lighting/framing edits; the degree photo remains original to preserve document details.

## WhatsApp

Set `WHATSAPP_NUMBER` in the server environment to the confirmed business number with its international country code. It accepts an optional leading `+`, spaces and dashes. Do not use a local leading zero. An empty/invalid value shows a forthcoming WhatsApp dialog with the confirmed email instead of a fake link. Changing the value requires a rebuild/redeployment because the home page is prerendered.

The configured floating control opens WhatsApp with: “Hola, Abril. Quisiera coordinar una consulta jurídica. ¿Podrías indicarme tu disponibilidad y la modalidad de atención? Muchas gracias.” The visitor decides whether to send it.

## Consultation email

Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` and `CONSULTATION_TO_EMAIL` in Vercel's private server environment, then redeploy. The sender domain must be authenticated in Brevo. The initial destination is `dra.latallada@gmail.com`; the suggested sender is `consultas@abrillatallada.uy` once configured.

See [docs/EMAIL.md](docs/EMAIL.md) for sender setup, Cloudflare forwarding, configuration, delivery behavior and offline verification. A missing key never produces a success message. Real delivery must be confirmed separately after the account is configured.

## Deployment

The source repository is [huelmoandres/abrillatallada](https://github.com/huelmoandres/abrillatallada). The project uses Vercel's Next.js preset. Preview deployments must remain unindexed. The local CLI may require linking to the owner's existing Vercel project; do not create a new anonymous deployment to replace the live site.

## Assets and licenses

The logos and design are preserved from the approved prototype. Photo provenance, selected files and exact edit prompts are recorded in [docs/PHOTOS.md](docs/PHOTOS.md). Bodoni Moda and DM Sans are self-hosted; their OFL licenses are in `public/licenses/`. The visual system uses a light paper, sage and linen palette, editorial typography and restrained motion.
