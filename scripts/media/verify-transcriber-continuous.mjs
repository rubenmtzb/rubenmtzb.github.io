import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rate = 48000, duration = 42.64, samples = Math.round(rate * duration);
const sha = data => createHash('sha256').update(data).digest('hex');
function run(args, binary = false) {
  const result = spawnSync('ffmpeg', args, { encoding: binary ? null : 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, String(result.stderr));
  return result;
}

export async function verifyCaptions(media) {
  const tracks = {};
  const seconds = timestamp => timestamp.split(':').reduce((sum, value) => sum * 60 + Number(value), 0);
  for (const lang of ['es', 'en']) {
    const bytes = await readFile(join(media, `transcriber-demo.${lang}.vtt`));
    const text = bytes.toString('utf8');
    assert.ok(text.startsWith('WEBVTT\n'), 'Invalid VTT header');
    const cues = [...text.matchAll(/^(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})\n([^\n]+)/gm)];
    assert.equal(cues.length, 14);
    const timeline = cues.map(match => [seconds(match[1]), seconds(match[2])]);
    timeline.forEach(([start, end], index) => {
      assert.ok(start < end && end <= duration && (!index || start >= timeline[index - 1][1]), 'Invalid caption interval');
    });
    assert.equal(timeline[0][0], 0); assert.equal(timeline.at(-1)[1], duration);
    tracks[lang] = { sha256: sha(bytes), cues: cues.length, timeline };
  }
  assert.deepEqual(tracks.es.timeline, tracks.en.timeline);
  return { sha256: Object.fromEntries(Object.entries(tracks).map(([lang, track]) => [lang, track.sha256])),
    cuesPerLanguage: 14, matchingEsEnCueTimelines: true, finalEndpoint: '00:00:42.640',
    timeline: tracks.en.timeline };
}

export async function verifyAudioMix(file, mix, ledger) {
  const decoded = run(['-v', 'error', '-xerror', '-i', file, '-map', '0:a:0',
    '-ar', String(rate), '-ac', '2', '-t', String(duration), '-f', 'f32le', '-'], true).stdout;
  assert.equal(decoded.length, samples * 8);
  const wav = await readFile(mix.file);
  assert.equal(sha(wav), mix.details.mixedWavSha256);
  const expected = new Float32Array(samples), actual = new Float32Array(samples);
  let signal = 0, error = 0, cross = 0, outputPower = 0;
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < 2; channel++) {
      const a = wav.readIntLE(44 + (i * 2 + channel) * 3, 3) / 0x7fffff;
      const b = decoded.readFloatLE((i * 2 + channel) * 4);
      signal += a * a; error += (b - a) ** 2; cross += a * b; outputPower += b * b;
      expected[i] += a / 2; actual[i] += b / 2;
    }
  }
  const snrDb = 10 * Math.log10(signal / error), correlation = cross / Math.sqrt(signal * outputPower);
  assert.ok(snrDb > 24 && correlation > .998, `Final AAC differs from the single approved mix: ${snrDb} dB / ${correlation}`);
  const cues = [
    ...ledger.events.filter(event => event.kind === 'click').map(event => ({ kind: 'click', id: event.id, at: event.at })),
    ...ledger.events.flatMap(event => (event.pulses ?? []).map(at => ({ kind: 'wait', id: event.id, at }))),
    ...mix.details.cues.map(cue => ({ kind: 'keyboard', id: cue.id, at: cue.at })),
  ];
  assert.equal(cues.filter(cue => cue.kind === 'click').length, 14);
  assert.equal(cues.filter(cue => cue.kind === 'wait').length, 5);
  assert.equal(cues.filter(cue => cue.kind === 'keyboard').length, 49);
  const checked = cues.map(cue => {
    const from = Math.round((cue.at - .015) * rate), to = Math.round((cue.at + .095) * rate);
    let best = { error: Infinity, lag: null };
    const loss = lag => {
      let value = 0;
      for (let i = from; i < to; i += 16) value += (expected[i] - actual[i + lag]) ** 2;
      return value;
    };
    for (let lag = -1920; lag <= 1920; lag += 48) {
      const error = loss(lag);
      if (error < best.error) best = { error, lag };
    }
    const coarse = best.lag;
    for (let lag = coarse - 47; lag <= coarse + 47; lag++) {
      const error = loss(lag);
      if (error < best.error) best = { error, lag };
    }
    assert.ok(Math.abs(best.lag) <= 96, `AAC sync differs at ${cue.kind}/${cue.at}: ${best.lag} samples`);
    return { ...cue, measuredLagSamples: best.lag, measuredLagMs: best.lag / 48 };
  });
  return { passed: true, decodedSamplesPerChannel: samples, decodedPcmSha256: sha(decoded),
    referenceMixedWavSha256: mix.details.mixedWavSha256, snrDb, correlation,
    clickCues: 14, waitPulses: 5, keyboardAttacks: 49, visibleCharacters: 52,
    maximumMeasuredLagMs: Math.max(...checked.map(cue => Math.abs(cue.measuredLagMs))), cues: checked,
    method: 'Compare every decoded stereo AAC sample with the deterministic unity-gain approved guided audio plus one observed-input keyboard layer. Require >24 dB SNR and >0.998 correlation; independently search ±40 ms lag at all 68 cue windows with one-sample refinement. No second music/click/wait layer.',
    auditoryListeningReview: false };
}

export function verifyMontageFraming(file, source) {
  const result = run(['-hide_banner', '-nostdin', '-reinit_filter', '0', '-i', source,
    '-reinit_filter', '0', '-i', file, '-filter_complex_threads', '1',
    '-filter_complex', '[0:v]drawbox=x=566:y=189:w=1284:h=724:color=black:t=fill,scale=480:270,format=gray[a];'
      + '[1:v]drawbox=x=566:y=189:w=1284:h=724:color=black:t=fill,scale=480:270,format=gray[b];[a][b]psnr[out]',
    '-map', '[out]', '-an', '-f', 'null', '-']);
  const match = result.stderr.match(/PSNR[^\n]*average:([\d.]+)/);
  assert.ok(match, 'Missing outside-UI fidelity measurement');
  const psnrDb = Number(match[1]);
  assert.ok(psnrDb > 45, `Original framing/cards differ: ${psnrDb} dB`);
  return { passed: true, frames: 1066, psnrDb,
    method: 'All corresponding frames, masking only the UI rectangle plus a two-pixel chroma margin; 480x270 grayscale PSNR. Lossy fidelity, NOT byte/pixel identity. Full presentation timing is checked separately.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--verify'),
    'Usage: node scripts/media/verify-transcriber-continuous.mjs [--verify]');
  const result = spawnSync(process.execPath, [
    join(dirname(fileURLToPath(import.meta.url)), 'guide-transcriber-demo.mjs'), '--verify',
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'Transcriber verification failed');
}
