import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const media = join(root, 'public/media');
const video = join(media, 'transcriber-demo.mp4');
const backup = join(media, 'transcriber-demo-silent.mp4');
const provenance = join(media, 'transcriber-demo.json');
const work = join(root, '.transcriber-soundtrack-work');
const originalSha256 = '70a30d78b23aba3abeee43e770cd8b138e9c745c506fe856a08a1f2ea20707ed';
const sampleRate = 48000;
const duration = 42.64;
const samples = Math.round(duration * sampleRate);
const seed = 0x59415431;
const tempo = 84;
const target = { integratedLufs: -19, truePeakDbtp: -2, loudnessRangeLu: 8 };
const command = 'node scripts/media/add-transcriber-soundtrack.mjs';
const [mode, ...extra] = process.argv.slice(2);

if (extra.length || (mode && !['--verify', '--restore', '--restore-music', '--restore-guided', '--help'].includes(mode))) {
  throw new Error(`Usage: ${command} [--verify|--restore|--restore-music|--restore-guided|--help]`);
}
if (mode === '--help') {
  console.log(`${command}
  Synthesize the original instrumental score locally; add AAC using -c:v copy.
  Requires existing Node.js, ffmpeg and ffprobe. No dependencies or downloads.
${command} --verify
  Verify the current variant and immutable backups. Delegates to the guided
  verifier when the approved music backup exists; guided frames differ by design.
${command} --restore
  Restore the byte-identical silent MP4 and update provenance. Never edit the backup.
${command} --restore-music
  Restore the byte-identical approved music MP4, without guided overlays/cues.
${command} --restore-guided
  Restore the byte-identical approved guided MP4, without added keyboard cues.
node scripts/media/guide-transcriber-demo.mjs
  Render the continuous editorial pointer from the clean music-only picture;
  retain approved music/click/wait audio and add observed-input keyboard cues.

The source SHA-256 is pinned in this script. Unknown changed files are refused.
Existing soundtrack outputs may be regenerated only when provenance matches.
Reproduction uses a fixed seed and 48 kHz PCM; AAC/container byte identity also
depends on the recorded ffmpeg version and platform. All work files stay inside
the repository and are removed on completion. No visual rendering is performed.
The baked-in “Sin audio” label stays unchanged; explain the added music externally.`);
  process.exit(0);
}

if (['--verify', '--restore', '--restore-music', '--restore-guided'].includes(mode)) {
  let hasMusicBackup = false;
  try {
    await stat(join(media, 'transcriber-demo-music-original.mp4'));
    hasMusicBackup = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (hasMusicBackup || mode === '--restore-music' || mode === '--restore-guided') {
    const mapped = { '--verify': '--verify', '--restore': '--restore=silent',
      '--restore-music': '--restore=music', '--restore-guided': '--restore=guided' };
    const result = spawnSync(process.execPath, [
      join(root, 'scripts/media/guide-transcriber-demo.mjs'), mapped[mode],
    ], { stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exit(result.status ?? 1);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

async function fileHash(path) {
  return sha256(await readFile(path));
}

function run(tool, args) {
  const result = spawnSync(tool, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert(result.status === 0, `${tool} failed (${result.status}): ${result.stderr}`);
  return result;
}

function probe(path) {
  return JSON.parse(run('ffprobe', [
    '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path,
  ]).stdout);
}

function videoSignatures(path) {
  const streamHash = run('ffmpeg', [
    '-v', 'error', '-i', path, '-map', '0:v:0', '-c:v', 'copy',
    '-bsf:v', 'h264_mp4toannexb', '-f', 'hash', '-hash', 'sha256', '-',
  ]).stdout.trim().split('=')[1];
  const frameMd5 = run('ffmpeg', [
    '-v', 'error', '-i', path, '-map', '0:v:0', '-an', '-threads', '1',
    '-f', 'framemd5', '-',
  ]).stdout;
  const frameRecords = frameMd5.split('\n').filter((line) => line && !line.startsWith('#'));
  const packets = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_packets',
    '-show_entries', 'packet=pts,dts,duration,size,flags', '-of', 'csv=p=0', path,
  ]).stdout;
  return {
    h264AnnexBSha256: streamHash,
    frameMd5RecordsSha256: sha256(frameRecords.join('\n') + '\n'),
    decodedFrameCount: frameRecords.length,
    packetTimingSha256: sha256(packets),
  };
}

function verifyVideo(sourceProbe, sourceSignatures, candidate) {
  const outputProbe = probe(candidate);
  const source = sourceProbe.streams.find((stream) => stream.codec_type === 'video');
  const output = outputProbe.streams.find((stream) => stream.codec_type === 'video');
  assert(output, 'Missing output video stream');
  for (const key of [
    'codec_name', 'profile', 'codec_tag_string', 'width', 'height', 'pix_fmt',
    'sample_aspect_ratio', 'display_aspect_ratio', 'r_frame_rate', 'avg_frame_rate',
    'time_base', 'start_pts', 'start_time', 'duration_ts', 'duration', 'nb_frames',
  ]) {
    assert(output[key] === source[key], `Video ${key} changed: ${source[key]} → ${output[key]}`);
  }
  assert(outputProbe.format.duration === sourceProbe.format.duration, 'Container duration changed');
  const signatures = videoSignatures(candidate);
  assert(JSON.stringify(signatures) === JSON.stringify(sourceSignatures),
    'H.264 data, decoded frames or packet timing changed');
  return { outputProbe, signatures };
}

function loudness(path, filters = '') {
  const result = run('ffmpeg', [
    '-hide_banner', '-nostdin', '-i', path, '-map', '0:a:0',
    '-af', `${filters}loudnorm=I=${target.integratedLufs}:TP=${target.truePeakDbtp}`
      + `:LRA=${target.loudnessRangeLu}:print_format=json`,
    '-f', 'null', '-',
  ]);
  const json = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  assert(json, 'ffmpeg did not report loudness');
  const stats = JSON.parse(json[0]);
  assert(['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset']
    .every((key) => Number.isFinite(Number(stats[key]))), 'Non-finite loudness measurement');
  return stats;
}

function verifyAudio(path, outputProbe) {
  const audio = outputProbe.streams.filter((stream) => stream.codec_type === 'audio');
  assert(outputProbe.streams.length === 2 && audio.length === 1, 'Expected one video and one audio stream');
  assert(audio[0].codec_name === 'aac' && audio[0].profile === 'LC', 'Expected AAC-LC audio');
  assert(Number(audio[0].sample_rate) === sampleRate && audio[0].channels === 2,
    'Expected 48 kHz stereo');
  assert(Number(audio[0].duration) === duration && Number(audio[0].start_time) === 0,
    'Audio timing does not cover the exact montage');
  const stats = loudness(path);
  const measured = {
    integratedLufs: Number(stats.input_i),
    truePeakDbtp: Number(stats.input_tp),
    loudnessRangeLu: Number(stats.input_lra),
    thresholdLufs: Number(stats.input_thresh),
    measurement: 'FFmpeg loudnorm / EBU R128, measured after decoding the final AAC',
  };
  assert(measured.integratedLufs >= -20 && measured.integratedLufs <= -18,
    `Audio loudness outside -20…-18 LUFS: ${measured.integratedLufs}`);
  assert(measured.truePeakDbtp <= -1.5, `True peak exceeds -1.5 dBTP: ${measured.truePeakDbtp}`);
  return measured;
}

// These are the actual keyframe edit boundaries, including 25 fps rounding.
const cues = [
  { at: 0, label: 'Introduction', chord: 'Dmaj9', bass: 38, notes: [50, 57, 61, 64, 69] },
  { at: 3, label: 'URL and language', chord: 'Amaj9', bass: 45, notes: [52, 56, 59, 61, 64] },
  { at: 10, label: 'Processing', chord: 'F#m9', bass: 42, notes: [52, 56, 57, 61, 68] },
  { at: 16, label: 'Text and translation', chord: 'Dmaj9', bass: 38, notes: [50, 57, 61, 64, 69] },
  { at: 21, label: 'Dual view and search', chord: 'Amaj9/C#', bass: 37, notes: [52, 56, 59, 61, 64] },
  { at: 28, label: 'Navigation', chord: 'E6/9', bass: 40, notes: [52, 56, 59, 61, 66] },
  { at: 32, label: 'Export', chord: 'F#m9', bass: 42, notes: [52, 56, 57, 61, 68] },
  { at: 36.52, label: 'Local history', chord: 'Dmaj9', bass: 38, notes: [50, 57, 61, 64, 69] },
  { at: 39.64, label: 'Closing card', chord: 'Aadd9', bass: 45, notes: [52, 57, 59, 61, 64] },
];

function synthesize() {
  const dry = [new Float64Array(samples), new Float64Array(samples)];
  const send = [new Float64Array(samples), new Float64Array(samples)];
  let state = seed;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const tau = 2 * Math.PI;
  const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
  const smooth = (value) => Math.sin(Math.min(1, Math.max(0, value)) * Math.PI / 2) ** 2;
  const envelope = (time, length, attack, release) => smooth(time / attack) * smooth((length - time) / release);

  function voice(start, length, amplitude, pan, wet, oscillator) {
    const startSample = Math.round(start * sampleRate);
    const endSample = Math.min(samples, Math.round((start + length) * sampleRate));
    const left = Math.cos((pan + 1) * Math.PI / 4) * amplitude;
    const right = Math.sin((pan + 1) * Math.PI / 4) * amplitude;
    for (let i = Math.max(0, startSample); i < endSample; i++) {
      const value = oscillator((i - startSample) / sampleRate);
      dry[0][i] += value * left;
      dry[1][i] += value * right;
      send[0][i] += value * left * wet;
      send[1][i] += value * right * wet;
    }
  }

  for (const [index, cue] of cues.entries()) {
    const end = cues[index + 1]?.at ?? duration;
    const start = cue.at - 0.75;
    const length = end - start + 1.2;
    for (const [noteIndex, note] of cue.notes.entries()) {
      const frequency = hz(note);
      const phase = random() * tau;
      const detune = 2 ** ((2.3 + random() * 1.6) / 1200);
      voice(start, length, 0.033, (noteIndex - 2) * 0.3, 0.45, (t) => {
        const p = tau * frequency * t;
        const fundamental = 0.64 * Math.sin(p + phase)
          + 0.2 * Math.sin(p * detune + phase * 0.7)
          + 0.16 * Math.sin(p / detune + phase * 1.3);
        const warmth = 0.12 * Math.sin(2 * p + phase) + 0.025 * Math.sin(3 * p);
        const drift = 0.92 + 0.08 * Math.sin(tau * 0.11 * t + phase);
        return (fundamental + warmth) * drift * envelope(t, length, 1.5, 1.8);
      });
    }
    voice(start, length, 0.061, 0, 0.06, (t) => {
      const p = tau * hz(cue.bass) * t;
      return (Math.sin(p) + 0.15 * Math.sin(2 * p)) * envelope(t, length, 1.35, 1.6);
    });

    if (index > 0) {
      const swellLength = 2.5;
      for (const [n, note] of [cue.notes[3] + 12, cue.notes[4] + 12].entries()) {
        voice(cue.at - 0.85, swellLength, 0.017, n ? 0.55 : -0.55, 0.85, (t) => {
          const shape = t < 0.85 ? smooth(t / 0.85) : Math.exp(-(t - 0.85) * 2.8);
          return (Math.sin(tau * hz(note) * t) + 0.06 * Math.sin(tau * hz(note) * 2 * t))
            * shape * smooth((swellLength - t) / 0.65);
        });
      }
    }
  }

  const beat = 60 / tempo;
  const motif = [2, null, 4, null, null, 3, null, 1, 2, null, null, 4, null, 3, null, null];
  for (let step = 0; 3 + step * beat / 2 < 38.9; step++) {
    const at = 3 + step * beat / 2;
    const cue = cues.findLast((item) => item.at <= at);
    const noteIndex = motif[step % motif.length];
    if (noteIndex !== null) {
      const frequency = hz(cue.notes[noteIndex] + 12);
      const pan = Math.sin(step * 1.7) * 0.46;
      const amplitude = 0.04 * (0.86 + random() * 0.14) * (at > 36.5 ? 0.7 : 1);
      const mallet = (t) => {
        const p = tau * frequency * t;
        const bell = Math.sin(p + 0.38 * Math.exp(-t * 9) * Math.sin(2 * p));
        return (bell + 0.08 * Math.sin(2 * p) * Math.exp(-t * 5))
          * Math.exp(-t * 2.6) * envelope(t, 2.6, 0.026, 0.6);
      };
      voice(at, 2.6, amplitude, pan, 0.58, mallet);
      for (let echo = 1; echo <= 3; echo++) {
        voice(at + beat * 0.75 * echo, 2.6, amplitude * 0.27 ** echo,
          echo % 2 ? -pan : pan, 0.65, mallet);
      }
    }
    if (step % 2 === 0) {
      voice(at, 0.45, step % 8 === 0 ? 0.042 : 0.031, 0, 0.08, (t) => {
        const phase = tau * (62 * t + 12 * 0.025 * (1 - Math.exp(-t / 0.025)));
        return Math.sin(phase) * Math.exp(-t * 11) * envelope(t, 0.45, 0.022, 0.14);
      });
    }
    if (step % 4 === 2) {
      voice(at, 0.22, 0.006, step % 8 ? -0.18 : 0.18, 0.2, (t) =>
        (Math.sin(tau * 880 * t) + 0.35 * Math.sin(tau * 1320 * t))
          * Math.exp(-t * 28) * envelope(t, 0.22, 0.018, 0.09));
    }
  }

  // Damped feedback combs give the original oscillators a quiet, diffuse room.
  const reverb = [0, 1].map((channel) => [0.0311, 0.0377, 0.0437, 0.0533, 0.0617, 0.0719]
    .map((seconds, index) => ({
      buffer: new Float64Array(Math.round(sampleRate * (seconds + channel * (index % 2 ? 0.0013 : 0.0017)))),
      position: 0,
      damped: 0,
      feedback: 10 ** (-3 * seconds / 2.2),
    })));
  const preDelay = Math.round(0.023 * sampleRate);
  const wav = Buffer.alloc(44 + samples * 6);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 6, 28);
  wav.writeUInt16LE(6, 32);
  wav.writeUInt16LE(24, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 6, 40);
  let peak = 0;
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const fade = smooth(t / 1.6) * smooth((duration - t) / 3);
    for (let channel = 0; channel < 2; channel++) {
      const input = i < preDelay ? 0 : send[channel][i - preDelay] * 0.85 + send[1 - channel][i - preDelay] * 0.15;
      let room = 0;
      for (const comb of reverb[channel]) {
        const delayed = comb.buffer[comb.position];
        comb.damped += 0.22 * (delayed - comb.damped);
        comb.buffer[comb.position] = input + comb.damped * comb.feedback;
        comb.position = (comb.position + 1) % comb.buffer.length;
        room += delayed;
      }
      const value = (dry[channel][i] + room * 0.13) * fade;
      peak = Math.max(peak, Math.abs(value));
      assert(Math.abs(value) < 1, 'Unmastered synthesis clipped');
      wav.writeIntLE(Math.round(value * 0x7fffff), 44 + (i * 2 + channel) * 3, 3);
    }
  }
  return { wav, unmasteredSamplePeakDbfs: 20 * Math.log10(peak) };
}

async function main() {
  // The backup is created exclusively, verified first and never overwritten.
  try {
    await stat(backup);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    assert(!mode, 'The immutable backup is missing; verification/restoration cannot proceed');
    assert(await fileHash(video) === originalSha256, 'STOP: current video is not the approved silent source');
    await copyFile(video, backup, constants.COPYFILE_EXCL);
  }
  assert(await fileHash(backup) === originalSha256, 'STOP: existing silent backup differs; it must never be overwritten');
  const metadata = JSON.parse(await readFile(provenance, 'utf8'));
  assert(!metadata.guidance?.applied,
    'The guided edition has authorized visual changes. Use guide-transcriber-demo.mjs to regenerate it, or --restore-music/--restore for an exact approved variant.');
  const currentHash = await fileHash(video);
  const knownSoundtrack = metadata.audio === true
    && metadata.soundtrack?.applied === true
    && metadata.silentBackup?.sha256 === originalSha256
    && metadata.videoSha256 === currentHash;
  assert(currentHash === originalSha256 || knownSoundtrack,
    'STOP: current video differs from both the silent source and recorded soundtrack output');
  const sourceProbe = probe(backup);
  assert(sourceProbe.streams.length === 1 && sourceProbe.streams[0].codec_name === 'h264',
    'Expected a silent H.264 source');
  assert(Number(sourceProbe.format.duration) === duration, 'Unexpected source duration');
  const sourceSignatures = videoSignatures(backup);
  assert(sourceSignatures.decodedFrameCount === 1066, 'Unexpected source frame count');
  if (knownSoundtrack) verifyVideo(sourceProbe, sourceSignatures, video);

  if (mode === '--verify') {
    const { outputProbe, signatures } = verifyVideo(sourceProbe, sourceSignatures, video);
    const measured = currentHash === originalSha256 ? null : verifyAudio(video, outputProbe);
    assert(metadata.videoSha256 === currentHash, 'Provenance video SHA-256 does not match');
    assert(metadata.bytes === (await stat(video)).size, 'Provenance byte count does not match');
    assert(metadata.audio === Boolean(measured), 'Provenance audio flag does not match');
    if (measured) {
      assert(JSON.stringify(metadata.soundtrack.measured) === JSON.stringify(measured),
        'Recorded loudness does not match decoded AAC');
      assert(JSON.stringify(metadata.videoPreservation.signatures) === JSON.stringify(signatures),
        'Recorded video signatures do not match');
    }
    console.log(JSON.stringify({ verified: true, videoSha256: currentHash, backupSha256: originalSha256,
      durationSeconds: duration, ...signatures, audio: measured }, null, 2));
    return;
  }

  await mkdir(work); // An existing work directory is a lock, not something to delete.
  try {
    const staged = join(work, 'transcriber-demo.mp4');
    const stagedMetadata = join(work, 'transcriber-demo.json');
    if (mode === '--restore') {
      await copyFile(backup, staged, constants.COPYFILE_EXCL);
      assert(await fileHash(staged) === originalSha256, 'Restoration copy verification failed');
      metadata.audio = false;
      metadata.videoSha256 = originalSha256;
      metadata.bytes = (await stat(staged)).size;
      if (metadata.soundtrack) metadata.soundtrack.applied = false;
      await writeFile(stagedMetadata, JSON.stringify(metadata, null, 2) + '\n');
      await rename(staged, video);
      await rename(stagedMetadata, provenance);
      assert(await fileHash(video) === originalSha256, 'Restored file verification failed');
      console.log(`Restored byte-identical silent video. SHA-256: ${originalSha256}`);
      return;
    }

    console.log('Synthesizing original warm pads, soft mallets, pulse and edit-synchronized transitions…');
    const { wav, unmasteredSamplePeakDbfs } = synthesize();
    const score = join(work, 'original-score.wav');
    await writeFile(score, wav);
    const filters = 'highpass=f=32,lowpass=f=7200,';
    const firstPass = loudness(score, filters);
    const normalization = `loudnorm=I=${target.integratedLufs}:TP=${target.truePeakDbtp}:LRA=${target.loudnessRangeLu}`
      + `:measured_I=${firstPass.input_i}:measured_TP=${firstPass.input_tp}`
      + `:measured_LRA=${firstPass.input_lra}:measured_thresh=${firstPass.input_thresh}`
      + `:offset=${firstPass.target_offset}:linear=true`;
    console.log('Mastering to -19 LUFS and muxing AAC; video stream is copied without encoding…');
    run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', backup, '-i', score,
      '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '0', '-c:v', 'copy',
      '-af', `${filters}${normalization},atrim=duration=${duration},asetpts=N/SR/TB`,
      '-c:a', 'aac', '-b:a', '192k', '-ar', String(sampleRate), '-threads:a', '1',
      '-flags:a', '+bitexact', '-fflags', '+bitexact', '-movflags', '+faststart',
      '-metadata:s:a:0', 'language=zxx',
      '-metadata:s:a:0', 'handler_name=Original instrumental score - Quiet Signals',
      staged,
    ]);
    console.log('Verifying H.264, every decoded frame, packet timing, duration and final AAC loudness…');
    const { outputProbe, signatures } = verifyVideo(sourceProbe, sourceSignatures, staged);
    const measured = verifyAudio(staged, outputProbe);
    assert(await fileHash(backup) === originalSha256, 'Immutable backup changed during generation');
    const updated = {
      ...metadata,
      videoSha256: await fileHash(staged),
      bytes: (await stat(staged)).size,
      audio: true,
      silentBackup: {
        file: 'public/media/transcriber-demo-silent.mp4',
        sha256: originalSha256,
        bytes: (await stat(backup)).size,
        policy: 'Byte-identical approved silent montage. Never modify, replace or regenerate this backup.',
        restoreCommand: `${command} --restore`,
        verifyCommand: `${command} --verify`,
      },
      soundtrack: {
        applied: true,
        title: 'Quiet Signals',
        origin: 'Original instrumental composition and deterministic local synthesis created for this montage. No downloaded audio, third-party samples, song references or voices.',
        role: 'Optional background music, not source/application audio or narration.',
        generator: 'scripts/media/add-transcriber-soundtrack.mjs',
        generatorSha256: await fileHash(fileURLToPath(import.meta.url)),
        regenerateCommand: command,
        synthesis: {
          seed,
          tempoBpm: tempo,
          sampleRateHz: sampleRate,
          channels: 2,
          pcmBits: 24,
          pcmSamplesPerChannel: samples,
          synthesizedWavSha256: sha256(wav),
          unmasteredSamplePeakDbfs: Number(unmasteredSamplePeakDbfs.toFixed(3)),
          arrangement: 'Slowly crossfaded, gently detuned additive pads and warm bass; sparse FM-softened mallets with dotted-eighth echoes; a low sine pulse; harmonic transition swells; damped stereo reverb.',
          fadeInSeconds: 1.6,
          fadeOutSeconds: 3,
          transitionSync: 'Harmonic swells peak on the original edit-boundary keyframes. 36.52 and 39.64 include the original 25 fps rounding.',
          cues,
        },
        mastering: {
          target,
          method: '32 Hz high-pass, 7.2 kHz low-pass, two-pass FFmpeg loudnorm; final decoded AAC measured separately.',
          codec: 'AAC-LC',
          bitrateBitsPerSecond: 192000,
          sampleRateHz: sampleRate,
          channels: 2,
        },
        measured,
        tools: {
          node: process.version,
          ffmpeg: run('ffmpeg', ['-version']).stdout.split('\n')[0],
          ffprobe: run('ffprobe', ['-version']).stdout.split('\n')[0],
          platform: `${process.platform}/${process.arch}`,
        },
        reproducibility: 'Fixed score, seed and 24-bit PCM. Exact AAC/MP4 bytes depend on tool versions/platform; use the recorded hashes to check reproduction.',
        caveat: 'The original baked-in “Sin audio” label remains visually untouched. External copy/captions must explain that optional original background music was added later; the original recording contains no audio.',
      },
      videoPreservation: {
        method: 'ffmpeg -map 0:v:0 -map 1:a:0 -c:v copy; no visual filters, re-encoding, retiming, trimming or frame-rate conversion.',
        source: 'public/media/transcriber-demo-silent.mp4',
        exactContainerDurationSeconds: duration,
        resolution: '1920x1080',
        fps: '25/1',
        frames: 1066,
        timeBase: '1/12800',
        durationTicks: 545792,
        signatures,
        checks: 'Identical source/output Annex-B H.264 SHA-256; SHA-256 of all decoded framemd5 records (including frame timestamps); SHA-256 of video packet PTS/DTS/duration/size/flags; matching video stream properties and container duration.',
      },
    };
    await writeFile(stagedMetadata, JSON.stringify(updated, null, 2) + '\n');
    await rename(staged, video);
    await rename(stagedMetadata, provenance);
    assert(await fileHash(video) === updated.videoSha256, 'Published output SHA-256 changed');
    console.log(JSON.stringify({ videoSha256: updated.videoSha256, backupSha256: originalSha256,
      bytes: updated.bytes, durationSeconds: duration, ...signatures, measured,
      restoreCommand: `${command} --restore` }, null, 2));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

await main();
