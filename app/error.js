'use client';
export default function Error({ reset }) {
  return <main className="route-message"><h1>SEÑAL INTERRUMPIDA</h1><p>No se pudo recuperar el archivo.</p><button className="primary" onClick={reset}>Reintentar ↗</button></main>;
}
