import Link from 'next/link';
export default function NotFound() {
  return <main className="route-message"><h1>ARCHIVO NO ENCONTRADO</h1><Link href="/" className="primary">Volver a la arena ↗</Link></main>;
}
