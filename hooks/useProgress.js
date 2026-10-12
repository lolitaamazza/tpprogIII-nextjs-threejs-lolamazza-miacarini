'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseServices, hasFirebaseConfig } from '@/lib/firebase';

const KEY = 'panem-ecos-v1'; // Conserva el progreso del proyecto HTML original.
const KEYS = ['forest', 'lake', 'tower'];
const EMPTY = { clues: [], ending: null, started: false };
function normalize(value) {
  if (!value || typeof value !== 'object') return { ...EMPTY };
  return {
    clues: [...new Set((Array.isArray(value.clues) ? value.clues : []).filter((id) => KEYS.includes(id)))],
    ending: ['truth', 'route'].includes(value.ending) ? value.ending : null,
    started: !!value.started,
  };
}
function readLocal() {
  try { return normalize(JSON.parse(window.localStorage.getItem(KEY) || 'null')); }
  catch { return { ...EMPTY }; }
}
function saveLocal(progress) {
  try { window.localStorage.setItem(KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}
function getProvider(user) { return user.isAnonymous ? 'anonymous' : user.providerData[0]?.providerId || 'password'; }
async function saveProfile(user, db) {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const profile = {
    userId: user.uid, email: user.email || null, displayName: user.displayName || null,
    photoURL: user.photoURL || null, isAnonymous: user.isAnonymous,
    authProvider: getProvider(user), lastLoginAt: serverTimestamp(),
  };
  if (!snapshot.exists()) profile.createdAt = serverTimestamp();
  await setDoc(userRef, profile, { merge: true });
}

export function useProgress() {
  const [progress, setProgress] = useState(EMPTY);
  const progressRef = useRef(EMPTY);
  const [ready, setReady] = useState(false);
  const [storageOK, setStorageOK] = useState(true);
  const [syncState, setSyncState] = useState('local');
  const [authUser, setAuthUser] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const remoteUserRef = useRef(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const update = useCallback((recipe) => {
    const next = normalize(typeof recipe === 'function' ? recipe(progressRef.current) : recipe);
    progressRef.current = next;
    setProgress(next);
    setStorageOK(saveLocal(next));
  }, []);

  useEffect(() => {
    const local = readLocal();
    progressRef.current = local;
    // La lectura local se hace en un efecto para evitar diferencias entre SSR e hidratación.
    const timeout = window.setTimeout(() => { setProgress(local); setReady(true); }, 0);
    if (!hasFirebaseConfig) return () => clearTimeout(timeout);
    const { auth, db } = getFirebaseServices();
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        remoteUserRef.current = null;
        setRemoteUser(null);
        setAuthUser(null);
        setSyncState('connecting');
        try { await signInAnonymously(auth); }
        catch (error) { if (active) { setAuthError(error.code || 'auth/anonymous-sign-in-failed'); setSyncState('local'); } }
        return;
      }
      try {
        setSyncState('connecting');
        await saveProfile(user, db);
        const snapshot = await getDoc(doc(db, 'progress', user.uid));
        if (!active) return;
        const remote = normalize(snapshot.exists() ? snapshot.data() : null);
        const current = progressRef.current;
        const merged = normalize({
          clues: [...current.clues, ...remote.clues],
          ending: current.ending || remote.ending,
          started: current.started || remote.started,
        });
        progressRef.current = merged;
        setProgress(merged);
        setStorageOK(saveLocal(merged));
        remoteUserRef.current = user;
        setRemoteUser(user);
        setAuthUser(user);
        setAuthError('');
        setSyncState('cloud');
      } catch (error) {
        console.warn('No se pudo sincronizar el avance:', error);
        if (active) { setAuthUser(user); setSyncState('local'); setAuthError(error.code || 'firestore/sync-failed'); }
      }
    });
    return () => { active = false; clearTimeout(timeout); unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!ready || !remoteUser) return;
    const { db } = getFirebaseServices();
    setDoc(doc(db, 'progress', remoteUser.uid), {
      userId: remoteUser.uid, authProvider: getProvider(remoteUser),
      clues: progress.clues, ending: progress.ending, started: progress.started,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch((error) => { console.warn('Firestore no disponible:', error); setSyncState('local'); });
  }, [progress, ready, remoteUser]);

  const discover = useCallback((id) => {
    if (!KEYS.includes(id)) return;
    update((current) => ({ ...current, clues: [...current.clues, id], started: true }));
  }, [update]);
  const markStarted = useCallback(() => update((p) => ({ ...p, started: true })), [update]);
  const chooseEnding = useCallback((ending) => {
    if (['truth','route'].includes(ending)) update((p) => ({ ...p, ending }));
  }, [update]);
  const reset = useCallback(async () => {
    update(EMPTY);
    const user = remoteUserRef.current;
    if (user && hasFirebaseConfig) {
      const { db } = getFirebaseServices();
      await setDoc(doc(db, 'progress', user.uid), {
        userId: user.uid, authProvider: getProvider(user),
        clues: [], ending: null, started: false, updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }, [update]);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true); setAuthError('');
    try { await signInWithPopup(getFirebaseServices().auth, new GoogleAuthProvider()); }
    catch (error) { setAuthError(error.code || 'auth/google-sign-in-failed'); throw error; }
    finally { setAuthLoading(false); }
  }, []);
  const submitEmail = useCallback(async ({ email, password, mode }) => {
    setAuthLoading(true); setAuthError('');
    try {
      const fn = mode === 'signup' ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      await fn(getFirebaseServices().auth, email, password);
    } catch (error) { setAuthError(error.code || 'auth/email-sign-in-failed'); throw error; }
    finally { setAuthLoading(false); }
  }, []);
  const continueAsGuest = useCallback(async () => {
    setAuthLoading(true); setAuthError('');
    try { await signOut(getFirebaseServices().auth); }
    catch (error) { setAuthError(error.code || 'auth/sign-out-failed'); throw error; }
    finally { setAuthLoading(false); }
  }, []);
  return {
    ...progress, ready, storageOK, syncState, authUser, authError, authLoading,
    firebaseConfigured: hasFirebaseConfig, discover, markStarted, chooseEnding, reset,
    signInWithGoogle, submitEmail, continueAsGuest,
  };
}
