import * as THREE from 'three';

// Fuego continuo: turbulencia de cinco octavas, lenguas advectadas y brasas.
// Un único plano, resolución limitada y ningún sprite borroso superpuesto.
// Capas de densidad advectadas: absorción, emisión de la llama y humo sin una franja opaca.
const fragmentShader = `
precision highp float;
uniform float uTime;
uniform float uIntensity;
uniform vec2 uResolution;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+7.3)+.15*noise(p*4.11+15.1);}
void main(){
 vec2 uv=vUv;float t=uTime*.62;float aspect=uResolution.x/uResolution.y;
 vec3 radiance=vec3(0.);float transmittance=1.;
 // Depth samples break up the flame edges and give the hot center optical thickness.
 for(int i=0;i<12;i++){
  float depth=float(i)/11.;vec2 p=vec2(uv.x*aspect*7.,uv.y*5.);
  p.x+=(depth-.5)*1.3;
  float curl=fbm(p*.65+vec2(depth*4.,-t*.55));
  vec2 flow=p+vec2((curl-.5)*(1.+uv.y*2.),-t*(2.+depth*.3));
  float n=fbm(flow*vec2(1.8,1.25)+depth*5.1);
  float plume=fbm(vec2(p.x*.8+depth,uv.y*1.3-t*.45));
  float height=(.19+.48*plume)*uIntensity;
  float fuel=height-uv.y+(n-.5)*(.33+uv.y*.2)*uIntensity;
  float density=smoothstep(-.028,.095,fuel)*(.20+.35*n)*uIntensity;
  float heat=clamp(fuel*3.7+.18+n*.16,0.,1.);
  vec3 emission=mix(vec3(.7,.045,.003),vec3(1.4,.40,.035),smoothstep(.08,.5,heat));
  emission=mix(emission,vec3(1.9,1.35,.64),smoothstep(.55,.95,heat));
  float smoke=smoothstep(.55,.83,fbm(flow*.55+9.))*smoothstep(-.04,.08,uv.y-height)*(1.-smoothstep(.45,.95,uv.y))*.045*uIntensity;
  radiance+=transmittance*(emission*density+vec3(.10,.105,.11)*smoke);
  transmittance*=1.-clamp(density*.65+smoke,0.,.9);
 }
 for(int i=0;i<28;i++){
  float seed=float(i),speed=.04+hash(vec2(seed,7.))*.08;
  float y=fract(hash(vec2(seed,3.))+t*speed);
  float x=hash(vec2(seed,9.))+sin(t+seed+y*8.)*.025;
  vec2 d=(uv-vec2(x,y))*vec2(aspect,1.);
  float spark=1.-smoothstep(.0005,.0025,length(d*vec2(1.,.45)));
  float glow=spark*(1.-y)*uIntensity;
  radiance+=vec3(1.4,.48,.08)*glow;transmittance*=1.-glow;
 }
 float alpha=clamp(1.-transmittance,0.,1.);
 vec3 color=1.-exp(-radiance/max(alpha,.001)*.95);
 gl_FragColor=vec4(color,alpha);
}`;
export function createFire(canvas,root){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});renderer.setClearColor(0x000000,0);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,.85));
 const scene=new THREE.Scene(),camera=new THREE.Camera();
 const uniforms={uTime:{value:0},uIntensity:{value:0},uResolution:{value:new THREE.Vector2(1,1)}};
 const material=new THREE.ShaderMaterial({uniforms,fragmentShader,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}'});
 const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
 let frame=0,last=0,target=0,disposed=false;
 const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);uniforms.uResolution.value.set(w,h);};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 function draw(now){if(disposed)return;frame=requestAnimationFrame(draw);const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(document.hidden)return;
  uniforms.uTime.value+=dt;uniforms.uIntensity.value+=(target-uniforms.uIntensity.value)*(1-Math.exp(-dt*1.4));
  renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(draw);
 return {setTarget(value){target=THREE.MathUtils.clamp(value,0,1);},getIntensity(){return uniforms.uIntensity.value;},dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();geometry.dispose();material.dispose();renderer.dispose();root?.style.removeProperty('--burn');}};
}
