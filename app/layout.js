import './globals.css';

export const metadata = {
  title: { default: 'Panem · Ecos de la arena', template: '%s | Panem' },
  description: 'Una experiencia narrativa transmedia: explora la arena, descifra señales y decide qué debe recordar Panem.',
  applicationName: 'PANEM — Ecos de la arena',
  keywords: ['Panem', 'The Hunger Games', 'experiencia interactiva', 'transmedia', 'Three.js'],
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
