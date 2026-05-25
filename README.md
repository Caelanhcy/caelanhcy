# caelanh.com

Personal site for Caelan H.C.Y. Three pages — a force-directed capability graph (`/`), a long-form CV (`/about`), a qualifying contact form (`/contact`).

Astro 4.x. Vanilla CSS. Cytoscape.js for the graph. No CSS framework, no UI library.

See [`DEPLOY.md`](./DEPLOY.md) for deploy steps.

## Commands

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview
```

## Where things live

```
src/
├── data/
│   └── capabilities.ts        # six capability clusters — node text, essays, artifacts, reinforcement edges
├── layouts/
│   └── Base.astro             # html shell + theme toggle + bottom nav rail
├── pages/
│   ├── index.astro            # graph stage + mobile fallback list + side panel
│   ├── about.astro            # EN CV v2.7 verbatim
│   └── contact.astro          # category-routed form, Formspree-backed
├── scripts/
│   └── graph.ts               # Cytoscape boot, theme-aware style, hover/click wiring
└── styles/
    └── global.css             # tokens, layout, panels, forms — everything
```

## Voice & content

All copy inherits from `00_BRAND_SPINE.md` (v1.4) and `01_CAELANH_EN_CV_v2_7.md`. To change any user-facing wording: update those source files first, then update this site. Do not edit prose here in isolation.

## Sanitization

The Brand Spine §6 and §10 sanitization rules are enforced in source:

- No USD 350M figure anywhere — Banana-IN GMV is `~¥600M RMB`.
- No DIER absolute revenue — only percentages and ratios.
- No MPR / CCI acronyms — the five-dimension and three-dimension capability descriptions appear unlabelled.
- No DIER 100-category / 4-domain / EMA architecture.
- AERLYTE, not AERPONDERE.
- BEYOND is "Asian Startup Award Shortlist", not won.
- Public byline `Caelan H.C.Y`; legal Chinese name does not appear.
