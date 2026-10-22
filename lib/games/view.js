import { PHASE_PATH } from './simulation.js';

// Sin pregunta pendiente, la arena sigue sola después de unos segundos (en pausa, no).
// Con el tributo caído no hay más preguntas y la transmisión va más rápido hasta el desenlace.
export const AUTO_ADVANCE = { watching: 6, fallen: 3.5 };
export function autoAdvance({run,encounter,paused}) {
 if (paused || encounter || run?.phase!=='arena') return null;
 const selected=run.tributes.find((t)=>t.id===run.selectedId);
 return selected?.alive ? AUTO_ADVANCE.watching : AUTO_ADVANCE.fallen;
}

// El guardado ya hidratado manda sobre una URL anterior. La navegación puede
// tardar (compilación en desarrollo), pero nunca debe ocultar una partida lista.
export function gamesView({chapter,run,ready,gate}) {
 const activeChapter=run?.phase || 'reaping';
 return {chapter:activeChapter,canShow:gate==='allowed'&&ready,
  redirect:gate==='allowed'&&ready&&chapter!==activeChapter?PHASE_PATH[activeChapter]:null};
}
