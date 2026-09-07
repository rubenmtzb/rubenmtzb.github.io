import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { film, chapters } from './mutation-demo-story.mjs';

const [directory, modulePath, resume] = process.argv.slice(2);
if (!directory || !modulePath) throw Error('Usage: node scripts/media/capture-mutation-demo.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE');
const work = resolve(directory);
if (/(^|\/)(public|tmp)(\/|$)/.test(work)) throw Error('Private non-temporary work directory required');
const inspection = JSON.parse(await readFile(join(work, 'inspection.json'), 'utf8'));
if (!inspection.checks.some(c => c.query && c.rows === 4)) throw Error('Inspect and verify the bounded query before filming');
await mkdir(join(work, 'capture'), { recursive: true, mode: 0o700 });
const { chromium } = await import(pathToFileURL(resolve(modulePath)));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: film.source, colorScheme: 'light' });
const manifest = resume === '--resume'
  ? JSON.parse(await readFile(join(work, 'capture-manifest.json'), 'utf8'))
  : { schema: 1, capturedAt: new Date().toISOString(), clips: [], requests: [], errors: [], checks: [] };
const runId = Date.now();
let active = null;
await context.exposeBinding('__mutationEvent', (_source, event) => {
  if (!active) return;
  const record = { ...event, at: (event.epochMs - active.epochMs) / 1000 };
  if (event.kind === 'cursor-sample') active.cursorSamples.push(record);
  else active.events.push(record);
});
await context.addInitScript(() => {
  const send = (kind, data = {}) => {
    globalThis.__mutationEvent({ kind, epochMs: performance.timeOrigin + performance.now(), ...data }).catch(() => {});
  };
  let pointer;
  let xy = JSON.parse(sessionStorage.getItem('__mutationPointerXY') || '[0,0]');
  const mount = () => {
    if (pointer || !document.documentElement) return;
    pointer = document.createElement('div');
    pointer.setAttribute('aria-hidden', 'true');
    pointer.id = '__mutationDemoPointer';
    pointer.style.cssText = `position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:28px;height:36px;transform:translate(${xy[0]}px,${xy[1]}px);filter:drop-shadow(0 2px 2px #0008)`;
    pointer.innerHTML = '<svg width="28" height="36" viewBox="0 0 28 36"><path d="M2 2L3 28l7-7 6 12 5-3-6-11h10Z" fill="white" stroke="#10212a" stroke-width="2"/></svg>';
    document.documentElement.append(pointer);
  };
  const observer = new MutationObserver(() => { mount(); if (pointer) observer.disconnect(); });
  observer.observe(document, { childList: true, subtree: true });
  mount();
  addEventListener('pointermove', e => {
    xy = [e.clientX, e.clientY];
    sessionStorage.setItem('__mutationPointerXY', JSON.stringify(xy));
    if (pointer) pointer.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    send('pointermove', { xy });
  }, true);
  addEventListener('pointerdown', e => {
    const target = e.target;
    send('pointerdown', { xy: [e.clientX, e.clientY], target: target.name || target.id || target.innerText?.slice(0, 65) || target.tagName });
    const halo = document.createElement('div');
    halo.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border:3px solid #16c5e7;border-radius:50%;background:#6fe3ff20;pointer-events:none;z-index:2147483646;`;
    document.documentElement.append(halo);
    halo.animate([{ opacity: .85, transform: 'scale(.65)' }, { opacity: 0, transform: 'scale(1.4)' }], { duration: 420 });
    setTimeout(() => halo.remove(), 420);
  }, true);
  addEventListener('keydown', e => send('keydown', { key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey,
    target: e.target.name || e.target.id || e.target.tagName }), true);
  addEventListener('input', e => send('input', { target: e.target.name || e.target.id, value: e.target.value }), true);
  addEventListener('change', e => send('change', { target: e.target.name || e.target.id, value: e.target.value }), true);
  setInterval(() => {
    const style = pointer && getComputedStyle(pointer);
    send('cursor-sample', { xy, connected: Boolean(pointer?.isConnected),
      visible: Boolean(style && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0),
      viewport: [innerWidth, innerHeight] });
  }, 100);
});
const page = await context.newPage();
page.on('response', r => {
  if (r.request().resourceType() === 'document' || ['xhr', 'fetch'].includes(r.request().resourceType()))
    manifest.requests.push({ method: r.request().method(), url: r.url(), status: r.status(), epochMs: Date.now() });
});
page.on('requestfailed', r => manifest.errors.push({ url: r.url(), error: r.failure()?.errorText }));
page.on('pageerror', e => manifest.errors.push({ error: e.message }));
page.on('dialog', async d => {
  manifest.checks.push({ dialog: d.message(), acknowledged: true,
    presentation: 'Native browser instruction alert acknowledged off the page capture; no replacement dialog rendered.' });
  await d.accept();
});
const cdp = await context.newCDPSession(page);
const pending = [];
cdp.on('Page.screencastFrame', event => {
  cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  if (!active) return;
  const clip = active;
  const index = clip.frames.length;
  const file = `${clip.id}-${runId}-${String(index).padStart(5, '0')}.jpg`;
  const at = event.metadata.timestamp - clip.epochMs / 1000;
  clip.frames.push({ file, at, sourceTimestamp: event.metadata.timestamp });
  pending.push(writeFile(join(work, 'capture', file), Buffer.from(event.data, 'base64')));
});
const pause = seconds => new Promise(r => setTimeout(r, seconds * 1000));
const move = async locator => {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  if (!b) throw Error('No target bounds');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 22 });
  await pause(.18);
};
const click = async locator => { await move(locator); await page.mouse.down(); await pause(.09); await page.mouse.up(); };
const type = async text => { for (const character of text) { await page.keyboard.type(character); await pause(.19); } };
const choose = async (name, text, expected) => {
  const locator = page.locator(`select[name=${name}]`);
  await click(locator);
  await page.keyboard.press('Escape');
  await pause(.35);
  await page.keyboard.press('Home');
  await type(text);
  await page.keyboard.press('Tab');
  if (await locator.inputValue() !== expected) throw Error(`Native keyboard selection failed: ${name}`);
  await pause(.55);
};
const wheel = async (delta, steps = 14) => {
  for (let n = 0; n < steps; n++) { await page.mouse.wheel(0, delta / steps); await pause(.045); }
  await pause(.3);
};
async function record(id, action) {
  if (manifest.clips.some(c => c.id === id)) return;
  const chapter = chapters().find(s => s.id === id);
  active = { id, seconds: chapter.seconds, epochMs: Date.now(), events: [], frames: [], cursorSamples: [],
    initialPointer: await page.locator('#__mutationDemoPointer').evaluate(e => {
      const rect = e.getBoundingClientRect(); return [rect.x, rect.y];
    }) };
  const clip = active;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: film.source.width, maxHeight: film.source.height, everyNthFrame: 1 });
  await pause(.35);
  await action();
  const remaining = chapter.seconds - (Date.now() - clip.epochMs) / 1000;
  if (remaining < .2) throw Error(`Scene overrun ${id}: ${remaining}`);
  await pause(remaining);
  await cdp.send('Page.stopScreencast');
  active = null;
  manifest.clips.push(clip);
  await Promise.all(pending.splice(0));
  await page.screenshot({ path: join(work, `capture-${id}-end.png`) });
  await writeFile(join(work, 'capture-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
try {
  await page.goto('http://sarscov2-mutation-portal.urv.cat/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.mouse.move(1250, 650);
  await record('home', async () => {
    await pause(1.4);
    await click(page.getByRole('link', { name: 'Info', exact: true }));
    await pause(1.5);
    await wheel(550);
  });
  await page.getByRole('link', { name: 'Genes', exact: true }).click();
  await page.locator('input[type=search]').waitFor();
  await record('genes', async () => {
    await pause(1.1);
    await click(page.locator('input[type=search]'));
    await type('spike');
    await pause(2.1);
    await move(page.getByRole('gridcell', { name: 'spike', exact: true }));
    manifest.checks.push({ geneSearch: await page.locator('.dataTables_info').innerText() });
    await pause(1.2);
    await click(page.getByRole('columnheader').filter({ hasText: 'start' }));
  });
  await page.getByRole('link', { name: 'Mutations', exact: true }).click();
  await page.locator('select[name=xgene]').waitFor();
  if (manifest.clips.some(c => c.id === 'filters')) {
    await page.locator('select[name=xgene]').selectOption({ label: 'spike' });
    await page.locator('select[name=xcountries]').selectOption({ label: 'Spain' });
    await page.locator('select[name=xrange]').selectOption('>');
    await page.locator('[name=xnumber]').fill('50');
    await page.getByRole('button', { name: 'search', exact: true }).click();
    await page.locator('#tabla').waitFor();
    if (await page.locator('#tabla tbody tr').count() !== 4) throw Error('Resumed query differs');
    manifest.checks.push({ resume: 'Same bounded live query restored off-camera for remaining chapters.' });
  }
  await record('filters', async () => {
    await pause(.6);
    await choose('xgene', 's', 'spike');
    await choose('xcountries', 'sp', 'Spain');
    await choose('xrange', '>', '>');
    await click(page.locator('[name=xnumber]'));
    await type('50');
    await pause(.7);
    for (const [name, value] of [['xgene', 'spike'], ['xcountries', 'Spain'], ['xrange', '>'], ['xnumber', '50']])
      if (await page.locator(`[name=${name}]`).inputValue() !== value) throw Error(`Refusing unbounded query: ${name}`);
    await click(page.getByRole('button', { name: 'search', exact: true }));
    await page.locator('#tabla').waitFor({ timeout: 30000 });
    const rows = await page.locator('#tabla tbody tr').count();
    if (rows !== 4) throw Error(`Unexpected live result row count: ${rows}`);
    manifest.checks.push({ query: { gene: 'spike', country: 'Spain', percentageGreaterThan: 50 }, rows });
  });
  await page.locator('#tabla').scrollIntoViewIfNeeded();
  await wheel(150, 5);
  await record('results', async () => {
    await pause(.8);
    await click(page.locator('input[type=search]'));
    await type('D614G');
    await pause(4);
    manifest.checks.push({ tableSearch: 'D614G', rows: await page.locator('#tabla tbody tr').count() });
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await pause(2);
  });
  await page.getByRole('button', { name: 'Scatter Plot', exact: true }).scrollIntoViewIfNeeded();
  await record('scatter', async () => {
    await click(page.getByRole('button', { name: 'Scatter Plot', exact: true }));
    await page.locator('.highcharts-markers .highcharts-point').first().waitFor();
    await page.locator('figure').scrollIntoViewIfNeeded();
    await pause(.7);
    const points = page.locator('.highcharts-markers .highcharts-point');
    await move(points.nth(2));
    await pause(2.5);
    manifest.checks.push({ tooltip: await page.locator('.highcharts-tooltip').textContent() });
    const plot = await page.locator('.highcharts-plot-background').boundingBox();
    const x = plot.x + plot.width * .24;
    const y = plot.y + plot.height * .35;
    await page.mouse.move(x, y, { steps: 18 });
    await page.mouse.down();
    await page.mouse.move(plot.x + plot.width * .9, plot.y + plot.height * .93, { steps: 42 });
    await page.mouse.up();
    await pause(2.3);
    const reset = page.locator('.highcharts-reset-zoom');
    await reset.waitFor({ timeout: 2000 });
    manifest.checks.push({ zoom: 'Reset zoom control appeared following actual drag' });
    await click(reset);
    await pause(.8);
    await move(points.nth(2));
  });
  manifest.complete = true;
} finally {
  if (active) manifest.failedAttempt = { ...active, note: 'Incomplete take; never used by the renderer.' };
  await Promise.all(pending);
  await writeFile(join(work, 'capture-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify({ clips: manifest.clips.map(c => ({ id: c.id, frames: c.frames.length, events: c.events.length })), checks: manifest.checks }));
