// Poses de cámara por escena. Puro: se prueba con `node --test`.
import { hallPoseFor } from '../../lib/broadcastHall.js';

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function lerpPose(a, b, t) {
  const mix = (from, to) => from.map((v, i) => v + (to[i] - v) * t);
  return { position: mix(a.position, b.position), target: mix(a.target, b.target) };
}

// Cuánto se aleja la cámara para que el contenido entre a lo ancho: `needed` es la relación
// ancho/alto de pantalla a partir de la cual el contenido ya entra sin alejarse.
const MAX_FAR = 3.2;
const fitFar = (aspect, minFar, needed) => Math.min(MAX_FAR, Math.max(minFar, needed / aspect));

export function poseFor(route, centers, aspect) {
  const close = aspect < 0.8 ? 1.7 : 1; // distritos y Capitolio: el contenido es chico
  const scene = route?.scene;
  if (scene === 'games') {
    const far = fitFar(aspect, 1, 1.1);
    if (route.chapter === 'arena' || route.chapter === 'ended') return {position:[10*far,15*far,17*far],target:[0,.8,0]};
    return { position: [8 * far, (route.chapter === 'arena' || route.chapter === 'ended' ? 10 : 5.5) * far, 11 * far], target: [0, .6, 0] };
  }
  if (scene === 'intro') return hallPoseFor(aspect); // la sala de transmisión, lejos del mapa
  if (scene === 'finale') {
    const far = fitFar(aspect, 1.15, 2); // deja lugar al panel del final
    return { position: [0, 12 * far, 8.5 * far], target: [0, 0, 0.3] };
  }
  // El Distrito 13 no tiene dónde acercarse: su escena es la pantalla rota sobre el mapa entero.
  const id = scene === 'capitolio' ? 'c' : scene === 'distrito' && route.districtId !== '13' ? route.districtId : null;
  const c = id ? centers?.[id] : null;
  if (c && scene === 'distrito') return { position: [c.x, 4.4 * close, c.z + 3.9 * close], target: [c.x, 0.3, c.z] };
  if (c && scene === 'capitolio') return { position: [c.x, 5.5 * close, c.z + 5 * close], target: [c.x, 0.3, c.z] };
  const far = fitFar(aspect, 1, 1.36); // el mapa entero (12 unidades de ancho) tiene que entrar
  return { position: [0, 10.5 * far, 7 * far], target: [0, 0, 0.6] };
}

// La arena en sus dos vistas: la mesa de los Vigilantes (desde arriba, la arena entera) y la cámara que sigue
// a tu tributo de cerca, estilo Frostpunk. Sin tributo a quien seguir, la vista general de la arena.
export function gamesViewPose(view, focus, aspect) {
  if (view === 'table') {
    const far = fitFar(aspect, 1, 1.1);
    return { position: [0, 31 * far, 14 * far], target: [0, 0, 1] }; // se ve el borde de la mesa y a los Vigilantes
  }
  if (!focus) return poseFor({ scene: 'games', chapter: 'arena' }, null, aspect);
  return { position: [focus.x + 3.2, focus.y + 3.4, focus.z + 4.4], target: [focus.x, focus.y + 0.6, focus.z] };
}

// El panel lateral (escritorio) o la hoja inferior (celular) tapan parte del canvas: la vista se
// corre para que el distrito quede centrado en la zona libre. Valores en píxeles de pantalla.
export const PANEL_WIDTH = 424; // 400 px de panel + 24 px de margen (.panel en app/globals.css)
export const MOBILE_MAX_WIDTH = 720; // mismo corte que el @media de app/globals.css
const HEADER = 72; // alto del encabezado (top de .panel)

export function viewShiftFor(route, width, height) {
  const scene = route?.scene;
  const hasPanel = route?.panel === true || scene === 'capitolio';
  if (!hasPanel) return { x: 0, y: 0 };
  if (width <= MOBILE_MAX_WIDTH) return { x: 0, y: Math.round(height * 0.22) };
  return { x: Math.round(Math.min(PANEL_WIDTH, width / 2) / 2), y: 0 };
}

// La parte del canvas que queda a la vista debajo del encabezado, en proporción de pantalla (y hacia abajo).
// Los distritos ya no tienen panel: es toda la pantalla.
export function openAreaFor(width, height) {
  return { x0: 0, y0: Math.min(HEADER / Math.max(height, 1), 0.3), x1: 1, y1: 1 };
}

// La niebla (el color del fondo) acompaña a la cámara: con el mapa lejano en pantallas angostas,
// una niebla fija lo taparía por completo. `distance` es la distancia de la cámara al centro del mapa.
export function fogRangeFor(distance) {
  return { near: Math.max(16, distance * 1.3), far: Math.max(34, distance * 2.8) };
}
