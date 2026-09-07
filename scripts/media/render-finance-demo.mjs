import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chapters, duration, film, timecode } from './finance-demo-story.mjs';
import { synthFinanceAudio } from './synth-finance-demo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [mode, directory, playwrightPath, manifestPath] = process.argv.slice(2);
if (!['--prepare', '--render'].includes(mode) || !directory || !playwrightPath || (mode === '--render' && !manifestPath)) {
  throw Error('Usage: node scripts/media/render-finance-demo.mjs --prepare|--render PRIVATE_WORKDIR PLAYWRIGHT_MODULE [PRIVATE_MANIFEST]');
}
const work = resolve(directory);
if (work.startsWith(join(root, 'public')) || /(^|\/)(tmp|var\/tmp)(\/|$)/.test(work)) throw Error('Use a private, non-temporary work directory');
await mkdir(work, { recursive: true, mode: 0o700 });
const { chromium } = await import(pathToFileURL(resolve(playwrightPath)).href);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status) throw Error(`${command}: ${result.error?.message || result.stderr}`);
  return result;
}
function layout(scene) {
  const hero = scene.id === 'intro' || scene.id === 'outro';
  return `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#050c12;color:#e2eee9;color-scheme:dark;font-family:Arial,sans-serif}
  body{background:radial-gradient(ellipse at 83% 16%,#12372f 0,transparent 42%),radial-gradient(ellipse at 10% 100%,#0c2428 0,transparent 45%),#050c12}
  .brand{position:absolute;left:96px;top:34px;font-weight:700;font-size:26px;letter-spacing:-.6px}.brand span{color:#55e4b5}
  .chapter{position:absolute;left:340px;top:39px;font-size:24px;color:#d3e9df}.label{position:absolute;right:96px;top:42px;font-size:15px;letter-spacing:2px;color:#8cac9f}
  .frame{position:absolute;left:94px;top:92px;width:1732px;height:916px;border:2px solid #24483d;border-radius:12px;background:#080f18;box-shadow:0 25px 65px #0009}
  .footer{position:absolute;left:96px;bottom:29px;font-size:18px;letter-spacing:.4px;color:#9cb3aa}.demo{color:#65e1b7;font-weight:700}.credit{position:absolute;right:96px;bottom:29px;color:#9cb3aa;font-size:18px}
  .hero{position:absolute;left:130px;top:225px;width:1160px}.eyebrow{font-size:19px;color:#73ddb9;letter-spacing:4px;margin-bottom:34px}h1{font-size:112px;line-height:1.04;letter-spacing:-6px;margin:0 0 34px;max-width:1050px}h1 span{color:#5ee4b4}
  .lead{font-size:32px;line-height:1.5;color:#abc4b8;margin:0;max-width:1130px}.en{font-size:25px;color:#769f8e;margin-top:24px}.pill{display:inline-block;margin-top:42px;border:1px solid #376652;border-radius:24px;padding:12px 24px;font-size:20px;color:#97d8bd;background:#123027}
  .art{position:absolute;right:130px;top:272px;width:330px;height:420px}.line{height:2px;background:linear-gradient(90deg,#335849,#64dcb2);position:absolute;left:0;right:0}.ring{position:absolute;border:2px solid #244c3b;border-radius:50%;width:330px;height:330px;top:30px}.ring:after{content:"";position:absolute;inset:49px;border:2px solid #3a8764;border-radius:50%}.core{position:absolute;left:100px;top:130px;width:130px;height:130px;border:1px solid #59d2a5;border-radius:26px;transform:rotate(45deg);background:#123c2c;box-shadow:0 0 70px #37b58022}
  </style><div class="brand">FINANCE <span>CORE</span></div>
  ${hero ? `<div class="hero"><div class="eyebrow">${escape(scene.label)}</div><h1>${scene.id === 'intro' ? 'Tus finanzas.<br><span>Con perspectiva.</span>' : 'Claridad<br><span>para decidir.</span>'}</h1><p class="lead">${scene.id === 'intro' ? 'Cuentas, movimientos y planificación.<br>Un recorrido por la aplicación real.' : 'Datos sintéticos. Funcionalidad real.<br>Integraciones externas desactivadas.'}</p><p class="en">${scene.id === 'intro' ? 'A clear view of your personal finances.' : 'Real application. Synthetic data. Private source code.'}</p><div class="pill">DEMO LOCAL · SIN CONEXIONES EXTERNAS</div></div><div class="art"><div class="ring"></div><div class="core"></div><div class="line" style="top:0"></div><div class="line" style="bottom:0"></div></div>`
    : `<div class="chapter">${escape(scene.title)}</div><div class="label">${escape(scene.label)}</div><div class="frame"></div>`}
  <div class="footer"><span class="demo">DEMO</span> · Datos sintéticos · Sin bancos, precios en vivo ni IA externa</div>
  <div class="credit">RUBÉN MARTÍNEZ / SOFTWARE ENGINEERING</div></html>`;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-background-networking'] });
try {
  const page = await browser.newPage({ viewport: { width: film.width, height: film.height }, colorScheme: 'dark' });
  await page.route('**/*', (route) => route.abort());
  for (const scene of chapters()) {
    await page.setContent(layout(scene));
    await page.screenshot({ path: join(work, `${scene.id}-frame.png`) });
  }
} finally { await browser.close(); }

await writeFile(join(work, 'director-plan.json'), JSON.stringify({
  duration, film, chapters: chapters(), restrictions: [
    'Wait for explicit GO before recording; never capture login, users, security, terminals or source.',
    'Use only the isolated synthetic database. Never call real bank, market, AI or other providers.',
    'All application screens and modals are genuinely dark. No CSS substitutions of data or results.',
    'Use actual browser pointer events with monotonic times and actual frame timestamps.',
    'GoCardless is read-only and not configured. Show disabled state, then real CSV path.',
    'Crypto means local quantities and cost, not live prices, wallet integration or trading.',
    'Keep raw frames, scripts, request logs and session credentials private. Public artifacts are sanitized.',
  ],
}, null, 2) + '\n');

if (mode === '--prepare') {
  await synthFinanceAudio(join(work, 'score-preview.wav'));
  console.log(`Prepared ${chapters().length} original dark frames, ${duration}s synth preview and director plan. No application recording.`);
  process.exit(0);
}

const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
if (manifest.schema !== 1 || manifest.approvedToRecord !== true) throw Error('Missing explicit recording approval');
const clips = new Map(manifest.clips.map((clip) => [clip.id, clip]));
const events = [];
const parts = [];
const sources = [];
for (const scene of chapters()) {
  const clip = clips.get(scene.id);
  const hero = scene.id === 'intro' || scene.id === 'outro';
  if (!hero && (!clip || clip.duration + .04 < scene.seconds)) throw Error(`Missing or short real capture: ${scene.id}`);
  const inputs = ['-loop', '1', '-framerate', String(film.fps), '-i', join(work, `${scene.id}-frame.png`)];
  let filter = `[0:v]setsar=1[v]`;
  if (clip) {
    const file = resolve(dirname(resolve(manifestPath)), clip.file);
    inputs.push('-i', file);
    filter = `[1:v]fps=${film.fps},scale=${film.screen.width}:${film.screen.height},setsar=1[screen];[0:v][screen]overlay=${film.screen.x}:${film.screen.y}:shortest=1[v]`;
    sources.push({ chapter: scene.id, sha256: hash(await readFile(file)), seconds: scene.seconds,
      capture: 'Actual local browser screencast frames; constant-rate presentation with unchanged wall-clock timing.' });
    for (const event of clip.events) {
      if (!(event.at >= 0 && event.at < scene.seconds && Number.isFinite(event.monotonicMs))) throw Error('Out-of-range recorded action');
      const at = Math.round((scene.start + event.at) * film.fps) / film.fps;
      events.push({ kind: event.kind, chapter: scene.id, at, sourceAt: event.at,
        frame: Math.round(at * film.fps), monotonicMs: event.monotonicMs,
        ...(event.xy ? { xy: event.xy } : {}), action: event.action });
    }
  }
  const fadeIn = scene.id === 'intro' ? .4 : .16;
  const fadeOut = scene.id === 'outro' ? .7 : .16;
  filter += `;[v]fade=t=in:st=0:d=${fadeIn}:color=0x050c12,fade=t=out:st=${scene.seconds - fadeOut}:d=${fadeOut}:color=0x050c12[faded];[0:v]crop=1920:64:0:1016[footer];[faded][footer]overlay=0:1016[out]`;
  const file = join(work, `${scene.id}-part.mp4`);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...inputs,
    '-filter_complex_threads', '1', '-filter_complex', filter, '-map', '[out]', '-t', String(scene.seconds),
    '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-r', String(film.fps), '-threads', '2', file]);
  parts.push(file);
}
await writeFile(join(work, 'concat.txt'), parts.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
const audio = await synthFinanceAudio(join(work, 'score.wav'), events.filter((event) => event.kind === 'pointerdown'));
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'concat.txt'),
  '-i', join(work, 'score.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', 'loudnorm=I=-21:TP=-2:LRA=7',
  '-ar', String(film.rate), '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-t', String(duration),
  '-movflags', '+faststart', join(work, 'finance-core-demo.mp4')]);
const output = join(root, 'public/media');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'finance-core-demo.mp4'), await readFile(join(work, 'finance-core-demo.mp4')));
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', join(work, 'intro-frame.png'), '-frames:v', '1',
  '-q:v', '2', join(output, 'finance-core-demo-poster.jpg')]);
for (const language of ['es', 'en']) {
  await writeFile(join(output, `finance-core-demo.${language}.vtt`),
    `WEBVTT\n\n${chapters().map((scene) => `${timecode(scene.start)} --> ${timecode(scene.end)}\n${scene[language]}`).join('\n\n')}\n`);
}
const media = join(output, 'finance-core-demo.mp4');
const provenance = {
  schema: 1, title: 'Finance Core — real application / synthetic data',
  source: 'Isolated local application and synthetic SQLite database. Source repositories and raw captures remain private.',
  videoSha256: hash(await readFile(media)), bytes: (await stat(media)).size,
  durationSeconds: duration, outputResolution: '1920x1080', sourceResolution: '1440x760',
  fps: film.fps, audio: { ...audio, codec: 'AAC-LC', channels: 2, targetIntegratedLufs: -21 },
  disclosure: 'DEMO throughout. Synthetic data; no connected bank, live market data or external AI. GoCardless is implemented read-only but not configured; no external integration is demonstrated end-to-end.',
  limits: ['Crypto shows local quantities and recorded cost only; no prices, P&L, wallet connection or trading.',
    'Manual investment accounts are not a brokerage integration. Net worth is not all liquid cash.',
    'Savings scenarios are estimates, not financial advice or audited forecasts.',
    'Local SQLite walkthrough does not validate production PostgreSQL migrations or external integrations.'],
  editing: 'Original dark cards and chapter frames; brief dips to dark; real-time UI clips. Actual pointer events drive an in-capture cursor/halo and frame-quantized soft click sounds. No invented click cues, response mocks, speed changes or third-party audio.',
  sourceClips: sources,
  chapters: chapters().map(({ id, start, end, en, es }) => ({ id, start, end, en, es })),
  events,
  requests: manifest.publicRequestSummary,
  sourceTiming: manifest.publicTimingSummary,
  inputMethod: 'Guided Playwright mouse, keyboard, native-select and file-input actions. No application data or API responses replaced. The only presentation overlay is the actual-event-driven pointer and click halo.',
  reproduction: 'node scripts/media/render-finance-demo.mjs --render PRIVATE_WORKDIR PLAYWRIGHT_MODULE PRIVATE_MANIFEST',
};
await writeFile(join(output, 'finance-core-demo.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ duration, bytes: provenance.bytes, sha256: provenance.videoSha256, actions: events.length }));
