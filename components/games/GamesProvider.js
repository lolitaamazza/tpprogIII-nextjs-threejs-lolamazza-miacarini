'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { usePanem } from '@/components/panem/PanemProvider';
import { getFirebaseServices } from '@/lib/firebase';
import { advanceRun, createRun, prepareRun, sameRun, selectTribute, validateRun } from '@/lib/games/simulation';

import {drawPaper,finishReaping} from '@/lib/games/reaping';

const Context = createContext(null);
const keyFor = (uid) => `panem-games-v1:${uid || 'guest'}`;
export const useGames = () => useContext(Context);

export default function GamesProvider({ children }) {
  const { progress } = usePanem();
  const uid = progress.authUser?.uid || null;
  const [state, setState] = useState({ account: undefined, run: null, ready: false, status: 'local', error: '', conflict: null });
  const stateRef = useRef(state);
  const remoteBase = useRef(null);
  const generation = useRef(0);
  const saving = useRef(false);
  const publish = useCallback((patch) => {
    stateRef.current = { ...stateRef.current, ...patch };
    setState(stateRef.current);
  }, []);
  const store = useCallback((run) => {
    try { window.localStorage.setItem(keyFor(uid), JSON.stringify(run)); return ''; }
    catch { return 'El navegador no permite guardar. Podés continuar, pero descargá una copia antes de salir.'; }
  }, [uid]);

  useEffect(() => {
    const epoch = ++generation.current;
    remoteBase.current = null;
    saving.current = false;
    const hydrate = async () => {
      let local = null;
      let error = '';
      try {
        const raw = window.localStorage.getItem(keyFor(uid));
        if (raw && raw !== 'null') {
          const parsed = JSON.parse(raw);
          if (validateRun(parsed)) local = parsed;
          else error = 'La partida guardada no es compatible. No se reemplazó el archivo anterior.';
        }
      } catch { error = 'No se pudo leer la partida local.'; }
      if (epoch !== generation.current) return;
      publish({ account: uid, run: local, ready: true, status: 'local', error, conflict: null });
      if (!uid) return;
      try {
        const snap = await getDoc(doc(getFirebaseServices().db, 'users', uid, 'runs', 'active'));
        if (epoch !== generation.current) return;
        const remote = snap.exists() ? snap.data().snapshot : null;
        if (remote && !validateRun(remote)) { publish({ error: 'La copia de nube usa un formato incompatible. Podés seguir con la copia local.' }); return; }
        remoteBase.current = remote;
        const current = stateRef.current.run;
        if (!current && remote) { const issue = store(remote); publish({ run: remote, status: 'cloud', error: issue }); }
        else if (remote && !sameRun(current, remote)) publish({ conflict: remote, status: 'conflict' });
        else publish({ status: sameRun(current, remote) && remote ? 'cloud' : 'local' });
      } catch { if (epoch === generation.current) publish({ status: 'local', error: 'La nube no está disponible. La partida sigue guardándose en este navegador.' }); }
    };
    // Ceder un ciclo evita actualizaciones sincrónicas del efecto y conserva el HTML inicial.
    const timer = setTimeout(hydrate, 0);
    const changed = (event) => {
      if (event.key !== keyFor(uid) || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue);
        if (validateRun(incoming) && !sameRun(stateRef.current.run, incoming)) publish({ conflict: incoming, status: 'conflict', error: 'Otra pestaña cambió la partida. Elegí cuál conservar.' });
      } catch { /* conservar copia válida */ }
    };
    window.addEventListener('storage', changed);
    return () => { generation.current += 1; clearTimeout(timer); window.removeEventListener('storage', changed); };
  }, [uid, publish, store]);

  const update = useCallback((recipe) => {
    if (stateRef.current.account !== uid || !stateRef.current.ready || stateRef.current.conflict || saving.current) return null;
    const next = recipe(stateRef.current.run);
    if (!next || next === stateRef.current.run || !validateRun(next)) return stateRef.current.run;
    const error = store(next);
    publish({ run: next, error, status: 'local' });
    return next;
  }, [store, publish, uid]);

  const saveCloud = useCallback(async () => {
    const run = stateRef.current.run;
    if (stateRef.current.account !== uid || !uid || !run || stateRef.current.conflict || saving.current) return;
    const epoch = generation.current;
    const base = remoteBase.current;
    saving.current = true;
    publish({ status: 'saving', error: '' });
    try {
      const ref = doc(getFirebaseServices().db, 'users', uid, 'runs', 'active');
      const result = await runTransaction(getFirebaseServices().db, async (tx) => {
        const existing = await tx.get(ref);
        const remote = existing.exists() ? existing.data().snapshot : null;
        if (remote && !validateRun(remote)) throw new Error('invalid-remote');
        if (!sameRun(remote, base) && !sameRun(remote, run)) return remote || 'deleted';
        tx.set(ref, { userId: uid, snapshot: run, updatedAt: serverTimestamp() });
        return null;
      });
      if (epoch !== generation.current) return;
      if (result === 'deleted') { remoteBase.current = null; publish({ status: 'local', error: 'La copia de nube fue eliminada en otro dispositivo. Volvé a guardar si querés restaurarla.' }); }
      else if (result) { remoteBase.current = result; publish({ conflict: result, status: 'conflict' }); }
      else { remoteBase.current = run; publish({ status: 'cloud' }); }
    } catch { if (epoch === generation.current) publish({ status: 'local', error: 'No se pudo guardar en la nube. Tu copia local se conserva.' }); }
    finally { if (epoch === generation.current) saving.current = false; }
  }, [uid, publish]);

  const resolveConflict = useCallback((useIncoming) => {
    const chosen = useIncoming ? stateRef.current.conflict : stateRef.current.run;
    const error = store(chosen);
    publish({ run: chosen, conflict: null, status: 'local', error });
  }, [store, publish]);
  const start = () => update(() => createRun(crypto.getRandomValues(new Uint32Array(1))[0], crypto.randomUUID()));
  const draw = (all = false) => update((run) => drawPaper(run, all));
  const revealStage = () => update(finishReaping);
  const skipReaping = () => update((run) => finishReaping(drawPaper(run, true)));
  const select = (id) => update((run) => run && selectTribute(run, id));
  const prepare = (choices) => update((run) => run && prepareRun(run, choices, progress.litDistricts));
  const advance = (strategy) => update((run) => run && advanceRun(run, strategy));
  const exportRun = () => {
    if (!stateRef.current.run) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(stateRef.current.run, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `panem-${stateRef.current.run.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importRun = async (file) => {
    if (!file || file.size > 1000000 || saving.current || stateRef.current.conflict) return;
    const epoch = generation.current;
    try {
      const incoming = JSON.parse(await file.text());
      if (epoch !== generation.current) return;
      if (!validateRun(incoming)) throw new Error('invalid');
      if (stateRef.current.run && !sameRun(stateRef.current.run, incoming)) publish({ conflict: incoming, status: 'conflict', error: 'La copia importada es diferente. Elegí cuál conservar.' });
      else publish({ run: incoming, status: 'local', error: store(incoming) });
    } catch { publish({ error: 'El archivo no contiene una partida válida de esta versión.' }); }
  };
  return <Context.Provider value={{ ...state, ready: state.ready && state.account === uid, run: state.account === uid ? state.run : null, uid, start, draw, revealStage, skipReaping, select, prepare, advance, saveCloud, resolveConflict, exportRun, importRun }}>{children}</Context.Provider>;
}
