import * as THREE from 'three';
import { loadPanemMap } from './mapMesh.js';
import { createCameraRig } from './cameraRig.js';
import { fogRangeFor, gamesViewPose, poseFor, viewShiftFor } from './cameraPoses.js';
import { createSparks } from './effects.js';
import { screenPoseFor } from '../../lib/broadcastHall.js';
import { mapClickAction } from '../../lib/mapClick.js';
import { createClassifiedGlitch } from './classifiedGlitch.js';
import { dioramaLook } from '../../lib/dioramaLook.js';
import { renderBudget, shouldRenderFrame } from '../../lib/renderBudget.js';
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
  renderer.setPixelRatio(renderBudget(mount.clientWidth,'auto',window.devicePixelRatio).pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0c, 16, 34);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.8);
  sun.position.set(4, 10, 6);
  scene.add(sun.target);
  // La luz del mapa; cada minijuego trae la suya (lib/dioramaLook.js) y al salir se vuelve a esta.
  const mapLight = { color: sun.color.clone(), intensity: sun.intensity, position: sun.position.clone(), ambient: ambient.intensity };
  const lightColor = new THREE.Color();
  const lightPosition = new THREE.Vector3();
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:40});
  sun.shadow.bias=-.001;
  sun.shadow.normalBias=.025;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8899ff, 0.4);
  rim.position.set(-6, 4, -8);
  scene.add(rim);

  let sceneDisposed=false;
  let archiveFactory=null,archiveLoading=false,dioramaBuilders=null,dioramasLoading=false,postFactory=null,postLoading=false,mapLoading=false;
  // El mapa no necesita modelos, HDRI ni shaders de las escenas que todavía no se visitaron.
  function environment(url){return import('./dioramas/assets.js').then(m=>m.loadEnvironment(renderer,url));}
  function ensureMap(){
    if(state.map||mapLoading)return;
    mapLoading=true;
    loadPanemMap('/assets/panem.svg',{isCancelled:()=>state.disposed}).then(map=>{
      mapLoading=false;if(!map)return;if(state.disposed){map.dispose();return;}
      state.map=map;scene.add(map.group);applyRoute();
    }).catch(error=>{mapLoading=false;if(!state.disposed)callbacks.onError?.(error);});
  }
  function ensureRouteModules(){
    if(state.route.scene==='games'&&!archiveFactory&&!archiveLoading){
      archiveLoading=true;
      import('./games/archiveScene.js').then(m=>{archiveLoading=false;if(state.disposed)return;archiveFactory=m.createArchiveScene;applyRoute();}).catch(error=>{archiveLoading=false;if(!state.disposed)callbacks.onError?.(error);});
    }
    if(state.route.scene==='distrito'&&state.route.districtId!=='13'&&!dioramaBuilders&&!dioramasLoading){
      dioramasLoading=true;
      import('./dioramas/index.js').then(m=>{dioramasLoading=false;if(state.disposed)return;dioramaBuilders=m.DIORAMAS;applyRoute();}).catch(error=>{dioramasLoading=false;if(!state.disposed)callbacks.onError?.(error);});
    }
  }
  const rig = createCameraRig(camera);
  const sparks = createSparks(scene);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const timer = new THREE.Timer();
  const state = {
    route: { scene: 'intro', districtId: null }, lit: [], earned: [], hovered: null, externalHover: null,
    map: null, diorama: null, dioramaId: null, finaleLit: new Set(), finaleTimers: [],
    aspect: 1, disposed: false, frame: 0, down: null, running: false,
    shift: { x: 0, y: 0 }, finaleRunning: false, poseRoute: { scene: 'intro', districtId: null },
    hall: null, hallLoading: null, portal: null, glitch: null, wantGlitch: false, classifiedRevealed: false, gamesView: 'follow',
    gamesCovered:false, archive: null, archiveChapter: null, run: null, gamesPaused: false, reducedMotion: false, quality: 'auto', frameMs: renderBudget(mount.clientWidth).frameMs, lastFrame: -Infinity, composer: null, bloom: null, cinematic: null,
  };

  // La arena se mira desde la mesa de los Vigilantes o siguiendo a tu tributo (si sigue en pie); el resto, como siempre.
  function poseNow() {
    const route = state.poseRoute ?? state.route;
    if (route?.scene === 'games' && (route.chapter === 'arena' || route.chapter === 'ended')) {
      const selected = state.run?.tributes.find((t) => t.id === state.run.selectedId);
      const focus = state.gamesView === 'follow' && selected?.alive ? state.archive?.focus(selected.id) : null;
      return gamesViewPose(state.gamesView, focus, state.aspect);
    }
    return poseFor(route, state.map?.centers, state.aspect);
  }

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
    if (changed) rig.goTo(poseNow(), 0.5);
    // La imagen rota del Distrito 13 se congela con el tamaño de pantalla: si cambia, se vuelve a romper.
    if (state.glitch) releaseGlitch();
  }

  function releaseGlitch() {
    state.glitch?.dispose();
    state.glitch = null;
  }

  // Distrito 13: se arma recién cuando el mapa está cargado (la imagen rota es una foto del mapa).
  function ensureGlitch() {
    if (state.glitch || !state.wantGlitch || !state.map) return;
    state.glitch = createClassifiedGlitch({
      renderer, scene, camera, reducedMotion: state.reducedMotion, revealed: state.classifiedRevealed,
      onProgress: (value) => callbacks.onClassifiedProgress?.(value),
      onReveal: () => callbacks.onClassifiedReveal?.(),
    });
    callbacks.sfx.play('cut');
  }

  function disposeDiorama() {
    if (!state.diorama) return;
    state.diorama.dispose();
    state.diorama = null;
    state.dioramaId = null;
  }

  function buildDiorama(id) {
    const completed = state.earned.includes(id);
    const centers = state.map.centers;
    state.diorama = dioramaBuilders[id]({
      origin: centers[id], completed, sfx: callbacks.sfx, rig,
      onProgress: (value) => callbacks.onProgress(id, value),
      onMatch: (match) => callbacks.onMatch?.(id, match),
      onComplete: () => { callbacks.onComplete(id); sparks.emit(centers[id], centers.c); },
    });
    state.dioramaId = id;
    scene.add(state.diorama.group);
    // Sombras suaves del sol bajo: todo lo opaco del diorama proyecta y recibe.
    state.diorama.group.traverse((node) => { if (node.isMesh) { node.castShadow = !node.material.transparent; node.receiveShadow = true; } });
    state.lookEnv = null;
    const look = dioramaLook(id);
    if (look) environment(look.env).then((env) => { if (state.dioramaId === id) state.lookEnv = env; });
    callbacks.onProgress(id, completed ? 1 : 0);
  }

  // Funde la luz hacia la del minijuego activo (o de vuelta a la del mapa) en menos de un segundo.
  function applyLook(dt) {
    const look = state.dioramaId ? dioramaLook(state.dioramaId) : null;
    const k = 1 - Math.exp(-dt / 0.25);
    const origin = state.diorama?.group.position;
    lightColor.set(look ? look.sun.color : mapLight.color);
    sun.color.lerp(lightColor, k);
    sun.intensity += ((look ? look.sun.intensity : mapLight.intensity) - sun.intensity) * k;
    ambient.intensity += ((look ? look.ambient : mapLight.ambient) - ambient.intensity) * k;
    if (look && origin) lightPosition.set(...look.sun.position).add(origin); else lightPosition.copy(mapLight.position);
    sun.position.lerp(lightPosition, k);
    sun.target.position.lerp(look && origin ? origin : lightPosition.set(0, 0, 0), k);
    // El entorno ilumina solo la maqueta (no el mapa de alrededor): se asigna a sus materiales cada medio segundo,
    // así también alcanza a los modelos que llegan después.
    state.envClock = (state.envClock ?? 0) - dt;
    if (look && state.lookEnv && state.diorama && state.envClock <= 0) {
      state.envClock = 0.5;
      state.diorama.group.traverse((node) => {
        if (!node.isMesh) return;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          if (!material.isMeshStandardMaterial || (material.envMap === state.lookEnv && material.envMapIntensity === look.envIntensity)) continue;
          if (material.envMap !== state.lookEnv) material.needsUpdate = true;
          material.envMap = state.lookEnv;
          material.envMapIntensity = look.envIntensity;
        }
      });
    }
  }

  // La sala de la intro se arma al entrar a "/" y se libera al salir.
  function ensureHall() {
    if (state.hall || state.hallLoading) return;
    state.hallLoading = import('./broadcastHall.js').then(m => { if(state.disposed||state.route.scene!=='intro')return null; return m.createBroadcastHall(); })
      .then((hall) => {
        state.hallLoading = null;
        if(!hall)return;
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
    state.composer.dispose(); state.composer = null; state.bloom = null; state.composerKind = null;
  }

  function configureQuality() {
    const {low,pixelRatio,frameMs}=renderBudget(mount.clientWidth,state.quality,window.devicePixelRatio);
    state.frameMs=frameMs;
    if(renderer.getPixelRatio()!==pixelRatio)renderer.setPixelRatio(pixelRatio);
    const shadows = (Boolean(state.archive) || Boolean(state.diorama)) && !low;
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    sun.castShadow = shadows;
    // En un diorama la sombra cubre solo la maqueta (más definida); en la arena, toda la escena.
    const reach = state.diorama && !state.archive ? 1.8 : 10;
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach });
    sun.shadow.camera.updateProjectionMatrix();
    state.archive?.setQuality(low ? 'low' : 'high');
    // Postproceso: en la arena, brillo suave; en los minijuegos, solo el tilt-shift de maqueta (el brillo hacía
    // resplandecer de más a los distritos encendidos del mapa alrededor).
    const kind = state.archive ? 'archive' : state.diorama ? 'diorama' : null;
    if (!kind || low || state.reducedMotion || kind !== state.composerKind) releaseComposer();
    if (kind && !low && !state.reducedMotion && !postFactory && !postLoading) {
      postLoading=true;
      import('./postprocessing.js').then(m=>{postLoading=false;if(state.disposed)return;postFactory=m.createPostprocessing;configureQuality();}).catch(error=>{postLoading=false;console.warn('Postproceso no disponible:',error);});
    }
    if (kind && !low && !state.reducedMotion && !state.composer && postFactory) {
      try {
        const {composer,bloom}=postFactory(renderer,scene,camera,kind,mount.clientWidth,mount.clientHeight);
        state.composer = composer; state.bloom = bloom; state.composerKind = kind;
      } catch { releaseComposer(); }
    }
    state.composer?.setPixelRatio(renderer.getPixelRatio());
    resize();
  }

  function applyRoute() {
    ensureRouteModules();
    if(state.route.scene!=='games')ensureMap();
    const { route, map } = state;
    state.cinematic = null;
    // Al salir de la intro la cámara corta al mapa: volar desde la sala cruzaría 60 unidades de nada.
    const leavingIntro = state.poseRoute?.scene === 'intro' && route.scene !== 'intro';
    const classified = route.scene === 'distrito' && route.districtId === '13';
    state.poseRoute = route;
    // En el 13 la cámara corta al mapa entero: la imagen se rompe al instante, no hay vuelo.
    rig.goTo(poseFor(route, map?.centers, state.aspect), leavingIntro || classified ? 0 : 1.6);
    state.wantGlitch = classified;
    if (!classified) releaseGlitch();
    if (route.scene === 'intro') ensureHall(); else releaseHall();
    const chapter = route.scene === 'games' ? route.chapter : null;
    if (chapter !== state.archiveChapter || (chapter && !state.archive && archiveFactory)) {
      state.archive?.dispose(); state.archive = null; state.archiveChapter = chapter;
      if (chapter && archiveFactory) {
        environment('/models/districts/day.hdr').then(env=>{if(!sceneDisposed&&env){scene.environment=env;scene.environmentIntensity=.45;}});
        state.archive = archiveFactory(chapter, (status) => window.dispatchEvent(new CustomEvent('panem-arena-status', {detail:status})));
        state.archive.setRun(state.run);
        state.archive.setReducedMotion(state.reducedMotion);
        state.archive.setQuality(state.quality);
        state.archive.setView(state.gamesView);
        scene.add(state.archive.group);
        rig.goTo(poseNow(), 1.6); // con la escena armada ya se sabe a quién seguir
      }
    }
    if (map) map.group.visible = !chapter;
    configureQuality();
    const wanted = route.scene === 'distrito' && map && dioramaBuilders?.[route.districtId] ? route.districtId : null;
    if (wanted !== state.dioramaId) {
      disposeDiorama();
      if (wanted) buildDiorama(wanted);
      configureQuality(); // sombras y postproceso según haya diorama o no
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

  function normalized(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  }

  function onPointerMove(event) {
    if (state.glitch) { renderer.domElement.style.cursor = state.glitch.pointerMove(...normalized(event)); return; }
    setPointer(event);
    let cursor = 'default';
    if (state.diorama) {
      if (state.diorama.pointerMove(raycaster)) cursor = 'pointer';
    } else if (state.route.scene === 'games') {
      if (state.archive?.pick(raycaster)) cursor = 'pointer';
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
    if (state.glitch) {
      if (state.glitch.pointerDown(...normalized(event))) {
        event.preventDefault(); // que arrastrar un pedazo no seleccione el texto del panel
        renderer.domElement.setPointerCapture?.(event.pointerId);
        renderer.domElement.style.cursor = 'grabbing';
        callbacks.sfx.play('tick');
      }
      return;
    }
    setPointer(event);
    // Lo que empieza sobre el minijuego es del minijuego; el resto del mapa sirve para salir o cambiar de distrito.
    const onDiorama = Boolean(state.diorama) && raycaster.intersectObject(state.diorama.group, true).length > 0;
    state.down = { x: event.clientX, y: event.clientY, onDiorama };
    if (onDiorama) {
      renderer.domElement.setPointerCapture?.(event.pointerId);
      state.diorama.pointerDown(raycaster);
    }
  }

  function onPointerUp(event) {
    if (state.glitch) { state.glitch.pointerUp(); state.down = null; return; }
    setPointer(event);
    const down = state.down;
    state.down = null;
    if (state.diorama && down?.onDiorama) { state.diorama.pointerUp(raycaster); return; }
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_TOLERANCE_PX) return;
    if (state.route.scene === 'games') {
      const id = state.archive?.pick(raycaster);
      if (id) callbacks.onPickTribute?.(id);
      return;
    }
    const action = mapClickAction({
      scene: state.route.scene, currentId: state.route.districtId, hasDiorama: Boolean(state.diorama), pickedId: pickDistrict(),
    });
    if (action.type === 'select') callbacks.onSelect(action.id);
    else if (action.type === 'map') callbacks.onBack?.();
  }

  function onPointerLeave() {
    state.glitch?.pointerLeave();
    if (state.hovered) { state.hovered = null; callbacks.onHover(null); }
  }

  // El panel (escritorio) o la hoja inferior (celular) tapan parte del canvas: se corre la vista
  // para que el distrito quede centrado en la zona libre. Durante el final la vista queda centrada.
  function applyViewShift(dt) {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const target = state.finaleRunning ? { x: 0, y: 0 } : viewShiftFor(state.route, width, height);
    // La imagen rota del Distrito 13 es una foto: se saca con la vista ya corrida, sin esperar la transición.
    const blend = state.wantGlitch && !state.glitch ? 1 : 1 - Math.exp(-5 * dt);
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
    if(!shouldRenderFrame(timestamp,state.lastFrame,state.frameMs))return;
    state.lastFrame=timestamp;
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    const elapsed = timer.getElapsed();
    if(state.gamesCovered && state.route.scene==='games')return;
    if (!state.gamesPaused || state.route.scene !== 'games') {
      rig.update(dt);
      if (state.cinematic) {
        state.cinematic.remaining -= dt;
        if (state.cinematic.remaining <= 0) {
          rig.goTo(poseNow(), 1.4);
          state.cinematic = null;
        }
      }
    }
    const fog = fogRangeFor(camera.position.length());
    scene.fog.near = fog.near;
    scene.fog.far = fog.far;
    applyViewShift(dt);
    if(state.map?.group.visible || state.portal)state.map?.update(dt, elapsed, {
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
    applyLook(dt);
    ensureGlitch();
    if (state.glitch) { state.glitch.update(dt, elapsed); state.glitch.render(); return; }
    if (state.composer && (state.route.scene === 'games' || state.diorama)) state.composer.render(dt);
    else renderer.render(scene, camera);
  }

  function start() {
    if (state.running || state.disposed) return;
    state.running = true;
    timer.reset();state.lastFrame=-Infinity;
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


  return {
    setGamesCovered(value) {state.gamesCovered=value;renderer.domElement.style.visibility=value?'hidden':'';},
    getGamesAssetStatus() { return state.archive?.getAssetStatus() ?? null; },
    setRoute(route) { state.route = route; applyRoute(); },
    setLit(ids, earned = ids) {
      const active = state.dioramaId;
      const wasComplete = state.earned.includes(active);
      state.lit = ids; state.earned = earned;
      // El final ilumina todo el mapa, pero solo los emblemas ganados completan un minijuego.
      if (active && wasComplete !== earned.includes(active)) { disposeDiorama(); buildDiorama(active); configureQuality(); }
    },
    setHovered(id) { state.externalHover = id; },
    // Quien ya descubrió la señal la encuentra abierta (lo guardado puede llegar con la rotura ya armada);
    // si se borra el progreso, el Distrito 13 se vuelve a romper.
    setClassifiedRevealed(value) {
      if (value) state.glitch?.markRevealed();
      else if (state.classifiedRevealed) releaseGlitch();
      state.classifiedRevealed = value;
    },
    setReducedMotion(value) { if (value !== state.reducedMotion) releaseGlitch(); state.reducedMotion = value; rig.setReducedMotion(value); state.archive?.setReducedMotion(value); configureQuality(); },
    setGamesRun(run) {
      const previous = state.run;
      state.run = run; state.archive?.setRun(run);
      // En la mesa no hay planos de cerca: se ve todo desde arriba.
      if (run && previous?.id === run.id && previous.turn !== run.turn && state.route.scene === 'games' && !state.reducedMotion && state.gamesView === 'follow') {
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
    skipGamesIntro() { state.cinematic = null; if (state.route.scene === 'games') rig.goTo(poseNow(), 0); },
    // 'follow' (siguiendo a tu tributo) o 'table' (la mesa de los Vigilantes, solo en la arena y el desenlace).
    setGamesView(view) {
      state.gamesView = view === 'table' ? 'table' : 'follow';
      state.archive?.setView(state.gamesView);
      state.cinematic = null;
      if (state.route.scene === 'games') rig.goTo(poseNow(), state.reducedMotion ? 0 : 1.2);
    },
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
    retryMinigame() { state.diorama?.retry?.(); },
    minigameInput(i) { state.diorama?.input?.(i); },
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
        pixelRatio:renderer.getPixelRatio(), targetFps:Math.round(1000/state.frameMs), drawCalls:renderer.info.render.calls,
        canvases: mount.querySelectorAll('canvas').length,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        minigame: state.diorama?.getState?.() ?? null, // la partida del distrito abierto (para revisar con ?debug)
      };
    },
    dispose() {
      state.disposed = true;sceneDisposed=true;
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
      releaseGlitch();
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
