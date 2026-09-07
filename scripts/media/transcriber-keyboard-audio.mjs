import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rate = 48000;
const seed = 0x54595045;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function keyboardCues(ledger) {
  if (ledger.source.guidedBackupSha256 !== '804e3111f960ecac5bbcb8070db8deeba1c12891f976d484141c4806903796c1') {
    throw Error('Unknown approved guided audio source');
  }

  const cues = [];
  for (const run of ledger.runs) {
    let count = 0;
    let previousAt = run.precedingFrame.at;
    if (run.sourceToMontageOffsetSeconds !== 0) throw Error('Unverified typing time mapping');
    for (const [at, visibleCharacterCount] of run.growthFrames) {
      if (at <= previousAt || at < 3 || at >= 36.5 || Math.abs(at * 25 - Math.round(at * 25)) > 1e-6
        || visibleCharacterCount <= count || visibleCharacterCount > run.text.length) throw Error('Invalid typing ledger');
      cues.push({ id: run.id, sourceAt: at, at, sourceFrame: Math.round(at * 25),
        visibleCharacterCount, addedCharacters: run.text.slice(count, visibleCharacterCount) });
      previousAt = at;
      count = visibleCharacterCount;
    }
    if (count !== run.text.length) throw Error('Typing ledger omits characters');
  }
  if (cues.length !== 49 || cues.reduce((sum, c) => sum + c.addedCharacters.length, 0) !== 52) {
    throw Error('Unexpected number of keyboard cues/visible characters');
  }
  return cues;
}

export async function mixKeyboard({ source, work, ledger, duration }) {
  const cues = keyboardCues(ledger);
  const samples = Math.round(duration * rate);
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', source, '-map', '0:a:0',
    '-ar', String(rate), '-ac', '2', '-t', String(duration), '-f', 'f32le', '-'],
  { maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Cannot decode approved audio: ${result.stderr}`);
  const decoded = result.stdout;
  if (decoded.length !== samples * 8) throw Error('Wrong approved audio sample count');
  const effects = new Float64Array(samples * 2);
  let state = seed;
  const random = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const smooth = (x) => Math.sin(Math.max(0, Math.min(1, x)) * Math.PI / 2) ** 2;
  const measuredCues = [];
  for (const cue of cues) {
    const start = Math.round(cue.at * rate);
    const length = .050 + random() * .014;
    const amplitude = .14 * (.78 + random() * .30);
    const bodyHz = 265 + random() * 90;
    const tickHz = 1550 + random() * 340;
    const pan = (random() - .5) * .22;
    const gains = [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];
    let damped = 0;
    for (let n = 0; n < Math.round(length * rate); n++) {
      const t = n / rate;
      damped += .24 * ((random() * 2 - 1) - damped);
      const attack = smooth(t / .0025);
      const release = smooth((length - t) / .012);
      const body = Math.sin(2 * Math.PI * bodyHz * t) * Math.exp(-t * 95);
      const tick = Math.sin(2 * Math.PI * tickHz * t) * Math.exp(-t * 240);
      const value = amplitude * (body * .6 + tick * .22 + damped * .5 * Math.exp(-t * 110)) * attack * release;
      for (let channel = 0; channel < 2; channel++) effects[(start + n) * 2 + channel] += value * gains[channel];
    }
    measuredCues.push({ ...cue, audioStartSample: start, durationSeconds: Number(length.toFixed(6)) });
  }
  const wav = Buffer.alloc(44 + samples * 6);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 6, 28);
  wav.writeUInt16LE(6, 32); wav.writeUInt16LE(24, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 6, 40);
  let effectPeak = 0;
  let mixPeak = 0;
  for (let i = 0; i < samples * 2; i++) {
    effectPeak = Math.max(effectPeak, Math.abs(effects[i]));
    const sum = decoded.readFloatLE(i * 4) + effects[i];
    mixPeak = Math.max(mixPeak, Math.abs(sum));
    if (Math.abs(sum) >= .8) throw Error('Unexpected keyboard mix peak; refusing to limit the approved score');
    wav.writeIntLE(Math.round(sum * 0x7fffff), 44 + i * 3, 3);
  }
  const file = join(work, 'keyboard-mix.wav');
  await writeFile(file, wav);
  return { file, details: {
    seed, sampleRateHz: rate, channels: 2, pcmBits: 24, samplesPerChannel: samples,
    baseDecodedPcmSha256: sha256(decoded), mixedWavSha256: sha256(wav),
    keyboardAttackCount: cues.length, visibleCharacterCount: 52,
    effectPeakDbfs: Number((20 * Math.log10(effectPeak)).toFixed(2)),
    mixedSamplePeakDbfs: Number((20 * Math.log10(mixPeak)).toFixed(2)),
    masterGainDb: 0,
    method: 'Original deterministic damped sine-body/noise key attacks with gentle timbre, level and stereo variation. One attack per observed text-growth frame. Exact approved guided AAC decoded at unity gain plus keyboard PCM; no new score, ducking, rearrangement, limiter or guessed sub-frame keystrokes. Final AAC is re-encoded and measured.',
    cues: measuredCues,
  } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--self-test', 'Usage: node scripts/media/transcriber-keyboard-audio.mjs --self-test');
  const ledger = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), 'transcriber-demo-keyboard-events.json')));
  assert.equal(keyboardCues(ledger).length, 49);
  const reject = edit => { const invalid = structuredClone(ledger); edit(invalid); assert.throws(() => keyboardCues(invalid)); };
  reject(value => { value.source.guidedBackupSha256 = 'unknown'; });
  reject(value => { value.runs[0].sourceToMontageOffsetSeconds = 1; });
  reject(value => { value.runs[0].growthFrames[0][0] = 4.17; });
  reject(value => { value.runs[0].growthFrames[1][0] = 4.16; });
  reject(value => { value.runs[0].growthFrames[1][1] = 1; });
  reject(value => { value.runs[0].growthFrames.pop(); });
  console.log('Keyboard ledger: 49 observed growth frames/52 characters passed; six invalid-source/timing/growth fixtures rejected.');
}
