import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chapters, duration, film } from './finance-demo-story.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = join(root, 'public/media');
const file = join(output, 'finance-core-demo.mp4');
const sha = (data) => createHash('sha256').update(data).digest('hex');
function run(tool, args, binary = false) {
  const result = spawnSync(tool, args, { encoding: binary ? null : 'utf8', maxBuffer: 128 * 1024 * 1024 });
  if (result.error || result.status) throw Error(`${tool} failed: ${result.error || result.stderr}`);
  return result;
}
const meta = JSON.parse(await readFile(join(output, 'finance-core-demo.json'), 'utf8'));
if (meta.schema === 2) {
  await import('./verify-finance-demo-v2.mjs');
  process.exit(0);
}
const bytes = await readFile(file);
assert.equal(sha(bytes), meta.videoSha256);
assert.equal(bytes.length, meta.bytes);
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
assert.equal(probe.streams.length, 2);
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
assert.equal(video.codec_name, 'h264');
assert.equal(video.pix_fmt, 'yuv420p');
assert.equal(video.width, film.width); assert.equal(video.height, film.height);
assert.equal(video.r_frame_rate, '25/1'); assert.equal(video.avg_frame_rate, '25/1');
assert.equal(Number(video.start_time), 0); assert.equal(Number(audio.start_time), 0);
assert.equal(Number(video.nb_frames), duration * film.fps);
assert.equal(Number(video.duration), duration); assert.equal(Number(probe.format.duration), duration);
assert.equal(audio.codec_name, 'aac'); assert.equal(audio.profile, 'LC'); assert.equal(audio.channels, 2);
assert.equal(Number(audio.sample_rate), film.rate); assert.equal(Number(audio.duration), duration);
const moovAt = bytes.indexOf(Buffer.from('moov'));
const mdatAt = bytes.indexOf(Buffer.from('mdat'));
assert.ok(moovAt > 0 && moovAt < mdatAt, 'MP4 must be faststart');
const decoded = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-an', '-threads', '1', '-f', 'framemd5', '-'])
  .stdout.split('\n').filter((line) => line && !line.startsWith('#'));
assert.equal(decoded.length, duration * film.fps);
const timing = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_frames',
  '-show_entries', 'frame=best_effort_timestamp_time,duration_time', '-of', 'json', file]).stdout).frames;
timing.forEach((frame, index) => assert.ok(Math.abs(Number(frame.best_effort_timestamp_time) - index / film.fps) < .00001));
for (const [index, event] of meta.events.entries()) {
  assert.ok(event.at >= 0 && event.at < duration);
  assert.equal(event.frame, Math.round(event.at * film.fps));
  assert.ok(Math.abs(event.at * film.fps - event.frame) < .00001);
  assert.ok(Number.isFinite(event.monotonicMs));
  if (index) assert.ok(event.monotonicMs >= meta.events[index - 1].monotonicMs, 'Events must preserve actual monotonic order');
  if (event.xy) assert.ok(event.xy[0] >= 0 && event.xy[0] < film.source.width && event.xy[1] >= 0 && event.xy[1] < film.source.height);
}
assert.equal(meta.audio.clickCount, meta.events.filter((event) => event.kind === 'pointerdown').length);
assert.ok(meta.requests.externalAttemptCount === 0 && meta.requests.unexpectedFailureCount === 0);
assert.ok(meta.requests.recordedResponseCount > 0);
assert.equal(meta.sourceTiming.clickCount, meta.audio.clickCount);
assert.ok(meta.sourceTiming.maximumNextCaptureDelayMs < 40);
assert.ok(meta.sourceTiming.maximumCueQuantizationMs <= 20);
const subtitles = {};
const parseTime = (value) => value.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
for (const language of ['es', 'en']) {
  const content = await readFile(join(output, `finance-core-demo.${language}.vtt`), 'utf8');
  const cues = [...content.matchAll(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n([^\n]+)/g)];
  assert.equal(cues.length, chapters().length);
  cues.forEach((cue, index) => {
    assert.equal(parseTime(cue[1]), chapters()[index].start);
    assert.equal(parseTime(cue[2]), chapters()[index].end);
    assert.ok(parseTime(cue[2]) <= duration);
  });
  subtitles[language] = { cueCount: cues.length, sha256: sha(content), fullDuration: true };
}
const small = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-vf', 'scale=96:54', '-an',
  '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], true).stdout;
const pixels = 96 * 54, frameSize = pixels * 3;
assert.equal(small.length, duration * film.fps * frameSize);
let maximumBrightNeutralFraction = 0, maximumMeanLuma = 0;
for (let offset = 0; offset < small.length; offset += frameSize) {
  let bright = 0, luma = 0;
  for (let i = offset; i < offset + frameSize; i += 3) {
    const r = small[i], g = small[i + 1], b = small[i + 2];
    luma += .2126 * r + .7152 * g + .0722 * b;
    if (Math.min(r, g, b) > 180 && Math.max(r, g, b) - Math.min(r, g, b) < 35) bright++;
  }
  maximumBrightNeutralFraction = Math.max(maximumBrightNeutralFraction, bright / pixels);
  maximumMeanLuma = Math.max(maximumMeanLuma, luma / pixels);
  assert.ok(bright / pixels < .035, `Possible white surface at frame ${offset / frameSize}`);
  assert.ok(luma / pixels < 65, `Possible light-mode frame at ${offset / frameSize}`);
}
const measurement = run('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-map', '0:a:0',
  '-af', 'loudnorm=I=-21:TP=-2:LRA=7:print_format=json', '-f', 'null', '-']).stderr;
const loudness = JSON.parse(measurement.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
assert.ok(Number(loudness.input_i) >= -22 && Number(loudness.input_i) <= -20);
assert.ok(Number(loudness.input_tp) <= -1.5);
const report = {
  success: true, videoSha256: sha(bytes), bytes: bytes.length, durationSeconds: duration,
  resolution: `${film.width}x${film.height}`, fps: film.fps, decodedFrames: decoded.length,
  decodedFrameMd5Sha256: sha(decoded.join('\n') + '\n'), fullDecode: true, allFrameTimestampsVerified: true,
  faststart: true, audio: { codec: audio.codec_name, profile: audio.profile, channels: audio.channels,
    sampleRateHz: Number(audio.sample_rate), durationSeconds: Number(audio.duration),
    integratedLufs: Number(loudness.input_i), truePeakDbtp: Number(loudness.input_tp) },
  darkModeEveryFrame: { checkedFrames: decoded.length, reducedFrameResolution: '96x54',
    maximumBrightNeutralFraction, maximumMeanLuma,
    method: 'Decode every output frame; reject large bright neutral surfaces or high average luminance. Complement with visual inspection of full-resolution chapter and modal screenshots.' },
  subtitles, recordedEvents: meta.events.length, frameAlignedClickSounds: meta.audio.clickCount,
  requests: meta.requests,
  sourceTiming: meta.sourceTiming,
  disclosure: 'Synthetic-data DEMO; external integrations disabled. No source code, credentials, request bodies or raw browser captures are published.',
  verificationCommand: 'node scripts/media/verify-finance-demo.mjs',
};
await writeFile(join(output, 'finance-core-demo-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
