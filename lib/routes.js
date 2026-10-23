// Traduce la URL a la escena 3D. Puro: se prueba con `node --test`.
import { isDistrictRouteId } from '../data/districts.js';

export const LOCATION_IDS = ['12', '11', '4'];

// A dónde lleva elegir un distrito en el mapa: en tren a su escena, si tiene; si no, a su maqueta.
export function districtPath(id) {
  return LOCATION_IDS.includes(String(id)) ? `/tren/${id}` : `/distrito/${id}`;
}

export function routeFromPathname(pathname) {
  if (pathname === '/') return { scene: 'intro', districtId: null };
  const parts = String(pathname ?? '').split('/').filter(Boolean);
  const archive = { '/cosecha': 'reaping', '/capitolio/preparacion': 'preparation', '/arena': 'arena', '/desenlace': 'ended' }[pathname];
  if (archive) return { scene: 'games', chapter: archive, districtId: null };
  if (parts[0] === 'capitolio') return { scene: 'capitolio', districtId: 'c' };
  if (parts[0] === 'distrito' && isDistrictRouteId(parts[1])) return { scene: 'distrito', districtId: parts[1] };
  // Escenas realistas de los distritos de los tres días, el tren que lleva a cada una y la Cosecha por plazas.
  if (parts[0] === 'escena' && LOCATION_IDS.includes(parts[1])) return { scene: 'escena', districtId: parts[1] };
  if (parts[0] === 'tren' && LOCATION_IDS.includes(parts[1])) return { scene: 'tren', districtId: parts[1] };
  if (pathname === '/plazas') return { scene: 'plazas', districtId: null };
  return { scene: 'mapa', districtId: null };
}
