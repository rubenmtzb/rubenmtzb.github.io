export const film = { width: 1920, height: 1080, fps: 25, rate: 48000,
  source: { width: 1440, height: 760 }, screen: { x: 96, y: 98, width: 1728, height: 912 } };
export const story = [
  { id: 'intro', seconds: 5, title: 'SARS-CoV-2', label: 'MUTATION PORTAL / RESEARCH SOFTWARE',
    es: 'SARS-CoV-2 Mutation Portal. Una visita real al portal de investigación de la URV.',
    en: 'SARS-CoV-2 Mutation Portal. A real visit to the URV research portal.' },
  { id: 'home', seconds: 9, title: '01 / El contexto de los datos', label: 'PORTAL PÚBLICO / CAPTURA REAL',
    es: 'La página explica el conjunto de datos. La fecha que muestra es 26 de febrero de 2024; no implica actualización en tiempo real.',
    en: 'The homepage explains the dataset. Its displayed date is 26 February 2024; this is not a live-data claim.' },
  { id: 'genes', seconds: 12, title: '02 / Encontrar una región', label: 'GENES / BÚSQUEDA REAL',
    es: 'Escribimos «spike» en la tabla de genes: aparecen dos regiones entre las 36 entradas.',
    en: 'Typing “spike” in the gene table returns two regions from 36 entries.' },
  { id: 'filters', seconds: 16, title: '03 / Acotar la consulta', label: 'SELECTORES NATIVOS / TECLADO',
    es: 'Seleccionamos con el teclado spike y Spain, y un porcentaje mayor de 50. Se envía una consulta real y acotada.',
    en: 'Using the native controls by keyboard, select spike, Spain and a percentage above 50. Submit a real, bounded query.' },
  { id: 'results', seconds: 14, title: '04 / Leer el resultado', label: 'TABLA / CUATRO RESULTADOS',
    es: 'La consulta devuelve cuatro filas. La búsqueda de tabla permite localizar D614G sin otra consulta al servidor.',
    en: 'The query returns four rows. Table search locates D614G without another server query.' },
  { id: 'scatter', seconds: 16, title: '05 / Explorar visualmente', label: 'SCATTER PLOT / HOVER + ZOOM',
    es: 'El gráfico real permite consultar una mutación al pasar el cursor y ampliar una región por selección.',
    en: 'The actual scatter plot shows mutation information on hover and supports selection zoom.' },
  { id: 'outro', seconds: 9, title: 'Datos con contexto.', label: 'INGENIERÍA / INVESTIGACIÓN',
    es: 'Captura puntual, no auditoría exhaustiva. La exportación Excel respondió HTTP 500 durante la inspección; no se simula ninguna descarga.',
    en: 'A point-in-time walkthrough, not an exhaustive audit. Excel export returned HTTP 500 during inspection; no download is simulated.' },
];
export const duration = story.reduce((sum, s) => sum + s.seconds, 0);
export function chapters() {
  let at = 0;
  return story.map(s => { const start = at; at += s.seconds; return { ...s, start, end: at }; });
}
export const timecode = seconds => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
