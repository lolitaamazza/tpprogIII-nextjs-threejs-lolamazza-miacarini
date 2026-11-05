// El final sin elección: la transmisión pirata cierra con la voz de la familia de quien fue a la arena.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { familyBroadcast, STORY_DAYS, PROTAGONISTS } from '../lib/story.js';

test('cada familia tiene su mensaje en la transmisión, claro y sin dos puntos', () => {
  for (const d of STORY_DAYS) {
    const b = familyBroadcast(d);
    assert.ok(b.who && b.line, d);
    assert.ok(!b.line.includes(':') && !b.line.includes(' · '), b.line);
    assert.ok(b.line.includes(PROTAGONISTS[d].name), b.line);
  }
  assert.equal(familyBroadcast('12').who, 'Tomi');
});

test('sin protagonista en la arena no hay mensaje de familia', () => {
  assert.equal(familyBroadcast(null), null);
});
