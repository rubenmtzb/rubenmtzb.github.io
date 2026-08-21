<div align="center">

```
██████╗ ██╗   ██╗██████╗ ███████╗███╗   ██╗███╗   ███╗████████╗███████╗██████╗
██╔══██╗██║   ██║██╔══██╗██╔════╝████╗  ██║████╗ ████║╚══██╔══╝╚══███╔╝██╔══██╗
██████╔╝██║   ██║██████╔╝█████╗  ██╔██╗ ██║██╔████╔██║   ██║     ███╔╝ ██████╔╝
██╔══██╗██║   ██║██╔══██╗██╔══╝  ██║╚██╗██║██║╚██╔╝██║   ██║    ███╔╝  ██╔══██╗
██║  ██║╚██████╔╝██████╔╝███████╗██║ ╚████║██║ ╚═╝ ██║   ██║   ███████╗██████╔╝
╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝   ╚═╝   ╚══════╝╚═════╝
```

### `rubenmtzb.github.io` — Rubén Martínez Bernabe's personal portfolio

![Status](https://img.shields.io/badge/status-live-00C853?style=for-the-badge&logo=githubpages&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5-BC52EE?style=for-the-badge&logo=astro&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

</div>

---

## 🌌 Overview

> Bilingual portfolio for **Rubén Martínez Bernabe**, live at **[rubenitx.me](https://rubenitx.me/)**.
> Built with Astro as **static HTML with zero framework runtime in the browser**: everything
> that has to be read, indexed or printed exists in the build output. JavaScript only adds
> optional interaction on top.

---

## 🧱 Architecture

**Content is a single source of truth.** Every surface — the site, the CV, the JSON-LD, the
`<title>` tags — reads from typed collections in `src/content/`, validated by Zod schemas in
`src/content.config.ts`. No fact lives duplicated inside a component, and nothing that can be
derived is written by hand: role durations and seniority are recomputed from `YYYY-MM` dates
on every build.

**Three execution layers, in this order:**

| Layer | Responsibility |
|-------|----------------|
| **Build (Astro)** | Renders the complete HTML: content, metadata, JSON-LD, sitemap |
| **CSS** | Layout, theming and every animation that does not need state |
| **Client JS** | Progressive enhancement only — remove it and nothing but motion is lost |

That order is enforced, not just intended. Two scripts verify it from opposite ends, and
both gate the deploy:

- `verify-dist.mjs` strips every `<script>` from the generated HTML and asserts that the
  content, the navigation and the language switcher are still there.
- `verify-interaction.mjs` does the reverse — it runs the real bundle against that same
  HTML in a minimal DOM and asserts the carousels, tabs and typing test behave.

**Weight is a contract too.** `verify-dist.mjs` also holds two budgets, both written after
they were breached: no emitted image slice may exceed 500 kB, and no page may carry more
than 32 kB of inline `style` attributes — presentation that repeats per element belongs in
a stylesheet, not in the markup. A build that breaks either one does not deploy.

**Nothing ships that nothing asks for.** Bundling emits the original of every image in
`src/assets/` alongside the slices `astro:assets` actually generates. The
`prune-unused-assets` integration walks the finished output, collects every filename the
HTML, CSS, JS, sitemap and manifest reference, and deletes the images none of them do —
20 MB of untouched originals on the last full build.

---

## 🗺️ URL grammar

`/[experience]/[language]/[path]/` — V2 is the site; V1 is the earlier documentary version,
kept reachable for humans but out of the index.

| URL | Content | Indexable |
|-----|---------|-----------|
| `/` · `/es/` | V2 portfolio | ✅ |
| `/cv/` · `/es/cv/` | Print-ready CV + PDF download | ✅ |
| `/work/sars-cov-2/` · `/es/work/sars-cov-2/` | Project case study | ✅ |
| `/v1/` · `/v1/es/` | Previous version | `noindex` |

Each language cluster emits an identical, self-referencing `hreflang` set with `x-default`,
generated from the data so the pages cannot drift apart. There is exactly one `Person`
entity across the whole site, with a stable `@id`.

---

## ✨ On the page

- **ASCII portrait** — a canvas particle simulation sampled from the avatar, reactive to the pointer
- **Tabbed experience** with durations recalculated at build time
- **Project showcase, education and certification carousels**, all driven by one shared primitive
- **Draggable 3D photo deck** with throw physics
- **Interactive HHKB keyboard** with a typing speed trial and synthesised switch sound
- **Killua Game Mode** — an optional platformer that uses the real DOM as its level geometry
- **English / Spanish** as real, separate URLs — never a client-side toggle

Every one of these degrades cleanly: `prefers-reduced-motion` is honoured throughout, and
without JavaScript each carousel falls back to a plain stacked list.

---

## ⚡ Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | [Astro](https://astro.build/) 5 | Static output, no client-side framework |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) v4 | Via `@tailwindcss/vite`, pure CSS at runtime |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 5 | `astro/tsconfigs/strict` |
| **Content** | Astro Content Collections + Zod | Typed, validated single source of truth |
| **Typography** | Archivo + JetBrains Mono | Self-hosted via Fontsource, no third-party request |
| **Icons** | Inline SVG (`src/components/Icon.astro`) | No icon library ships to the browser |
| **Images** | `astro:assets` | AVIF with a WebP fallback, sized to the layout |
| **Verification** | `linkedom` | Assertions over the real build output |
| **Deployment** | GitHub Pages + GitHub Actions | `rubenitx.me` |

---

## 🚀 Getting Started

```bash
git clone git@github.com:rubenmtzb/rubenmtzb.github.io.git
cd rubenmtzb.github.io
npm install

npm run dev       # dev server
npm run build     # production build into dist/
npm run check     # astro check — types across .astro and .ts
npm run verify    # assertions over the generated HTML in dist/
npm test          # check + build + verify, exactly what CI runs
```

---

## 🚢 Deployment

| Part | Details |
|------|---------|
| **Workflow** | `.github/workflows/deploy.yml` |
| **Trigger** | Pushes to `main` |
| **Gate** | `npm run check` + `npm run verify` — the deploy stops if the types or the build contract break |
| **Output** | `dist/` |
| **Custom domain** | `public/CNAME` |

---

## 📁 Project Structure

```text
rubenmtzb.github.io/
├── public/
│   ├── cv/                   # EN/ES PDF downloads
│   ├── icons/                # Brand and technology logos
│   ├── CNAME                 # Custom domain
│   └── avatar.png            # Source image for the ASCII portrait
├── scripts/
│   ├── verify-dist.mjs        # Assertions over the generated HTML (no JS)
│   ├── verify-interaction.mjs # Runs the real bundle against that HTML
│   └── generate-sprites.mjs   # One-off sprite generation for Game Mode
├── src/
│   ├── assets/               # Images processed by astro:assets
│   ├── components/
│   │   ├── v1/               # Previous version, served at /v1/
│   │   ├── v2/               # Current portfolio
│   │   └── cv/               # CV document
│   ├── content/              # JSON collections — the single source of truth
│   ├── i18n/ui.ts            # UI strings and anchor aliases
│   ├── integrations/         # Build-time hooks (unused-asset pruning)
│   ├── layouts/              # Base, V1, V2 and case-study shells
│   ├── lib/
│   │   ├── content.ts        # Collection access, date maths, JSON-LD
│   │   ├── tech.ts           # Technology registry: colour, logo, official link
│   │   └── brands.ts         # Issuer and institution registry: logo, brand colour
│   ├── pages/                # URL grammar + sitemap.xml + manifest.json
│   ├── scripts/              # Client-side progressive enhancement
│   ├── styles/               # global.css (V1) and v2.css (V2)
│   └── content.config.ts     # Zod schemas for every collection
└── astro.config.mjs
```

---

<div align="center">

**Built with ☕, static HTML, and quiet focus**

`rubenmtzb.github.io` · [rubenitx.me](https://rubenitx.me/) · [@rubenmtzb](https://github.com/rubenmtzb)

</div>
