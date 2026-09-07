import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [directory, modulePath] = process.argv.slice(2);
if (!directory || !modulePath) throw Error('Usage: node scripts/media/inspect-mutation-demo.mjs PRIVATE_WORKDIR PLAYWRIGHT_MODULE');
const work = resolve(directory);
if (/(^|\/)(public|tmp)(\/|$)/.test(work)) throw Error('Private project-local work directory required');
await mkdir(work, { recursive: true, mode: 0o700 });
const { chromium } = await import(pathToFileURL(resolve(modulePath)));
const browser = await chromium.launch({ headless: true, args: ['--disable-features=UseExternalPopupMenu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 800 }, acceptDownloads: true });
const evidence = { inspectedAt: new Date().toISOString(), requests: [], errors: [], checks: [] };
page.on('response', r => evidence.requests.push({ method: r.request().method(), url: r.url(), status: r.status() }));
page.on('requestfailed', r => evidence.requests.push({ method: r.method(), url: r.url(), error: r.failure()?.errorText }));
page.on('pageerror', e => evidence.errors.push(e.message));
page.on('dialog', async d => { evidence.checks.push({ dialog: d.message() }); await d.accept(); });
const checkpoint = async name => {
  await page.screenshot({ path: join(work, `inspection-${name}.png`), fullPage: true });
  await writeFile(join(work, `inspection-${name}.txt`), await page.locator('body').innerText());
};
try {
  await page.goto('http://sarscov2-mutation-portal.urv.cat/', { waitUntil: 'networkidle', timeout: 30000 });
  await checkpoint('home');
  evidence.checks.push({ home: 'loaded', statistics: await page.locator('table').innerText() });
  await page.getByRole('link', { name: 'Genes', exact: true }).click();
  await page.locator('input[type=search]').waitFor();
  await page.locator('input[type=search]').pressSequentially('spike', { delay: 150 });
  await checkpoint('genes');
  evidence.checks.push({ geneSearch: 'spike', status: await page.locator('.dataTables_info').innerText() });
  await page.getByRole('link', { name: 'Mutations', exact: true }).click();
  await page.locator('select[name=xgene]').waitFor();
  await page.locator('select[name=xgene]').click();
  await page.screenshot({ path: join(work, 'inspection-native-select.png') });
  await page.keyboard.press('Escape');
  await page.locator('select[name=xgene]').selectOption({ label: 'spike' });
  await page.locator('select[name=xcountries]').selectOption({ label: 'Spain' });
  await page.locator('select[name=xrange]').selectOption('>');
  await page.locator('[name=xnumber]').pressSequentially('50', { delay: 180 });
  await page.getByRole('button', { name: 'search', exact: true }).click();
  await page.locator('#tabla').waitFor({ timeout: 30000 });
  await checkpoint('query');
  const rows = await page.locator('#tabla tbody tr').count();
  evidence.checks.push({ query: { gene: 'spike', countries: 'Spain', percentageGreaterThan: 50 },
    rows, table: await page.locator('#tabla').innerText(),
    filterControls: await page.locator('select').evaluateAll(es => es.map(e => ({ name: e.name, selected: e.value }))),
    detailLinks: await page.locator('#tabla a').count() });
  if (rows > 30) throw Error('Query larger than modest demonstration limit');
  await page.getByRole('button', { name: 'Scatter Plot', exact: true }).click();
  await page.locator('.highcharts-point').first().waitFor();
  await page.locator('figure').scrollIntoViewIfNeeded();
  await page.locator('.highcharts-point').first().hover();
  await checkpoint('plot');
  evidence.checks.push({ scatter: 'rendered', points: await page.locator('.highcharts-point').count(),
    tooltip: await page.locator('.highcharts-tooltip').textContent() });
  const exportUrl = await page.getByRole('link', { name: 'Download excel', exact: true }).getAttribute('href');
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.getByRole('link', { name: 'Download excel', exact: true }).click().catch(() => {});
  const download = await downloadPromise;
  if (download) {
    await download.saveAs(join(work, 'inspection-filtered-export.xls'));
    evidence.checks.push({ export: { filename: download.suggestedFilename(), url: download.url(), failure: await download.failure() } });
  } else {
    evidence.checks.push({ export: { url: exportUrl, completed: false,
      diagnostic: evidence.requests.filter(r => r.url.includes('/export.php')) } });
    await checkpoint('export-unavailable');
  }
  evidence.limits = ['Read-only ordinary UI only; no scans or security tests.',
    'Homepage dataset date is a displayed snapshot, not proof of current data.',
    'No separate lineage filter or row detail link found; lineage count is a table column.',
    'Only one bounded search and its small filtered export exercised by this script.'];
} finally {
  await writeFile(join(work, 'inspection.json'), JSON.stringify(evidence, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(evidence.checks));
