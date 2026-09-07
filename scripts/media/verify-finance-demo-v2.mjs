import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { pointerGlyph, verifyFinancePointer } from './finance-demo-v2-pointer.mjs';
import { verifyFinanceOriginal } from './preserve-finance-demo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), media = join(root, 'public/media');
const work = resolve(process.argv[2] || '');
if (!process.argv[2] || work.includes('/public/') || /(^|\/)tmp(\/|$)/.test(work)) {
  throw Error('Usage: node scripts/media/verify-finance-demo-v2.mjs PRIVATE_RENDER_DIRECTORY');
}
await verifyFinanceOriginal();
const metadata = JSON.parse(await readFile(join(media, 'finance-core-demo.json'), 'utf8'));
assert.equal(metadata.schema, 2);
const file = join(media, 'finance-core-demo.mp4'), bytes = await readFile(file);
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(sha(bytes), metadata.videoSha256); assert.equal(bytes.length, metadata.bytes);
const ledgerFile = join(work, 'pointer-ledger.json'), ledger = JSON.parse(await readFile(ledgerFile, 'utf8'));
assert.equal(sha(await readFile(ledgerFile)), metadata.pointer.privateLedgerSha256);
function run(tool, args, binary = false) {
  const result = spawnSync(tool, args, { encoding: binary ? null : 'utf8', maxBuffer: 192 * 1024 * 1024 });
  if (result.error || result.status) throw Error(`${tool}: ${result.error || result.stderr}`);
  return result;
}
const info = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
const video = info.streams.find(stream => stream.codec_type === 'video');
const audio = info.streams.find(stream => stream.codec_type === 'audio');
assert.equal(info.streams.length, 2);
assert.equal(video.codec_name, 'h264'); assert.equal(video.width, 1920); assert.equal(video.height, 1080);
assert.equal(video.pix_fmt, 'yuv420p'); assert.equal(video.avg_frame_rate, '25/1');
assert.equal(Number(video.nb_frames), metadata.totalFrames);
assert.ok(Math.abs(Number(info.format.duration) - metadata.durationSeconds) < .002);
assert.equal(Number(video.start_time), 0); assert.equal(Number(audio.start_time), 0);
assert.equal(audio.codec_name, 'aac'); assert.equal(audio.profile, 'LC'); assert.equal(audio.channels, 2);
assert.equal(Number(audio.sample_rate), 48000);
assert.ok(Math.abs(Number(audio.duration) - metadata.durationSeconds) < .002);
assert.ok(bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat')));
const decodeMd5 = run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-an', '-threads', '1', '-f', 'framemd5', '-'])
  .stdout.split('\n').filter(line => line && !line.startsWith('#'));
assert.equal(decodeMd5.length, metadata.totalFrames);
const pts = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_frames',
  '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', file]).stdout).frames;
pts.forEach((frame, index) => assert.ok(Math.abs(Number(frame.best_effort_timestamp_time) - index / 25) < .00001));

const template = await sharp(Buffer.from(pointerGlyph.svg)).raw().toBuffer();
const mask = [];
for (let y = 0; y < 38; y++) for (let x = 0; x < 30; x++) {
  const offset = (y * 30 + x) * 4;
  if (template[offset + 3] === 255 && (template[offset] > 180 || template[offset] < 30)) {
    mask.push({ x, y, white: template[offset] > 180, rgb: [...template.subarray(offset, offset + 3)] });
  }
}
const width = 1440, height = 760, frameBytes = width * height * 3;
const nearest = (x, y, white) => mask.filter(point => point.white === white)
  .sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - (b.x - x) ** 2 - (b.y - y) ** 2)[0];
const sparse = [nearest(3, 12, false), nearest(8, 12, true), nearest(3, 25, false),
  nearest(17, 29, true), nearest(21, 31, false), nearest(8, 19, true)]
  .map(point => ({ offset: (point.y * width + point.x) * 3, white: point.white }));
const offsets = mask.map(point => ({ offset: (point.y * width + point.x) * 3, rgb: point.rgb }));
function findPointers(data) {
  const clusters = [];
  for (let y = 0; y <= height - 38; y++) for (let x = 0; x <= width - 30; x++) {
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
}
const typed = metadata.events.find(event => event.kind === 'keydown');
const stationary = ledger.frames.find((frame, index) => ledger.frames[index + 25]?.eventId === frame.eventId);
const renderSummary = JSON.parse(await readFile(join(work, 'render-summary.json'), 'utf8'));
const capture = JSON.parse(await readFile(resolve(renderSummary.privateSource), 'utf8'));
const scroll = capture.events.find(event => event.kind === 'wheel');
const scrollAt = 4 + (scroll.epoch - capture.origin) / 1000;
const frameAt = time => Math.round(time * 25);
const pairs = [
  { kind: 'waiting', frames: [stationary.index, stationary.index + 25] },
  { kind: 'typing', frames: [frameAt(typed.at), frameAt(typed.at + .16)] },
  { kind: 'scrolling', frames: [frameAt(scrollAt), frameAt(scrollAt + .32)] },
  { kind: 'between-actions', frames: [frameAt(metadata.chapters.find(chapter => chapter.id === 'accounts').end - 1),
    frameAt(metadata.chapters.find(chapter => chapter.id === 'accounts').end - .3)] },
  ...capture.checks.filter(check => typeof check === 'object' && check.nativeOptionInterval).map((check, index) =>
    ({ kind: `open-native-options-${index}`, frames: [frameAt(4 + check.nativeOptionInterval[0] + .35),
      frameAt(4 + check.nativeOptionInterval[1] - .43)] })),
  ...metadata.chapters.filter(chapter => !['intro', 'calendar', 'outro'].includes(chapter.id)).map(chapter =>
    ({ kind: `chapter-${chapter.id}`, frames: [frameAt(chapter.start) - 1, frameAt(chapter.start)] })),
  { kind: 'editorial-entry', frames: [Math.ceil(metadata.fileSelection.start * 25) - 1, Math.ceil(metadata.fileSelection.start * 25)] },
  { kind: 'editorial-return', frames: [Math.ceil(metadata.fileSelection.end * 25) - 1, Math.ceil(metadata.fileSelection.end * 25)] },
];
const wanted = new Set(pairs.flatMap(pair => pair.frames)), images = new Map(), coverage = [];
const decoder = spawn('ffmpeg', ['-v', 'error', '-xerror', '-nostdin', '-ss', '4', '-i', file,
  '-t', String(metadata.uiFrames / 25), '-an', '-sn',
  '-vf', 'crop=1728:912:96:94,scale=1440:760:flags=lanczos', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
{ stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '', index = 0, buffer = Buffer.alloc(0);
decoder.stderr.on('data', data => { stderr += data.toString(); });
const exited = new Promise((resolveExit, reject) => { decoder.once('error', reject); decoder.once('close', resolveExit); });
for await (const chunk of decoder.stdout) {
  buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
  while (buffer.length >= frameBytes) {
    const data = buffer.subarray(0, frameBytes), frame = 100 + index;
    const found = findPointers(data), expected = ledger.frames[index];
    const visible = found.length === 1 && Math.abs(found[0].x - expected.x) <= 2 && Math.abs(found[0].y - expected.y) <= 2;
    coverage.push({ index: frame, pointers: found.length, found, visible });
    expected.decodedMatches = found.length; expected.decodedVisible = visible;
    if (wanted.has(frame)) images.set(frame, Buffer.from(data));
    buffer = buffer.subarray(frameBytes); index++;
  }
}
assert.equal(await exited, 0, stderr); assert.equal(buffer.length, 0); assert.equal(index, metadata.uiFrames);
await writeFile(join(work, 'cursor-all-decoded-ui-frames.json'), JSON.stringify(coverage) + '\n');
const continuousCursor = verifyFinancePointer(ledger);
continuousCursor.multipleCursorFrames = coverage.filter(frame => frame.pointers > 1).length;
continuousCursor.coordinatesInBoundsFrames = coverage.filter(frame => frame.pointers === 1
  && frame.found[0].x >= 0 && frame.found[0].y >= 0 && frame.found[0].x + 30 <= width && frame.found[0].y + 38 <= height).length;
for (const pair of pairs) {
  assert.ok(pair.frames.every(frame => images.has(frame)), 'Missing review frame pair ' + pair.kind);
  await sharp({ create: { width: 2880, height: 760, channels: 3, background: '#07110e' } })
    .composite(pair.frames.map((frame, i) => ({ input: images.get(frame), raw: { width, height, channels: 3 }, left: i * width, top: 0 })))
    .png().toFile(join(work, `cursor-pair-${pair.kind}.png`));
}
const small = run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-an', '-vf', 'scale=96:54', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], true).stdout;
const pixels = 96 * 54, smallFrame = pixels * 3;
assert.equal(small.length, metadata.totalFrames * smallFrame);
let maximumMeanLuma = 0, maximumBrightNeutralFraction = 0;
for (let start = 0; start < small.length; start += smallFrame) {
  let light = 0, sum = 0;
  for (let i = start; i < start + smallFrame; i += 3) {
    const r = small[i], g = small[i + 1], b = small[i + 2];
    sum += .2126 * r + .7152 * g + .0722 * b;
    if (Math.min(r, g, b) > 180 && Math.max(r, g, b) - Math.min(r, g, b) < 35) light++;
  }
  maximumMeanLuma = Math.max(maximumMeanLuma, sum / pixels);
  maximumBrightNeutralFraction = Math.max(maximumBrightNeutralFraction, light / pixels);
  assert.ok(sum / pixels < 65 && light / pixels < .035, `Possible light surface in frame ${start / smallFrame}`);
}
const loudness = JSON.parse(run('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-map', '0:a:0',
  '-af', 'loudnorm=I=-21:TP=-2:LRA=7:print_format=json', '-f', 'null', '-']).stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
assert.ok(Number(loudness.input_i) >= -22 && Number(loudness.input_i) <= -20);
assert.ok(Number(loudness.input_tp) <= -1.5);
const subtitles = {};
const time = value => value.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
for (const language of ['es', 'en']) {
  const text = await readFile(join(media, `finance-core-demo.${language}.vtt`), 'utf8');
  const cues = [...text.matchAll(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n([^\n]+)/g)];
  assert.equal(cues.length, metadata.chapters.length);
  cues.forEach((cue, i) => { assert.ok(Math.abs(time(cue[1]) - metadata.chapters[i].start) < .001);
    assert.ok(Math.abs(time(cue[2]) - metadata.chapters[i].end) < .001); assert.ok(time(cue[2]) <= metadata.durationSeconds); });
  subtitles[language] = { cues: cues.length, sha256: sha(text), fullDuration: true };
}
for (const event of metadata.events) {
  assert.ok(event.at >= 4 && event.at < metadata.durationSeconds - 6);
  assert.equal(event.frame, Math.round(event.at * 25));
}
assert.equal(metadata.application.documentRequests, 1); assert.equal(metadata.application.reloadsAfterEntry, 0);
assert.equal(metadata.application.externalAttempts, 0); assert.equal(metadata.application.failedResponses, 0);
assert.equal(metadata.fileSelection.realChooserObserved, true); assert.equal(metadata.fileSelection.selectedFileHashMatched, true);
const report = { success: true, videoSha256: metadata.videoSha256, bytes: metadata.bytes,
  durationSeconds: metadata.durationSeconds, resolution: '1920x1080', fps: 25, decodedFrames: decodeMd5.length,
  fullDecode: true, everyPresentationTimestampVerified: true, decodedFrameMd5Sha256: sha(decodeMd5.join('\n') + '\n'),
  audio: { codec: 'AAC-LC', channels: 2, sampleRateHz: 48000, integratedLufs: Number(loudness.input_i),
    truePeakDbtp: Number(loudness.input_tp), actualClickCues: metadata.audio.clickCount, observedTypingCues: metadata.audio.keyCount },
  continuousCursor: { ...continuousCursor, fullUiAreaScanned: true, glyphMatchTolerance: 32,
    reviewFramePairs: pairs.map(({ kind, frames }) => ({ kind, frames })),
    coverageLedgerSha256: sha(JSON.stringify(coverage)) },
  darkModeEveryFrame: { inspectedFrames: metadata.totalFrames, maximumMeanLuma, maximumBrightNeutralFraction },
  subtitles, application: metadata.application, restoration: metadata.restoration, fileSelection: metadata.fileSelection,
  immutableOriginalsVerified: 6, verificationCommand: 'node scripts/media/verify-finance-demo-v2.mjs PRIVATE_RENDER_DIRECTORY' };
try {
  const playback = JSON.parse(await readFile(join(dirname(work), 'playback/verification.json'), 'utf8'));
  assert.equal(playback.videoSha256, metadata.videoSha256);
  assert.equal(playback.success, true); assert.equal(playback.nativePlaybackToEnded, true);
  assert.equal(playback.pageErrors, 0); assert.equal(playback.externalRequests, 0);
  assert.ok(playback.tracks.length === 2 && playback.tracks.every(track => track.cues === metadata.chapters.length));
  report.nativePlayback = { completed: true, durationSeconds: playback.durationSeconds,
    droppedFrames: playback.droppedDuringFullPlayback, pageErrors: playback.pageErrors,
    externalRequests: playback.externalRequests, captionTracks: playback.tracks };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
try {
  const sync = JSON.parse(await readFile(join(work, 'audio-sync.json'), 'utf8'));
  assert.equal(sync.videoSha256, metadata.videoSha256); assert.equal(sync.passed, true);
  assert.ok(sync.maximumCueQuantizationMs <= 20.001 && sync.maximumDecodedLagMs <= .084);
  report.audioSync = sync;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeFile(join(media, 'finance-core-demo-validation.json'), JSON.stringify(report, null, 2) + '\n');
await verifyFinanceOriginal();
console.log(JSON.stringify({ success: true, seconds: metadata.durationSeconds, frames: metadata.totalFrames,
  cursor: continuousCursor, audio: report.audio, dark: report.darkModeEveryFrame }));
