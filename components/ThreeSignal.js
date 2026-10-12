'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// THREE.js puro, como solicita la consigna: geometría procedural, renderer,
// luces, raycasting, RAF, ResizeObserver, pixel ratio limitado y dispose.
export default function ThreeSignal({ chapter, onInspect }) {
  const hostRef = useRef(null);
  const onInspectRef = useRef(onInspect);
  useEffect(() => { onInspectRef.current = onInspect; }, [onInspect]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (error) {
      console.warn('WebGL no disponible; usar alternativa accesible.', error);
      host.textContent = 'Vista 3D no disponible en este dispositivo. Podés usar el botón de inspección.';
      host.removeAttribute('aria-hidden');
      host.setAttribute('role', 'status');
      host.classList.add('webgl-unavailable');
      return;
    }
    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 1.1, 6.6);
    camera.lookAt(0, 0.2, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x101714, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);
    const objects = [];
    const interactive = [];
    const addMesh = (geometry, material, parent = root) => {
      const mesh = new THREE.Mesh(geometry, material);
      parent.add(mesh); objects.push(mesh); return mesh;
    };
    const gold = new THREE.MeshStandardMaterial({ color: '#d8bb73', metalness: 0.72, roughness: 0.32, emissive: '#856c2c', emissiveIntensity: .13 });
    const bark = new THREE.MeshStandardMaterial({ color: '#615a40', roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1d2922', metalness: 0.55, roughness: 0.38 });
    const water = new THREE.MeshStandardMaterial({ color: '#6daba8', metalness: 0.25, roughness: 0.22, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    const light = new THREE.MeshBasicMaterial({ color: '#f1d28a' });

    const selection = addMesh(new THREE.IcosahedronGeometry(.56, 2), gold);
    selection.position.y = .5;
    interactive.push(selection);
    const halo = addMesh(new THREE.TorusGeometry(1.1, .013, 9, 96), light);
    halo.position.y = .5;
    halo.rotation.x = .5;

    if (chapter === 'forest') {
      for (let i = 0; i < 9; i++) {
        const a = i * Math.PI * 2 / 9;
        const x = Math.cos(a) * (2 + (i % 3) * .12);
        const z = Math.sin(a) * .9 - .2;
        const trunk = addMesh(new THREE.CylinderGeometry(.12, .24, 2.3 + (i % 3) * .3, 8), bark);
        trunk.position.set(x, .1, z);
        const crown = addMesh(new THREE.ConeGeometry(.65, 1.8, 7), dark);
        crown.position.set(x, 1.45, z);
      }
      const roots = addMesh(new THREE.TorusGeometry(.81, .055, 8, 64), bark);
      roots.rotation.x = Math.PI / 2;
      roots.position.y = -.83;
    } else if (chapter === 'lake') {
      for (let i = 0; i < 4; i++) {
        const surface = addMesh(new THREE.TorusGeometry(1.2 + i * .34, .018, 8, 100), water);
        surface.rotation.x = Math.PI / 2;
        surface.position.y = -.65 - i * .017;
      }
      const capsule = addMesh(new THREE.CylinderGeometry(.38, .38, 1.45, 14), dark);
      capsule.rotation.z = Math.PI / 2;
      capsule.position.y = -.1;
      interactive.push(capsule);
    } else {
      for (let i = 0; i < 3; i++) {
        const antenna = addMesh(new THREE.CylinderGeometry(.028, .07, 2.7 - i * .42, 8), dark);
        antenna.position.set((i - 1) * .36, -.1, -.2);
      }
      for (let i = 0; i < 3; i++) {
        const signal = addMesh(new THREE.TorusGeometry(1.3 + i * .26, .014, 8, 88), water);
        signal.rotation.x = Math.PI / 2.2;
        signal.position.y = .5;
      }
    }

    const starPositions = new Float32Array(140 * 3);
    for (let i = 0; i < 140; i++) {
      const phi = i * 2.39996, radius = 2 + (i % 11) * .2;
      starPositions[i * 3] = Math.cos(phi) * radius;
      starPositions[i * 3 + 1] = Math.sin(phi * 1.3) * 1.8;
      starPositions[i * 3 + 2] = -2.1 - (i % 5) * .3;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const dustMat = new THREE.PointsMaterial({ color: chapter === 'lake' ? '#7ec6b4' : '#ddc58c', size: .025, transparent: true, opacity: .55 });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);
    scene.add(new THREE.AmbientLight('#e8e6cd', 1));
    const key = new THREE.PointLight('#d8bb73', 45, 20);
    key.position.set(3, 4, 4);
    scene.add(key);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(10, 10);
    const observer = new ResizeObserver(resize);
    let hovered = false;
    let frame = 0;
    let motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    let start = performance.now();

    function resize() {
      if (disposed) return;
      const w = Math.max(host.clientWidth, 1);
      const h = Math.max(host.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    function updatePointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
      pointer.y = -(event.clientY - rect.top) / rect.height * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      hovered = raycaster.intersectObjects(interactive).length > 0;
      renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
    }
    function inspect(event) { updatePointer(event); if (hovered) onInspectRef.current?.(); }
    function visibility() { visible = document.visibilityState === 'visible'; }
    function tick(now) {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const paused = document.body.classList.contains('motion-paused');
      const seconds = (now - start) / 1000;
      if (motionOK && !paused) {
        root.rotation.y += .002;
        halo.rotation.z += .006;
        selection.rotation.x += .003;
        dust.rotation.y += .00014;
        selection.scale.setScalar(hovered ? 1.13 : 1 + Math.sin(seconds * 1.3) * .05);
      }
      renderer.render(scene, camera);
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => { motionOK = !mq.matches; };
    mq.addEventListener('change', onMotion);
    observer.observe(host);
    document.addEventListener('visibilitychange', visibility);
    renderer.domElement.addEventListener('pointermove', updatePointer);
    renderer.domElement.addEventListener('pointerdown', inspect);
    resize(); frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      mq.removeEventListener('change', onMotion);
      renderer.domElement.removeEventListener('pointermove', updatePointer);
      renderer.domElement.removeEventListener('pointerdown', inspect);
      for (const mesh of objects) { mesh.geometry.dispose(); }
      for (const mat of [gold, bark, dark, water, light, dustMat]) mat.dispose();
      dustGeo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [chapter]);
  return <div className="three-inspector"><div ref={hostRef} className="three-canvas" aria-hidden="true" />
    <button type="button" className="outline three-accessible" onClick={onInspect}>⌁ Inspeccionar objeto 3D / alternativa accesible</button>
  </div>;
}
