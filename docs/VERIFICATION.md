# Verification

Verified on November 17, 2026 with Node.js 24.20.0.

## Automated checks

- `npm run check`: TypeScript and ESLint passed; 15 tests passed (7 consultation, 4 contact, 4 SEO configuration).
- `npm run build`: production build passed with Next.js 16.4.6 and Turbopack. Home, 404, icon, Open Graph image, robots and sitemap are prerendered.
- The local build reports the expected missing `metadataBase` warning while no permanent or deployment origin is configured. No canonical domain is fabricated.
- One-off HTTP assertions against the local production server passed: home 200, `es-UY`, noindex/nofollow, no canonical, actual email and two social profiles in server-rendered JSON-LD; robots 200 without a sitemap reference; sitemap 200 without URLs; social image 200 PNG; unknown route 404.

Turbopack's CSS processing required an internal local socket, so the production build ran with sandbox escalation. No production infrastructure was modified by the local checks.

## Browser checks

Checked the production server in the in-app browser at effective CSS widths 320, 390, 768 and 1280 pixels; no horizontal document overflow. Temporary viewport overrides were reset afterward.

- Responsive menu opens with focus inside, closes with Escape and closes before navigating to a section.
- Practice guides open and select the topic when continuing to the form.
- Whitespace-only messages show the validation error. Applying an example clears it while preserving the selected topic, name, contact and consent.
- Applying another example preserves an existing message.
- Review shows the full draft. Copying the message succeeds. The email link contains the expected recipient, encoded subject and summary; no message was sent.
- Review closes with Escape and returns focus to its trigger.
- Native FAQ disclosure expands correctly.
- Missing WhatsApp number opens the contact dialog with the actual email, with no fake destination. Configured link generation is covered by tests.
- Real photo assets load, including the original degree photo. The generated social image was inspected visually.
- Email, Instagram and LinkedIn icons appear in contact and footer links.
- The floating return control is absent at the top, appears after scrolling, returns to the real page start and disappears again. Its bounds are separate from WhatsApp on mobile and desktop.
- No browser console errors were reported during the final run.
- Follow-up UI fixes: Tailwind's reset removed native dialog auto margins. Explicit fixed positioning, `inset: 0`, fit-content height and auto margins restore centering without affecting the right-hand mobile menu. Measured WhatsApp dialog center error was under 1 CSS pixel in desktop (1280 × 900) and mobile (390 × 844).
- Footer's duplicate return arrow was replaced with an illustrated consultation invitation; the scroll-aware floating return remains.
- Name/contact fields now include decorative icons. All text fields, select and textarea use soft surfaces, subtle borders and a sage focus halo; mobile input text is 16 px and the former thick outline is removed only where a visible replacement exists.

Local evidence is kept under ignored `.local/`: `desktop.png`, `contact-desktop.png`, `mobile.png`, `contact-mobile.png`, `opengraph.png`.

The final production image HTTP check passed for all 6 rendered image responses. Updated visual evidence includes `contact-desktop-final.png`, `footer-desktop-final.png`, `footer-mobile.png`, and `modal-centered-desktop.png` / `modal-centered-mobile.png`. The final production browser run reported no new console errors.

## Temporary Vercel preview

`npx --yes vercel@latest deploy . --temporary -y` completed with CLI 65.17.0 and `readyState: READY` for deployment `dpl_BTMQzhASxc5QoxUuGdnuKHcYnKyF`. Network escalation was required after the sandbox could not resolve the npm registry.

Preview: [fast-quasar-dsjnu9s.tmp.now](https://fast-quasar-dsjnu9s.tmp.now). It expires on November 17, 2026 at 17:45:11 UTC unless claimed into a Vercel account. The private claim link was supplied separately to the owner, not recorded in public project documentation. No request was made to the deployed URL for verification; CLI readiness and the local production checks are the available evidence.
