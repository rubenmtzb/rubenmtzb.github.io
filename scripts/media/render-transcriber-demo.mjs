import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [recording, screenshot, playwrightModule] = process.argv.slice(2);
if (!recording || !screenshot || !playwrightModule) {
  throw new Error('Usage: node scripts/media/render-transcriber-demo.mjs recording.webm screenshot.png /path/to/playwright/index.mjs');
}
const { chromium } = await import(pathToFileURL(resolve(playwrightModule)).href);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = join(root, 'public/media');
for (const approved of ['transcriber-demo-silent.mp4', 'transcriber-demo-music-original.mp4']) {
  try {
    await access(join(output, approved));
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  throw new Error('Approved montage is locked. Use guide-transcriber-demo.mjs for authorized overlays, or its --restore=music/--restore=silent commands. Do not regenerate the original montage or subtitles.');
}
const work = await mkdtemp(join(root, '.transcriber-film-'));
await mkdir(output, { recursive: true });
const still = `data:image/png;base64,${(await readFile(screenshot)).toString('base64')}`;
const scenes = [
  { start: 3, end: 10, title: 'Todo empieza<br>con un enlace.', en: 'One link. A new way to read.', body: 'Pega una URL de YouTube<br>y elige el idioma de destino.', label: 'URL + IDIOMA', caption: 'Paste a YouTube URL and select a target language.' },
  { start: 10, end: 16, title: 'El proceso,<br>a la vista.', en: 'Progress you can follow.', body: 'La interfaz muestra las etapas<br>mientras trabaja la API.', label: 'PROGRESO EN DIRECTO', caption: 'Follow processing stages while the API works. Timings vary by video and provider.' },
  { start: 16, end: 21, title: 'Del v&iacute;deo<br>al texto.', en: 'From watching to reading.', body: 'Consulta los subt&iacute;tulos<br>y su traducci&oacute;n con tiempos.', label: 'TEXTO + TRADUCCI&Oacute;N', caption: 'Read timestamped captions and their translation.' },
  { start: 21, end: 28, title: 'Dos idiomas.<br>Una lectura.', en: 'Compare. Search. Understand.', body: 'Contrasta ambas versiones<br>y encuentra una frase.', label: 'VISTA DUAL + B&Uacute;SQUEDA', caption: 'Compare source and translation in dual view, then search within the text.' },
  { start: 28, end: 32, title: 'Ve al momento<br>que importa.', en: 'Navigate the transcript.', body: 'Salta desde una l&iacute;nea<br>y activa el modo lectura.', label: 'NAVEGACI&Oacute;N', caption: 'Jump to a timestamp and switch to reading mode.' },
  { start: 32, end: 36.5, title: 'Ll&eacute;vate<br>el resultado.', en: 'Your workflow, your format.', body: 'Exporta en TXT, SRT,<br>VTT o Markdown.', label: 'EXPORTACIONES', caption: 'Download the result as TXT, SRT, VTT or Markdown.' },
  { start: 36.5, end: 39.6, title: 'Vuelve.<br>Sin repetir.', en: 'Reopen from local history.', body: 'Recupera el resultado<br>desde este navegador.', label: 'HISTORIAL LOCAL', caption: 'Reopen a previous result from this browser without a new transcription.' },
];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}

function layout(content) {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;overflow:hidden;
    background:radial-gradient(ellipse at 75% 30%,#25133f 0,transparent 58%),#080a10;
    color:#f4f1fa;font-family:Arial,sans-serif}body:before{content:"";position:absolute;inset:0;
    background:linear-gradient(110deg,transparent 60%,#a45cfb09);pointer-events:none}
    .brand{position:absolute;left:72px;top:56px;font-size:26px;font-weight:700;letter-spacing:-.7px}
    .brand b{color:#bd8cff}.credit{position:absolute;right:72px;top:62px;font-size:19px;letter-spacing:2px;color:#a29aac}
    .rail{position:absolute;left:72px;top:221px;width:470px}.n{font-size:96px;letter-spacing:-8px;font-weight:700;color:#bd8cff}
    .label{font-size:15px;color:#bda5dc;letter-spacing:2px;margin:24px 0}
    h1{font-size:56px;line-height:1.08;letter-spacing:-2.5px;margin:0 0 25px;font-weight:700}
    .en{font-size:21px;color:#bc93f0;margin:0 0 37px}.body{font-size:23px;line-height:1.6;color:#aaa7b8}
    .frame{position:absolute;left:568px;top:150px;width:1280px;height:762px;border-radius:16px;
    border:1px solid #564168;background:#080910;box-shadow:0 28px 100px #0009;overflow:hidden}
    .chrome{height:41px;border-bottom:1px solid #30243d;background:#17111f;display:flex;align-items:center;padding:0 18px;
    gap:8px;color:#a99ab9;font-size:14px}.dot{width:8px;height:8px;border-radius:50%;background:#664980}.address{margin-left:25px}
    .screen{width:1280px;height:720px;object-fit:cover;object-position:top}
    .footer{position:absolute;left:72px;bottom:62px;color:#888596;font-size:17px;letter-spacing:.4px}
    .site{position:absolute;right:72px;bottom:62px;color:#d2bee9;font-size:19px}
    .bar{position:absolute;left:72px;bottom:112px;height:3px;background:#bd8cff}
    .tag{display:inline-block;background:#b875ff19;border:1px solid #8854b9;border-radius:30px;
    padding:11px 18px;font-size:16px;letter-spacing:1px;color:#d9b8ff;margin-bottom:34px}
    .hero{position:absolute;left:100px;top:238px;width:840px}.hero h1{font-size:88px;letter-spacing:-4px;line-height:1.03}
    .hero .en{font-size:26px}.hero .body{font-size:25px}.preview{position:absolute;left:1060px;top:234px;
    width:790px;height:494px;object-fit:cover;object-position:top;border:1px solid #6a448a;border-radius:18px;
    box-shadow:0 25px 120px #8d3be322}.chips{position:absolute;left:1060px;top:771px;font-size:18px;color:#b4a0cf;letter-spacing:2px}
  </style><div class="brand"><b>YT</b> Transcriber</div><div class="credit">RUB&Eacute;N MART&Iacute;NEZ &nbsp; / &nbsp; SOFTWARE ENGINEERING</div>
  ${content}<div class="footer">Captura real &middot; Edici&oacute;n narrativa &middot; Sin audio</div>
  <div class="site">yt.rubenitx.me</div></html>`;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const image = async (name, html) => {
    await page.setContent(layout(html));
    await page.screenshot({ path: join(work, `${name}.png`) });
  };
  const hero = (outro = false) => `<div class="hero"><div class="tag">${outro ? 'EXPLORA EL PROYECTO' : 'PRODUCT WALKTHROUGH'}</div>
    <h1>${outro ? 'Del enlace<br>a tu siguiente<br>idea.' : 'Menos buscar.<br>M&aacute;s<br>comprender.'}</h1>
    <p class="en">${outro ? 'Built to make video easier to use.' : 'Video. Text. Translation. In sync.'}</p>
    <p class="body">${outro ? 'Prueba la demo y descubre las decisiones<br>t&eacute;cnicas en el caso de estudio.' : 'Transcripci&oacute;n, vista dual y exportaciones.<br>Un recorrido por la aplicaci&oacute;n real.'}</p></div>
    <img class="preview" src="${still}" alt=""><div class="chips">YT-DLP &nbsp; / &nbsp; WHISPER &nbsp; / &nbsp; DEEPL</div>`;
  await image('intro', hero());
  await image('outro', hero(true));
  for (const [index, scene] of scenes.entries()) {
    await image(`scene-${index}`, `<div class="rail"><div class="n">0${index + 1}</div>
      <p class="label">${scene.label}</p><h1>${scene.title}</h1><p class="en">${scene.en}</p><p class="body">${scene.body}</p></div>
      <div class="frame"><div class="chrome"><i class="dot"></i><i class="dot"></i><i class="dot"></i>
      <span class="address">https://yt.rubenitx.me</span></div></div>
      <div class="bar" style="width:${(index + 1) / scenes.length * 1776}px"></div>`);
  }
  await browser.close();
  const encode = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '25', '-threads', '2'];
  const parts = [];
  for (const name of ['intro', ...scenes.map((_, i) => `scene-${i}`), 'outro']) {
    const part = join(work, `${name}.mp4`);
    const scene = name.startsWith('scene-') ? scenes[Number(name.slice(6))] : null;
    const duration = scene ? scene.end - scene.start : 3;
    const inputs = ['-loop', '1', '-framerate', '25', '-i', join(work, `${name}.png`)];
    if (scene) inputs.push('-ss', String(scene.start), '-t', String(duration), '-i', resolve(recording));
    const filter = scene
      ? '[1:v]crop=1280:720:0:0,setpts=PTS-STARTPTS[screen];[0:v][screen]overlay=568:191:shortest=1,setsar=1[v]'
      : `[0:v]fade=t=${name === 'intro' ? 'in:st=0:d=0.35' : 'out:st=2.6:d=0.4'},setsar=1[v]`;
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex_threads', '1',
      '-filter_complex', filter, '-map', '[v]', '-t', String(duration), ...encode, part]);
    parts.push(part);
  }
  await writeFile(join(work, 'concat.txt'), parts.map((p) => `file '${p}'`).join('\n'));
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
    '-i', join(work, 'concat.txt'), '-c', 'copy', '-movflags', '+faststart', join(output, 'transcriber-demo.mp4')]);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(work, 'intro.png'),
    '-frames:v', '1', '-q:v', '2', join(output, 'transcriber-demo-poster.jpg')]);
  const formatTime = (seconds) => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
  let cursor = 3;
  const captions = scenes.map((scene) => {
    const start = cursor;
    cursor += scene.end - scene.start;
    return `${formatTime(start)} --> ${formatTime(cursor)}\n${scene.caption}`;
  });
  await writeFile(join(output, 'transcriber-demo.en.vtt'), `WEBVTT\n\n00:00:00.000 --> 00:00:03.000\nReal application walkthrough. Edited recording, no audio.\n\n${captions.join('\n\n')}\n\n${formatTime(cursor)} --> ${formatTime(cursor + 3)}\nExplore the demo and the technical case study. yt.rubenitx.me\n`);
  const sourceBytes = await readFile(recording);
  const video = await readFile(join(output, 'transcriber-demo.mp4'));
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json',
    join(output, 'transcriber-demo.mp4')], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(`ffprobe failed: ${probe.stderr}`);
  const durationSeconds = Number(JSON.parse(probe.stdout).format.duration);
  await writeFile(join(output, 'transcriber-demo.json'), JSON.stringify({
    source: 'Real browser recording of https://yt.rubenitx.me, 2026-09-06. No mocked API responses.',
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    videoSha256: createHash('sha256').update(video).digest('hex'),
    sourceResolution: '1280x800', outputResolution: '1920x1080', fps: 25,
    durationSeconds, bytes: video.length, audio: false,
    editing: 'Title cards, browser framing, chronological cuts and bilingual on-screen labels. No speed changes within clips. Not a latency benchmark.',
    scenes: scenes.map(({ start, end, caption }) => ({ sourceStart: start, sourceEnd: end, description: caption })),
  }, null, 2) + '\n');
  console.log(`Created ${video.length} byte video (${durationSeconds}s), poster, English captions and provenance.`);
} finally {
  if (browser.isConnected()) await browser.close();
  await rm(work, { recursive: true, force: true });
}
