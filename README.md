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
evidence is. These checks follow real defects and release requirements, so the suite
keeps growing rather than being trimmed.

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

Tailwind scans `src/` explicitly, not documentation or verification scripts. Examples in
those files must not become unused utilities in the production stylesheet.

Project covers are warmed near the carousel itself, rather than at the start of the
experience section. Keyboard model prefetch waits until the archive is approaching.
Both retain a head start before interaction without competing with the hero.

The YouTube Transcriber cover is an illustration, not a product screenshot. Its editable
source is `scripts/artwork/youtube-transcriber-cover.svg`; regenerate the PNG with the
image processor already installed by Astro:

```sh
node --input-type=module -e "import sharp from 'sharp'; await sharp('scripts/artwork/youtube-transcriber-cover.svg').png().toFile('src/assets/projects/youtube-transcriber.png');"
```

The Transcriber case study lives in `projects.json` (`caseStudy`), with real English and
Spanish routes. It documents the captions-first pipeline, server-side Whisper fallback,
DeepL translation, SSE stages, local history and service limits without claiming measured
time savings. Its demo uses the supplied recording at `public/media/transcriber-demo.mp4`
and `public/media/transcriber-demo-poster.jpg`: native controls, `preload="none"`, no autoplay.
The caption explicitly identifies an edited illustration, not a benchmark. English and
Spanish VTT caption tracks explain the walkthrough. It now includes the locally composed
instrumental score "Quiet Signals" and subtle transition effects. No page audio autoplays.
The recording, poster, original silent backup and both tracks must be present before the
verification gate passes.

The case details share `src/styles/case-study.css`, with a scoped violet identity for Transcriber
and a cyan genomic illustration for Mutation Portal:
staggered title letters, a signal-to-text illustration, numbered sections and a demo frame.
It reuses the shared reveal observer; motion is finite, starts in the viewport and disappears
with reduced motion. Text and controls remain available without JavaScript. The home cover's
letter sweep observes the title itself, not the carousel's image-prefetch margin, so featuring
it first does not spend the animation before the reader scrolls to it.
Mutation Portal retains its URV attribution and publication evidence, with icon-led overview
cards and an explicitly illustrative genomic panel rather than an invented live chart.
Featured project actions live below the description in a labelled, responsive dock: grouped
repository links, case details, application and publication. These styles are scoped to the
showcase; GitHub controls elsewhere are unchanged.

Render the supplied real browser recording with the existing Playwright installation:

```sh
node scripts/media/render-transcriber-demo.mjs recording.webm screenshot.png /path/to/playwright/index.mjs
```

The visual renderer produces a silent MP4, poster, English VTT and provenance JSON under `public/media/`.
Keep the Spanish VTT's cue times aligned with the generated English track when replacing
the recording. The picture is H.264, 1920 × 1080 at 25 fps; editing is not a
measurement of the app's processing latency.

The approved silent montage is preserved byte-for-byte as
`public/media/transcriber-demo-silent.mp4` (SHA-256
`70a30d78b23aba3abeee43e770cd8b138e9c745c506fe856a08a1f2ea20707ed`).
Never overwrite or regenerate this backup. The soundtrack script refuses an unexpected
source or a changed backup; it synthesizes audio locally and uses `-c:v copy`, preserving
all 1,066 frames and their timing. No third-party music or samples are used.

```sh
node scripts/media/add-transcriber-soundtrack.mjs          # Add/regenerate the score
node scripts/media/add-transcriber-soundtrack.mjs --verify # Check hashes, timing and loudness
node scripts/media/add-transcriber-soundtrack.mjs --restore # Restore the exact silent MP4
```

The approved music-only edition is also preserved byte-for-byte at
`public/media/transcriber-demo-music-original.mp4` (SHA-256
`3fd1264855ef11a05321392f7d562c6ab84023d9d3abc9111cc447a4b5d86a02`),
with its original metadata alongside it. Never overwrite either approved backup.

The first approved guided edition is also preserved exactly at
`public/media/transcriber-demo-guided-original.mp4` (SHA-256
`804e3111f960ecac5bbcb8070db8deeba1c12891f976d484141c4806903796c1`).
The current edition rebuilds guidance over the immutable music-only picture, avoiding a
second cursor on top of the first version's baked-in overlays. One editorial cursor stays
visible throughout the application footage; 14 click cues, focus labels and five quiet
processing pulses remain tied to inspected actions in `transcriber-demo-events.json`.
The original recording has no mouse telemetry: smooth travel between verified controls
is explicitly editorial reconstruction, **not a genuine recorded trajectory**.

Keyboard cues follow observed text-growth frames in `transcriber-demo-keyboard-events.json`.
No typing sound is added for programmatic clearing, and no upload/file picker is invented:
Transcriber demonstrates exports, not file uploads. The montage, timing and original
"Quiet Signals" arrangement remain; the new picture is intentionally re-encoded and is
**not** byte-identical to an approved earlier edition. ES/EN captions describe real actions.

```sh
node scripts/media/guide-transcriber-demo.mjs                 # Regenerate guided edition
node scripts/media/guide-transcriber-demo.mjs --verify        # Verify current variant and backups
node scripts/media/guide-transcriber-demo.mjs --restore=music # Exact approved music-only edition
node scripts/media/guide-transcriber-demo.mjs --restore=silent
node scripts/media/guide-transcriber-demo.mjs --restore=guided # Exact first guided edition
```

The clip remains 42.64 seconds; current audio measurements and all-frame cursor coverage
are recorded in `public/media/transcriber-demo-validation.json`.
Tool versions affect binary regeneration; the approved backup does not depend on regeneration.
The original burned-in "Sin audio" label intentionally remains unchanged. The external caption
and first VTT cues explain the added score and guidance; when restoring a prior presentation,
update those texts too. The native player offers muting and links to all three backups.

The case's 20-minute video limit and two simultaneous requests describe the API's
`MAX_VIDEO_DURATION_SECONDS=1200` and `MAX_CONCURRENT_TRANSCRIPTIONS=2` defaults, not
verified production settings. Concurrency counts requests, not OS subprocesses; excess
requests are rejected rather than queued. Video length is separate from any total
processing-time budget.

The showcase features Transcriber first, private Finance Core second and published research
third: an immediately usable app, a broader product walkthrough, then academic evidence.
Finance has a public case but no code or login link. The portfolio itself is a compact
source-code row, not a separate "More work" heading and large self-referential card.
The historical `#project-deck` anchor is retained for inbound links and Game Mode.

Finance Core's shared project key remains `financial-architecture` for existing content
references. Its verified stack is React/TypeScript and Python/FastAPI, with PostgreSQL for
the application and an isolated SQLite database for the synthetic local demonstration.
Its dark green case and cover are illustrations, not live financial charts. Source repos,
credentials, raw recordings, session files and local database must never enter this repo.
The bank connector is implemented, but this demo has no configured bank, market or AI
provider: do not describe the CSV import as a successful automatic bank connection.

The current Finance video is 191.64 seconds, 1920 × 1080 at 25 fps, H.264/AAC (~15.52 MB).
It records one real local SPA session entirely in dark mode, with no document reloads,
including forms, genuine native option menus, monthly/day spending, accounts, import,
analytics, goals, budget creation, the simulator, subscriptions, advisor memory and crypto.
The day-detail list is scrolled to reveal its five rows, not claimed to fit simultaneously.
A persistent synthetic-data notice, 54 event-linked click cues and 97 observed-input typing
cues accompany a new 96 BPM plucked-string/bass/percussion score, distinct from Transcriber
(-20.96 LUFS / -3.60 dBTP). Both caption tracks contain 14 cues spanning the whole film.
The MP4 is deferred with `preload="none"`; neither video nor soundtrack autoplays.

A single composed cursor follows actual recorded pointer events over every UI frame,
including native top-layer options. There is no baked second cursor or UI/pointer fade.
The 2.8-second file tray is explicitly labelled an **editorial reconstruction**, not Finder,
an OS recording or a Finance feature. A real filechooser event precedes it; only a synthetic
CSV is displayed, and the same file's hash is checked before the real import preview.
No desktop, Recents, personal files or authentication screens are recorded.

The import sequence previews and confirms two synthetic rows, then verifies duplicates.
Those rows remain present through the following analytics; they are not silently reset
between scenes. Goal progress, the new budget, subscription state, import batch and advisor
memory were all restored after recording. Advisor footage only saves genuine local notes,
with external AI visibly disabled. Crypto uses a typed EUR snapshot preview, without
confirming new holdings, querying live prices or executing trades.

The six files named `finance-core-demo-original*` preserve the approved 84-second version
byte-for-byte, including its MP4 (SHA-256
`81e7eb781d7a82d478b217f3935e462285f2eefeaf3c0e30715ae0227e4fc9c0`),
poster, metadata, validation and both caption tracks. Preserved originals remain available
for restoration, but the case offers only the current recording as a download.

```sh
node scripts/media/preserve-finance-demo.mjs --verify
node scripts/media/finance-demo-v2-pointer.mjs --self-test
node scripts/media/verify-finance-demo.mjs PRIVATE_RENDER_DIRECTORY
node scripts/media/verify-finance-demo-v2-sync.mjs PRIVATE_RENDER_DIRECTORY
# Re-render only from retained private captures; no app or provider access:
node scripts/media/render-finance-demo-v2.mjs PRIVATE_CAPTURE_JSON PRIVATE_RENDER_DIRECTORY PLAYWRIGHT_MODULE
```

The verifier checks all 4,791 decoded frame timestamps, audio, captions and dark surfaces,
plus exactly one in-bounds cursor in every one of the 4,541 final UI frames. Full-resolution
modal/chapter inspection complements the downsampled dark check. Source PCM/final AAC
correlation additionally checks interaction timing after encoding.
The public provenance contains hashes and summarized events, not authentication, private
request logs, bank files or source. The recorder and its input captures stay outside this repo.

### Mutation Portal walkthrough

The research case keeps its existing context and publication under `deep`, with a bilingual
`deep.demo` rendered by the same `CaseDemo.astro` player as the other cases. All three players
use native controls, no autoplay and `preload="none"`.
Each case offers exactly one download, using the same source as its player. No silent,
music-only or earlier-version links appear in the interface. On small screens the frame
uses more of the available width without cropping the recording. A progressive fullscreen
button uses the standard API or iOS video API; failure is reported inline and native controls
remain available without JavaScript. Landscape viewing is recommended for detailed desktop UI.

The 81-second, 1080p30 Mutation film retains the real university UI. It shows the dataset context,
gene search, a bounded spike/Spain/>50 query returning four rows, D614G table filtering,
and a real scatter tooltip, drag zoom and reset. The country filter denotes mutation
presence, not country-specific percentages. The displayed dataset date is 26 February
2024; Excel export returned HTTP 500 during inspection. Neither current epidemiological
coverage nor a working export is claimed, and the university server was not modified.
This is a point-in-time walkthrough, not exhaustive application or scientific validation.

Its distinct, locally synthesized seven-pulse score accompanies 12 real click cues and
15 keyboard cues tied to observed input, using a transient from the owner's HHKB recording.
The cursor follows real, wall-clock-paced captured movement within chapters; chapter cuts
remain editorial. Smooth scrolling and tighter camera windows improve legibility, with gene
search and filter controls 26.4% larger than the earlier film. Separate explanatory panels
use 72px titles and 46px body copy, outside the application rather than obscuring its controls.
All 2,010 final UI frames contain exactly one in-bounds cursor and a visible guide.
The verifier fully decodes all 2,430 frames, checks both caption tracks, source hashes, AAC
alignment, black frames and unintended cursor stalls longer than 200ms.
Public provenance contains summaries and evidence hashes; raw trajectories, frame ledgers,
captures and any dataset exports stay private. The prior 81-second film and associated files
are preserved byte-for-byte in the private authoring workspace; its movie SHA-256 is
`30d4e0ef654a62afb69e26db468465fd9829be57d6325b4aaa5f0f9518ad9983`.

```sh
node scripts/media/render-mutation-demo.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE
node scripts/media/verify-mutation-cursor.mjs PRIVATE_WORKDIR
node scripts/media/verify-mutation-demo.mjs PRIVATE_WORKDIR
```

The retained private captures are required for regeneration and source-provenance checks.
Re-recording accesses the university service; it is not part of an ordinary portfolio build.

Original bilingual social cards for the home page and each case study are 1200 × 630 PNGs
under `public/og/`. Regenerate them with `node scripts/generate-social-cards.mjs` (uses Astro's
existing Sharp dependency). Their page-specific metadata remains in `pages.json`; canonical,
hreflang and JSON-LD still use the common SEO pipeline.
Each project case is now its page's structured-data main entity. Finance is included through
its public case URL, never a private application or repository URL. The visible project order
is a presentation decision, not a ranking promise. Following
[Google's video guidance](https://developers.google.com/search/docs/appearance/video), the
native video source and stable poster remain in static HTML. These are technical case studies,
not dedicated watch pages; video-rich-result eligibility is not claimed.

**Nothing ships that nothing asks for.** Bundling emits the original of every image in
`src/assets/` alongside the slices `astro:assets` actually generates. The
`prune-unused-assets` integration walks the finished output, collects every filename the
HTML, CSS, JS, sitemap and manifest reference, and deletes the images none of them do —
20 MB of untouched originals on the last full build.

### Measured rendering improvements

The portrait reuses pre-rasterized glyphs at its existing 32 alpha levels instead of
repeating atlas crops and alpha changes for every particle, every frame. Particle physics,
colors and frame rate are unchanged. Settled/offscreen canvases stay asleep and repaint
correctly after resizing. The typewriter retains its text and remaining delay while hidden;
decorative CSS timelines pause offscreen and resume at the same phase. Visible effects,
reduced-motion and no-JavaScript fallbacks remain intact.

September 2026 loopback Chromium comparison, three samples per phase, normalized renderer
main-thread busy time (not whole-device CPU or battery consumption):

| Activity | Desktop reduction | Mobile reduction |
|----------|-------------------|------------------|
| Portrait interaction | 34% | 12% |
| Page scrolling | 20% | 17% |
| Idle at the keyboard archive | 83% | 95% |

Desktop used 1440x1000/DPR1 with 4x CPU slowdown; mobile used 390x844/DPR2 with 6x slowdown.
Runtime phases lasted about six seconds after settling. Cold-load checks additionally used
1.6 Mbit/s download and 150ms latency. Initial LCP was effectively unchanged; no download-speed,
production Core Web Vitals or universal-device claim is made. The performance-only comparison
excluded simultaneous showcase and media changes. All six final archive-idle samples had zero
layout/style recalculations; reduced-motion portrait pixels matched the baseline exactly at
both viewport sizes. The existing interaction runner includes 46 deterministic motion/cache
regressions from `scripts/verify-motion.mjs`.

---

## 🗺️ URL grammar

`/[experience]/[language]/[path]/` — V2 is the site; V1 is the earlier documentary version,
kept reachable for humans but out of the index.

| URL | Content | Indexable |
|-----|---------|-----------|
| `/` · `/es/` | V2 portfolio | ✅ |
| `/cv/` · `/es/cv/` | Print-ready CV + PDF download | ✅ |
| `/work/sars-cov-2/` · `/es/work/sars-cov-2/` | Project case study | ✅ |
| `/work/youtube-transcriber/` · `/es/work/youtube-transcriber/` | Transcriber case study + on-demand demo | ✅ |
| `/work/finance-core/` · `/es/work/finance-core/` | Private Finance Core case + dark on-demand demo | ✅ |
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

### Focused developer CV

The English and Spanish CVs are **one A4 page each**, not an export of every
portfolio section. They prioritize two software-development roles, the current
Java / Spring Boot / React stack, two selected applications and relevant formal
education. Non-technical roles, extensive skill inventories, interests and short
course lists remain available on the portfolio rather than crowding the resume.

The design follows [MIT's resume guidance](https://capd.mit.edu/resources/resumes/)
and [Harvard's recommendations](https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/):
relevance to the target role, clear headings, readable type, concrete contributions
and no invented impact figures. The PDF has a single reading column, selectable
Unicode text, embedded fonts, real hyperlinks and Chromium-generated document
tags. These checks do **not** certify PDF/UA compliance or universal ATS compatibility.
Language names are included without asserting unconfirmed proficiency levels.

The web CV has localized developer-focused titles, descriptions, original
1200 x 630 social cards, canonical URLs, hreflang and ProfilePage/Person data.
This follows [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content),
not keyword stuffing or a promise of search rankings.

Both formats use `CvDocument.astro`, the typed content collections and `cv.css`.
Experience is curated in each role's optional `cv` record; selected projects use
`inCv` and `cvSummary`. Full portfolio content is not removed.

**Regenerating the PDFs:** use the existing Playwright/Chromium installation used
by the demo tools, plus Poppler's `pdfinfo`, `pdftotext` and `pdffonts`. These are
authoring tools, not additional browser or deployment dependencies.

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4321
```

In a second terminal:

```bash
npm run cv:pdf -- http://127.0.0.1:4321 /path/to/playwright/index.mjs
npm run build
npm run verify
```

Generation permits only the local preview and checks both languages before
replacing either public PDF: one A4 page, at most 360 words, no overflow, complete
text extraction in natural and layout reading modes, hyperlinks and embedded
Unicode-mapped fonts. `public/cv/manifest.json` binds each PDF hash to its rendered
document, language, title and print stylesheet. The normal deployment verifier
rejects stale PDFs, changed binaries or a return to a multi-page CV.

Regenerate CV social cards with `node scripts/generate-social-cards.mjs cv`.
Regenerate the faithfully localized project cover with
`node scripts/generate-project-covers.mjs`. The real product recordings retain
their original UI language, with bilingual caption tracks; they are not reskinned
or re-recorded to translate the surrounding portfolio.

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
