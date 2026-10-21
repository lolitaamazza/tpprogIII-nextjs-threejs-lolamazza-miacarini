// Qué hace un clic sobre el canvas según la escena. Puro: se prueba con `node --test`.
// - onDiorama: el clic empezó sobre el minijuego del distrito (lo maneja el minijuego).
// - pickedId: la pieza del mapa que quedó bajo el puntero (o null).
export function mapClickAction({ scene, currentId = null, hasDiorama = false, onDiorama = false, pickedId = null }) {
  if (scene === 'mapa') return pickedId ? { type: 'select', id: pickedId } : { type: 'none' };
  if (scene !== 'distrito') return { type: 'none' };
  if (onDiorama) return { type: 'diorama' };
  if (pickedId && pickedId !== currentId) return { type: 'select', id: pickedId };
  // El borde del propio distrito: con minijuego seguramente fue un tiro errado; sin minijuego es "salir".
  if (pickedId === currentId && hasDiorama) return { type: 'none' };
  return { type: 'map' };
}
