export const film = { width: 1920, height: 1080, fps: 30, rate: 48000,
  source: { width: 1440, height: 760 }, screen: { x: 80, y: 104, width: 1760, height: 704 } };
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

// These are editorial camera windows, never replacement application pixels.
export const framing = {
  home: { x: 0, y: 0, width: 1440, height: 576 },
  genes: { x: 140, y: 150, width: 1160, height: 464 },
  filters: { x: 160, y: 160, width: 1160, height: 464 },
  results: { x: 0, y: 90, width: 1440, height: 576 },
  scatter: { x: 0, y: 110, width: 1440, height: 576 },
};

export const callouts = {
  home: [
    { start: 0, end: 4.5, title: 'Una aplicación de investigación real', detail: 'Portal público de la URV · Datos derivados de GISAID' },
    { start: 4.5, end: 9, title: 'Snapshot: 26 de febrero de 2024', detail: 'La fecha del portal no implica datos en tiempo real.' },
  ],
  genes: [
    { start: 0, end: 4.5, title: 'Busca una región: spike', detail: 'La búsqueda filtra la tabla mientras escribimos.' },
    { start: 4.5, end: 12, title: '2 regiones, de 36 entradas', detail: 'Coordenadas del gen y descripción de su función.' },
  ],
  filters: [
    { start: 0, end: 7, title: 'Un gen + un país', detail: 'spike y Spain · Selección real con el teclado' },
    { start: 7, end: 16, title: 'Porcentaje > 50 · Consulta acotada', detail: 'El país filtra presencia; no recalcula el porcentaje por país.' },
  ],
  results: [
    { start: 0, end: 4.5, title: '4 resultados reales', detail: 'Mutación, posición, cambio de aminoácido y frecuencia.' },
    { start: 4.5, end: 8.2, title: 'D614G: localizar sin otra consulta', detail: 'La búsqueda de tabla actúa sobre las cuatro filas recibidas.' },
    { start: 8.2, end: 14, title: 'Volvemos a las cuatro filas', detail: 'Limpiar la búsqueda no modifica los datos del portal.' },
  ],
  scatter: [
    { start: 0, end: 6, title: 'Del resultado al gráfico', detail: 'Pasa el cursor: cada punto muestra una mutación.' },
    { start: 6, end: 11, title: 'Arrastra para ampliar una región', detail: 'Zoom nativo del gráfico · Sin resultados añadidos' },
    { start: 11, end: 16, title: 'Restablece la vista general', detail: 'Reset zoom conserva el conjunto de resultados.' },
  ],
};
