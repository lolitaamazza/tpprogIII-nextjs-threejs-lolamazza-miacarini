import * as THREE from 'three';

// Lo que se encuentra en una escena (idea tomada del proyecto "Contención"): cuatro formas de encontrar algo.
// `take` se agarra con un toque; `open` es una caja que se abre; `hold` hay que mantenerlo presionado (limpiar el hollín);
// `light` solo aparece bajo el farol del minero; `look` se encuentra con un toque y se queda donde está (el cuenco).
// Nada castiga: soltar antes de tiempo deja el avance a medias.
// `art`: la cara dibujada (clueArt.js) de un papel (take y look sin pieza) o de un cartel; `shape: 'bottle'`: una botella enredada en la red (hold).
// `def`: { id, kind, spot, position (el pie del objeto), size [ancho, alto, fondo], rotationY?, requires?, reveals (id de la pista) }.
export const HOLD_SECONDS = 0.9;
export const OPEN_SECONDS = 0.6;
export const LIGHT_RANGE = 6;
// Medio ángulo del cono del farol (como el `angle` de una SpotLight).
export const LIGHT_ANGLE = Math.PI / 6;
const LID_OPEN = -1.9;

const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
const toArray = (v) => (Array.isArray(v) ? v : v?.toArray?.());

export function createInteractable(def, { onFound = () => {}, onHoldProgress = () => {}, halo = null, texture = null } = {}) {
  const { id, kind, spot, position, size: [w, h, d], rotationY = 0, requires = null, reveals } = def;
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = rotationY;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.3), Math.max(h, 0.3), Math.max(d, 0.3)), hitMaterial);
  hit.position.set(position[0], position[1] + h / 2, position[2]);
  hit.rotation.y = rotationY;
  hit.userData.interactable = id;
  const attached = [];
  let done = false;
  let opening = 0; // 0 cerrada, 1 abierta (open)
  let openStarted = false;
  let held = 0; // avance de 0 a 1 (hold)
  let holding = false;
  let isLit = false;

  // Un brillo muy sutil que avisa que ahí hay algo (lo que se alumbra no lo tiene: tiene que estar a oscuras).
  // `subtle`: escondido de verdad, sin el brillo que avisa.
  const glint = kind === 'light' || def.subtle ? null : new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffe2a8, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  if (glint) { glint.scale.setScalar(0.35); glint.position.set(0, h + 0.12, 0); group.add(glint); }

  let lid = null;
  let cover = null; // lo que tapa (hollín o red) y se va mientras se mantiene presionado
  let coverOpacity = 0.94;
  let mark = null;
  if (kind === 'open') {
    // Una caja de madera chica con tapa; adentro, lo que se encuentra (la cara de `texture`).
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.85 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.75, d), wood);
    base.position.y = h * 0.375;
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, d * 0.75), new THREE.MeshStandardMaterial({ color: 0xd8ccb0, map: texture, roughness: 0.9 }));
    inside.rotation.x = -Math.PI / 2;
    inside.position.y = h * 0.76;
    lid = new THREE.Group();
    lid.position.set(0, h * 0.75, -d / 2);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 0.12, d * 1.02), wood);
    top.position.set(0, h * 0.06, d / 2);
    lid.add(top);
    group.add(base, inside, lid);
  } else if (kind === 'hold' && def.shape === 'bottle') {
    // Una botella de vidrio verde con un papel adentro, enredada en un pedazo de red.
    const profile = [[0, 0], [0.07, 0], [0.075, 0.02], [0.075, 0.2], [0.05, 0.25], [0.025, 0.29], [0.025, 0.34], [0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(profile, 16), new THREE.MeshPhysicalMaterial({ color: 0x5f8a62, roughness: 0.1, transmission: 0.6, thickness: 0.02, transparent: true, opacity: 0.85 }));
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }));
    paper.position.y = 0.11;
    const bottle = new THREE.Group();
    bottle.add(glass, paper);
    bottle.rotation.z = Math.PI / 2 - 0.15;
    bottle.position.set(0.17, 0.08, 0);
    coverOpacity = 0.9;
    cover = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xcfc4a4, wireframe: true, transparent: true, opacity: coverOpacity }));
    cover.scale.set(w * 0.55, h * 0.6, d * 0.6);
    cover.position.y = h * 0.35;
    group.add(bottle, cover);
  } else if (kind === 'hold') {
    // Un cartel de chapa (la cara de `texture`) tapado de hollín: el hollín se va mientras se mantiene presionado.
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, Math.max(d, 0.03)), new THREE.MeshStandardMaterial({ color: 0x8a8070, map: texture, roughness: 0.7, metalness: 0.3 }));
    board.position.y = h / 2;
    cover = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.01, h * 1.01), new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 1, transparent: true, opacity: coverOpacity }));
    cover.position.set(0, h / 2, Math.max(d, 0.03) / 2 + 0.004);
    group.add(board, cover);
    if (def.post) {
      // Un poste de madera desde el piso hasta atrás del cartel.
      const height = position[1] + h * 0.8;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.1), new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 0.95 }));
      post.position.set(0, -position[1] + height / 2, -Math.max(d, 0.03) / 2 - 0.05);
      post.castShadow = true;
      group.add(post);
    }
  } else if ((kind === 'take' || kind === 'look') && texture) {
    // Un papel (un aviso clavado, una nota) con su cara dibujada.
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 0.95, side: THREE.DoubleSide }));
    sheet.position.y = h / 2;
    group.add(sheet);
  } else if (kind === 'light') {
    // Lo rayado en la pared: no se ve hasta que lo alcanza la luz del farol.
    mark = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xe8dcc4, map: texture, transparent: true, opacity: 0, depthWrite: false }));
    mark.position.y = h / 2;
    group.add(mark);
  }

  function found() {
    if (done) return;
    done = true;
    if (kind === 'take') { group.visible = false; for (const o of attached) o.visible = false; }
    onFound(reveals);
  }

  function setHeld(value) {
    held = Math.min(1, value);
    cover.material.opacity = coverOpacity * (1 - held);
    onHoldProgress(held);
  }

  const center = new THREE.Vector3();
  function reachedBy(from, dir) {
    if (!from || !dir) return false;
    center.set(position[0], position[1] + h / 2, position[2]);
    const v = center.clone().sub(new THREE.Vector3(...from));
    const distance = v.length();
    const aim = new THREE.Vector3(...dir);
    if (distance > LIGHT_RANGE || aim.lengthSq() === 0) return false;
    return v.angleTo(aim) <= LIGHT_ANGLE;
  }

  return {
    id, kind, spot, requires, reveals, group, hit, lid, mark, cover,
    // Una pieza ya cargada (el farol de Sketchfab) que se va con el objeto al agarrarlo.
    attach(object) { attached.push(object); if (done && kind === 'take') object.visible = false; },
    available: (tools = []) => !requires || tools.includes(requires),
    isDone: () => done,
    progress: () => (kind === 'hold' ? held : kind === 'open' ? opening : done ? 1 : 0),
    lit: () => isLit,
    pickable: () => !done && (kind !== 'light' || isLit) && !(kind === 'open' && openStarted),
    tap() {
      if (done) return;
      if (kind === 'take' || kind === 'look') found();
      else if (kind === 'open') openStarted = true;
      else if (kind === 'light' && isLit) found();
    },
    holdStart() { if (kind === 'hold' && !done) holding = true; },
    holdEnd() { holding = false; },
    setDone(value) {
      done = value;
      if (kind === 'take') { group.visible = !value; for (const o of attached) o.visible = !value; }
      if (kind === 'open') { opening = value ? 1 : 0; openStarted = value; lid.rotation.x = value ? LID_OPEN : 0; }
      if (kind === 'hold') { held = value ? 1 : 0; cover.material.opacity = coverOpacity * (1 - held); holding = false; }
      if (kind === 'light') mark.material.opacity = value ? 0.9 : 0;
    },
    update(dt, t, { lightFrom = null, lightDir = null, reducedMotion = false } = {}) {
      if (glint) {
        glint.visible = !done;
        glint.material.opacity = reducedMotion ? 0.2 : 0.12 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.14;
      }
      if (kind === 'open' && openStarted && opening < 1) {
        opening = reducedMotion ? 1 : Math.min(1, opening + dt / OPEN_SECONDS);
        const eased = 1 - (1 - opening) ** 3;
        lid.rotation.x = LID_OPEN * eased;
        if (opening >= 1) found();
      }
      if (kind === 'hold' && holding && !done) {
        setHeld(held + dt / HOLD_SECONDS);
        if (held >= 1) { holding = false; found(); }
      }
      if (kind === 'light') {
        isLit = reachedBy(toArray(lightFrom), toArray(lightDir));
        const wanted = done || isLit ? 0.9 : 0;
        const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
        mark.material.opacity += (wanted - mark.material.opacity) * k;
      }
    },
  };
}
