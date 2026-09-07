import { writeFile } from 'node:fs/promises';
import { financeV2 } from './finance-demo-v2-story.mjs';

const tau = 2 * Math.PI;
const hz = note => 440 * 2 ** ((note - 69) / 12);
const ease = value => Math.sin(Math.max(0, Math.min(1, value)) * Math.PI / 2) ** 2;

export async function synthFinanceV2(file, events = [], seconds = financeV2.seconds) {
  const rate = financeV2.rate, frames = Math.round(seconds * rate);
  const pcm = new Float64Array(frames * 2);
  let seed = 0x46494e32;
  const noise = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000 * 2 - 1;
  };
  const add = (frame, sample, pan = 0) => {
    if (frame < 0 || frame >= frames) return;
    pcm[frame * 2] += sample * Math.sqrt((1 - pan) / 2);
    pcm[frame * 2 + 1] += sample * Math.sqrt((1 + pan) / 2);
  };
  function pluck(at, note, level, pan) {
    const period = Math.round(rate / hz(note));
    const string = new Float64Array(period);
    for (let i = 0; i < period; i++) string[i] = noise() * .7 + Math.sin(tau * i / period) * .3;
    const length = Math.round(rate * 2.6), first = Math.round(at * rate);
    for (let n = 0; n < length; n++) {
      const index = n % period;
      const value = string[index];
      string[index] = .497 * (value + string[(index + 1) % period]);
      add(first + n, value * level * ease(n / (rate * .003)) * ease((length - n) / (rate * .15)), pan);
    }
  }
  function bass(at, note) {
    const first = Math.round(at * rate);
    for (let n = 0; n < rate * .7; n++) {
      const t = n / rate;
      add(first + n, .043 * (Math.sin(tau * hz(note) * t) + .15 * Math.sin(tau * hz(note) * 2 * t))
        * ease(t / .012) * Math.exp(-t * 5) * ease((.7 - t) / .1));
    }
  }
  function tick(at, level, kind) {
    const first = Math.round(at * rate), length = kind === 'shaker' ? .06 : .042;
    let filtered = 0;
    for (let n = 0; n < rate * length; n++) {
      const t = n / rate, random = noise();
      filtered += .2 * (random - filtered);
      const wave = kind === 'shaker' ? random - filtered
        : .66 * filtered + .34 * Math.sin(tau * (kind === 'key' ? 870 : 1300) * t);
      add(first + n, level * wave * ease(t / .0015) * Math.exp(-t * (kind === 'key' ? 135 : 90))
        * ease((length - t) / .012), kind === 'shaker' ? .3 : 0);
    }
  }
  const beat = 60 / 96;
  const chords = [[50, 57, 61, 66], [47, 54, 57, 62], [43, 50, 57, 59], [45, 52, 57, 59]];
  for (let bar = 0; bar * beat * 4 < seconds; bar++) {
    const start = bar * beat * 4, chord = chords[Math.floor(bar / 2) % chords.length];
    for (const [step, note] of [[0, 1], [1.5, 2], [2.5, 3], [3.5, 2]]) {
      pluck(start + step * beat, chord[(note + (bar % 2)) % chord.length] + 12, .1, step % 2 ? -.35 : .35);
    }
    bass(start, chord[0] - 12);
    if (bar % 2 === 1) bass(start + beat * 2.5, chord[0] - 12);
    for (let step = 0; step < 8; step++) {
      tick(start + beat * (step / 2 + .08), step % 2 ? .012 : .018, 'shaker');
    }
  }
  let clicks = 0, keys = 0;
  for (const event of events) {
    if (!['pointerdown', 'keydown'].includes(event.kind)) continue;
    if (!(event.at >= 0 && event.at + .06 < seconds)) throw Error('Interaction sound outside film');
    if (event.kind === 'keydown') { tick(event.at, .075, 'key'); keys++; }
    else { tick(event.at, .105, 'click'); clicks++; }
  }
  const wav = Buffer.alloc(44 + frames * 6);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 6, 28);
  wav.writeUInt16LE(6, 32); wav.writeUInt16LE(24, 34); wav.write('data', 36);
  wav.writeUInt32LE(frames * 6, 40);
  let peak = 0;
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / rate, fade = ease(t / 1.5) * ease((seconds - t) / 3);
    for (let channel = 0; channel < 2; channel++) {
      const value = pcm[frame * 2 + channel] * fade;
      if (Math.abs(value) >= .95) throw Error('Unexpected plucked-score peak');
      peak = Math.max(peak, Math.abs(value));
      wav.writeIntLE(Math.round(value * 0x7fffff), 44 + (frame * 2 + channel) * 3, 3);
    }
  }
  await writeFile(file, wav);
  return { seconds, sampleRateHz: rate, channels: 2, pcmBits: 24,
    tempoBpm: 96, seed: '0x46494e32', clickCount: clicks, keyCount: keys,
    peakDbfs: Number((20 * Math.log10(peak)).toFixed(2)),
    composition: 'Original D-major / B-minor / G / A plucked-string pattern, short bass and light syncopated shaker. Deterministic Karplus–Strong/additive synthesis; no pads, samples or third-party music.',
    interactionAudio: 'Soft distinct click and keyboard transients are scheduled only from genuine recorded pointerdown/keydown events. No invented typing cues.' };
}
