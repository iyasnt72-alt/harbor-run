import * as THREE from '/three.module.js';
import {STAR_SPAWNS,RACE_ROUTE,RACE_START} from './activities.mjs';

function glowTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(.35,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);}
export function createFestival(scene){
 const glow=glowTexture(),stars=[];
 const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.42:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();
 const starGeo=new THREE.ExtrudeGeometry(starShape,{depth:.24,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.07,bevelThickness:.07});starGeo.translate(0,0,-.12);
 const starMat=new THREE.MeshStandardMaterial({color:0xffd35c,emissive:0xdd8125,emissiveIntensity:.3,roughness:.28,metalness:.55});
 for(const s of STAR_SPAWNS){const g=new THREE.Group(),m=new THREE.Mesh(starGeo,starMat);g.position.set(s.x,1.8,s.z);g.add(m);const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffcd61,transparent:true,depthWrite:false}));halo.scale.set(4,4,1);g.add(halo);scene.add(g);stars.push(g);}
 const gates=RACE_ROUTE.map((p,i)=>{const g=new THREE.Group();g.position.set(p.x,0,p.z);const mat=new THREE.MeshBasicMaterial({color:0xc69dff,transparent:true,opacity:.85});const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.13,6,32),mat);ring.position.y=3;ring.rotation.y=i%2?Math.PI/2:0;g.add(ring);const floor=new THREE.Mesh(new THREE.RingGeometry(2.7,3,32),mat);floor.rotation.x=-Math.PI/2;floor.position.y=.26;g.add(floor);scene.add(g);return g;});
 // Checkered starting arch and flags; all pieces sit off the running line.
 const matWhite=new THREE.MeshStandardMaterial({color:0xf3e7d2}),matDark=new THREE.MeshStandardMaterial({color:0x254755}),purple=new THREE.MeshStandardMaterial({color:0xa987c4});
 const cube=new THREE.BoxGeometry(1,1,1);function box(x,y,z,w,h,d,mat){const m=new THREE.Mesh(cube,mat);m.position.set(x,y,z);m.scale.set(w,h,d);scene.add(m);return m;}
 for(const side of [-1,1])box(side*7,3.5,52,.45,7,.45,purple);box(0,7,52,14.5,.7,.5,purple);
 for(let i=0;i<14;i++)for(let j=0;j<2;j++)box(i-6.5,.225,51+j*.7,1,.02,.7,(i+j)%2?matDark:matWhite);
 for(const side of [-1,1]){box(side*7,5.8,52+1.1,.08,1.5,2.2,matWhite);for(let i=0;i<3;i++)for(let j=0;j<2;j++)if((i+j)%2===0)box(side*7,5.43+j*.75,51.37+i*.73,.1,.75,.73,matDark);}
 // Festival park: a colorful open-air stage, cafe tables, and hanging lanterns.
 const stage=new THREE.Group();scene.add(stage);box(130,.3,130,14,.6,10,purple);box(130,3.2,134.5,14,5.8,.4,matDark);box(130,6.4,132,15,.5,7,purple);
 for(const x of [123,137])box(x,3.2,129,.2,6,.2,matWhite);
 const lanternColors=[0xeab778,0x85c7bc,0xd49d9f];for(let i=0;i<12;i++){const a=i/12*Math.PI*2,m=new THREE.Mesh(new THREE.SphereGeometry(.48,8,6),new THREE.MeshBasicMaterial({color:lanternColors[i%3]}));m.position.set(130+Math.cos(a)*13,4.5,130+Math.sin(a)*13);scene.add(m);}
 const tableGeo=new THREE.CylinderGeometry(1.4,1.4,.2,12),tableMat=new THREE.MeshStandardMaterial({color:0xe1c6a1});for(const [x,z]of [[119,119],[141,119],[119,141],[141,141]]){const table=new THREE.Mesh(tableGeo,tableMat);table.position.set(x,1.1,z);scene.add(table);box(x,.5,z,.15,1,.15,matDark);}
 // Pooled confetti, one draw call. Reused on collections, finishes and crew goals.
 const particleGeo=new THREE.BufferGeometry(),positions=new Float32Array(120*3),colors=new Float32Array(120*3),velocities=new Float32Array(120*3),life=new Float32Array(120);particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));particleGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const particles=new THREE.Points(particleGeo,new THREE.PointsMaterial({size:.2,vertexColors:true,transparent:true,opacity:.85,depthWrite:false}));particles.frustumCulled=false;scene.add(particles);let cursor=0;
 for(let i=0;i<120;i++)positions[i*3+1]=-100;
 function burst(x,z,count=35){for(let j=0;j<count;j++){const i=cursor++%120,k=i*3,a=j*2.399;positions[k]=x;positions[k+1]=1.5;positions[k+2]=z;velocities[k]=Math.cos(a)*(2+j%3);velocities[k+1]=3+j%5;velocities[k+2]=Math.sin(a)*(2+j%3);life[i]=1.8;const c=new THREE.Color([0xffd075,0x9cded0,0xd6afff,0xf49d88][j%4]);colors[k]=c.r;colors[k+1]=c.g;colors[k+2]=c.b;}particleGeo.attributes.color.needsUpdate=true;}
 let seen=0,initialized=false;
 return {update(state,id,now,time,dt,reducedMotion,quality){
  stars.forEach((g,i)=>{g.visible=!!state&&now>=state.stars[i].readyAt;g.rotation.y=reducedMotion?0:time*.9;g.position.y=1.8+(reducedMotion?0:Math.sin(time*2+i)*.2);});
  const entry=state?.race?.entries.find(e=>e.id===id),active=state?.race?.phase==='running'&&entry?.finished===null;
  gates.forEach((g,i)=>{g.visible=active&&entry.checkpoint===i;g.rotation.y=reducedMotion?0:Math.sin(time)*.02;});
  if(state){if(!initialized){seen=state.events.at(-1)?.id||0;initialized=true;}for(const e of state.events){if(e.id>seen&&!reducedMotion&&quality!=='low'&&['star','finish','party'].includes(e.kind))burst(e.x,e.z,e.kind==='party'?100:e.kind==='finish'?60:15);seen=Math.max(seen,e.id);}}
  else initialized=false;
  for(let i=0;i<120;i++){if(life[i]<=0)continue;life[i]-=dt;const k=i*3;positions[k]+=velocities[k]*dt;positions[k+1]+=velocities[k+1]*dt;positions[k+2]+=velocities[k+2]*dt;velocities[k+1]-=9*dt;if(life[i]<=0)positions[k+1]=-100;}
  particleGeo.attributes.position.needsUpdate=true;particles.visible=!reducedMotion&&quality!=='low';
 }};
}
export function playerTag(name){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='rgba(16,45,57,.88)';c.beginPath();c.roundRect(0,0,256,64,14);c.fill();c.fillStyle='#f3e8ce';c.font='600 26px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(name,128,34,240);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true,transparent:true}));s.scale.set(3.5,.875,1);s.position.y=3.1;return s;}
