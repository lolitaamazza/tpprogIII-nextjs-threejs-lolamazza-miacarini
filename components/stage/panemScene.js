import * as THREE from 'three';
import { loadPanemMap } from './mapMesh.js';
import { createCameraRig } from './cameraRig.js';
import { fogRangeFor, poseFor, viewShiftFor } from './cameraPoses.js';
import { createSparks } from './effects.js';
import { DIORAMAS } from './dioramas/index.js';
import { MAP_IDS } from '../../data/districts.js';

const CLICK_TOLERANCE_PX = 6;

function focusFor(route) {
  if (route.scene === 'distrito') return route.districtId;
  if (route.scene === 'capitolio') return 'c';
  return null;
}

export function createPanemScene(mount, callbacks) {
  // WebGLRenderer lanza una excepción si el navegador no tiene WebGL: la atrapa PanemStage.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0c, 16, 34);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.8);
  sun.position.set(4, 10, 6);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8899ff, 0.4);
  rim.position.set(-6, 4, -8);
  scene.add(rim);

  const rig = createCameraRig(camera);
  const sparks = createSparks(scene);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const timer = new THREE.Timer();
  const state = {
    route: { scene: 'intro', districtId: null }, lit: [], hovered: null, externalHover: null,
    map: null, diorama: null, dioramaId: null, finaleLit: new Set(), finaleTimers: [],
    aspect: 1, disposed: false, frame: 0, down: null, running: false,
    shift: { x: 0, y: 0 }, finaleRunning: false, poseRoute: { scene: 'intro', districtId: null },
  };

  function resize() {
    const width = mount.clientWidth;
    const height = Math.max(mount.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // La distancia de la cámara depende de la proporción de la pantalla: se reubica si cambia de verdad.
    const changed = Math.abs(state.aspect - camera.aspect) > 0.02;
    state.aspect = camera.aspect;
    if (changed) rig.goTo(poseFor(state.poseRoute, state.map?.centers, state.aspect), 0.5);
  }

  function disposeDiorama() {
    if (!state.diorama) return;
    state.diorama.dispose();
    state.diorama = null;
    state.dioramaId = null;
  }

  function buildDiorama(id) {
    const completed = state.lit.includes(id);
    const centers = state.map.centers;
    state.diorama = DIORAMAS[id]({
      origin: centers[id], completed, sfx: callbacks.sfx, rig,
      onProgress: (value) => callbacks.onProgress(id, value),
      onComplete: () => { callbacks.onComplete(id); sparks.emit(centers[id], centers.c); },
    });
    state.dioramaId = id;
    scene.add(state.diorama.group);
    callbacks.onProgress(id, completed ? 1 : 0);
  }

  function applyRoute() {
    const { route, map } = state;
    state.poseRoute = route;
    rig.goTo(poseFor(route, map?.centers, state.aspect), 1.6);
    const wanted = route.scene === 'distrito' && map && DIORAMAS[route.districtId] ? route.districtId : null;
    if (wanted !== state.dioramaId) {
      disposeDiorama();
      if (wanted) buildDiorama(wanted);
    }
    if (route.scene !== 'mapa' && state.hovered) { state.hovered = null; callbacks.onHover(null); }
  }

  function setPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function pickDistrict() {
    if (!state.map) return null;
    const hit = raycaster.intersectObjects(state.map.meshes, false)[0];
    return hit?.object.userData.districtId ?? null;
  }

  function onPointerMove(event) {
    setPointer(event);
    let cursor = 'default';
    if (state.diorama) {
      if (state.diorama.pointerMove(raycaster)) cursor = 'pointer';
    } else if (state.route.scene === 'mapa') {
      const id = pickDistrict();
      if (id !== state.hovered) {
        state.hovered = id;
        callbacks.onHover(id);
        if (id) callbacks.sfx.play('tick');
      }
      if (id) cursor = 'pointer';
    }
    renderer.domElement.style.cursor = cursor;
  }

  function onPointerDown(event) {
    setPointer(event);
    state.down = { x: event.clientX, y: event.clientY };
    if (state.diorama) {
      renderer.domElement.setPointerCapture?.(event.pointerId);
      state.diorama.pointerDown(raycaster);
    }
  }

  function onPointerUp(event) {
    setPointer(event);
    const down = state.down;
    state.down = null;
    if (state.diorama) { state.diorama.pointerUp(raycaster); return; }
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_TOLERANCE_PX) return;
    if (state.route.scene !== 'mapa') return;
    const id = pickDistrict();
    if (id) callbacks.onSelect(id);
  }

  function onPointerLeave() {
    if (state.hovered) { state.hovered = null; callbacks.onHover(null); }
  }

  // El panel (escritorio) o la hoja inferior (celular) tapan parte del canvas: se corre la vista
  // para que el distrito quede centrado en la zona libre. Durante el final la vista queda centrada.
  function applyViewShift(dt) {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const target = state.finaleRunning ? { x: 0, y: 0 } : viewShiftFor(state.route, width, height);
    const blend = 1 - Math.exp(-5 * dt);
    state.shift.x += (target.x - state.shift.x) * blend;
    state.shift.y += (target.y - state.shift.y) * blend;
    const settled = Math.abs(state.shift.x) < 0.05 && Math.abs(state.shift.y) < 0.05;
    if (settled && target.x === 0 && target.y === 0) {
      if (camera.view?.enabled) { camera.clearViewOffset(); camera.updateProjectionMatrix(); }
    } else {
      camera.setViewOffset(width, height, state.shift.x, state.shift.y, width, height);
    }
  }

  function animate(timestamp) {
    state.frame = requestAnimationFrame(animate);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    const elapsed = timer.getElapsed();
    rig.update(dt);
    const fog = fogRangeFor(camera.position.length());
    scene.fog.near = fog.near;
    scene.fog.far = fog.far;
    applyViewShift(dt);
    state.map?.update(dt, elapsed, {
      hoveredId: state.hovered ?? state.externalHover, focusId: focusFor(state.route), hideSealId: state.dioramaId,
      lit: state.lit, finaleLit: state.finaleLit,
    });
    state.diorama?.update(dt, elapsed);
    sparks.update(dt);
    renderer.render(scene, camera);
  }

  function start() {
    if (state.running || state.disposed) return;
    state.running = true;
    timer.reset();
    state.frame = requestAnimationFrame(animate);
  }

  function stop() {
    state.running = false;
    cancelAnimationFrame(state.frame);
  }

  function onVisibility() {
    if (document.hidden) stop(); else start();
  }

  function clearFinale() {
    state.finaleRunning = false;
    state.finaleTimers.forEach(clearTimeout);
    state.finaleTimers = [];
    state.finaleLit.clear();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  resize();
  rig.goTo(poseFor(state.route, null, state.aspect), 0);
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);
  start();

  loadPanemMap('/assets/panem.svg')
    .then((map) => {
      if (state.disposed) { map.dispose(); return; }
      state.map = map;
      scene.add(map.group);
      applyRoute();
    })
    .catch((error) => callbacks.onError?.(error));

  return {
    setRoute(route) { state.route = route; applyRoute(); },
    setLit(ids) { state.lit = ids; },
    setHovered(id) { state.externalHover = id; },
    setReducedMotion(value) { rig.setReducedMotion(value); },
    // true si había un diorama que tomó la acción; si no (mapa sin cargar o caído), quien llama la cuenta por su cuenta.
    performAction() {
      if (!state.diorama) return false;
      state.diorama.performAction();
      return true;
    },
    playFinale(onDone) {
      clearFinale();
      const map = state.map;
      if (!map) { onDone?.(); return; }
      state.finaleRunning = true;
      state.poseRoute = { scene: 'finale', districtId: null };
      rig.goTo(poseFor(state.poseRoute, map.centers, state.aspect), 2);
      const c = map.centers.c;
      const distance = (id) => Math.hypot(map.centers[id].x - c.x, map.centers[id].z - c.z);
      const order = MAP_IDS.filter((id) => id !== 'c' && id !== '13' && map.centers[id]).sort((a, b) => distance(a) - distance(b));
      const at = (seconds, fn) => state.finaleTimers.push(setTimeout(fn, seconds * 1000));
      at(0, () => { state.finaleLit.add('c'); callbacks.sfx.play('ignite'); });
      order.forEach((id, i) => at(0.4 + i * 0.22, () => { state.finaleLit.add(id); sparks.emit(c, map.centers[id]); }));
      const last = 0.4 + order.length * 0.22 + 1.2;
      at(last, () => { state.finaleLit.add('13'); sparks.emit(c, map.centers['13']); callbacks.sfx.play('ignite'); });
      at(last + 1.5, () => { state.finaleRunning = false; onDone?.(); });
    },
    cancelFinale: clearFinale,
    getInfo() {
      return {
        canvases: mount.querySelectorAll('canvas').length,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      };
    },
    dispose() {
      state.disposed = true;
      stop();
      clearFinale();
      observer.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      disposeDiorama();
      state.map?.dispose();
      sparks.dispose();
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
