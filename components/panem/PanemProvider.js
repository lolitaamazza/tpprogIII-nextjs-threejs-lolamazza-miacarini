'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProgress } from '@/hooks/useProgress';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { routeFromPathname } from '@/lib/routes';
import { canEnterCapitol } from '@/lib/progress';
import { BURN_LIT_IDS, completesEmblems } from '@/lib/burn';
import { MAP_IDS, getDistrict } from '@/data/districts';

const PanemContext = createContext(null);
const SOUND_KEY = 'panem-sound';
const CLASSIFIED_KEY = 'panem-d13-v1'; // si ya se descubrió la señal oculta del Distrito 13

// Lo que ya se sabía del minijuego, si sigue siendo el mismo distrito.
const sameDistrict = (current, districtId) => (current.districtId === districtId ? current : {});

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
  const [burning, setBurning] = useState(false); // secuencia "Panem arde": se dispara al juntar el tercer emblema
  const [toast, setToast] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  // Distrito 13: cuánto se descubrió moviendo los fragmentos y si ya apareció el mensaje oculto.
  const [classified, setClassified] = useState({ progress: 0, revealed: false });
  useEffect(() => {
    let revealed = false;
    try { revealed = window.localStorage.getItem(CLASSIFIED_KEY) === 'revealed'; } catch { /* sin storage */ }
    if (revealed) setClassified({ progress: 1, revealed: true }); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

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

  // Una pantalla puede pedir un volumen fijo para la música (la intro la baja mientras suena el clip);
  // mientras esté pedido, el efecto de capas de abajo no lo pisa.
  const duckRef = useRef(null);
  const sfx = useMemo(() => ({
    play: (name) => audioRef.current?.playSfx(name),
    duck: (ducked, level) => {
      duckRef.current = ducked ? (level ?? 0.45) : null;
      audioRef.current?.setDucked(ducked, level);
    },
  }), []);

  // Devuelve el estado resultante ('on' | 'muted' | 'unsupported') para quien lo necesite en el mismo clic.
  const startAudio = useCallback(async () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioEngine();
      await audioRef.current.start();
      let preference = 'on';
      try { preference = window.localStorage.getItem(SOUND_KEY) || 'on'; } catch { /* sin storage */ }
      audioRef.current.setMuted(preference === 'off');
      const state = preference === 'off' ? 'muted' : 'on';
      setAudioState(state);
      return state;
    } catch {
      setAudioState('unsupported');
      notify('El sonido no está disponible en este navegador. La experiencia sigue en silencio.');
      return 'unsupported';
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
  const visibleLit = burning ? BURN_LIT_IDS : completed && !finalePlaying ? MAP_IDS : progress.litDistricts;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioState === 'off' || audioState === 'unsupported') return;
    audio.setLayerState({
      lit: progress.litDistricts,
      previewDistrict: route.scene === 'distrito' ? route.districtId : null,
      finale: completed || finalePlaying ? progress.finalMessage : null,
    });
    if (duckRef.current !== null) audio.setDucked(true, duckRef.current);
    else audio.setDucked(route.scene === 'distrito');
  }, [audioState, progress.litDistricts, progress.finalMessage, completed, finalePlaying, route, burning]); // burning: al terminar el incendio se reaplica el volumen del ambiente

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

  // Tocar el mapa fuera del minijuego cierra el panel del distrito.
  const goToMap = useCallback(() => {
    sfx.play('click');
    router.push('/mapa');
  }, [sfx, router]);

  // El avance y la partida del minijuego del distrito abierto (la partida la usa el panel: vidas, perder, reintentar).
  const handleProgress = useCallback((districtId, value) => setInteraction((current) => ({ ...sameDistrict(current, districtId), districtId, value })), []);
  const handleMatch = useCallback((districtId, match) => setInteraction((current) => ({ ...sameDistrict(current, districtId), districtId, value: match.score / match.goal, match })), []);
  const retryMinigame = useCallback(() => { sfx.play('click'); stageApiRef.current?.retryMinigame(); }, [sfx]);
  const minigameInput = useCallback((i) => stageApiRef.current?.minigameInput(i), []);

  const handleComplete = useCallback((districtId) => {
    if (progress.litDistricts.includes(districtId)) return;
    const burn = completesEmblems(progress, districtId); // se evalúa antes de sumar: solo el emblema que completa el tercero
    progress.lightDistrict(districtId);
    setInteraction({ districtId, value: 1 });
    notify(`Emblema del Distrito ${districtId} · ${Math.min(progress.litDistricts.length + 1, 3)}/3`);
    if (burn) setBurning(true);
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

  const classifiedProgress = useCallback((value) => setClassified((current) => (current.revealed ? current : { ...current, progress: value })), []);
  const revealClassified = useCallback(() => {
    setClassified({ progress: 1, revealed: true });
    try { window.localStorage.setItem(CLASSIFIED_KEY, 'revealed'); } catch { /* sin storage */ }
    sfx.play('ignite');
  }, [sfx]);

  const resetAll = useCallback(async () => {
    try { await progress.reset(); try { localStorage.removeItem(CLASSIFIED_KEY); } catch { /* El progreso principal ya se reinició. */ } notify('Panem volvió a apagarse.'); }
    catch { notify('No se pudo reiniciar en la nube; revisá tu conexión.'); }
    setFallbackCounts({});
    setClassified({ progress: 0, revealed: false });
    setInteraction({ districtId: null, value: 0 });
    setBurning(false);
    router.push('/');
  }, [progress, notify, router]);

  const value = {
    route, progress, audioState, startAudio, toggleSound, sfx, hovered, setHovered,
    interaction, performAction, retryMinigame, minigameInput, selectDistrict, goToMap, classified, classifiedProgress, revealClassified, handleProgress, handleMatch, handleComplete,
    stageApiRef, webglFailed, setWebglFailed, mapFailed, setMapFailed, finalePlaying, setFinalePlaying,
    burning, setBurning, visibleLit, reducedMotion, notify, resetAll,
  };

  return (
    <PanemContext.Provider value={value}>
      {children}
      <div className="toast" role="status" aria-live="polite" data-show={toast ? 'true' : 'false'}>{toast}</div>
    </PanemContext.Provider>
  );
}
