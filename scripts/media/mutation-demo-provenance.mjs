import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';

export async function publishMutationProvenance(full, work, output) {
  if (!Array.isArray(full.events) || !Array.isArray(full.audio?.cues))
    throw Error('Complete private event and audio evidence is required');
  const privateBytes = json(full);
  await writeFile(join(work, 'mutation-provenance-private.json'), privateBytes);
  const { events, audio, requests, verifiedFunctions, observedPageErrors, ...summary } = full;
  const requestCounts = new Map();
  for (const request of requests) {
    const key = JSON.stringify(request);
    const record = requestCounts.get(key) || { ...request, count: 0 };
    record.count++;
    requestCounts.set(key, record);
  }
  const publicMetadata = {
    ...summary,
    eventSummary: {
      total: events.length,
      byKind: events.reduce((counts, event) => {
        counts[event.kind] = (counts[event.kind] || 0) + 1;
        return counts;
      }, {}),
      privateLedgerSha256: hash(JSON.stringify(events)),
    },
    requests: [...requestCounts.values()],
    verifiedFunctions: [...new Map(verifiedFunctions.map(check => [JSON.stringify(check), check])).values()],
    audio: {
      composition: audio.composition, keyboard: audio.keyboard, sampleRateHz: audio.sampleRateHz,
      keyboardCues: audio.cues.filter(cue => cue.kind === 'physical-key-sample').length,
      clickCues: audio.cues.filter(cue => cue.kind === 'soft-click').length,
      privateCueLedgerSha256: hash(JSON.stringify(audio.cues)),
    },
    observedPageErrors: [...new Set(observedPageErrors)].map(message => ({
      message, count: observedPageErrors.filter(error => error === message).length,
    })),
    privateEvidence: {
      provenanceSha256: hash(privateBytes),
      policy: 'Full input/scroll trajectories, event coordinates, per-cue timing and raw source frames stay private. Public metadata contains summaries and cryptographic evidence references only.',
    },
  };
  await writeFile(join(output, 'mutation-portal-demo.json'), json(publicMetadata));
  return publicMetadata;
}
