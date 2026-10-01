import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {makeRoom,makePlayer,tick,snapshot,interact,vehicle} from './public/world.mjs';
import {raceAction,emoteAction} from './public/activities.mjs';
import {startJob,cancelJob,useJob} from './public/jobs.mjs';
import {releaseVehicle,VEHICLES} from './public/vehicles.mjs';
import {GRAPHICS_ASSETS} from './graphics-assets.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const rooms=new Map(), clients=new Map();
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<256000)ws.send(JSON.stringify(obj));};
const clean=(v,n)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,n);
const iceServers=process.env.ICE_SERVERS_JSON?JSON.parse(process.env.ICE_SERVERS_JSON):[{urls:'stun:stun.l.google.com:19302'}];
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
 if(pathname==='/config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({iceServers}));return;}
 const files={'/':'public/index.html','/style.css':'public/style.css','/game.mjs':'public/game.mjs','/scenery.mjs':'public/scenery.mjs','/activities.mjs':'public/activities.mjs','/festival.mjs':'public/festival.mjs','/jobs.mjs':'public/jobs.mjs','/vehicles.mjs':'public/vehicles.mjs','/car-audio.mjs':'public/car-audio.mjs','/car-visuals.mjs':'public/car-visuals.mjs','/districts.mjs':'public/districts.mjs','/assets/courier.glb':'public/assets/courier.glb','/assets/garden-kiosk.glb':'public/assets/garden-kiosk.glb','/vendor/GLTFLoader.js':'public/vendor/GLTFLoader.js','/vendor/BufferGeometryUtils.js':'public/vendor/BufferGeometryUtils.js','/assets/quay-coupe.glb':'public/assets/quay-coupe.glb','/assets/asphalt_03_diff.jpg':'public/assets/asphalt_03_diff.jpg','/assets/asphalt_03_nor_gl.jpg':'public/assets/asphalt_03_nor_gl.jpg','/assets/red_brick_diff.jpg':'public/assets/red_brick_diff.jpg','/assets/red_brick_nor_gl.jpg':'public/assets/red_brick_nor_gl.jpg','/world.mjs':'public/world.mjs','/three.module.js':'node_modules/three/build/three.module.js','/three.core.js':'node_modules/three/build/three.core.js'};
 for(const car of VEHICLES)files['/assets/'+car.asset+'.glb']='public/assets/'+car.asset+'.glb';
 for(const asset of GRAPHICS_ASSETS)files['/'+asset]='public/'+asset;
 if(!files[pathname]){res.writeHead(404);res.end('Not found');return;}
 try{const data=await readFile(path.join(root,files[pathname]));res.writeHead(200,{'Content-Type':pathname.endsWith('.glb')?'model/gltf-binary':pathname.endsWith('.hdr')?'image/vnd.radiance':pathname.endsWith('.jpg')?'image/jpeg':pathname.endsWith('.css')?'text/css':pathname==='/'?'text/html':'text/javascript','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Permissions-Policy':'microphone=(self)','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(data);}catch{res.writeHead(500);res.end('Install dependencies before starting.');}
});
const wss=new WebSocketServer({server,maxPayload:16384});
wss.on('connection',(ws,req)=>{
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host){ws.close(1008,'Origin rejected');return;}}catch{ws.close(1008);return;}}
 if(clients.size>=128){ws.close(1013,'Server full');return;}
 const id=randomUUID();let room,p,roomCode;let tokens=100,last=Date.now();
 const joinTimer=setTimeout(()=>ws.close(1008,'Join required'),10000);
 ws.alive=true;ws.on('pong',()=>ws.alive=true);
 ws.on('message',raw=>{
 const now=Date.now();tokens=Math.min(100,tokens+(now-last)*0.06);last=now;if(tokens<1){ws.close(1008,'Rate limit');return;}tokens--;
 let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;
 if(!p){
 if(m.type!=='join')return;
 roomCode=clean(m.room,24).toLowerCase().replace(/[^a-z0-9-]/g,'')||'harbor';
 if(!rooms.has(roomCode)){if(rooms.size>=32){ws.close(1013,'Too many rooms');return;}rooms.set(roomCode,makeRoom());}
 room=rooms.get(roomCode);if(room.players.size>=8){ws.close(1013,'Room full (8 players)');return;}
 p=makePlayer(id,clean(m.name,18)||'Courier');room.players.set(id,p);clients.set(id,{ws,p,room});clearTimeout(joinTimer);
 send(ws,{type:'welcome',id,room:roomCode});send(ws,snapshot(room));return;
 }
 if(m.type==='input'){
 p.input={f:Math.max(-1,Math.min(1,Number(m.f)||0)),t:Math.max(-1,Math.min(1,Number(m.t)||0)),run:!!m.run,brake:!!m.brake};p.inputAt=now;
 }else if(m.type==='act'){
 if(now-(p.actionAt||0)<300)return;p.actionAt=now;
 const actions={taxi:()=>startJob(room,p,'taxi',now),fishing:()=>startJob(room,p,'fishing',now),trail:()=>startJob(room,p,'trail',now),jobUse:()=>useJob(room,p,now),jobCancel:()=>cancelJob(room,p),car:()=>vehicle(room,p),mission:()=>interact(room,p),race:()=>raceAction(room,p,now),wave:()=>emoteAction(room,p,'wave',now),dance:()=>emoteAction(room,p,'dance',now),cheer:()=>emoteAction(room,p,'cheer',now)};
 if(Object.hasOwn(actions,m.action))send(ws,{type:'notice',text:actions[m.action]()});
 }else if(m.type==='chat'){
 if(now-(p.chatAt||0)<700)return;p.chatAt=now;const text=clean(m.text,240);if(!text)return;
 for(const q of room.players.values())if(!q.blocked.has(id)&&!p.blocked.has(q.id))send(clients.get(q.id).ws,{type:'chat',id,name:p.name,text});
 }else if(m.type==='block'){
 if(typeof m.id!=='string'||m.id===id)return;
 if(m.blocked&&p.blocked.size<128)p.blocked.add(m.id);else if(!m.blocked)p.blocked.delete(m.id);
 const target=clients.get(m.id);if(target?.room===room)send(target.ws,{type:'peerReset',id,blocked:!!m.blocked});
 }else if(m.type==='voice'){
 p.voice=!!m.enabled;
 }else if(m.type==='signal'){
 const target=clients.get(m.to);
 if(target?.room===room&&p.voice&&target.p.voice&&!p.blocked.has(m.to)&&!target.p.blocked.has(id)&&m.data&&JSON.stringify(m.data).length<12000)send(target.ws,{type:'signal',from:id,data:m.data});
 }
 });
 ws.on('error',()=>{});
 ws.on('close',()=>{clearTimeout(joinTimer);clients.delete(id);if(room){room.players.delete(id);releaseVehicle(room,id);if(!room.players.size)rooms.delete(roomCode);}});
});
const simulation=setInterval(()=>{for(const room of rooms.values()){tick(room,0.05);const state=snapshot(room);for(const p of room.players.values())send(clients.get(p.id).ws,state);}},50);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},15000);
server.listen(Number(process.env.PORT)||3000,process.env.HOST||'0.0.0.0',()=>console.log('Harbor Run listening on port '+(Number(process.env.PORT)||3000)));
function stop(){clearInterval(simulation);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();server.close(()=>process.exit(0));}
process.on('SIGTERM',stop);process.on('SIGINT',stop);

