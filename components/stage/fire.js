// Fuego 2D para la secuencia "Panem arde": llamas y brasas como partículas aditivas sobre un canvas. Solo navegador.
// Sin dependencias: los sprites se pintan una vez (gradiente radial por etapa de vida) y cada cuadro solo los estampa.
// La intensidad sube y baja suavemente hacia un objetivo (`setTarget`): nada parpadea de golpe.

const SPRITE_SIZE = 64;
const SPRITE_STEPS = 28;
// Color según la edad de la llama: núcleo casi blanco → amarillo → naranja → rojo → brasa oscura.
const RAMP = [[255, 232, 150], [255, 190, 70], [255, 125, 25], [205, 45, 12], [70, 20, 14]];
const MAX_FLAME = 700; // con vida media de 1,4 s y ≤ 440 nacimientos/s quedan ~620 vivas: el anillo no pisa llamas activas
const MAX_EMBER = 90;

function lerp(a, b, t) { return a + (b - a) * t; }

function rampColor(t) {
  const scaled = Math.min(Math.max(t, 0), 1) * (RAMP.length - 1);
  const i = Math.min(Math.floor(scaled), RAMP.length - 2);
  const f = scaled - i;
  return RAMP[i].map((c, k) => Math.round(lerp(c, RAMP[i + 1][k], f)));
}

function makeSprites() {
  return Array.from({ length: SPRITE_STEPS }, (_, step) => {
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext('2d');
    const [r, g, b] = rampColor(step / (SPRITE_STEPS - 1));
    const gradient = ctx.createRadialGradient(SPRITE_SIZE / 2, SPRITE_SIZE / 2, 0, SPRITE_SIZE / 2, SPRITE_SIZE / 2, SPRITE_SIZE / 2);
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(0.4, `rgba(${r},${g},${b},0.55)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return canvas;
  });
}

// `root` recibe la variable CSS --burn (0 a 1) para que el resplandor y los bordes sigan al fuego.
export function createFire(canvas, root) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-2d-no-disponible');
  const sprites = makeSprites();

  // Arreglos tipados: nada se aloca por cuadro.
  const flame = {
    alive: new Uint8Array(MAX_FLAME), x: new Float32Array(MAX_FLAME), y: new Float32Array(MAX_FLAME),
    vx: new Float32Array(MAX_FLAME), vy: new Float32Array(MAX_FLAME), age: new Float32Array(MAX_FLAME),
    life: new Float32Array(MAX_FLAME), size: new Float32Array(MAX_FLAME), seed: new Float32Array(MAX_FLAME),
  };
  const ember = {
    alive: new Uint8Array(MAX_EMBER), x: new Float32Array(MAX_EMBER), y: new Float32Array(MAX_EMBER),
    vy: new Float32Array(MAX_EMBER), age: new Float32Array(MAX_EMBER), life: new Float32Array(MAX_EMBER),
    seed: new Float32Array(MAX_EMBER), size: new Float32Array(MAX_EMBER),
  };

  let width = 1;
  let height = 1;
  let dpr = 1;
  let intensity = 0;
  let target = 0;
  let time = 0;
  let lastWritten = -1;
  let frame = 0;
  let last = 0;
  let flameCursor = 0;
  let emberCursor = 0;
  let flameDebt = 0;
  let emberDebt = 0;
  let disposed = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); // el fuego no necesita más resolución
    width = Math.max(canvas.clientWidth, 1);
    height = Math.max(canvas.clientHeight, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  function spawnFlame() {
    const i = flameCursor;
    flameCursor = (flameCursor + 1) % MAX_FLAME;
    const x = Math.random() * width;
    // Lenguas: la altura varía a lo ancho y se mueve con el tiempo.
    const tongue = 0.62 + 0.38 * Math.sin(x * 0.011 + time * 1.3) * Math.sin(x * 0.0047 - time * 0.7);
    const reach = (height / 900) * (0.45 + 0.85 * intensity) * tongue;
    flame.alive[i] = 1;
    flame.x[i] = x;
    flame.y[i] = height + 20;
    flame.vx[i] = (Math.random() - 0.5) * 36;
    flame.vy[i] = -(380 + Math.random() * 320) * reach; // con intensidad 1 las llamas llegan a ~60 % de la altura
    flame.age[i] = 0;
    flame.life[i] = 0.9 + Math.random() * 1.0;
    flame.size[i] = (60 + Math.random() * 90) * (0.7 + 0.5 * intensity) * Math.max(width / 1100, 0.6);
    flame.seed[i] = Math.random() * 100;
  }

  function spawnEmber() {
    const i = emberCursor;
    emberCursor = (emberCursor + 1) % MAX_EMBER;
    ember.alive[i] = 1;
    ember.x[i] = Math.random() * width;
    ember.y[i] = height * (0.75 + Math.random() * 0.3);
    ember.vy[i] = -(40 + Math.random() * 110);
    ember.age[i] = 0;
    ember.life[i] = 2.5 + Math.random() * 3;
    ember.seed[i] = Math.random() * 100;
    ember.size[i] = 1.2 + Math.random() * 2.2;
  }

  function step(dt) {
    time += dt;
    intensity += (target - intensity) * (1 - Math.exp(-dt * (target > intensity ? 0.9 : 2.2)));
    if (Math.abs(intensity - target) < 0.002) intensity = target;

    // Tasa de nacimiento: con el ancho de la pantalla y la intensidad, para que la pared de fuego sea pareja.
    const flameRate = Math.min(440, Math.max((width / 3.2) * 1.5, 300)) * intensity; // piso: en celular el ancho solo no alcanza
    flameDebt += flameRate * dt;
    while (flameDebt >= 1) { spawnFlame(); flameDebt -= 1; }
    emberDebt += 38 * intensity * dt;
    while (emberDebt >= 1) { spawnEmber(); emberDebt -= 1; }

    for (let i = 0; i < MAX_FLAME; i++) {
      if (!flame.alive[i]) continue;
      flame.age[i] += dt;
      if (flame.age[i] >= flame.life[i]) { flame.alive[i] = 0; continue; }
      // Turbulencia: el aire caliente zigzaguea y se frena al subir.
      flame.vx[i] += Math.sin(flame.y[i] * 0.02 + flame.age[i] * 6 + flame.seed[i]) * 90 * dt;
      flame.vy[i] *= 1 - 0.55 * dt;
      flame.x[i] += flame.vx[i] * dt;
      flame.y[i] += flame.vy[i] * dt;
    }
    for (let i = 0; i < MAX_EMBER; i++) {
      if (!ember.alive[i]) continue;
      ember.age[i] += dt;
      if (ember.age[i] >= ember.life[i]) { ember.alive[i] = 0; continue; }
      ember.x[i] += Math.sin(ember.age[i] * 1.7 + ember.seed[i]) * 30 * dt;
      ember.y[i] += ember.vy[i] * dt;
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < MAX_FLAME; i++) {
      if (!flame.alive[i]) continue;
      const t = flame.age[i] / flame.life[i];
      const sprite = sprites[Math.min(Math.floor(t * SPRITE_STEPS), SPRITE_STEPS - 1)];
      const size = flame.size[i] * (1.05 - t * 0.55);
      ctx.globalAlpha = Math.min(1, (1 - t) ** 1.15 * 0.4 * (0.4 + intensity));
      ctx.drawImage(sprite, flame.x[i] - size / 2, flame.y[i] - size / 2, size, size);
    }
    ctx.fillStyle = '#ffb347';
    for (let i = 0; i < MAX_EMBER; i++) {
      if (!ember.alive[i]) continue;
      const t = ember.age[i] / ember.life[i];
      // Brillo suave y lento (≈0,5 Hz): nunca un destello brusco.
      ctx.globalAlpha = (1 - t) * (0.55 + 0.35 * Math.sin(ember.age[i] * 3 + ember.seed[i])) * Math.min(1, intensity * 1.5);
      ctx.beginPath();
      ctx.arc(ember.x[i], ember.y[i], ember.size[i], 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(timestamp) {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    const dt = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
    last = timestamp;
    step(dt);
    draw();
    if (root && Math.abs(intensity - lastWritten) > 0.01) {
      lastWritten = intensity;
      root.style.setProperty('--burn', intensity.toFixed(3));
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    setTarget(value) { target = Math.min(Math.max(value, 0), 1); },
    getIntensity() { return intensity; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
