// Reglas puras del progreso. Sin imports con alias: se prueba con `node --test`.
import { PLAYABLE_IDS, DISTRICT_ROUTE_IDS } from '../data/districts.js';

export const FINAL_MESSAGES = ['rebelion', 'memoria'];
export const EMPTY_PROGRESS = Object.freeze({ litDistricts: [], visited: [], finalMessage: null, completedAt: null });

function cleanIds(list, allowed) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(String).filter((id) => allowed.includes(id)))];
}

export function canEnterCapitol(progress) {
  return cleanIds(progress?.litDistricts, PLAYABLE_IDS).length >= 3;
}

export function normalizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_PROGRESS, litDistricts: [], visited: [] };
  const lit = cleanIds(value.litDistricts, PLAYABLE_IDS);
  const litDistricts = PLAYABLE_IDS.filter((id) => lit.includes(id));
  const visited = cleanIds(value.visited, DISTRICT_ROUTE_IDS);
  const finalMessage = canEnterCapitol({ litDistricts }) && FINAL_MESSAGES.includes(value.finalMessage)
    ? value.finalMessage : null;
  let completedAt = null;
  if (finalMessage) completedAt = Number.isFinite(value.completedAt) ? Math.trunc(value.completedAt) : 0;
  return { litDistricts, visited, finalMessage, completedAt };
}

export function mergeProgress(a, b) {
  return normalizeProgress({
    litDistricts: [...(a?.litDistricts ?? []), ...(b?.litDistricts ?? [])],
    visited: [...(a?.visited ?? []), ...(b?.visited ?? [])],
    finalMessage: a?.finalMessage || b?.finalMessage || null,
    completedAt: a?.completedAt ?? b?.completedAt ?? null,
  });
}

export function sameProgress(a, b) {
  return JSON.stringify(normalizeProgress(a)) === JSON.stringify(normalizeProgress(b));
}

function changed(previous, next) {
  return sameProgress(previous, next) ? previous : next;
}

export function withLitDistrict(progress, id) {
  return changed(progress, normalizeProgress({ ...progress, litDistricts: [...progress.litDistricts, String(id)] }));
}

export function withVisited(progress, id) {
  return changed(progress, normalizeProgress({ ...progress, visited: [...progress.visited, String(id)] }));
}

export function withFinalMessage(progress, message, now) {
  if (progress.finalMessage || !canEnterCapitol(progress) || !FINAL_MESSAGES.includes(message)) return progress;
  return normalizeProgress({ ...progress, finalMessage: message, completedAt: now });
}

// 'loading' mientras no se conozca el progreso real (guardado local leído y, con Firebase, mezcla con la nube hecha);
// con los 3 emblemas ya a la vista no hace falta esperar. Después: 'allowed' o 'blocked'.
export function capitolGate({ ready, synced, progress }) {
  if (!ready) return 'loading';
  if (canEnterCapitol(progress)) return 'allowed';
  return synced ? 'blocked' : 'loading';
}
