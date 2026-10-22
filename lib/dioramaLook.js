// La luz de cada minijuego: el entorno (HDRI), el sol y la luz ambiente. null = la luz del mapa.
// Puro: se prueba con `node --test`.
import { DIORAMA_ASSETS } from './dioramaAssets.js';

const LOOKS = {
  12: { envIntensity: 0.35, sun: { color: '#ffd9b8', intensity: 1.8, position: [-4.5, 4.5, 3.5] }, ambient: 0.3 }, // amanecer, sol bajo
  4: { envIntensity: 0.5, sun: { color: '#fff6ea', intensity: 1.8, position: [4, 8, 5] }, ambient: 0.35 },
  11: { envIntensity: 0.45, sun: { color: '#ffecc8', intensity: 1.9, position: [5, 6.5, 3] }, ambient: 0.32 }, // tarde dorada
};

export function dioramaLook(id) {
  const look = LOOKS[id];
  return look ? { env: DIORAMA_ASSETS[id].env, ...look } : null;
}
