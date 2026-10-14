// Guion de la intro de la tele: tiempos, clip incrustado y regla de destellos. Puro: se prueba con `node --test`.

// Fragmento del video oficial «President Snow's Panem Address #2 – Unity» (The Hunger Games / Lionsgate)
// donde la transmisión del Capitolio se corta. Se incrusta desde YouTube; no se descarga ni se copia.
// YouTube deja a la vista su título y el botón de pausa durante unos 4 a 5 s desde que empieza a reproducir.
// Para que no se vean, el video arranca `preroll` segundos antes del corte, en silencio y oculto, y se muestra
// recién cuando llega al segundo `start`.
export const CLIP = Object.freeze({
  videoId: 'k4e-qJdEAXo',
  start: 29,
  end: 51,
  preroll: 7,
  title: 'President Snow\'s Panem Address #2 – "Unity"',
  channel: 'The Hunger Games',
});
export const CLIP_HOST = 'https://www.youtube-nocookie.com';
export const CLIP_LOAD_TIMEOUT_MS = 3500; // si el reproductor no está armado en este tiempo, se sigue sin el clip
export const CLIP_REVEAL_WAIT_MS = 6000; // cuánto se espera a que el clip llegue al corte antes de rendirse
export const AUDIO_START_GRACE_MS = 1500; // si el audio tarda más en arrancar, la intro sigue y el sonido entra cuando esté

export const TIMING = Object.freeze({
  logoAt: 850,
  addressAt: 2400,
  breakAt: 5400,
  breakMs: 1500, // corte propio antes de que entre el clip
  pirateFallbackMs: 2400, // señal pirata propia si el clip no carga
  blackMs: 500,
  enterZoomMs: 1700,
  reducedAddressAt: 600,
  reducedStayMs: 2600,
});

export function clipDurationMs() {
  return (CLIP.end - CLIP.start) * 1000 + 600;
}

export function clipEmbedSrc(origin) {
  const params = new URLSearchParams({
    enablejsapi: '1', controls: '0', disablekb: '1', fs: '0', iv_load_policy: '3', modestbranding: '1',
    rel: '0', playsinline: '1', start: String(CLIP.start - CLIP.preroll), end: String(CLIP.end), origin,
  });
  return `${CLIP_HOST}/embed/${CLIP.videoId}?${params}`;
}

// Etapas de la intro con los tiempos (ms desde que se enciende la tele). El clip y la salida dependen
// de eventos (el clip carga y termina), así que acá solo va la parte fija.
export function introPlan({ reducedMotion = false } = {}) {
  if (reducedMotion) {
    return {
      steps: [{ phase: 'boot', at: 0 }, { phase: 'address', at: TIMING.reducedAddressAt }],
      usesClip: false,
      exitAt: TIMING.reducedAddressAt + TIMING.reducedStayMs,
    };
  }
  return {
    steps: [
      { phase: 'boot', at: 0 },
      { phase: 'logo', at: TIMING.logoAt },
      { phase: 'address', at: TIMING.addressAt },
      { phase: 'break', at: TIMING.breakAt },
    ],
    usesClip: true,
    exitAt: null,
  };
}

// Durante el corte la imagen salta entre el anuncio (cuadro claro), la señal pirata y negro. Para no
// producir destellos peligrosos (más de 3 por segundo), el cuadro claro no puede repetirse antes de
// BRIGHT_MIN_GAP_MS: 3 × 340 ms > 1 s.
export const BRIGHT_MIN_GAP_MS = 340;

export function nextBreakFrame({ progress, roll, now, lastBrightAt }) {
  let kind = 'address';
  if (progress > 0.16) kind = roll < 0.3 ? 'address' : roll < 0.8 ? 'pirate' : 'none';
  if (progress > 0.78) kind = roll < 0.55 ? 'pirate' : 'none';
  if (kind === 'address' && now - lastBrightAt < BRIGHT_MIN_GAP_MS) kind = roll < 0.5 ? 'pirate' : 'none';
  return { kind, lastBrightAt: kind === 'address' ? now : lastBrightAt };
}
