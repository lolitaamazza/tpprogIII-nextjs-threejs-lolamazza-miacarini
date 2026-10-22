import * as THREE from 'three';
import { breakShards, createShards, endDrag, openShards, pickShard, revealProgress, shardLayout, startDrag, stepShards } from '../../lib/glitchShards.js';
import { openAreaFor } from './cameraPoses.js';

// Distrito 13: el Capitolio no tiene datos de este distrito, así que la imagen se rompe. La vista del mapa se congela
// en una textura y se parte en fragmentos (un solo InstancedMesh con un shader de señal rota) que se apartan del puntero
// y se pueden arrastrar. Debajo hay otra señal: la del Distrito 13. Cajas de rastreo con etiquetas siguen a los fragmentos.
// Referencias: "Corona Sunset" (cajas de rastreo), "3d Data Visualization" (bloques y redes) y "Scanning Animation".

const LABELS = ['NO DATA', 'ACCESS DENIED', 'SIGNAL LOST', 'D-13', 'REDACTED', 'UNKNOWN SOURCE', '0x13FF', 'TRACKING'];
const TRACKED = 9; // fragmentos con caja de rastreo
const LABEL_PX = { w: 150, h: 20 };

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

// La señal que hay debajo: una red de nodos, una silueta escaneada y, al descubrirla, la transmisión del 13.
// `u` son píxeles del lienzo por píxel de pantalla; `area` es lo que no tapa el encabezado y `win` la ventana que se abre.
function paintHidden(ctx, w, h, { seal, revealed, t = 0, u, area, win }) {
  const random = lcg(1313);
  const mono = (size, weight = 500) => `${weight} ${Math.round(size * u)}px ui-monospace, Menlo, monospace`;
  const X = (v) => v * w;
  const Y = (v) => v * h;
  ctx.save();
  ctx.fillStyle = '#020608';
  ctx.fillRect(0, 0, w, h);
  // grilla y red de nodos
  ctx.strokeStyle = 'rgba(120, 200, 220, 0.06)';
  ctx.lineWidth = u;
  for (let x = 0; x < w; x += 48 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 48 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  const nodes = Array.from({ length: 18 }, () => [random() * w, random() * h]);
  ctx.strokeStyle = 'rgba(143, 208, 216, 0.35)';
  ctx.beginPath();
  nodes.forEach(([x, y], i) => { const [nx, ny] = nodes[(i * 5 + 3) % nodes.length]; ctx.moveTo(x, y); ctx.lineTo(nx, ny); });
  ctx.stroke();
  ctx.fillStyle = '#8fd0d8';
  ctx.font = mono(11);
  nodes.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x, y, (2 + (i % 3)) * u, 0, Math.PI * 2); ctx.fill(); ctx.fillText(`${1300 + i * 7}`, x + 7 * u, y - 5 * u); });
  // bloques de píxeles
  ctx.fillStyle = 'rgba(232, 246, 248, 0.9)';
  for (let k = 0; k < 9; k += 1) {
    const bx = random() * w;
    const by = random() * h;
    for (let n = 0; n < 9; n += 1) if (random() < 0.6) ctx.fillRect(bx + (n % 3) * 8 * u, by + Math.floor(n / 3) * 8 * u, 7 * u, 7 * u);
  }
  // ficha del distrito, arriba a la izquierda de la zona libre
  const left = X(area.x0) + 24 * u;
  const top = Y(area.y0) + 96 * u; // debajo de la etiqueta del HUD
  ctx.fillStyle = '#e8f6f8';
  ctx.font = mono(34, 700);
  ctx.fillText('DISTRICT 13', left, top);
  ctx.font = mono(13);
  ctx.fillStyle = revealed ? '#8fe0a0' : '#ff6a5a';
  ctx.fillText(revealed ? 'STATUS: ALIVE' : 'STATUS: [REDACTED]', left, top + 24 * u);
  ctx.fillStyle = '#8fd0d8';
  ctx.fillText('FREQ 13.00 · SOURCE: UNDERGROUND', left, top + 44 * u);
  // silueta escaneada (cabeza y hombros) en el centro de la ventana, con ventanas de datos sobre la cara
  const cx = X((win.x0 + win.x1) / 2);
  const cy = Y(win.y0 + (win.y1 - win.y0) * 0.42);
  const s = Math.min(X(win.x1 - win.x0), Y(win.y1 - win.y0)) * 0.42;
  const body = new Path2D();
  body.ellipse(cx, cy - s * 0.35, s * 0.42, s * 0.55, 0, 0, Math.PI * 2);
  body.moveTo(cx - s * 0.2, cy + s * 0.12);
  body.lineTo(cx - s * 0.22, cy + s * 0.35);
  body.quadraticCurveTo(cx - s * 1.25, cy + s * 0.5, cx - s * 1.35, cy + s * 1.6);
  body.lineTo(cx + s * 1.35, cy + s * 1.6);
  body.quadraticCurveTo(cx + s * 1.25, cy + s * 0.5, cx + s * 0.22, cy + s * 0.35);
  body.lineTo(cx + s * 0.2, cy + s * 0.12);
  const fill = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  fill.addColorStop(0, '#0f1a1e'); fill.addColorStop(1, '#030607');
  ctx.fillStyle = fill;
  ctx.fill(body);
  ctx.strokeStyle = 'rgba(190, 235, 245, 0.55)';
  ctx.lineWidth = 2 * u;
  ctx.stroke(body);
  ctx.lineWidth = u;
  ctx.font = mono(11);
  for (let i = 0; i < 2; i += 1) {
    const wx = cx - s * (0.55 - i * 0.12);
    const wy = cy - s * (0.55 - i * 0.32);
    const ww = s * (0.9 + i * 0.2);
    const wh = s * 0.22;
    ctx.fillStyle = i ? '#1f3a40' : '#2c4a50';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.fillStyle = '#e8f6f8';
    ctx.fillText(i ? 'DEPTH -400 M' : 'SECTOR 13-B', wx + 5 * u, wy - 5 * u);
  }
  if (revealed) {
    // La transmisión: ocupa la ventana que dejan los pedazos al correrse.
    const x0 = X(win.x0);
    const y0 = Y(win.y0);
    const ww = X(win.x1 - win.x0);
    const wh = Y(win.y1 - win.y0);
    ctx.fillStyle = 'rgba(2, 6, 8, 0.72)';
    ctx.fillRect(x0, y0, ww, wh);
    ctx.strokeStyle = 'rgba(143, 208, 216, 0.6)';
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, ww - 1, wh - 1);
    const pad = Math.min(ww, wh) * 0.08;
    ctx.font = mono(12, 600);
    ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ff6a5a' : '#7a2a24';
    ctx.fillText('● LIVE', x0 + pad, y0 + pad + 8 * u);
    ctx.fillStyle = '#8fd0d8';
    ctx.textAlign = 'right';
    ctx.fillText('FREQ 13.00', x0 + ww - pad, y0 + pad + 8 * u);
    ctx.textAlign = 'left';
    const sealSize = seal ? Math.min(wh * 0.42, ww * 0.22) : 0;
    const textLeft = x0 + pad + (sealSize ? sealSize + pad * 0.6 : 0);
    const size = Math.min((x0 + ww - pad - textLeft) / (12 * 0.62), wh * 0.2);
    const lineY = y0 + wh * 0.5;
    if (seal) ctx.drawImage(seal, x0 + pad, lineY - sealSize / 2, sealSize, sealSize);
    ctx.fillStyle = '#e8f6f8';
    ctx.font = `700 ${Math.round(size)}px ui-monospace, Menlo, monospace`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('WE ARE STILL', textLeft, lineY - size * 0.12);
    ctx.fillText('TRANSMITTING', textLeft, lineY + size * 0.95);
    ctx.font = mono(14, 600);
    ctx.fillStyle = '#8fe0a0';
    ctx.fillText(`— DISTRICT 13${Math.floor(t * 2) % 2 ? ' █' : ''}`, x0 + pad, y0 + wh - pad);
  }
  // líneas de barrido
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  for (let y = 0; y < h; y += 3 * u) ctx.fillRect(0, y, w, Math.max(1, u));
  ctx.restore();
}

function paintLabels() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32 * LABELS.length;
  const ctx = canvas.getContext('2d');
  ctx.font = '600 15px ui-monospace, Menlo, monospace';
  LABELS.forEach((label, i) => {
    const y = i * 32;
    const width = ctx.measureText(label).width + 12;
    ctx.fillStyle = i === 1 ? 'rgba(200, 40, 40, 0.85)' : 'rgba(232, 246, 248, 0.9)';
    ctx.fillRect(0, y + 6, width, 20);
    ctx.fillStyle = i === 1 ? '#fff' : '#02090b';
    ctx.fillText(label, 6, y + 21);
  });
  return canvas;
}

const SHARD_VERTEX = /* glsl */`
  attribute vec4 aRect;
  attribute vec2 aOffset;
  attribute float aSeed;
  attribute float aMove;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying float vSeed;
  varying float vMove;
  void main() {
    vLocal = position.xy;
    vec2 base = aRect.xy + vec2(position.x, 1.0 - position.y) * aRect.zw;
    vec2 p = base + aOffset;
    vUv = vec2(base.x, 1.0 - base.y);
    vSeed = aSeed;
    vMove = aMove;
    gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
  }
`;
const SHARD_FRAGMENT = /* glsl */`
  uniform sampler2D tSnap;
  uniform float uTime;
  uniform float uMotion;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying float vSeed;
  varying float vMove;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    if (vSeed > 0.72) { vec2 grid = vec2(90.0, 52.0); uv = (floor(uv * grid) + 0.5) / grid; }
    float tick = floor(uTime * 10.0);
    float jitter = (hash(vSeed * 91.0 + tick) - 0.5) * 0.006 * uMotion;
    float split = 0.002 + vMove * 0.05;
    vec3 col = vec3(
      texture2D(tSnap, uv + vec2(split + jitter, 0.0)).r,
      texture2D(tSnap, uv + vec2(jitter, 0.0)).g,
      texture2D(tSnap, uv - vec2(split - jitter, 0.0)).b);
    float l = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col, vec3(l * 0.55, l * 0.95, l * 1.2), clamp(0.45 + vMove * 6.0, 0.0, 0.9));
    col *= 0.86 + 0.14 * sin(gl_FragCoord.y * 1.7);
    vec2 edge = min(vLocal, 1.0 - vLocal) / fwidth(vLocal);
    float border = 1.0 - step(1.2, min(edge.x, edge.y));
    // En reposo las juntas casi no se ven; se marcan donde la imagen se corrió.
    col = mix(col, vec3(0.85, 0.97, 1.0), border * clamp(0.04 + vMove * 12.0, 0.0, 0.8));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// `revealed`: quien ya descubrió la señal la encuentra abierta al volver.
export function createClassifiedGlitch({ renderer, scene, camera, reducedMotion = false, revealed: alreadyRevealed = false, onProgress, onReveal }) {
  const disposables = [];
  const keep = (thing) => { disposables.push(thing); return thing; };
  const size = renderer.getSize(new THREE.Vector2());
  const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());

  // La vista actual del mapa se congela en una textura.
  const snapshot = keep(new THREE.WebGLRenderTarget(buffer.x, buffer.y));
  renderer.setRenderTarget(snapshot);
  renderer.setClearColor(0x0b0b0c, 1);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.setClearColor(0x000000, 0);

  const overlay = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

  // Lo que no tapa el encabezado, y en el medio de eso la ventana donde aparece la transmisión.
  const area = openAreaFor(size.x, size.y);
  // Sin panel, el área es toda la pantalla: la ventana tiene su propio tamaño (en celular, casi todo el ancho).
  const narrow = size.x <= 720;
  const below = area.y0 + 150 / Math.max(size.y, 1); // debajo de la etiqueta y de la ficha "DISTRICT 13"
  const winW = narrow ? 0.9 : Math.min(0.52, 760 / Math.max(size.x, 1));
  const winH = (area.y1 - below) * (narrow ? 0.36 : 0.5);
  const winY = below + (area.y1 - below - winH) * 0.4;
  const win = { x0: (area.x0 + area.x1 - winW) / 2, x1: (area.x0 + area.x1 + winW) / 2, y0: winY, y1: winY + winH };

  // Capa de abajo: la señal del Distrito 13, al tamaño de la pantalla para que el texto se lea igual en celular.
  const hiddenCanvas = document.createElement('canvas');
  const u = Math.min(renderer.getPixelRatio(), 2048 / Math.max(size.x, size.y), 2);
  hiddenCanvas.width = Math.max(1, Math.round(size.x * u));
  hiddenCanvas.height = Math.max(1, Math.round(size.y * u));
  const hiddenCtx = hiddenCanvas.getContext('2d');
  const hiddenTexture = keep(canvasTexture(hiddenCanvas));
  let seal = null;
  let revealed = alreadyRevealed;
  const repaint = (t = 0) => { paintHidden(hiddenCtx, hiddenCanvas.width, hiddenCanvas.height, { seal, revealed, t, u, area, win }); hiddenTexture.needsUpdate = true; };
  repaint();
  loadImage('/assets/seals/13.png').then((image) => { seal = image; repaint(); });
  const hidden = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), keep(new THREE.MeshBasicMaterial({ map: hiddenTexture, depthTest: false, depthWrite: false })));
  hidden.renderOrder = 0;
  overlay.add(hidden);

  // Fragmentos: una instancia por fragmento, con su rectángulo, desplazamiento y semilla.
  const state = breakShards(createShards(shardLayout()));
  if (alreadyRevealed) openShards(state, win, { instant: true });
  const count = state.shards.length;
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.translate(0.5, 0.5, 0);
  const geometry = keep(new THREE.InstancedBufferGeometry());
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.instanceCount = count;
  const rects = new Float32Array(count * 4);
  const offsets = new Float32Array(count * 2);
  const seeds = new Float32Array(count);
  const moves = new Float32Array(count);
  const random = lcg(77);
  state.shards.forEach((s, i) => { rects.set([s.x, s.y, s.w, s.h], i * 4); seeds[i] = random(); });
  geometry.setAttribute('aRect', new THREE.InstancedBufferAttribute(rects, 4));
  const offsetAttr = new THREE.InstancedBufferAttribute(offsets, 2);
  const moveAttr = new THREE.InstancedBufferAttribute(moves, 1);
  offsetAttr.setUsage(THREE.DynamicDrawUsage);
  moveAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aOffset', offsetAttr);
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('aMove', moveAttr);
  const shardMaterial = keep(new THREE.ShaderMaterial({
    uniforms: { tSnap: { value: snapshot.texture }, uTime: { value: 0 }, uMotion: { value: reducedMotion ? 0 : 1 } },
    vertexShader: SHARD_VERTEX,
    fragmentShader: SHARD_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  }));
  const shards = new THREE.Mesh(geometry, shardMaterial);
  shards.frustumCulled = false;
  shards.renderOrder = 1;
  overlay.add(shards);

  // Cajas de rastreo: algunas siguen a fragmentos y una sigue al puntero.
  const tracked = Array.from({ length: TRACKED }, (_, i) => Math.floor((i + 0.5) * (count / TRACKED)));
  const boxCount = TRACKED + 1;
  const boxPositions = new Float32Array(boxCount * 8 * 3);
  const boxGeometry = keep(new THREE.BufferGeometry());
  const boxAttr = new THREE.BufferAttribute(boxPositions, 3);
  boxAttr.setUsage(THREE.DynamicDrawUsage);
  boxGeometry.setAttribute('position', boxAttr);
  const boxes = new THREE.LineSegments(boxGeometry, keep(new THREE.LineBasicMaterial({ color: 0xe8f6f8, transparent: true, opacity: 0.75, depthTest: false })));
  boxes.frustumCulled = false;
  boxes.renderOrder = 2;
  overlay.add(boxes);
  const labelAtlas = keep(canvasTexture(paintLabels()));
  const labelGeometry = keep(new THREE.PlaneGeometry(1, 1));
  labelGeometry.translate(0.5, -0.5, 0);
  const labels = Array.from({ length: boxCount }, (_, i) => {
    const texture = keep(labelAtlas.clone());
    const row = i === TRACKED ? 7 : i % (LABELS.length - 1);
    texture.repeat.set(1, 1 / LABELS.length);
    texture.offset.set(0, 1 - (row + 1) / LABELS.length);
    const mesh = new THREE.Mesh(labelGeometry, keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false })));
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    overlay.add(mesh);
    return mesh;
  });

  const toNdc = (x, y) => [x * 2 - 1, 1 - y * 2];
  function setBox(i, x, y, w, h) {
    const [x0, y0] = toNdc(x, y);
    const [x1, y1] = toNdc(x + w, y + h);
    boxPositions.set([x0, y0, 0, x1, y0, 0, x1, y0, 0, x1, y1, 0, x1, y1, 0, x0, y1, 0, x0, y1, 0, x0, y0, 0], i * 24);
    const label = labels[i];
    label.position.set(x0, y0 + (LABEL_PX.h / size.y) * 2, 0);
    label.scale.set((LABEL_PX.w / size.x) * 2, (LABEL_PX.h / size.y) * 2, 1);
  }

  let pointer = null;
  let lastProgress = -1;
  let twitchIn = 0.4;
  if (!reducedMotion) {
    // La rotura: un sacudón inicial, chico, que no cuenta como "mover" fragmentos.
    for (const s of state.shards) { s.vx = (random() - 0.5) * 0.4; s.vy = (random() - 0.5) * 0.08; }
  }

  return {
    pointerDown(x, y) {
      const id = pickShard(state, x, y);
      if (id === null) return false;
      startDrag(state, id, x, y);
      pointer = { x, y };
      return true;
    },
    pointerMove(x, y) { pointer = { x, y }; return state.drag ? 'grabbing' : pickShard(state, x, y) !== null ? 'grab' : 'default'; },
    pointerUp() { endDrag(state); },
    pointerLeave() { pointer = null; endDrag(state); },
    // Ya descubierta en otra visita: se abre sin volver a avisar.
    markRevealed() {
      if (revealed) return;
      revealed = true;
      openShards(state, win);
      repaint();
    },
    update(dt, elapsed) {
      if (!reducedMotion) {
        twitchIn -= dt;
        if (twitchIn <= 0) {
          const s = state.shards[Math.floor(random() * count)];
          if (state.drag?.id !== s.id) s.vx += (random() - 0.5) * 0.3;
          twitchIn = 0.25 + random() * 0.5;
        }
      }
      stepShards(state, dt, { pointer, aspect: size.x / Math.max(size.y, 1) });
      state.shards.forEach((s, i) => {
        offsets[i * 2] = s.ox;
        offsets[i * 2 + 1] = s.oy;
        moves[i] = Math.min(Math.hypot(s.ox, s.oy), 0.2);
      });
      offsetAttr.needsUpdate = true;
      moveAttr.needsUpdate = true;
      shardMaterial.uniforms.uTime.value = elapsed;
      tracked.forEach((id, i) => {
        const s = state.shards[id];
        setBox(i, s.x + s.ox - 0.004, s.y + s.oy - 0.004, s.w + 0.008, s.h + 0.008);
      });
      if (pointer) setBox(TRACKED, pointer.x - 0.04, pointer.y - 0.05, 0.08, 0.1);
      else setBox(TRACKED, -2, -2, 0, 0);
      boxAttr.needsUpdate = true;
      const progress = revealProgress(state);
      if (Math.round(progress * 20) !== Math.round(lastProgress * 20)) { lastProgress = progress; onProgress?.(progress); }
      if (progress >= 1 && !revealed) { revealed = true; openShards(state, win); repaint(elapsed); onReveal?.(); }
      if (revealed && Math.floor(elapsed * 2) !== Math.floor((elapsed - dt) * 2)) repaint(elapsed);
    },
    render() {
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(overlay, ortho);
      renderer.autoClear = autoClear;
    },
    dispose() {
      disposables.forEach((thing) => thing.dispose?.());
    },
  };
}
