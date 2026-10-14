'use client';
import { useEffect, useMemo, useRef } from 'react';
import { usePanem } from './PanemProvider';
import { createPanemScene } from '@/components/stage/panemScene';

export default function PanemStage() {
  const mountRef = useRef(null);
  const panem = usePanem();
  const { route, visibleLit, hovered, reducedMotion, stageApiRef, setWebglFailed, setMapFailed, finalePlaying, progress } = panem;
  // Con el recorrido terminado, el Capitolio muestra Panem entero encendido (con el panel del final a un costado).
  const celebrating = route.scene === 'capitolio' && progress.completedAt !== null && !finalePlaying;
  const stageRoute = useMemo(() => (celebrating ? { scene: 'finale', districtId: null, panel: true } : route), [celebrating, route]);
  const callbacksRef = useRef(null);

  useEffect(() => {
    callbacksRef.current = {
      onHover: panem.setHovered, onSelect: panem.selectDistrict,
      onProgress: panem.handleProgress, onComplete: panem.handleComplete, sfx: panem.sfx,
    };
  });

  useEffect(() => {
    let api;
    try {
      api = createPanemScene(mountRef.current, {
        onHover: (id) => callbacksRef.current?.onHover(id),
        onSelect: (id) => callbacksRef.current?.onSelect(id),
        onProgress: (id, value) => callbacksRef.current?.onProgress(id, value),
        onComplete: (id) => callbacksRef.current?.onComplete(id),
        sfx: { play: (name) => callbacksRef.current?.sfx.play(name) },
        onError: (error) => {
          console.error('No se pudo cargar el mapa 3D:', error);
          setMapFailed(true); // MapErrorBanner ofrece reintentar; los botones de cada distrito siguen funcionando
        },
      });
    } catch (error) {
      console.warn('WebGL no disponible:', error);
      setWebglFailed(true);
      return undefined;
    }
    stageApiRef.current = api;
    if (process.env.NODE_ENV !== 'production') window.__panemInfo = api.getInfo;
    return () => {
      api.dispose();
      stageApiRef.current = null;
      if (process.env.NODE_ENV !== 'production') delete window.__panemInfo;
    };
  }, [stageApiRef, setWebglFailed, setMapFailed]);

  useEffect(() => { stageApiRef.current?.setRoute(stageRoute); }, [stageRoute, stageApiRef]);
  useEffect(() => { stageApiRef.current?.setLit(visibleLit); }, [visibleLit, stageApiRef]);
  useEffect(() => { stageApiRef.current?.setHovered(hovered); }, [hovered, stageApiRef]);
  useEffect(() => { stageApiRef.current?.setReducedMotion(reducedMotion); }, [reducedMotion, stageApiRef]);

  return <div ref={mountRef} className="stage" aria-hidden="true" />;
}
