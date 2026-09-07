import { writeFile } from 'node:fs/promises';
import { film, duration } from './finance-demo-story.mjs';

const tau = Math.PI * 2;
const smooth = (v) => Math.sin(Math.max(0, Math.min(1, v)) * Math.PI / 2) ** 2;
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

export async function synthFinanceAudio(file, clicks = []) {
  const frames = Math.round(duration * film.rate);
  const pcm = new Float64Array(frames * 2);
  const chords = [[45, 52, 59, 64], [41, 48, 55, 60], [48, 55, 62, 67], [43, 50, 57, 62]];
  function voice(start, length, midi, level, pan, kind = 'pad') {
    const hz = frequency(midi);
    for (let n = 0; n < Math.ceil(length * film.rate); n++) {
      const frame = Math.round(start * film.rate) + n;
      if (frame >= frames) break;
      const t = n / film.rate;
      const envelope = kind === 'pad'
        ? smooth(t / 1.5) * smooth((length - t) / 2)
        : smooth(t / .008) * Math.exp(-t * 3.1) * smooth((length - t) / .25);
      const wave = kind === 'pad'
        ? Math.sin(tau * hz * t) * .7 + Math.sin(tau * hz * 1.0017 * t) * .2 + Math.sin(tau * hz * 2 * t) * .1
        : Math.sin(tau * hz * t) + .13 * Math.sin(tau * hz * 3 * t) * Math.exp(-t * 7);
      const value = level * envelope * wave;
      pcm[frame * 2] += value * Math.sqrt((1 - pan) / 2);
      pcm[frame * 2 + 1] += value * Math.sqrt((1 + pan) / 2);
    }
  }
  for (let bar = 0; bar * 6 < duration; bar++) {
    const chord = chords[bar % chords.length];
    chord.forEach((note, index) => voice(bar * 6, 8, note, .027, (index - 1.5) / 2));
    for (const [index, beat] of [0, 1.5, 3.75].entries()) {
      voice(bar * 6 + beat + .2, 2.4, chord[(index + bar) % 4] + 12, .034, index % 2 ? -.35 : .35, 'bell');
    }
  }
  for (const click of clicks) {
    if (!(click.at >= 0 && click.at + .1 <= duration)) throw Error('Click cue outside film');
    for (let n = 0; n < .1 * film.rate; n++) {
      const t = n / film.rate;
      const value = .075 * Math.sin(tau * (1200 * t - 1700 * t * t))
        * smooth(t / .002) * Math.exp(-t * 70) * smooth((.1 - t) / .02);
      const frame = Math.round(click.at * film.rate) + n;
      pcm[frame * 2] += value / Math.sqrt(2);
      pcm[frame * 2 + 1] += value / Math.sqrt(2);
    }
  }
  const wav = Buffer.alloc(44 + frames * 6);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(film.rate, 24); wav.writeUInt32LE(film.rate * 6, 28);
  wav.writeUInt16LE(6, 32); wav.writeUInt16LE(24, 34); wav.write('data', 36);
  wav.writeUInt32LE(frames * 6, 40);
  let peak = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / film.rate;
    const fade = smooth(t / 2) * smooth((duration - t) / 3);
    for (let channel = 0; channel < 2; channel++) {
      const value = pcm[i * 2 + channel] * fade;
      peak = Math.max(peak, Math.abs(value));
      if (Math.abs(value) >= 1) throw Error('Unexpected synth clipping');
      wav.writeIntLE(Math.round(value * 0x7fffff), 44 + (i * 2 + channel) * 3, 3);
    }
  }
  await writeFile(file, wav);
  return { composition: 'Original locally synthesized A-minor / F / C / G pads and sparse bell motifs; no samples or third-party music.',
    method: 'Deterministic additive synthesis, stereo equal-power panning; soft sine clicks only on recorded pointerdown events.',
    sampleRateHz: film.rate, pcmBits: 24, peakDbfs: Number((20 * Math.log10(peak)).toFixed(2)), clickCount: clicks.length };
}
