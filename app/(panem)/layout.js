import PanemProvider from '@/components/panem/PanemProvider';
import PanemStage from '@/components/panem/PanemStage';
import SiteHeader from '@/components/panem/SiteHeader';
import MapErrorBanner from '@/components/panem/MapErrorBanner';

// Este layout no se re-renderiza al navegar: el canvas y el audio sobreviven entre rutas.
export default function PanemLayout({ children }) {
  return (
    <PanemProvider>
      <PanemStage />
      <SiteHeader />
      <MapErrorBanner />
      <main id="main" className="overlay">{children}</main>
    </PanemProvider>
  );
}
