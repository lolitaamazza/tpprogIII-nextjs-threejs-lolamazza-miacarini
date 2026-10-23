import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// El acabado de cámara de las escenas: sombras frías, luces cálidas, viñeta y grano de película.
// Va antes del OutputPass (trabaja en lineal, antes del tone mapping). Sin glow: no hay bloom.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignette: { value: 0.42 },
    grain: { value: 0.03 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time, vignette, grain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color *= mix(vec3(0.9, 0.97, 1.1), vec3(1.08, 1.0, 0.88), smoothstep(0.02, 0.6, luma));
      float d = distance(vUv, vec2(0.5));
      color *= mix(1.0, smoothstep(0.82, 0.22, d), vignette);
      color += (hash(vUv * 1024.0 + time) - 0.5) * grain * (0.25 + luma);
      gl_FragColor = vec4(max(color, 0.0), 1.0);
    }`,
};

export function createGradePass() {
  return new ShaderPass(GradeShader);
}
