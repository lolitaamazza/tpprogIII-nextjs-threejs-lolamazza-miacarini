// Límites del renderizado, independientes del navegador para verificar móviles y preferencias.
export function renderBudget(width, quality = 'auto', devicePixelRatio = 1) {
  const low = quality === 'low' || (quality === 'auto' && width < 721);
  return { low, pixelRatio: Math.min(devicePixelRatio || 1, low ? 1 : 1.5), frameMs: 1000 / (low ? 30 : 60) };
}
export function shouldRenderFrame(timestamp, previous, frameMs) {
  return !Number.isFinite(previous) || timestamp - previous >= frameMs - .5;
}
