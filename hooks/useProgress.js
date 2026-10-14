'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseServices, hasFirebaseConfig } from '@/lib/firebase';
import {
  EMPTY_PROGRESS, mergeProgress, normalizeProgress, withFinalMessage, withLitDistrict, withVisited,
} from '@/lib/progress';

const KEY = 'panem-chispa-v1';
const SYNC_WAIT_MS = 4000; // sin red o con Firebase caído no se espera la nube para siempre

function readLocal() {
  try { return normalizeProgress(JSON.parse(window.localStorage.getItem(KEY) || 'null')); }
  catch { return normalizeProgress(null); }
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
function remotePayload(user, progress) {
  return { userId: user.uid, authProvider: getProvider(user), ...progress, updatedAt: serverTimestamp() };
}

export function useProgress() {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const progressRef = useRef(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false); // el progreso ya incluye lo guardado en la nube (o no hay nube)
  const [storageOK, setStorageOK] = useState(true);
  const [syncState, setSyncState] = useState('local');
  const [authUser, setAuthUser] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const remoteUserRef = useRef(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const update = useCallback((recipe) => {
    const next = recipe(progressRef.current);
    if (next === progressRef.current) return;
    progressRef.current = next;
    setProgress(next);
    setStorageOK(saveLocal(next));
  }, []);

  useEffect(() => {
    const local = readLocal();
    progressRef.current = local;
    // La lectura local se hace en un efecto para evitar diferencias entre SSR e hidratación.
    const timeout = window.setTimeout(() => { setProgress(local); setReady(true); if (!hasFirebaseConfig) setSynced(true); }, 0);
    if (!hasFirebaseConfig) return () => clearTimeout(timeout);
    const { auth, db } = getFirebaseServices();
    let active = true;
    const giveUp = window.setTimeout(() => { if (active) setSynced(true); }, SYNC_WAIT_MS);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        remoteUserRef.current = null;
        setRemoteUser(null);
        setAuthUser(null);
        setSyncState('connecting');
        try { await signInAnonymously(auth); }
        catch (error) { if (active) { setAuthError(error.code || 'auth/anonymous-sign-in-failed'); setSyncState('local'); setSynced(true); } }
        return;
      }
      try {
        setSyncState('connecting');
        await saveProfile(user, db);
        const snapshot = await getDoc(doc(db, 'progress', user.uid));
        if (!active) return;
        const merged = mergeProgress(progressRef.current, snapshot.exists() ? snapshot.data() : null);
        progressRef.current = merged;
        setProgress(merged);
        setStorageOK(saveLocal(merged));
        remoteUserRef.current = user;
        setRemoteUser(user);
        setAuthUser(user);
        setAuthError('');
        setSyncState('cloud');
        setSynced(true);
      } catch (error) {
        console.warn('No se pudo sincronizar el avance:', error);
        if (active) { setAuthUser(user); setSyncState('local'); setAuthError(error.code || 'firestore/sync-failed'); setSynced(true); }
      }
    });
    return () => { active = false; clearTimeout(timeout); clearTimeout(giveUp); unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!ready || !remoteUser) return;
    const { db } = getFirebaseServices();
    setDoc(doc(db, 'progress', remoteUser.uid), remotePayload(remoteUser, progress), { merge: true })
      .catch((error) => { console.warn('Firestore no disponible:', error); setSyncState('local'); });
  }, [progress, ready, remoteUser]);

  const lightDistrict = useCallback((id) => update((p) => withLitDistrict(p, id)), [update]);
  const markVisited = useCallback((id) => update((p) => withVisited(p, id)), [update]);
  const chooseFinalMessage = useCallback((message) => update((p) => withFinalMessage(p, message, Date.now())), [update]);
  const reset = useCallback(async () => {
    update(() => normalizeProgress(null));
    const user = remoteUserRef.current;
    if (user && hasFirebaseConfig) {
      const { db } = getFirebaseServices();
      await setDoc(doc(db, 'progress', user.uid), remotePayload(user, normalizeProgress(null)), { merge: true });
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
    ...progress, ready, synced, storageOK, syncState, authUser, authError, authLoading,
    firebaseConfigured: hasFirebaseConfig, lightDistrict, markVisited, chooseFinalMessage, reset,
    signInWithGoogle, submitEmail, continueAsGuest,
  };
}
