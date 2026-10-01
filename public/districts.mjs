import * as THREE from '/three.module.js';

// Original street furniture shares the world's instanced batches.
export function dressStreets({box,cyl,label,tree}){
 for(const x of [-12,12])for(const z of [-145,-92,-40,38,92,145]){
  box(x,.40,z,1.7,.65,.6,0x8b7461);box(x,.85,z+.25,1.7,.55,.14,0x8b7461);
  for(const dx of [-.6,.6])box(x+dx,.22,z,.1,.44,.5,0x3d4546);
  cyl(x, .5,z+2.0,.32,1,.32,0x375e57);cyl(x,1.03,z+2,.36,.07,.36,0x4b6d62);
 }
 for(const z of [-138,-80,-22,34,86,142]){
  cyl(11.8,.42,z,.13,.7,.13,0xa9482c);box(11.8,.5,z,.55,.17,.18,0xbe603b);
  box(-11.7,.08,z,1.7,.015,.7,0x5a6464);
  for(let i=0;i<7;i++)box(-12.35+i*.2,.092,z,.055,.02,.68,0x303d42);
 }
 // Stop signs and curb paint make junctions easier to read.
 for(const [x,z]of [[11,10],[-11,-10],[63,10],[-41,62]]){
  cyl(x,1.45,z,.045,2.9,.045,0x727d7c);box(x,2.6,z,.7,.65,.12,0xa14231);
  label('STOP',x,2.61,z+.071,0xffe7cb,.65);
 }
 // Old Town clock landmark, kept on the pedestrian verge.
 box(-113,2.5,0,2.4,5,2.4,0xb69b75);box(-113,5.4,0,3.2,.8,3.2,0x856954);
 label('OLD TOWN',-113,3.8,1.22,0xffddb0,2.2);label('12 : 00',-113,5.4,1.62,0xfbe2b4,2.7);
 // Fishing deck is inside the world boundary; the boats remain scenery.
 box(0,.15,-181,14,.25,6,0x92775c);for(let x=-6;x<=6;x+=.6)box(x,.286,-181,.04,.01,5.9,0x67574b);
 for(const x of [-5,5]){cyl(x,.5,-179,.45,.7,.45,0x456e72);box(x,.95,-182,.1,1.9,.1,0x795943);}
 label('QUAY FISHING',0,3,-184,0xb5ead7,8);for(const x of [-4.4,4.4])box(x,1.5,-184,.1,3,.1,0x726754);
 // Taxi stand and the harbor lookout.
 cyl(11,2,30,.07,4,.07,0x627477);label('TAXI',11,3.9,30,0xffd06e,2.5);
 box(-40,.35,-180,10,.6,4,0xb5a183);label('THE QUAY LOOKOUT',-40,2.8,-184,0xffd5a6,8);
 // A basketball court and palm silhouettes fill the garden blocks.
 box(78,.28,130,24,.04,24,0xa77857);
 for(const side of [-1,1]){box(78+side*11,.31,130,.1,.025,22,0xe0ca9d);box(78,.31,130+side*11,22,.025,.1,0xe0ca9d);}
 box(78,.31,130,22,.025,.12,0xe0ca9d);
 for(const z of [119,141]){cyl(78,1.8,z,.065,3.6,.065,0x515e61);box(78,3.65,z,2.2,1.25,.1,0xd0d4c3);box(78,3.55,z+.1,.75,.5,.03,0x995f3d);}
 // This court is scenery; the festival stage is in the next park block.
 for(const x of [-175,175])for(const z of [-140,-70,0,70,140])tree(x,z,1.25,true);
 label('GARDEN MARKET',130,3.85,79.2,0xf8d194,5.5);
}

export function createAtmosphere(scene){
 const sun=new THREE.Mesh(new THREE.SphereGeometry(16,20,12),new THREE.MeshBasicMaterial({color:0xffd6a1,fog:false}));sun.position.set(-240,95,-540);scene.add(sun);
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'#ffc784bb');g.addColorStop(.3,'#ffb87733');g.addColorStop(1,'#ffb87700');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
 const haze=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),color:0xffd298,transparent:true,depthWrite:false,fog:false}));haze.position.copy(sun.position);haze.scale.set(130,130,1);scene.add(haze);
 // Layered, irregular ridges replace the repeated spherical hills.
 for(let layer=0;layer<2;layer++){
  const vertices=[],z=-740+layer*170;
  const height=x=>40+(1-layer)*48+Math.sin(x*.008+layer)*23+Math.sin(x*.019+2)*13+Math.cos(x*.039)*5;
  for(let x=-1100;x<1100;x+=14){const next=x+14;vertices.push(x,-12,z,next,-12,z,x,height(x),z,next,-12,z,next,height(next),z,x,height(x),z);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const ridge=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:layer?0x879197:0xaba6a5,fog:false,side:THREE.DoubleSide}));scene.add(ridge);
 }
 const cloudMaterial=new THREE.MeshBasicMaterial({color:0xf5cbaa,transparent:true,opacity:.22,depthWrite:false,fog:false});
 for(let i=0;i<12;i++){const cloud=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),cloudMaterial);cloud.position.set(-480+i*85,130+(i%3)*22,-460-(i%2)*120);cloud.scale.set(75,4+(i%2)*2,20);scene.add(cloud);}
}
