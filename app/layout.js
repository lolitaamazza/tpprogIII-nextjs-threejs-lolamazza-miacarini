import { Caveat, Homemade_Apple, Inter, Kalam, La_Belle_Aurore, Nothing_You_Could_Do, Oswald, Patrick_Hand, Rajdhani, Reenie_Beanie, Shadows_Into_Light, Special_Elite } from 'next/font/google';
import './globals.css';

const display = Oswald({ subsets: ['latin'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
// La letra del visor y de los botones (tecnológica, fina).
const hud = Rajdhani({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-hud' });
// Las notas escritas a mano: una letra por persona (ver lib/hands.js); los papeles del Capitolio, a máquina.
const ash = Caveat({ subsets: ['latin'], variable: '--hand-ash' });
const nora = Kalam({ subsets: ['latin'], weight: '400', variable: '--hand-nora' });
const tomi = Reenie_Beanie({ subsets: ['latin'], weight: '400', variable: '--hand-tomi' });
const oliva = Shadows_Into_Light({ subsets: ['latin'], weight: '400', variable: '--hand-oliva' });
const teo = Nothing_You_Could_Do({ subsets: ['latin'], weight: '400', variable: '--hand-teo' });
const ines = La_Belle_Aurore({ subsets: ['latin'], weight: '400', variable: '--hand-ines' });
const perla = Homemade_Apple({ subsets: ['latin'], weight: '400', variable: '--hand-perla' });
const marin = Patrick_Hand({ subsets: ['latin'], weight: '400', variable: '--hand-marin' });
const capitol = Special_Elite({ subsets: ['latin'], weight: '400', variable: '--hand-capitol' });
const hands = [ash, nora, tomi, oliva, teo, ines, perla, marin, capitol];

export const metadata = {
  title: { default: 'Panem', template: '%s · Panem' },
  description: 'Panem está a oscuras: recorré los distritos, encendelos uno por uno y tomá la transmisión del Capitolio. Experiencia interactiva de fans con fines académicos.',
  applicationName: 'Panem',
  keywords: ['Panem', 'The Hunger Games', 'Los juegos del hambre', 'experiencia interactiva', 'Three.js'],
  robots: { index: false, follow: false },
};

export const viewport = { themeColor: '#0b0b0c' };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={[display, body, hud, ...hands].map((f) => f.variable).join(' ')}>
      <body>{children}</body>
    </html>
  );
}
