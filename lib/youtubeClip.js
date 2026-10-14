// Reproductor del clip incrustado: API de iframes de YouTube sobre el dominio sin cookies. Solo navegador.
import { CLIP, clipEmbedSrc } from './introTimeline.js';

let apiPromise = null;

export function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sin-ventana'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => { apiPromise = null; reject(new Error('api-bloqueada')); };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

// Arma el iframe (sin reproducir) y devuelve { play, setSound, getTime, destroy }. Los eventos llegan por callbacks.
// Modos de sonido: 'on' (volumen 100), 'silent' (sin mute pero con volumen 0) y 'muted' (con mute). Chrome pausa los
// videos con mute cuando la pestaña no se ve; con volumen 0 siguen corriendo, y el clip arranca antes de mostrarse.
export async function createClipPlayer(container, { origin, onPlaying, onEnded, onError }) {
  const YT = await loadYouTubeApi();
  const iframe = document.createElement('iframe');
  iframe.className = 'tv-clip-frame';
  iframe.src = clipEmbedSrc(origin);
  iframe.title = `Fragmento del video oficial: ${CLIP.title} (${CLIP.channel})`;
  iframe.allow = 'autoplay; encrypted-media';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.setAttribute('tabindex', '-1');
  container.appendChild(iframe);

  let player = null;
  let ready = false;
  let wantPlay = false;
  let sound = 'on';
  let destroyed = false;
  let reported = false;

  const apply = () => {
    if (!ready || destroyed) return;
    if (sound === 'muted') player.mute();
    else { player.unMute(); player.setVolume(sound === 'silent' ? 0 : 100); }
    if (wantPlay) { wantPlay = false; player.playVideo(); } // el iframe ya está en el segundo de arranque (parámetro start)
  };

  player = new YT.Player(iframe, {
    events: {
      onReady: () => { ready = true; apply(); },
      onStateChange: (event) => {
        if (destroyed) return;
        if (event.data === YT.PlayerState.PLAYING && !reported) { reported = true; onPlaying?.(); }
        if (event.data === YT.PlayerState.ENDED) onEnded?.();
      },
      onError: (event) => { if (!destroyed) onError?.(event.data); },
    },
  });

  return {
    play() { wantPlay = true; apply(); },
    setSound(mode) { sound = mode; apply(); },
    // Segundo actual del video: permite cortar justo antes de que YouTube muestre su pantalla final.
    getTime() {
      if (!ready || destroyed) return 0;
      try { return Number(player.getCurrentTime()) || 0; } catch { return 0; }
    },
    destroy() {
      destroyed = true;
      try { player.destroy(); } catch { /* el reproductor ya no estaba */ }
      iframe.remove();
    },
  };
}
