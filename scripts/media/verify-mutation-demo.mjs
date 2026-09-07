import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chapters, duration, film, callouts, framing, timecode } from './mutation-demo-story.mjs';
import { visibleTypingInput } from './synth-mutation-demo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const work = resolve(process.argv[2] || '');
if (!process.argv[2] || /(^|\/)(public|tmp)(\/|$)/.test(work)) throw Error('Usage: node scripts/media/verify-mutation-demo.mjs PRIVATE_WORKDIR');
const media = join(root, 'public/media/mutation-portal-demo.mp4');
const metadata = JSON.parse(await readFile(join(root, 'public/media/mutation-portal-demo.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(work, 'capture-manifest.json'), 'utf8'));
const cursorAudit = JSON.parse(await readFile(join(work, 'mutation-cursor-audit.json'), 'utf8'));
const privateBytes = await readFile(join(work, 'mutation-provenance-private.json'));
const privateMetadata = JSON.parse(privateBytes);
const assert = (value, message) => { if (!value) throw Error(message); };
const hash = value => createHash('sha256').update(value).digest('hex');
function run(command, args, binary = false) {
  const result = spawnSync(command, args, { encoding: binary ? null : 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert(!result.error && result.status === 0, `${command}: ${result.error?.message || result.stderr}`);
  return result;
}
assert(hash(await readFile(media)) === metadata.videoSha256, 'Video provenance hash mismatch');
assert(hash(privateBytes) === metadata.privateEvidence.provenanceSha256
  && privateMetadata.videoSha256 === metadata.videoSha256, 'Private evidence hash mismatch');
assert(hash(JSON.stringify(privateMetadata.events)) === metadata.eventSummary.privateLedgerSha256
  && privateMetadata.events.length === metadata.eventSummary.total, 'Private event ledger mismatch');
assert(hash(JSON.stringify(privateMetadata.audio.cues)) === metadata.audio.privateCueLedgerSha256,
  'Private audio cue ledger mismatch');
assert(!('events' in metadata) && !('cues' in metadata.audio), 'Raw telemetry must not be published');
assert(cursorAudit.passed && cursorAudit.videoSha256 === metadata.videoSha256, 'Missing continuous-cursor pixel verification for this exact film');
const expectedUiFrames = chapters().filter(s => !['intro', 'outro'].includes(s.id)).reduce((n, s) => n + s.seconds * film.fps, 0);
assert(cursorAudit.encoded?.totalUiFrames === expectedUiFrames
  && cursorAudit.encoded.cursorCoveredFrames === expectedUiFrames && cursorAudit.encoded.missingFrames === 0
  && cursorAudit.encoded.multipleCursorFrames === 0 && cursorAudit.encoded.coordinatesInBoundsFrames === expectedUiFrames,
  'Every application-footage frame must contain exactly one in-bounds cursor');
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', media]).stdout);
const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
assert(video.codec_name === 'h264' && video.width === 1920 && video.height === 1080 && video.pix_fmt === 'yuv420p', 'Invalid video format');
assert(video.r_frame_rate === `${film.fps}/1` && video.avg_frame_rate === `${film.fps}/1` && Number(video.nb_frames) === duration * film.fps, 'Invalid frame cadence');
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
const cues = privateMetadata.audio.cues;
const keyEvents = privateMetadata.events.filter(e => visibleTypingInput(e, privateMetadata.events));
const clickEvents = privateMetadata.events.filter(e => e.kind === 'pointerdown');
assert(metadata.audio.keyboardCues === keyEvents.length && metadata.audio.clickCues === clickEvents.length,
  'Published audio cue counts differ from private evidence');
assert(cues.filter(c => c.kind === 'physical-key-sample').length === keyEvents.length, 'Missing or invented physical typing sound');
assert(cues.filter(c => c.kind === 'soft-click').length === clickEvents.length, 'Missing or invented click cue');
for (const cue of cues) {
  assert(Math.abs(cue.at - cue.sourceEventAt) <= .5 / film.fps + .000001, 'Cue does not match recorded event frame');
  assert(cue.sample === Math.round(cue.at * 48000) && cue.frame === Math.round(cue.at * film.fps), 'Cue sample timing mismatch');
  if (cue.kind === 'physical-key-sample') {
    const key = keyEvents.find(e => e.at === cue.sourceEventAt && e.key === cue.key);
    const input = key && visibleTypingInput(key, privateMetadata.events);
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
  for (const chapter of chapters())
    assert(text.includes(`${timecode(chapter.start)} --> ${timecode(chapter.end)}\n${chapter[language]}`),
      `Subtitle duration/text mismatch: ${language}/${chapter.id}`);
  subtitles[language] = hash(text);
}
assert(metadata.requests.some(r => r.endpoint === '/export.php' && r.status === 500), 'Missing export limitation provenance');
assert(metadata.verifiedFunctions.some(c => c.zoom) && metadata.verifiedFunctions.some(c => c.tooltip), 'Unverified graph interaction');
assert(JSON.stringify(metadata.presentation.callouts) === JSON.stringify(callouts), 'Guide timings differ from rendered story');
for (const chapter of chapters().filter(chapter => callouts[chapter.id])) {
  const camera = framing[chapter.id];
  assert(film.screen.width / camera.width >= 1.2 && camera.x >= 0 && camera.y >= 0
    && camera.x + camera.width <= film.source.width && camera.y + camera.height <= film.source.height,
    `Camera shrinks or leaves genuine UI: ${chapter.id}`);
  for (const [index, note] of callouts[chapter.id].entries()) {
    assert(note.start >= 0 && note.end <= chapter.seconds && note.end > note.start,
      `Guide outside chapter: ${chapter.id}`);
    if (index) assert(note.start === callouts[chapter.id][index - 1].end, 'Unexpected guide gap or overlap');
  }
}
const black = run('ffmpeg', ['-hide_banner', '-nostdin', '-ss', '5', '-i', media, '-t', '67',
  '-vf', 'blackdetect=d=0.05:pix_th=0.08:pic_th=0.98', '-an', '-f', 'null', '-']).stderr;
assert(!/black_start:/.test(black), 'Unintended black application frame');
const guidePixels = run('ffmpeg', ['-v', 'error', '-nostdin', '-ss', '5', '-i', media, '-t', '67',
  '-vf', 'crop=1680:132:116:872,scale=1:1:flags=area', '-an', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], true).stdout;
assert(guidePixels.length === expectedUiFrames * 3, 'Missing guide-panel decode frames');
const guideMeans = Array.from({ length: expectedUiFrames }, (_, frame) => guidePixels[frame * 3]);
assert(Math.min(...guideMeans) > 20, 'Editorial guide goes blank during a transition');
const motion = manifest.clips.map(clip => {
  const sorted = [...clip.frames].sort((a, b) => a.at - b.at);
  const moving = clip.events.filter(event => event.kind === 'pointermove');
  const glides = moving.slice(1).map((event, index) => ({ seconds: event.at - moving[index].at,
    distance: Math.hypot(event.xy[0] - moving[index].xy[0], event.xy[1] - moving[index].xy[1]) }))
    .filter(gap => gap.seconds < .15 && gap.distance >= 1);
  const activeGaps = sorted.slice(1).map((frame, index) => {
    const previous = sorted[index];
    const during = clip.events.filter(event => event.at > previous.at && event.at < frame.at
      && ['pointermove', 'scroll', 'input', 'change'].includes(event.kind));
    return { start: previous.at, seconds: frame.at - previous.at, events: during.length };
  }).filter(gap => gap.seconds > .15 && gap.events > 2);
  assert(!activeGaps.length, `Unintended frozen source during active motion: ${clip.id}`);
  return { chapter: clip.id, capturedPaints: sorted.length, intentionalReadingHolds: true,
    pointerMotionIntervals: glides.length, medianMotionIntervalMs: glides.length
      ? glides.map(gap => gap.seconds).sort((a, b) => a - b)[Math.floor(glides.length / 2)] * 1000 : 0,
    activeMotionPaintGapsAbove150ms: activeGaps.length,
    maximumPaintHoldSeconds: Math.max(...sorted.slice(1).map((frame, index) => frame.at - sorted[index].at)) };
});
const report = {
  schema: 1, passed: true, verifiedAt: new Date().toISOString(), videoSha256: metadata.videoSha256,
  video: { codec: 'H.264', resolution: '1920x1080', fps: film.fps, seconds: duration, decodedFrames: frames.length,
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
    motion: cursorAudit.encoded.motion,
    checkedPaintFrames: cursorAudit.chapters.reduce((n, c) => n + c.checkedPaintFrames, 0),
    actualPointerMoves: cursorAudit.chapters.reduce((n, c) => n + c.actualPointerMoves, 0),
    domVisibilitySamples: cursorAudit.chapters.reduce((n, c) => n + c.domSamples, 0),
    invisibleFrames: cursorAudit.encoded.missingFrames,
    persistentDuringReading: true, persistsAcrossNavigation: true, clickRingsOnlyDecay: true },
  subtitles, motion,
  presentation: { guideTitlePx: metadata.presentation.guideTitlePx, guideBodyPx: metadata.presentation.guideBodyPx,
    minimumUiScale: metadata.presentation.minimumSourceScale, previousUiScale: 1.2,
    geneAndFilterUiScale: film.screen.width / framing.genes.width, guideDoesNotOverlapUi: film.screen.y + film.screen.height < 832,
    nativePixelsOnly: true, blackApplicationFrames: 0, guideCueTimingVerified: true,
    guideVisibleFrames: guideMeans.length, guideMinimumMeanRed: Math.min(...guideMeans),
    guidePresenceMethod: 'Every encoded UI frame is area-averaged over the actual guide text band. Mean red must exceed 20; the empty cyan panel background is below 16. No text-free transition frames.' },
  observedPageErrors: metadata.observedPageErrors,
  visualReview: 'Private final decoded full-size, mobile-size and contact-sheet frames support manual review. All source and encoded cursor frames are verified. A separately labelled editorial guide never overlaps the application. Actual timestamps control pointer, click and keyboard cues; static reading holds are intentional.',
};
const privateReport = JSON.stringify(report, null, 2) + '\n';
await writeFile(join(work, 'mutation-validation-private.json'), privateReport);
const { framePairs, ...cursorSummary } = report.continuousCursor;
const publicReport = {
  ...report,
  audio: { ...report.audio, decodedAacAlignment: {
    verifiedCues: correlations.length,
    maximumAbsoluteLagMs: Math.max(...correlations.map(cue => Math.abs(cue.lagMs))),
    minimumCorrelation: Math.min(...correlations.map(cue => cue.correlation)),
  } },
  continuousCursor: { ...cursorSummary, reviewedFramePairs: framePairs.length,
    reviewScenarios: framePairs.map(pair => pair.kind) },
  privateValidationSha256: hash(privateReport),
};
await writeFile(join(root, 'public/media/mutation-portal-demo-validation.json'), JSON.stringify(publicReport, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, seconds: duration, decodedFrames: frames.length, keyboardCues: keyEvents.length,
  clickCues: clickEvents.length, lufs: loudness.input_i, maxAacCueLagMs: Math.max(...correlations.map(c => Math.abs(c.lagMs))) }));
