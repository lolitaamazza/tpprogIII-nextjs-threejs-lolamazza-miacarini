// Punto interior más alejado del borde de un polígono simple (polo de inaccesibilidad).
// El centro de la caja de una pieza cóncava (como el Distrito 3, en L) puede caer afuera
// de la pieza: este punto siempre queda adentro. Puro: se prueba con `node --test`.

function distanceToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSq));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

// Distancia al borde: positiva adentro, negativa afuera.
function signedDistance(px, py, points) {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    nearest = Math.min(nearest, distanceToSegment(px, py, a, b));
  }
  return inside ? nearest : -nearest;
}

export function labelPoint(points, refinements = 6) {
  if (points.length === 0) return { x: 0, y: 0, distance: 0 };
  if (points.length < 3) return { x: points[0].x, y: points[0].y, distance: 0 };
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  let best = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  best.distance = signedDistance(best.x, best.y, points);

  // Búsqueda gruesa sobre toda la caja y después refinamientos alrededor del mejor punto.
  let step = Math.max(maxX - minX, maxY - minY) / 12;
  const scan = (x0, x1, y0, y1) => {
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step) {
        const distance = signedDistance(x, y, points);
        if (distance > best.distance) best = { x, y, distance };
      }
    }
  };
  scan(minX, maxX, minY, maxY);
  for (let i = 0; i < refinements; i++) {
    const reach = step;
    step /= 2;
    scan(best.x - reach, best.x + reach, best.y - reach, best.y + reach);
  }
  return best;
}
