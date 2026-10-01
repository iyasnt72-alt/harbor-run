import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
import {GRAPHICS_ASSETS} from '../graphics-assets.mjs';
const port=3100+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
let child;const clients=[];
async function connect(room,name='Test'){
 const ws=new WebSocket(`ws://127.0.0.1:${port}`);const c={ws,messages:[]};clients.push(c);ws.on('message',b=>c.messages.push(JSON.parse(b)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});c.send=m=>ws.send(JSON.stringify(m));c.send({type:'join',room,name});c.wait=async pred=>{for(let n=0;n<80;n++){const m=c.messages.find(pred);if(m)return m;await delay(25);}throw new Error('Timed out waiting for message');};c.id=(await c.wait(m=>m.type==='welcome')).id;return c;
}
test('real server: rooms, movement, car, communication, activities, assets and cleanup',async()=>{
 child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1'},stdio:'pipe'});
 try{
 for(let n=0;n<100;n++){try{if((await fetch(base+'/health')).ok)break;}catch{}await delay(30);}
 for(const url of ['/','/game.mjs','/scenery.mjs','/festival.mjs','/activities.mjs','/jobs.mjs','/districts.mjs','/assets/courier.glb','/assets/garden-kiosk.glb','/vendor/GLTFLoader.js','/vendor/BufferGeometryUtils.js','/style.css','/three.module.js','/three.core.js','/config'])assert.equal((await fetch(base+url)).status,200,url);
 for(const [url,mime]of [['/assets/quay-coupe.glb','model/gltf-binary'],['/assets/asphalt_03_diff.jpg','image/jpeg'],['/assets/red_brick_nor_gl.jpg','image/jpeg']]){const res=await fetch(base+url);assert.equal(res.status,200,url);assert.ok(res.headers.get('content-type').startsWith(mime));assert.ok((await res.arrayBuffer()).byteLength>10000);}
 assert.equal((await fetch(base+'/server.mjs')).status,404);
 // Every postprocessing dependency and texture must be served from the same origin.
 for(const asset of GRAPHICS_ASSETS){const response=await fetch(base+'/'+asset);assert.equal(response.status,200,asset);assert.ok((await response.arrayBuffer()).byteLength>0,asset);}
 for(const url of ['/vehicles.mjs','/car-audio.mjs','/car-visuals.mjs','/assets/comet-sport.glb','/assets/sunbeam-taxi.glb','/assets/coast-suv.glb','/assets/palm-roadster.glb','/assets/old-town-hatch.glb','/assets/mariner-van.glb','/assets/harbor-wagon.glb'])assert.equal((await fetch(base+url)).status,200,url);
 const a=await connect('integration','Alice'),b=await connect('integration','Bob'),c=await connect('separate','Other');
 await a.wait(m=>m.type==='state'&&m.players.length===2);await c.wait(m=>m.type==='state'&&m.players.length===1);
 a.send({type:'input',f:1,t:0});const moved=await b.wait(m=>m.type==='state'&&m.players.find(p=>p.id===a.id)?.z<14);assert.ok(moved);
 a.send({type:'chat',text:'hello shared city'});await b.wait(m=>m.type==='chat'&&m.text==='hello shared city');await delay(100);assert.equal(c.messages.some(m=>m.type==='chat'),false);
 b.send({type:'block',id:a.id,blocked:true});await a.wait(m=>m.type==='peerReset'&&m.blocked);await delay(750);a.send({type:'chat',text:'blocked message'});a.send({type:'voice',enabled:true});b.send({type:'voice',enabled:true});a.send({type:'signal',to:b.id,data:{description:{type:'offer',sdp:'test'}}});await delay(150);assert.equal(b.messages.some(m=>m.text==='blocked message'||m.type==='signal'),false);
 b.send({type:'block',id:a.id,blocked:false});await a.wait(m=>m.type==='peerReset'&&!m.blocked);a.send({type:'signal',to:b.id,data:{description:{type:'offer',sdp:'test allowed'}}});await b.wait(m=>m.type==='signal'&&m.from===a.id);a.send({type:'signal',to:c.id,data:{candidate:{candidate:'private'}}});await delay(100);assert.equal(c.messages.some(m=>m.type==='signal'),false);
 // Room capacity is enforced by the real server, and invalid JSON is ignored.
 for(let n=0;n<7;n++)await connect('separate','Capacity '+n);
 const extra=new WebSocket(`ws://127.0.0.1:${port}`);
 await new Promise((resolve,reject)=>{extra.once('open',()=>extra.send(JSON.stringify({type:'join',room:'separate'})));extra.once('error',reject);extra.once('close',(code)=>{assert.equal(code,1013);resolve();});});
 a.ws.send('{invalid json');a.send({type:'input',f:'not a number',t:0});assert.equal((await fetch(base+'/health')).status,200);
 // Walk Bob one metre toward the car, acquire it, then disconnect.
 b.send({type:'input',t:1});await delay(250);b.send({type:'input',t:0});b.send({type:'act',action:'car'});await a.wait(m=>m.type==='state'&&m.cars[0].driver===b.id);b.ws.close();await a.wait(m=>m.type==='state'&&m.cars[0].driver===null&&m.players.length===1);
 // Two clients receive the same race and emotes; scores and progress cannot be supplied by clients.
 const d=await connect('integration','Dara');a.send({type:'input',f:0,t:0});a.send({type:'act',action:'race',score:999999,checkpoint:4});
 await d.wait(m=>m.type==='state'&&m.race?.entries.some(e=>e.id===a.id));d.send({type:'act',action:'race'});
 const race=await a.wait(m=>m.type==='state'&&m.race?.entries.length===2);assert.equal(race.race.phase,'countdown');assert.equal(race.players.find(p=>p.id===a.id).score,0);assert.equal(race.race.entries[0].checkpoint,0);
 await delay(320);a.send({type:'act',action:'dance'});await d.wait(m=>m.type==='state'&&m.players.find(p=>p.id===a.id)?.emote?.name==='dance');
 assert.equal(c.messages.some(m=>m.type==='state'&&m.race),false);
 await delay(320);a.send({type:'act',action:'race'});await d.wait(m=>m.type==='state'&&m.race?.entries.length===1&&m.race.entries[0].id===d.id);
 d.ws.close();await a.wait(m=>m.type==='state'&&m.race===null&&m.players.length===1);
 const e=await connect('integration','Erin');await delay(320);a.send({type:'act',action:'trail',step:3,score:99999});
 const job=await e.wait(m=>m.type==='state'&&m.players.find(p=>p.id===a.id)?.job?.kind==='trail');assert.equal(job.players.find(p=>p.id===a.id).job.step,0);assert.equal(job.players.find(p=>p.id===a.id).score,0);
 await delay(320);a.send({type:'act',action:'jobUse'});await a.wait(m=>m.type==='notice'&&m.text.includes('Get closer'));assert.equal(c.messages.some(m=>m.type==='state'&&m.players.some(p=>p.job)),false);
 await delay(320);a.send({type:'act',action:'jobCancel'});await a.wait(m=>m.type==='notice'&&m.text==='City activity cancelled.');
 // Real clients drive two cars at the same time; disconnect frees only that driver's car.
 const f=await connect('fleet','Fleet A'),g=await connect('fleet','Fleet B');f.send({type:'act',action:'car',carId:'trail'});await f.wait(m=>m.type==='state'&&m.cars[0].driver===f.id);g.send({type:'act',action:'car'});
 await f.wait(m=>m.type==='state'&&m.cars[1].driver===g.id);f.send({type:'input',f:1});g.send({type:'input',f:-1});
 const driving=await g.wait(m=>m.type==='state'&&m.cars[0].z<14.8&&m.cars[1].z>15.2);assert.equal(driving.cars.length,8);assert.equal(driving.cars[2].driver,null);
 f.ws.close();await g.wait(m=>m.type==='state'&&m.cars[0].driver===null&&m.cars[1].driver===g.id);
 }finally{for(const c of clients)c.ws.terminate();child.kill();}
});


