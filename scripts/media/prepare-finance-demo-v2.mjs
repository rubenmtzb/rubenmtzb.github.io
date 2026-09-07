import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { financeV2 } from './finance-demo-v2-story.mjs';
import { synthFinanceV2 } from './synth-finance-demo-v2.mjs';
import { verifyFinanceOriginal } from './preserve-finance-demo.mjs';

const [directory, playwright, contextScreenshot] = process.argv.slice(2);
if (!directory || !playwright) throw Error('Usage: node scripts/media/prepare-finance-demo-v2.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE');
const work = resolve(directory);
if (work.includes('/public/') || /(^|\/)tmp(\/|$)/.test(work)) throw Error('Preparation artifacts must remain private');
await verifyFinanceOriginal();
await mkdir(work, { recursive: true, mode: 0o700 });
const { chromium } = await import(pathToFileURL(resolve(playwright)).href);
const browser = await chromium.launch({ headless: true, args: ['--disable-background-networking'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
  await page.route('**/*', route => route.abort());
  const template = content => `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;color-scheme:dark;background:#050e12;color:#dcece4;font-family:Arial,sans-serif}
  body{background:radial-gradient(ellipse at 80% 18%,#15392e 0,transparent 47%),#050e12}
  header{position:absolute;left:96px;top:45px;font-size:27px;font-weight:bold}header b{color:#65dfae}
  .kicker{font-size:17px;letter-spacing:3px;color:#97c1ac}.hero{position:absolute;left:130px;top:230px;right:130px}
  h1{font-size:96px;letter-spacing:-4px;line-height:1.08;margin:35px 0;color:#dcece4}h1 em{font-style:normal;color:#70e5b6}
  p{font-size:29px;line-height:1.5;color:#b0c8ba}.pill{display:inline-block;border:1px solid #497b61;border-radius:28px;padding:13px 25px;font-size:19px;color:#92dfb7;background:#163326}
  footer{position:absolute;left:96px;bottom:35px;font-size:18px;color:#a0bdaf}footer b{color:#73dfb3}
  .chooser{position:absolute;left:130px;right:130px;top:145px}.chooser h1{font-size:58px;margin:20px 0}
  .file{margin-top:36px;display:flex;align-items:center;gap:30px;width:100%;padding:35px 40px;border:2px solid #487d60;border-radius:20px;background:#10271e}
  .file-icon{width:90px;height:105px;border:2px solid #67d7a1;border-radius:12px;display:grid;place-items:center;color:#84e7b2;font-size:25px;font-weight:bold}
  .name{font-size:36px;color:#def5e6}.meta{font-size:22px;color:#9bb8a7;margin-top:12px}.note{font-size:23px;color:#bdd4c7;max-width:1280px}.notice{margin-top:38px;border-left:4px solid #d5b571;padding:15px 24px;color:#e1c992;font-size:21px;line-height:1.7}
  </style><header>FINANCE <b>CORE</b></header>${content}<footer><b>DEMO</b> · Datos sintéticos · Sin bancos conectados, precios en vivo ni IA externa</footer></html>`;
  await page.setContent(template(`<section class="hero"><div class="kicker">RECORRIDO REAL / DATOS SINTÉTICOS</div><h1>Tus finanzas.<br><em>Con todo su contexto.</em></h1><p>Del calendario mensual a cada decisión.<br>Un recorrido por la aplicación, sin salir del modo oscuro.</p><div class="pill">REAL APPLICATION · LOCAL DEMO</div></section>`));
  await page.screenshot({ path: join(work, 'intro-design.png') });
  const selection = financeV2.fileSelection;
  const screenshot = contextScreenshot
    ? `data:image/png;base64,${(await readFile(resolve(contextScreenshot))).toString('base64')}` : '';
  await page.setContent(template(`<style>
    .film-chapter{position:absolute;left:340px;top:48px;font-size:24px;color:#d3e9df}
    .film-label{position:absolute;right:96px;top:53px;font-size:15px;letter-spacing:2px;color:#8cac9f}
    .browser-frame{position:absolute;left:94px;top:92px;width:1732px;height:916px;overflow:hidden;border:2px solid #24483d;border-radius:12px;background:#080f18}
    .browser-context{display:block;width:1728px;height:912px;object-fit:fill}
    .file-tray{position:absolute;left:404px;top:445px;width:1120px;padding:27px 30px 23px;background:#10231c;border:2px solid #5c9b79;border-radius:16px;box-shadow:0 20px 50px #0009}
    .tray-heading{margin:0 0 22px;font-size:27px;letter-spacing:-.5px;color:#d5eadd;font-weight:600}
    .file-row{display:flex;align-items:center;gap:24px;width:100%;height:98px;padding:20px 24px;background:#0d1a16;border:2px solid #3f614f;border-radius:10px;color:#dceee2;text-align:left;cursor:pointer}
    .file-row.selected{background:#183c29;border-color:#7ce5af}
    .csv-mark{display:grid;place-items:center;width:54px;height:58px;border:1px solid #6da98b;border-radius:8px;font-size:16px;color:#9bdfb9}
    .file-name{font-size:28px;flex:1}.check{width:32px;height:32px;border:2px solid #719b83;border-radius:50%;color:transparent;text-align:center;font-size:24px;line-height:28px}
    .selected .check{color:#062115;background:#8fe5b5;border-color:#8fe5b5}
    .tray-footer{margin-top:20px;font-size:19px;color:#a8c1b2}
    </style><div class="film-chapter">04 / Elegir el origen de los datos</div><div class="film-label">CSV SINTÉTICO LOCAL</div>
    <div class="browser-frame">${screenshot ? `<img class="browser-context" src="${screenshot}" alt="">` : ''}</div>
    <section class="file-tray"><h2 class="tray-heading">${selection.headline}</h2>
    <button class="file-row" type="button" onclick="this.classList.add('selected');this.setAttribute('aria-pressed','true')" aria-pressed="false"><span class="csv-mark">CSV</span><span class="file-name">${selection.filename}</span><span class="check">✓</span></button>
    <div class="tray-footer">${selection.disclosure}</div></section>`));
  await page.screenshot({ path: join(work, 'file-selection-design.png') });
  await page.getByRole('button', { name: /DEMO-extracto-generico/ }).click();
  await page.screenshot({ path: join(work, 'file-selection-selected-design.png') });
} finally { await browser.close(); }
const audio = await synthFinanceV2(join(work, 'plucked-score-preview.wav'));
await writeFile(join(work, 'redesign-plan.json'), JSON.stringify({ ...financeV2, audio,
  recordingGate: 'DO NOT RECORD THE APPLICATION UNTIL EXPLICIT PARENT GO.',
  capture: 'One initial authenticated page entry, then actual SPA clicks. Continuous browser capture; chapter labels change without resetting application state.',
  fileSelectionPolicy: 'Before real file input submission, explicitly labelled editorial selection insert; only the synthetic file is shown. Never claim native picker footage or fabricate an app feature.',
}, null, 2) + '\n');
console.log(`Prepared ${financeV2.seconds}s storyboard, original rhythmic plucked score and clearly labelled editorial file-selection design. No application recording.`);
