import { PHASE_PATH } from './simulation.js';

// El guardado ya hidratado manda sobre una URL anterior. La navegación puede
// tardar (compilación en desarrollo), pero nunca debe ocultar una partida lista.
export function gamesView({chapter,run,ready,gate}) {
 const activeChapter=run?.phase || 'reaping';
 return {chapter:activeChapter,canShow:gate==='allowed'&&ready,
  redirect:gate==='allowed'&&ready&&chapter!==activeChapter?PHASE_PATH[activeChapter]:null};
}
