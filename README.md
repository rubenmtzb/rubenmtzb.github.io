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
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

</div>

---

## 🌌 Overview

> Live portfolio for **Rubén Martínez Bernabe** at **[rubenitx.me](https://rubenitx.me/)** — a bilingual React experience with a dark terminal/cyberpunk aesthetic, animated storytelling, and a full CV system with PDF downloads plus interactive online preview.

The site showcases professional experience, selected projects, research work, education, certifications, and contact channels in both English and Spanish.

---

## ✨ Highlights

- **Scroll-spy navbar** with animated premium glow state and responsive mobile menu
- **Dark terminal/cyberpunk UI** built around `#030712`, `#00ff88`, `#00ffff`, and `#bf5fff`
- **JetBrains Mono** typography across the full experience
- **English / Spanish i18n** powered by a custom React Context
- **Lazy-loaded sections** for the main content flow
- **Dynamic experience duration calculation** for current roles
- **Gradient section dividers**, glass panels, glow effects, and motion-heavy transitions
- **CV system** with direct PDF downloads in EN/ES plus an interactive HTML preview synced by language
- **Responsive layout** optimized for desktop, tablet, and mobile

---

## ⚡ Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **UI Framework** | [React](https://react.dev/) 19 | Component-driven SPA |
| **Build Tool** | [Vite](https://vite.dev/) 8 | Fast local dev + production builds |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) v4 | Utility-first styling with custom glow effects |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) | Section reveals, hover states, animated UI details |
| **Icons** | [Lucide React](https://lucide.dev/) | Navigation and section iconography |
| **Typography** | [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Terminal-inspired visual identity |
| **i18n** | Custom React Context | English / Spanish language toggle |
| **Deployment** | GitHub Pages + custom domain | `rubenitx.me` via GitHub Actions |

---

## 🧭 Site Sections

| Section | Purpose |
|--------|---------|
| **Hero** | Intro, rotating typewriter titles, CTAs, and social links |
| **About** | Technical profile, short bio, and current highlights |
| **Tech Stack** | Core tools and broader toolbox |
| **Experience** | Timeline of professional roles with live duration tracking |
| **Projects** | Private product work, research portal, and portfolio showcase |
| **Research** | Featured SARS-CoV-2 mutation portal and publication links |
| **Education** | Degree, DevOps studies, and academic background |
| **Certifications** | Verified credentials and supporting links |
| **Resume / CV** | PDF download + interactive online preview |
| **Contact** | Email, LinkedIn, GitHub, and direct CTA |

---

## 🌍 Internationalization & CV

| Feature | Details |
|--------|---------|
| **Language switcher** | Toggles all main portfolio content between English and Spanish |
| **Context-based i18n** | Shared state through `src/i18n/LanguageContext.jsx` |
| **PDF downloads** | `/cv/CV_RubenMartinez_EN.pdf` and `/cv/CV_RubenMartinez_ES.pdf` |
| **Interactive preview** | `/cv/?lang=en` or `/cv/?lang=es` updates preview language and PDF target |
| **Preview page** | Standalone HTML CV with synced metadata, content rendering, and print-ready layout |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone git@github.com:rubenmtzb/rubenmtzb.github.io.git
cd rubenmtzb.github.io

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## 🚢 Deployment

This portfolio is deployed with **GitHub Pages** and served on **`rubenitx.me`**.

| Part | Details |
|------|---------|
| **Workflow** | `.github/workflows/deploy.yml` |
| **Trigger** | Pushes to `main` |
| **Build output** | `dist/` |
| **Custom domain** | `public/CNAME` |

---

## 📁 Project Structure

```text
rubenmtzb.github.io/
├── public/
│   ├── cv/               # Interactive HTML CV + EN/ES PDF files
│   ├── icons/            # Stack and brand assets
│   ├── CNAME             # Custom domain configuration
│   └── avatar.png        # Primary profile image
├── src/
│   ├── components/       # Portfolio sections, navbar, footer, toggles
│   ├── i18n/             # Language context
│   ├── App.jsx           # Main application composition with lazy-loaded sections
│   ├── App.css           # App-level overrides
│   ├── index.css         # Global theme, glow effects, and animations
│   └── main.jsx          # React entry point
├── index.html            # SEO, metadata, font loading, manifest wiring
├── eslint.config.js      # ESLint flat config
└── vite.config.js        # Vite + Tailwind plugin config
```

---

<div align="center">

**Built with ☕, green glow, and quiet focus**

`rubenmtzb.github.io` · [rubenitx.me](https://rubenitx.me/) · [@rubenmtzb](https://github.com/rubenmtzb)

</div>
