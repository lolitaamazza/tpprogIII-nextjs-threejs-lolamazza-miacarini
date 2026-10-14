import MapHud from '@/components/panem/MapHud';
import MapIntro from '@/components/panem/MapIntro';
import DistrictDial from '@/components/panem/DistrictDial';

export const metadata = {
  title: 'Mapa de los distritos',
  description: 'Panem está a oscuras. Elegí un distrito y encendelo.',
};

export default function MapPage() {
  return (
    <>
      <MapIntro />
      <MapHud />
      <DistrictDial />
    </>
  );
}
