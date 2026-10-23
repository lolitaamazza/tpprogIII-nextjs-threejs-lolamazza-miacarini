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

test('el 11 y el 4 tienen todo en public/ (piezas, cielo y texturas) y pesan 25 MB o menos', async () => {
  const { LOCATIONS } = await import('../lib/locations/index.js');
  for (const id of ['11', '4']) {
    const data = LOCATIONS[id];
    const textures = [data.ground, data.street].filter(Boolean).flatMap((g) => ['diff', 'nor_gl', 'arm'].map((m) => `${data.textures}${g.texture}_${m}_1k.jpg`));
    if (data.structures.some((s) => s.type === 'shed')) textures.push(`${data.textures}corrugated_iron_diff_1k.jpg`);
    for (const url of [data.sky.url, ...data.pieces.map((p) => p.url), ...textures]) assert.ok(existsSync(join(PUBLIC, decodeURI(url))), url);
    const dir = join(PUBLIC, `models/d${id}`);
    const total = readdirSync(dir).reduce((sum, name) => sum + statSync(join(dir, name)).size, 0);
    assert.ok(total / 1e6 <= BUDGET_MB, `${id}: ${(total / 1e6).toFixed(1)} MB`);
  }
});

test('el tren y la plaza tienen sus piezas en public/ y pesan 25 MB o menos cada uno', async () => {
  const { TRAIN } = await import('../lib/locations/train.js');
  const { plazaFor } = await import('../lib/locations/plaza.js');
  for (const data of [TRAIN, plazaFor('12')]) {
    for (const url of [data.sky.url, ...data.pieces.map((p) => p.url)]) assert.ok(existsSync(join(PUBLIC, decodeURI(url))), url);
  }
  for (const folder of ['tren', 'plaza']) {
    const dir = join(PUBLIC, `models/${folder}`);
    const total = readdirSync(dir).reduce((sum, name) => sum + statSync(join(dir, name)).size, 0);
    assert.ok(total / 1e6 <= BUDGET_MB, `${folder}: ${(total / 1e6).toFixed(1)} MB`);
  }
});
