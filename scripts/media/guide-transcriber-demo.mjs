import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyboardCues, mixKeyboard } from './transcriber-keyboard-audio.mjs';
import { auditPointer, renderPointerOverlays, trajectoryPolicy } from './transcriber-continuous-pointer.mjs';
import { verifyAudioMix, verifyCaptions, verifyMontageFraming } from './verify-transcriber-continuous.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const media = join(root, 'public/media');
const current = join(media, 'transcriber-demo.mp4');
const provenance = join(media, 'transcriber-demo.json');
const work = join(root, 'scripts/media/transcriber-guidance-work');
const evidence = process.env.TRANSCRIBER_EVIDENCE_DIR
  ? resolve(root, process.env.TRANSCRIBER_EVIDENCE_DIR) : join(work, 'evidence');
const validationFile = join(media, 'transcriber-demo-validation.json');
const ledgerFile = join(root, 'scripts/media/transcriber-demo-events.json');
const keyboardLedgerFile = join(root, 'scripts/media/transcriber-demo-keyboard-events.json');
const command = 'node scripts/media/guide-transcriber-demo.mjs';
const backups = {
  silent: { file: 'transcriber-demo-silent.mp4', sha256: '70a30d78b23aba3abeee43e770cd8b138e9c745c506fe856a08a1f2ea20707ed' },
  music: { file: 'transcriber-demo-music-original.mp4', sha256: '3fd1264855ef11a05321392f7d562c6ab84023d9d3abc9111cc447a4b5d86a02' },
  guided: { file: 'transcriber-demo-guided-original.mp4', sha256: '804e3111f960ecac5bbcb8070db8deeba1c12891f976d484141c4806903796c1' },
};
const originalMetadataFile = join(media, 'transcriber-demo-music-original.json');
const originalMetadataHash = '2d2ff723ac4c6ba46aa30a90f7e1fba87c8a4ae0018c6edba6841c0327d79153';
const guidedMetadataFile = join(media, 'transcriber-demo-guided-original.json');
const guidedMetadataHash = '7b46d45cf13efdb0dd86dfda7e4a1d5a7757f1a029d76552264635e31c8465b3';
const duration = 42.64;
const fps = 25;
const frames = 1066;
const rate = 48000;
const [mode, ...extra] = process.argv.slice(2);
if (extra.length || (mode && !['--verify', '--restore=music', '--restore=silent', '--restore=guided', '--help'].includes(mode))) {
  throw Error(`Usage: ${command} [--verify|--restore=music|--restore=silent|--restore=guided|--help]`);
}
if (mode === '--help') {
  console.log(`${command}
  Render ONE continuously visible editorial pointer on every application frame,
  using ONLY the immutable music edition as the clean picture source.
  Preserve 1066 frames / 42.64 seconds / 1080p25, framing, clicks/waits and score.
  Uses the inspected transcriber-demo-keyboard-events.json ledger: 49 observed
  text-growth frames representing 52 characters, not guessed sub-frame typing.
  No network, production calls, new recording, external audio or downloads.
${command} --verify
  Verify all THREE pinned backups, historical metadata, current variant, all decoded
  video frames, duration/timing, subtitles, ledger and final AAC loudness.
${command} --restore=music
  Restore the EXACT approved MP4 with its original music; update current metadata.
${command} --restore=silent
  Restore the EXACT silent MP4; update current metadata. Backups are never edited.
${command} --restore=guided
  Restore the EXACT approved guided MP4 without the new keyboard cues.

Policy: the original recording has NO mouse telemetry. Smooth cursor travel is
honest editorial interpolation, NOT the genuine original trajectory.
Picture is re-encoded; the approved guided AUDIO plus one keyboard layer is reused.
Soft typing is editorial, not recorded application audio.
No sound for programmatic clear/focus, no fake typing, and no invented upload UI.
The old baked-in 'Sin audio' footer remains from the original silent capture.
Work stays in an exclusive repository-local lock directory and is removed.
TRANSCRIBER_EVIDENCE_DIR optionally retains private all-frame audits/frame pairs.
Fixed ledger/seed; encoded AAC/container bytes can depend on ffmpeg/platform.`);
  process.exit(0);
}

function assert(value, message) { if (!value) throw Error(message); }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
async function fileHash(file) { return hash(await readFile(file)); }
function run(tool, args, binary = false) {
  const result = spawnSync(tool, args, { encoding: binary ? null : 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert(result.status === 0, `${tool} failed: ${result.stderr}`);
  return result;
}
function probe(file) {
  return JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
}
function videoSignature(file) {
  const records = run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-an',
    '-threads', '1', '-f', 'framemd5', '-']).stdout.split('\n').filter((line) => line && !line.startsWith('#'));
  assert(records.length === frames, `Expected ${frames} decoded frames, found ${records.length}`);
  return hash(records.join('\n') + '\n');
}
function presentationTiming(file) {
  const data = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_frames',
    '-show_entries', 'frame=best_effort_timestamp_time,duration_time', '-of', 'json', file]).stdout);
  return hash(JSON.stringify(data.frames.map((f) => [f.best_effort_timestamp_time, f.duration_time])));
}
function encodedPicture(file) {
  const annexB = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy',
    '-bsf:v', 'h264_mp4toannexb', '-f', 'hash', '-hash', 'sha256', '-']).stdout.trim().split('=')[1];
  const packets = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_packets',
    '-show_entries', 'packet=pts,dts,duration,size,flags', '-of', 'csv=p=0', file]).stdout;
  return { h264AnnexBSha256: annexB, packetTimingSizeFlagsSha256: hash(packets) };
}
function verifyGuidedPicture(file, checked, guidedMetadata) {
  const source = join(media, backups.guided.file);
  const signatures = encodedPicture(file);
  assert(JSON.stringify(signatures) === JSON.stringify(encodedPicture(source)), 'Approved H.264/packet data changed');
  assert(checked.decodedFrameMd5Sha256 === videoSignature(source)
    && checked.decodedFrameMd5Sha256 === guidedMetadata.guidance.decodedFrameMd5Sha256,
  'Approved guided decoded picture changed');
  const a = probe(source).streams[0];
  const b = probe(file).streams[0];
  for (const key of ['codec_name', 'profile', 'codec_tag_string', 'width', 'height', 'pix_fmt',
    'sample_aspect_ratio', 'display_aspect_ratio', 'r_frame_rate', 'avg_frame_rate', 'time_base',
    'start_pts', 'start_time', 'duration_ts', 'duration', 'nb_frames']) {
    assert(a[key] === b[key], `Approved video stream property differs: ${key}`);
  }
  return { ...signatures, decodedFrameMd5Sha256: checked.decodedFrameMd5Sha256,
    presentationTimingSha256: checked.presentationTimingSha256 };
}
function measure(file) {
  const result = run('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-map', '0:a:0',
    '-af', 'loudnorm=I=-19:TP=-2:LRA=8:print_format=json', '-f', 'null', '-']);
  const match = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  assert(match, 'Missing decoded audio loudness measurement');
  const stats = JSON.parse(match[0]);
  return { integratedLufs: Number(stats.input_i), truePeakDbtp: Number(stats.input_tp),
    loudnessRangeLu: Number(stats.input_lra), thresholdLufs: Number(stats.input_thresh),
    measurement: 'FFmpeg loudnorm / EBU R128, measured after decoding the final AAC' };
}
function verifyMedia(file, audio) {
  const info = probe(file);
  const v = info.streams.find((s) => s.codec_type === 'video');
  assert(v?.codec_name === 'h264' && v.width === 1920 && v.height === 1080 && v.pix_fmt === 'yuv420p',
    'Expected 1920x1080 H.264 yuv420p');
  assert(v.r_frame_rate === '25/1' && v.avg_frame_rate === '25/1'
    && Number(v.nb_frames) === frames && Number(v.duration) === duration
    && Number(v.start_time) === 0 && Number(info.format.duration) === duration,
  `Montage timing changed: ${JSON.stringify({ fps: v.r_frame_rate, averageFps: v.avg_frame_rate,
    frames: v.nb_frames, videoDuration: v.duration, start: v.start_time, containerDuration: info.format.duration })}`);
  const presentationTimingSha256 = presentationTiming(file);
  assert(presentationTimingSha256 === presentationTiming(join(media, backups.silent.file)),
    'Decoded presentation timestamps/durations differ from the approved montage');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  assert(info.streams.length === (audio ? 2 : 1) && Boolean(a) === audio, 'Unexpected stream layout');
  let measured = null;
  if (a) {
    assert(a.codec_name === 'aac' && a.profile === 'LC' && a.channels === 2 && Number(a.sample_rate) === rate
      && Number(a.duration) === duration && Number(a.start_time) === 0, 'Expected full-length 48 kHz stereo AAC-LC');
    measured = measure(file);
    assert(measured.integratedLufs >= -20 && measured.integratedLufs <= -18, 'Loudness outside -20…-18 LUFS');
    assert(measured.truePeakDbtp <= -1.5, 'True peak exceeds -1.5 dBTP');
  }
  return { decodedFrameMd5Sha256: videoSignature(file), presentationTimingSha256, measured };
}
async function verifyBackups() {
  for (const [name, data] of Object.entries(backups)) {
    assert(await fileHash(join(media, data.file)) === data.sha256, `STOP: immutable ${name} backup differs`);
  }
  assert(await fileHash(originalMetadataFile) === originalMetadataHash, 'STOP: historical music metadata differs');
  assert(await fileHash(guidedMetadataFile) === guidedMetadataHash, 'STOP: historical guided metadata differs');
  return JSON.parse(await readFile(originalMetadataFile, 'utf8'));
}
async function subtitleHashes() {
  return Object.fromEntries(await Promise.all(['es', 'en'].map(async (lang) => [
    lang, await fileHash(join(media, `transcriber-demo.${lang}.vtt`)),
  ])));
}
function backupMetadata() {
  return Object.fromEntries(Object.entries(backups).map(([key, value]) => [key, {
    file: `public/media/${value.file}`, sha256: value.sha256,
    policy: 'Immutable, byte-identical approved variant; never overwrite or regenerate.',
    restoreCommand: `${command} --restore=${key}`, verifyCommand: `${command} --verify`,
  }]));
}
function validateLedger(ledger) {
  assert(ledger.source.sha256 === '463c32e76c7253812e3e4546df7c885b007c566e4609a14cb88782e802bce477',
    'Unknown source recording');
  assert(ledger.events.filter((e) => e.kind === 'click').length === 14, 'Unexpected click ledger');
  assert(ledger.events.flatMap(e => e.pulses ?? []).length === 5, 'Unexpected wait pulse ledger');
  for (const e of ledger.events) {
    assert(e.start >= 3 && e.start <= e.at && e.at < e.end && e.end <= 39.64, `Invalid event time: ${e.id}`);
    assert(Math.abs(e.at * fps - Math.round(e.at * fps)) < 1e-6, `Cue not on native frame: ${e.id}`);
    assert(e.sourceAt === e.at && e.at < 36.5, `Unverified source-to-montage mapping: ${e.id}`);
    assert(['click', 'wait', 'input'].includes(e.kind), `Unknown action: ${e.id}`);
    assert(e.xy[0] >= 40 && e.xy[0] <= 1240 && e.xy[1] >= 40 && e.xy[1] <= 680, `Cursor outside UI: ${e.id}`);
    const [x, y] = e.labelXY;
    assert(x >= 0 && y >= 0 && x + e.label.length * 11 + 24 <= 1280 && y + 34 <= 720,
      `Label outside UI: ${e.id}`);
    if (e.focusRect) {
      const [fx, fy, w, h] = e.focusRect;
      assert(fx >= 2 && fy >= 2 && fx + w <= 1278 && fy + h <= 718, `Focus outside UI: ${e.id}`);
    }
    for (const pulse of e.pulses ?? []) assert(pulse >= e.start && pulse + 0.22 < e.end, 'Wait sound exceeds visible wait');
  }
}
async function publish(staged, metadata) {
  const stagedMetadata = join(work, 'metadata.json');
  await writeFile(stagedMetadata, JSON.stringify(metadata, null, 2) + '\n');
  await verifyBackups();
  await rename(staged, current);
  await rename(stagedMetadata, provenance);
  assert(await fileHash(current) === metadata.videoSha256, 'Published SHA-256 mismatch');
}
async function helperHashes() {
  const files = ['guide-transcriber-demo.mjs', 'transcriber-continuous-pointer.mjs',
    'transcriber-keyboard-audio.mjs', 'verify-transcriber-continuous.mjs', 'finance-demo-v2-pointer.mjs'];
  return Object.fromEntries(await Promise.all(files.map(async file => [file,
    await fileHash(join(root, 'scripts/media', file))])));
}
async function continuousChecks(file, ledger, keyboardLedger, mix) {
  const cleanSource = await auditPointer(join(media, backups.music.file), ledger, evidence, { cleanSource: true });
  const pointer = await auditPointer(file, ledger, evidence);
  const audioSync = await verifyAudioMix(file, mix ?? await mixKeyboard({
    source: join(media, backups.guided.file), work, ledger: keyboardLedger, duration,
  }), ledger);
  const montageFraming = verifyMontageFraming(file, join(media, backups.music.file));
  return { cleanSource, pointer, audioSync, montageFraming };
}
async function writeValidation(metadata, checked, checks = {}, restoration) {
  let previous = {};
  try { previous = JSON.parse(await readFile(validationFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const restorationTests = (previous.restorationTests ?? []).filter(test =>
    test.variant && backups[test.variant]?.sha256 === test.expectedAndActualSha256);
  if (restoration) {
    const index = restorationTests.findIndex(test => test.variant === restoration.variant);
    if (index >= 0) restorationTests.splice(index, 1);
    restorationTests.push(restoration);
  }
  const report = {
    validatedOn: new Date().toISOString(), variant: metadata.variant,
    videoSha256: metadata.videoSha256, bytes: metadata.bytes, durationSeconds: duration,
    resolution: '1920x1080', fps, decodedFrames: frames, ...checked,
    audioCodec: metadata.audio ? 'AAC-LC / 48000 Hz / stereo' : null,
    presentationTimingMatchesApprovedSilentMontage: true,
    currentSubtitleValidation: await verifyCaptions(media), ...checks, restorationTests,
    continuousCursor: checks.pointer ? Object.fromEntries([
      'totalUiFrames', 'cursorCoveredFrames', 'missingFrames', 'multipleCursorFrames', 'coordinatesInBoundsFrames',
    ].map(key => [key, checks.pointer[key]])) : null,
    backups: backupMetadata(),
    commands: { generate: command, verify: `${command} --verify`,
      legacyVerify: 'node scripts/media/add-transcriber-soundtrack.mjs --verify',
      pointerSelfTest: 'node scripts/media/transcriber-continuous-pointer.mjs --self-test' },
    limitations: [trajectoryPolicy, 'Original baked-in Sin audio label retained. Audio is optional original music and editorial cues, not source audio. No invented uploads or notifications.',
      'AAC/cursor checks are computational, not a claim of a human listening audition. Source artifacts remain private.'],
  };
  await writeFile(validationFile, JSON.stringify(report, null, 2) + '\n');
  return report;
}
async function main() {
  const original = await verifyBackups();
  const guidedOriginal = JSON.parse(await readFile(guidedMetadataFile, 'utf8'));
  const metadata = JSON.parse(await readFile(provenance, 'utf8'));
  const currentHash = await fileHash(current);
  const variant = Object.keys(backups).find((key) => backups[key].sha256 === currentHash)
    ?? (metadata.variant === 'guided-continuous-keyboard' && metadata.videoSha256 === currentHash
      ? 'guided-continuous-keyboard' : null)
    ?? (metadata.keyboard?.applied && metadata.videoSha256 === currentHash ? 'guided-keyboard' : null);
  assert(variant, 'STOP: refusing to overwrite or verify an unknown current video');
  const ledger = JSON.parse(await readFile(ledgerFile, 'utf8'));
  validateLedger(ledger);
  const keyboardLedger = JSON.parse(await readFile(keyboardLedgerFile, 'utf8'));
  const expectedKeys = keyboardCues(keyboardLedger);
  if (mode === '--verify') {
    const results = verifyMedia(current, variant !== 'silent');
    assert(metadata.videoSha256 === currentHash && metadata.bytes === (await stat(current)).size
      && metadata.audio === (variant !== 'silent'), 'Current provenance mismatch');
    if (variant === 'guided' || variant === 'guided-keyboard' || variant === 'guided-continuous-keyboard') {
      assert(metadata.guidance.ledgerSha256 === await fileHash(ledgerFile), 'Ledger differs from rendered edition');
      assert(metadata.guidance.decodedFrameMd5Sha256 === results.decodedFrameMd5Sha256, 'Decoded guided frames differ');
      assert(metadata.guidance.presentationTimingSha256 === results.presentationTimingSha256, 'Recorded timing differs');
      assert(JSON.stringify(metadata.soundtrack.measured) === JSON.stringify(results.measured), 'Audio measurements differ');
      assert(JSON.stringify(metadata.guidance.subtitleSha256) === JSON.stringify(await subtitleHashes()), 'Subtitles changed');
      assert(metadata.videoPreservation?.byteIdentical === (variant === 'guided-keyboard'),
        'Incorrect picture-identity claim for this variant');
    }
    if (variant === 'guided-keyboard' || variant === 'guided-continuous-keyboard') {
      if (variant === 'guided-keyboard') {
        const identity = verifyGuidedPicture(current, results, guidedOriginal);
        assert(JSON.stringify(metadata.keyboard.pictureIdentity) === JSON.stringify(identity), 'Recorded picture identity differs');
      }
      assert(metadata.keyboard.ledgerSha256 === await fileHash(keyboardLedgerFile), 'Keyboard ledger differs');
      assert(JSON.stringify(metadata.keyboard.mix.cues.map(({ id, at, visibleCharacterCount, addedCharacters }) =>
        ({ id, at, visibleCharacterCount, addedCharacters }))) === JSON.stringify(expectedKeys.map(
        ({ id, at, visibleCharacterCount, addedCharacters }) => ({ id, at, visibleCharacterCount, addedCharacters }))),
      'Keyboard cue record differs from inspected typing');
      assert(metadata.keyboard.sourceSha256 === backups.guided.sha256, 'Wrong base audio source');
    }
    if (variant === 'guided-continuous-keyboard') {
      assert(JSON.stringify(metadata.guidance.helperSha256) === JSON.stringify(await helperHashes()), 'Rendering helpers changed');
      assert(metadata.videoPreservation.sourceSha256 === backups.music.sha256, 'Wrong clean visual base');
      await mkdir(work);
      try {
        const checks = await continuousChecks(current, ledger, keyboardLedger);
        for (const key of ['pointer', 'cleanSource', 'audioSync', 'montageFraming'])
          assert(JSON.stringify(metadata.guidance.validation[key]) === JSON.stringify(checks[key]), `Recorded ${key} differs`);
        await writeValidation(metadata, results, checks);
      } finally { await rm(work, { recursive: true, force: true }); }
    } else await writeValidation(metadata, results);
    console.log(JSON.stringify({ verified: true, variant, videoSha256: currentHash, backups,
      durationSeconds: duration, resolution: '1920x1080', fps, frames, ...results }, null, 2));
    return;
  }
  await mkdir(work);
  try {
    const staged = join(work, 'guided.mp4');
    if (mode?.startsWith('--restore=')) {
      const chosen = mode.split('=')[1];
      const data = backups[chosen];
      await copyFile(join(media, data.file), staged, constants.COPYFILE_EXCL);
      assert(await fileHash(staged) === data.sha256, 'Restore copy differs from pinned backup');
      const checked = verifyMedia(staged, chosen !== 'silent');
      const restored = structuredClone(chosen === 'guided' ? guidedOriginal : original);
      restored.videoSha256 = data.sha256;
      restored.bytes = (await stat(staged)).size;
      restored.audio = chosen !== 'silent';
      restored.soundtrack.applied = restored.audio;
      restored.variant = chosen;
      restored.backups = backupMetadata();
      restored.silentBackup.restoreCommand = `${command} --restore=silent`;
      restored.silentBackup.verifyCommand = `${command} --verify`;
      if (chosen !== 'guided') restored.guidance = { applied: false, regenerateCommand: command };
      else restored.guidance.subtitleSha256 = await subtitleHashes();
      restored.keyboard = { applied: false, regenerateCommand: command };
      restored.restoration = { variant: chosen, expectedSha256: data.sha256, copyVerified: true,
        decodedFrameMd5Sha256: checked.decodedFrameMd5Sha256,
        method: 'Exclusive copy from immutable backup; exact SHA-256 and decoded media checked before publishing.' };
      await publish(staged, restored);
      await writeValidation(restored, checked, {}, { variant: chosen, command: `${command} --restore=${chosen}`,
        testedOn: new Date().toISOString(), expectedAndActualSha256: data.sha256,
        decodedFrameMd5Sha256: checked.decodedFrameMd5Sha256, passed: true,
        result: 'Actually restored the public MP4; exact SHA, all decoded frames, timing and audio checked before publishing.' });
      console.log(`Restored exact ${chosen} variant: ${data.sha256}`);
      return;
    }
    console.log('Rendering one continuous editorial pointer from the clean music-only picture…');
    const subtitles = await subtitleHashes();
    await verifyCaptions(media);
    const overlays = await renderPointerOverlays(work, ledger);
    const mix = await mixKeyboard({ source: join(media, backups.guided.file), work, ledger: keyboardLedger, duration });
    // The original concatenated chapters change stream properties; graph resets would drop eight buffered frames.
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-xerror', '-nostdin',
      '-reinit_filter', '0', '-i', join(media, backups.music.file),
      '-framerate', '25', '-i', join(overlays.directory, '%04d.png'), '-i', mix.file,
      '-filter_complex_threads', '1', '-filter_complex',
      '[0:v]format=yuv444p[base];[base][1:v]overlay=x=568:y=191:format=auto:shortest=1,format=yuv420p[out]',
      '-map', '[out]', '-map', '2:a:0', '-map_metadata', '0', '-c:v', 'libx264',
      '-preset', 'slow', '-crf', '18', '-threads:v', '2', '-fps_mode', 'passthrough',
      '-video_track_timescale', '12800',
      '-af', `atrim=duration=${duration},asetpts=N/SR/TB`, '-c:a', 'aac', '-b:a', '192k',
      '-ar', String(rate), '-threads:a', '1', '-flags:a', '+bitexact', '-fflags', '+bitexact',
      '-metadata:s:a:0', 'language=zxx',
      '-metadata:s:a:0', 'handler_name=Quiet Signals + click/wait/keyboard guidance',
      '-movflags', '+faststart', staged]);
    const checked = verifyMedia(staged, true);
    console.log('Auditing all 916 UI frames, final AAC sync and original framing…');
    const checks = await continuousChecks(staged, ledger, keyboardLedger, mix);
    assert(JSON.stringify(subtitles) === JSON.stringify(await subtitleHashes()), 'Subtitles changed during rendering');
    const updated = {
      ...guidedOriginal, variant: 'guided-continuous-keyboard', videoSha256: await fileHash(staged), bytes: (await stat(staged)).size,
      audio: true, backups: backupMetadata(),
      silentBackup: { ...original.silentBackup, restoreCommand: `${command} --restore=silent`, verifyCommand: `${command} --verify` },
      editing: 'Original montage, cards, native UI size, scene timing and 1066-frame duration preserved. New opaque pointer/focus/click/wait overlays rendered ONLY over clean music-original picture, then H.264 re-encoded. No old intermittent cursor is composited. Original guided audio is decoded once at unity gain and receives one observed-input keyboard layer.',
      soundtrack: { ...guidedOriginal.soundtrack, applied: true,
        role: 'Quiet Signals and existing editorial click/wait cues plus soft keyboard cues; not recorded app audio or narration.',
        regenerateCommand: command, originalMusicGenerator: original.soundtrack.generator,
        generator: 'scripts/media/guide-transcriber-demo.mjs', generatorSha256: await fileHash(fileURLToPath(import.meta.url)),
        mastering: { ...guidedOriginal.soundtrack.mastering, method: mix.details.method },
        measured: checked.measured, keyboardMix: mix.details,
      },
      videoPreservation: {
        byteIdentical: false, source: `public/media/${backups.music.file}`, sourceSha256: backups.music.sha256,
        method: 'Overlay one opaque shared Finance pointer and inspected annotations on the cursor-free music-original picture. Re-encode H.264 without trimming, retiming, cropping or frame-rate conversion. Audio input is independently the approved guided mix plus one keyboard layer.',
        exactContainerDurationSeconds: duration, resolution: '1920x1080', fps: '25/1', frames,
        checks: 'All 1066 decoded frames and exact presentation timing checked; all 916 source UI frames have zero shared glyphs, final UI frames exactly one. Outside-UI fidelity measured for every frame; no byte/pixel identity claim.',
        montageFraming: checks.montageFraming,
      },
      guidance: {
        ...guidedOriginal.guidance, regenerateCommand: command, policy: trajectoryPolicy,
        generatorSha256: await fileHash(fileURLToPath(import.meta.url)), helperSha256: await helperHashes(),
        alignment: { ...ledger.alignment, precision: trajectoryPolicy },
        historicalLedgerNote: 'The pinned action ledger describes the old intermittent-pointer edition. Its no-travel/pointer-stop statements are historical, not the current continuous track. Click/input/wait timings and inspected targets are retained.',
        continuousPointer: overlays, validation: checks,
        subtitleSha256: subtitles, decodedFrameMd5Sha256: checked.decodedFrameMd5Sha256,
        presentationTimingSha256: checked.presentationTimingSha256,
      },
      keyboard: {
        applied: true, policy: 'Editorial keyboard audio only for the 49 observed text-growth frames/52 visible characters. The keyboard ledger describes the prior audio-only edition; its picture-copy/no-new-cursor claim does not describe this continuous visual edition.',
        source: `public/media/${backups.guided.file}`,
        sourceSha256: backups.guided.sha256, ledger: 'scripts/media/transcriber-demo-keyboard-events.json',
        ledgerSha256: await fileHash(keyboardLedgerFile), alignment: keyboardLedger.alignment,
        generator: 'scripts/media/transcriber-keyboard-audio.mjs',
        generatorSha256: await fileHash(join(root, 'scripts/media/transcriber-keyboard-audio.mjs')),
        regenerateCommand: command, restoreCommand: `${command} --restore=guided`,
        mix: mix.details, syncValidation: checks.audioSync, auditoryListeningReview: false,
        tools: { node: process.version, ffmpeg: run('ffmpeg', ['-version']).stdout.split('\n')[0],
          platform: `${process.platform}/${process.arch}` },
      },
    };
    delete updated.guidance.continuousPointer.directory;
    await publish(staged, updated);
    await writeValidation(updated, checked, checks);
    console.log(JSON.stringify({ videoSha256: updated.videoSha256, bytes: updated.bytes,
      keyboardAttacks: mix.details.keyboardAttackCount, visibleCharacters: mix.details.visibleCharacterCount,
      cursorCoveredFrames: checks.pointer.cursorCoveredFrames, missingFrames: checks.pointer.missingFrames,
      multipleCursorFrames: checks.pointer.multipleCursorFrames, ...checked }, null, 2));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
await main();
