import * as THREE from 'three';
import { gsap } from 'gsap';
import { lerpPose } from './cameraPoses.js';

export function createCameraRig(camera) {
  const lookAt = new THREE.Vector3();
  let current = { position: [0, 24, 3], target: [0, 0, 0] };
  let from = current;
  let to = null;
  let t = 1;
  let duration = 1;
  let shakeAmount = 0;
  let reducedMotion = false;
  let timeline = null;
  const progress = { value: 0 };

  function apply() {
    camera.position.set(...current.position);
    if (shakeAmount > 0) {
      camera.position.x += (Math.random() - 0.5) * shakeAmount;
      camera.position.y += (Math.random() - 0.5) * shakeAmount;
    }
    lookAt.set(...current.target);
    camera.lookAt(lookAt);
  }

  return {
    goTo(pose, seconds = 1.6) {
      timeline?.kill(); timeline = null;
      if (seconds <= 0) { current = pose; to = null; apply(); return; }
      from = current; to = pose; t = 0; duration = reducedMotion ? Math.min(seconds, 0.4) : seconds;
      progress.value = 0;
      timeline = gsap.timeline({ paused: true }).to(progress, { value: 1, duration, ease: 'power2.inOut' });
    },
    shake(amount) { if (!reducedMotion) shakeAmount = Math.max(shakeAmount, amount); },
    setReducedMotion(value) { reducedMotion = value; if (value) shakeAmount = 0; },
    dispose() { timeline?.kill(); },
    update(dt) {
      if (to) {
        t = Math.min(1, t + dt / duration);
        timeline?.progress(t);
        current = lerpPose(from, to, progress.value);
        if (t >= 1) to = null;
      }
      shakeAmount = Math.max(0, shakeAmount - dt * 0.6);
      apply();
    },
  };
}
