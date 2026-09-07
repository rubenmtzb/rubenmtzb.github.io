import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { financeV2 as film } from './finance-demo-v2-story.mjs';
import { pointerGlyph } from './finance-demo-v2-pointer.mjs';
import { synthFinanceV2 } from './synth-finance-demo-v2.mjs';
import { verifyFinanceOriginal } from './preserve-finance-demo.mjs';

const [capturePath, workPath, playwrightPath] = process.argv.slice(2);
if (!capturePath || !workPath || !playwrightPath) throw Error('Usage: node scripts/media/render-finance-demo-v2.mjs PRIVATE_CAPTURE_JSON PRIVATE_WORKDIR PLAYWRIGHT_MODULE');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), media = join(root, 'public/media');
const sourceDir = dirname(resolve(capturePath)), work = resolve(workPath);
if (work.includes('/public/') || /(^|\/)tmp(\/|$)/.test(work)) throw Error('Raw work must stay private');
await verifyFinanceOriginal();
await mkdir(work, { recursive: true, mode: 0o700 }); await mkdir(join(work, 'overlays'), { recursive: true });
const capture = JSON.parse(await readFile(resolve(capturePath), 'utf8'));
if (capture.captureError || capture.documents !== 1 || capture.blocked.length || capture.errors.length) throw Error('Capture is not a verified one-document real workflow');
const restoration = JSON.parse(await readFile(join(sourceDir, 'restoration.json'), 'utf8'));
if (!restoration.passed) throw Error('Synthetic baseline not restored');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const xml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const stamp = seconds => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
function run(tool, args) {
  const result = spawnSync(tool, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status) throw Error(`${tool}: ${result.error || result.stderr}`);
  return result.stdout;
}
const uiFrames = Math.ceil(capture.seconds * film.fps), uiSeconds = uiFrames / film.fps, seconds = uiSeconds + 10;
const intro = { ...film.chapters[0], start: 0, end: 4 };
const scenes = capture.chapters.map((scene, index) => ({
  ...film.chapters.find(chapter => chapter.id === scene.id),
  start: 4 + (index ? Math.round(scene.start * film.fps) / film.fps : 0),
  end: 4 + (capture.chapters[index + 1] ? Math.round(capture.chapters[index + 1].start * film.fps) / film.fps : uiSeconds),
}));
const outro = { ...film.chapters.at(-1), start: uiSeconds + 4, end: seconds };
const chapters = [intro, ...scenes, outro];
for (const chapter of chapters) chapter.seconds = chapter.end - chapter.start;
const eventTime = event => 4 + (event.epoch - capture.origin) / 1000;
const chronological = [...capture.events].sort((a, b) => a.epoch - b.epoch);
const events = chronological.map(event => ({ ...event, at: eventTime(event),
  outputX: event.xy ? Math.round(event.xy[0]) - 3 : null, outputY: event.xy ? Math.round(event.xy[1]) - 3 : null }));
const pointerEvents = events.filter(event => event.kind === 'pointermove' && event.trusted && event.xy);
const clicks = events.filter(event => event.kind === 'pointerdown' && event.trusted && event.at >= 4 && event.at < outro.start);
const typing = events.filter((event, index) => event.kind === 'keydown' && event.trusted && event.visibleEditable
  && event.observedInput && !event.modifierHeld && (event.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(event.key))
  && (event.modifierHeld !== undefined || !events.slice(Math.max(0, index - 5), index).some(previous => previous.kind === 'keydown'
    && ['Meta', 'Control', 'Alt'].includes(previous.key) && event.at - previous.at < .15)));
const soundEvents = [...clicks, ...typing].map(event => ({ id: event.id, kind: event.kind,
  at: Math.round(event.at * film.fps) / film.fps, source: event.source })).sort((a, b) => a.at - b.at);
const sprite = pointerGlyph.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const pointerFrames = [];
let last = { application: null, editorial: null }, eventIndex = 0;
for (let frame = 0; frame < uiFrames; frame++) {
  const at = 4 + frame / film.fps;
  while (eventIndex < pointerEvents.length && pointerEvents[eventIndex].at <= at) {
    const event = pointerEvents[eventIndex++]; last[event.source] = event;
  }
  const inTray = capture.editorial && at >= 4 + capture.editorial.start && at < 4 + capture.editorial.end;
  const source = inTray ? 'editorial' : 'application';
  const event = last[source];
  if (!event) throw Error(`No actual initial pointer for ${source} at frame ${frame}`);
  const x = event.outputX, y = event.outputY;
  if (x < 0 || y < 0 || x + 30 > 1440 || y + 38 > 760) throw Error(`Pointer out of bounds at ${frame}`);
  let overlay = '';
  if (inTray) {
    const selected = at >= 4 + capture.editorial.selectedAt;
    overlay += `<rect x="257" y="292" width="933" height="222" rx="13" fill="#10231c" stroke="#5c9b79" stroke-width="2"/>
      <text x="282" y="327" font-family="Arial" font-size="22" font-weight="600" fill="#d5eadd">Selección de archivo · reconstrucción editorial</text>
      <rect x="285" y="360" width="880" height="82" rx="9" fill="${selected ? '#183c29' : '#0d1a16'}" stroke="${selected ? '#7ce5af' : '#3f614f'}" stroke-width="2"/>
      <text x="309" y="409" font-family="Arial" font-size="17" fill="#9bdfb9">CSV</text>
      <text x="373" y="409" font-family="Arial" font-size="25" fill="#dceee2">${xml(capture.editorial.filename)}</text>
      ${selected ? '<circle cx="1124" cy="401" r="13" fill="#8fe5b5"/><text x="1115" y="410" fill="#08271a" font-family="Arial" font-size="25">✓</text>' : ''}
      <text x="282" y="487" font-family="Arial" font-size="17" fill="#a8c1b2">No es el selector del sistema / Not native</text>`;
  }
  for (const click of clicks) {
    const elapsed = at - click.at;
    if (click.source === source && elapsed >= 0 && elapsed < .55) {
      overlay += `<circle cx="${click.xy[0]}" cy="${click.xy[1]}" r="${17 + elapsed * 36}" fill="none" stroke="#96f2c8" stroke-width="2" opacity="${1 - elapsed / .55}"/>`;
    }
  }
  overlay += `<g transform="translate(${x} ${y})">${sprite}</g>`;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="760">${overlay}</svg>`))
    .png().toFile(join(work, 'overlays', `${String(frame).padStart(6, '0')}.png`));
  pointerFrames.push({ index: frame + 100, x, y, eventId: event.id, source, renderedInstances: 1,
    sourcePointerInstances: 0 });
}
await writeFile(join(work, 'pointer-ledger.json'), JSON.stringify({ fps: 25, totalFrames: Math.round(seconds * 25),
  bounds: { left: 0, right: 1410, top: 0, bottom: 722 }, uiRanges: [{ from: 100, to: 100 + uiFrames }],
  frames: pointerFrames, events: events.map(({ id, kind, trusted, at, source, outputX, outputY, visibleEditable, observedInput, programmaticFill }) =>
    ({ id, kind, trusted, at, source, outputX, outputY, visibleEditable, observedInput, programmaticFill })),
  keyCues: soundEvents.filter(event => event.kind === 'keydown').map(event => ({ eventId: event.id, at: event.at })) }) + '\n');

const rawFrames = capture.frames.filter(frame => frame.at < uiSeconds);
const concat = rawFrames.flatMap((frame, index) => [`file '${join(sourceDir, frame.file)}'`,
  `duration ${Math.max(.000001, (rawFrames[index + 1]?.at ?? uiSeconds) - frame.at).toFixed(6)}`]);
concat.push(`file '${join(sourceDir, rawFrames.at(-1).file)}'`);
await writeFile(join(work, 'source-concat.txt'), concat.join('\n') + '\n');
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'source-concat.txt'),
  '-vf', 'fps=25', '-t', String(uiSeconds), '-c:v', 'libx264', '-preset', 'fast', '-crf', '15',
  '-pix_fmt', 'yuv420p', '-threads', '2', join(work, 'clean-source.mp4')]);
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', join(work, 'clean-source.mp4'), '-framerate', '25',
  '-i', join(work, 'overlays/%06d.png'), '-filter_complex_threads', '1',
  '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1[v]', '-map', '[v]', '-an', '-t', String(uiSeconds),
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '15', '-pix_fmt', 'yuv420p', '-threads', '2', join(work, 'guided-ui.mp4')]);
const { chromium } = await import(pathToFileURL(resolve(playwrightPath)).href);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
  await page.route('**/*', route => route.abort());
  for (const chapter of chapters) {
    const hero = ['intro', 'outro'].includes(chapter.id);
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;color-scheme:dark;background:#050e12;color:#dcece4;font-family:Arial,sans-serif}
      body{background:radial-gradient(ellipse at 80% 18%,#15392e 0,transparent 47%),#050e12}
      header{position:absolute;left:96px;top:34px;font-size:26px;font-weight:bold}b{color:#65dfae}
      .chapter{position:absolute;left:340px;top:39px;font-size:24px;color:#d3e9df}.label{position:absolute;right:96px;top:44px;font-size:15px;color:#8cac9f;letter-spacing:1px}
      .frame{position:absolute;left:94px;top:92px;width:1732px;height:916px;border:2px solid #24483d;border-radius:12px;background:#080f18}
      footer{position:absolute;left:96px;bottom:29px;font-size:18px;color:#9cb3aa}.credit{position:absolute;right:96px;bottom:29px;font-size:18px;color:#9cb3aa}
      .hero{position:absolute;left:130px;top:240px}.kicker{font-size:19px;letter-spacing:4px;color:#97c1ac}h1{font-size:96px;line-height:1.08;letter-spacing:-4px;margin:35px 0}
      p{font-size:31px;line-height:1.5;color:#aec6b9}.pill{display:inline-block;border:1px solid #497b61;border-radius:28px;padding:13px 25px;font-size:19px;color:#92dfb7;background:#163326}
      </style><header>FINANCE <b>CORE</b></header>${hero ? `<section class="hero"><div class="kicker">APLICACIÓN REAL / DATOS SINTÉTICOS</div><h1>${chapter.id === 'intro' ? 'Tus finanzas.<br><b>Con todo su contexto.</b>' : 'Claridad,<br><b>sin cajas negras.</b>'}</h1><p>${chapter.id === 'intro' ? 'Del calendario mensual a cada decisión.<br>Un recorrido continuo por la aplicación real.' : 'Datos sintéticos. Acciones reales.<br>Sin bancos conectados, precios en vivo ni IA externa.'}</p><div class="pill">REAL APPLICATION · LOCAL DEMO · PRIVATE SOURCE</div></section>`
        : `<div class="chapter">${xml(chapter.title)}</div><div class="label">RECORRIDO REAL · DEMO LOCAL</div><div class="frame"></div>`}
      <footer><b>DEMO</b> · Datos sintéticos · Sin bancos, precios en vivo ni IA externa</footer><div class="credit">RUBÉN MARTÍNEZ / SOFTWARE ENGINEERING</div>`);
    await page.screenshot({ path: join(work, `${chapter.id}-frame.png`) });
  }
} finally { await browser.close(); }
const parts = [];
for (const chapter of chapters) {
  const hero = ['intro', 'outro'].includes(chapter.id), length = chapter.end - chapter.start;
  const inputs = ['-loop', '1', '-framerate', '25', '-i', join(work, `${chapter.id}-frame.png`)];
  if (!hero) inputs.push('-ss', String(chapter.start - 4), '-i', join(work, 'guided-ui.mp4'));
  const filter = hero ? '[0:v]setsar=1[v]'
    : '[1:v]scale=1728:912:flags=lanczos,setsar=1[ui];[0:v][ui]overlay=96:94:shortest=1[v]';
  const part = join(work, `${chapter.id}-part.mp4`);
  run('ffmpeg', ['-v', 'error', '-nostdin', '-y', ...inputs, '-filter_complex_threads', '1',
    '-filter_complex', filter, '-map', '[v]', '-t', String(length), '-an', '-c:v', 'libx264',
    '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '25', '-threads', '2', part]);
  parts.push(part);
}
await writeFile(join(work, 'parts.txt'), parts.map(part => `file '${part}'`).join('\n') + '\n');
const audio = await synthFinanceV2(join(work, 'score.wav'), soundEvents, seconds);
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'parts.txt'),
  '-i', join(work, 'score.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
  '-af', 'loudnorm=I=-21:TP=-2:LRA=7', '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k',
  '-t', String(seconds), '-movflags', '+faststart', join(work, 'finance-core-demo.mp4')]);
const captions = {
  intro: ['Finance Core: un recorrido continuo por la aplicación real con datos sintéticos.', 'Finance Core: a continuous walkthrough of the real application with synthetic data.'],
  calendar: ['Consulta el mes, abre sus opciones y revisa los movimientos reales de un día. Todos los importes de esta demo son ficticios.', 'Inspect the month, open its options and review the actual transactions for one day. Every amount in this demo is fictitious.'],
  accounts: ['Cuentas agrupadas y detalle de saldos. El patrimonio incluye inversión manual: no es todo dinero líquido.', 'Grouped accounts and balance details. Net worth includes manual investments: it is not all liquid cash.'],
  banks: ['GoCardless permite conexión de solo lectura con proveedor y consentimiento. Aquí no está configurado: se utiliza el flujo CSV local.', 'GoCardless supports read-only connections with provider configuration and consent. It is not configured here: the local CSV workflow is used.'],
  'file-selection': ['Se abre el selector real. Una breve bandeja editorial muestra el CSV sintético; después se selecciona ese mismo archivo en la aplicación. No es Finder ni el selector del sistema.', 'The real file chooser is opened. A brief editorial tray shows the synthetic CSV; that same file is then selected in the application. This is not a native system picker.'],
  'csv-review': ['Vista previa sin escritura: dos filas nuevas. Tras confirmar, repetir el archivo muestra dos duplicados y cero nuevos.', 'Preview without writing: two new rows. After confirmation, previewing the same file shows two duplicates and zero new rows.'],
  analysis: ['La analítica refleja los movimientos locales, incluidos los recién importados. Tendencias, categorías y ahorro, sin datos de mercado externos.', 'Analytics reflect local transactions, including the new import. Trends, categories and savings, without external market data.'],
  goals: ['El progreso del objetivo sintético se edita de 8600 a 9000 euros. Es un registro local: no transfiere dinero.', 'The synthetic goal progress is edited from 8,600 to 9,000 euros. This is a local record: no money is transferred.'],
  budgets: ['Crear un presupuesto real de 250 euros para Salud y consultar el resultado. Esta pantalla permite alta y borrado, no edición del límite.', 'Create an actual 250-euro Health budget and inspect the result. This screen supports creation and deletion, not limit editing.'],
  planning: ['Escribe un ahorro extra, selecciona un objetivo y calcula un escenario local. Es una estimación, no una promesa financiera.', 'Type extra savings, select a goal and calculate a local scenario. It is an estimate, not a financial promise.'],
  subscriptions: ['Pausar y reactivar el seguimiento local de una suscripción. No cancela ni modifica contratos con proveedores.', 'Pause and reactivate local subscription tracking. This does not cancel or modify any provider contract.'],
  advisor: ['IA desactivada. Se escribe y guarda contexto manual en la memoria local del asesor; no es una respuesta generada ni una consulta externa.', 'AI disabled. Manual context is typed and saved in the advisor’s local memory; it is not a generated answer or an external request.'],
  crypto: ['Cripto local: cantidades y coste registrado. Se escribe texto sintético y se previsualizan tres posiciones, sin confirmar. Sin cotizaciones, P&L, wallets conectadas ni operaciones.', 'Local crypto: quantities and recorded cost. Synthetic text is typed and three positions are previewed, without confirmation. No market prices, P&L, connected wallets or trading.'],
  outro: ['Datos sintéticos; código privado. Los cambios de esta grabación se han restaurado. Sin conexiones externas ni resultados simulados.', 'Synthetic data; private source. Changes made for this recording have been restored. No external connections or mocked results.'],
};
await mkdir(media, { recursive: true });
await copyFile(join(work, 'finance-core-demo.mp4'), join(media, 'finance-core-demo.mp4'));
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', join(work, 'intro-frame.png'), '-frames:v', '1', '-q:v', '2', join(media, 'finance-core-demo-poster.jpg')]);
for (const [language, index] of [['es', 0], ['en', 1]]) {
  await writeFile(join(media, `finance-core-demo.${language}.vtt`), 'WEBVTT\n\n' + chapters.map(chapter =>
    `${stamp(chapter.start)} --> ${stamp(chapter.end)}\n${captions[chapter.id][index]}`).join('\n\n') + '\n');
}
const video = await readFile(join(media, 'finance-core-demo.mp4'));
const metadata = { schema: 2, title: 'Finance Core — continuous real application walkthrough', durationSeconds: seconds,
  videoSha256: sha(video), bytes: video.length, outputResolution: '1920x1080', sourceResolution: '1440x760', fps: 25,
  uiFrames, totalFrames: uiFrames + 250, chapters, audio,
  events: soundEvents.map(event => ({ ...event, frame: Math.round(event.at * 25) })),
  pointer: { policy: 'One composed pointer from actual trusted DOM trajectories on EVERY UI frame. No source-baked pointer, no UI/cursor fades, no invented interpolation.',
    realPointerMoves: pointerEvents.filter(event => event.source === 'application').length,
    editorialPointerMoves: pointerEvents.filter(event => event.source === 'editorial').length,
    privateLedgerSha256: sha(await readFile(join(work, 'pointer-ledger.json'))) },
  fileSelection: { treatment: 'Explicitly labelled compact editorial tray, not a native system picker or application modal.',
    start: 4 + capture.editorial.start, end: 4 + capture.editorial.end, filename: capture.editorial.filename,
    fileSha256: capture.editorial.sha256, fileBytes: capture.editorial.bytes,
    realChooserObserved: true, selectedFileHashMatched: capture.editorial.actualInput.hash === capture.editorial.sha256 },
  application: { documentRequests: capture.documents, reloadsAfterEntry: capture.documents - 1, externalAttempts: capture.blocked.length,
    pageErrors: capture.errors.length, realResponses: capture.requests.length, failedResponses: capture.requests.filter(request => request.status >= 400).length,
    mocks: false, sourceAndRawEvidence: 'Private; no source, session data, headers, request bodies or local endpoints are published.' },
  restoration, editing: 'One continuous browser capture, chronological chapter framing only. Actual native options and actual API changes. The single disclosed file-selection tray temporarily replaces the pointer context; no desktop/OS recording. Original plucked-string/percussion score and observed-key/click sounds.',
  limits: ['Synthetic isolated SQLite data, not production migration validation.', 'GoCardless read-only connector not configured or exercised externally.',
    'Advisor chat/AI unavailable; only genuine local manual memory is demonstrated.', 'Crypto is quantities/cost, without live valuation, P&L, wallet or trading integration.',
    'Subscription changes affect local tracking only. Savings projections are estimates.', 'Current browser supports progressive native select styling; other engines are not claimed as tested.'],
  originalBackup: 'finance-core-demo-original.mp4',
  reproduction: 'node scripts/media/render-finance-demo-v2.mjs PRIVATE_CAPTURE_JSON PRIVATE_WORKDIR PLAYWRIGHT_MODULE' };
await writeFile(join(media, 'finance-core-demo.json'), JSON.stringify(metadata, null, 2) + '\n');
await writeFile(join(work, 'render-summary.json'), JSON.stringify({ ...metadata, privateSource: capturePath }, null, 2));
await verifyFinanceOriginal();
console.log(JSON.stringify({ seconds, uiFrames, bytes: video.length, sha256: metadata.videoSha256, clicks: audio.clickCount, keys: audio.keyCount }));
