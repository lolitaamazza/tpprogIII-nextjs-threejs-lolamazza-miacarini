'use client';
export default function Error({ reset }) {
  return (
    <main className="route-message">
      <p className="eyebrow">ERROR DE TRANSMISIÓN</p>
      <h1>La señal se interrumpió.</h1>
      <button type="button" className="primary" onClick={reset}>Reintentar</button>
    </main>
  );
}
