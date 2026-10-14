'use client';
import { usePanem } from './PanemProvider';

// Si el mapa 3D no pudo cargarse (red, ruta del asset) la experiencia sigue con los botones de cada distrito.
export default function MapErrorBanner() {
  const { mapFailed, route } = usePanem();
  if (!mapFailed || route.scene === 'intro') return null;
  return (
    <div className="map-error" role="alert">
      <span>No se pudo cargar el mapa 3D. Podés seguir con los botones de cada distrito.</span>
      <button type="button" onClick={() => window.location.reload()}>Reintentar</button>
    </div>
  );
}
