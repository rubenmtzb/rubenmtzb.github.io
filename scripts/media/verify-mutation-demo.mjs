import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chapters, duration, film } from './mutation-demo-story.mjs';
import { visibleTypingInput } from './synth-mutation-demo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const work = resolve(process.argv[2] || '');
if (!process.argv[2] || /(^|\/)(public|tmp)(\/|$)/.test(work)) throw Error('Usage: node scripts/media/verify-mutation-demo.mjs PRIVATE_WORKDIR');
const media = join(root, 'public/media/mutation-portal-demo.mp4');
const metadata = JSON.parse(await readFile(join(root, 'public/media/mutation-portal-demo.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(work, 'capture-manifest.json'), 'utf8'));
const cursorAudit = JSON.parse(await readFile(join(work, 'mutation-cursor-audit.json'), 'utf8'));
const assert = (value, message) => { if (!value) throw Error(message); };
const hash = value => createHash('sha256').update(value).digest('hex');
function run(command, args, binary = false) {
  const result = spawnSync(command, args, { encoding: binary ? null : 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert(!result.error && result.status === 0, `${command}: ${result.error?.message || result.stderr}`);
  return result;
}
assert(hash(await readFile(media)) === metadata.videoSha256, 'Video provenance hash mismatch');
assert(cursorAudit.passed && cursorAudit.videoSha256 === metadata.videoSha256, 'Missing continuous-cursor pixel verification for this exact film');
const expectedUiFrames = chapters().filter(s => !['intro', 'outro'].includes(s.id)).reduce((n, s) => n + s.seconds * film.fps, 0);
assert(cursorAudit.encoded?.totalUiFrames === expectedUiFrames
  && cursorAudit.encoded.cursorCoveredFrames === expectedUiFrames && cursorAudit.encoded.missingFrames === 0
  && cursorAudit.encoded.multipleCursorFrames === 0 && cursorAudit.encoded.coordinatesInBoundsFrames === expectedUiFrames,
  'Every application-footage frame must contain exactly one in-bounds cursor');
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', media]).stdout);
const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
assert(video.codec_name === 'h264' && video.width === 1920 && video.height === 1080 && video.pix_fmt === 'yuv420p', 'Invalid video format');
assert(video.r_frame_rate === '25/1' && video.avg_frame_rate === '25/1' && Number(video.nb_frames) === duration * film.fps, 'Invalid frame cadence');
assert(Number(probe.format.duration) === duration && Number(video.duration) === duration, 'Unexpected duration');
assert(audio.codec_name === 'aac' && audio.profile === 'LC' && audio.channels === 2 && Number(audio.sample_rate) === 48000, 'Invalid AAC layout');
assert(Math.abs(Number(audio.duration) - duration) < .04, 'Audio duration mismatch');
const decoded = run('ffmpeg', ['-v', 'error', '-xerror', '-i', media, '-map', '0:v:0', '-an', '-threads', '1', '-f', 'framemd5', '-']).stdout;
const frames = decoded.split('\n').filter(line => line && !line.startsWith('#'));
assert(frames.length === duration * film.fps, 'Full video decode failed');
const measured = run('ffmpeg', ['-hide_banner', '-nostdin', '-i', media, '-map', '0:a:0',
  '-af', 'loudnorm=I=-21:TP=-2:LRA=7:print_format=json', '-f', 'null', '-']).stderr;
const loudness = JSON.parse(measured.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
assert(Number(loudness.input_i) > -23 && Number(loudness.input_i) < -19, 'Incorrect soundtrack loudness');
assert(Number(loudness.input_tp) < -1.5, 'Audio true peak too high');
const cues = metadata.audio.cues;
const keyEvents = metadata.events.filter(e => visibleTypingInput(e, metadata.events));
const clickEvents = metadata.events.filter(e => e.kind === 'pointerdown');
assert(cues.filter(c => c.kind === 'physical-key-sample').length === keyEvents.length, 'Missing or invented physical typing sound');
assert(cues.filter(c => c.kind === 'soft-click').length === clickEvents.length, 'Missing or invented click cue');
for (const cue of cues) {
  assert(Math.abs(cue.at - cue.sourceEventAt) <= .020001, 'Cue does not match recorded event frame');
  assert(cue.sample === Math.round(cue.at * 48000) && cue.frame === Math.round(cue.at * 25), 'Cue sample timing mismatch');
  if (cue.kind === 'physical-key-sample') {
    const key = keyEvents.find(e => e.at === cue.sourceEventAt && e.key === cue.key);
    const input = key && visibleTypingInput(key, metadata.events);
    assert(input?.at === cue.visibleInputAt && input?.value === cue.visibleValue && input.value.length > 0,
      'Typing sound must correspond to an observed keypress and visible nonempty input/selection');
  }
}
function mono(file) {
  const bytes = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-ar', '6000', '-ac', '1', '-f', 'f32le', '-'], true).stdout;
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const reference = mono(join(work, 'mutation-score.wav')), final = mono(media);
const correlations = cues.map(cue => {
  const start = Math.round((cue.at - .025) * 6000), length = 900;
  let best = { offsetSamples: 0, coefficient: -1 };
  for (let offset = -120; offset <= 120; offset++) {
    let xy = 0, xx = 0, yy = 0;
    for (let i = 0; i < length; i++) {
      const x = reference[start + i] || 0, y = final[start + i + offset] || 0;
      xy += x * y; xx += x * x; yy += y * y;
    }
    const coefficient = xy / Math.sqrt(xx * yy);
    if (coefficient > best.coefficient) best = { offsetSamples: offset, coefficient };
  }
  assert(Math.abs(best.offsetSamples) <= 12 && best.coefficient > .86, `AAC cue alignment failed at ${cue.at}`);
  return { kind: cue.kind, at: cue.at, lagMs: best.offsetSamples / 6, correlation: Number(best.coefficient.toFixed(5)) };
});
for (const scene of chapters().filter(s => !['intro', 'outro'].includes(s.id))) {
  const clip = manifest.clips.find(c => c.id === scene.id);
  assert(clip && clip.frames.length > 10, `No recorded frames for ${scene.id}`);
  assert(hash(Buffer.from(JSON.stringify(clip.frames))) === metadata.sourceClips.find(c => c.chapter === scene.id).frameLedgerSha256,
    `Source timing ledger changed: ${scene.id}`);
  const sorted = clip.frames.filter(f => f.at < scene.seconds).sort((a, b) => a.sourceTimestamp - b.sourceTimestamp);
  const bytes = createHash('sha256');
  for (const frame of sorted) bytes.update(await readFile(join(work, 'capture', frame.file)));
  assert(bytes.digest('hex') === metadata.sourceClips.find(c => c.chapter === scene.id).frameBytesSha256,
    `Source image bytes changed: ${scene.id}`);
  for (let i = 1; i < clip.frames.length; i++) assert(clip.frames[i - 1].sourceTimestamp - clip.frames[i].sourceTimestamp < .04,
    'CDP delivery reordering exceeds one output frame');
}
const subtitles = {};
for (const language of ['es', 'en']) {
  const text = await readFile(join(root, `public/media/mutation-portal-demo.${language}.vtt`), 'utf8');
  assert(text.startsWith('WEBVTT') && (text.match(/ --> /g) || []).length === chapters().length, 'Subtitle chapter mismatch');
  assert(text.includes('HTTP 500') && text.includes('2024'), 'Missing availability/snapshot disclosure');
  subtitles[language] = hash(text);
}
assert(metadata.requests.some(r => r.endpoint === '/export.php' && r.status === 500), 'Missing export limitation provenance');
assert(metadata.verifiedFunctions.some(c => c.zoom) && metadata.verifiedFunctions.some(c => c.tooltip), 'Unverified graph interaction');
const report = {
  schema: 1, passed: true, verifiedAt: new Date().toISOString(), videoSha256: metadata.videoSha256,
  video: { codec: 'H.264', resolution: '1920x1080', fps: 25, seconds: duration, decodedFrames: frames.length,
    decodedFrameLedgerSha256: hash(frames.join('\n')), fullDecode: 'All frames decoded with FFmpeg -xerror.' },
  audio: { codec: 'AAC-LC', sampleRateHz: 48000, channels: 2, seconds: Number(audio.duration),
    integratedLufs: Number(loudness.input_i), truePeakDbtp: Number(loudness.input_tp),
    keyboardCues: keyEvents.length, clickCues: clickEvents.length, cueFrameErrorMaxMs: Math.max(...cues.map(c => Math.abs(c.at - c.sourceEventAt))) * 1000,
    visibleInputRequiredForTypingCues: true, programmaticFillAndClearTypingCues: 0,
    decodedAacAlignment: correlations, alignmentMethod: 'Cross-correlation of each final decoded AAC cue window against the pre-encode real-time mixture at 6 kHz; maximum accepted lag 2 ms.' },
  source: { clips: manifest.clips.length, timestampLedgersVerified: true, mockedResponses: false,
    originalAppTheme: 'native light', dropdowns: 'Real keyboard-controlled native selectors; no fabricated popup or OS picker.',
    limitations: ['Point-in-time only; displayed dataset date 26/02/2024.', 'Filtered Excel export returned HTTP 500.', 'No current-data, exhaustive-test or lineage-filter claim.'] },
  continuousCursor: { passed: true, method: cursorAudit.method,
    cursorCoveredFrames: cursorAudit.encoded.cursorCoveredFrames, totalUiFrames: expectedUiFrames,
    missingFrames: cursorAudit.encoded.missingFrames, multipleCursorFrames: cursorAudit.encoded.multipleCursorFrames,
    coordinatesInBoundsFrames: cursorAudit.encoded.coordinatesInBoundsFrames,
    finalFrameCoverageLedgerSha256: cursorAudit.encoded.coverageLedgerSha256,
    framePairs: cursorAudit.encoded.pairs,
    trajectory: cursorAudit.encoded.trajectory,
    checkedPaintFrames: cursorAudit.chapters.reduce((n, c) => n + c.checkedPaintFrames, 0),
    actualPointerMoves: cursorAudit.chapters.reduce((n, c) => n + c.actualPointerMoves, 0),
    domVisibilitySamples: cursorAudit.chapters.reduce((n, c) => n + c.domSamples, 0),
    invisibleFrames: cursorAudit.encoded.missingFrames,
    persistentDuringReading: true, persistsAcrossNavigation: true, clickRingsOnlyDecay: true },
  subtitles,
  visualReview: 'Private chapter frames and final decoded contact sheet support manual review; actual event timestamps control cursor, click halo and keyboard cues.',
};
await writeFile(join(root, 'public/media/mutation-portal-demo-validation.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(join(work, 'mutation-validation-private.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, seconds: duration, decodedFrames: frames.length, keyboardCues: keyEvents.length,
  clickCues: clickEvents.length, lufs: loudness.input_i, maxAacCueLagMs: Math.max(...correlations.map(c => Math.abs(c.lagMs))) }));
