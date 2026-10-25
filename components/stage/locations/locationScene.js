import * as THREE from 'three';
import { ROOMS, interiorPath } from '../../../lib/locations/interiors.js';
import { disposeTree, placeModel } from './resources.js';
import { opaqueMeshes, auraInSight } from './navigationAuras.js';
import { createInterior } from './roomScene.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGradePass } from './grade.js';
import { BUILDERS, buildDust, buildFire, buildGround, buildLamp, buildWater, canvasTexture, haloTexture, pbrMaterials } from './builders.js';
import { JOBS } from './jobs.js';
import { createInteractable, LIGHT_ANGLE, LIGHT_RANGE } from './interactables.js';
import { clueArt } from './clueArt.js';
import { renderBudget, shouldRenderFrame } from '../../../lib/renderBudget.js';
import { pathBetween, walkDuration, poseAlong, lookTarget, clampLook } from '../../../lib/guidedCamera.js';

// Una escena realista de un distrito, con su propio renderer (como la urna de la Cosecha): mientras está abierta,
// el mapa se tapa y deja de dibujar. Se arma con los datos del lugar (lib/locations/*) y se libera entera al salir.

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
  jobMode = 'idle', onJobMatch = () => {}, onJobComplete = () => {}, sfx = { play() {} },
  tools = [], clues = [], onClue = () => {}, onHoldProgress = () => {}, onHoldHint = () => {}, onZone = () => {}, onTransition = () => {}, onRoomError = () => {} } = {}) {
  const budget = renderBudget(mount.clientWidth, 'auto', window.devicePixelRatio);
  const renderer = new THREE.WebGLRenderer({ antialias: !budget.low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(budget.pixelRatio);
  renderer.setSize(mount.clientWidth, Math.max(mount.clientHeight, 1), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = data.exposure ?? 0.95;
  renderer.shadowMap.enabled = !budget.low;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = 'location-canvas';
  renderer.domElement.setAttribute('role', 'img');
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(data.fog.color, data.fog.density);
  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.05, 160);
  const startSpot = data.spots.find((s) => s.id === data.start);
  camera.position.set(...startSpot.position);
  camera.lookAt(...startSpot.look);
  camera.rotation.order = 'YXZ';

  const state = {
    disposed: false, frame: 0, last: -Infinity, reducedMotion, elapsed: 0, updaters: [],
    current: startSpot.id, walk: null, look: { yaw: 0, pitch: 0 }, target: [...startSpot.look], drag: null, found: [],
    tools: [...tools], holding: null, zone: null, room: null, transition: false, generation: 0, clues: [...clues],
  };
  const rooms = ROOMS[data.id] ?? {};
  const activeSpots = () => state.zone ? state.room.definition.spots : data.spots;
  const spotById = (id) => { const spot = activeSpots().find((s) => s.id === id); return spot && { ...spot, panoramic: true }; };
  // Un lugar con `requires` aparece recién cuando se tiene esa herramienta.
  const spotOpen = (spot) => !spot.requires || state.tools.includes(spot.requires);
  const textures = new THREE.TextureLoader();

  // Cielo nocturno: ilumina poco y se ve oscuro y apenas desenfocado detrás de la niebla.
  new HDRLoader().loadAsync(data.sky.url).then((hdr) => {
    if (state.disposed) { hdr.dispose(); return; }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromEquirectangular(hdr);
    const env = envTarget.texture;
    state.envTarget = envTarget;
    hdr.dispose(); pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = data.sky.intensity;
    scene.background = env;
    scene.backgroundIntensity = data.sky.background;
    scene.backgroundBlurriness = 0.02;
    state.env = env;
  }).catch((error) => console.warn('No se pudo cargar el cielo:', error));

  // El sol o la luna (`data.sun`, la luna fría del 12 si no hay), con sombra, y la luz del cielo (`data.hemi`).
  const sun = data.sun ?? { color: 0x9fb6ff, intensity: 0.55, position: [-18, 28, 6] };
  const hemi = data.hemi ?? { sky: 0x22304a, ground: 0x0c0907, intensity: 0.35 };
  const moon = new THREE.DirectionalLight(sun.color, sun.intensity);
  moon.position.set(...sun.position);
  moon.target.position.set(0, 0, -24);
  moon.castShadow = !budget.low;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -32, right: 32, top: 40, bottom: -40, near: 1, far: 90 });
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target, new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  // El farol del minero, si ya se agarró: va con la cámara y alumbra hacia donde se mira (ahí aparecen las marcas).
  const lantern = new THREE.SpotLight(0xffc27a, 0, LIGHT_RANGE + 3, LIGHT_ANGLE, 0.45, 1.6);
  lantern.position.set(0.18, -0.22, 0);
  lantern.target.position.set(0, -0.05, -3);
  camera.add(lantern, lantern.target);
  scene.add(camera);
  const syncLantern = () => { lantern.intensity = state.tools.includes('farol') ? 26 : 0; };
  syncLantern();

  // Lo que arma la escena desde los datos: piso, calle, estructuras, luces, fuego y polvo (ver builders.js).
  const halo = haloTexture();
  const ctx = { textures: pbrMaterials(textures, data.textures), halo, budget, state };
  const built = [
    data.ground && buildGround(scene, data.ground, ctx),
    data.street && buildGround(scene, data.street, ctx),
    data.water && buildWater(scene, data.water, ctx),
    ...(data.structures ?? []).map((def) => BUILDERS[def.type](scene, def, ctx)),
    ...(data.lamps ?? []).map((def) => buildLamp(scene, def, ctx)),
    ...(data.fires ?? []).map((def) => buildFire(scene, def, ctx)),
    data.dust && buildDust(scene, data.dust, ctx),
  ].filter(Boolean);
  for (const { update } of built) if (update) state.updaters.push(update);

  // Las piezas: cada modelo se centra, se apoya en el piso y se escala a su alto (o a su escala si ya está en metros).
  const loader = new GLTFLoader();
  let loaded = 0;
  const pieces = new Map();
  const loads = data.pieces.map((piece) => loader.loadAsync(piece.url).then((gltf) => {
    if (state.disposed) { disposeTree(gltf.scene); return; }
    const holder = placeModel(gltf.scene, piece, budget.low);
    scene.add(holder);
    pieces.set(piece.id, holder);
    for (const item of items) if (item.def.piece === piece.id) item.attach(holder);
    for (const [x, z, rotationY] of piece.copies ?? []) {
      const copy = holder.clone();
      copy.position.set(x, piece.position[1], z);
      copy.rotation.set(piece.rotationX ?? 0, rotationY, piece.rotationZ ?? 0);
      scene.add(copy);
    }
  }).finally(() => { loaded += 1; onProgress(loaded / data.pieces.length); }));
  Promise.allSettled(loads).then((results) => {
    if (state.disposed) return;
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length === results.length) onError(failed[0].reason);
    else { obstacles = opaqueMeshes(scene); if (failed.length) console.warn('Piezas que no cargaron:', failed.map((r) => r.reason?.message)); onReady(); }
  });

  // Auras ancladas a puertas y caminos. Las casas llevan a un interior al terminar el acercamiento.
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const markers = [];
  let obstacles = [];
  const sightRay = new THREE.Raycaster();
  const activeMarkers = () => state.zone ? state.room.markers : markers;
  const activeItems = () => state.zone ? state.room.items : items;

  // Lo que se encuentra (interactables.js): agarrar, abrir, mantener presionado o alumbrar con el farol.
  const items = (data.interactables ?? []).filter((def) => !Object.values(rooms).some((room) => room.items.some((i) => i.id === def.id))).map((def) => {
    const item = createInteractable(def, { onFound: (id) => onClue(id), onHoldProgress: (p) => onHoldProgress(def.id, p), halo, texture: clueArt(def.art) });
    item.setDone(clues.includes(def.reveals));
    scene.add(item.group, item.hit);
    return Object.assign(item, { def });
  });

  // La viga con los nombres tallados (el fragmento del 12, `data.fragment`): un poste del túnel; brilla apenas y solo se
  // toca estando en el túnel. Los otros distritos tienen su fragmento entre lo que se encuentra (`interactables`).
  const fragment = data.fragment ?? null;
  const viga = fragment && new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.5, 0.24), new THREE.MeshStandardMaterial({ map: vigaTexture(), roughness: 0.85 }));
  const glint = fragment && new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffe2a8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  const vigaHit = fragment && new THREE.Mesh(new THREE.BoxGeometry(fragment.radius * 1.4, 2.6, fragment.radius * 1.4), hitMaterial);
  if (fragment) {
    viga.position.set(fragment.position[0], 1.25, fragment.position[2]);
    viga.rotation.z = -0.04; // apuntalada contra la pared
    viga.castShadow = viga.receiveShadow = true;
    glint.scale.setScalar(0.5);
    glint.position.set(fragment.position[0] - 0.15, fragment.position[1], fragment.position[2] + 0.15);
    vigaHit.position.copy(viga.position);
    scene.add(viga, glint, vigaHit);
  }

  // El frente de carbón (la jornada de Ash), al fondo del túnel.
  const job = data.job ? JOBS[data.job.type](data.job, { mode: jobMode, onMatch: (m) => onJobMatch(m), onComplete: (m) => onJobComplete(m), sfx, halo }) : null;
  if (job) { scene.add(job.group); state.updaters.push((dt, t) => job.update(dt, t)); }
  const atJob = () => job && !state.zone && !state.transition && !state.walk && state.current === data.job.spot;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function ray(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster;
  }
  const canTouchFragment = () => fragment && !state.zone && !state.walk && state.current === fragment.spot && !state.found.includes(fragment.id);
  function pick(event) {
    if (state.transition || state.walk) return null;
    const r = ray(event);
    if (canTouchFragment() && r.intersectObject(vigaHit, false).length) return { fragment: fragment.id };
    const here = state.walk ? [] : activeItems().filter((i) => i.spot === state.current && i.available(state.tools) && i.pickable());
    const touched = r.intersectObjects(here.map((i) => i.hit), false)[0];
    if (touched) return { item: here.find((i) => i.hit === touched.object) };
    const hit = r.intersectObjects(activeMarkers().filter((m) => m.available).map((m) => m.hit), false)[0];
    if (!hit) return null;
    const obstacle = r.intersectObjects(state.zone ? state.room.obstacles : obstacles, false)[0];
    if (obstacle && obstacle.distance < hit.distance - 0.1) return null;
    return { spot: hit.object.userData.spot };
  }

  function goTo(id) {
    const to = spotById(id);
    if (!to || state.transition || !spotOpen(to)) return;
    if (to.exit) { exitInterior(); return; }
    if (!state.walk && state.current === id) { if (!state.zone && rooms[id]) enterInterior(); return; }
    const from = camera.position.toArray();
    const path = state.zone ? interiorPath(from, to) : pathBetween(from, to);
    const duration = walkDuration(path, { reducedMotion: state.reducedMotion });
    state.look = { yaw: 0, pitch: 0 };
    onWalk(id);
    if (duration === 0) {
      camera.position.set(...to.position);
      state.target = [...to.look];
      state.walk = null;
      state.current = id;
      onSpot(id);
      if (!state.zone && rooms[id]) enterInterior();
      return;
    }
    state.walk = { path, fromTarget: [...state.target], toTarget: [...to.look], duration, t: 0, to: id };
  }

  const lookNow = new THREE.Vector3();
  const lightDir = new THREE.Vector3();
  const navigationUpdate = (dt, t) => {
    if (state.walk) {
      const walk = state.walk;
      walk.t = Math.min(1, walk.t + dt / walk.duration);
      const pose = poseAlong(walk.path, walk.fromTarget, walk.toTarget, walk.t);
      camera.position.set(...pose.position);
      state.target = pose.target;
      if (walk.t >= 1) { state.walk = null; state.current = walk.to; onSpot(walk.to); if (!state.zone && rooms[walk.to]) enterInterior(); }
    } else {
      // Mirar alrededor: la mirada sigue al arrastre con un poco de inercia.
      const wanted = lookTarget(spotById(state.current), state.look.yaw, state.look.pitch);
      const k = 1 - Math.exp(-dt * 8);
      state.target = state.target.map((v, i) => v + (wanted[i] - v) * k);
    }
    camera.lookAt(lookNow.set(...state.target));
    const checkSight = !state.auraCheckAt || t - state.auraCheckAt > 0.18;
    if (checkSight) {
      (state.zone ? state.room.scene : scene).updateMatrixWorld(true);
      state.auraCheckAt = t;
    }
    const activeObstacles = state.zone ? state.room.obstacles : obstacles;
    for (const m of activeMarkers()) {
      if (checkSight) m.inSight = auraInSight(m, camera, activeObstacles, sightRay);
      m.available = Boolean((m.spot.id !== state.current || (!state.zone && rooms[m.spot.id])) && !state.walk && !state.transition && spotOpen(m.spot) && m.inSight);
      m.pin.visible = m.available;
      m.pin.material.opacity = state.reducedMotion ? 0.68 : 0.55 + Math.sin(t * 1.7 + m.pin.position.z) * 0.16;
    }
    const label = `Vista 3D de ${state.zone ? state.room.definition.title : data.title}. Arrastrá para mirar. Usá los botones de lugares para moverte.`;
    if (canvas.getAttribute('aria-label') !== label) canvas.setAttribute('aria-label', label);
    const lit = state.tools.includes('farol') ? { lightFrom: camera.position, lightDir: camera.getWorldDirection(lightDir) } : {};
    for (const item of activeItems()) item.update(dt, t, { ...lit, reducedMotion: state.reducedMotion });
    if (glint) glint.visible = !state.found.includes(fragment.id);
    if (glint) glint.material.opacity = state.reducedMotion ? 0.25 : 0.16 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.18;
    if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(lookNow);
  };
  state.updaters.push(navigationUpdate);

  // Arrastrar mira alrededor; un toque sin arrastrar va al lugar tocado o toca la viga.
  const canvas = renderer.domElement;
  canvas.style.cursor = 'grab';
  function onDown(event) {
    // En el lugar de la jornada, lo que se toca primero es la jornada (picar, cosechar, cargar la red).
    if (atJob() && job.pointerDown(ray(event))) {
      state.jobPointer = true;
      canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    // Mantener presionado sobre un cartel lo va limpiando; no mira alrededor mientras tanto.
    const picked = pick(event);
    if (picked?.item?.kind === 'hold') {
      picked.item.holdStart();
      state.holding = { item: picked.item, at: performance.now() };
      canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    state.drag = { x: event.clientX, y: event.clientY, yaw: state.look.yaw, pitch: state.look.pitch, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function onMove(event) {
    // Arrastrando sobre la jornada (rozar espigas, apuntar la red) no se mira alrededor.
    if (state.jobPointer) { job.pointerMove(ray(event)); return; }
    if (state.drag) {
      const dx = event.clientX - state.drag.x, dy = event.clientY - state.drag.y;
      if (Math.hypot(dx, dy) > 6) state.drag.moved = true;
      if (state.drag.moved && !state.walk) state.look = clampLook(state.drag.yaw - dx * 0.004, state.drag.pitch + dy * 0.003, { panoramic: true });
      canvas.style.cursor = 'grabbing';
      return;
    }
    canvas.style.cursor = (atJob() && job.pointerMove(ray(event))) || pick(event) ? 'pointer' : 'grab';
  }
  function endHold() {
    const { item, at } = state.holding;
    state.holding = null;
    item.holdEnd();
    // Un toque corto no alcanza: se avisa que hay que mantener presionado.
    if (!item.isDone() && performance.now() - at < 300) onHoldHint(item.id);
  }
  function onUp(event) {
    if (state.holding) { endHold(); return; }
    if (state.jobPointer) { state.jobPointer = false; job.pointerUp(ray(event)); return; }
    const drag = state.drag;
    state.drag = null;
    canvas.style.cursor = 'grab';
    if (!drag || drag.moved) return;
    const picked = pick(event);
    if (picked?.fragment) onFragment(picked.fragment);
    else if (picked?.item) picked.item.tap();
    else if (picked?.spot) goTo(picked.spot);
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  function onCancel() { state.drag = null; state.jobPointer = false; if (state.holding) endHold(); }
  canvas.addEventListener('pointercancel', onCancel);

  // Acabado de cámara: desenfoque del fondo (solo escritorio), color, viñeta y grano. Sin bloom.
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bokeh = budget.low ? null : new BokehPass(scene, camera, { focus: 9, aperture: 0.00012, maxblur: 0.005 });
  if (bokeh && !reducedMotion) composer.addPass(bokeh);
  const grade = createGradePass();
  if (data.neutralGrade) grade.uniforms.splitTone.value = 0;
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  function setRenderScene(next) {
    renderPass.scene = next;
    if (bokeh) bokeh.scene = next;
  }
  async function enterInterior() {
    const roomDef = rooms[state.current];
    if (!roomDef || state.zone || state.transition || state.disposed) return;
    state.transition = true;
    state.walk = null;
    const token = ++state.generation;
    state.returnPose = { position: camera.position.toArray(), target: [...state.target], current: state.current };
    onTransition('loading');
    try {
      const room = await createInterior(data, roomDef, { loader, halo, budget, tools: state.tools, clues: state.clues, environment: state.env,
        onClue, onHoldProgress, onHoldHint, isCancelled: () => state.disposed || token !== state.generation });
      if (state.disposed || token !== state.generation) { room?.dispose(); return; }
      state.room = room; state.zone = roomDef.id; state.auraCheckAt = 0;
      room.items.forEach((item) => item.setDone(state.clues.includes(item.reveals)));
      const entry = roomDef.spots.find((s) => s.id === roomDef.start);
      camera.position.set(...entry.position); state.target = [...entry.look]; state.look = { yaw: 0, pitch: 0 };
      state.current = entry.id;
      room.scene.add(camera); setRenderScene(room.scene);
      state.transition = false;
      onZone(roomDef); onSpot(entry.id); onTransition(null);
    } catch (error) {
      if (state.disposed || token !== state.generation) return;
      state.transition = false; onTransition(null);
      onRoomError('No se pudo abrir este lugar. Usá el botón del lugar para reintentar.');
      console.warn('Interior no disponible:', error);
    }
  }
  function exitInterior() {
    if (!state.zone && !state.transition) return false;
    ++state.generation;
    state.transition = false; state.walk = null; state.drag = null;
    if (state.holding) endHold();
    state.zone = null; state.auraCheckAt = 0;
    scene.add(camera); setRenderScene(scene);
    state.room?.dispose(); state.room = null;
    const pose = state.returnPose;
    camera.position.set(...pose.position); state.target = [...pose.target]; state.current = pose.current;
    state.look = { yaw: 0, pitch: 0 };
    onZone(null); onSpot(pose.current); onTransition(null);
    return true;
  }

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
    for (const update of state.updaters) { if (!state.zone || update === navigationUpdate) update(dt, state.elapsed); }
    grade.uniforms.time.value = state.reducedMotion ? 0 : state.elapsed;
    composer.render(dt);
  }
  state.frame = requestAnimationFrame(animate);

  return {
    scene, camera, renderer, pieces, data, state, job,
    addUpdater(fn) { state.updaters.push(fn); },
    goTo,
    exitInterior,
    getZone: () => state.zone,
    interact(id) { if (state.transition || state.walk) return; const item = activeItems().find((i) => i.id === id && i.spot === state.current && i.available(state.tools) && i.pickable()); item?.tap(); },
    getCurrent: () => state.current,
    setJobMode: (mode) => job?.setMode(mode),
    jobAction: () => (atJob() ? job.performAction() ?? false : false),
    jobRetry: () => job?.retry(),
    jobInput: (i) => (atJob() ? job.input?.(i) : undefined), // el silbido del 11: el sinsajo número i
    isWalking: () => Boolean(state.walk),
    setFound(ids) { state.found = [...ids]; },
    // Lo que ya está en la historia (herramientas, marcas, pistas y fragmentos) queda hecho en la escena.
    setClues(ids) { state.clues = [...ids]; for (const item of [...items, ...(state.room?.items ?? [])]) if (item.isDone() !== ids.includes(item.reveals)) item.setDone(ids.includes(item.reveals)); },
    setTools(ids) { state.tools = [...ids]; syncLantern(); },
    setReducedMotion(value) { state.reducedMotion = value; if (bokeh) bokeh.enabled = !value; if (value && state.walk) state.walk.t = 1; },
    resize,
    dispose() {
      state.disposed = true;
      cancelAnimationFrame(state.frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      scene.add(camera);
      state.room?.dispose();
      disposeTree(scene);
      state.envTarget?.dispose();
      halo.dispose();
      composer.passes.forEach((pass) => pass.dispose?.());
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
