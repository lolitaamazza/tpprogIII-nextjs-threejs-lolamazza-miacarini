'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProgress } from '@/hooks/useProgress';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { routeFromPathname } from '@/lib/routes';
import { canEnterCapitol } from '@/lib/progress';
import { MAP_IDS, getDistrict } from '@/data/districts';

const PanemContext = createContext(null);
const SOUND_KEY = 'panem-sound';

export function usePanem() {
  const value = useContext(PanemContext);
  if (!value) throw new Error('usePanem debe usarse dentro de PanemProvider');
  return value;
}

export default function PanemProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const route = useMemo(() => routeFromPathname(pathname), [pathname]);
  const progress = useProgress();
  const audioRef = useRef(null);
  const stageApiRef = useRef(null);
  const [audioState, setAudioState] = useState('off');
  const [hovered, setHovered] = useState(null);
  const [interaction, setInteraction] = useState({ districtId: null, value: 0 });
  const [fallbackCounts, setFallbackCounts] = useState({});
  const [webglFailed, setWebglFailed] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [finalePlaying, setFinalePlaying] = useState(false);
  const [toast, setToast] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);

  const notify = useCallback((message) => setToast(message), []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const sfx = useMemo(() => ({ play: (name) => audioRef.current?.playSfx(name) }), []);

  const startAudio = useCallback(async () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioEngine();
      await audioRef.current.start();
      let preference = 'on';
      try { preference = window.localStorage.getItem(SOUND_KEY) || 'on'; } catch { /* sin storage */ }
      audioRef.current.setMuted(preference === 'off');
      setAudioState(preference === 'off' ? 'muted' : 'on');
    } catch {
      setAudioState('unsupported');
      notify('El sonido no está disponible en este navegador. La experiencia sigue en silencio.');
    }
  }, [notify]);

  const toggleSound = useCallback(async () => {
    if (audioState === 'off') { await startAudio(); return; }
    if (audioState === 'unsupported') return;
    const muted = audioState === 'on';
    audioRef.current.setMuted(muted);
    setAudioState(muted ? 'muted' : 'on');
    try { window.localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on'); } catch { /* sin storage */ }
  }, [audioState, startAudio]);

  useEffect(() => () => { audioRef.current?.dispose(); audioRef.current = null; }, []);

  const completed = progress.completedAt !== null;
  const visibleLit = completed && !finalePlaying ? MAP_IDS : progress.litDistricts;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioState === 'off' || audioState === 'unsupported') return;
    audio.setLayerState({
      lit: progress.litDistricts,
      previewDistrict: route.scene === 'distrito' ? route.districtId : null,
      finale: completed || finalePlaying ? progress.finalMessage : null,
    });
    audio.setDucked(route.scene === 'distrito');
  }, [audioState, progress.litDistricts, progress.finalMessage, completed, finalePlaying, route]);

  const selectDistrict = useCallback((id) => {
    if (id === 'c') {
      if (!canEnterCapitol(progress)) {
        notify(`El Capitolio está blindado · ${progress.litDistricts.length}/3 emblemas`);
        sfx.play('glitch');
        return;
      }
      sfx.play('click');
      router.push('/capitolio');
      return;
    }
    if (!getDistrict(id)) return;
    sfx.play('click');
    router.push(`/distrito/${id}`);
  }, [progress, notify, sfx, router]);

  const handleProgress = useCallback((districtId, value) => setInteraction({ districtId, value }), []);

  const handleComplete = useCallback((districtId) => {
    if (progress.litDistricts.includes(districtId)) return;
    progress.lightDistrict(districtId);
    setInteraction({ districtId, value: 1 });
    notify(`Emblema del Distrito ${districtId} · ${Math.min(progress.litDistricts.length + 1, 3)}/3`);
  }, [progress, notify]);

  const performAction = useCallback(() => {
    if (route.scene !== 'distrito') return;
    const district = getDistrict(route.districtId);
    if (!district?.playable || progress.litDistricts.includes(district.id)) return;
    if (stageApiRef.current?.performAction()) return;
    // Sin WebGL, o con el mapa todavía sin cargar o caído: el avance se cuenta acá con la misma cantidad de acciones.
    const next = (fallbackCounts[district.id] || 0) + 1;
    setFallbackCounts((counts) => ({ ...counts, [district.id]: next }));
    sfx.play('click');
    handleProgress(district.id, Math.min(1, next / district.actionsToComplete));
    if (next >= district.actionsToComplete) handleComplete(district.id);
  }, [route, progress.litDistricts, fallbackCounts, sfx, handleProgress, handleComplete]);

  const resetAll = useCallback(async () => {
    try { await progress.reset(); notify('Panem volvió a apagarse.'); }
    catch { notify('No se pudo reiniciar en la nube; revisá tu conexión.'); }
    setFallbackCounts({});
    setInteraction({ districtId: null, value: 0 });
    router.push('/');
  }, [progress, notify, router]);

  const value = {
    route, progress, audioState, startAudio, toggleSound, sfx, hovered, setHovered,
    interaction, performAction, selectDistrict, handleProgress, handleComplete,
    stageApiRef, webglFailed, setWebglFailed, mapFailed, setMapFailed, finalePlaying, setFinalePlaying,
    visibleLit, reducedMotion, notify, resetAll,
  };

  return (
    <PanemContext.Provider value={value}>
      {children}
      <div className="toast" role="status" aria-live="polite" data-show={toast ? 'true' : 'false'}>{toast}</div>
    </PanemContext.Provider>
  );
}
