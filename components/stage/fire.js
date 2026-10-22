import * as THREE from 'three';

// Fuego continuo: turbulencia de cinco octavas, lenguas advectadas y brasas.
// Un único plano, resolución limitada y ningún sprite borroso superpuesto.
const fragmentShader = `
precision highp float;
uniform float uTime;
uniform float uIntensity;
uniform vec2 uResolution;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(13.1,7.7);a*=.5;}return v;}
void main(){
 vec2 uv=vUv;float t=uTime;float aspect=uResolution.x/uResolution.y;
 vec2 p=vec2(uv.x*aspect*5.,uv.y*4.);
 float bend=fbm(vec2(p.x*.7,p.y*1.2-t*.6));
 float turbulence=fbm(p*vec2(1.4,1.7)+vec2(bend*2.,-t*1.9));
 float tongues=fbm(vec2(p.x*1.6+bend,p.y*.75-t*.8));
 float reach=(.23+.38*tongues)*uIntensity;
 float fuel=reach-uv.y+(.5-turbulence)*.25*uIntensity;
 float edge=smoothstep(-.018,.025,fuel);
 float core=smoothstep(.02,.22,fuel);
 vec3 flame=mix(vec3(.72,.055,.008),vec3(1.,.30,.025),core);
 flame=mix(flame,vec3(1.,.88,.48),pow(core,3.));
 flame*=.7+.5*turbulence;
 // Humo visible solo en remolinos; el resto queda transparente para ver el mapa encendido detrás.
 float smoke=smoothstep(.43,.72,fbm(p*.8+vec2(bend,-t*.32)))*(1.-smoothstep(.25,.9,uv.y))*.13*uIntensity;
 vec3 color=vec3(smoke*.58,smoke*.60,smoke*.63)+flame*edge;
 for(int i=0;i<36;i++){
  float seed=float(i);float speed=.035+hash(vec2(seed,7.))*.10;
  float y=fract(hash(vec2(seed,3.))+t*speed);
  float x=hash(vec2(seed,9.))+sin(t*.65+seed+y*5.)*.035;
  vec2 d=(uv-vec2(x,y))*vec2(aspect,1.);
  float spark=1.-smoothstep(.0008,.0035,length(d*vec2(1.,.48)));
  color+=vec3(1.,.38,.06)*spark*(1.-y)*uIntensity;
 }
 gl_FragColor=vec4(color,clamp(max(max(color.r,color.g),color.b)*1.6,0.,1.)); // transparente donde no hay fuego
}`;
export function createFire(canvas,root){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});renderer.setClearColor(0x000000,0);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
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
