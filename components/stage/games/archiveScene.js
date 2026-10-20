import * as THREE from 'three';

// Escenografía original procedural, sin descargas ni modelos externos.
export function createArchiveScene(chapter) {
  const group = new THREE.Group();
  group.name = `archive-${chapter}`;
  const resources = new Set();
  const own = (resource) => { resources.add(resource); return resource; };
  const material = (color, options = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...options }));
  const stone = material('#53606a');
  const dark = material('#172329');
  const gold = material('#cba85c', { metalness: 0.75, roughness: 0.25 });
  const light = material('#d8d3bd', { emissive: '#69562e', emissiveIntensity: 1.1 });
  const box = own(new THREE.BoxGeometry(1, 1, 1));
  const sphere = own(new THREE.SphereGeometry(0.13, 8, 6));
  const body = own(new THREE.CylinderGeometry(0.12, 0.17, 0.45, 6));
  function mesh(geometry, mat, position, scale = [1, 1, 1], parent = group) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position); object.scale.set(...scale); parent.add(object); return object;
  }
  const floor = mesh(own(new THREE.CylinderGeometry(6.5, 6.8, 0.35, 64)), dark, [0, -0.2, 0]);
  const ornaments = new THREE.Group(); group.add(ornaments);
  let beacon;
  if (chapter === 'arena' || chapter === 'ended') {
    floor.material = material('#304637');
    const water = material('#3e858a', { metalness: 0.65, roughness: 0.25 });
    mesh(own(new THREE.CircleGeometry(1.6, 40)), water, [2.8, 0.01, 1.8]).rotation.x = -Math.PI / 2;
    const treeGeo = own(new THREE.ConeGeometry(0.4, 1.6, 6));
    const treeMat = material('#223f37');
    const forest = new THREE.InstancedMesh(treeGeo, treeMat, 55);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 55; i += 1) {
      const angle = i * 2.39996;
      const radius = 4.1 + (i % 7) * 0.29;
      dummy.position.set(Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius);
      dummy.scale.setScalar(0.7 + (i % 4) * 0.15); dummy.updateMatrix(); forest.setMatrixAt(i, dummy.matrix);
    }
    ornaments.add(forest);
    for (let i = 0; i < 6; i += 1) {
      const block = mesh(box, stone, [-2.6 + (i % 3) * .45, .3 + (i % 2) * .2, 1 + Math.floor(i / 3) * .7], [.32, .6 + (i % 2) * .4, .36]);
      block.rotation.z = (i % 2 ? -1 : 1) * .16;
    }
    // Cornucopia abstraída: boca abierta y espiral metálica.
    const horn = mesh(own(new THREE.ConeGeometry(.8, 2.3, 8, 1, true)), gold, [0, .8, 0]);
    horn.rotation.z = Math.PI / 2.8;
    const ring = mesh(own(new THREE.TorusGeometry(.8, .045, 6, 32)), light, [-.9, .75, 0]);
    ring.rotation.y = Math.PI / 2;
    beacon = mesh(own(new THREE.CylinderGeometry(.035, .035, 3, 8)), light, [0, 1.5, 0]);
  } else {
    mesh(box, stone, [0, .12, -1.4], [6.5, .25, 2.5]);
    for (let i = 0; i < 7; i += 1) {
      mesh(box, light, [-3 + i, 2, -2.4], [.23, 4, .35]);
      mesh(box, gold, [-3 + i, 4, -2.4], [.38, .15, .5]);
    }
    mesh(box, dark, [0, 4.3, -2.5], [7.2, .4, .6]);
    mesh(box, gold, [0, 2.35, -2.2], [1.5, 2.7, .08]);
    if (chapter === 'reaping') {
      mesh(box, stone, [0, .7, -1], [.65, 1.2, .65]);
      mesh(own(new THREE.SphereGeometry(.38, 24, 16)), material('#b4d4d8', { transparent: true, opacity: .5, metalness: .2, roughness: .15 }), [0, 1.45, -1]);
      for (let i = 0; i < 12; i += 1) mesh(box, light, [Math.sin(i * 2.4) * .2, 1.3 + (i % 3) * .07, -1 + Math.cos(i * 2.4) * .2], [.09, .015, .05]);
    } else {
      // Vagón de llegada y pasarela ceremonial.
      mesh(box, dark, [-2.5, .75, .2], [1.1, 1.2, 3.2]);
      for (let i = 0; i < 4; i += 1) mesh(box, light, [-1.93, .9, -.8 + i * .6], [.02, .35, .4]);
      mesh(box, material('#772e31'), [.6, .02, 1.2], [1.2, .04, 5]);
    }
  }
  const markers = Array.from({ length: 24 }, (_, i) => {
    const actor = new THREE.Group();
    const hue = (Math.floor(i / 2) * 0.083 + .08) % 1;
    const coat = material(new THREE.Color().setHSL(hue, .32, .58));
    mesh(body, coat, [0, .3, 0], [1, 1, 1], actor);
    mesh(sphere, material('#d7bda0'), [0, .66, 0], [1, 1, 1], actor);
    const base = mesh(own(new THREE.CylinderGeometry(.22, .24, .05, 12)), gold, [0, .02, 0], [1, 1, 1], actor);
    group.add(actor);
    return { actor, coat, base, target: new THREE.Vector3(), alive: true };
  });
  let currentRun = null;
  let reduced = false;
  let low = false;
  function setRun(run) {
    currentRun = run;
    const slots = [0, 0, 0, 0];
    markers.forEach((marker, i) => {
      const t = run?.tributes[i];
      const inArena = chapter === 'arena' || chapter === 'ended';
      if (inArena) {
        const zone = t?.zone ?? i % 4;
        const slot = slots[zone]++;
        const angle = zone * Math.PI / 2 + ((slot % 6) - 2.5) * .19;
        const radius = 2 + Math.floor(slot / 6) * .6 + (slot % 2) * .45;
        marker.target.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      } else marker.target.set(-2.7 + (i % 8) * .77, 0, .6 + Math.floor(i / 8) * .9);
      marker.alive = t?.alive ?? true;
      marker.coat.transparent = !marker.alive;
      marker.coat.opacity = marker.alive ? 1 : .18;
      marker.base.visible = t?.id === run?.selectedId || t?.id === run?.winnerId;
      if (!marker.alive) marker.target.y = -.5;
      if (!marker.actor.userData.placed || reduced) { marker.actor.position.copy(marker.target); marker.actor.userData.placed = true; }
    });
  }
  setRun(null);
  return {
    group, setRun,
    focus(id) { const i = currentRun?.tributes.findIndex((t) => t.id === id); return i >= 0 ? markers[i].target.clone() : null; },
    setReducedMotion(value) { reduced = value; if (value) setRun(currentRun); },
    setQuality(value) { low = value === 'low'; ornaments.visible = !low; },
    update(dt, elapsed) {
      markers.forEach(({ actor, target }) => actor.position.lerp(target, reduced ? 1 : 1 - Math.exp(-4 * dt)));
      if (beacon) beacon.material.emissiveIntensity = reduced || low ? .25 : .4 + Math.sin(elapsed * 1.6) * .2;
    },
    dispose() { group.removeFromParent(); resources.forEach((resource) => resource.dispose()); },
  };
}
