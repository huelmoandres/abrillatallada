# Abril Latallada D'Elias — Next.js application

The approved editorial design, implemented as a typed Next.js App Router application. Created with the official `create-next-app` generator using TypeScript, Tailwind CSS, ESLint, and a `src/` directory.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. No third-party API keys are required.

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

Static page sections remain Server Components even when composed as children of the consultation provider. Interactive controls use React state rather than a global imperative page script. Drafts stay in memory and are neither transmitted nor persisted. Images use `next/image`; the approved fonts use `next/font/local`.

## SEO and domain configuration

The owner purchased **abrillatallada.uy**. `.env.example` sets `SITE_URL=https://abrillatallada.uy` and keeps `SEO_INDEXABLE=false`; the domain remains configurable through the environment. Vercel account/project linking, DNS configuration, and HTTPS verification are still pending. Local, preview, and temporary deployments stay `noindex`, without a canonical link or public sitemap entries.

After connecting the domain and confirming the professional content and practice areas, explicitly enable indexing in the production environment. WhatsApp remains blank until the confirmed number is available. See [docs/SEO.md](docs/SEO.md) for the claim/link, domain connection, and indexing checklist.

The app includes a Spanish title/description, `es-UY`, Open Graph/Twitter metadata, a native social-image route, robots and sitemap routes, and minimal `Person`/`WebSite` structured data based only on confirmed facts.

## Current product boundaries

- The confirmed professional identity is Abril Latallada D'Elias, lawyer in Rocha, Uruguay.
- Confirmed email: `dra.latallada@gmail.com`. Instagram and LinkedIn use the profile URLs supplied by the user.
- Practice topics and introduction copy still require professional confirmation.
- The form prepares a reviewable message for copying, plain-text download or continuing in the visitor's email app. It does not send a consultation automatically or create an appointment.
- Message examples do not overwrite an existing draft or contact fields.
- The three photographs were supplied by the user. Two portraits use moderate AI-assisted lighting/framing edits; the degree photo remains original to preserve document details.

## WhatsApp

Set `WHATSAPP_NUMBER` in the server environment to the confirmed business number with its international country code. It accepts an optional leading `+`, spaces and dashes. Do not use a local leading zero. An empty/invalid value shows a forthcoming WhatsApp dialog with the confirmed email instead of a fake link. Changing the value requires a rebuild/redeployment because the home page is prerendered.

The configured floating control opens WhatsApp with: “Hola, Abril. Quisiera coordinar una consulta jurídica. ¿Podrías indicarme tu disponibilidad y la modalidad de atención? Muchas gracias.” The visitor decides whether to send it.

## Deployment

The project is ready for Vercel's Next.js preset. Preview deployments must remain unindexed. Permanent ownership and automatic Git deployments require linking this directory to the intended Vercel account and repository. No Git remote or production deployment is assumed.

## Assets and licenses

The logos and design are preserved from the approved prototype. Photo provenance, selected files and exact edit prompts are recorded in [docs/PHOTOS.md](docs/PHOTOS.md). Bodoni Moda and DM Sans are self-hosted; their OFL licenses are in `public/licenses/`. The visual system uses a light paper, sage and linen palette, editorial typography and restrained motion.
