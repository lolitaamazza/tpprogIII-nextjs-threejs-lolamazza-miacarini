import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Tilt-shift: la franja del centro queda nítida y arriba y abajo se desenfoca, como una maqueta fotografiada.
// Un solo pase con muestras en disco; el radio crece con la distancia a la franja.
const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uFocus: { value: 0.5 }, // altura de la franja nítida (0 abajo, 1 arriba)
    uBand: { value: 0.16 }, // media altura de la franja
    uBlur: { value: 7 }, // radio máximo en píxeles
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uFocus;
    uniform float uBand;
    uniform float uBlur;
    varying vec2 vUv;
    void main() {
      float amount = smoothstep(0.0, 0.32, abs(vUv.y - uFocus) - uBand);
      vec2 radius = amount * uBlur / uResolution;
      vec4 sum = texture2D(tDiffuse, vUv);
      float weight = 1.0;
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 2.39996;
        float r = sqrt(float(i) + 0.5) / sqrt(12.0);
        sum += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * radius);
        weight += 1.0;
      }
      gl_FragColor = sum / weight;
    }
  `,
};

export function createTiltShift(width, height) {
  const pass = new ShaderPass(TiltShiftShader);
  pass.setSize = (w, h) => pass.uniforms.uResolution.value.set(w, h);
  pass.setSize(width, height);
  return pass;
}
