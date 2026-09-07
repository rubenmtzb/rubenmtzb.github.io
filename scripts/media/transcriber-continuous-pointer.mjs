import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { pointerGlyph } from './finance-demo-v2-pointer.mjs';

export const geometry = { width: 1280, height: 720, x: 568, y: 191, fps: 25, first: 75, end: 991, frames: 1066 };
export const trajectoryPolicy = 'One opaque editorial pointer on all 916 application frames. The original recording has NO mouse telemetry. Smooth interpolation between inspected controls and explicitly editorial resting positions is reconstructed, NOT a genuine recorded trajectory. Click and visible-input timings are unchanged. The two 120 ms successive-click intervals necessarily have fast travel; neither clicks nor montage are slowed or relocated.';
const sha = value => createHash('sha256').update(value).digest('hex');
const xml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function pointerTrack(ledger) {
  const target = id => {
    const event = ledger.events.find(event => event.id === id);
    assert.ok(event, `Missing inspected target ${id}`);
    return event.xy;
  };
  const anchors = [
    [3, [780, 332]], [6.16, [780, 332]], [6.96, target('submit')], [7.28, target('submit')],
    [7.96, [734, 604]], [15.8, [734, 604]], [16.4, target('translation')], [18, target('translation')],
    [18.64, target('dual')], [21.56, target('dual')], [21.88, target('search')], [24.8, target('search')],
    [25.52, target('seek')], [26.2, target('seek')], [27.32, target('reading')], [28.4, target('reading')],
    [29.56, target('exit-reading')], [29.84, target('exit-reading')], [29.96, target('txt')],
    [30.36, target('txt')], [30.72, target('srt')], [31.12, target('srt')],
    [31.44, target('vtt')], [31.8, target('vtt')], [32.08, target('md')], [32.16, target('md')],
    [32.72, target('image')], [33.24, target('image')], [34.24, target('new')], [34.4, target('new')],
    [35.6, target('history')], [35.84, target('history')], [35.96, target('history-dual')],
    [36.8, target('history-dual')], [37.56, [1170, 450]], [39.6, [1170, 450]],
  ].map(([at, xy]) => ({ frame: Math.round(at * 25), xy }));
  const positions = [];
  let segment = 0;
  for (let index = geometry.first; index < geometry.end; index++) {
    while (segment < anchors.length - 2 && anchors[segment + 1].frame < index) segment++;
    const a = anchors[segment], b = anchors[segment + 1];
    const t = Math.max(0, Math.min(1, (index - a.frame) / (b.frame - a.frame)));
    // A bounded quintic eases normal travel; short original click pairs cannot be retimed.
    const p = t * t * t * (10 + t * (-15 + 6 * t));
    const x = Math.round(a.xy[0] + (b.xy[0] - a.xy[0]) * p) - 3;
    const y = Math.round(a.xy[1] + (b.xy[1] - a.xy[1]) * p) - 3;
    assert.ok(x >= 0 && y >= 0 && x + pointerGlyph.width <= geometry.width
      && y + pointerGlyph.height <= geometry.height, `Pointer out of bounds at ${index}`);
    positions.push({ index, x, y });
  }
  for (const click of ledger.events.filter(event => event.kind === 'click')) {
    const position = positions[Math.round(click.at * 25) - geometry.first];
    assert.deepEqual([position.x + 3, position.y + 3], click.xy, `Pointer misses actual click: ${click.id}`);
  }
  return positions;
}

export async function renderPointerOverlays(work, ledger) {
  const directory = join(work, 'overlays');
  await mkdir(directory);
  const track = pointerTrack(ledger);
  const sprite = pointerGlyph.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const transparent = await sharp({ create: { width: 1280, height: 720, channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  for (let frame = 0; frame < geometry.frames; frame++) {
    const file = join(directory, `${String(frame).padStart(4, '0')}.png`);
    const pointer = track[frame - geometry.first];
    if (!pointer) { await writeFile(file, transparent); continue; }
    const at = frame / 25;
    let overlay = '';
    for (const event of ledger.events) {
      if (at < event.start || at >= event.end) continue;
      const alpha = Math.min(1, (at - event.start + .04) / .12, (event.end - at) / .12);
      const [x, y] = event.xy;
      overlay += `<g opacity="${alpha.toFixed(3)}">`;
      if (event.focusRect) {
        const [fx, fy, width, height] = event.focusRect;
        overlay += `<rect x="${fx}" y="${fy}" width="${width}" height="${height}" rx="10" fill="none" stroke="#d3afff" stroke-width="2" opacity=".65"/>`;
      }
      if (event.kind === 'click' && at >= event.at) {
        const age = at - event.at;
        if (age < .48) overlay += `<circle cx="${x}" cy="${y}" r="${14 + age * 36}" fill="none" stroke="#e5c9ff" stroke-width="2.5" opacity="${1 - age / .48}"/>`;
      }
      for (const pulse of event.pulses ?? []) {
        const age = at - pulse;
        if (age >= 0 && age < .52) overlay += `<circle cx="${x}" cy="${y}" r="${12 + age * 24}" fill="none" stroke="#bd8cff" stroke-width="2" opacity="${.8 * (1 - age / .52)}"/>`;
      }
      const [lx, ly] = event.labelXY, width = event.label.length * 11 + 24;
      overlay += `<rect x="${lx}" y="${ly}" width="${width}" height="34" rx="9" fill="#181020" fill-opacity=".94" stroke="#ad7bd9" stroke-opacity=".75"/>
        <text x="${lx + 12}" y="${ly + 23}" font-family="Arial" font-size="17" font-weight="600" fill="#f0e4ff">${xml(event.label)}</text></g>`;
    }
    overlay += `<g transform="translate(${pointer.x} ${pointer.y})">${sprite}</g>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">${overlay}</svg>`))
      .png().toFile(file);
  }
  return { directory, positionsSha256: sha(JSON.stringify(track)), trajectoryPolicy,
    renderedUiFrames: track.length, renderedInstancesPerUiFrame: 1, opacity: 1 };
}

// Full-area silhouette counting follows verify-mutation-cursor, using the shared Finance glyph.
async function pointerScanner() {
  const template = await sharp(Buffer.from(pointerGlyph.svg)).raw().toBuffer();
  const mask = [], width = geometry.width;
  for (let y = 0; y < pointerGlyph.height; y++) for (let x = 0; x < pointerGlyph.width; x++) {
    const offset = (y * pointerGlyph.width + x) * 4;
    if (template[offset + 3] === 255 && (template[offset] > 180 || template[offset] < 30))
      mask.push({ x, y, white: template[offset] > 180, rgb: [...template.subarray(offset, offset + 3)] });
  }
  const nearest = (x, y, white) => mask.filter(point => point.white === white)
    .sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - (b.x - x) ** 2 - (b.y - y) ** 2)[0];
  const sparse = [nearest(3, 12, false), nearest(8, 12, true), nearest(3, 25, false),
    nearest(17, 29, true), nearest(21, 31, false), nearest(8, 19, true)]
    .map(point => ({ offset: (point.y * width + point.x) * 3, white: point.white }));
  const offsets = mask.map(point => ({ offset: (point.y * width + point.x) * 3, rgb: point.rgb }));
  return data => {
    const clusters = [];
    for (let y = 0; y <= geometry.height - pointerGlyph.height; y++) for (let x = 0; x <= width - pointerGlyph.width; x++) {
      const base = (y * width + x) * 3;
      if (data[base + sparse[0].offset] > 100 || data[base + sparse[1].offset] < 155) continue;
      let candidate = true;
      for (let i = 2; i < sparse.length; i++) {
        const value = data[base + sparse[i].offset];
        if (sparse[i].white ? value < 155 : value > 110) { candidate = false; break; }
      }
      if (!candidate) continue;
      let error = 0;
      for (const point of offsets) for (let c = 0; c < 3; c++) error += Math.abs(data[base + point.offset + c] - point.rgb[c]);
      error /= offsets.length * 3;
      if (error > 32) continue;
      const cluster = clusters.find(point => Math.abs(point.x - x) <= 4 && Math.abs(point.y - y) <= 4);
      if (cluster) { if (error < cluster.error) Object.assign(cluster, { x, y, error }); }
      else clusters.push({ x, y, error });
    }
    return clusters;
  };
}

export async function auditPointer(file, ledger, evidence, { cleanSource = false } = {}) {
  await mkdir(evidence, { recursive: true, mode: 0o700 });
  const track = pointerTrack(ledger), scan = await pointerScanner(), coverage = [];
  const at = time => Math.round(time * 25);
  const pairs = [
    { kind: 'url-typing', frames: [at(4.16), at(5.96)] },
    { kind: 'search-typing', frames: [at(21.92), at(23.12)] },
    { kind: 'waiting', frames: [at(8.08), at(12.4)] },
    { kind: 'scrolling', frames: [at(7.32), at(7.6)] },
    { kind: 'between-actions', frames: [at(14), at(15)] },
    { kind: 'rapid-export', frames: [at(29.84), at(29.96)] },
    { kind: 'rapid-history', frames: [at(35.84), at(35.96)] },
    { kind: 'last-ui-frame', frames: [989, 990] },
    ...[10, 16, 21, 28, 32, 36.52].map(time => ({ kind: `chapter-${time}`, frames: [at(time) - 1, at(time)] })),
  ];
  const wanted = new Set(pairs.flatMap(pair => pair.frames)), images = new Map();
  const decoder = spawn('ffmpeg', ['-v', 'error', '-xerror', '-nostdin', '-ss', '3', '-i', file,
    '-t', '36.64', '-an', '-sn', '-vf', 'crop=1280:720:568:191:exact=1', '-pix_fmt', 'rgb24', '-threads', '1', '-f', 'rawvideo', '-'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '', index = 0, buffer = Buffer.alloc(0);
  decoder.stderr.on('data', data => { stderr += data.toString(); });
  const exited = new Promise((resolve, reject) => { decoder.once('error', reject); decoder.once('close', resolve); });
  exited.catch(() => {});
  const frameBytes = geometry.width * geometry.height * 3;
  try {
  for await (const chunk of decoder.stdout) {
    buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
    while (buffer.length >= frameBytes) {
      const data = buffer.subarray(0, frameBytes), frame = geometry.first + index;
      const found = scan(data), expected = track[index];
      assert.ok(expected, 'Unexpected extra application frame');
      const visible = found.length === 1 && Math.abs(found[0].x - expected.x) <= 2
        && Math.abs(found[0].y - expected.y) <= 2;
      coverage.push({ frame, cursors: found.length, found, expected: [expected.x, expected.y], visible,
        inBounds: found.every(p => p.x >= 0 && p.y >= 0
          && p.x + pointerGlyph.width <= geometry.width && p.y + pointerGlyph.height <= geometry.height) });
      if (!cleanSource && wanted.has(frame)) images.set(frame, Buffer.from(data));
      buffer = buffer.subarray(frameBytes); index++;
    }
  }
  } catch (error) {
    decoder.kill('SIGTERM');
    await exited.catch(() => {});
    throw error;
  }
  assert.equal(await exited, 0, stderr); assert.equal(buffer.length, 0); assert.equal(index, 916);
  const largestStep = Math.max(...track.slice(1).map((p, i) => Math.hypot(p.x - track[i].x, p.y - track[i].y)));
  const report = {
    totalUiFrames: 916, inspectedUiFrames: index, firstFrame: 75, lastFrame: 990,
    cursorCoveredFrames: coverage.filter(frame => frame.visible).length,
    missingFrames: coverage.filter(frame => frame.cursors === 0).length,
    multipleCursorFrames: coverage.filter(frame => frame.cursors > 1).length,
    outOfBoundsFrames: coverage.filter(frame => !frame.inBounds).length,
    coordinatesInBoundsFrames: coverage.filter(frame => frame.cursors === 1 && frame.inBounds).length,
    maximumAdjacentFrameStepPixels: Number(largestStep.toFixed(3)),
    maximumTemplateError: Math.max(0, ...coverage.flatMap(frame => frame.found.map(p => p.error))),
    coverageLedgerSha256: sha(JSON.stringify(coverage)), positionsSha256: sha(JSON.stringify(track)),
    method: 'Scan the entire native 1280x720 application crop in EVERY decoded final UI frame for all shared-glyph silhouettes; cluster adjacent raster matches. Confirm unique match, expected position and glyph bounds. Not a click-only or expected-position-only check.',
    trajectory: trajectoryPolicy, cleanSource, pairs: cleanSource ? [] : pairs,
  };
  report.passed = cleanSource ? coverage.every(frame => frame.cursors === 0)
    : report.cursorCoveredFrames === 916 && report.multipleCursorFrames === 0 && report.outOfBoundsFrames === 0;
  const prefix = cleanSource ? 'clean-source' : 'continuous-pointer';
  await writeFile(join(evidence, `${prefix}-all-ui-frames.json`), JSON.stringify(coverage) + '\n');
  await writeFile(join(evidence, `${prefix}-audit.json`), JSON.stringify(report, null, 2) + '\n');
  assert.ok(report.passed, `Full-area pointer audit failed; inspect ${prefix}-all-ui-frames.json`);
  if (!cleanSource) for (const pair of pairs) {
    assert.ok(pair.frames.every(frame => images.has(frame)), `Missing frame pair: ${pair.kind}`);
    await sharp({ create: { width: 2560, height: 720, channels: 3, background: '#080910' } })
      .composite(pair.frames.map((frame, i) => ({ input: images.get(frame),
        raw: { width: 1280, height: 720, channels: 3 }, left: i * 1280, top: 0 })))
      .png().toFile(join(evidence, `cursor-pair-${pair.kind}.png`));
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--self-test', 'Usage: node scripts/media/transcriber-continuous-pointer.mjs --self-test');
  const ledger = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), 'transcriber-demo-events.json')));
  const track = pointerTrack(ledger);
  assert.equal(track.length, 916);
  const scan = await pointerScanner();
  const canvas = () => sharp({ create: { width: 1280, height: 720, channels: 3, background: '#34343c' } });
  assert.equal(scan(await canvas().raw().toBuffer()).length, 0);
  const glyph = Buffer.from(pointerGlyph.svg);
  const one = await canvas().composite([{ input: glyph, left: 100, top: 200 }]).removeAlpha().raw().toBuffer();
  assert.equal(scan(one).length, 1);
  assert.equal(scan(await canvas().composite([{ input: glyph, left: 100, top: 200 },
    { input: glyph, left: 900, top: 500 }]).removeAlpha().raw().toBuffer()).length, 2);
  const invalid = structuredClone(ledger);
  invalid.events.find(event => event.id === 'new').xy = [1279, 719];
  assert.throws(() => pointerTrack(invalid));
  assert.throws(() => pointerTrack({ events: [] }));
  console.log('Continuous pointer: 916 positions/14 click targets; empty/single/double pixel scans and invalid tracks passed.');
}
