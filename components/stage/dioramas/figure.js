import * as THREE from 'three';
import { instanceOf } from './assets.js';

// Las figuritas de Kenney miran hacia -z: el giro para que miren en la dirección (dx, dz).
export const lookToward = (dx, dz) => Math.atan2(-dx, -dz);

// La figurita de cada distrito (Kenney Mini Characters): reposa en `idle` y reacciona con animaciones cortas
// que, al terminar, vuelven al reposo (o a la que se indique en `then`; null = se queda en la última pose).
export function createFigure(kit, name, { scale = 0.3, position = [0, 0, 0], facing = 0 } = {}) {
  const model = instanceOf(kit, name);
  if (!model) return null;
  const group = new THREE.Group();
  group.add(model);
  group.scale.setScalar(scale);
  group.position.set(...position);
  group.rotation.y = facing;
  const mixer = new THREE.AnimationMixer(model);
  const actions = Object.fromEntries((kit.animations[name] ?? []).map((clip) => [clip.name, mixer.clipAction(clip)]));
  let current = null;
  let after = null;

  function play(clip, { loop = false, then = 'idle', fade = 0.12 } = {}) {
    const next = actions[clip];
    if (!next) return;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.play();
    if (current && current !== next) current.crossFadeTo(next, fade, false);
    current = next;
    after = loop ? null : then;
  }
  mixer.addEventListener('finished', (event) => { if (event.action === current && after) play(after, { loop: true }); });
  play('idle', { loop: true });

  return {
    group,
    play,
    // Cuelga un objeto (la herramienta) de un hueso: queda en la mano y sigue la animación.
    attach(boneName, object, { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = {}) {
      const bone = model.getObjectByName(boneName);
      if (!bone || !object) return;
      object.position.set(...position);
      object.rotation.set(...rotation);
      object.scale.setScalar(scale);
      bone.add(object);
    },
    update(dt) { mixer.update(dt); },
    reset() { play('idle', { loop: true, fade: 0.2 }); },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); },
  };
}
