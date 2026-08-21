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

/** Las cuatro áreas navegables de la V2. Identity es el propio inicio. */
export const V2_NAV = [
  { id: 'work', key: 'v2.nav.work' },
  { id: 'about', key: 'v2.nav.about' },
  { id: 'archive', key: 'v2.nav.archive' },
  { id: 'contact', key: 'v2.nav.contact' },
] as const

/**
 * Anclas heredadas de las 10 superficies anteriores. Se emiten como alias
 * vacíos dentro del área que las absorbe, para que ningún enlace entrante
 * quede sin destino tras el intercambio de la Fase 5.
 *
 * Cada lista contiene solo anclas heredadas: el id propio de la sección
 * nunca se repite aquí, o la página saldría con dos elementos con el mismo
 * id, que es HTML inválido.
 */
export const V2_ANCHOR_ALIASES: Record<string, string[]> = {
  identity: ['home', 'stack'],
  work: ['experience', 'projects', 'research'],
  about: ['education', 'certifications', 'background'],
  contact: ['resume'],
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

    /*
     * Etiquetas que solo existen para la tecnología asistiva. Estaban
     * escritas en castellano dentro del componente, así que un lector de
     * pantalla anunciaba "Historial de empresas" en mitad de una página
     * declarada en inglés.
     */
    'a11y.mainNav': 'Main',
    'a11y.brandHome': 'Home',
    'a11y.jobTabs': 'Employment history',
    'a11y.eduTabs': 'Academic stages',
    'a11y.certTabs': 'Official certifications',
    'a11y.keyboardTabs': 'Mechanical keyboard and game',
    'a11y.mascot': 'Killua, the pixel-art mascot of this section',
    'a11y.repo': 'GitHub repository',
    'a11y.paper': 'Scientific paper',

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

    'v2.nav.work': 'Experience',
    'v2.nav.about': 'About & Education',
    'v2.nav.archive': 'Outside the Code',
    'v2.nav.contact': 'Contact',
    'v2.hero.cv': 'Read my CV',
    'v2.work.title': 'Experience',
    'v2.work.timeline': 'Professional timeline',
    'v2.work.projects': 'Selected projects',
    'v2.work.case': 'Read the case',
    'v2.work.visit': 'Visit',
    'v2.work.carousel': 'Featured projects',
    'v2.work.previousProject': 'Previous project',
    'v2.work.nextProject': 'Next project',
    'v2.work.goToProject': 'Go to project',
    'v2.contact.title': 'Contact',
    'v2.contact.headline': 'The next good system starts with a clear signal.',
    'v2.contact.lede': 'For a role, an idea, or a system worth building: start a conversation.',
    'v2.contact.signal': 'Signal received // channel open',
    'v2.contact.route': 'Email route // ready',
    'v2.contact.horizon': 'Three-way handshake // start a conversation',
    'v2.contact.write': 'Write to me',
    'v2.case.back': 'Back to work',
    'v2.case.overview': 'Overview',
    'otc.title': 'Outside the Code',
    'otc.lede': 'Life, sports, travel — the things that shape how I think.',
    'otc.travel': 'About Me',
    'otc.travelNote': 'Climbing, via ferratas, world journeys, sunsets, and the moments that happen away from the screen.',
    'otc.keysKicker': 'Hobbies // travel · climbing · markets · keyboards',
    'otc.keys': 'Mechanical keyboards',
    'otc.trialBox': 'Typing speed trial: type the text shown here',
    'otc.sandboxBox': 'Free typing sandbox: type anything to hear the switches',
    'otc.keysNote': 'Mechanical keyboards are a hands-on hobby: each build balances layout, materials, switches, sound, and feel. This is not just a desk accessory; it is a tool tuned around how I think and work.',
    'otc.keysDetail': 'The speed trial shares that obsession with feedback. The Build Photos explorer documents each keyboard layer by layer, from the case to the switch.',
    'v2.case.stack': 'Stack',

    'v2.hero.status': 'Available for opportunities',
    'v2.hero.greeting': "Hi, I'm",
    'otc.soundOn': 'Sound enabled',
    'otc.soundOff': 'Sound disabled',
    'v2.footer.gameHint': 'Press ⚡ for Killua Mini-Game',

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

    'a11y.mainNav': 'Principal',
    'a11y.brandHome': 'Inicio',
    'a11y.jobTabs': 'Historial de empresas',
    'a11y.eduTabs': 'Etapas académicas',
    'a11y.certTabs': 'Certificaciones oficiales',
    'a11y.keyboardTabs': 'Teclado mecánico y juego',
    'a11y.mascot': 'Killua, la mascota en pixel art de esta sección',
    'a11y.repo': 'Repositorio de GitHub',
    'a11y.paper': 'Publicación científica',

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

    'v2.nav.work': 'Experiencia',
    'v2.nav.about': 'Sobre mí & Estudios',
    'v2.nav.archive': 'Outside the Code',
    'v2.nav.contact': 'Contacto',
    'v2.hero.cv': 'Leer mi CV',
    'v2.work.title': 'Experiencia',
    'v2.work.timeline': 'Trayectoria profesional',
    'v2.work.projects': 'Proyectos seleccionados',
    'v2.work.case': 'Leer el caso',
    'v2.work.visit': 'Visitar',
    'v2.work.carousel': 'Proyectos destacados',
    'v2.work.previousProject': 'Proyecto anterior',
    'v2.work.nextProject': 'Proyecto siguiente',
    'v2.work.goToProject': 'Ir al proyecto',
    'v2.contact.title': 'Contacto',
    'v2.contact.headline': 'El siguiente buen sistema empieza con una señal clara.',
    'v2.contact.lede': 'Para un reto, una idea o un sistema que merezca la pena construir: empecemos una conversación.',
    'v2.contact.signal': 'Señal recibida // canal abierto',
    'v2.contact.route': 'Ruta de email // preparada',
    'v2.contact.horizon': 'Handshake de red // inicia una conversación',
    'v2.contact.write': 'Escríbeme',
    'v2.case.back': 'Volver a trayectoria',
    'v2.case.overview': 'Resumen',
    'otc.title': 'Outside the Code',
    'otc.lede': 'Vida, deporte y viajes — lo que da forma a cómo pienso.',
    'otc.travel': 'Sobre mí (About Me)',
    'otc.travelNote': 'Escalada, vías ferratas, viajes por el mundo, atardeceres y momentos que me definen más allá de la pantalla.',
    'otc.keysKicker': 'Hobbies // viajes · escalada · mercados · teclados',
    'otc.keys': 'Teclados mecánicos',
    'otc.trialBox': 'Prueba de velocidad: escribe aquí el texto que aparece',
    'otc.sandboxBox': 'Escritura libre: teclea lo que quieras para oír los switches',
    'otc.keysNote': 'Los teclados mecánicos son un hobby práctico: cada build equilibra distribución, materiales, switches, sonido y tacto. No son solo un accesorio de escritorio; son una herramienta ajustada a cómo pienso y trabajo.',
    'otc.keysDetail': 'El reto de velocidad comparte esa obsesión por el feedback. El explorador de Fotos Build documenta cada teclado capa a capa, desde el case hasta el switch.',
    'v2.case.stack': 'Stack',

    'v2.hero.status': 'Disponible para nuevos retos',
    'v2.hero.greeting': 'Hola, soy',
    'otc.soundOn': 'Sonido activado',
    'otc.soundOff': 'Sonido desactivado',
    'v2.footer.gameHint': 'Pulsa ⚡ para el minijuego de Killua',

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
