import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const work = resolve(process.argv[2] || '');
if (!process.argv[2] || work.includes('/public/')) throw Error('Usage: node scripts/media/verify-finance-demo-v2-sync.mjs PRIVATE_RENDER_DIRECTORY');
const media = join(root, 'public/media'), file = join(media, 'finance-core-demo.mp4');
const metadata = JSON.parse(await readFile(join(media, 'finance-core-demo.json'), 'utf8'));
const validationFile = join(media, 'finance-core-demo-validation.json');
const validation = JSON.parse(await readFile(validationFile, 'utf8'));
const videoHash = createHash('sha256').update(await readFile(file)).digest('hex');
assert.equal(videoHash, metadata.videoSha256); assert.equal(videoHash, validation.videoSha256);
const ledger = JSON.parse(await readFile(join(work, 'pointer-ledger.json'), 'utf8'));
const events = new Map(ledger.events.map(event => [event.id, event]));
const offsets = metadata.events.map(cue => {
  const event = events.get(cue.id);
  assert.ok(event?.trusted && event.kind === cue.kind);
  return Math.abs(cue.at - event.at) * 1000;
});
const maximumCueQuantizationMs = Math.max(...offsets);
assert.ok(maximumCueQuantizationMs <= 20.0001);
const wave = await readFile(join(work, 'score.wav'));
assert.equal(wave.toString('ascii', 0, 4), 'RIFF'); assert.equal(wave.readUInt32LE(24), 48000);
assert.equal(wave.readUInt16LE(34), 24);
const decoded = spawnSync('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-map', '0:a:0',
  '-ar', '48000', '-ac', '2', '-f', 'f32le', '-'], { maxBuffer: 192 * 1024 * 1024 });
if (decoded.error || decoded.status) throw Error(decoded.error || decoded.stderr.toString());
const pcm = decoded.stdout, windows = [];
for (let i = 0; i < 6; i++) {
  const cue = metadata.events[Math.round(i * (metadata.events.length - 1) / 5)];
  const start = Math.round((cue.at - .015) * 48000), length = 2400;
  let best = { lag: 0, correlation: -1 };
  for (let lag = -96; lag <= 96; lag++) {
    let xx = 0, yy = 0, xy = 0;
    for (let n = 0; n < length; n++) {
      const x = wave.readIntLE(44 + (start + n) * 6, 3) / 0x800000;
      const y = pcm.readFloatLE((start + n + lag) * 8);
      xx += x * x; yy += y * y; xy += x * y;
    }
    const correlation = xy / Math.sqrt(xx * yy);
    if (correlation > best.correlation) best = { lag, correlation };
  }
  windows.push({ at: cue.at, lagSamples: best.lag, correlation: Number(best.correlation.toFixed(6)) });
}
const maximumDecodedLagSamples = Math.max(...windows.map(window => Math.abs(window.lagSamples)));
const minimumCorrelation = Math.min(...windows.map(window => window.correlation));
assert.ok(maximumDecodedLagSamples <= 4 && minimumCorrelation > .94, 'Unexpected decoded AAC timing discrepancy');
const report = { videoSha256: videoHash, passed: true, checkedInteractionCues: metadata.events.length,
  maximumCueQuantizationMs: Number(maximumCueQuantizationMs.toFixed(3)),
  decodedWindows: windows.length, maximumDecodedLagSamples,
  maximumDecodedLagMs: Number((maximumDecodedLagSamples / 48).toFixed(5)), minimumCorrelation,
  method: 'All click/key cues compared to their trusted recorded event times; six PCM/AAC cross-correlation windows verify post-encode soundtrack alignment, without relying only on container start times.' };
await writeFile(join(work, 'audio-sync.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(join(work, 'audio-sync-windows.json'), JSON.stringify(windows, null, 2) + '\n');
validation.audioSync = report;
await writeFile(validationFile, JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
