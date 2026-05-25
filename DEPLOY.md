# DEPLOY — caelanh.com

Static site, Astro 4.x. Build output is `dist/`. Vercel handles the rest.

## 0. Prerequisites

- Node 22.12+ (current repo runs fine on 22.11 with one engine warning; upgrade when convenient).
- A GitHub account (optional; Vercel can deploy from local directly via CLI).
- A Vercel account (free tier is sufficient).
- A Formspree account (free tier is sufficient).
- The domain `caelanh.com` registered with a registrar that lets you set custom nameservers or A/CNAME records.

## 1. Replace the Formspree endpoint

1. Sign in to <https://formspree.io>.
2. Create a new form. Name it `caelanh.com contact`.
3. Copy the endpoint URL — looks like `https://formspree.io/f/xkgjabcd`.
4. Open `src/pages/contact.astro`.
5. Replace the line:
   ```ts
   const FORMSPREE_ENDPOINT = 'https://formspree.io/f/REPLACE_ME';
   ```
   with the real endpoint.
6. In the Formspree dashboard, add `chuanyichuanyi@gmail.com` as the notification email.
7. (Optional) Add reCAPTCHA in the Formspree dashboard — the current page has a hidden honeypot but Formspree's built-in reCAPTCHA is stronger.

## 2. Local build check

```bash
cd /Users/caelanh/Documents/caelanh-website
npm install
npm run build
```

`dist/` should appear with `index.html`, `about/index.html`, `contact/index.html`, and the assets directory. Open `dist/index.html` in a browser to spot-check.

## 3. Deploy to Vercel

### Option A — Vercel CLI (no GitHub needed)

```bash
npm i -g vercel
cd /Users/caelanh/Documents/caelanh-website
vercel login
vercel             # follow prompts; pick "Astro" preset if asked
vercel --prod      # promotes the preview to production
```

### Option B — GitHub + Vercel dashboard

1. `git init && git add . && git commit -m "Initial commit"` in this directory.
2. Push to a new private GitHub repo.
3. In Vercel, "Import Project" → pick the repo. Framework preset: **Astro**. Build command: `npm run build`. Output: `dist`. Click Deploy.

## 4. Custom domain — caelanh.com

In the Vercel project → **Settings → Domains** → add `caelanh.com` and `www.caelanh.com`.

Vercel will give one of two instructions:

- **Nameservers route** (simplest): point the domain's nameservers to the two `ns*.vercel-dns.com` values shown.
- **DNS-records route**: at the existing registrar, add
  - `A @ → 76.76.21.21`
  - `CNAME www → cname.vercel-dns.com`

Wait 10–30 minutes for DNS propagation. Vercel will auto-issue a Let's Encrypt cert.

## 5. Post-deploy spot-check

- `/` loads, graph renders, six capability nodes spread around the centre.
- Light/dark toggle persists across page navigation.
- `/about` reads as the v2.7 CV verbatim, mobile-friendly.
- `/contact` form: submit a test entry; confirm Formspree delivers to inbox.
- Site title shows `Caelan H.C.Y` in the tab.

## 6. Future — not yet built

- `/writing` (or `/notes`) for future essays. Reserved.
- OG / Twitter card image. Reserved.
- Sitemap.xml. Add via `@astrojs/sitemap` integration if/when search indexing matters.
- Bilingual EN/CN toggle. Not in scope for v0.1.
