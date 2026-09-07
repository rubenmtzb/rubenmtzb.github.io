import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const media = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/media');
export const financeOriginal = [
  ['.mp4', '81e7eb781d7a82d478b217f3935e462285f2eefeaf3c0e30715ae0227e4fc9c0'],
  ['.json', '8a53dd249b3052bc810b8ae69157e28737d30bc8dc3ef61d3c1307da8c995b2d'],
  ['.en.vtt', 'de722df1110adc37b23d4a7817165113012e45da2dc8e252eff00ab9858262cb'],
  ['.es.vtt', 'ba0a92210389203425c29a7adafcf42a9a1b9e84f9e9911333451da8be299f09'],
  ['-poster.jpg', 'fed14d6c57223957d41ecc8648ccdcb18778e0fc4040cdb45642da4013813c78'],
  ['-validation.json', 'c9d38c7ca10da54c96e7d782d26334800bfd4709031521fc3c382b36c420f664'],
];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function verifyFinanceOriginal() {
  for (const [suffix, expected] of financeOriginal) {
    const file = join(media, `finance-core-demo-original${suffix}`);
    if (sha(await readFile(file)) !== expected) throw Error(`Immutable Finance original differs: ${suffix}`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--verify')) {
    throw Error('Usage: node scripts/media/preserve-finance-demo.mjs [--verify]');
  }
  if (!process.argv[2]) {
    for (const [suffix, expected] of financeOriginal) {
      const source = join(media, `finance-core-demo${suffix}`);
      const destination = join(media, `finance-core-demo-original${suffix}`);
      try {
        if (sha(await readFile(destination)) !== expected) throw Error('Existing original backup does not match pinned approval');
        continue;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (sha(await readFile(source)) !== expected) throw Error(`Current Finance artifact is no longer the approved original: ${suffix}`);
      await copyFile(source, destination, constants.COPYFILE_EXCL);
    }
  }
  await verifyFinanceOriginal();
  console.log('All six approved Finance original artifacts are byte-identical and pinned. No original was overwritten.');
}
