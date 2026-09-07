import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { chapters as storyChapters, film } from './mutation-demo-story.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const work = resolve(process.argv[2] || '');
if (!process.argv[2] || /(^|\/)(public|tmp)(\/|$)/.test(work))
  throw Error('Usage: node scripts/media/verify-mutation-cursor.mjs PRIVATE_WORKDIR');
const manifest = JSON.parse(await readFile(join(work, 'capture-manifest.json'), 'utf8'));
const metadata = JSON.parse(await readFile(join(root, 'public/media/mutation-portal-demo.json'), 'utf8'));
const template = await sharp(Buffer.from('<svg width="28" height="36" viewBox="0 0 28 36"><path d="M2 2L3 28l7-7 6 12 5-3-6-11h10Z" fill="white" stroke="#10212a" stroke-width="2"/></svg>')).raw().toBuffer();
const mask = [];
for (let y = 0; y < 36; y++) for (let x = 0; x < 28; x++) {
  const index = (y * 28 + x) * 4;
  if (template[index + 3] === 255 && (template[index] > 245 || template[index] < 30))
    mask.push({ x, y, rgb: [...template.subarray(index, index + 3)] });
}
const chapters = [];
for (const clip of manifest.clips) {
  const events = [{ at: -Infinity, xy: clip.initialPointer }, ...clip.events.filter(e => e.kind === 'pointermove')]
    .sort((a, b) => a.at - b.at);
  const frames = [...clip.frames].filter(f => f.at < clip.seconds).sort((a, b) => a.at - b.at);
  const failures = [], matches = [];
  for (const frame of frames) {
    const { data, info } = await sharp(join(work, 'capture', frame.file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const previous = events.findLastIndex(e => e.at <= frame.at);
    const candidates = events.slice(Math.max(0, previous - 4), Math.min(events.length, previous + 3));
    let best = { error: Infinity, xy: null };
    for (const event of candidates) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.round(event.xy[0]) + dx, y = Math.round(event.xy[1]) + dy;
      if (x < 0 || y < 0 || x + 28 > info.width || y + 36 > info.height) continue;
      let error = 0;
      for (const point of mask) {
        const offset = ((y + point.y) * info.width + x + point.x) * 3;
        for (let c = 0; c < 3; c++) error += Math.abs(data[offset + c] - point.rgb[c]);
      }
      error /= mask.length * 3;
      if (error < best.error) best = { error, xy: [x, y] };
    }
    const record = { at: frame.at, error: Number(best.error.toFixed(3)), xy: best.xy, file: frame.file };
    matches.push(record);
    if (best.error > 43) failures.push(record);
  }
  chapters.push({ id: clip.id, checkedPaintFrames: frames.length, maxTemplateError: Math.max(...matches.map(m => m.error)),
    actualPointerMoves: clip.events.filter(e => e.kind === 'pointermove').length,
    domSamples: clip.cursorSamples.length,
    domInvisibleSamples: clip.cursorSamples.filter(s => !s.connected || !s.visible).length,
    failures, matchesSha256: createHash('sha256').update(JSON.stringify(matches)).digest('hex') });
}
const uiChapters = storyChapters().filter(s => !['intro', 'outro'].includes(s.id));
const firstUiFrame = uiChapters[0].start * film.fps;
const totalUiFrames = uiChapters.reduce((n, s) => n + s.seconds * film.fps, 0);
const frameAt = time => Math.round(time * film.fps);
const typed = metadata.events.find(e => e.kind === 'input' && e.value === 'D614G');
const option = metadata.events.find(e => e.kind === 'change' && e.value === 'Saint Lucia');
const pairs = [
  { kind: 'waiting', frames: [frameAt(typed.at + 1), frameAt(typed.at + 2)] },
  { kind: 'typing', frames: [frameAt(16.45), frameAt(16.85)] },
  { kind: 'scrolling', frames: [frameAt(9.2), frameAt(9.6)] },
  { kind: 'between-actions', frames: [frameAt(20.1), frameAt(20.5)] },
  { kind: 'native-option-selection', frames: [frameAt(option.at + .06), frameAt(option.at + .3)] },
  ...uiChapters.slice(1).map(s => ({ kind: `chapter-cut-${s.id}`, frames: [s.start * film.fps - 1, s.start * film.fps] })),
];
const wantedFrames = new Set(pairs.flatMap(p => p.frames));
const pairImages = new Map(), coverage = [];
const width = film.source.width, height = film.source.height, frameBytes = width * height * 3;
const closest = (x, y, white) => mask.filter(p => (p.rgb[0] > 245) === white)
  .sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - (b.x - x) ** 2 - (b.y - y) ** 2)[0];
const sparse = [
  closest(2, 12, false), closest(7, 12, true), closest(3, 25, false),
  closest(17, 28, true), closest(20, 29, false), closest(7, 19, true),
].map(p => ({ offset: (p.y * width + p.x) * 3, white: p.rgb[0] > 245 }));
const offsets = mask.map(p => ({ offset: (p.y * width + p.x) * 3, rgb: p.rgb }));
function findEveryArrow(data) {
  const clusters = [];
  for (let y = 0; y <= height - 36; y++) for (let x = 0; x <= width - 28; x++) {
    const base = (y * width + x) * 3;
    if (data[base + sparse[0].offset] > 100 || data[base + sparse[1].offset] < 160) continue;
    let candidate = true;
    for (let i = 2; i < sparse.length; i++) {
      const value = data[base + sparse[i].offset];
      if (sparse[i].white ? value < 160 : value > 110) { candidate = false; break; }
    }
    if (!candidate) continue;
    let error = 0;
    for (const p of offsets) for (let c = 0; c < 3; c++) error += Math.abs(data[base + p.offset + c] - p.rgb[c]);
    error /= offsets.length * 3;
    if (error > 32) continue;
    const cluster = clusters.find(c => Math.abs(c.x - x) <= 5 && Math.abs(c.y - y) <= 5);
    if (cluster) { if (error < cluster.error) Object.assign(cluster, { x, y, error }); }
    else clusters.push({ x, y, error });
  }
  return clusters;
}
const decoder = spawn('ffmpeg', ['-v', 'error', '-xerror', '-nostdin', '-ss', String(uiChapters[0].start),
  '-i', join(root, 'public/media/mutation-portal-demo.mp4'), '-t', String(totalUiFrames / film.fps),
  '-an', '-sn', '-vf', `crop=${film.screen.width}:${film.screen.height}:${film.screen.x}:${film.screen.y},scale=${width}:${height}`,
  '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
decoder.stderr.on('data', data => { stderr += data.toString(); });
const exit = new Promise((resolve, reject) => { decoder.once('error', reject); decoder.once('close', resolve); });
let buffer = Buffer.alloc(0), index = 0;
for await (const chunk of decoder.stdout) {
  buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
  while (buffer.length >= frameBytes) {
    const data = buffer.subarray(0, frameBytes);
    const frame = firstUiFrame + index;
    const arrows = findEveryArrow(data);
    coverage.push({ frame, cursors: arrows.length, coordinates: arrows.map(p => [p.x, p.y]),
      inBounds: arrows.every(p => p.x >= 0 && p.y >= 0 && p.x + 28 <= width && p.y + 36 <= height),
      matchError: arrows.length ? Math.min(...arrows.map(p => p.error)) : null });
    if (wantedFrames.has(frame)) pairImages.set(frame, Buffer.from(data));
    buffer = buffer.subarray(frameBytes);
    index++;
  }
}
if (await exit !== 0 || buffer.length) throw Error(`Complete UI-frame decode failed: ${stderr}`);
for (const pair of pairs) {
  pair.coverage = pair.frames.map(frame => coverage.find(c => c.frame === frame));
  if (pair.frames.some(frame => !pairImages.has(frame))) throw Error(`Missing frame pair: ${pair.kind}`);
  await sharp({ create: { width: width * 2, height, channels: 3, background: '#07111e' } })
    .composite(pair.frames.map((frame, i) => ({ input: pairImages.get(frame),
      raw: { width, height, channels: 3 }, left: i * width, top: 0 })))
    .png().toFile(join(work, `cursor-pair-${pair.kind}.png`));
}
const encoded = {
  totalUiFrames, inspectedUiFrames: coverage.length,
  cursorCoveredFrames: coverage.filter(c => c.cursors >= 1).length,
  missingFrames: coverage.filter(c => c.cursors === 0).length,
  multipleCursorFrames: coverage.filter(c => c.cursors > 1).length,
  coordinatesInBoundsFrames: coverage.filter(c => c.cursors === 1 && c.inBounds).length,
  coverageLedgerSha256: createHash('sha256').update(JSON.stringify(coverage)).digest('hex'),
  scan: 'Every decoded application-footage frame is scanned over the full native UI area for all matching arrow silhouettes, not only the expected pointer location or click frames. Nearby raster matches are one cursor, not duplicate pointers.',
  trajectory: 'Genuine DOM pointermove trajectories inside each chapter. Explicit editorial cuts omit navigation between chapters; positions at those cuts are real source positions, not fabricated interpolation.',
  pairs,
};
await writeFile(join(work, 'mutation-cursor-all-ui-frames.json'), JSON.stringify(coverage) + '\n');
const report = { videoSha256: metadata.videoSha256, checkedAt: new Date().toISOString(),
  method: 'Pixel-template matching against genuine DOM pointer coordinates in every source paint, plus whole-UI arrow counting on every final encoded application frame. Static holds, typing, scrolling, option selection and chapter boundaries are included.',
  passed: chapters.every(c => !c.failures.length && c.domInvisibleSamples === 0)
    && coverage.length === totalUiFrames && encoded.missingFrames === 0 && encoded.multipleCursorFrames === 0
    && encoded.coordinatesInBoundsFrames === totalUiFrames,
  chapters, encoded };
await writeFile(join(work, 'mutation-cursor-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, encoded: { ...encoded, pairs: pairs.length } }));
if (!report.passed) throw Error('A captured paint frame failed continuous cursor visibility verification');
