import * as THREE from '/three.module.js';
import {HDRLoader} from './vendor/effects/loaders/HDRLoader.js';

// A small original sky reflection map is generated once, not rendered every frame.
export function setupReflections(renderer,scene){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
 const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#496d99');gradient.addColorStop(.38,'#b4d3e1');gradient.addColorStop(.5,'#ffddb5');gradient.addColorStop(.53,'#8c978f');gradient.addColorStop(1,'#36444a');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
 ctx.fillStyle='#edf3e8';for(const [x,y,w,h]of [[45,70,100,8],[190,92,65,6],[330,65,115,9]])ctx.fillRect(x,y,w,h);
 ctx.fillStyle='#546878';for(let i=0;i<20;i++)ctx.fillRect(i*27,124-(i%4)*5,15+(i%3)*4,18+(i%4)*5);
 const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
 const pmrem=new THREE.PMREMGenerator(renderer);let target=pmrem.fromEquirectangular(texture);scene.environment=target.texture;scene.environmentIntensity=.65;texture.dispose();
 // The original procedural map is immediately available, including offline/error fallback.
 new HDRLoader().load('/assets/venice_sunset_1k.hdr',hdr=>{
  const photo=pmrem.fromEquirectangular(hdr);scene.environment=photo.texture;scene.environmentIntensity=.7;
  target.dispose();target=photo;hdr.dispose();pmrem.dispose();
 },undefined,()=>pmrem.dispose());
 return {dispose(){target.dispose();}};
}

let beamTexture;
function roadGlow(){
 if(!beamTexture){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,42,0,32,34,30);g.addColorStop(0,'rgba(255,230,161,.7)');g.addColorStop(.5,'rgba(255,221,152,.25)');g.addColorStop(1,'rgba(255,218,140,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);beamTexture=new THREE.CanvasTexture(c);beamTexture.colorSpace=THREE.SRGBColorSpace;}
 const pool=new THREE.Mesh(new THREE.PlaneGeometry(4.5,8),new THREE.MeshBasicMaterial({map:beamTexture,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending}));pool.rotation.x=-Math.PI/2;pool.position.set(0,.19,5);pool.visible=false;return pool;
}

export function dressCar(car,model){
 const wheels=[],steering=[],tails=[],headlights=[];
 model.traverse(o=>{
  if(/^Wheel(F|R)(L|R)$/.test(o.name))wheels.push(o);
  if(/^SteerF(L|R)$/.test(o.name))steering.push(o);
  if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
  const list=Array.isArray(o.material)?o.material:[o.material];
  const materials=list.map(original=>{
   let m=original.clone();const name=m.name.toLowerCase();
   if(name.includes('paint')||name.includes('copper')){const physical=new THREE.MeshPhysicalMaterial();physical.copy(new THREE.MeshPhysicalMaterial({color:m.color,metalness:.52,roughness:.28,clearcoat:.9,clearcoatRoughness:.2}));physical.name=m.name;m.dispose();m=physical;}
   if(name.includes('glass')){m.color.setHex(0x234756);m.roughness=.15;m.metalness=.7;m.envMapIntensity=1.35;}
   if(name.includes('alloy')){m.roughness=.23;m.metalness=.85;m.envMapIntensity=.8;}
   if(name.includes('tail')){m.emissive.setHex(0xff2410);m.emissiveIntensity=.3;tails.push(m);}
   if(name.includes('headlight')){m.emissive.setHex(0xffdfa1);m.emissiveIntensity=.2;headlights.push(m);}
   return m;
  });o.material=Array.isArray(o.material)?materials:materials[0];
 });
 const pool=roadGlow();car.add(pool);car.userData.visuals={model,wheels,steering,tails,headlights,pool,spin:0};
}

export function updateCar(car,state,dt,{reducedMotion=false,quality='auto'}={}){
 const v=car.userData.visuals;if(!v)return;
 const speed=Number.isFinite(state.speed)?state.speed:0;
 v.spin=(v.spin+speed*dt/.45)%(Math.PI*2);for(const wheel of v.wheels)wheel.rotation.x=v.spin;
 for(const pivot of v.steering)pivot.rotation.y=-(state.steer||0)*.38;
 v.model.rotation.z=reducedMotion?0:-(state.steer||0)*Math.min(Math.abs(speed)/16,1)*.025;
 for(const m of v.tails)m.emissiveIntensity=state.braking?2.3:state.driver?.45:.08;
 for(const m of v.headlights)m.emissiveIntensity=state.driver?1.5:.15;
 v.pool.visible=!!state.driver&&quality!=='low';
}
