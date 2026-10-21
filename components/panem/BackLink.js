import Link from 'next/link';
import { PiArrowLeft } from 'react-icons/pi';

// Volver: solo la flecha. El texto queda como etiqueta accesible y como tooltip.
export default function BackLink({ href = '/mapa', label = 'Volver al mapa', className = '' }) {
  return (
    <Link href={href} className={`back${className ? ` ${className}` : ''}`} aria-label={label} title={label}>
      <PiArrowLeft aria-hidden="true" />
    </Link>
  );
}
