import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISTRICT12 } from '../lib/locations/district12.js';

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));
const BUDGET_MB = 25;

test('cada pieza y el cielo del Distrito 12 están en public/', () => {
  for (const url of [DISTRICT12.sky.url, ...DISTRICT12.pieces.map((p) => p.url)]) {
    assert.ok(existsSync(join(PUBLIC, decodeURI(url))), url);
  }
});

test('la escena optimizada pesa 25 MB o menos', () => {
  const dir = join(PUBLIC, 'models/d12');
  const total = readdirSync(dir).reduce((sum, name) => sum + statSync(join(dir, name)).size, 0);
  assert.ok(total / 1e6 <= BUDGET_MB, `${(total / 1e6).toFixed(1)} MB`);
});
