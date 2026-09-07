import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const pointerGlyph = {
  width: 30, height: 38,
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38"><path d="M3 3 L3 27 L9 21 L15 34 L21 31 L15 19 L25 19 Z" fill="#e1fff0" stroke="#08271a" stroke-width="2.4" stroke-linejoin="round"/></svg>',
};

export function verifyFinancePointer({ fps, totalFrames, bounds, uiRanges, frames, events, keyCues, maxStep = 120 }) {
  assert.ok(Number.isInteger(totalFrames) && totalFrames > 0);
  const expected = new Set();
  for (const range of uiRanges) {
    assert.ok(Number.isInteger(range.from) && Number.isInteger(range.to));
    assert.ok(range.from >= 0 && range.to <= totalFrames && range.from < range.to);
    for (let frame = range.from; frame < range.to; frame++) {
      assert.ok(!expected.has(frame), 'Overlapping UI frame ranges');
      expected.add(frame);
    }
  }
  const byId = new Map(events.map(event => [event.id, event]));
  assert.equal(byId.size, events.length, 'Event IDs must be unique');
  const covered = new Set();
  let applicationFrames = 0, editorialFrames = 0, largestStep = 0, previous;
  for (const frame of frames) {
    assert.ok(expected.has(frame.index), 'Pointer entry is outside application-footage ranges');
    assert.ok(!covered.has(frame.index), 'Repeated output-frame entry');
    assert.ok(Number.isFinite(frame.x) && Number.isFinite(frame.y));
    assert.ok(frame.x >= bounds.left && frame.x <= bounds.right
      && frame.y >= bounds.top && frame.y <= bounds.bottom, 'Pointer coordinates out of bounds');
    assert.equal(frame.renderedInstances, 1, 'Expected one rendered pointer, not a doubled baked cursor');
    assert.equal(frame.decodedMatches, 1, 'Expected exactly one decoded pointer glyph in this UI frame');
    assert.equal(frame.decodedVisible, true, 'Pointer missing from decoded UI frame');
    assert.equal(frame.sourcePointerInstances, 0, 'Clean browser capture must not contain a baked pointer');
    const event = byId.get(frame.eventId);
    assert.ok(event?.kind === 'pointermove' && event.trusted === true, 'Pointer position needs an actual browser event');
    assert.ok(event.at <= frame.index / fps + 1 / fps, 'A future event cannot invent the present trajectory');
    assert.ok(event.source === frame.source && ['application', 'editorial'].includes(frame.source));
    assert.equal(frame.x, event.outputX); assert.equal(frame.y, event.outputY);
    if (previous && previous.index + 1 === frame.index) {
      const step = Math.hypot(frame.x - previous.x, frame.y - previous.y);
      largestStep = Math.max(largestStep, step);
      assert.ok(step <= maxStep, 'Discontinuous pointer jump between adjacent UI frames');
    }
    if (frame.source === 'application') applicationFrames++; else editorialFrames++;
    covered.add(frame.index); previous = frame;
  }
  assert.equal(covered.size, expected.size, 'Missing application-footage pointer frames');
  for (const index of expected) assert.ok(covered.has(index), `Missing pointer at output frame ${index}`);
  for (const cue of keyCues) {
    const event = byId.get(cue.eventId);
    assert.ok(event?.kind === 'keydown' && event.trusted === true);
    assert.equal(event.visibleEditable, true, 'Typing sound needs a visible editable control');
    assert.equal(event.observedInput, true, 'Typing sound needs an observed input change');
    assert.equal(event.programmaticFill, false, 'Programmatic fill/clear cannot receive typing sounds');
    assert.ok(Math.abs(cue.at - event.at) <= 1 / (2 * fps) + 1e-6, 'Typing sound is not aligned to its real keypress');
  }
  return { cursorCoveredFrames: covered.size, totalUiFrames: expected.size, missingFrames: 0,
    applicationTrajectoryFrames: applicationFrames, editorialTrajectoryFrames: editorialFrames,
    singlePointerEveryUiFrame: true, sourceBakedPointerFrames: 0, outOfBoundsFrames: 0,
    maximumAdjacentFrameStepPixels: Number(largestStep.toFixed(3)), verifiedTypingCues: keyCues.length,
    method: 'Every UI output frame, not only click frames: decoded glyph visibility/uniqueness, clean-source pointer count, bounds, actual-event coordinates, continuity and genuine visible key-input correspondence.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--self-test', 'Usage: node scripts/media/finance-demo-v2-pointer.mjs --self-test');
  const input = {
    fps: 25, totalFrames: 12, bounds: { left: 0, right: 1920, top: 0, bottom: 1080 },
    uiRanges: [{ from: 2, to: 10 }],
    events: [
      { id: 'move', kind: 'pointermove', trusted: true, at: .04, source: 'application', outputX: 500, outputY: 300 },
      { id: 'key', kind: 'keydown', trusted: true, at: .2, visibleEditable: true, observedInput: true, programmaticFill: false },
    ],
    frames: Array.from({ length: 8 }, (_, index) => ({ index: index + 2, x: 500, y: 300,
      renderedInstances: 1, decodedMatches: 1, decodedVisible: true, sourcePointerInstances: 0,
      eventId: 'move', source: 'application' })),
    keyCues: [{ eventId: 'key', at: .2 }],
  };
  assert.equal(verifyFinancePointer(input).cursorCoveredFrames, 8);
  const reject = edit => { const bad = structuredClone(input); edit(bad); assert.throws(() => verifyFinancePointer(bad)); };
  reject(bad => bad.frames.splice(3, 1));
  reject(bad => { bad.frames[3].decodedVisible = false; });
  reject(bad => { bad.frames[3].decodedMatches = 2; });
  reject(bad => { bad.frames[3].sourcePointerInstances = 1; });
  reject(bad => { bad.frames[3].x = -1; });
  reject(bad => { bad.events[1].programmaticFill = true; });
  reject(bad => { bad.events[1].observedInput = false; });
  reject(bad => { bad.events[1].visibleEditable = false; });
  reject(bad => { bad.keyCues[0].at = .4; });
  reject(bad => {
    bad.events.push({ ...bad.events[0], id: 'jump', outputX: 1800 });
    bad.frames[4] = { ...bad.frames[4], x: 1800, eventId: 'jump' };
  });
  console.log('Pointer contract: valid full-frame fixture passed; 10 missing/double/baked/out-of-bounds/jump/fake-typing regressions rejected.');
}
