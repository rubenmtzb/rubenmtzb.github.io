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

That order is enforced, not just intended. Four scripts verify it from different ends, and
all of them gate the deploy:

- `verify-dist.mjs` strips every `<script>` from the generated HTML and asserts that the
  content, the navigation and the language switcher are still there.
- `verify-interaction.mjs` does the reverse — it runs the real bundle against that same
  HTML in a minimal DOM and asserts the carousels, tabs and typing test behave.
- `verify-source.mjs` checks the conventions that leave no trace in the output: no view
  branching on language, both dictionary tables in step, no colour outside the palette.
- `verify-physics.mjs` imports the platformer's arithmetic directly and checks its rules.

**Why the gate is this large.** A site with no framework runtime has almost no logic worth
unit-testing: the units are Astro components that render, and rendering them in isolation
proves nothing about the page. What can break here is structural — an hreflang set that
stops matching its cluster, a section that ships at `opacity: 0` because the bundle failed,
a Spanish page quietly missing a link its English twin has, a photograph served at ten times
the size the card can display. None of that throws, none of it looks wrong in a component,
and all of it is only visible in the finished output. So the assertions live where the
evidence is. Every one of them was written after a real defect got through, which is why
there are 613 of them and why the list keeps growing rather than being trimmed.

**Weight is a contract too.** `verify-dist.mjs` holds three budgets, each written after it
was breached: no emitted image slice may exceed 500 kB; no page may carry more than 32 kB of
inline `style` attributes; and no page may mark more than 200 elements with a CSS scope
attribute — presentation that repeats per element belongs in a stylesheet, not in the markup.
A build that breaks any of them does not deploy.

**One shape per concern.** Nothing in `src/` is a container for unrelated things.
The client layer is one module per feature and a boot file that is nothing but the
order they run in; the keyboard archive is a component per part — card, panel, model,
sound sample — with its key tables as data in `src/lib/` and its copy in `src/i18n/`.
Every page is the same document shell. Where two files had to agree on a fact — the
domain, the locale list, the stack groups — the fact moved to `src/site.config.ts` and
both import it.

**Two layers of styling, not two systems.** Tailwind and the hand-written sheets are
not competing here — they do different jobs. Anything with identity, state or motion is a
named class (`t-h2`, `btn`, `project-slide`, `bx-*`): it has to be selected from JavaScript,
animated, or reasoned about as a thing. Anything that is a one-off arrangement — a flex row,
a gap, a breakpoint — is a Tailwind utility, because naming it would invent a component that
does not exist.

Colour never improvises. Every value comes from the palette in `src/styles/v2/tokens.css`,
delivered through Tailwind's arbitrary-value syntax (`text-[color:var(--fg-3)]`). That reads
repetitive, and the repetition is free: an arbitrary value emits exactly one rule no matter
how many elements use it, and the whole V2 stylesheet is 21 kB over the wire. What was not
free was the palette having no state colours, so forty-four places reached for `emerald-400`,
`amber-500` or a hand-typed `rgba(111,227,255,.2)` — the cyan token, retyped by eye. Those are
now `--live`, `--pending`, `--closed` and `--cyan-rgb`, and `verify-source.mjs` fails the build
if a V2 component names a colour any other way.

**Both languages say the same thing.** Translation is split by role, not scattered: UI strings
live in `src/i18n/ui.ts` behind `t(lang, key)`; the build archive keeps its own copy in
`src/i18n/keyboards.ts`, typed as `ES: typeof EN` so a missing string is a compile error; and
`src/i18n/terms.ts` handles the concepts that are also registry keys — `localizedTerm()`
translates one for display, `canonicalTerm()` maps it back to the key the registry indexes by.

That last one exists because of a real bug: the Spanish rows of the content write their tags
already translated, so a technology chip silently lost its logo and its link on `/es/` while
`/` kept both. Nothing caught it, so now something does. `verify-dist.mjs` compares every
language pair — links, buttons, images, media and form controls — and fails the build when one
version offers an affordance the other does not. Prose may split into a different number of
elements; an action that exists in one language and not the other is always a defect.

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
- **Keyboard build archive** — every build as a layered 3D model you can orbit and explode,
  with its assembly order, its spec sheet and a recorded sound sample
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
│   ├── cv/                        # EN/ES PDF downloads
│   ├── icons/                     # Brand and technology logos
│   ├── keyboards/sound/           # Build sound samples (AAC + MP3)
│   ├── CNAME                      # Custom domain
│   └── avatar.png                 # Source image for the ASCII portrait
├── scripts/
│   ├── verify-dist.mjs            # Assertions over the generated HTML (no JS)
│   ├── verify-interaction.mjs     # Runs the real bundle against that HTML
│   ├── verify-source.mjs          # Conventions that leave no trace in the output
│   ├── verify-physics.mjs         # The platformer's movement rules
│   └── generate-sprites.mjs       # One-off sprite generation for Game Mode
├── src/
│   ├── site.config.ts             # Domain, locales and closed vocabulary
│   ├── content.config.ts          # Zod schemas for every collection
│   ├── content/                   # JSON collections — the single source of truth
│   ├── assets/                    # Images processed by astro:assets
│   ├── layouts/
│   │   ├── BaseLayout.astro       # The one document shell
│   │   └── V1/V2/Case/Cv          # One per surface, all built on it
│   ├── components/
│   │   ├── v1/                    # Previous version, served at /v1/
│   │   ├── v2/                    # Current portfolio
│   │   │   └── keyboards/         # Build explorer: card, panel, model, sound
│   │   │   └── about/             # Profile, education and certifications
│   │   └── cv/                    # CV document
│   ├── i18n/
│   │   ├── ui.ts                  # Every UI string, in both languages
│   │   ├── keyboards.ts           # Copy for the build explorer
│   │   └── terms.ts               # Concepts that are also registry keys
│   ├── lib/
│   │   ├── content.ts             # Collections, routes, date maths, JSON-LD
│   │   ├── keyboard-layouts.ts    # Key tables and model geometry
│   │   ├── keyboard-sound.ts      # Waveform geometry for the sound samples
│   │   ├── tech.ts                # Technology registry: colour, logo, link
│   │   └── brands.ts              # Issuer and institution registry
│   ├── integrations/              # Build-time hooks (unused-asset pruning)
│   ├── pages/                     # URL grammar + sitemap.xml + manifest.json
│   ├── scripts/
│   │   ├── v2.ts                  # Boot order only — one line per layer
│   │   ├── v2/                    # One module per feature
│   │   │   ├── keyboard/          # Mascot, switch audio, speed trial, sandbox
│   │   │   └── build-explorer/    # Panel state, sound rack, orbit and explode
│   │   ├── game-mode.ts           # Split into its own chunk, loaded on demand
│   │   ├── game/                  # Its levels, its synthesiser and its physics
│   │   └── ascii-portrait.ts      # Canvas particle portrait
│   └── styles/
│       ├── global.css             # V1
│       ├── v2.css                 # V2 — index of partials; the order is the cascade
│       ├── v2/                    # One file per block: tokens, header, keyboard, …
│       ├── keyboard-explorer.css  # Build archive — index of partials
│       └── keyboard-explorer/     # One file per block of the archive
└── astro.config.mjs
```

---

<div align="center">

**Built with ☕, static HTML, and quiet focus**

`rubenmtzb.github.io` · [rubenitx.me](https://rubenitx.me/) · [@rubenmtzb](https://github.com/rubenmtzb)

</div>
