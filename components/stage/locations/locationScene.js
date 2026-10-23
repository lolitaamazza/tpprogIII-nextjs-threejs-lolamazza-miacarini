import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGradePass } from './grade.js';
import { createCoalSeam } from './coalSeam.js';
import { renderBudget, shouldRenderFrame } from '../../../lib/renderBudget.js';
import { pathBetween, walkDuration, poseAlong, lookTarget, clampLook } from '../../../lib/guidedCamera.js';

// Una escena realista de un distrito, con su propio renderer (como la urna de la Cosecha): mientras está abierta,
// el mapa se tapa y deja de dibujar. Se arma con los datos del lugar (lib/locations/*) y se libera entera al salir.
const TEXTURES = '/models/d12/';

function canvasTexture(draw, size = 128, tall = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * tall;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Halo chico y suave alrededor de una luz (sin bloom: Mia no quiere glow fuerte).
const haloTexture = () => canvasTexture((ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,236,200,1)');
  g.addColorStop(0.18, 'rgba(255,190,120,0.55)');
  g.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
});

function pbr(loader, name, repeat) {
  const load = (map, color) => {
    const t = loader.load(`${TEXTURES}${name}_${map}_1k.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.anisotropy = 4;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const arm = load('arm');
  return new THREE.MeshStandardMaterial({ map: load('diff', true), normalMap: load('nor_gl'), aoMap: arm, roughnessMap: arm, metalnessMap: arm });
}

// Las marcas talladas de la viga: nombres de mineros que no salieron (inventados), rayados a cuchillo.
const vigaTexture = () => canvasTexture((ctx, s) => {
  ctx.fillStyle = '#6a4127';
  ctx.fillRect(0, 0, s, s * 4);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(20,12,6,${Math.random() * 0.4})`; ctx.fillRect(0, Math.random() * s * 4, s, 1 + Math.random() * 3); }
  ctx.fillStyle = 'rgba(236,214,176,0.86)';
  ctx.font = `${s * 0.13}px Georgia, serif`;
  ['A. MAYO', 'C. BELL', 'T. RUIZ', 'L. FANE', 'R. ORTA', 'J. VEGA', 'M. SOL', 'E. CRUZ'].forEach((name, i) => {
    ctx.save();
    ctx.translate(s * 0.12, s * 0.35 + i * s * 0.44);
    ctx.rotate((Math.random() - 0.5) * 0.08);
    ctx.fillText(name, 0, 0);
    ctx.restore();
  });
}, 256, 4);

export function createLocationScene(mount, data, { reducedMotion = false, onProgress = () => {}, onReady = () => {}, onError = () => {}, onSpot = () => {}, onWalk = () => {}, onFragment = () => {},
  seamMode = 'idle', onSeamMatch = () => {}, onSeamComplete = () => {}, sfx = { play() {} } } = {}) {
  const budget = renderBudget(mount.clientWidth, 'auto', window.devicePixelRatio);
  const renderer = new THREE.WebGLRenderer({ antialias: !budget.low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(budget.pixelRatio);
  renderer.setSize(mount.clientWidth, Math.max(mount.clientHeight, 1), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = !budget.low;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = 'location-canvas';
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(data.fog.color, data.fog.density);
  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.05, 160);
  const startSpot = data.spots.find((s) => s.id === data.start);
  camera.position.set(...startSpot.position);
  camera.lookAt(...startSpot.look);
  camera.rotation.order = 'YXZ';

  const state = {
    disposed: false, frame: 0, last: -Infinity, reducedMotion, elapsed: 0, flickers: [], updaters: [],
    current: startSpot.id, walk: null, look: { yaw: 0, pitch: 0 }, target: [...startSpot.look], drag: null, found: [],
  };
  const spotById = (id) => data.spots.find((s) => s.id === id);
  const textures = new THREE.TextureLoader();

  // Cielo nocturno: ilumina poco y se ve oscuro y apenas desenfocado detrás de la niebla.
  new HDRLoader().loadAsync(data.sky.url).then((hdr) => {
    if (state.disposed) { hdr.dispose(); return; }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose(); pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = data.sky.intensity;
    scene.background = env;
    scene.backgroundIntensity = data.sky.background;
    scene.backgroundBlurriness = 0.02;
    state.env = env;
  }).catch((error) => console.warn('No se pudo cargar el cielo:', error));

  // Luna fría con sombra y un poco de luz de cielo.
  const moon = new THREE.DirectionalLight(0x9fb6ff, 0.55);
  moon.position.set(-18, 28, 6);
  moon.target.position.set(0, 0, -24);
  moon.castShadow = !budget.low;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -32, right: 32, top: 40, bottom: -40, near: 1, far: 90 });
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target, new THREE.HemisphereLight(0x22304a, 0x0c0907, 0.35));

  // Piso quemado de carbón y la calle de barro.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), pbr(textures, 'burned_ground_01', [28, 28]));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -25);
  ground.receiveShadow = true;
  const street = new THREE.Mesh(new THREE.PlaneGeometry(6, 44), pbr(textures, 'brown_mud_02', [1.5, 11]));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.01, -16);
  street.receiveShadow = true;
  scene.add(ground, street);

  // Vías del tren (cruzan la calle) y la vía angosta que entra a la mina.
  const steel = new THREE.MeshStandardMaterial({ color: 0x4b4d50, metalness: 0.85, roughness: 0.45 });
  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.95 });
  function track(length, gauge, along, center) {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? length : 0.07, 0.12, along === 'x' ? 0.07 : length), steel);
      rail.position.set(along === 'x' ? 0 : side * gauge / 2, 0.16, along === 'x' ? side * gauge / 2 : 0);
      rail.castShadow = rail.receiveShadow = true;
      group.add(rail);
    }
    const count = Math.floor(length / 0.62);
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(along === 'x' ? 0.22 : gauge + 0.9, 0.12, along === 'x' ? gauge + 0.9 : 0.22), sleeperMaterial, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const t = -length / 2 + (i + 0.5) * (length / count);
      m.makeTranslation(along === 'x' ? t : 0, 0.06, along === 'x' ? 0 : t);
      sleepers.setMatrixAt(i, m);
    }
    sleepers.receiveShadow = true;
    group.add(sleepers);
    group.position.set(...center);
    scene.add(group);
  }
  track(80, 1.435, 'x', [0, 0, 0]);
  track(24, 0.9, 'z', [0, 0, -32]);

  // El galpón de chapa: cuatro postes, techo inclinado y paredes atrás y a los costados.
  const tin = pbr(textures, 'corrugated_iron', [2, 1]);
  tin.side = THREE.DoubleSide;
  tin.color.set(0x7a6656); // chapa vieja, oxidada
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 });
  const shed = new THREE.Group();
  for (const [x, z, h] of [[-1.6, 1.2, 2.6], [1.6, 1.2, 2.6], [-1.6, -1.2, 2.3], [1.6, -1.2, 2.3]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), wood);
    post.position.set(x, h / 2, z);
    shed.add(post);
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3), tin);
  roof.rotation.x = -Math.PI / 2 + 0.12;
  roof.position.set(0, 2.5, 0);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.3), tin);
  back.position.set(0, 1.15, -1.25);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.3), tin);
  side.rotation.y = Math.PI / 2;
  side.position.set(1.65, 1.15, 0);
  shed.add(roof, back, side);
  shed.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  shed.position.set(6.5, 0, -7.6);
  shed.rotation.y = -Math.PI / 2;
  scene.add(shed);

  // Postes de madera con cables que cuelgan, junto a las vías (uno con el foco).
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 0.95 });
  const wireMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 });
  const poleTops = [[3.6, 6.6, 1.8], [-12, 6.6, 1.8], [-27, 6.6, 1.8], [18, 6.6, 1.8]];
  for (const [x, y, z] of poleTops) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, y + 0.4, 10), poleMaterial);
    pole.position.set(x, (y + 0.4) / 2 - 0.2, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMaterial);
    arm.position.set(x, y - 0.2, z);
    pole.castShadow = arm.castShadow = true;
    scene.add(pole, arm);
  }
  const sorted = [...poleTops].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) for (const off of [-0.7, 0.7]) {
    const a = new THREE.Vector3(sorted[i - 1][0] + off, sorted[i - 1][1] - 0.15, sorted[i - 1][2]);
    const b = new THREE.Vector3(sorted[i][0] + off, sorted[i][1] - 0.15, sorted[i][2]);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.9, 0));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.012, 4), wireMaterial));
  }

  // La loma de la mina: un cerro oscuro detrás de la boca, para que el túnel quede "adentro".
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 1 }));
  hill.scale.set(34, 16, 14);
  hill.position.set(0, -1, -54);
  hill.receiveShadow = true;
  scene.add(hill);

  // Luces cálidas: faroles, el foco del poste, la boca de la mina y el túnel. Cada una con un halo chico.
  const halo = haloTexture();
  function lamp(position, { color = 0xffb46a, intensity = 14, size = 0.45, flicker = 0.08 } = {}) {
    const light = new THREE.PointLight(color, intensity, 0, 2);
    light.position.set(...position);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.scale.setScalar(size);
    sprite.position.copy(light.position);
    scene.add(light, sprite);
    state.flickers.push({ light, sprite, base: intensity, amount: flicker, seed: Math.random() * 100 });
    return light;
  }
  lamp([-5.9, 0.42, -12.2], { intensity: 8, size: 0.3 });
  lamp([6.2, 2.2, -7], { intensity: 12 });
  lamp([3.6, 6.1, 2.2], { color: 0xffd9a0, intensity: 45, size: 0.6, flicker: 0.02 });
  lamp([2.2, 3.4, -33], { intensity: 40 });
  lamp([-2.2, 3.4, -33], { intensity: 30 });
  for (const [x, z] of [[1.9, -44.6], [-2.4, -42.9], [-2.4, -48], [1.9, -51.9], [0, -56.5]]) lamp([x, 2.7, z], { intensity: 9, size: 0.3, flicker: 0.12 });

  // El tambor con fuego: luz que titila, llamitas y brasas que suben.
  const [fx, , fz] = data.pieces.find((p) => p.id === 'tambor')?.position ?? [4.6, 0, -5.4];
  const fireLight = lamp([fx, 1.15, fz], { color: 0xff7a2e, intensity: 22, size: 0.7, flicker: 0.35 });
  const flames = [0, 1, 2].map((i) => {
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: i ? 0xff6a1c : 0xffc46a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.set(fx + (i - 1) * 0.08, 1.05, fz);
    scene.add(flame);
    return flame;
  });
  const emberCount = 40;
  const embers = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: halo, color: 0xff8a3c, size: 0.06, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const emberSeeds = Array.from({ length: emberCount }, () => Math.random());
  embers.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(emberCount * 3), 3));
  scene.add(embers);

  // Polvo de carbón en el aire.
  const dustCount = budget.low ? 160 : 420;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) dustPositions.set([(Math.random() - 0.5) * 18, Math.random() * 4, 4 - Math.random() * 62], i * 3);
  const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: halo, color: 0x8f8a80, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false }));
  dust.geometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  scene.add(dust);

  state.updaters.push((dt, t) => {
    for (const f of state.flickers) {
      const n = Math.sin(t * 13 + f.seed) * 0.5 + Math.sin(t * 7.3 + f.seed * 2) * 0.35 + Math.sin(t * 23 + f.seed * 3) * 0.15;
      const k = state.reducedMotion ? 1 : 1 + n * f.amount;
      f.light.intensity = f.base * k;
      f.sprite.material.opacity = 0.75 + 0.25 * k;
    }
    flames.forEach((flame, i) => {
      const k = state.reducedMotion ? 0 : Math.sin(t * (9 + i * 3) + i);
      flame.scale.set(0.3 + i * 0.06, 0.42 + i * 0.08 + k * 0.06, 1);
      flame.position.y = 1.05 + i * 0.1 + k * 0.02;
    });
    const ember = embers.geometry.attributes.position;
    for (let i = 0; i < emberCount; i++) {
      const life = (emberSeeds[i] + t * 0.35) % 1;
      ember.setXYZ(i, fx + Math.sin(i * 12.3 + t) * 0.18 * life, 1.1 + life * 1.8, fz + Math.cos(i * 7.1 + t) * 0.18 * life);
    }
    ember.needsUpdate = true;
    if (!state.reducedMotion) {
      const p = dust.geometry.attributes.position;
      for (let i = 0; i < dustCount; i++) {
        p.setX(i, p.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.05);
        p.setY(i, (p.getY(i) + dt * 0.04) % 4);
      }
      p.needsUpdate = true;
    }
    fireLight.position.y = 1.15 + Math.sin(t * 17) * 0.03;
  });

  // Las piezas: cada modelo se centra, se apoya en el piso y se escala a su alto (o a su escala si ya está en metros).
  const loader = new GLTFLoader();
  let loaded = 0;
  const pieces = new Map();
  const loads = data.pieces.map((piece) => loader.loadAsync(piece.url).then((gltf) => {
    if (state.disposed) return;
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = piece.height ? piece.height / Math.max(size.y, 1e-6) : piece.scale ?? 1;
    model.scale.setScalar(scale);
    if (piece.origin) model.position.set(...piece.origin.map((v) => -v * scale));
    else {
      const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      model.position.set(-center.x, -box.min.y * scale, -center.z);
    }
    const holder = new THREE.Group();
    holder.add(model);
    holder.position.set(...piece.position);
    holder.rotation.y = piece.rotationY ?? 0;
    holder.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = !budget.low;
      n.receiveShadow = true;
      if (piece.hide?.some((name) => n.name.includes(name) || n.parent?.name.includes(name))) n.visible = false;
      if (piece.matte) for (const m of [n.material].flat()) { m.roughness = Math.max(m.roughness ?? 1, 0.8); m.metalness = 0; }
    });
    scene.add(holder);
    pieces.set(piece.id, holder);
    for (const [x, z, rotationY] of piece.copies ?? []) {
      const copy = holder.clone();
      copy.position.set(x, piece.position[1], z);
      copy.rotation.y = rotationY;
      scene.add(copy);
    }
  }).finally(() => { loaded += 1; onProgress(loaded / data.pieces.length); }));
  Promise.allSettled(loads).then((results) => {
    if (state.disposed) return;
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length === results.length) onError(failed[0].reason);
    else { if (failed.length) console.warn('Piezas que no cargaron:', failed.map((r) => r.reason?.message)); onReady(); }
  });

  // Lugares: un punto dorado muy sutil donde se mira desde cada lugar (no el actual) y una zona invisible para tocarlo.
  const pinMaterial = new THREE.SpriteMaterial({ map: halo, color: 0xe8c66a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const markers = data.spots.map((spot) => {
    const pin = new THREE.Sprite(pinMaterial);
    pin.scale.setScalar(0.28);
    pin.position.set(spot.look[0], spot.look[1] + 0.6, spot.look[2]);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), hitMaterial);
    hit.position.set(...spot.look);
    hit.userData.spot = spot.id;
    scene.add(pin, hit);
    return { spot, pin, hit };
  });

  // La viga con los nombres tallados: un poste del túnel; brilla apenas y solo se toca estando en el túnel.
  const fragment = data.fragment;
  const viga = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.5, 0.24), new THREE.MeshStandardMaterial({ map: vigaTexture(), roughness: 0.85 }));
  viga.position.set(fragment.position[0], 1.25, fragment.position[2]);
  viga.rotation.z = -0.04; // apuntalada contra la pared
  viga.castShadow = viga.receiveShadow = true;
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffe2a8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  glint.scale.setScalar(0.5);
  glint.position.set(fragment.position[0] - 0.15, fragment.position[1], fragment.position[2] + 0.15);
  const vigaHit = new THREE.Mesh(new THREE.BoxGeometry(fragment.radius * 1.4, 2.6, fragment.radius * 1.4), hitMaterial);
  vigaHit.position.copy(viga.position);
  scene.add(viga, glint, vigaHit);

  // El frente de carbón (la jornada de Ash), al fondo del túnel.
  const seam = data.seam ? createCoalSeam({ ...data.seam, mode: seamMode, onMatch: (m) => onSeamMatch(m), onComplete: (m) => onSeamComplete(m), sfx }) : null;
  if (seam) { scene.add(seam.group); state.updaters.push((dt) => seam.update(dt)); }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function ray(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster;
  }
  const canTouchFragment = () => !state.walk && state.current === fragment.spot && !state.found.includes(fragment.id);
  function pick(event) {
    const r = ray(event);
    if (canTouchFragment() && r.intersectObject(vigaHit, false).length) return { fragment: fragment.id };
    if (seam && !state.walk && state.current === data.seam.spot && seam.getState().match?.phase === 'playing' && seam.hits(r)) return { seam: true };
    const hit = r.intersectObjects(markers.filter((m) => m.spot.id !== state.current).map((m) => m.hit), false)[0];
    return hit ? { spot: hit.object.userData.spot } : null;
  }

  function goTo(id) {
    const to = spotById(id);
    if (!to || (!state.walk && state.current === id)) return;
    const from = camera.position.toArray();
    const path = pathBetween(from, to);
    const duration = walkDuration(path, { reducedMotion: state.reducedMotion });
    state.look = { yaw: 0, pitch: 0 };
    onWalk(id);
    if (duration === 0) {
      camera.position.set(...to.position);
      state.target = [...to.look];
      state.walk = null;
      state.current = id;
      onSpot(id);
      return;
    }
    state.walk = { path, fromTarget: [...state.target], toTarget: [...to.look], duration, t: 0, to: id };
  }

  const lookNow = new THREE.Vector3();
  state.updaters.push((dt, t) => {
    if (state.walk) {
      const walk = state.walk;
      walk.t = Math.min(1, walk.t + dt / walk.duration);
      const pose = poseAlong(walk.path, walk.fromTarget, walk.toTarget, walk.t);
      camera.position.set(...pose.position);
      state.target = pose.target;
      if (walk.t >= 1) { state.walk = null; state.current = walk.to; onSpot(walk.to); }
    } else {
      // Mirar alrededor: la mirada sigue al arrastre con un poco de inercia.
      const wanted = lookTarget(spotById(state.current), state.look.yaw, state.look.pitch);
      const k = 1 - Math.exp(-dt * 8);
      state.target = state.target.map((v, i) => v + (wanted[i] - v) * k);
    }
    camera.lookAt(lookNow.set(...state.target));
    for (const m of markers) m.pin.visible = m.spot.id !== state.current && !state.walk;
    pinMaterial.opacity = state.reducedMotion ? 0.45 : 0.35 + Math.sin(t * 2) * 0.15;
    glint.visible = !state.found.includes(fragment.id);
    glint.material.opacity = state.reducedMotion ? 0.25 : 0.16 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.18;
    if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(lookNow);
  });

  // Arrastrar mira alrededor; un toque sin arrastrar va al lugar tocado o toca la viga.
  const canvas = renderer.domElement;
  canvas.style.cursor = 'grab';
  function onDown(event) {
    state.drag = { x: event.clientX, y: event.clientY, yaw: state.look.yaw, pitch: state.look.pitch, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function onMove(event) {
    if (state.drag) {
      const dx = event.clientX - state.drag.x, dy = event.clientY - state.drag.y;
      if (Math.hypot(dx, dy) > 6) state.drag.moved = true;
      if (state.drag.moved && !state.walk) state.look = clampLook(state.drag.yaw - dx * 0.004, state.drag.pitch + dy * 0.003);
      canvas.style.cursor = 'grabbing';
      return;
    }
    canvas.style.cursor = pick(event) ? 'pointer' : 'grab';
  }
  function onUp(event) {
    const drag = state.drag;
    state.drag = null;
    canvas.style.cursor = 'grab';
    if (!drag || drag.moved) return;
    const picked = pick(event);
    if (picked?.fragment) onFragment(picked.fragment);
    else if (picked?.seam) seam.performAction();
    else if (picked?.spot) goTo(picked.spot);
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { state.drag = null; });

  // Acabado de cámara: desenfoque del fondo (solo escritorio), color, viñeta y grano. Sin bloom.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = budget.low ? null : new BokehPass(scene, camera, { focus: 9, aperture: 0.00012, maxblur: 0.005 });
  if (bokeh && !reducedMotion) composer.addPass(bokeh);
  const grade = createGradePass();
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  function resize() {
    const width = mount.clientWidth, height = Math.max(mount.clientHeight, 1);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(mount);

  const clock = new THREE.Timer();
  function animate(timestamp) {
    state.frame = requestAnimationFrame(animate);
    if (!shouldRenderFrame(timestamp, state.last, budget.frameMs)) return;
    state.last = timestamp;
    clock.update(timestamp);
    const dt = Math.min(clock.getDelta(), 0.05);
    state.elapsed += dt;
    for (const update of state.updaters) update(dt, state.elapsed);
    grade.uniforms.time.value = state.reducedMotion ? 0 : state.elapsed;
    composer.render(dt);
  }
  state.frame = requestAnimationFrame(animate);

  return {
    scene, camera, renderer, pieces, data, state,
    addUpdater(fn) { state.updaters.push(fn); },
    goTo,
    getCurrent: () => state.current,
    setSeamMode: (mode) => seam?.setMode(mode),
    seamAction: () => (state.current === data.seam?.spot && !state.walk ? seam?.performAction() ?? false : false),
    seamRetry: () => seam?.retry(),
    isWalking: () => Boolean(state.walk),
    setFound(ids) { state.found = [...ids]; },
    setReducedMotion(value) { state.reducedMotion = value; },
    resize,
    dispose() {
      state.disposed = true;
      cancelAnimationFrame(state.frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      scene.traverse((node) => {
        node.geometry?.dispose();
        const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
          material.dispose();
        }
      });
      state.env?.dispose();
      halo.dispose();
      composer.passes.forEach((pass) => pass.dispose?.());
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
