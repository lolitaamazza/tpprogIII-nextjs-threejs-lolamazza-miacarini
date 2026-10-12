'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sceneBySlug, sceneSlug } from '@/data/chapters';
import { useProgress } from '@/hooks/useProgress';
import Hero from '@/components/Hero';
import ArenaMap from '@/components/ArenaMap';
import DistrictsView from '@/components/DistrictsView';
import PeopleView from '@/components/PeopleView';
import StoryDialog from '@/components/StoryDialog';
import MotionLayer from '@/components/MotionLayer';
import AuthPanel from '@/components/AuthPanel';
import SignalArchive from '@/components/SignalArchive';

export default function Experience({ initialChapterId }) {
  const router = useRouter();
  const progress = useProgress();
  const [view, setView] = useState('arena');
  const [mode, setMode] = useState(initialChapterId === 'final' ? 'final' : initialChapterId ? 'scene' : null);
  const [sceneId, setSceneId] = useState(sceneBySlug[initialChapterId] || null);
  const [sector, setSector] = useState(null);
  const [person, setPerson] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const audio = useRef(null);

  // Cada ruta monta Experience con su propia key desde un Server Component.
  // La carga inicial de Firebase se refleja en el estado derivado del epílogo.
  const dialogMode = mode === 'final' && progress.ending ? 'ending' : mode;

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => () => {
    if (audio.current) {
      audio.current.oscillators.forEach((o) => { try { o.stop(); } catch {} o.disconnect(); });
      audio.current.context.close().catch(() => {});
      audio.current = null;
    }
  }, []);

  const closeDialog = useCallback(() => {
    setMode(null);
    if (initialChapterId) router.push('/');
  }, [initialChapterId, router]);
  const openScene = useCallback((id) => {
    if (!sceneSlug[id]) return;
    progress.markStarted();
    setSceneId(id);
    setMode(progress.clues.includes(id) ? 'collected' : 'scene');
    setView('arena');
    if (initialChapterId !== sceneSlug[id]) router.push(`/archivo/${sceneSlug[id]}`);
  }, [initialChapterId, progress, router]);
  const openFinal = useCallback(() => {
    if (progress.clues.length < 3) return;
    setSceneId(null);
    setMode(progress.ending ? 'ending' : 'final');
    if (initialChapterId !== 'final') router.push('/archivo/final');
  }, [initialChapterId, progress.clues.length, progress.ending, router]);
  const arena = useCallback(() => {
    setMode(null);
    setView('arena');
    if (initialChapterId) router.push('/#exploration');
    else document.getElementById('exploration')?.scrollIntoView({ behavior: 'smooth' });
  }, [initialChapterId, router]);
  const onCollect = useCallback((id) => {
    progress.discover(id);
    setSceneId(id);
    setMode('collected');
    setToast(`Fragmento recuperado · ${progress.clues.includes(id) ? progress.clues.length : Math.min(progress.clues.length + 1, 3)}/3`);
  }, [progress]);
  function onNext(id) {
    if (id === 'forest') openScene('lake');
    else if (id === 'lake') openScene('tower');
    else openFinal();
  }
  function onStart() { progress.markStarted(); setSceneId(null); setMode('intro'); }
  async function onReset() {
    try { await progress.reset(); setToast('Tu archivo se ha reiniciado.'); }
    catch { setToast('No se pudo reiniciar en la nube; revisa tu conexión.'); }
    setMode(null); setView('arena');
    if (initialChapterId) router.push('/');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function toggleSound() {
    try {
      if (!audio.current) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) throw new Error('Web Audio no soportado');
        const context = new Context();
        const oscillators = [73.42, 110, 146.83].map((freq, i) => {
          const o = context.createOscillator(); const gain = context.createGain();
          o.type = 'sine'; o.frequency.value = freq; gain.gain.value = .018 / (i + 1);
          o.connect(gain).connect(context.destination); o.start(); return o;
        });
        audio.current = { context, oscillators };
      }
      if (audio.current.context.state === 'running') {
        await audio.current.context.suspend(); setSoundOn(false);
      } else { await audio.current.context.resume(); setSoundOn(true); }
    } catch { setToast('El sonido no está disponible en este navegador.'); }
  }
  function changeView(next) { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  const hasCluesForFinal = progress.clues.length === 3;
  const motionPlace = dialogMode === 'intro' ? 'intro' : ['final','ending'].includes(dialogMode) ? 'final' : ['scene','collected'].includes(dialogMode) ? sceneId : null;
  return <>
    <header className="site-header">
      <button className="brand" onClick={() => { setMode(null); if (initialChapterId) router.push('/'); else changeView('arena'); }} aria-label="Panem, inicio"><span className="crest">➶</span> PANEM <small>ARCHIVOS DE LA RESISTENCIA</small></button>
      <nav aria-label="Exploración">
        <button data-view="arena" className={view === 'arena' ? 'active' : ''} onClick={() => changeView('arena')}>La arena</button>
        <button data-view="panem" className={view === 'panem' ? 'active' : ''} onClick={() => changeView('panem')}>Los distritos</button>
        <button data-view="people" className={view === 'people' ? 'active' : ''} onClick={() => changeView('people')}>Los rostros</button>
      </nav>
      <div className="header-actions">
        <span className="sync-indicator" title={progress.syncState === 'cloud' ? 'Firestore activo' : 'Guardado local'}>{progress.syncState === 'cloud' ? '● NUBE' : '○ LOCAL'}</span>
        {progress.firebaseConfigured && <button className="auth-trigger" onClick={() => setAuthOpen(true)}>{progress.authUser?.isAnonymous ? 'Invitado' : progress.authUser?.displayName || progress.authUser?.email || 'Acceder'}</button>}
        <button className="journal" onClick={() => setMode('journal')}>◈ <span>Mi archivo</span><b>{progress.clues.length}/3</b></button>
      </div>
    </header>
    {view === 'arena' && <main id="main"><Hero progress={progress} onStart={onStart} onScene={openScene} soundOn={soundOn} onSound={toggleSound} /><ArenaMap progress={progress} onScene={openScene} onSector={(id) => { setSector(id); setMode('sector'); }} onFinal={openFinal} storageOK={progress.storageOK} syncState={progress.syncState} /><SignalArchive onExplore={() => openScene('tower')} /></main>}
    {view === 'panem' && <DistrictsView onArena={() => changeView('arena')} />}
    {view === 'people' && <PeopleView onPerson={(index) => { setPerson(index); setMode('person'); }} />}
    <footer className="site-footer"><span>➶ PANEM · ECOS DE LA ARENA</span><p>Experiencia de fans · Historia original no oficial inspirada en The Hunger Games.</p><button onClick={() => setMode('reset')}>Reiniciar aventura</button></footer>
    <MotionLayer location={motionPlace} />
    {progress.ready && !!dialogMode && (dialogMode !== 'final' || hasCluesForFinal) && <StoryDialog key={`${dialogMode}-${sceneId}-${sector}-${person}`} mode={dialogMode} sceneId={sceneId} progress={progress} sector={sector} person={person} onClose={closeDialog} onScene={openScene} onCollect={onCollect} onNext={onNext} onBegin={() => { if (progress.clues.length) arena(); else openScene('forest'); }} onEnding={(ending) => { progress.chooseEnding(ending); setMode('ending'); }} onReset={onReset} onArena={arena} />}
    {!!dialogMode && dialogMode === 'final' && !hasCluesForFinal && progress.ready && <div className="route-message" role="alert">Para llegar al desenlace, recupera primero los tres fragmentos. <button className="outline" onClick={arena}>Volver al mapa</button></div>}
    {authOpen && <AuthPanel user={progress.authUser} authError={progress.authError} authLoading={progress.authLoading} onClose={() => setAuthOpen(false)} onGoogle={progress.signInWithGoogle} onSubmitEmail={progress.submitEmail} onContinueAsGuest={progress.continueAsGuest} />}
    <div id="toast" className={toast ? 'show' : ''} role="status" aria-live="polite">{toast}</div>
  </>;
}
