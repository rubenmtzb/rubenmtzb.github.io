import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chapters, duration, film, timecode } from './mutation-demo-story.mjs';
import { synthMutationAudio } from './synth-mutation-demo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [directory, modulePath] = process.argv.slice(2);
if (!directory || !modulePath) throw Error('Usage: node scripts/media/render-mutation-demo.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE');
const work = resolve(directory), output = join(root, 'public/media');
if (/(^|\/)(public|tmp)(\/|$)/.test(work)) throw Error('Private non-temporary work directory required');
const manifest = JSON.parse(await readFile(join(work, 'capture-manifest.json'), 'utf8'));
const inspection = JSON.parse(await readFile(join(work, 'inspection.json'), 'utf8'));
if (!manifest.complete || manifest.clips.length !== 5) throw Error('Complete live capture is required; no fixture fallback exists');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const run = (tool, args) => {
  const result = spawnSync(tool, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status) throw Error(`${tool}: ${result.error?.message || result.stderr}`);
  return result.stdout;
};
const escape = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function helix() {
  let svg = '';
  for (let i = 0; i < 18; i++) {
    const y = 30 + i * 24, x1 = 170 + Math.sin(i * .43) * 120, x2 = 170 - Math.sin(i * .43) * 120;
    svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#255468" stroke-width="2"/>
      <circle cx="${x1}" cy="${y}" r="${i % 4 === 0 ? 7 : 4}" fill="${i % 4 === 0 ? '#6fe3ff' : '#318da9'}"/>
      <circle cx="${x2}" cy="${y}" r="4" fill="#647e91"/>`;
  }
  return `<svg width="340" height="480" viewBox="0 0 340 480">${svg}</svg>`;
}
function layout(scene) {
  const hero = ['intro', 'outro'].includes(scene.id);
  return `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#07111e;color:#e5f4fb;font-family:Arial,sans-serif}
  body{background:radial-gradient(ellipse at 82% 18%,#103448 0,transparent 46%),radial-gradient(ellipse at 4% 100%,#122335 0,transparent 52%),#07111e}
  .grid{position:absolute;inset:0;opacity:.15;background-image:linear-gradient(#6593a122 1px,transparent 1px),linear-gradient(90deg,#6593a122 1px,transparent 1px);background-size:64px 64px}
  .brand{position:absolute;left:96px;top:34px;font-size:24px;font-weight:700;letter-spacing:1px}.brand span{color:#6fe3ff}
  .chapter{position:absolute;left:470px;top:36px;font-size:25px;color:#d6edf7}.label{position:absolute;right:96px;top:43px;font-size:14px;letter-spacing:1.8px;color:#88b3c6}
  .frame{position:absolute;left:94px;top:96px;width:1732px;height:916px;border:2px solid #2b586c;border-radius:10px;box-shadow:0 28px 60px #0007;background:#fff}
  .footer{position:absolute;left:96px;bottom:29px;font-size:17px;letter-spacing:.3px;color:#9ab8c7}.footer b{color:#6fe3ff}.credit{position:absolute;right:96px;bottom:29px;font-size:17px;color:#9ab8c7}
  .hero{position:absolute;left:128px;top:210px;width:1300px}.eyebrow{font-size:19px;color:#6fe3ff;letter-spacing:4px;margin-bottom:34px}
  h1{font-size:109px;line-height:1.08;letter-spacing:-4.5px;margin:0 0 35px}h1 span{color:#6fe3ff}
  .lead{font-size:31px;line-height:1.5;color:#b0c8d5;max-width:1140px}.en{font-size:24px;color:#80a3b5;margin-top:23px}
  .pill{display:inline-block;margin-top:35px;border:1px solid #31687c;border-radius:24px;background:#10334488;color:#a0e4f7;padding:12px 24px;font-size:18px;letter-spacing:1px}
  .art{position:absolute;right:120px;top:286px;opacity:.9}.notice{margin-top:32px;border-left:3px solid #6fe3ff;padding:5px 0 5px 22px;max-width:1100px;font-size:23px;line-height:1.5;color:#b6d2df}
  </style><div class="grid"></div><div class="brand">MUTATION <span>/ PORTAL</span></div>
  ${hero ? `<div class="hero"><div class="eyebrow">${escape(scene.label)}</div>
  <h1>${scene.id === 'intro' ? 'SARS-CoV-2<br><span>Mutation Portal.</span>' : 'Datos con<br><span>contexto.</span>'}</h1>
  <div class="lead">${scene.id === 'intro' ? 'Exploración de mutaciones. Contexto científico.<br>Un recorrido por la aplicación real de la URV.' : 'Genes, filtros, tabla y exploración visual.<br>Un recorrido real, no una auditoría exhaustiva.'}</div>
  <div class="en">${scene.id === 'intro' ? 'Genomic data. Visual exploration. Research context.' : 'Real public portal · Point-in-time demonstration'}</div>
  ${scene.id === 'intro' ? '<div class="pill">WEB REAL · INTERFAZ ORIGINAL · SIN DATOS SIMULADOS</div>' : '<div class="notice">Excel: HTTP 500 durante la inspección. No se simula una descarga.<br>Snapshot mostrado por el portal: 26/02/2024. Disponibilidad variable.</div>'}</div>
  <div class="art">${helix()}</div>` : `<div class="chapter">${escape(scene.title)}</div><div class="label">${escape(scene.label)}</div><div class="frame"></div>`}
  <div class="footer"><b>CAPTURA REAL</b> · 07 SEP 2026 · Snapshot del portal: 26 FEB 2024</div>
  <div class="credit">RUBÉN MARTÍNEZ / SOFTWARE ENGINEERING</div></html>`;
}
await mkdir(output, { recursive: true });
const { chromium } = await import(pathToFileURL(resolve(modulePath)));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: film.width, height: film.height } });
  await page.route('**/*', route => route.abort());
  for (const scene of chapters()) {
    await page.setContent(layout(scene));
    await page.screenshot({ path: join(work, `${scene.id}-frame.png`) });
  }
} finally { await browser.close(); }
const events = [], sources = [], parts = [];
for (const scene of chapters()) {
  const clip = manifest.clips.find(c => c.id === scene.id);
  const inputs = ['-loop', '1', '-framerate', String(film.fps), '-i', join(work, `${scene.id}-frame.png`)];
  let filter = '[0:v]setsar=1[v]';
  if (clip) {
    if (!clip.cursorSamples?.length || clip.cursorSamples.some(s => !s.connected || !s.visible))
      throw Error(`Cursor visibility monitoring failed: ${scene.id}`);
    const frames = clip.frames.filter(f => f.at < scene.seconds).map(f => ({ ...f, at: Math.max(0, f.at) }))
      .sort((a, b) => a.sourceTimestamp - b.sourceTimestamp);
    const frameBytes = createHash('sha256');
    for (const frame of frames) frameBytes.update(await readFile(join(work, 'capture', frame.file)));
    frames[0].at = 0;
    const concat = ['ffconcat version 1.0'];
    for (let i = 0; i < frames.length; i++) {
      const length = (frames[i + 1]?.at ?? scene.seconds) - frames[i].at;
      if (length <= 0) continue;
      concat.push(`file '${join(work, 'capture', frames[i].file).replaceAll("'", "'\\''")}'`, `duration ${length.toFixed(6)}`);
    }
    concat.push(`file '${join(work, 'capture', frames.at(-1).file).replaceAll("'", "'\\''")}'`);
    await writeFile(join(work, `${scene.id}-source.ffconcat`), concat.join('\n') + '\n');
    inputs.push('-f', 'concat', '-safe', '0', '-i', join(work, `${scene.id}-source.ffconcat`));
    filter = `[0:v]fade=t=in:st=0:d=0.2:color=0x07111e,fade=t=out:st=${scene.seconds - .2}:d=0.2:color=0x07111e[framing];[1:v]fps=${film.fps},scale=${film.screen.width}:${film.screen.height},setsar=1[screen];[framing][screen]overlay=${film.screen.x}:${film.screen.y}:shortest=1[v]`;
    for (const event of clip.events) {
      if (event.at < 0 || event.at >= scene.seconds) continue;
      events.push({ kind: event.kind, at: scene.start + event.at, chapter: scene.id,
        sourceAt: event.at, epochMs: event.epochMs, key: event.key, metaKey: event.metaKey, ctrlKey: event.ctrlKey,
        xy: event.xy, target: event.target, value: event.value });
    }
    sources.push({ chapter: scene.id, seconds: scene.seconds, frames: frames.length,
      sourceTimestampStart: frames[0].sourceTimestamp, sourceTimestampEnd: frames.at(-1).sourceTimestamp,
      frameLedgerSha256: hash(Buffer.from(JSON.stringify(clip.frames))),
      frameBytesSha256: frameBytes.digest('hex'),
      cursor: { initialXY: clip.initialPointer, monitoredSamples: clip.cursorSamples.length,
        invisibleSamples: clip.cursorSamples.filter(s => !s.connected || !s.visible).length,
        actualPointerMoves: clip.events.filter(e => e.kind === 'pointermove').length,
        largestMonitorGapMs: Math.max(...clip.cursorSamples.slice(1).map((s, i) => s.epochMs - clip.cursorSamples[i].epochMs)) },
      presentation: 'Actual Chromium paint frames sorted by source timestamps (CDP delivery may reorder adjacent paints); timestamp-preserving holds sampled to 25 fps. No speed changes or substituted responses.' });
  }
  const fadeIn = scene.id === 'intro' ? .6 : .2, fadeOut = scene.id === 'outro' ? .8 : .2;
  filter += clip ? ';[v]null[out]'
    : `;[v]fade=t=in:st=0:d=${fadeIn}:color=0x07111e,fade=t=out:st=${scene.seconds - fadeOut}:d=${fadeOut}:color=0x07111e[out]`;
  const part = join(work, `${scene.id}-part.mp4`);
  run('ffmpeg', ['-v', 'error', '-nostdin', '-y', ...inputs, '-filter_complex_threads', '1',
    '-filter_complex', filter, '-map', '[out]', '-t', String(scene.seconds), '-an', '-c:v', 'libx264',
    '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(film.fps), '-threads', '2', part]);
  parts.push(part);
}
const audio = await synthMutationAudio(work, join(root, 'public/keyboards/sound/hhkb.mp3'), events);
await writeFile(join(work, 'mutation-concat.txt'), parts.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
const media = join(output, 'mutation-portal-demo.mp4');
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'mutation-concat.txt'),
  '-i', join(work, 'mutation-score.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
  '-af', 'loudnorm=I=-21:TP=-2:LRA=7', '-ar', String(film.rate), '-ac', '2', '-c:a', 'aac', '-b:a', '192k',
  '-t', String(duration), '-movflags', '+faststart', media]);
run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', join(work, 'intro-frame.png'), '-frames:v', '1',
  '-q:v', '2', join(output, 'mutation-portal-demo-poster.jpg')]);
for (const language of ['es', 'en']) {
  await writeFile(join(output, `mutation-portal-demo.${language}.vtt`), `WEBVTT\n\n${chapters().map(s =>
    `${timecode(s.start)} --> ${timecode(s.end)}\n${s[language]}`).join('\n\n')}\n`);
}
const requests = [...inspection.requests, ...manifest.requests].filter(r => {
  const url = new URL(r.url);
  return url.hostname === 'sarscov2-mutation-portal.urv.cat' && (url.pathname === '/' || /\.php$/.test(url.pathname));
}).map(r => ({ method: r.method, endpoint: new URL(r.url).pathname, status: r.status, error: r.error }));
const provenance = {
  schema: 1, title: 'SARS-CoV-2 Mutation Portal — real public application',
  capturedAt: manifest.capturedAt, inspectedAt: inspection.inspectedAt,
  source: 'http://sarscov2-mutation-portal.urv.cat/',
  videoSha256: hash(await readFile(media)), bytes: (await stat(media)).size,
  durationSeconds: duration, outputResolution: '1920x1080', sourceResolution: '1440x760', fps: film.fps,
  snapshot: { displayedGisaidDate: '26/02/2024', claim: 'Date as displayed by the portal; no current-data or completeness claim.' },
  disclosure: 'Real university-hosted public application, original native light presentation. No fixtures, response mocks, synthetic results or changed application CSS. Availability is external and variable.',
  limitations: ['Point-in-time functional inspection, not exhaustive testing or scientific validation.',
    'Excel export returned HTTP 500 and net::ERR_INVALID_RESPONSE during inspection. No successful export or download is shown.',
    'Native select controls are operated by visible keyboard selection; OS dropdown surfaces are not captured and no replacement list is fabricated.',
    'The native chart instruction alert was acknowledged; browser-modal surfaces are not part of the page capture.',
    'No dedicated lineage filter or table-row detail links were found. Lineage count is a table column; no unsupported feature is claimed.',
    'The country condition filters mutation presence; displayed percentages are not asserted to be Spain-specific.',
    'The original wide table overflows horizontally, so later columns are not visible simultaneously. The original sticky navigation overlaps the table heading in the scatter view. Neither issue is hidden with a CSS patch or fabricated interface.',
    'An initial take unintentionally left the percentage range unset, returning 1081 rows; it was rejected before use. The final recorded query is verified to return four rows.',
    'GISAID-derived on-screen data remain subject to GISAID terms. No dataset or export is redistributed.'],
  inputMethod: 'Real Playwright mouse movement, pointer presses, keyboard character input and native controls. Every DOM pointermove is recorded. The in-capture cursor is continuously mounted before DOMContentLoaded, persists at the last actual coordinates across navigation, and remains visible during reading and typing. Only click rings decay. No fabricated file picker.',
  editing: 'Original cyan genomic framing and abstract decorative helix. Only framing and title cards fade: application pixels and their single baked cursor never fade out. Native app clips retain wall-clock action timing. Five explicitly edited chapters; off-chapter navigation omitted. Pointer position changes at chapter cuts are editorial discontinuities between real recordings, not invented continuous trajectories.',
  sourceClips: sources, chapters: chapters().map(({ id, start, end, es, en }) => ({ id, start, end, es, en })),
  events, requests, verifiedFunctions: manifest.checks, audio,
  reproduction: {
    inspect: 'node scripts/media/inspect-mutation-demo.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE',
    capture: 'node scripts/media/capture-mutation-demo.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE',
    render: 'node scripts/media/render-mutation-demo.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE',
    cursorVerify: 'node scripts/media/verify-mutation-cursor.mjs PRIVATE_WORKDIR',
    verify: 'node scripts/media/verify-mutation-demo.mjs PRIVATE_WORKDIR',
    privacy: 'Raw frames, downloaded data if any, request logs, diagnostics and audio stems stay in the private session files/mutation-demo directory, outside public/.',
  },
};
await writeFile(join(output, 'mutation-portal-demo.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ duration, sha256: provenance.videoSha256, bytes: provenance.bytes, events: events.length, audioCues: audio.cues.length }));
