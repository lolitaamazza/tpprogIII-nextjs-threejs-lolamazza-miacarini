import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createArchiveScene } from './games/archiveScene.js';
import { loadPanemMap } from './mapMesh.js';
import { createCameraRig } from './cameraRig.js';
import { fogRangeFor, poseFor, viewShiftFor } from './cameraPoses.js';
import { createSparks } from './effects.js';
import { createBroadcastHall } from './broadcastHall.js';
import { screenPoseFor } from '../../lib/broadcastHall.js';
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
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:40});
  sun.shadow.bias=-.001;
  sun.shadow.normalBias=.025;
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
    hall: null, hallLoading: null, portal: null,
    archive: null, archiveChapter: null, run: null, gamesPaused: false, reducedMotion: false, quality: 'auto', composer: null, bloom: null, cinematic: null,
  };

  function resize() {
    const width = mount.clientWidth;
    const height = Math.max(mount.clientHeight, 1);
    renderer.setSize(width, height, false);
    state.composer?.setSize(width, height);
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

  // La sala de la intro se arma al entrar a "/" y se libera al salir.
  function ensureHall() {
    if (state.hall || state.hallLoading) return;
    state.hallLoading = createBroadcastHall()
      .then((hall) => {
        state.hallLoading = null;
        if (state.disposed || state.route.scene !== 'intro') { hall.dispose(); return; }
        state.hall = hall;
        scene.add(hall.group);
      })
      .catch((error) => { state.hallLoading = null; console.warn('No se pudo armar la sala de la intro:', error); });
  }

  function releaseHall() {
    finishPortal(false);
    state.hall?.dispose();
    state.hall = null;
  }

  function releaseComposer() {
    if (!state.composer) return;
    state.composer.passes.forEach((pass) => pass.dispose?.());
    state.composer.dispose(); state.composer = null; state.bloom = null;
  }

  function configureQuality() {
    const low = state.quality === 'low' || (state.quality === 'auto' && mount.clientWidth < 721);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5));
    renderer.shadowMap.enabled = Boolean(state.archive) && !low;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    sun.castShadow = Boolean(state.archive) && !low;
    state.archive?.setQuality(low ? 'low' : 'high');
    if (!state.archive || low || state.reducedMotion) releaseComposer();
    else if (!state.composer) {
      try {
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloom = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), .22, .35, .8);
        composer.addPass(bloom); composer.addPass(new OutputPass());
        state.composer = composer; state.bloom = bloom;
      } catch { releaseComposer(); }
    }
    state.composer?.setPixelRatio(renderer.getPixelRatio());
    resize();
  }

  function applyRoute() {
    const { route, map } = state;
    state.cinematic = null;
    // Al salir de la intro la cámara corta al mapa: volar desde la sala cruzaría 60 unidades de nada.
    const leavingIntro = state.poseRoute?.scene === 'intro' && route.scene !== 'intro';
    state.poseRoute = route;
    rig.goTo(poseFor(route, map?.centers, state.aspect), leavingIntro ? 0 : 1.6);
    if (route.scene === 'intro') ensureHall(); else releaseHall();
    const chapter = route.scene === 'games' ? route.chapter : null;
    if (chapter !== state.archiveChapter) {
      state.archive?.dispose(); state.archive = null; state.archiveChapter = chapter;
      if (chapter) {
        state.archive = createArchiveScene(chapter, (status) => window.dispatchEvent(new CustomEvent('panem-arena-status', {detail:status})));
        state.archive.setRun(state.run);
        state.archive.setReducedMotion(state.reducedMotion);
        state.archive.setQuality(state.quality);
        scene.add(state.archive.group);
      }
    }
    if (map) map.group.visible = !chapter;
    configureQuality();
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

  // Entrada a la pantalla: la cámara vuela hasta llenar la vista con la tele, que muestra el mapa como un portal
  // (se muestrea en coordenadas de pantalla). Cuando la pantalla tapa todo, se corta a la misma vista del mapa.
  function finishPortal(completed) {
    const portal = state.portal;
    if (!portal) return;
    state.portal = null;
    if (completed) {
      rig.goTo(portal.mapPose, 0);
      if (state.hall) state.hall.group.visible = false;
    }
    state.hall?.setPortal(null, 0, 1, 1);
    portal.target.dispose();
    portal.resolve();
  }

  function renderPortal(dt) {
    const portal = state.portal;
    portal.t = Math.min(1, portal.t + dt / portal.seconds);
    const amount = Math.min(1, Math.max(0, (portal.t - 0.3) / 0.45));
    if (amount > 0) {
      state.hall.group.visible = false;
      renderer.setRenderTarget(portal.target);
      renderer.setClearColor(0x0b0b0c, 1);
      renderer.clear();
      renderer.render(scene, portal.camera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      state.hall.group.visible = true;
    }
    state.hall.setPortal(portal.target.texture, amount, portal.width, portal.height);
    if (portal.t >= 1) finishPortal(true);
  }

  function animate(timestamp) {
    state.frame = requestAnimationFrame(animate);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    const elapsed = timer.getElapsed();
    if (!state.gamesPaused || state.route.scene !== 'games') {
      rig.update(dt);
      if (state.cinematic) {
        state.cinematic.remaining -= dt;
        if (state.cinematic.remaining <= 0) {
          rig.goTo(poseFor(state.route, state.map?.centers, state.aspect), 1.4);
          state.cinematic = null;
        }
      }
    }
    const fog = fogRangeFor(camera.position.length());
    scene.fog.near = fog.near;
    scene.fog.far = fog.far;
    applyViewShift(dt);
    state.map?.update(dt, elapsed, {
      hoveredId: state.hovered ?? state.externalHover, focusId: focusFor(state.route), hideSealId: state.dioramaId,
      lit: state.lit, finaleLit: state.finaleLit,
    });
    state.diorama?.update(dt, elapsed);
    if (!state.gamesPaused) state.archive?.update(dt, elapsed);
    if (state.hall) {
      state.hall.update(dt, elapsed);
      if (state.portal) renderPortal(dt);
    }
    sparks.update(dt);
    if (state.composer && state.route.scene === 'games') state.composer.render(dt);
    else renderer.render(scene, camera);
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

  const observer = new ResizeObserver(configureQuality);
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
    getGamesAssetStatus() { return state.archive?.getAssetStatus() ?? null; },
    setRoute(route) { state.route = route; applyRoute(); },
    setLit(ids) { state.lit = ids; },
    setHovered(id) { state.externalHover = id; },
    setReducedMotion(value) { state.reducedMotion = value; rig.setReducedMotion(value); state.archive?.setReducedMotion(value); configureQuality(); },
    setGamesRun(run) {
      const previous = state.run;
      state.run = run; state.archive?.setRun(run);
      if (run && previous?.id === run.id && previous.turn !== run.turn && state.route.scene === 'games' && !state.reducedMotion) {
        const event = run.events.filter((e) => e.turn === run.turn).find((e) => e.type === 'decision' || e.type === 'elimination' || e.type === 'encounter');
        const point = state.archive?.focus(event?.actors[0] || run.selectedId);
        if (point) {
          rig.goTo({ position: [point.x + 5, point.y + 5.5, point.z + 7], target: [point.x, point.y + .4, point.z] }, .8);
          state.cinematic = { remaining: 2.2 };
        }
      }
    },
    focusGamesTribute(id) {
      const point=state.archive?.focus(id);
      if(!point || state.route.scene!=='games')return;
      rig.goTo({position:[point.x+3,point.y+3.6,point.z+4.5],target:[point.x,point.y+.65,point.z]},state.reducedMotion?0:.8);
      state.cinematic={remaining:3.5};
    },
    setGamesPaused(value) { state.gamesPaused = value; },
    skipGamesIntro() { state.cinematic = null; if (state.route.scene === 'games') rig.goTo(poseFor(state.route, state.map?.centers, state.aspect), 0); },
    setGamesQuality(value) {
      state.quality = value;
      configureQuality();
    },
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
    // La intro maneja la sala con esto. Sin sala (todavía cargando o sin WebGL) las llamadas no hacen nada.
    hall: {
      ready: () => Boolean(state.hall),
      setPower: (on) => state.hall?.setPower(on),
      setView: (view) => state.hall?.setView(view),
      setGlitch: (glitch) => state.hall?.setGlitch(glitch),
      setSmallTvs: (mode) => state.hall?.setSmallTvs(mode),
      screenRect: () => state.hall?.screenRect(camera, mount.clientWidth, mount.clientHeight) ?? null,
      enter(seconds = 2.4) {
        return new Promise((resolve) => {
          if (!state.hall) { resolve(); return; }
          finishPortal(false);
          const size = renderer.getDrawingBufferSize(new THREE.Vector2());
          const mapPose = poseFor({ scene: 'mapa', districtId: null }, state.map?.centers, state.aspect);
          const portalCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);
          portalCamera.position.set(...mapPose.position);
          portalCamera.lookAt(new THREE.Vector3(...mapPose.target));
          state.portal = {
            t: 0, seconds, mapPose, camera: portalCamera, width: size.x, height: size.y, resolve,
            target: new THREE.WebGLRenderTarget(size.x, size.y),
          };
          rig.goTo(screenPoseFor(state.aspect), seconds);
        });
      },
    },
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
      state.archive?.dispose();
      releaseComposer();
      releaseHall();
      state.map?.dispose();
      sparks.dispose();
      timer.dispose();
      rig.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
