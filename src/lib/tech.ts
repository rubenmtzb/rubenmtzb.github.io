export interface TechMeta {
  color: string
  glow: string
  icon?: string
  /** The technology's official page. Mutually exclusive with `anchor`. */
  url?: string
  /**
   * Brandless concepts explained on the site itself: the section's id is stored
   * rather than a URL, because the destination changes with the language and
   * the chip also shows up on pages where that section does not exist.
   */
  anchor?: string
}

/**
 * The single technology registry: brand colour, glow, logo and link to the
 * official page. The same chips consume it in the hero, projects, experience,
 * education and certifications, so a repeated technology always keeps the same
 * colour and the same destination.
 *
 * Where no brand exists (SQL, DevOps, CI/CD, networking, hardware, AI, LLMs,
 * prompt engineering) a two-tone glyph of its own is used — the concept's
 * colour plus the site's cyan — and the link points at the canonical reference.
 */
export const TECH: Record<string, TechMeta> = {
  Java: {
    icon: '/icons/java.svg',
    color: '#ea2d2e',
    glow: 'rgba(234, 45, 46, 0.3)',
    url: 'https://www.java.com/',
  },
  'Spring Boot': {
    icon: '/icons/spring.svg',
    color: '#6db33f',
    glow: 'rgba(109, 179, 63, 0.3)',
    url: 'https://spring.io/projects/spring-boot',
  },
  React: {
    icon: '/icons/react.svg',
    color: '#61dafb',
    glow: 'rgba(97, 218, 251, 0.3)',
    url: 'https://react.dev/',
  },
  TypeScript: {
    icon: '/icons/typescript.svg',
    color: '#3178c6',
    glow: 'rgba(49, 120, 198, 0.3)',
    url: 'https://www.typescriptlang.org/',
  },
  Docker: {
    icon: '/icons/docker.svg',
    color: '#2496ed',
    glow: 'rgba(36, 150, 237, 0.3)',
    url: 'https://www.docker.com/',
  },
  Python: {
    icon: '/icons/python.svg',
    color: '#ffde57',
    glow: 'rgba(255, 222, 87, 0.3)',
    url: 'https://www.python.org/',
  },
  FastAPI: {
    color: '#009688',
    glow: 'rgba(0, 150, 136, 0.3)',
    url: 'https://fastapi.tiangolo.com/',
  },
  PHP: {
    icon: '/icons/php.svg',
    color: '#777bb4',
    glow: 'rgba(119, 123, 180, 0.3)',
    url: 'https://www.php.net/',
  },
  'D3.js': {
    icon: '/icons/d3.svg',
    color: '#f9a03c',
    glow: 'rgba(249, 160, 60, 0.3)',
    url: 'https://d3js.org/',
  },
  PostgreSQL: {
    icon: '/icons/postgresql.svg',
    color: '#4169e1',
    glow: 'rgba(65, 105, 225, 0.3)',
    url: 'https://www.postgresql.org/',
  },
  Astro: {
    icon: '/icons/astro.svg',
    color: '#ff5d01',
    glow: 'rgba(255, 93, 1, 0.3)',
    url: 'https://astro.build/',
  },
  'yt-dlp': {
    icon: '/icons/yt-dlp.svg',
    color: '#5b9bff',
    glow: 'rgba(91, 155, 255, 0.32)',
    url: 'https://github.com/yt-dlp/yt-dlp',
  },
  'whisper.cpp': {
    icon: '/icons/whisper.svg',
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.32)',
    url: 'https://github.com/ggml-org/whisper.cpp',
  },
  DeepL: {
    icon: '/icons/deepl.svg',
    color: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.3)',
    url: 'https://www.deepl.com/',
  },
  'Tailwind CSS': {
    icon: '/icons/tailwind.svg',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.3)',
    url: 'https://tailwindcss.com/',
  },
  JavaScript: {
    icon: '/icons/javascript.svg',
    color: '#f7df1e',
    glow: 'rgba(247, 223, 30, 0.3)',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  },
  /* ES6+ is modern JavaScript: same logo and colour, link to the standard. */
  'ES6+': {
    icon: '/icons/javascript.svg',
    color: '#f7df1e',
    glow: 'rgba(247, 223, 30, 0.3)',
    url: 'https://262.ecma-international.org/',
  },
  Git: {
    icon: '/icons/git.svg',
    color: '#f05033',
    glow: 'rgba(240, 80, 51, 0.3)',
    url: 'https://git-scm.com/',
  },
  Linux: {
    icon: '/icons/linux.svg',
    color: '#fcc624',
    glow: 'rgba(252, 198, 36, 0.3)',
    url: 'https://www.kernel.org/',
  },
  Kubernetes: {
    icon: '/icons/kubernetes.svg',
    color: '#326ce5',
    glow: 'rgba(50, 108, 229, 0.3)',
    url: 'https://kubernetes.io/',
  },
  Jenkins: {
    icon: '/icons/jenkins.svg',
    color: '#d33833',
    glow: 'rgba(211, 56, 51, 0.3)',
    url: 'https://www.jenkins.io/',
  },
  Terraform: {
    icon: '/icons/terraform.svg',
    color: '#7b42bc',
    glow: 'rgba(123, 66, 188, 0.3)',
    url: 'https://developer.hashicorp.com/terraform',
  },
  'Windows Server': {
    icon: '/icons/windows.svg',
    color: '#0078d4',
    glow: 'rgba(0, 120, 212, 0.3)',
    url: 'https://www.microsoft.com/en-us/windows-server',
  },
  MySQL: {
    icon: '/icons/mysql.svg',
    color: '#00758f',
    glow: 'rgba(0, 117, 143, 0.3)',
    url: 'https://www.mysql.com/',
  },
  Liferay: {
    icon: '/icons/liferay.svg',
    color: '#0b5fff',
    glow: 'rgba(11, 95, 255, 0.3)',
    url: 'https://www.liferay.com/',
  },
  SQL: {
    icon: '/icons/sql.svg',
    color: '#2dd4bf',
    glow: 'rgba(45, 212, 191, 0.3)',
    url: 'https://en.wikipedia.org/wiki/SQL',
  },
  Networking: {
    icon: '/icons/networking.svg',
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.3)',
    url: 'https://en.wikipedia.org/wiki/Computer_network',
  },
  Redes: {
    icon: '/icons/networking.svg',
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.3)',
    url: 'https://es.wikipedia.org/wiki/Red_de_computadoras',
  },
  Hardware: {
    icon: '/icons/hardware.svg',
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.3)',
    url: 'https://en.wikipedia.org/wiki/Computer_hardware',
  },
  DevOps: {
    icon: '/icons/devops.svg',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.3)',
    url: 'https://en.wikipedia.org/wiki/DevOps',
  },
  'CI/CD': {
    icon: '/icons/cicd.svg',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.3)',
    url: 'https://en.wikipedia.org/wiki/CI/CD',
  },
  AI: {
    icon: '/icons/ai.svg',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.3)',
    url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
  },
  IA: {
    icon: '/icons/ai.svg',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.3)',
    url: 'https://es.wikipedia.org/wiki/Inteligencia_artificial',
  },
  LLMs: {
    icon: '/icons/llm.svg',
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.3)',
    url: 'https://en.wikipedia.org/wiki/Large_language_model',
  },
  'Prompt Engineering': {
    icon: '/icons/prompt.svg',
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.3)',
    url: 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview',
  },
  Bioinformatics: {
    icon: '/icons/bioinformatics.svg',
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.3)',
    anchor: 'education',
  },
  Bioinformática: {
    icon: '/icons/bioinformatics.svg',
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.3)',
    anchor: 'education',
  },
}
