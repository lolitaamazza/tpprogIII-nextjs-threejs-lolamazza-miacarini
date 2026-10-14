import { Inter, Oswald } from 'next/font/google';
import './globals.css';

const display = Oswald({ subsets: ['latin'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: { default: 'Panem · La chispa', template: '%s · Panem' },
  description: 'Panem está a oscuras: llevá la chispa de distrito en distrito hasta que el Capitolio no pueda apagarla. Experiencia interactiva de fans con fines académicos.',
  applicationName: 'Panem · La chispa',
  keywords: ['Panem', 'The Hunger Games', 'Los juegos del hambre', 'experiencia interactiva', 'Three.js'],
  robots: { index: false, follow: false },
};

export const viewport = { themeColor: '#0b0b0c' };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
