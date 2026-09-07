export const financeV2 = {
  width: 1920, height: 1080, fps: 25, rate: 48000, seconds: 182,
  screen: { x: 96, y: 94, width: 1728, height: 912 },
  source: { width: 1440, height: 760 },
  chapters: [
    { id: 'intro', seconds: 4, title: 'Finance Core', subtitle: 'Finanzas personales, con contexto.' },
    { id: 'calendar', seconds: 24, title: '01 / Del mes al detalle', subtitle: 'Indicadores · calendario mensual · movimientos del día' },
    { id: 'accounts', seconds: 12, title: '02 / Tus cuentas, conectadas al contexto', subtitle: 'Entidades · saldos · inversión manual' },
    { id: 'banks', seconds: 12, title: '03 / Conectar exige consentimiento', subtitle: 'GoCardless de solo lectura · no configurado en esta demo' },
    { id: 'file-selection', seconds: 14, title: '04 / Elegir el origen de los datos', subtitle: 'CSV sintético local · selección explicada sin mostrar archivos personales' },
    { id: 'csv-review', seconds: 18, title: 'Revisar. Confirmar. No duplicar.', subtitle: 'Vista previa real · dos filas · protección de duplicados' },
    { id: 'analysis', seconds: 12, title: '05 / Reconocer los hábitos', subtitle: 'Tendencias · categorías · ahorro' },
    { id: 'goals', seconds: 12, title: '06 / Convertir el ahorro en objetivos', subtitle: 'Objetivo sintético · progreso real y reversible' },
    { id: 'budgets', seconds: 12, title: '07 / Poner límites con perspectiva', subtitle: 'Presupuesto local · límite y gasto acumulado' },
    { id: 'planning', seconds: 14, title: '08 / Explorar una decisión', subtitle: 'Escenario de ahorro extra · estimación, no promesa' },
    { id: 'subscriptions', seconds: 12, title: '09 / Revisar los pagos recurrentes', subtitle: 'Registro local · no cancela servicios de terceros' },
    { id: 'advisor', seconds: 18, title: '10 / Contexto antes de preguntar', subtitle: 'Asesor: datos y memoria locales · chat externo no disponible' },
    { id: 'crypto', seconds: 12, title: '11 / Registrar cantidades y coste', subtitle: 'Sin precios, P&L, wallets conectadas ni operaciones' },
    { id: 'outro', seconds: 6, title: 'Claridad, sin cajas negras.', subtitle: 'Aplicación real · datos sintéticos · código privado' },
  ],
  pointerPolicy: {
    continuous: true,
    scope: 'Every application frame, including navigation, typing, selection and waiting for results.',
    initialPosition: 'Move the actual mouse to a visible neutral position before capture begins.',
    motion: 'Progressive eased trajectories from the last real coordinate; no teleports or per-chapter reset.',
    appearance: 'Persistent opaque cursor; only click rings fade. Exactly one composed cursor track follows actual mousemove events; clean browser frames contain no baked pointer.',
    validation: 'Check every decoded UI frame for exactly one cursor, actual-event coordinates, bounds and continuity; zero document reloads after initial entry.',
  },
  fileSelection: {
    seconds: 2.8,
    treatment: 'Clearly labelled editorial reconstruction, not a native operating-system picker or an application feature.',
    headline: 'Selección de archivo · reconstrucción editorial',
    disclosure: 'No es el selector del sistema / Not native',
    filename: 'DEMO-extracto-generico.csv',
    origin: 'CARPETA DEMO · SOLO DATOS SINTÉTICOS',
    explanation: 'Este mismo CSV se seleccionará después en la aplicación real.',
  },
};
let cursor = 0;
for (const chapter of financeV2.chapters) {
  chapter.start = cursor; cursor += chapter.seconds; chapter.end = cursor;
}
if (cursor !== financeV2.seconds) throw Error('Finance v2 storyboard duration mismatch');
