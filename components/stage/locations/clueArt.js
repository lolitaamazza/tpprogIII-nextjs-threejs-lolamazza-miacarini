import { canvasTexture } from './builders.js';

// Las caras de lo que se encuentra en una escena (el `art` de cada interactable), dibujadas en un canvas.
const ART = {
  // La hoja de la libreta de Ash: una raya por cada vez que pidió comida, y las dos de su hermana.
  libreta: () => canvasTexture((ctx, s) => {
    ctx.fillStyle = '#e4d8bb';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(80,110,150,0.35)';
    for (let y = s * 0.2; y < s; y += s * 0.12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }
    ctx.strokeStyle = '#2b2620';
    ctx.lineWidth = s * 0.018;
    ctx.font = `${s * 0.1}px Georgia, serif`;
    ctx.fillStyle = '#2b2620';
    ctx.fillText('Ash', s * 0.08, s * 0.16);
    const tally = (x, y, n) => {
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(x + i * s * 0.05, y); ctx.lineTo(x + i * s * 0.05 + s * 0.01, y + s * 0.1); ctx.stroke(); }
    };
    tally(s * 0.1, s * 0.3, 4);
    tally(s * 0.4, s * 0.3, 3);
    ctx.fillText('Hermana', s * 0.08, s * 0.62);
    tally(s * 0.1, s * 0.68, 2);
  }, 256),
  // El cartel de la cuota de la mina, de chapa.
  cartel: () => canvasTexture((ctx, s) => {
    ctx.fillStyle = '#b9ad94';
    ctx.fillRect(0, 0, s, s * 0.62);
    ctx.strokeStyle = '#5a1c14';
    ctx.lineWidth = s * 0.03;
    ctx.strokeRect(s * 0.04, s * 0.04, s * 0.92, s * 0.54);
    ctx.fillStyle = '#5a1c14';
    ctx.textAlign = 'center';
    ctx.font = `bold ${s * 0.09}px Georgia, serif`;
    ctx.fillText('CUOTA DIARIA', s / 2, s * 0.2);
    ctx.font = `bold ${s * 0.15}px Georgia, serif`;
    ctx.fillText('40 TONELADAS', s / 2, s * 0.39);
    ctx.font = `${s * 0.06}px Georgia, serif`;
    ctx.fillText('MINA DEL DISTRITO 12', s / 2, s * 0.51);
  }, 256, 0.62),
  // El aviso clavado en la torre del 11: el castigo en la plaza (el fragmento del 11).
  aviso: () => canvasTexture((ctx, s) => {
    ctx.fillStyle = '#ddd2b6';
    ctx.fillRect(0, 0, s, s * 1.3);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(90,70,40,${Math.random() * 0.12})`; ctx.fillRect(Math.random() * s, Math.random() * s * 1.3, 2 + Math.random() * 10, 1 + Math.random() * 6); }
    ctx.fillStyle = '#5a1c14';
    ctx.textAlign = 'center';
    ctx.font = `bold ${s * 0.14}px Georgia, serif`;
    ctx.fillText('AVISO', s / 2, s * 0.2);
    ctx.fillStyle = '#2b2620';
    ctx.font = `bold ${s * 0.075}px Georgia, serif`;
    ctx.fillText('CASTIGO PÚBLICO', s / 2, s * 0.38);
    ctx.font = `${s * 0.06}px Georgia, serif`;
    ['Por comer fruta del huerto.', 'Mañana al mediodía', 'en la plaza del distrito.', 'Asistencia obligatoria.'].forEach((line, i) => ctx.fillText(line, s / 2, s * (0.56 + i * 0.12)));
  }, 256, 1.3),
  // Un sinsajo rayado en la roca, con un 6 al lado.
  nicho: () => canvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(245,232,205,0.95)';
    ctx.lineWidth = s * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(s * 0.42, s * 0.5, s * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.56); ctx.quadraticCurveTo(s * 0.36, s * 0.42, s * 0.5, s * 0.5); // cuerpo
    ctx.quadraticCurveTo(s * 0.56, s * 0.38, s * 0.66, s * 0.34); // cabeza
    ctx.moveTo(s * 0.38, s * 0.48); ctx.quadraticCurveTo(s * 0.34, s * 0.28, s * 0.5, s * 0.22); // ala
    ctx.moveTo(s * 0.5, s * 0.5); ctx.lineTo(s * 0.46, s * 0.66); // pata
    ctx.stroke();
    ctx.font = `bold ${s * 0.26}px Georgia, serif`;
    ctx.fillStyle = 'rgba(245,232,205,0.95)';
    ctx.fillText('6', s * 0.76, s * 0.62);
  }, 256),
};

export function clueArt(name) {
  return ART[name]?.() ?? null;
}
