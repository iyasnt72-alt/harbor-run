import * as THREE from '/three.module.js';
import {buildings,roads,parks,DEPOT,DROP,LIMIT} from './world.mjs';
import {dressStreets,createAtmosphere} from './districts.mjs';

// Original geometry and CC0 photo textures. Batch repeated pieces to
// keep the richer city inexpensive to draw on a phone.
const palettes={stone:0xd6c4a1,curb:0xcdccb8,asphalt:0x48565c,glass:0x527381,trim:0xf0e0c0,wood:0x9b7050,green:0x6c9570};
const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,8),cone=new THREE.ConeGeometry(1,1,6),leaf=new THREE.IcosahedronGeometry(1,1);
const materialCache=new Map();
// Feathered palm leaves share one instanced mesh, including their tapered tips.
const frond=new THREE.BufferGeometry(),frondPoints=[];
function spine(t){return [0,Math.sin(t*Math.PI)*.7-t*t*1.1,t*4.3];}
for(let i=1;i<21;i++){
 const t=i/22,a=spine(t),b=spine(t+.035),width=Math.pow(Math.sin(t*Math.PI),.7)*.8;
 for(const side of [-1,1]){const tip=[side*width,a[1]-.16,a[2]+.43];frondPoints.push(...a,...b,...tip);}
}
for(let i=0;i<20;i++){const a=spine(i/20),b=spine((i+1)/20);frondPoints.push(a[0]-.028,a[1],a[2],a[0]+.028,a[1],a[2],...b);}
frond.setAttribute('position',new THREE.Float32BufferAttribute(frondPoints,3));frond.computeVertexNormals();
const palmTrunk=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.13,2.5,0),new THREE.Vector3(.55,5.4,.15)]),10,.22,7,false);
function windowTexture(){
 const c=document.createElement('canvas');c.width=128;c.height=192;const g=c.getContext('2d');
 const sky=g.createLinearGradient(0,0,0,192);sky.addColorStop(0,'#a8c3ce');sky.addColorStop(.45,'#647c86');sky.addColorStop(.5,'#354b56');sky.addColorStop(1,'#233540');g.fillStyle=sky;g.fillRect(0,0,128,192);
 g.fillStyle='#cab99555';g.fillRect(9,12,24,170);g.fillRect(101,12,19,170);g.fillStyle='#20313b';g.fillRect(0,0,128,7);g.fillRect(0,184,128,8);g.fillRect(0,0,7,192);g.fillRect(121,0,7,192);g.fillRect(61,0,5,192);g.fillRect(0,102,128,5);
 g.fillStyle='#e8dac329';g.fillRect(9,12,51,7);g.fillRect(68,12,49,7);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
const windows=windowTexture();

const textureLoader=new THREE.TextureLoader();
function photoTexture(name,color=true){const t=textureLoader.load('/assets/'+name);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;}
const asphalt=photoTexture('asphalt_03_diff.jpg'),asphaltNormal=photoTexture('asphalt_03_nor_gl.jpg',false),brick=photoTexture('red_brick_diff.jpg'),brickNormal=photoTexture('red_brick_nor_gl.jpg',false),concrete=photoTexture('concrete_wall_006_diff.jpg'),concreteNormal=photoTexture('concrete_wall_006_nor_gl.jpg',false);
function material(color){
 if(!materialCache.has(color)){
  const road=color===palettes.asphalt,isBrick=[0xc38e75,0xd0b79b].includes(color),isPlaster=[0xd9caae,0x8faeb0,0xb5ac96,0xb6c2ac,palettes.curb].includes(color);
  const m=new THREE.MeshStandardMaterial({color:road?0x9ba8b0:isBrick?0xcbb9a1:color,roughness:road?0.94:0.8,metalness:color===palettes.glass?.3:0,map:road?asphalt:isBrick?brick:isPlaster?concrete:null,normalMap:road?asphaltNormal:isBrick?brickNormal:isPlaster?concreteNormal:null,normalScale:new THREE.Vector2(.32,.32)});
  if(road){m.emissive.setHex(0x364859);m.emissiveIntensity=.12;}
  if(color===0x598d6a){m.side=THREE.DoubleSide;m.roughness=.85;}
  if(road||isBrick||isPlaster){
   m.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vSurfaceWorld; varying vec3 vSurfaceNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
     vec4 texturePosition=vec4(transformed,1.0);vec3 textureNormal=normal;
     #ifdef USE_INSTANCING
      texturePosition=instanceMatrix*texturePosition;textureNormal=mat3(instanceMatrix)*textureNormal;
     #endif
     vSurfaceWorld=(modelMatrix*texturePosition).xyz;vSurfaceNormal=normalize(mat3(modelMatrix)*textureNormal);`);
    const uv=road?'(vSurfaceWorld.xz * 0.16)':'((abs(vSurfaceNormal.y)>0.5?vSurfaceWorld.xz:abs(vSurfaceNormal.x)>0.5?vSurfaceWorld.zy:vSurfaceWorld.xy)*0.32)';
    shader.fragmentShader='varying vec3 vSurfaceWorld; varying vec3 vSurfaceNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replaceAll('vMapUv',uv)+(road?'\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.299,.587,.114))),.72)*1.6;':''));
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replaceAll('vNormalMapUv',uv));
   };m.customProgramCacheKey=()=>road?'road-photo':isBrick?'brick-photo':'plaster';
  }
  if([0x486674,0x597b84,0x799898,0x456979,0x284953].includes(color)){m.map=windows;m.color.setHex(0xc2d1d2);m.roughness=.29;m.metalness=.35;m.envMapIntensity=.7;}
  materialCache.set(color,m);
 }
 return materialCache.get(color);
}
export function createWorld(scene){
 const batches=new Map(),matrix=new THREE.Object3D();
 function piece(geometry,x,y,z,w,h,d,color,rotation=0){const key=geometry.uuid+':'+color;let b=batches.get(key);if(!b){b={geometry,color,items:[]};batches.set(key,b);}b.items.push({x,y,z,w,h,d,rotation});}
 const box=(x,y,z,w,h,d,color,r=0)=>piece(cube,x,y,z,w,h,d,color,r);
 const cyl=(x,y,z,w,h,d,color)=>piece(cylinder,x,y,z,w,h,d,color);
 const crown=(x,y,z,w,h,d,color)=>piece(leaf,x,y,z,w,h,d,color);
 function tree(x,z,scale=1,palm=false){
  if(palm)piece(palmTrunk,x,.1,z,scale,scale,scale,0x84654b);else cyl(x,2.7*scale,z,.28*scale,5.4*scale,.28*scale,0x84654b);
  if(palm){for(let j=0;j<9;j++){const a=j*Math.PI*2/9;piece(frond,x+.55*scale,5.5*scale+(j%2)*.22,z+.15*scale,scale,scale,scale,0x598d6a,a);}}
  else{crown(x,5*scale,z,2.7*scale,2.8*scale,2.7*scale,0x699476);crown(x+scale,6*scale,z-.6*scale,1.9*scale,2*scale,1.9*scale,0x80a376);for(let j=0;j<3;j++){const a=j*2.1;crown(x+Math.sin(a)*scale*1.8,4.6*scale,z+Math.cos(a)*scale*1.8,1.6*scale,1.6*scale,1.6*scale,0x699476);}}
  shadow(x,z,3*scale,3*scale,5*scale);
 }
 const shadowPositions=[];
 function shadow(x,z,w,d,h){
  // Projected silhouette on the ground: no dynamic shadow map needed.
  const dx=h*.6,dz=h*.4,y=.19;
  const p=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2+dx,z-d/2+dz],[x+w/2+dx,z+d/2+dz],[x-w/2+dx,z+d/2+dz],[x-w/2,z+d/2]];
  for(let k=1;k<p.length-1;k++)for(const q of [p[0],p[k+1],p[k]])shadowPositions.push(q[0],y,q[1]);
 }
 function label(text,x,y,z,color=0xf7e5ba,w=8,rotation=0){
  const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#163c46';ctx.fillRect(0,0,512,96);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 40px system-ui';ctx.fillText(text,256,49,470);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,w*96/512),new THREE.MeshBasicMaterial({map:texture}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);
 }
 box(0,-.55,0,380,1,380,0xadb8a1);
 box(0,-1.9,0,383,2,383,0x77918b);
 // Continuous promenades define the edge of the playable island.
 for(const a of [-180,180]){box(a,.02,0,18,.12,378,0xc6bb9b);box(0,.02,a,378,.12,18,0xc6bb9b);}
 for(const r of roads){
  const w=r===0?18:14;
  box(r,.04,0,w,.08,371,palettes.asphalt);box(0,.041,r,371,.08,w,palettes.asphalt);
  // Sidewalk strips meet the same shared road grid as the server map.
  for(const side of [-1,1]){box(r+side*(w/2+1.3),.07,0,2.6,.14,370,palettes.curb);box(0,.071,r+side*(w/2+1.3),370,.14,2.6,palettes.curb);}
  for(let v=-180;v<=180;v+=8){if(roads.some(n=>Math.abs(v-n)<12))continue;box(r,.135,v,.17,.02,3.7,0xdccc9a);box(v,.136,r,3.7,.02,.17,0xdccc9a);}
 }
 // Pavement joints and small surface repairs give the broad avenues scale.
 for(const r of roads)for(let v=-177;v<180;v+=5.2){
  if(roads.some(n=>Math.abs(v-n)<13))continue;
  const edge=(r===0?9:7)+1.3;
  for(const side of [-1,1]){box(r+side*edge,.151,v,2.5,.009,.028,0x8b9993);box(v,.152,r+side*edge,.028,.009,2.5,0x8b9993);}
 }
 for(const r of [-104,0,104])for(let v=-168;v<174;v+=26){
  if(roads.some(n=>Math.abs(v-n)<12))continue;
  cyl(r+3,.092,v,.6,.014,.6,0x515e61);
  for(let j=-2;j<=2;j++)box(r+3+j*.16,.107,v,.045,.01,.75,0x8b9993);
  box(r-3,.094,v+3,1.4,.012,2.4,0x727d7c);
 }
 // Crisp zebra crossings and intersection corners.
 for(const x of roads)for(const z of roads){for(const side of [-1,1])for(let k=-4;k<=4;k+=2){box(x+k,.15,z+side*11,1,.025,3.3,0xdcd7bd);box(x+side*11,.151,z+k,3.3,.025,1,0xdcd7bd);}}
 for(const [idx,b] of buildings.entries()){
  const {x,z,w,d,h}=b;
  box(x,.12,z,w+2,.24,d+2,0xcac4b1);
  box(x,h/2+.2,z,w,h,d,b.color);
  box(x,1.35,z,w+.15,2.3,d+.15,idx%2?0xb9b3a1:0xc8bda5);
  box(x,h+.28,z,w+.7,.55,d+.7,palettes.trim);
  box(x,h+.61,z,w-1,.12,d-1,0x8b9993);
  // Parapet gives each roof a crisp silhouette.
  for(const s of [-1,1]){box(x+s*(w/2-.2),h+.9,z,.32,.7,d,palettes.trim);box(x,h+.9,z+s*(d/2-.2),w,.7,.32,palettes.trim);}
  const glass=[0x486674,0x597b84,0x799898];
  function facade(horizontal,side){
   const length=horizontal?w:d,face=horizontal?d:w;
   const panel=(u,y,depth,pw,ph,pd,color)=>horizontal?box(x+u,y,z+side*(face/2+depth),pw,ph,pd,color):box(x+side*(face/2+depth),y,z+u,pd,ph,pw,color);
   for(let y=4.5;y<h-1;y+=3.5){
    panel(0,y-1.3,.08,length+.2,.16,.2,palettes.trim);
    for(let u=-length/2+2;u<length/2-1;u+=3.2){
     panel(u,y,.045,1.75,2.08,.12,0x727d7c);
     panel(u,y,.12,1.48,1.84,.035,glass[idx%3]);
     panel(u,y-1.1,.25,1.95,.15,.5,palettes.trim);
     panel(u,y+1.12,.15,1.92,.16,.3,palettes.trim);
     // Alternating residential balconies add depth without occupying the road.
     if(idx%3===1&&Math.round(y)%2===0&&u<length/2-3){
      panel(u,y-1.22,.6,2.45,.18,1.2,0xb9b3a1);
      panel(u,y-.35,1.13,2.35,.09,.08,0x515e61);
      for(let v=-1.05;v<=1.1;v+=.35)panel(u+v,y-.74,1.13,.055,.86,.055,0x515e61);
      for(const edge of [-1,1])panel(u+edge*1.1,y-.35,.6,.07,.09,1.1,0x515e61);
     }else if(idx%4===0&&u>0&&y<8){
      panel(u+.65,y-1.2,.38,.85,.58,.6,0x8c9d99);
      for(let j=0;j<4;j++)panel(u+.65,y-1.4+j*.12,.69,.66,.03,.035,0x515e61);
     }
    }
   }
   // Ground-floor recesses, door frames and weathered skirting.
   panel(0,.43,.13,length,.45,.25,0x8b9993);
   for(let u=-length/2+2;u<length/2-1;u+=3.5){
    panel(u,1.55,.1,2.5,2.3,.18,palettes.trim);panel(u,1.55,.21,2.22,2.1,.045,0x456979);
    panel(u,1.55,.26,.055,2.1,.08,0x727d7c);
   }
   panel(-length/2+.45,h/2,.13,.1,h,.17,0x727d7c);
  }
  for(const side of [-1,1]){facade(true,side);facade(false,side);}
  // Door, storefront glazing, striped awnings, and roof utilities.
  box(x,1.4,z+d/2+.075,1.9,2.7,.15,0x284953);
  for(const s of [-1,1])box(x+s*w*.29,1.6,z+d/2+.07,Math.max(2,w*.21),2,.14,0x456979);
  const awning=[0xc47156,0x4c8d88,0xcfaa64,0x759176][idx%4];
  box(x,3,z+d/2+.75,w*.88,.25,1.65,awning);
  for(let u=-w*.4;u<w*.4;u+=1.4)box(x+u,3.025,z+d/2+.75,.6,.27,1.65,0xe7d7b6);
  box(x+w*.22,h+1.25,z-d*.2,w*.25,1.1,d*.23,0x8c9d99);
  if(idx%6===0){cyl(x-w*.18,h+2.6,z,1.3,3,1.3,0xb29e7e);piece(cone,x-w*.18,h+4.35,z,1.6,.7,1.6,0x6f7f7e);}
  if(idx%2===0){const name=['QUAY COFFEE','PALM MARKET','PORT & PINE','MARINER AUTO','COAST RECORDS','SUNSET DINER'][idx/2%6|0];label(name,x,3.8,z+d/2+.18,0xf2dab0,Math.min(9,w*.85));const side=x<0?1:-1;label(name,x+side*(w/2+.19),3.4,z,0xf2dab0,8,side*Math.PI/2);}
  shadow(x,z,w,d,h);
 }
 // Tree-lined avenues: keep the central carriageways and mission markers clear.
 for(const r of [-104,0,104])for(let v=-166;v<174;v+=26){if(roads.some(n=>Math.abs(n-v)<12))continue;for(const side of [-1,1])tree(r+side*(r===0?10.3:9.2),v,r===0?1.15:.85,r===0);}
 for(const p of parks){
  box(p.x,.13,p.z,p.w,.18,p.d,0x80a579);
  box(p.x,.24,p.z,4,.05,p.d,0xd7c79e);box(p.x,.241,p.z,p.w,.05,4,0xd7c79e);
  for(const dx of [-13,13])for(const dz of [-13,13])tree(p.x+dx,p.z+dz,1.35);
  for(const dz of [-8,8]){box(p.x-10,.45,p.z+dz,4,.7,2,0xbca885);for(let j=0;j<5;j++)crown(p.x-11.5+j*.75,.95,p.z+dz,.4,.3,.4,j%2?0xd69a82:0xdacb80);}
  if(p.x===130&&p.z===78){for(const dx of [-8,8]){cyl(p.x+dx,1.8,p.z,.08,3.6,.08,0xc3b392);piece(cone,p.x+dx,3.8,p.z,3,.9,3,dx<0?0xc48368:0x639d9a);}}
  if(p.x===78&&p.z===78){cyl(p.x,.48,p.z,5,.6,5,0xd0c9af);cyl(p.x,.82,p.z,4.3,.1,4.3,0x72bec3);cyl(p.x,1.7,p.z,.5,2,.5,0xd3d9c1);cyl(p.x,2.75,p.z,1.6,.2,1.6,0x9dc6bd);}
  else {for(const dx of [-7,7]){box(p.x+dx,.75,p.z+5,3,.2,1,0xa47650);box(p.x+dx,1.1,p.z+5.5,3,.65,.15,0x9e724e);}}
 }
 // Street lamps, flower beds, and traffic lights use the same instanced batches.
 for(const x of [-52,0,52])for(const z of [-130,-78,-26,26,78,130]){
  cyl(x+11,3.2,z,.12,6.4,.12,0x50656a);box(x+10,6.3,z,2,.15,.16,0x50656a);box(x+9.2,6.2,z,.65,.18,.7,0xf5da99);
 }
 for(const x of [-12,12])for(const z of [-12,64,-64]){cyl(x,2,z,.15,4,.15,0x576969);box(x,4,z,.65,1.2,.5,0x294d56);box(x,4.2,z+.26,.27,.27,.06,0xd69d68);box(x,3.8,z+.26,.27,.27,.06,0x9ec996);}
 // Waterfront: piers, small original boats, containers, and a landmark crane.
 for(const x of [-150,-80,0,80,150]){box(x,-.25,-207,6,.7,38,0x977c5a);for(let z=-190;z>=-224;z-=4)box(x,.13,z,5.8,.08,.12,0xceb98b);}
 for(const [i,x]of [-132,-63,19,99].entries()){
  box(x,-.55,-212,5,1.5,13,[0x9e6452,0xd4ba82,0x538e94,0xc47f55][i]);box(x,.25,-213,4.3,.2,9,0xe2dbc1);box(x,1,-214,3.2,1.6,4.4,0xe6e0c9);box(x,1.5,-211.76,2.7,.8,.05,0x3c6677);cyl(x,4.8,-214,.07,7,.07,0xc2cec4);
 }
 for(const x of [-170,-150])for(const z of [-178,-169]){box(x,1.5,z,13,3,6,x===-170?0xab7359:0x688f94);for(let d=-5;d<=5;d+=1)box(x+d,1.5,z+3.04,.12,2.8,.08,0x8c9b8e);}
 for(const x of [-166,-157])box(x,10,-187,.7,20,.7,0xd6af6b);box(-161.5,20,-187,24,.8,1,0xd6af6b);box(-173,15,-187,.1,10,.1,0x55656a);
 label('SOUTH QUAY',0,5,-183,0xf6d4a0,18);for(const x of [-9,9])box(x,2.5,-183,.3,5,.3,0x5b7474);
 // An unobtrusive boundary rail makes the playable limit legible.
 for(let v=-182;v<=182;v+=8){for(const s of [-1,1]){box(v,.8,s*187,.2,1.6,.2,0x708886);box(s*187,.8,v,.2,1.6,.2,0x708886);}}
 for(const s of [-1,1]){box(0,1.1,s*187,374,.12,.12,0x8c9f92);box(s*187,1.1,0,.12,.12,374,0x8c9f92);}
 // Depot and harbor landing pads (decorative props never block navigation).
 box(DEPOT.x,.18,DEPOT.z,5,.25,5,0xd3b275);box(DEPOT.x,.63,DEPOT.z,1.4,.9,1.2,0xc7955b);box(DEPOT.x,.65,DEPOT.z,.14,.96,1.23,0xe9d19a);
 box(DROP.x,.15,DROP.z,6,.2,6,0x70b1b6);
 dressStreets({box,cyl,label,tree});
 for(const b of batches.values()){
  const mesh=new THREE.InstancedMesh(b.geometry,material(b.color),b.items.length);
  b.items.forEach((p,i)=>{matrix.position.set(p.x,p.y,p.z);matrix.rotation.set(0,p.rotation,0);matrix.scale.set(p.w,p.h,p.d);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);});mesh.computeBoundingSphere();mesh.castShadow=b.items.some(p=>p.h>1);mesh.receiveShadow=true;scene.add(mesh);
 }
 const shadowGeometry=new THREE.BufferGeometry();shadowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(shadowPositions,3));
 const shadows=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({color:0x213f49,transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide}));scene.add(shadows);
 // Animated sea uses one draw call. The island masks the submerged center.
 const waterMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 world;uniform float time;void main(){vec3 p=position;p.z+=sin(p.x*.055+time*.55)*.10+sin(p.y*.037-time*.4)*.08;world=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,fragmentShader:`varying vec3 world;uniform float time;void main(){
 float a=world.x*.31+world.z*.19+time*.8;float b=world.x*.13-world.z*.49-time*.63;
 vec3 n=normalize(vec3(cos(a)*.055,1.,sin(b)*.07));vec3 view=normalize(cameraPosition-world);
 float fresnel=pow(1.-max(dot(view,n),0.),3.);float sparkle=pow(max(dot(reflect(normalize(vec3(.65,-.62,.44)),n),view),0.),100.);
 vec3 c=mix(vec3(.055,.19,.22),vec3(.32,.42,.46),fresnel);c+=vec3(1.,.67,.33)*sparkle*.85;
 c+=smoothstep(.94,1.,sin(a+sin(b)))*.014;gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const water=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800,36,36),waterMaterial);water.rotation.x=-Math.PI/2;water.position.y=-1;scene.add(water);
 // Distant landscape is outside the playable island.
 createAtmosphere(scene);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(850,16,8),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 pos;void main(){pos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 pos;void main(){float a=clamp(normalize(pos).y*.8,0.,1.);gl_FragColor=vec4(mix(vec3(.87,.66,.46),vec3(.27,.48,.68),sqrt(a)),1.);}'}));scene.add(sky);
 return {update(time){waterMaterial.uniforms.time.value=time;},setShadows(enabled){shadows.visible=!enabled;},staticDrawCalls:batches.size+3};
}
function meshBox(parent,x,y,z,w,h,d,color){const m=new THREE.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
function blob(parent,w,d){const m=new THREE.Mesh(new THREE.CircleGeometry(1,18),new THREE.MeshBasicMaterial({color:0x15343d,transparent:true,opacity:.24,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.22;m.scale.set(w,d,1);parent.add(m);}
let avatarTemplate=null;
export function setAvatarTemplate(model){avatarTemplate=model;}
function makeModelAvatar(scene,color){
 const g=new THREE.Group();blob(g,.55,.45);const model=avatarTemplate.clone(true);g.add(model);
 const rod=new THREE.Group();g.add(rod);rod.visible=false;
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.018,.035,3,6),material(0xa58c66));pole.position.set(.4,2.2,1.6);pole.rotation.x=Math.PI/4;rod.add(pole);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.4,3.26,2.66),new THREE.Vector3(.4,-.5,12)]),new THREE.LineBasicMaterial({color:0xd7decf}));rod.add(line);
 const float=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),material(0xe5b780));float.position.set(.4,-.5,12);rod.add(float);
 const limbs=['LegL','LegR','ArmL','ArmR'].map(n=>model.getObjectByName(n));
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name==='Courier shirt'){o.material=o.material.clone();o.material.color.setHex(color);}}});
 g.userData.animate=(time,speed,emote,fishing)=>{rod.visible=!!fishing;const stride=Math.min(.65,speed*.13);for(let i=0;i<4;i++){if(!limbs[i])continue;limbs[i].rotation.x=Math.sin(time*10+(i%2)*Math.PI)*stride*(i<2?1:-.75);limbs[i].rotation.z=0;}g.position.y=0;
  if(fishing){if(limbs[2])limbs[2].rotation.x=-1;if(limbs[3])limbs[3].rotation.x=-1.2;}
  if(emote==='wave'&&limbs[3])limbs[3].rotation.z=-2.7+Math.sin(time*9)*.3;
  if(emote==='cheer'){if(limbs[2])limbs[2].rotation.z=2.5;if(limbs[3])limbs[3].rotation.z=-2.5;g.position.y=Math.abs(Math.sin(time*6))*.15;}
  if(emote==='dance'){if(limbs[2])limbs[2].rotation.z=1+Math.sin(time*6)*.4;if(limbs[3])limbs[3].rotation.z=-1+Math.cos(time*6)*.4;g.position.y=Math.abs(Math.sin(time*6))*.1;}
 };scene.add(g);return g;
}
export function makeAvatar(scene,color){
 if(avatarTemplate)return makeModelAvatar(scene,color);
 const g=new THREE.Group();blob(g,.72,.56);meshBox(g,0,1.24,0,.67,.85,.42,color);meshBox(g,0,1.96,0,.44,.48,.46,0xe8b38b);meshBox(g,0,2.23,-.03,.54,.13,.61,0x314f59);meshBox(g,0,1.4,-.31,.49,.61,.2,0x735d48);
 const legs=[],arms=[];for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.19,.85,0);meshBox(leg,0,-.3,0,.24,.65,.27,0x304e5a);meshBox(leg,0,-.64,.08,.28,.18,.44,0xebdfbe);g.add(leg);legs.push(leg);const arm=new THREE.Group();arm.position.set(s*.43,1.56,0);meshBox(arm,0,-.28,0,.23,.64,.27,color);meshBox(arm,0,-.62,0,.21,.16,.24,0xe8b38b);g.add(arm);arms.push(arm);}
 g.userData.animate=(time,speed,emote)=>{
 legs.forEach((a,i)=>a.rotation.x=Math.sin(time*12+i*Math.PI)*Math.min(.6,speed*.15));
 arms.forEach((a,i)=>{a.rotation.x=-legs[i].rotation.x*.7;a.rotation.z=0;});g.position.y=0;
 if(emote==='wave'){arms[1].rotation.z=-2.5+Math.sin(time*10)*.3;}
 if(emote==='cheer'){arms[0].rotation.z=2.6;arms[1].rotation.z=-2.6;g.position.y=Math.abs(Math.sin(time*7))*.25;}
 if(emote==='dance'){arms[0].rotation.z=1+Math.sin(time*7)*.5;arms[1].rotation.z=-1+Math.cos(time*7)*.5;legs[0].rotation.x=Math.sin(time*7)*.4;legs[1].rotation.x=-legs[0].rotation.x;g.position.y=Math.abs(Math.sin(time*7))*.14;}
 };scene.add(g);return g;
}
export function makeCar(scene){
 const g=new THREE.Group();blob(g,1.65,2.6);meshBox(g,0,.7,0,2.25,.65,4.2,0xd99254);meshBox(g,0,.9,.4,2.17,.35,3.2,0xe8b075);meshBox(g,0,1.37,-.35,1.91,.75,1.9,0x365e6d);meshBox(g,0,1.79,-.35,2,.13,2,0xe8b075);meshBox(g,0,1.39,-.35,2,.79,.12,0xdfa66a);
 meshBox(g,0,.67,2.13,2.26,.2,.15,0xccc6aa);meshBox(g,0,.67,-2.14,2.26,.2,.15,0xccc6aa);meshBox(g,0,.94,2.12,.9,.25,.08,0x294d56);
 const wheels=[];for(const x of [-1.13,1.13])for(const z of [-1.26,1.26]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.25,12),material(0x233c46));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.5,z);g.add(wheel);wheels.push(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.28,8),material(0xb7c4b9));hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);g.add(hub);}
 for(const x of [-.8,.8]){meshBox(g,x,.96,2.12,.46,.28,.07,0xffe6a9);meshBox(g,x,.96,-2.13,.42,.25,.06,0xba5545);meshBox(g,x*1.48,1.28,.35,.28,.15,.37,0xdba16a);}
 g.userData.wheels=wheels;scene.add(g);return g;
}
export function cameraPosition(target,desired){
 // Shorten the camera boom before it passes through a building (slab test).
 let nearest=1;const v=desired.clone().sub(target);
 for(const b of buildings){let enter=0,exit=1;for(const [axis,lo,hi]of [['x',b.x-b.w/2-.4,b.x+b.w/2+.4],['y',.1,b.h+1.6],['z',b.z-b.d/2-.4,b.z+b.d/2+.4]]){if(Math.abs(v[axis])<.0001){if(target[axis]<lo||target[axis]>hi){enter=2;break;}}else{let a=(lo-target[axis])/v[axis],c=(hi-target[axis])/v[axis];if(a>c)[a,c]=[c,a];enter=Math.max(enter,a);exit=Math.min(exit,c);}}if(enter<=exit&&enter>0)nearest=Math.min(nearest,Math.max(.04,enter-.03));}
 return desired.copy(target).addScaledVector(v,nearest);
}

