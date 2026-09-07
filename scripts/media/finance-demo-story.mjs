export const financeStory = [
  { id: 'intro', seconds: 4, title: 'Finance Core', label: 'PERSONAL FINANCE / REAL APPLICATION',
    es: 'Finance Core. Un recorrido por la aplicación real, con datos sintéticos.',
    en: 'Finance Core. A real application walkthrough using synthetic data.' },
  { id: 'dashboard', seconds: 8, title: '01 / Una vista de conjunto', label: 'DASHBOARD',
    es: 'Patrimonio, ingresos y gastos en una vista. Los datos de esta demostración son ficticios.',
    en: 'Net worth, income and expenses in one view. All data in this demonstration is fictitious.' },
  { id: 'accounts', seconds: 7, title: '02 / Cada cuenta, en su lugar', label: 'CUENTAS / ACCOUNTS',
    es: 'Cuentas agrupadas por entidad. El patrimonio incluye inversión manual; no es todo dinero líquido.',
    en: 'Accounts grouped by institution. Net worth includes manual investments; it is not all liquid cash.' },
  { id: 'banks', seconds: 8, title: '03 / Conectar, con consentimiento', label: 'SOLO LECTURA / READ ONLY',
    es: 'El conector GoCardless de solo lectura requiere proveedor y consentimiento. Aquí no está configurado.',
    en: 'The read-only GoCardless connector requires provider configuration and consent. It is not configured here.' },
  { id: 'preview', seconds: 12, title: '04 / Revisar antes de importar', label: 'CSV / VISTA PREVIA',
    es: 'La alternativa local: seleccionar un CSV sintético y revisar la vista previa antes de confirmar.',
    en: 'The local alternative: select a synthetic CSV and review its preview before confirming.' },
  { id: 'duplicates', seconds: 8, title: 'Sin volver a contar lo mismo', label: 'PROTECCIÓN DE DUPLICADOS',
    es: 'Tras confirmar dos filas, se repite la vista previa: la protección de duplicados evita volver a contarlas.',
    en: 'After confirming two rows, preview the file again: duplicate protection prevents counting them twice.' },
  { id: 'analysis', seconds: 8, title: '05 / Entender los hábitos', label: 'ANÁLISIS / ANALYTICS',
    es: 'La analítica resume tendencias de ingresos, gastos y ahorro a partir de movimientos locales.',
    en: 'Analytics summarize income, spending and savings trends from local transactions.' },
  { id: 'planning', seconds: 10, title: '06 / Dar forma al ahorro', label: 'PLANIFICACIÓN / PLANNING',
    es: 'Un escenario de ahorro extra ayuda a explorar objetivos. Es una estimación, no una promesa financiera.',
    en: 'An extra-savings scenario helps explore goals. It is an estimate, not a financial promise.' },
  { id: 'crypto', seconds: 13, title: '07 / Registrar, sin inventar valor', label: 'CRIPTO / REGISTRO LOCAL',
    es: 'Criptoactivos locales: cantidades y coste registrado. Sin cotizaciones, P&L, wallets conectadas ni operaciones.',
    en: 'Local crypto holdings: quantities and recorded cost. No market prices, P&L, connected wallets or trading.' },
  { id: 'outro', seconds: 6, title: 'Claridad para decidir.', label: 'FINANCE CORE / ENGINEERING PORTFOLIO',
    es: 'Aplicación real, datos sintéticos. Sin bancos conectados, precios en vivo ni IA externa. Código privado.',
    en: 'Real application, synthetic data. No connected banks, live prices or external AI. Source code remains private.' },
];

export const film = { width: 1920, height: 1080, fps: 25, rate: 48000,
  screen: { x: 96, y: 94, width: 1728, height: 912 }, source: { width: 1440, height: 760 } };
export const duration = financeStory.reduce((sum, scene) => sum + scene.seconds, 0);
export const timecode = (seconds) => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
export function chapters() {
  let at = 0;
  return financeStory.map((scene) => { const start = at; at += scene.seconds; return { ...scene, start, end: at }; });
}
