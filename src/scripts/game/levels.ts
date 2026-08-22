/**
 * Los tres niveles y las formas que los describen.
 *
 * Un nivel no dibuja plataformas propias: las toma de la página. Cada orbe
 * apunta a un selector real del portfolio —el carrusel, una tarjeta, el
 * teclado— y el juego usa el elemento como geometría. `fallbackRatio` es dónde
 * ponerlo si ese elemento no está en la página, que es lo que pasa en la V1 y
 * en las fichas de proyecto.
 *
 * Son datos, así que viven fuera del bucle: añadir un nivel no debería obligar
 * a abrir el fichero donde se juega.
 */

export type Rect = { x: number; y: number; w: number; isCustom?: boolean }
export type MovingLedge = { x: number; y: number; w: number; originX: number; range: number; speed: number; dir: number }
export type CustomLedge = { x: number; y: number; w: number; alpha: number }
export type SectionOrb = {
  id: string
  name: string
  x: number
  y: number
  taken: boolean
  seed: number
}

export type OrbTarget = {
  selector?: string
  fallbackRatio: { x: number; y: number }
  name: { es: string; en: string }
}

export type LevelConfig = {
  level: number
  title: { es: string; en: string }
  sub: { es: string; en: string }
  targets: OrbTarget[]
}

export type ComicBubble = {
  text: string
  startTime: number
  duration: number
  mood?: 'normal' | 'alert' | 'godspeed' | 'success'
}

// Niveles curados de calidad y fluidez
export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    title: { es: 'NIVEL 1: Examen de Cazador', en: 'LEVEL 1: Hunter Exam' },
    sub: { es: 'Supera las pruebas iniciales en Identidad y Experiencia.', en: 'Pass the initial trials across Identity & Experience.' },
    targets: [
      { selector: '#identity', fallbackRatio: { x: 0.25, y: 0.05 }, name: { es: 'Identidad', en: 'Identity' } },
      { selector: '.hero-tech-chip', fallbackRatio: { x: 0.68, y: 0.12 }, name: { es: 'Tecnologías', en: 'Tech Stack' } },
      { selector: '#work .job-panel', fallbackRatio: { x: 0.35, y: 0.26 }, name: { es: 'Experiencia Profesional', en: 'Work Experience' } },
      { selector: '#project-carousel', fallbackRatio: { x: 0.72, y: 0.32 }, name: { es: 'Muestra técnica', en: 'Technical Showcase' } },
    ],
  },
  {
    level: 2,
    title: { es: 'NIVEL 2: Greed Island', en: 'LEVEL 2: Greed Island' },
    sub: { es: 'Navega sobre plataformas móviles entre Proyectos y Archivo.', en: 'Ride moving platforms across Projects & Archive.' },
    targets: [
      { selector: '#work', fallbackRatio: { x: 0.25, y: 0.22 }, name: { es: 'Entrada Greed Island', en: 'Greed Island Entry' } },
      { selector: '#project-deck .project-grid-card:nth-of-type(1)', fallbackRatio: { x: 0.30, y: 0.40 }, name: { es: 'Proyecto Destacado (Izq)', en: 'Featured Project (Left)' } },
      { selector: '#project-deck .project-grid-card:nth-of-type(2)', fallbackRatio: { x: 0.70, y: 0.46 }, name: { es: 'Proyecto Destacado (Der)', en: 'Featured Project (Right)' } },
      { selector: '#archive .moment-card:nth-of-type(1)', fallbackRatio: { x: 0.48, y: 0.65 }, name: { es: 'Más allá del código', en: 'Outside the Code' } },
    ],
  },
  {
    level: 3,
    title: { es: 'NIVEL 3: Maestro Godspeed', en: 'LEVEL 3: Godspeed Master' },
    sub: { es: 'Recorrido completo hasta el final del portfolio desatando el aura eléctrica.', en: 'Full traversal all the way to Contact with electric aura.' },
    targets: [
      { selector: '#identity', fallbackRatio: { x: 0.25, y: 0.08 }, name: { es: 'Arranque Godspeed', en: 'Godspeed Start' } },
      { selector: '#project-carousel', fallbackRatio: { x: 0.75, y: 0.38 }, name: { es: 'Muestra de proyectos', en: 'Projects Showcase' } },
      { selector: '.profile-workbench', fallbackRatio: { x: 0.30, y: 0.52 }, name: { es: 'Educación y habilidades', en: 'Education & Skills' } },
      { selector: '#archive', fallbackRatio: { x: 0.70, y: 0.68 }, name: { es: 'Archivo Visual', en: 'Visual Archive' } },
      { selector: '#contact .contact-signal', fallbackRatio: { x: 0.50, y: 0.88 }, name: { es: 'Meta Final & Contacto ⚡', en: 'Final Goal & Contact ⚡' } },
    ],
  },
]
