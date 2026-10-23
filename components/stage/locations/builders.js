import * as THREE from 'three';

// Lo que arma una escena de distrito a partir de sus datos (lib/locations/*): piso, estructuras, luces, fuego y polvo.
// Cada constructor recibe (scene, def, ctx) y devuelve { object, update?(dt, t) }.
// `ctx`: `textures(name, repeat)` arma un material PBR de Poly Haven, `halo` (textura de los halos), `budget`, `state`.

export function canvasTexture(draw, size = 128, tall = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * tall;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Halo chico y suave alrededor de una luz (sin bloom: Mia no quiere glow fuerte).
export const haloTexture = () => canvasTexture((ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,236,200,1)');
  g.addColorStop(0.18, 'rgba(255,190,120,0.55)');
  g.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
});

// Materiales PBR de Poly Haven guardados en la carpeta del distrito (`<name>_diff_1k.jpg`, `_nor_gl`, `_arm`).
export function pbrMaterials(loader, folder) {
  return (name, repeat) => {
    const load = (map, color) => {
      const t = loader.load(`${folder}${name}_${map}_1k.jpg`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(...repeat);
      t.anisotropy = 4;
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const arm = load('arm');
    return new THREE.MeshStandardMaterial({ map: load('diff', true), normalMap: load('nor_gl'), aoMap: arm, roughnessMap: arm, metalnessMap: arm });
  };
}

// Un plano en el piso con textura (el suelo del distrito o una calle encima). `tilt`: inclinado hacia -z (una pendiente).
export function buildGround(scene, { texture, size, repeat, position, tilt = 0 }, ctx) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), ctx.textures(texture, repeat));
  mesh.rotation.x = -Math.PI / 2 + tilt;
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return { object: mesh };
}

// Vías: dos rieles y durmientes a lo largo de x o de z.
function track(scene, { length, gauge, along, center }) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x4b4d50, metalness: 0.85, roughness: 0.45 });
  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.95 });
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
  return { object: group };
}

// Galpón de chapa: cuatro postes, techo inclinado y paredes atrás y a un costado.
function shed(scene, { position, rotationY = 0, texture = 'corrugated_iron', tint }, ctx) {
  const tin = ctx.textures(texture, [2, 1]);
  tin.side = THREE.DoubleSide;
  if (tint) tin.color.set(tint);
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 });
  const group = new THREE.Group();
  for (const [x, z, h] of [[-1.6, 1.2, 2.6], [1.6, 1.2, 2.6], [-1.6, -1.2, 2.3], [1.6, -1.2, 2.3]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), wood);
    post.position.set(x, h / 2, z);
    group.add(post);
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3), tin);
  roof.rotation.x = -Math.PI / 2 + 0.12;
  roof.position.set(0, 2.5, 0);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.3), tin);
  back.position.set(0, 1.15, -1.25);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.3), tin);
  side.rotation.y = Math.PI / 2;
  side.position.set(1.65, 1.15, 0);
  group.add(roof, back, side);
  group.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  group.position.set(...position);
  group.rotation.y = rotationY;
  scene.add(group);
  return { object: group };
}

// Una loma oscura (media esfera achatada) detrás de algo, para que quede "adentro".
function hill(scene, { position, scale, color = '#15130f' }) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return { object: mesh };
}

// Postes de madera con travesaño y cables que cuelgan entre uno y otro (`tops`: la punta de cada poste).
function poles(scene, { tops }) {
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 0.95 });
  const wireMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 });
  const group = new THREE.Group();
  for (const [x, y, z] of tops) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, y + 0.4, 10), poleMaterial);
    pole.position.set(x, (y + 0.4) / 2 - 0.2, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMaterial);
    arm.position.set(x, y - 0.2, z);
    pole.castShadow = arm.castShadow = true;
    group.add(pole, arm);
  }
  const sorted = [...tops].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) for (const off of [-0.7, 0.7]) {
    const a = new THREE.Vector3(sorted[i - 1][0] + off, sorted[i - 1][1] - 0.15, sorted[i - 1][2]);
    const b = new THREE.Vector3(sorted[i][0] + off, sorted[i][1] - 0.15, sorted[i][2]);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.9, 0));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.012, 4), wireMaterial));
  }
  scene.add(group);
  return { object: group };
}

// Un riel de madera entre dos postes (`from` y `to`: los extremos de arriba), donde se paran los pájaros.
function rail(scene, { from, to }) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.95 });
  const group = new THREE.Group();
  for (const [x, y, z] of [from, to]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, y, 0.1), wood);
    post.position.set(x, y / 2, z);
    post.castShadow = true;
    group.add(post);
  }
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b) + 0.1, 0.06, 0.08), wood);
  beam.position.copy(a).lerp(b, 0.5);
  beam.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  beam.castShadow = true;
  group.add(beam);
  scene.add(group);
  return { object: group };
}

// El paisaje que pasa por la ventana del tren (`side`: -1 a la izquierda): campo, postes del telégrafo, árboles y lomas
// que corren a `speed` metros por segundo y vuelven a empezar cada `length` metros. Con movimiento reducido, quietos.
function passing(scene, { speed, side = -1, length = 260 }, ctx) {
  const group = new THREE.Group();
  const field = new THREE.Mesh(new THREE.PlaneGeometry(400, length * 1.6), new THREE.MeshStandardMaterial({ color: 0x4f5a2c, roughness: 1 }));
  field.rotation.x = -Math.PI / 2;
  field.position.set(side * 200, -0.6, 0);
  scene.add(field);
  const wood = new THREE.MeshStandardMaterial({ color: 0x3b2c1f, roughness: 0.95 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x3f5a2e, roughness: 0.9 });
  const far = new THREE.MeshStandardMaterial({ color: 0x55603f, roughness: 1 });
  const items = [];
  for (let z = -length / 2; z < length / 2; z += 16) {
    const pole = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 7, 6), wood);
    post.position.y = 3;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.4), wood);
    arm.position.y = 6.2;
    pole.add(post, arm);
    pole.position.set(side * 6, -0.6, z);
    items.push(pole);
  }
  for (let i = 0; i < 36; i++) {
    const tree = new THREE.Group();
    const h = 4 + (i * 7 % 5);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, h * 0.4, 5), wood);
    trunk.position.y = h * 0.2;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(h * 0.28, h * 0.8, 7), leaves);
    crown.position.y = h * 0.75;
    tree.add(trunk, crown);
    tree.position.set(side * (14 + (i * 37 % 60)), -0.6, -length / 2 + ((i * 53) % length));
    items.push(tree);
  }
  for (let i = 0; i < 8; i++) {
    const hillMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), far);
    hillMesh.scale.set(40 + i * 6, 14 + (i % 3) * 6, 30);
    hillMesh.position.set(side * (120 + (i % 2) * 40), -0.6, -length / 2 + i * (length / 8));
    items.push(hillMesh);
  }
  group.add(...items);
  scene.add(group);
  return {
    object: group,
    update(dt) {
      if (ctx.state.reducedMotion) return;
      for (const item of items) {
        // Lo lejano pasa más despacio (paralaje).
        const k = Math.abs(item.position.x) > 100 ? 0.15 : 1;
        item.position.z += speed * k * dt;
        if (item.position.z > length / 2) item.position.z -= length;
      }
    },
  };
}

// Adoquines de piedra dibujados (sin descargar texturas): un plano grande con el dibujo repetido.
function paving(scene, { size, position }) {
  let map = null;
  if (typeof document !== 'undefined') {
    map = canvasTexture((ctx, s) => {
      ctx.fillStyle = '#4a4744';
      ctx.fillRect(0, 0, s, s);
      const n = 8, c = s / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const shade = 92 + ((x * 31 + y * 17) % 7) * 7;
        ctx.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`;
        const off = y % 2 ? c / 2 : 0;
        ctx.beginPath();
        ctx.roundRect(((x * c + off) % s) + 2, y * c + 2, c - 4, c - 4, c * 0.25);
        ctx.fill();
      }
    }, 256);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(size[0] / 2.4, size[1] / 2.4);
    map.anisotropy = 4;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : 0x6a6560, roughness: 0.9 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return { object: mesh };
}

// El escenario de la Cosecha: una tarima de madera con escalones adelante y un faldón rojo.
function stage(scene, { position, size: [w, h, d] }) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.8 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7b0001, roughness: 0.95 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), wood);
  top.position.y = h - 0.06;
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, h - 0.12, d - 0.1), cloth);
  skirt.position.y = (h - 0.12) / 2;
  group.add(top, skirt);
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, (h / 3) * (i + 1), 0.35), wood);
    step.position.set(w / 2 - 1.2, ((h / 3) * (i + 1)) / 2, d / 2 + 0.35 * (3 - i) - 0.175);
    group.add(step);
  }
  group.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  group.position.set(...position);
  scene.add(group);
  return { object: group };
}

// Un cartel del Capitolio: tela roja con el sello dorado; `text` abajo (el distrito de la plaza).
function banner(scene, { position, size: [w, h], rotationY = 0, text = '' }) {
  let map = null;
  if (typeof document !== 'undefined') {
    const tall = h / w;
    map = canvasTexture((ctx, s) => {
      const H = s * tall;
      ctx.fillStyle = '#7b0001';
      ctx.fillRect(0, 0, s, H);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = s * 0.03;
      ctx.strokeRect(s * 0.05, s * 0.05, s * 0.9, H - s * 0.1);
      if (text) {
        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${H * 0.42}px Georgia, serif`;
        ctx.fillText(text, s / 2, H / 2);
      } else {
        const cx = s / 2, cy = H * 0.4, r = s * 0.3;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        ctx.font = `bold ${s * 0.16}px Georgia, serif`;
        ctx.fillText('PANEM', cx, H * 0.78);
      }
    }, 256, tall);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : 0x7b0001, roughness: 0.9, side: THREE.DoubleSide }));
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  scene.add(mesh);
  return { object: mesh };
}

// La gente de la plaza: siluetas oscuras (cuerpo y cabeza, sin caras) en filas, con un hueco donde está la cámara
// (`avoid`: x, z, radio) y un pasillo hacia el escenario (`aisle`: x y medio ancho).
function crowd(scene, { center: [cx, cz], rows, cols, spacing: [sx, sz], avoid = null, aisle = null }) {
  const spots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = cx + (c - (cols - 1) / 2) * sx + ((r * 7 + c * 3) % 5 - 2) * 0.06;
    const z = cz + (r - (rows - 1) / 2) * sz + ((r * 5 + c * 11) % 5 - 2) * 0.06;
    if (avoid && Math.hypot(x - avoid[0], z - avoid[1]) < avoid[2]) continue;
    if (aisle && Math.abs(x - aisle[0]) < aisle[1]) continue;
    spots.push([x, z, 0.86 + ((r * 13 + c * 7) % 9) * 0.018]);
  }
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.95, 3, 8), new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.95 }), spots.length);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.9 }), spots.length);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  spots.forEach(([x, z, k], i) => {
    dummy.position.set(x, 0.68 * k, z);
    dummy.scale.set(1, k, 0.8);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    bodies.setColorAt(i, tint.setScalar(0.75 + ((i * 7) % 6) * 0.08)); // un poco distinto cada uno
    dummy.position.set(x, 1.45 * k + 0.1, z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
  });
  bodies.castShadow = heads.castShadow = true;
  scene.add(bodies, heads);
  return { object: bodies };
}

export const BUILDERS = Object.freeze({ track, shed, hill, poles, rail, passing, paving, stage, banner, crowd });

// Una luz cálida con su halo; titila apenas (nada con movimiento reducido).
export function buildLamp(scene, { position, color = 0xffb46a, intensity = 14, size = 0.45, flicker = 0.08 }, ctx) {
  const light = new THREE.PointLight(color, intensity, 0, 2);
  light.position.set(...position);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.halo, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sprite.scale.setScalar(size);
  sprite.position.copy(light.position);
  scene.add(light, sprite);
  const seed = Math.random() * 100;
  return {
    object: light,
    update(dt, t) {
      const n = Math.sin(t * 13 + seed) * 0.5 + Math.sin(t * 7.3 + seed * 2) * 0.35 + Math.sin(t * 23 + seed * 3) * 0.15;
      const k = ctx.state.reducedMotion ? 1 : 1 + n * flicker;
      light.intensity = intensity * k;
      sprite.material.opacity = 0.75 + 0.25 * k;
    },
  };
}

// Fuego en un tambor (`position`: el pie del tambor): luz que titila, tres llamitas y brasas que suben.
export function buildFire(scene, { position }, ctx) {
  const [fx, , fz] = position;
  const lamp = buildLamp(scene, { position: [fx, 1.15, fz], color: 0xff7a2e, intensity: 22, size: 0.7, flicker: 0.35 }, ctx);
  const flames = [0, 1, 2].map((i) => {
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.halo, color: i ? 0xff6a1c : 0xffc46a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.set(fx + (i - 1) * 0.08, 1.05, fz);
    scene.add(flame);
    return flame;
  });
  const emberCount = 40;
  const embers = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: ctx.halo, color: 0xff8a3c, size: 0.06, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const emberSeeds = Array.from({ length: emberCount }, () => Math.random());
  embers.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(emberCount * 3), 3));
  scene.add(embers);
  return {
    object: lamp.object,
    update(dt, t) {
      lamp.update(dt, t);
      flames.forEach((flame, i) => {
        const k = ctx.state.reducedMotion ? 0 : Math.sin(t * (9 + i * 3) + i);
        flame.scale.set(0.3 + i * 0.06, 0.42 + i * 0.08 + k * 0.06, 1);
        flame.position.y = 1.05 + i * 0.1 + k * 0.02;
      });
      const ember = embers.geometry.attributes.position;
      for (let i = 0; i < emberCount; i++) {
        const life = (emberSeeds[i] + t * 0.35) % 1;
        ember.setXYZ(i, fx + Math.sin(i * 12.3 + t) * 0.18 * life, 1.1 + life * 1.8, fz + Math.cos(i * 7.1 + t) * 0.18 * life);
      }
      ember.needsUpdate = true;
      lamp.object.position.y = 1.15 + Math.sin(t * 17) * 0.03;
    },
  };
}

// Polvo en el aire dentro de una caja (`min`, `max`), que sube y se mece despacio.
export function buildDust(scene, { count, lowCount = count, min, max, color = '#8f8a80' }, ctx) {
  const n = ctx.budget.low ? lowCount : count;
  const positions = new Float32Array(n * 3);
  const height = max[1] - min[1];
  for (let i = 0; i < n; i++) positions.set([0, 1, 2].map((k) => min[k] + Math.random() * (max[k] - min[k])), i * 3);
  const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: ctx.halo, color, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false }));
  dust.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(dust);
  return {
    object: dust,
    update(dt, t) {
      if (ctx.state.reducedMotion) return;
      const p = dust.geometry.attributes.position;
      for (let i = 0; i < n; i++) {
        p.setX(i, p.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.05);
        p.setY(i, min[1] + ((p.getY(i) - min[1] + dt * 0.04) % height));
      }
      p.needsUpdate = true;
    },
  };
}

// Olas chicas para el agua: un mapa de normales que se repite sin cortes (suma de ondas con frecuencias enteras).
function waterNormals(size = 256) {
  return canvasTexture((ctx, s) => {
    const image = ctx.createImageData(s, s);
    // Muchas ondas chicas en direcciones distintas (semilla fija), para que no se note el patrón al repetirse.
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const waves = Array.from({ length: 28 }, (_, i) => {
      const f = 2 + Math.floor(rand() * (4 + i * 0.6));
      const angle = rand() * Math.PI * 2;
      return [Math.round(Math.cos(angle) * f), Math.round(Math.sin(angle) * f), 0.5 / (1 + i * 0.35), rand() * Math.PI * 2];
    });
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      let dx = 0, dy = 0;
      for (const [fx, fy, a, offset] of waves) {
        const phase = ((fx * x + fy * y) / s) * Math.PI * 2 + offset;
        dx += Math.cos(phase) * a * fx;
        dy += Math.cos(phase) * a * fy;
      }
      const n = new THREE.Vector3(-dx * 0.05, -dy * 0.05, 1).normalize();
      const i = (y * s + x) * 4;
      image.data.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], i);
    }
    ctx.putImageData(image, 0, 0);
  }, size);
}

// El agua: refleja el cielo, casi no deja ver lo de abajo (los cascos de los botes) y sus olas se corren despacio.
export function buildWater(scene, { size, position, color = '#2c4a55' }, ctx) {
  const normal = typeof document === 'undefined' ? null : waterNormals();
  if (normal) {
    normal.colorSpace = THREE.NoColorSpace;
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(size[0] / 18, size[1] / 18);
  }
  const material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, metalness: 0, normalMap: normal, normalScale: new THREE.Vector2(0.3, 0.3), transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return {
    object: mesh,
    update(dt) {
      if (!normal || ctx.state.reducedMotion) return;
      normal.offset.x += dt * 0.012;
      normal.offset.y += dt * 0.007;
    },
  };
}
