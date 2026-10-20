// Traduce la URL a la escena 3D. Puro: se prueba con `node --test`.
import { isDistrictRouteId } from '../data/districts.js';

export function routeFromPathname(pathname) {
  if (pathname === '/') return { scene: 'intro', districtId: null };
  const parts = String(pathname ?? '').split('/').filter(Boolean);
  const archive = { '/cosecha': 'reaping', '/capitolio/preparacion': 'preparation', '/arena': 'arena', '/desenlace': 'ended' }[pathname];
  if (archive) return { scene: 'games', chapter: archive, districtId: null };
  if (parts[0] === 'capitolio') return { scene: 'capitolio', districtId: 'c' };
  if (parts[0] === 'distrito' && isDistrictRouteId(parts[1])) return { scene: 'distrito', districtId: parts[1] };
  return { scene: 'mapa', districtId: null };
}
