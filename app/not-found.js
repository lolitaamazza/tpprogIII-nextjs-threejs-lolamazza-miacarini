import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="route-message">
      <p className="eyebrow">404 · SIN REGISTRO</p>
      <h1>Ese lugar no figura en el mapa de Panem.</h1>
      <Link href="/mapa" className="primary">Volver al mapa</Link>
    </main>
  );
}
