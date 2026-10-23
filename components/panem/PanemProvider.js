'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProgress } from '@/hooks/useProgress';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { routeFromPathname } from '@/lib/routes';
import { canEnterCapitol } from '@/lib/progress';
import { BURN_LIT_IDS } from '@/lib/burn';
import * as Story from '@/lib/story';
import CapitolBulletin from './CapitolBulletin';
import FragmentCard from './FragmentCard';
import { SIGNAL_FRAGMENT } from '@/lib/fragments';
import { MAP_IDS, getDistrict } from '@/data/districts';

const PanemContext = createContext(null);
const SOUND_KEY = 'panem-sound';
const CLASSIFIED_KEY = 'panem-d13-v1'; // si ya se descubrió la señal oculta del Distrito 13
const STORY_KEY = 'panem-cosecha-v1'; // la historia: papeles, teselas, la decisión pendiente y los fragmentos
const GAMES_PREFIX = 'panem-games-v1:'; // la edición de los Juegos (la guarda GamesProvider)

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
  const [burning, setBurning] = useState(false); // secuencia "Panem arde" (se puede volver a ver desde el archivo)
  const [toast, setToast] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  // Distrito 13: cuánto se descubrió moviendo los fragmentos y si ya apareció el mensaje oculto.
  const [classified, setClassified] = useState({ progress: 0, revealed: false });
  useEffect(() => {
    let revealed = false;
    try { revealed = window.localStorage.getItem(CLASSIFIED_KEY) === 'revealed'; } catch { /* sin storage */ }
    if (revealed) setClassified({ progress: 1, revealed: true }); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // La historia de los tres días: se lee del navegador al montar y se guarda en cada cambio.
  const [story, setStory] = useState(Story.createStory);
  const [storyReady, setStoryReady] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0); // GamesProvider lo escucha para olvidar su edición
  const [bulletin, setBulletin] = useState(null); // la tele del Capitolio después de decidir las teselas (id del día)
  const [shownFragment, setShownFragment] = useState(null); // la tarjeta del fragmento recién tocado
  const [practice, setPractice] = useState(null); // un día ya jugado que se vuelve a jugar por gusto (no cambia la historia)
  // Salir del distrito termina la práctica.
  const [practiceRoute, setPracticeRoute] = useState(route.districtId);
  if (practiceRoute !== route.districtId) { setPracticeRoute(route.districtId); if (practice) setPractice(null); }
  useEffect(() => {
    let saved = null, revealed = false;
    try {
      saved = JSON.parse(window.localStorage.getItem(STORY_KEY));
      revealed = window.localStorage.getItem(CLASSIFIED_KEY) === 'revealed'; // quien ya había encontrado la señal del 13
    } catch { /* sin storage o roto: empieza de nuevo */ }
    const loaded = Story.normalizeStory(saved);
    setStory(revealed ? Story.findFragment(loaded, SIGNAL_FRAGMENT) : loaded); // eslint-disable-line react-hooks/set-state-in-effect
    setStoryReady(true);
  }, []);
  useEffect(() => {
    if (!storyReady) return;
    try { window.localStorage.setItem(STORY_KEY, JSON.stringify(story)); } catch { /* sin storage */ }
  }, [story, storyReady]);
  const day = useMemo(() => Story.storyDay(story, progress.litDistricts), [story, progress.litDistricts]);
  const phase = Story.storyPhase(story, progress.litDistricts);

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
    // La música acompaña el momento: calma en el mapa, la capa del día en su jornada, silencio al decidir las teselas.
    audio.setLayerState({
      scene: route.scene, chapter: route.chapter ?? null, lit: progress.litDistricts, district: route.districtId,
      today: practice ?? (story.pending ? null : day?.district ?? null),
      deciding: story.pending?.district === route.districtId,
      finale: completed || finalePlaying ? progress.finalMessage : null,
    });
    if (duckRef.current !== null) audio.setDucked(true, duckRef.current);
    else audio.setDucked(route.scene === 'distrito');
  }, [audioState, progress.litDistricts, progress.finalMessage, completed, finalePlaying, route, burning, practice, story.pending, day]); // burning: al terminar el incendio se reaplica el volumen del ambiente

  const selectDistrict = useCallback((id) => {
    if (id === 'c') {
      if (!canEnterCapitol(progress) || !(story.gamesEnded || progress.finalMessage)) {
        notify('El Capitolio está blindado hasta que terminen los Juegos.');
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
  }, [progress, story.gamesEnded, notify, sfx, router]);

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

  // Solo cuenta la jornada del día (y sin una decisión pendiente): enciende el distrito y deja la decisión de las teselas.
  // `perfect`: la jornada salió sin perder vidas (sin WebGL no hay vidas, así que cuenta como perfecta).
  const handleComplete = useCallback((districtId, { perfect = true } = {}) => {
    if (practice === districtId) { setPractice(null); notify('Jornada repetida. La historia no cambia.'); return; }
    if (progress.litDistricts.includes(districtId) || story.pending || day?.district !== districtId) return;
    progress.lightDistrict(districtId);
    setStory((current) => Story.completeDay(current, districtId, { perfect, lit: progress.litDistricts }));
    setInteraction({ districtId, value: 1 });
  }, [progress, story.pending, day, practice, notify]);

  const replayDay = useCallback((districtId) => {
    sfx.play('click');
    setFallbackCounts((counts) => ({ ...counts, [districtId]: 0 }));
    setInteraction({ districtId: null, value: 0 });
    setPractice(districtId);
  }, [sfx]);

  const decideTesserae = useCallback((accept) => setStory((current) => Story.decideTesserae(current, accept)), []);
  const findFragment = useCallback((id) => setStory((current) => Story.findFragment(current, id)), []);
  const markGamesEnded = useCallback(() => setStory(Story.markGamesEnded), []);
  const closeBulletin = useCallback(() => setBulletin(null), []);
  const closeFragment = useCallback(() => setShownFragment(null), []);

  const performAction = useCallback(() => {
    if (route.scene !== 'distrito') return;
    const district = getDistrict(route.districtId);
    const today = !progress.litDistricts.includes(district?.id) && !story.pending && day?.district === district?.id;
    if (!district?.playable || !(today || practice === district.id)) return;
    if (stageApiRef.current?.performAction()) return;
    // Sin WebGL, o con el mapa todavía sin cargar o caído: el avance se cuenta acá con la misma cantidad de acciones.
    const next = (fallbackCounts[district.id] || 0) + 1;
    setFallbackCounts((counts) => ({ ...counts, [district.id]: next }));
    sfx.play('click');
    handleProgress(district.id, Math.min(1, next / district.actionsToComplete));
    if (next >= district.actionsToComplete) handleComplete(district.id);
  }, [route, progress.litDistricts, story.pending, day, practice, fallbackCounts, sfx, handleProgress, handleComplete]);

  // Tocar un fragmento en una maqueta: se guarda (una sola vez) y aparece su tarjeta.
  const handleFragment = useCallback((id) => {
    setStory((current) => Story.findFragment(current, id));
    setShownFragment(id);
    sfx.play('tvOn');
  }, [sfx]);

  const classifiedProgress = useCallback((value) => setClassified((current) => (current.revealed ? current : { ...current, progress: value })), []);
  const revealClassified = useCallback(() => {
    setClassified({ progress: 1, revealed: true });
    setStory((current) => Story.findFragment(current, SIGNAL_FRAGMENT)); // la señal del 13 es el fragmento número 13
    try { window.localStorage.setItem(CLASSIFIED_KEY, 'revealed'); } catch { /* sin storage */ }
    sfx.play('ignite');
  }, [sfx]);

  const resetAll = useCallback(async () => {
    try {
      await progress.reset();
      try {
        for (const key of Object.keys(localStorage)) if (key.startsWith(GAMES_PREFIX)) localStorage.removeItem(key);
        localStorage.removeItem(CLASSIFIED_KEY);
        localStorage.removeItem(STORY_KEY);
      } catch { /* El progreso principal ya se reinició. */ }
      notify('Panem volvió a apagarse.');
    } catch { notify('No se pudo reiniciar en la nube; revisá tu conexión.'); }
    setStory(Story.createStory());
    setShownFragment(null);
    setPractice(null);
    setResetEpoch((n) => n + 1);
    setFallbackCounts({});
    setClassified({ progress: 0, revealed: false });
    setInteraction({ districtId: null, value: 0 });
    setBurning(false);
    router.push('/');
  }, [progress, notify, router]);

  const value = {
    route, progress, story, storyReady, day, phase, decideTesserae, findFragment, markGamesEnded, resetEpoch, bulletin, showBulletin: setBulletin, closeBulletin, shownFragment, closeFragment, handleFragment, practice, replayDay, audioState, startAudio, toggleSound, sfx, hovered, setHovered,
    interaction, performAction, retryMinigame, minigameInput, selectDistrict, goToMap, classified, classifiedProgress, revealClassified, handleProgress, handleMatch, handleComplete,
    stageApiRef, webglFailed, setWebglFailed, mapFailed, setMapFailed, finalePlaying, setFinalePlaying,
    burning, setBurning, visibleLit, reducedMotion, notify, resetAll,
  };

  return (
    <PanemContext.Provider value={value}>
      {children}
      <CapitolBulletin />
      <FragmentCard />
      <div className="toast" role="status" aria-live="polite" data-show={toast ? 'true' : 'false'}>{toast}</div>
    </PanemContext.Provider>
  );
}
