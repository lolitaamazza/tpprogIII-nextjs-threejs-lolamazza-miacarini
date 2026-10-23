'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDistrict } from '@/data/districts';
import TrainRide from './TrainRide';
import { usePanem } from './PanemProvider';

// Del mapa a un distrito con escena: el viaje en tren y después su escena (se reemplaza la ruta: volver no repite el viaje).
export default function TrainTrip({ id }) {
  const router = useRouter();
  const { stageApiRef, reducedMotion, sfx } = usePanem();
  useEffect(() => {
    const stage = stageApiRef.current;
    stage?.setGamesCovered(true);
    return () => stage?.setGamesCovered(false);
  }, [stageApiRef]);
  const district = getDistrict(id);
  return <TrainRide label={`En tren al ${district?.name ?? `Distrito ${id}`}`} reducedMotion={reducedMotion} sfx={sfx} onArrive={() => router.replace(`/escena/${id}`)} />;
}
