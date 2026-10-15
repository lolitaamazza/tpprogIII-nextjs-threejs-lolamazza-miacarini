import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL, HALL_ORIGIN, SCREEN_COPY, cascadeDelays, seatLayout, smallTvSlots } from '../../lib/broadcastHall.js';

// La sala de transmisión de la intro, años 50: pared curva con ventanales al atardecer, la tele central sobre
// un panel de rayos, dos paredes de teles chicas, lámparas naranjas y el público de espaldas. Todo es geometría
// propia y texturas pintadas en canvas: no hay modelos ni imágenes externas además de los sellos del proyecto.

const SCREEN_W = 1024;
const SCREEN_H = 768;
const TILE = 256;
const ATLAS_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'c', 'logo', 'bars'];
const COLORS = {
  walnut: 0x3a2617, bakelite: 0x231912, brass: 0xc8a961, cream: 0xe6d9bb, uniform: 0x5e1d12, hair: 0x140d09,
  suit: 0x15110e, floor: 0x2a1610, wall: 0x5a4a37, ceiling: 0x2d241b, lamp: 0xc8621c, glass: 0x8fd0d8,
};

function fontFamily(variable, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function canvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function canvasTexture(c) {
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Dibuja `image` (blanca o dorada sobre transparente) teñida de un color.
function tinted(image, color, size) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0, size, size);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  return c;
}

// ---------- Pantalla central: cada vista se pinta en un canvas ----------
function createScreenPainter(assets) {
  const c = canvas(SCREEN_W, SCREEN_H);
  const ctx = c.getContext('2d');
  const display = fontFamily('--font-display', 'Oswald, Impact, sans-serif');
  const body = fontFamily('--font-body', 'Inter, Arial, sans-serif');
  const goldSeal = assets.seal ? tinted(assets.seal, '#d9b860', 512) : null;
  const darkSeal = assets.seal ? tinted(assets.seal, '#7a5a1c', 512) : null;
  let view = 'none';

  function wrap(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function paint(t) {
    ctx.save();
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (view === 'logo') {
      const g = ctx.createRadialGradient(512, 340, 40, 512, 384, 620);
      g.addColorStop(0, '#2c4a52'); g.addColorStop(1, '#081114');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      if (goldSeal) ctx.drawImage(goldSeal, 512 - 170, 120, 340, 340);
      ctx.fillStyle = '#e9d59a';
      ctx.font = `500 92px ${display}`;
      ctx.letterSpacing = '22px';
      ctx.fillText(SCREEN_COPY.logo, 512 + 11, 590);
      ctx.font = `400 28px ${display}`;
      ctx.letterSpacing = '10px';
      ctx.fillStyle = '#9fc9cf';
      ctx.fillText(SCREEN_COPY.standBy, 512 + 5, 650);
    } else if (view === 'address') {
      const g = ctx.createRadialGradient(512, 300, 60, 512, 384, 640);
      g.addColorStop(0, '#f3efe0'); g.addColorStop(0.7, '#d9d2b8'); g.addColorStop(1, '#a9a184');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      if (darkSeal) ctx.drawImage(darkSeal, 512 - 70, 70, 140, 140);
      ctx.letterSpacing = '8px';
      ctx.fillStyle = '#7b0001';
      ctx.font = `500 30px ${display}`;
      ctx.fillText(SCREEN_COPY.eyebrow, 512 + 4, 270);
      ctx.letterSpacing = '4px';
      ctx.fillStyle = '#2a1810';
      ctx.font = `600 84px ${display}`;
      ctx.fillText(SCREEN_COPY.headline, 512 + 2, 370);
      ctx.letterSpacing = '0px';
      ctx.font = `500 34px ${body}`;
      ctx.fillStyle = '#3b2a20';
      wrap(SCREEN_COPY.body, 780).forEach((line, i) => ctx.fillText(line, 512, 440 + i * 50));
      ctx.fillStyle = '#7b0001';
      ctx.fillRect(0, SCREEN_H - 110, SCREEN_W, 110);
      ctx.fillStyle = '#f3e8c9';
      ctx.font = `500 34px ${display}`;
      ctx.letterSpacing = '8px';
      ctx.textAlign = 'left';
      const width = ctx.measureText(SCREEN_COPY.ticker).width;
      const x = SCREEN_W - ((t * 160) % (width + SCREEN_W));
      ctx.fillText(SCREEN_COPY.ticker, x, SCREEN_H - 42);
      ctx.fillText(SCREEN_COPY.ticker, x + width, SCREEN_H - 42);
    } else if (view === 'pirate') {
      const g = ctx.createRadialGradient(512, 820, 40, 512, 600, 760);
      g.addColorStop(0, '#2a2210'); g.addColorStop(1, '#030504');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      if (assets.map) {
        ctx.globalAlpha = 0.5;
        ctx.filter = 'sepia(1) saturate(2.4) brightness(0.8)';
        const w = 820;
        const h = w * (assets.map.height / assets.map.width);
        ctx.drawImage(assets.map, 512 - w / 2, 384 - h / 2 - 10, w, h);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9fd0e6';
      ctx.font = '500 30px ui-monospace, Menlo, monospace';
      ctx.letterSpacing = '6px';
      ctx.fillText(SCREEN_COPY.pirate, 50, 70);
      if (Math.floor(t * 2.5) % 2 === 0) {
        ctx.fillStyle = '#d8302f';
        ctx.beginPath(); ctx.arc(SCREEN_W - 70, 58, 14, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    ctx.restore();
  }

  return {
    canvas: c,
    animated: () => view === 'address' || view === 'pirate',
    setView(next) { view = next; },
    paint,
  };
}

// ---------- Teles chicas: un atlas de 4×4 con sellos, el Capitolio, el logo, barras y el 13 sin señal ----------
function paintAtlas(assets) {
  const c = canvas(TILE * 4, TILE * 4);
  const ctx = c.getContext('2d');
  const display = fontFamily('--font-display', 'Oswald, Impact, sans-serif');
  ATLAS_KEYS.forEach((key, i) => {
    const x = (i % 4) * TILE;
    const y = Math.floor(i / 4) * TILE;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, TILE, TILE); ctx.clip();
    const g = ctx.createRadialGradient(x + TILE / 2, y + TILE * 0.45, 10, x + TILE / 2, y + TILE / 2, TILE * 0.75);
    g.addColorStop(0, '#d8eef0'); g.addColorStop(1, '#7fa9b2');
    ctx.fillStyle = g; ctx.fillRect(x, y, TILE, TILE);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1d3440';
    if (key === 'bars') {
      const bars = ['#e8e3cf', '#d9cf7a', '#86c3c6', '#7fb58a', '#b98ab8', '#c16a5f', '#5f7fb2'];
      bars.forEach((color, b) => { ctx.fillStyle = color; ctx.fillRect(x + (b * TILE) / bars.length, y, TILE / bars.length + 1, TILE * 0.7); });
      ctx.fillStyle = '#1d3440'; ctx.fillRect(x, y + TILE * 0.7, TILE, TILE * 0.3);
      ctx.strokeStyle = '#e8e3cf'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE * 0.42, TILE * 0.24, 0, Math.PI * 2); ctx.stroke();
    } else if (key === '13') {
      const image = ctx.createImageData(TILE, TILE);
      for (let p = 0; p < image.data.length; p += 4) {
        const v = 40 + Math.random() * 180;
        image.data[p] = v; image.data[p + 1] = v; image.data[p + 2] = v; image.data[p + 3] = 255;
      }
      ctx.putImageData(image, x, y);
      ctx.fillStyle = '#0d1418'; ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.22);
      ctx.fillStyle = '#e8e3cf'; ctx.font = `500 30px ${display}`; ctx.letterSpacing = '4px';
      ctx.fillText(SCREEN_COPY.noSignal, x + TILE / 2 + 2, y + TILE * 0.55);
    } else if (key === 'logo') {
      ctx.font = `500 44px ${display}`; ctx.letterSpacing = '6px';
      ctx.fillText('CAPITOL', x + TILE / 2 + 3, y + TILE * 0.47);
      ctx.fillText('TV', x + TILE / 2 + 3, y + TILE * 0.68);
    } else {
      const image = key === 'c' ? assets.seal : assets.seals?.[key];
      if (image) ctx.drawImage(tinted(image, '#1d3440', 256), x + TILE * 0.2, y + TILE * 0.1, TILE * 0.6, TILE * 0.6);
      ctx.font = `500 28px ${display}`; ctx.letterSpacing = '6px';
      ctx.fillText(key === 'c' ? 'THE CAPITOL' : `DISTRICT ${key}`, x + TILE / 2 + 3, y + TILE * 0.88);
    }
    ctx.restore();
  });
  return c;
}

// ---------- Shader de pantalla de tubo: curvatura, corrimiento, aberración, ruido y línea de encendido ----------
const SCREEN_VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SCREEN_FRAGMENT = /* glsl */`
  uniform sampler2D map;
  uniform sampler2D tPortal;
  uniform vec4 uTile;
  uniform vec2 uResolution;
  uniform float uTime, uSeed, uPower, uNoise, uRoll, uSkew, uChroma, uSqueeze, uPortal, uGlow;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 sampleMap(vec2 uv) { return texture2D(map, uTile.xy + clamp(uv, 0.0, 1.0) * uTile.zw).rgb; }
  void main() {
    vec2 c = vUv - 0.5;
    vec2 uv = 0.5 + c * (1.0 + 0.08 * dot(c, c)); // vidrio curvo
    uv.y = fract(uv.y + uRoll);
    uv.x += uSkew * (uv.y - 0.5);
    float sy = 0.5 + (uv.y - 0.5) / max(uSqueeze, 0.05);
    float inside = step(0.0, sy) * step(sy, 1.0);
    vec2 suv = vec2(uv.x, sy);
    vec3 col = vec3(sampleMap(suv + vec2(uChroma, 0.0)).r, sampleMap(suv).g, sampleMap(suv - vec2(uChroma, 0.0)).b) * inside;
    if (uSqueeze < 0.99) col += vec3(0.16, 0.84, 0.75) * 0.7 * (1.0 - inside) * step(abs(sy - 0.5), 0.5 + 0.06 / max(uSqueeze, 0.05));
    float n = hash(vUv * vec2(320.0, 240.0) + floor(uTime * 24.0) + uSeed);
    col = mix(col, vec3(n), clamp(uNoise, 0.0, 1.0));
    col *= 0.87 + 0.13 * sin(vUv.y * 780.0);
    float content = smoothstep(0.55, 1.0, uPower);
    float w = 0.004 + uPower * 0.35;
    float lineMask = exp(-pow((vUv.y - 0.5) / w, 2.0)) * step(abs(vUv.x - 0.5), min(uPower * 1.4, 0.5));
    vec3 glass = vec3(0.035, 0.05, 0.05) + 0.06 * (1.0 - length(c) * 1.4);
    vec3 lit = mix(glass, col, content) + vec3(0.8, 0.95, 1.0) * lineMask * (1.0 - content) * step(0.01, uPower);
    lit = mix(lit, texture2D(tPortal, gl_FragCoord.xy / uResolution).rgb, uPortal);
    lit *= 1.0 - (1.0 - uPortal) * 0.75 * dot(c, c) * 2.0; // viñeta del tubo
    lit += vec3(1.0) * pow(max(0.0, 1.0 - length(vUv - vec2(0.25, 0.8)) * 2.2), 3.0) * 0.08 * (1.0 - uPortal); // reflejo
    gl_FragColor = vec4(lit * uGlow, 1.0);
    #include <colorspace_fragment>
  }
`;

function screenMaterial(map, tile = [0, 0, 1, 1]) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      tPortal: { value: null },
      uTile: { value: new THREE.Vector4(...tile) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 }, uSeed: { value: Math.random() * 100 }, uPower: { value: 0 }, uNoise: { value: 0 },
      uRoll: { value: 0 }, uSkew: { value: 0 }, uChroma: { value: 0 }, uSqueeze: { value: 1 }, uPortal: { value: 0 }, uGlow: { value: 1 },
    },
    vertexShader: SCREEN_VERTEX,
    fragmentShader: SCREEN_FRAGMENT,
  });
}

// ---------- Texturas de la sala ----------
function paintWall() {
  // El cilindro de la pared: u = 0.5 queda detrás de la tele. Ventanales altos con parteluces y un zócalo.
  const c = canvas(4096, 512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
  const panes = 26;
  for (let i = 0; i < panes; i++) {
    const u = 0.5 + (i - (panes - 1) / 2) * 0.022;
    const x = u * c.width;
    const w = c.width * 0.016;
    const g = ctx.createLinearGradient(0, 70, 0, 430);
    g.addColorStop(0, '#1d3550'); g.addColorStop(0.6, '#4f7393'); g.addColorStop(1, '#8aa9bd');
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, 70, w, 360);
    ctx.fillStyle = '#000';
    for (let k = 1; k < 6; k++) ctx.fillRect(x - w / 2, 70 + k * 60, w, 4);
    ctx.fillRect(x - 2, 70, 4, 360);
  }
  return c;
}

function paintWallColor() {
  const c = canvas(4096, 512);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#3b3126'); g.addColorStop(0.15, '#6a5a43'); g.addColorStop(0.9, '#5a4a37'); g.addColorStop(1, '#2a2118');
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function paintSunburst() {
  // Panel detrás de la tele: rayos de madera y bronce que convergen en la pantalla, con forma de alas.
  const c = canvas(2048, 900);
  const ctx = c.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(140, 120); ctx.quadraticCurveTo(1024, 40, 1908, 120);
  ctx.lineTo(1780, 820); ctx.lineTo(268, 820); ctx.closePath();
  ctx.save(); ctx.clip();
  const bg = ctx.createRadialGradient(1024, 460, 60, 1024, 460, 1100);
  bg.addColorStop(0, '#6b5534'); bg.addColorStop(1, '#2b1f13');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2;
    ctx.strokeStyle = i % 2 ? 'rgba(214, 180, 110, 0.55)' : 'rgba(60, 40, 22, 0.6)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(1024, 460); ctx.lineTo(1024 + Math.cos(a) * 1400, 460 + Math.sin(a) * 1400); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#c8a961'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(140, 120); ctx.quadraticCurveTo(1024, 40, 1908, 120); ctx.lineTo(1780, 820); ctx.lineTo(268, 820); ctx.closePath(); ctx.stroke();
  return c;
}

// ---------- Geometrías ----------
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function bezelGeometry(w, h, border, r) {
  const shape = roundedRectShape(w + border * 2, h + border * 2, r + border);
  shape.holes.push(roundedRectShape(w, h, r));
  return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 8 });
}

function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function chairGeometry() {
  // Silla de madera vista de atrás: asiento, respaldo hacia la cámara y cuatro patas.
  return mergeGeometries([
    box(0.56, 0.06, 0.5, 0, 0.48, 0),
    box(0.52, 0.5, 0.05, 0, 0.8, 0.24),
    box(0.05, 0.48, 0.05, -0.24, 0.24, -0.22), box(0.05, 0.48, 0.05, 0.24, 0.24, -0.22),
    box(0.05, 1.0, 0.05, -0.24, 0.5, 0.22), box(0.05, 1.0, 0.05, 0.24, 0.5, 0.22),
  ]);
}

function seatedBodyGeometry() {
  const torso = new THREE.CapsuleGeometry(0.24, 0.42, 4, 10);
  torso.scale(1.25, 1, 0.85);
  torso.translate(0, 0.98, 0.04);
  const shoulders = new THREE.CapsuleGeometry(0.13, 0.42, 4, 8);
  shoulders.rotateZ(Math.PI / 2);
  shoulders.translate(0, 1.22, 0.04);
  return mergeGeometries([torso, shoulders]);
}

function headGeometry() {
  const head = new THREE.SphereGeometry(0.15, 16, 12);
  head.scale(1, 1.12, 1);
  head.translate(0, 1.5, 0.02);
  return head;
}

function standingFigure(material, skin) {
  const group = new THREE.Group();
  const coat = new THREE.CapsuleGeometry(0.27, 0.8, 4, 12);
  coat.scale(1.2, 1, 0.8);
  coat.translate(0, 1.25, 0);
  const shoulders = new THREE.CapsuleGeometry(0.14, 0.5, 4, 8);
  shoulders.rotateZ(Math.PI / 2);
  shoulders.translate(0, 1.62, 0);
  const legs = mergeGeometries([box(0.17, 0.85, 0.2, -0.12, 0.43, 0), box(0.17, 0.85, 0.2, 0.12, 0.43, 0)]);
  group.add(new THREE.Mesh(mergeGeometries([coat, shoulders]), material));
  group.add(new THREE.Mesh(legs, material));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin);
  head.scale.set(1, 1.12, 1);
  head.position.set(0, 1.92, 0);
  group.add(head);
  return group;
}

function instanced(geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  transforms.forEach(({ position, rotationY = 0, scale = 1, scaleY = scale }, i) => {
    e.set(0, rotationY, 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(...position), q, new THREE.Vector3(scale, scaleY, scale));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// ---------- La sala ----------
export async function createBroadcastHall() {
  const [seal, map, ...seals] = await Promise.all([
    loadImage('/assets/brand/panem-seal.png'),
    loadImage('/assets/panem.svg'),
    ...Array.from({ length: 12 }, (_, i) => loadImage(`/assets/seals/${i + 1}.png`)),
  ]);
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;
  const assets = { seal, map, seals: Object.fromEntries(seals.map((image, i) => [String(i + 1), image])) };

  const group = new THREE.Group();
  group.name = 'Sala de transmisión';
  group.position.set(...HALL_ORIGIN);
  const disposables = [];
  const keep = (thing) => { disposables.push(thing); return thing; };
  const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra }));

  // Luces propias: viven en el grupo, así que se apagan cuando la sala no se ve.
  const hemi = new THREE.HemisphereLight(0x9fb7cf, 0x2b1a12, 0.9);
  group.add(hemi);
  const key = new THREE.SpotLight(0xffe2b0, 60, 40, 0.55, 0.6, 1.4);
  key.position.set(0, 11, 12);
  key.target.position.set(0, 3.5, 0);
  group.add(key, key.target);
  const screenGlow = new THREE.PointLight(0x8fe0e8, 0, 14, 1.6);
  screenGlow.position.set(0, HALL.screen.y, 3);
  group.add(screenGlow);
  const lampLights = [-1, 1].map((side) => {
    const light = new THREE.PointLight(0xff9a3c, 14, 16, 1.6);
    light.position.set(side * 10, 3.8, 2.2);
    group.add(light);
    return light;
  });

  // Piso, techo y pared curva con ventanales
  const floor = new THREE.Mesh(keep(new THREE.CircleGeometry(HALL.radius, 64)), std(COLORS.floor, { roughness: 0.35, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = HALL.wallCenterZ;
  group.add(floor);
  const ceiling = new THREE.Mesh(keep(new THREE.CircleGeometry(HALL.radius, 64)), std(COLORS.ceiling, { roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HALL.height, HALL.wallCenterZ);
  group.add(ceiling);
  const windows = keep(canvasTexture(paintWall()));
  const wallColor = keep(canvasTexture(paintWallColor()));
  const wall = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(HALL.radius, HALL.radius, HALL.height, 128, 1, true)),
    std(0xffffff, { map: wallColor, emissive: 0xffffff, emissiveMap: windows, emissiveIntensity: 0.9, side: THREE.BackSide, roughness: 0.8 }),
  );
  wall.position.set(0, HALL.height / 2, HALL.wallCenterZ);
  group.add(wall);
  // Columnas delante de la pared
  const columnGeo = keep(new THREE.BoxGeometry(0.55, HALL.height, 0.55));
  const columns = [-1.2, -0.85, -0.5, 0.5, 0.85, 1.2].map((a) => ({
    position: [Math.sin(a) * (HALL.radius - 0.8), HALL.height / 2, HALL.wallCenterZ - Math.cos(a) * (HALL.radius - 0.8)],
    rotationY: -a,
  }));
  group.add(instanced(columnGeo, std(0x4a3d2e, { roughness: 0.7 }), columns));

  // Panel de rayos y tarima
  const sunburst = keep(canvasTexture(paintSunburst()));
  const panel = new THREE.Mesh(keep(new THREE.PlaneGeometry(24, 10.5)), std(0xffffff, { map: sunburst, transparent: true, alphaTest: 0.05, metalness: 0.35, roughness: 0.5 }));
  panel.position.set(0, 4.6, -1.1);
  group.add(panel);
  const stage = keep(mergeGeometries([box(9, 0.35, 3, 0, 0.18, 0.2), box(7.5, 0.35, 2.4, 0, 0.53, 0), box(3, 0.35, 1.2, 0, 0.18, 2.1)]));
  group.add(new THREE.Mesh(stage, std(0x2b1d13, { roughness: 0.5 })));

  // Tele central
  const cabinet = new THREE.Mesh(keep(new RoundedBoxGeometry(7.9, 6.2, 1.3, 5, 0.55)), std(COLORS.bakelite, { roughness: 0.35, metalness: 0.2 }));
  cabinet.position.set(0, HALL.screen.y, 0);
  group.add(cabinet);
  const bezel = new THREE.Mesh(keep(bezelGeometry(HALL.screen.width, HALL.screen.height, 0.28, 0.5)), std(COLORS.brass, { metalness: 0.75, roughness: 0.3 }));
  bezel.position.set(0, HALL.screen.y, HALL.screen.z - 0.13);
  group.add(bezel);
  const painter = createScreenPainter(assets);
  const screenTexture = keep(canvasTexture(painter.canvas));
  const screen = new THREE.Mesh(keep(new THREE.PlaneGeometry(HALL.screen.width, HALL.screen.height)), keep(screenMaterial(screenTexture)));
  screen.position.set(0, HALL.screen.y, HALL.screen.z);
  group.add(screen);
  const pillar = keep(mergeGeometries([box(0.5, 1.2, 0.5, -2.4, 1.1, 0), box(0.5, 1.2, 0.5, 2.4, 1.1, 0)]));
  group.add(new THREE.Mesh(pillar, std(COLORS.brass, { metalness: 0.7, roughness: 0.35 })));

  // Teles chicas
  const slots = smallTvSlots();
  const delays = cascadeDelays(slots);
  const atlas = keep(canvasTexture(paintAtlas(assets)));
  const smallCabinetGeo = keep(new RoundedBoxGeometry(1.78, 1.38, 0.7, 3, 0.18));
  group.add(instanced(smallCabinetGeo, std(COLORS.walnut, { roughness: 0.4, metalness: 0.15 }), slots.map((s) => ({ position: [s.x, s.y, s.z - 0.2], rotationY: s.rotY }))));
  const smallBezelGeo = keep(bezelGeometry(1.36, 1.02, 0.07, 0.16));
  group.add(instanced(smallBezelGeo, std(0xd8d4c8, { metalness: 0.8, roughness: 0.25 }), slots.map((s) => {
    const forward = 0.12;
    return { position: [s.x + Math.sin(s.rotY) * forward, s.y, s.z + Math.cos(s.rotY) * forward], rotationY: s.rotY };
  })));
  const smallScreenGeo = keep(new THREE.PlaneGeometry(1.36, 1.02));
  const smallScreens = slots.map((s, i) => {
    const index = ATLAS_KEYS.indexOf(s.content);
    const material = keep(screenMaterial(atlas, [(index % 4) / 4, 1 - (Math.floor(index / 4) + 1) / 4, 0.25, 0.25]));
    const mesh = new THREE.Mesh(smallScreenGeo, material);
    const forward = 0.2;
    mesh.position.set(s.x + Math.sin(s.rotY) * forward, s.y, s.z + Math.cos(s.rotY) * forward);
    mesh.rotation.y = s.rotY;
    group.add(mesh);
    return { mesh, material, delay: delays[i] / 1000, onAt: Infinity, staticAt: Infinity, offAt: Infinity, power: 0, noise: 0 };
  });

  // Lámparas naranjas sobre pies
  const lampHead = keep(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 32));
  lampHead.rotateX(Math.PI / 2);
  const lampSpots = [[-9.9, 3.7, 1.6, 0.8], [9.9, 3.7, 1.6, 0.8], [-12.6, 4.4, 4.4, 1], [12.6, 4.4, 4.4, 1]];
  const lampMaterial = std(COLORS.lamp, { emissive: 0xff8a2a, emissiveIntensity: 0.75, roughness: 0.4 });
  group.add(instanced(lampHead, lampMaterial, lampSpots.map(([x, y, z, s]) => ({ position: [x, y, z], rotationY: -x * 0.03, scale: s }))));
  // Los pies llegan al piso: el cilindro de 1 de alto se estira a la altura de cada lámpara.
  const poleGeo = keep(new THREE.CylinderGeometry(0.05, 0.05, 1, 8));
  group.add(instanced(poleGeo, std(0x1b140e), lampSpots.map(([x, y, z]) => ({ position: [x, y / 2, z - 0.15], scaleY: y }))));

  // Público: butacas, escritorios con monitores y siluetas de espaldas con uniforme rojo
  const seats = seatLayout();
  const chairs = instanced(keep(chairGeometry()), std(COLORS.walnut, { roughness: 0.5 }), seats.map((s) => ({ position: [s.x, 0, s.z], rotationY: s.turn * 0.3 })));
  group.add(chairs);
  const deskGeo = keep(mergeGeometries([box(1.05, 0.06, 0.5, 0, 0.76, -0.62), box(1.0, 0.7, 0.04, 0, 0.4, -0.85)]));
  group.add(instanced(deskGeo, std(0x4b3220, { roughness: 0.45 }), seats.map((s) => ({ position: [s.x, 0, s.z] }))));
  const monitorGeo = keep(new RoundedBoxGeometry(0.42, 0.34, 0.32, 2, 0.06));
  monitorGeo.translate(0, 0.96, -0.7);
  group.add(instanced(monitorGeo, std(0xd9d2bf, { roughness: 0.4 }), seats.filter((s, i) => i % 2 === 0).map((s) => ({ position: [s.x, 0, s.z] }))));
  const monitorScreenGeo = keep(new THREE.PlaneGeometry(0.32, 0.24));
  monitorScreenGeo.translate(0, 0.97, -0.535); // la pantalla mira a quien está sentado
  const monitorScreens = instanced(monitorScreenGeo, keep(new THREE.MeshBasicMaterial({ color: COLORS.glass })), seats.filter((s, i) => i % 2 === 0).map((s) => ({ position: [s.x, 0, s.z] })));
  group.add(monitorScreens);
  const people = seats.filter((s) => s.occupied);
  group.add(instanced(keep(seatedBodyGeometry()), std(COLORS.uniform, { roughness: 0.75 }), people.map((s) => ({ position: [s.x, 0, s.z], rotationY: s.turn, scale: s.scale }))));
  group.add(instanced(keep(headGeometry()), std(COLORS.hair, { roughness: 0.8 }), people.map((s) => ({ position: [s.x, 0, s.z], rotationY: s.turn, scale: s.scale }))));
  const host = standingFigure(std(COLORS.suit, { roughness: 0.7 }), std(COLORS.hair, { roughness: 0.8 }));
  host.position.set(0, 0, 4.2);
  group.add(host);

  // ---------- Estado de la pantalla y las teles chicas ----------
  const glitch = { roll: 0, skew: 0, chroma: 0, noise: 0, squeeze: 1 };
  let now = 0;
  let power = 0;
  let powerTarget = 0;
  let portal = 0;
  let lastPaint = -1;

  function smallTvs(mode) {
    smallScreens.forEach((tv) => {
      if (mode === 'on') { tv.onAt = now + tv.delay; tv.staticAt = Infinity; tv.offAt = Infinity; }
      if (mode === 'static') { tv.staticAt = now + tv.delay * 0.8 + Math.random() * 0.3; }
      if (mode === 'off') { tv.offAt = now + tv.delay * 0.5; }
      if (mode === 'reset') { tv.onAt = Infinity; tv.staticAt = Infinity; tv.offAt = Infinity; tv.power = 0; tv.noise = 0; }
    });
  }

  const corner = new THREE.Vector3();
  return {
    group,
    screenMesh: screen,
    setPower(on) { powerTarget = on ? 1 : 0; },
    setView(view) { painter.setView(view); lastPaint = -1; },
    setGlitch({ roll = 0, skew = 0, chroma = 0, noise = 0, squeeze = 1 } = {}) { Object.assign(glitch, { roll, skew, chroma, noise, squeeze }); },
    setSmallTvs: smallTvs,
    setPortal(texture, amount, width, height) {
      portal = amount;
      screen.material.uniforms.tPortal.value = texture;
      screen.material.uniforms.uResolution.value.set(width, height);
    },
    // Rectángulo de la pantalla en píxeles CSS, para ubicar encima el iframe del clip.
    screenRect(camera, width, height) {
      const xs = [];
      const ys = [];
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        corner.set((x * HALL.screen.width) / 2, (y * HALL.screen.height) / 2, 0);
        screen.localToWorld(corner);
        corner.project(camera);
        xs.push(((corner.x + 1) / 2) * width);
        ys.push(((1 - corner.y) / 2) * height);
      }
      return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    },
    update(dt, elapsed) {
      now = elapsed;
      power += (powerTarget - power) * Math.min(1, dt * (powerTarget > power ? 1.6 : 6));
      if (powerTarget === 1 && power > 0.995) power = 1;
      const u = screen.material.uniforms;
      u.uTime.value = elapsed;
      u.uPower.value = power;
      u.uRoll.value = glitch.roll;
      u.uSkew.value = glitch.skew;
      u.uChroma.value = glitch.chroma;
      u.uNoise.value = glitch.noise;
      u.uSqueeze.value = glitch.squeeze;
      u.uPortal.value = portal;
      screenGlow.intensity = power * (1 - portal) * 6;
      if (painter.animated() ? elapsed - lastPaint > 1 / 30 : lastPaint < 0) {
        painter.paint(elapsed);
        screenTexture.needsUpdate = true;
        lastPaint = elapsed;
      }
      for (const tv of smallScreens) {
        const on = now >= tv.onAt && now < tv.offAt;
        tv.power += ((on ? 1 : 0) - tv.power) * Math.min(1, dt * 5);
        const noisy = now >= tv.staticAt;
        tv.noise += ((noisy ? 0.85 : 0) - tv.noise) * Math.min(1, dt * 8);
        const mu = tv.material.uniforms;
        mu.uTime.value = elapsed;
        mu.uPower.value = tv.power;
        mu.uNoise.value = tv.noise;
      }
      lampLights.forEach((light, i) => { light.intensity = 14 + Math.sin(elapsed * 0.7 + i) * 0.6; });
    },
    dispose() {
      group.traverse((object) => {
        if (object.isMesh) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((m) => m?.dispose());
        }
      });
      disposables.forEach((thing) => thing.dispose?.());
      group.removeFromParent();
    },
  };
}
