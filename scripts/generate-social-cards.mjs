import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const pages = JSON.parse(await readFile('src/content/pages.json', 'utf8'))
const profiles = JSON.parse(await readFile('src/content/profile.json', 'utf8'))
const cards = {
  home: {
    title: ['Rubén Martínez', 'Bernabe'],
    en: ['APIs, integrations and web tools', 'Java · Spring Boot · React'],
    es: ['APIs, integraciones y herramientas web', 'Java · Spring Boot · React'],
    accent: '#6fe3ff',
    tag: { en: 'SOFTWARE ENGINEERING', es: 'INGENIERÍA DE SOFTWARE' },
    flow: ['API', 'UI', 'WEB'],
  },
  'work-transcriber': {
    title: ['YouTube', 'Transcriber'],
    en: ['From a public video to readable, translated text', 'Captions first · Whisper fallback · DeepL'],
    es: ['De un vídeo público a texto para leer y traducir', 'Subtítulos primero · Alternativa Whisper · DeepL'],
    accent: '#c27bfa',
    tag: { en: 'CASE STUDY // WEB APP', es: 'CASO DE ESTUDIO // APLICACIÓN WEB' },
    flow: ['URL', 'TXT', 'ES'],
  },
  'work-sars': {
    title: ['SARS-CoV-2'],
    en: ['Exploring the mutational landscape', 'Interactive genomics · URV · Published research'],
    es: ['Explorar el mapa de mutaciones', 'Genómica interactiva · URV · Investigación publicada'],
    accent: '#6fe3ff',
    tag: { en: 'CASE STUDY // RESEARCH', es: 'CASO DE ESTUDIO // INVESTIGACIÓN' },
    flow: ['A', 'C', 'G'],
  },
  'work-finance': {
    title: ['Finance', 'Core'],
    en: ['A clearer view of your personal finances', 'Accounts · Savings · Crypto holdings'],
    es: ['Tus finanzas personales, con perspectiva', 'Cuentas · Ahorro · Posiciones cripto'],
    accent: '#00d9a0',
    tag: { en: 'PRIVATE APP // SYNTHETIC DEMO', es: 'APP PRIVADA // DEMO SINTÉTICA' },
    flow: ['CSV', 'API', 'UI'],
  },
}
cards.cv = {
  title: cards.home.title,
  en: [profiles.find(profile => profile.lang === 'en').jobTitle + ' · Barcelona', 'Java · Spring Boot · React · TypeScript'],
  es: [profiles.find(profile => profile.lang === 'es').jobTitle + ' · Barcelona', 'Java · Spring Boot · React · TypeScript'],
  accent: '#90d4cc',
  tag: { en: 'DEVELOPER CV // ONE PAGE', es: 'CV DE DESARROLLADOR // UNA PÁGINA' },
  flow: ['JAVA', 'API', 'WEB'],
}
const selected = new Set(process.argv.slice(2))
for (const key of selected) {
  if (!cards[key]) throw new Error(`Unknown social card: ${key}`)
}
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
await mkdir('public/og', { recursive: true })

for (const page of pages.filter((page) => cards[page.key] && (!selected.size || selected.has(page.key)))) {
  const card = cards[page.key]
  const lines = card[page.lang]
  const nodes = card.flow.map((label, index) => {
    const y = 158 + index * 100
    return `<rect x="996" y="${y}" width="108" height="66" rx="14" fill="#111a2d" stroke="${card.accent}" stroke-opacity=".45"/>
      <text x="1050" y="${y + 43}" text-anchor="middle" fill="${card.accent}" font-size="25" font-family="monospace">${label}</text>
      ${index < 2 ? `<path d="M1050 ${y + 67}v33" stroke="${card.accent}" stroke-opacity=".4"/>` : ''}`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <radialGradient id="glow"><stop stop-color="${card.accent}" stop-opacity=".12"/><stop offset="1" stop-color="${card.accent}" stop-opacity="0"/></radialGradient>
      <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0v48" fill="none" stroke="#243047" stroke-opacity=".35"/></pattern>
    </defs>
    <rect width="1200" height="630" fill="#060b16"/>
    <rect width="1200" height="630" fill="url(#grid)"/>
    <ellipse cx="1050" cy="260" rx="410" ry="420" fill="url(#glow)"/>
    <rect x="28" y="28" width="1144" height="574" rx="24" fill="none" stroke="#26344b"/>
    <path d="M68 107h72" stroke="${card.accent}" stroke-width="4"/>
    <text x="160" y="114" fill="${card.accent}" font-family="Arial, sans-serif" font-size="19" letter-spacing="2">${escape(card.tag[page.lang])}</text>
    ${card.title.map((line, index) => `<text x="68" y="${220 + index * 88}" fill="#f1f5fc" font-family="Arial, sans-serif" font-size="78" font-weight="700" letter-spacing="-2">${escape(line)}</text>`).join('')}
    ${lines.map((line, index) => `<text x="70" y="${389 + index * 42}" fill="${index ? '#97a8c2' : '#d5deec'}" font-family="Arial, sans-serif" font-size="${index ? 24 : 29}">${escape(line)}</text>`).join('')}
    ${nodes}
    <path d="M68 510h1064" stroke="#26344b"/>
    <text x="70" y="557" fill="#e7eef9" font-family="Arial, sans-serif" font-size="22">rubenitx.me</text>
    <text x="1130" y="557" text-anchor="end" fill="#97a8c2" font-family="Arial, sans-serif" font-size="19">${page.lang.toUpperCase()} / RUBÉN MARTÍNEZ BERNABE</text>
  </svg>`
  const output = `public${page.ogImage}`
  await sharp(Buffer.from(svg)).png().toFile(output)
  console.log(`${output} · 1200 × 630`)
}
