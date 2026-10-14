import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIP, CLIP_HOST, CLIP_LOAD_TIMEOUT_MS, CLIP_REVEAL_WAIT_MS, AUDIO_START_GRACE_MS, TIMING, BRIGHT_MIN_GAP_MS,
  introPlan, clipEmbedSrc, clipDurationMs, nextBreakFrame,
} from '../lib/introTimeline.js';

test('el clip es el corte de señal del video oficial: 0:29 a 0:51', () => {
  assert.equal(CLIP.videoId, 'k4e-qJdEAXo');
  assert.equal(CLIP.start, 29);
  assert.equal(CLIP.end, 51);
  assert.equal(clipDurationMs(), 22_000 + 600, 'duración del fragmento más un margen de cierre');
});

test('la URL del clip usa youtube-nocookie y oculta la interfaz de YouTube', () => {
  const url = new URL(clipEmbedSrc('https://panem.example'));
  assert.equal(url.origin, CLIP_HOST);
  assert.equal(CLIP_HOST, 'https://www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/k4e-qJdEAXo');
  const params = Object.fromEntries(url.searchParams);
  assert.deepEqual(params, {
    enablejsapi: '1', controls: '0', disablekb: '1', fs: '0', iv_load_policy: '3', modestbranding: '1',
    rel: '0', playsinline: '1', start: '22', end: '51', origin: 'https://panem.example',
  });
});

test('el reproductor arranca 7 s antes del corte: cuando se muestra, YouTube ya ocultó su interfaz', () => {
  // YouTube deja su título y el botón de pausa a la vista unos 4 a 5 s después de empezar a reproducir.
  // El clip se pone en marcha en silencio y oculto, y se muestra recién al llegar al segundo 29.
  assert.equal(CLIP.preroll, 7);
  assert.equal(Number(new URL(clipEmbedSrc('https://panem.example')).searchParams.get('start')), CLIP.start - CLIP.preroll);
  assert.ok(CLIP.preroll >= 6, 'más que lo que tarda YouTube en ocultar su interfaz');
  assert.ok(CLIP_REVEAL_WAIT_MS >= 4000 && CLIP_REVEAL_WAIT_MS <= 10_000, 'espera razonable a que el clip llegue al corte');
});

test('la intro va en orden y el corte de señal llega después del anuncio', () => {
  const plan = introPlan({ reducedMotion: false });
  assert.deepEqual(plan.steps.map((s) => s.phase), ['boot', 'logo', 'address', 'break']);
  const times = plan.steps.map((s) => s.at);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.equal(new Set(times).size, times.length, 'sin tiempos repetidos');
  assert.equal(plan.steps[0].at, 0);
  assert.equal(plan.usesClip, true);
  assert.ok(TIMING.breakMs > 0 && TIMING.pirateFallbackMs > 0 && TIMING.blackMs > 0 && TIMING.enterZoomMs > 0);
  assert.ok(CLIP_LOAD_TIMEOUT_MS >= 2000, 'hay margen para que cargue el reproductor');
});

test('la intro no se queda esperando al audio: si tarda, arranca igual', () => {
  assert.ok(AUDIO_START_GRACE_MS >= 500 && AUDIO_START_GRACE_MS <= 3000);
});

test('con movimiento reducido no hay corte ni clip: anuncio quieto y salida directa', () => {
  const plan = introPlan({ reducedMotion: true });
  assert.deepEqual(plan.steps.map((s) => s.phase), ['boot', 'address']);
  assert.equal(plan.usesClip, false);
  assert.ok(plan.exitAt > plan.steps.at(-1).at);
});

// Generador pseudoaleatorio fijo para que el test sea repetible
function lcg(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('el corte nunca muestra más de 3 cuadros claros por segundo (límite de destellos)', () => {
  for (const seed of [1, 2, 3, 42, 99, 2026]) {
    const random = lcg(seed);
    let lastBrightAt = -Infinity;
    const bright = [];
    for (let now = 0; now <= TIMING.breakMs; now += 80) {
      const frame = nextBreakFrame({ progress: now / TIMING.breakMs, roll: random(), now, lastBrightAt });
      lastBrightAt = frame.lastBrightAt;
      if (frame.kind === 'address') bright.push(now);
    }
    for (const start of bright) {
      const inWindow = bright.filter((t) => t >= start && t < start + 1000).length;
      assert.ok(inWindow <= 3, `semilla ${seed}: ${inWindow} cuadros claros en 1 s desde ${start} ms`);
    }
    assert.ok(bright.length >= 1, 'el corte arranca con la imagen del anuncio');
  }
  assert.equal(BRIGHT_MIN_GAP_MS * 3 > 1000, true);
});

test('sin permiso de cuadro claro, o ya cerca del final, nunca vuelve el anuncio', () => {
  for (const roll of [0, 0.1, 0.3, 0.5, 0.79, 0.99]) {
    assert.notEqual(nextBreakFrame({ progress: 0.5, roll, now: 100, lastBrightAt: 90 }).kind, 'address');
    assert.notEqual(nextBreakFrame({ progress: 0.9, roll, now: 5000, lastBrightAt: -Infinity }).kind, 'address');
  }
  assert.equal(nextBreakFrame({ progress: 0, roll: 0.9, now: 0, lastBrightAt: -Infinity }).kind, 'address');
  assert.deepEqual(
    nextBreakFrame({ progress: 0.5, roll: 0.9, now: 1000, lastBrightAt: 0 }),
    { kind: 'none', lastBrightAt: 0 },
    'un cuadro oscuro no cambia el momento del último claro',
  );
});
