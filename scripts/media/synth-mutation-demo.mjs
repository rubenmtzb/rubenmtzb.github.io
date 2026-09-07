import { spawnSync } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { film, duration } from './mutation-demo-story.mjs';

const tau = Math.PI * 2;
const hz = note => 440 * 2 ** ((note - 69) / 12);
const smooth = n => Math.sin(Math.max(0, Math.min(1, n)) * Math.PI / 2) ** 2;
export function visibleTypingInput(event, events) {
  if (event.kind !== 'keydown' || !/^[a-zA-Z0-9]$/.test(event.key) || event.metaKey || event.ctrlKey) return null;
  return events.find(next => next.chapter === event.chapter && ['input', 'change'].includes(next.kind)
    && next.at >= event.at && next.at - event.at < .12 && typeof next.value === 'string' && next.value.length > 0) || null;
}
export async function synthMutationAudio(work, keyboardSource, events) {
  const rate = film.rate, count = duration * rate;
  const music = new Float32Array(count * 2);
  const keys = new Float32Array(count * 2);
  const clicks = new Float32Array(count * 2);
  function note(at, length, midi, gain, pan, voice) {
    const frequency = hz(midi);
    for (let i = 0; i < length * rate && Math.round(at * rate) + i < count; i++) {
      const t = i / rate;
      const envelope = voice === 'glass'
        ? smooth(t / .008) * Math.exp(-t * 2.7) * smooth((length - t) / .13)
        : smooth(t / .6) * smooth((length - t) / 1.4);
      const wave = voice === 'glass'
        ? Math.sin(tau * frequency * t) + .24 * Math.sin(tau * frequency * 2.002 * t) * Math.exp(-t * 9)
        : .72 * Math.sin(tau * frequency * t) + .22 * Math.sin(tau * frequency * .9987 * t) + .06 * Math.sin(tau * frequency * 3 * t);
      const frame = Math.round(at * rate) + i;
      music[frame * 2] += wave * envelope * gain * Math.sqrt((1 - pan) / 2);
      music[frame * 2 + 1] += wave * envelope * gain * Math.sqrt((1 + pan) / 2);
    }
  }
  // A seven-pulse D-Lydian motif, distinct from the other portfolio compositions.
  const chords = [[50, 57, 61, 66, 68], [47, 54, 57, 61, 64], [43, 50, 54, 57, 61], [45, 52, 57, 59, 64]];
  const pulse = 60 / 108 / 2;
  for (let bar = 0; bar * pulse * 14 < duration; bar++) {
    const start = bar * pulse * 14;
    const chord = chords[bar % 4];
    chord.forEach((n, i) => note(start, pulse * 18, n, .018, (i - 2) / 2.4, 'pad'));
    for (const [index, beat] of [0, 3, 5, 8, 11].entries()) {
      note(start + beat * pulse + .07, 1.8, chord[(bar + index * 2) % chord.length] + 12, .032, Math.sin(index * 2) * .55, 'glass');
    }
    note(start, 1.4, chord[0] - 12, .032, 0, 'glass');
  }
  const decoded = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', keyboardSource, '-t', '4',
    '-ar', String(rate), '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 8 * 1024 * 1024 });
  if (decoded.status) throw Error(decoded.stderr.toString());
  const recording = new Float32Array(decoded.stdout.buffer.slice(decoded.stdout.byteOffset, decoded.stdout.byteOffset + decoded.stdout.byteLength));
  let strongest = Math.round(.25 * rate);
  for (let i = strongest; i < Math.min(recording.length - .1 * rate, 2 * rate); i++)
    if (Math.abs(recording[i]) > Math.abs(recording[strongest])) strongest = i;
  const sampleStart = strongest - Math.round(.004 * rate);
  const sampleFrames = Math.round(.075 * rate);
  const sample = recording.slice(sampleStart, sampleStart + sampleFrames);
  const peak = Math.max(...sample.map(Math.abs));
  const cues = [];
  for (const event of events) {
    const visibleInput = visibleTypingInput(event, events);
    const typing = Boolean(visibleInput);
    const click = event.kind === 'pointerdown';
    if (!typing && !click) continue;
    const at = Math.round(event.at * film.fps) / film.fps;
    const start = Math.round(at * rate);
    if (typing) {
      for (let i = 0; i < sample.length && start + i < count; i++) {
        const v = sample[i] / peak * .12 * smooth(i / (rate * .001)) * smooth((sample.length - i) / (rate * .014));
        keys[(start + i) * 2] += v * .72;
        keys[(start + i) * 2 + 1] += v * .68;
      }
    } else {
      for (let i = 0; i < rate * .065 && start + i < count; i++) {
        const t = i / rate;
        const v = .062 * Math.sin(tau * (1400 * t - 2400 * t * t)) * smooth(t / .001) * Math.exp(-t * 115);
        clicks[(start + i) * 2] += v;
        clicks[(start + i) * 2 + 1] += v;
      }
    }
    cues.push({ kind: typing ? 'physical-key-sample' : 'soft-click', at, frame: Math.round(at * film.fps),
      sourceEventAt: event.at, sample: start, key: typing ? event.key : undefined, chapter: event.chapter });
    if (typing) Object.assign(cues.at(-1), { visibleInputAt: visibleInput.at, visibleValue: visibleInput.value });
  }
  const mixed = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const fade = smooth(i / rate / 1.7) * smooth((duration - i / rate) / 2.8);
    for (let c = 0; c < 2; c++) mixed[i * 2 + c] = music[i * 2 + c] * fade + keys[i * 2 + c] + clicks[i * 2 + c];
  }
  async function wav(name, data) {
    const bytes = Buffer.alloc(44 + data.length * 3);
    bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
    bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 6, 28); bytes.writeUInt16LE(6, 32); bytes.writeUInt16LE(24, 34);
    bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) >= 1) throw Error('Audio clipping');
      bytes.writeIntLE(Math.round(data[i] * 0x7fffff), 44 + i * 3, 3);
    }
    await writeFile(join(work, name), bytes);
  }
  await wav('mutation-score.wav', mixed);
  await wav('mutation-typing-stem.wav', keys);
  await wav('mutation-click-stem.wav', clicks);
  const metadata = {
    composition: 'Helix / original D-Lydian seven-pulse glass motif, 108 BPM subdivisions, Dmaj9–Bm11–Gmaj7(#11)–Asus2 colors. Locally synthesized for this film; no external music.',
    keyboard: { source: 'Portfolio owner’s physical HHKB recording, public/keyboards/sound/hhkb.mp3',
      sha256: createHash('sha256').update(await readFile(keyboardSource)).digest('hex'),
      sourceSliceSeconds: [sampleStart / rate, (sampleStart + sampleFrames) / rate], method: 'One short real key transient, softly mixed only at observed alphanumeric keydown events.' },
    cues, sampleRateHz: rate,
  };
  await writeFile(join(work, 'mutation-audio.json'), JSON.stringify(metadata, null, 2));
  return metadata;
}
