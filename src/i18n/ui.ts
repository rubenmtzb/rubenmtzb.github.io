export const LANGS = ['en', 'es'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = 'en'

/** Las cinco áreas de la V1. El orden es el orden del documento. */
export const NAV = [
  { id: 'home', en: 'Home', es: 'Inicio' },
  { id: 'about', en: 'About', es: 'Sobre mí' },
  { id: 'work', en: 'Work', es: 'Trayectoria' },
  { id: 'background', en: 'Background', es: 'Formación' },
  { id: 'contact', en: 'Contact', es: 'Contacto' },
] as const

/**
 * Anclas heredadas de las 10 superficies anteriores.
 * Se emiten como alias vacíos dentro del área que las absorbe para que
 * ningún enlace entrante existente quede sin destino.
 */
/** Las tres áreas navegables de la V2. Identity es el propio inicio. */
export const V2_NAV = [
  { id: 'work', key: 'v2.nav.work' },
  { id: 'archive', key: 'v2.nav.archive' },
  { id: 'contact', key: 'v2.nav.contact' },
] as const

/**
 * Tras el intercambio, / pasa a servir la V2. Los enlaces entrantes a las
 * anclas de las 10 superficies originales tienen que seguir aterrizando
 * en algún sitio con sentido, así que la V2 también las emite.
 */
export const V2_ANCHOR_ALIASES: Record<string, string[]> = {
  identity: ['home', 'about', 'stack'],
  work: ['experience', 'projects', 'research'],
  contact: ['education', 'certifications', 'resume'],
}

export const ANCHOR_ALIASES: Record<string, string[]> = {
  about: ['stack'],
  work: ['experience', 'projects', 'research'],
  background: ['education', 'certifications'],
  contact: ['resume'],
}

export const ui = {
  en: {
    'nav.home': 'Go to home section',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',
    'nav.langSwitch': 'Ver en español',
    'nav.langNext': 'ES',
    'nav.skip': 'Skip to content',

    'hero.viewWork': 'View my work',
    'hero.scroll': 'Scroll to about section',

    'about.title': 'About me',
    'about.profile': 'Technical profile',
    'about.focus': 'focus',
    'about.mindset': 'mindset',
    'about.stack': 'Stack',
    'about.group.backend': 'Backend',
    'about.group.frontend': 'Frontend',
    'about.group.devops': 'Infrastructure',
    'about.group.data': 'Data',
    'about.group.practices': 'Engineering practices',
    'about.tier.historica': 'Earlier work',
    'about.tier.formacion': 'Training',
    'about.tier.secundaria': 'Secondary',

    'work.title': 'Work',
    'work.experience': 'Experience',
    'work.projects': 'Projects',
    'work.current': 'current',
    'work.present': 'Present',
    'work.visit': 'Visit project',
    'work.comingSoon': 'Coming soon',
    'work.publication': 'Read the publication',
    'work.badge.live': 'Live',
    'work.badge.private': 'Private',

    'background.title': 'Background',
    'background.education': 'Education',
    'background.certifications': 'Certifications',
    'background.languages': 'Languages',
    'background.inProgress': 'In progress',
    'background.grade': 'Grade',
    'background.issuedBy': 'Issued by',
    'background.date': 'Date',
    'background.id': 'ID',
    'background.verify': 'Verify credential',
    'background.project': 'View project',

    'contact.title': 'Contact',
    'contact.email': 'Email',
    'contact.emailDesc': 'Write me directly',
    'contact.linkedinDesc': "Let's connect professionally",
    'contact.githubDesc': 'Check my code',
    'contact.send': 'Send email',
    'contact.cvTitle': 'Download my CV',
    'contact.cvDesc': 'A print-ready overview of my experience, skills and education.',
    'contact.cvDownload': 'Download PDF',
    'contact.cvPreview': 'View online',

    'footer.built': 'Built with Astro — static HTML, no framework runtime',
    'footer.rights': 'All rights reserved',
    'footer.top': 'Back to top',

    'cv.back': 'Back to portfolio',
    'cv.print': 'Download PDF',
    'cv.experience': 'Experience',
    'cv.projects': 'Projects',
    'cv.skills': 'Technical skills',
    'cv.education': 'Education',
    'cv.certifications': 'Certifications',
    'cv.languages': 'Languages',
    'cv.interests': 'Interests',
    'cv.technologies': 'Technologies',
    'cv.contact': 'Contact',
    'cv.location': 'Location',
    'cv.portfolio': 'Portfolio',
    'cv.langSwitch': 'Ver el CV en español',

    'v2.nav.work': 'Work',
    'v2.nav.archive': 'Outside the Code',
    'v2.nav.contact': 'Contact',
    'v2.hero.cta': 'See my work',
    'v2.hero.cv': 'Read my CV',
    'v2.hero.system': 'system.render()',
    'v2.hero.systemNote': 'Interactive view of how I build. Decorative — everything you need to read is text.',
    'v2.work.title': 'Work',
    'v2.work.lede': 'What I have built, where, and with what.',
    'v2.work.now': 'Now',
    'v2.work.before': 'Before',
    'v2.work.projects': 'Selected projects',
    'v2.work.case': 'Read the case',
    'v2.work.visit': 'Visit',
    'v2.archive.title': 'Outside the Code',
    'v2.archive.lede': 'A little more about the person behind the systems.',
    'v2.archive.open': 'Open photograph',
    'v2.archive.close': 'Close',
    'v2.archive.prev': 'Previous photograph',
    'v2.archive.next': 'Next photograph',
    'v2.archive.counter': 'Photograph',
    'v2.contact.title': 'Contact',
    'v2.contact.lede': 'Open to conversations about ambitious backend, full-stack or research-oriented work.',
    'v2.contact.write': 'Write to me',
    'v2.case.back': 'Back to work',
    'v2.case.overview': 'Overview',
    'v2.case.stack': 'Stack',
    'v2.game.toggle': 'game mode',
    'v2.game.help': 'Arrows or A/D to move · Space to jump · Esc to exit. Collect the loose data packets.',

    'time.year': 'year',
    'time.years': 'years',
    'time.month': 'month',
    'time.months': 'months',
    'time.and': 'and',
  },
  es: {
    'nav.home': 'Ir a la sección de inicio',
    'nav.openMenu': 'Abrir menú',
    'nav.closeMenu': 'Cerrar menú',
    'nav.langSwitch': 'View in English',
    'nav.langNext': 'EN',
    'nav.skip': 'Saltar al contenido',

    'hero.viewWork': 'Ver mi trabajo',
    'hero.scroll': 'Ir a la sección sobre mí',

    'about.title': 'Sobre mí',
    'about.profile': 'Perfil técnico',
    'about.focus': 'enfoque',
    'about.mindset': 'mentalidad',
    'about.stack': 'Stack',
    'about.group.backend': 'Backend',
    'about.group.frontend': 'Frontend',
    'about.group.devops': 'Infraestructura',
    'about.group.data': 'Datos',
    'about.group.practices': 'Prácticas de ingeniería',
    'about.tier.historica': 'Trabajo anterior',
    'about.tier.formacion': 'Formación',
    'about.tier.secundaria': 'Secundario',

    'work.title': 'Trayectoria',
    'work.experience': 'Experiencia',
    'work.projects': 'Proyectos',
    'work.current': 'actual',
    'work.present': 'Actualidad',
    'work.visit': 'Visitar proyecto',
    'work.comingSoon': 'Próximamente',
    'work.publication': 'Leer la publicación',
    'work.badge.live': 'Activo',
    'work.badge.private': 'Privado',

    'background.title': 'Formación',
    'background.education': 'Estudios',
    'background.certifications': 'Certificaciones',
    'background.languages': 'Idiomas',
    'background.inProgress': 'En curso',
    'background.grade': 'Nota',
    'background.issuedBy': 'Expedido por',
    'background.date': 'Fecha',
    'background.id': 'ID',
    'background.verify': 'Verificar credencial',
    'background.project': 'Ver proyecto',

    'contact.title': 'Contacto',
    'contact.email': 'Email',
    'contact.emailDesc': 'Escríbeme directamente',
    'contact.linkedinDesc': 'Conectemos profesionalmente',
    'contact.githubDesc': 'Revisa mi código',
    'contact.send': 'Enviar email',
    'contact.cvTitle': 'Descarga mi CV',
    'contact.cvDesc': 'Una visión completa de mi experiencia, habilidades y formación, lista para imprimir.',
    'contact.cvDownload': 'Descargar PDF',
    'contact.cvPreview': 'Ver online',

    'footer.built': 'Construido con Astro — HTML estático, sin runtime de framework',
    'footer.rights': 'Todos los derechos reservados',
    'footer.top': 'Volver arriba',

    'cv.back': 'Volver al portfolio',
    'cv.print': 'Descargar PDF',
    'cv.experience': 'Experiencia',
    'cv.projects': 'Proyectos',
    'cv.skills': 'Habilidades técnicas',
    'cv.education': 'Formación',
    'cv.certifications': 'Certificaciones',
    'cv.languages': 'Idiomas',
    'cv.interests': 'Intereses',
    'cv.technologies': 'Tecnologías',
    'cv.contact': 'Contacto',
    'cv.location': 'Ubicación',
    'cv.portfolio': 'Portfolio',
    'cv.langSwitch': 'View the CV in English',

    'v2.nav.work': 'Trayectoria',
    'v2.nav.archive': 'Outside the Code',
    'v2.nav.contact': 'Contacto',
    'v2.hero.cta': 'Ver mi trabajo',
    'v2.hero.cv': 'Leer mi CV',
    'v2.hero.system': 'system.render()',
    'v2.hero.systemNote': 'Vista interactiva de cómo construyo. Es decorativa: todo lo que hay que leer es texto.',
    'v2.work.title': 'Trayectoria',
    'v2.work.lede': 'Qué he construido, dónde y con qué.',
    'v2.work.now': 'Ahora',
    'v2.work.before': 'Antes',
    'v2.work.projects': 'Proyectos seleccionados',
    'v2.work.case': 'Leer el caso',
    'v2.work.visit': 'Visitar',
    'v2.archive.title': 'Outside the Code',
    'v2.archive.lede': 'Algo más sobre la persona que hay detrás de los sistemas.',
    'v2.archive.open': 'Abrir fotografía',
    'v2.archive.close': 'Cerrar',
    'v2.archive.prev': 'Fotografía anterior',
    'v2.archive.next': 'Fotografía siguiente',
    'v2.archive.counter': 'Fotografía',
    'v2.contact.title': 'Contacto',
    'v2.contact.lede': 'Abierto a conversaciones sobre backend, full-stack o proyectos con componente de investigación.',
    'v2.contact.write': 'Escríbeme',
    'v2.case.back': 'Volver a trayectoria',
    'v2.case.overview': 'Resumen',
    'v2.case.stack': 'Stack',
    'v2.game.toggle': 'modo juego',
    'v2.game.help': 'Flechas o A/D para moverte · Espacio para saltar · Esc para salir. Recoge los paquetes de datos sueltos.',

    'time.year': 'año',
    'time.years': 'años',
    'time.month': 'mes',
    'time.months': 'meses',
    'time.and': 'y',
  },
} as const

export type UiKey = keyof (typeof ui)['en']

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key]
}
