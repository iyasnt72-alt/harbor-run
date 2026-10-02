import * as THREE from '/three.module.js';
import {buildings,roads,parks,LIMIT,DEPOT,DROP,distance,districtAt} from './world.mjs';
import {createWorld,makeAvatar,makeCar,cameraPosition,setAvatarTemplate} from './scenery.mjs';
import {createFestival,playerTag} from './festival.mjs';
import {RACE_ROUTE} from './activities.mjs';
import {CarAudio,ENGINE_PROFILES} from './car-audio.mjs';
import {setupReflections,dressCar,updateCar} from './car-visuals.mjs';
import {VEHICLES,drivenCar} from './vehicles.mjs';
import {jobTarget,FISHING_SPOT,TRAIL} from './jobs.mjs';
import {createGraphics} from './graphics.mjs';
import {GLTFLoader} from '/vendor/GLTFLoader.js';
const $=id=>document.getElementById(id),canvas=$('game');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}catch(e){$('joinError').textContent='This device needs WebGL 2 enabled to play.';throw e;}
const phone=matchMedia('(pointer:coarse)').matches;
// Start existing and new players on the lighter preset once. Later choices persist.
const graphicsPreference='harbor-graphics-v2';
let quality='low';
try{const saved=localStorage.getItem(graphicsPreference);if(['auto','low','high'].includes(saved))quality=saved;}catch{}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function applyQuality(){
 // Cap the 3D buffer independently of the crisp HTML interface, including on 4K screens.
 const maxEdge=quality==='low'?960:quality==='auto'?1280:1920;
 renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.5:1,maxEdge/Math.max(innerWidth,innerHeight)));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=quality==='high';
 const shadowSize=1024;
 if(sun.shadow.mapSize.x!==shadowSize){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(shadowSize,shadowSize);}
 if(!renderer.shadowMap.enabled&&sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
 world.setShadows(renderer.shadowMap.enabled);world.setQuality(quality);reflections.configure(quality);graphics.configure(quality,phone,innerWidth,innerHeight);
 $('quality').textContent='Graphics: '+quality[0].toUpperCase()+quality.slice(1);
 $('quality').setAttribute('aria-label','Graphics: '+quality+'. Change quality');
 try{localStorage.setItem(graphicsPreference,quality);}catch{}
}
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc9b9ad);scene.fog=new THREE.Fog(0xc9b9ad,100,480);
const reflections=setupReflections(renderer,scene);
const camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.1,1000);
scene.add(new THREE.HemisphereLight(0xaecae3,0x756557,1.25));scene.add(new THREE.AmbientLight(0xbfd0df,.22));const sun=new THREE.DirectionalLight(0xffd2a6,3.15);sun.position.set(-75,95,-45);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:280});sun.shadow.bias=-.0006;sun.shadow.normalBias=.055;sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target);
const world=createWorld(scene),festival=createFestival(scene),graphics=createGraphics(renderer,scene,camera);
function beacon(pos,color){const g=new THREE.Group();g.position.set(pos.x,0,pos.z);scene.add(g);const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.1,6,40),new THREE.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.y=.34;g.add(ring);const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.8),new THREE.MeshBasicMaterial({color}));diamond.position.y=4;g.add(diamond);return {g,diamond};}
const depot=beacon(DEPOT,0xffcb70),drop=beacon(DROP,0x87edff);
const avatar=color=>makeAvatar(scene,color),cars=new Map();
for(const definition of VEHICLES){
 const car=makeCar(scene);car.position.set(definition.x,0,definition.z);car.rotation.y=definition.a;cars.set(definition.id,car);
 new GLTFLoader().load('/assets/'+definition.asset+'.glb',gltf=>{const shadow=car.children[0];car.clear();gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});car.add(shadow,gltf.scene);dressCar(car,gltf.scene);},undefined,()=>console.warn(definition.name+' model unavailable; using fallback.'));
}
applyQuality();$('quality').onclick=()=>{quality=quality==='low'?'auto':quality==='auto'?'high':'low';applyQuality();};
new GLTFLoader().load('/assets/courier.glb',gltf=>{setAvatarTemplate(gltf.scene);for(const a of actors.values())scene.remove(a);actors.clear();if(state)syncState();},undefined,()=>console.warn('Using the original courier model.'));
new GLTFLoader().load('/assets/garden-kiosk.glb',gltf=>{for(const [x,z]of [[130,78],[88,143]]){const kiosk=gltf.scene.clone(true);kiosk.position.set(x,.25,z);kiosk.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(kiosk);}},undefined,()=>console.warn('Garden kiosk unavailable.'));
const jobMarker=beacon({x:0,z:0},0x64eee1);jobMarker.g.visible=false;
const actors=new Map(),keys=new Set(),blocked=new Set(),remoteBlocked=new Set(),mutedPeers=new Set();let serverOffset=0,touchRun=false,lastActivityMarkup='',state=null,id=null,ws=null,joined=false,camYaw=0,camDist=10.5,touchF=0,touchT=0,brake=false,lastRoster='',stream=null,micMuted=false,voiceBusy=false,iceServers=[],peers=new Map(),toastTimer;
const carAudio=new CarAudio({onStatus:status=>{
 $('carSound').textContent=status==='on'?'Car sound: on':status==='off'?'Car sound: off':status==='unavailable'?'Car sound unavailable':'Start car sound';
 $('carSound').setAttribute('aria-pressed',String(carAudio.enabled));
}});
try{carAudio.enabled=localStorage.getItem('harbor-car-sound')!=='off';const stored=localStorage.getItem('harbor-car-volume');if(stored!==null)carAudio.setVolume(Number(stored));}catch{}
$('carVolume').value=Math.round(carAudio.volume*100);$('carVolumeValue').textContent=$('carVolume').value+'%';
$('carSound').textContent=carAudio.enabled?'Car sound: on':'Car sound: off';$('carSound').setAttribute('aria-pressed',String(carAudio.enabled));
function saveSound(){try{localStorage.setItem('harbor-car-sound',carAudio.enabled?'on':'off');localStorage.setItem('harbor-car-volume',String(carAudio.volume));}catch{}}
$('carSound').onclick=async()=>{if(carAudio.enabled&&carAudio.ctx?.state==='running')carAudio.setEnabled(false);else{carAudio.setEnabled(true);await carAudio.activate();}saveSound();};
$('carVolume').oninput=()=>{carAudio.setVolume(Number($('carVolume').value)/100);$('carVolumeValue').textContent=$('carVolume').value+'%';saveSound();};
let previewMessageTimer;
for(const definition of VEHICLES){const profile=ENGINE_PROFILES[definition.id],button=document.createElement('button');button.type='button';button.textContent=definition.name;const description=document.createElement('small');description.textContent=profile.label;button.append(description);button.setAttribute('aria-label','Preview '+definition.name+' — '+profile.label);button.onclick=async()=>{
 if(!await carAudio.previewEngine(definition.id)){$('enginePreviewStatus').textContent=carAudio.enabled?'Audio is unavailable in this browser.':'Turn on car sound to preview.';return;}
 clearTimeout(previewMessageTimer);$('enginePreviewStatus').textContent='Playing '+definition.name+' · '+profile.label;
 previewMessageTimer=setTimeout(()=>{$('enginePreviewStatus').textContent='Choose a car to hear its engine.';},2900);
};$('enginePreviews').append(button);}
const headBeam=new THREE.SpotLight(0xffdba8,22,22,.48,.75,1.3);headBeam.visible=false;scene.add(headBeam,headBeam.target);
const notice=text=>{$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800);};
const send=m=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));};
function clearInput(){keys.clear();touchF=touchT=0;brake=false;$('knob').style.transform='';send({type:'input',f:0,t:0});}
function chatMessage(m){if(blocked.has(m.id))return;const p=document.createElement('p'),b=document.createElement('b');b.textContent=m.name+': ';p.dataset.sender=m.id;p.append(b,document.createTextNode(m.text));$('messages').append(p);while($('messages').children.length>80)$('messages').firstChild.remove();$('messages').scrollTop=$('messages').scrollHeight;}
$('room').value=new URL(location.href).searchParams.get('room')||'harbor';
$('joinForm').onsubmit=e=>{e.preventDefault();carAudio.activate();if(ws&&ws.readyState<2)return;$('join').disabled=true;$('joinError').textContent='Connecting…';ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
 ws.onopen=()=>send({type:'join',name:$('name').value,room:$('room').value});
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}
 if(m.type==='welcome'){id=m.id;joined=true;$('welcome').classList.add('hidden');$('status').textContent=m.room.toUpperCase();$('led').classList.add('online');history.replaceState(null,'','?room='+encodeURIComponent(m.room));notice('Welcome to South Quay. Find the gold depot to begin.');}
 if(m.type==='state'){state=m;serverOffset=m.now-Date.now();syncState();}
 if(m.type==='notice')notice(m.text);
 if(m.type==='chat')chatMessage(m);
 if(m.type==='signal')handleSignal(m).catch(()=>notice('Voice connection failed. Try toggling microphone.'));
 if(m.type==='peerReset'){if(m.blocked)remoteBlocked.add(m.id);else remoteBlocked.delete(m.id);closePeer(m.id);}
 };
 ws.onerror=()=>{$('joinError').textContent='Could not connect to the game server.';};
 ws.onclose=e=>{joined=false;id=null;state=null;carAudio.pause();stopVoice();clearInput();$('status').textContent='OFFLINE';$('led').classList.remove('online');$('join').disabled=false;$('welcome').classList.remove('hidden');$('joinError').textContent=e.reason||'Disconnected. Enter the city to reconnect.';blocked.clear();remoteBlocked.clear();mutedPeers.clear();$('messages').replaceChildren();for(const a of actors.values())scene.remove(a);actors.clear();lastRoster='';};
};
function syncState(){
 const present=new Set(state.players.map(p=>p.id));for(const [pid,a]of actors)if(!present.has(pid)){scene.remove(a);actors.delete(pid);closePeer(pid);}
 for(const p of state.players){if(!actors.has(p.id)){const a=avatar(p.id===id?0xf2c77d:0x72bfd0);a.position.set(p.x,0,p.z);if(p.id!==id)a.add(playerTag(p.name));actors.set(p.id,a);}actors.get(p.id).visible=!drivenCar(state,p.id);if(!p.voice)closePeer(p.id);}
 const me=state.players.find(p=>p.id===id);if(!me)return;
 $('count').textContent=state.players.length+'/8';const myCar=drivenCar(state,id),driving=!!myCar;
 $('mode').textContent=driving?'BEHIND THE WHEEL':'ON FOOT';$('speed').textContent=driving?Math.round(Math.abs(myCar.speed)*3.6)+' KM/H · '+myCar.name.toUpperCase():districtAt(me.x,me.z)+' · Free roam';
 $('objective').textContent=me.mission?'Next stop: the harbor':'Your first harbor run';$('missionText').textContent=me.mission?'Bring the parcel to the blue beacon. Press F or DELIVER nearby.':'Collect a parcel at the gold beacon. Press F or DELIVER nearby.';
 $('distance').textContent=(me.mission?'HARBOR':'DEPOT')+' · '+Math.round(distance(me,me.mission?DROP:DEPOT))+' M';$('deliveries').textContent=me.deliveries+' DELIVERED';
 $('district').textContent=districtAt(me.x,me.z).toUpperCase();
 const roster=JSON.stringify(state.players.map(p=>[p.id,p.name,p.voice]));if(roster!==lastRoster){lastRoster=roster;renderRoster();}syncVoice();syncActivities(me);syncJob(me);syncGarage(me);
}
function renderRoster(){if(!state)return;$('players').replaceChildren();for(const p of state.players){const row=document.createElement('div');row.className='player';const label=document.createElement('span');label.textContent=p.name+(p.id===id?' (you)':'')+(p.voice?' · voice':'');row.append(label);if(p.id!==id){const mute=document.createElement('button');mute.textContent=mutedPeers.has(p.id)?'Unmute':'Mute';mute.onclick=()=>{mutedPeers.has(p.id)?mutedPeers.delete(p.id):mutedPeers.add(p.id);const peer=peers.get(p.id);if(peer?.audio)peer.audio.muted=mutedPeers.has(p.id);renderRoster();};const block=document.createElement('button');block.textContent=blocked.has(p.id)?'Unblock':'Block';block.onclick=()=>{const on=!blocked.has(p.id);on?blocked.add(p.id):blocked.delete(p.id);send({type:'block',id:p.id,blocked:on});closePeer(p.id);for(const el of $('messages').children)if(el.dataset.sender===p.id)el.hidden=on;renderRoster();};row.append(mute,block);}$('players').append(row);}}
$('peopleBtn').onclick=()=>{setActivities(false);const hidden=$('social').classList.toggle('hidden');$('peopleBtn').setAttribute('aria-expanded',String(!hidden));clearInput();};$('closeSocial').onclick=()=>{$('social').classList.add('hidden');$('peopleBtn').setAttribute('aria-expanded','false');$('peopleBtn').focus();};
$('chatForm').onsubmit=e=>{e.preventDefault();if(!joined)return;send({type:'chat',text:$('chatInput').value});$('chatInput').value='';$('chatInput').blur();};
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'){$('social').classList.add('hidden');$('peopleBtn').setAttribute('aria-expanded','false');$('activities').classList.add('hidden');$('activitiesBtn').setAttribute('aria-expanded','false');$('mapWrap').classList.remove('expanded');$('mapToggle').setAttribute('aria-expanded','false');clearInput();return;}
 if(joined)carAudio.activate();
 if(e.target instanceof HTMLInputElement)return;
 // Preserve native Enter/Space activation for accessible menu buttons.
 if(e.target instanceof HTMLButtonElement&&['Enter','Space'].includes(e.code))return;
 if(e.target.closest?.('#social, #activities'))return;
 if(e.code==='Enter'&&joined){e.preventDefault();setActivities(false);$('social').classList.remove('hidden');$('peopleBtn').setAttribute('aria-expanded','true');$('chatInput').focus();clearInput();return;}
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.repeat||!joined)return;
 if(['Digit1','Digit2','Digit3'].includes(e.code))send({type:'act',action:['wave','dance','cheer'][Number(e.code.slice(-1))-1]});if(e.code==='KeyQ')send({type:'act',action:'jobUse'});if(e.code==='KeyM')toggleMap();if(e.code==='KeyE')send({type:'act',action:'car'});if(e.code==='KeyF')send({type:'act',action:'mission'});
 });window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();carAudio.pause();}else if(joined)carAudio.activate();});window.addEventListener('pagehide',()=>carAudio.dispose());$('chatInput').onfocus=clearInput;
setInterval(()=>{if(!joined)return;send({type:'input',f:touchF||((keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)),t:touchT||((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)),run:touchRun||keys.has('ShiftLeft')||keys.has('ShiftRight'),brake:brake||keys.has('Space')});},50);
let stickPointer=null;function stickMove(e){if(e.pointerId!==stickPointer)return;const r=$('stick').getBoundingClientRect();let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const n=Math.max(40,Math.hypot(x,y));x=x/n*40;y=y/n*40;touchT=x/40;touchF=-y/40;$('knob').style.transform=`translate(${x}px,${y}px)`;}
$('stick').onpointerdown=e=>{stickPointer=e.pointerId;$('stick').setPointerCapture(e.pointerId);stickMove(e);};$('stick').onpointermove=stickMove;for(const event of ['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(event,()=>{stickPointer=null;touchF=touchT=0;$('knob').style.transform='';});$('touchRun').onclick=()=>{touchRun=!touchRun;$('touchRun').setAttribute('aria-pressed',String(touchRun));$('touchRun').textContent=touchRun?'RUN ON':'RUN';};$('touchCar').onclick=()=>send({type:'act',action:'car'});$('touchAct').onclick=()=>send({type:'act',action:'mission'});$('touchBrake').onpointerdown=e=>{brake=true;e.target.setPointerCapture(e.pointerId);};for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('touchBrake').addEventListener(ev,()=>brake=false);
let orbit=null;canvas.onpointerdown=e=>{orbit={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(orbit?.id===e.pointerId){camYaw-=(e.clientX-orbit.x)*.006;orbit.x=e.clientX;}};canvas.onpointerup=canvas.onpointercancel=()=>orbit=null;canvas.onwheel=e=>{e.preventDefault();camDist=Math.max(7,Math.min(38,camDist+e.deltaY*.025));};
function closePeer(pid){const peer=peers.get(pid);if(peer){peer.pc.close();peer.audio?.remove();peers.delete(pid);}}
function stopVoice(){stream?.getTracks().forEach(t=>t.stop());stream=null;for(const pid of [...peers.keys()])closePeer(pid);send({type:'voice',enabled:false});$('voice').textContent='Enable microphone';$('mute').disabled=true;$('voiceStatus').textContent='Voice off · microphone is opt-in.';}
$('voice').onclick=async()=>{if(voiceBusy)return;if(stream){stopVoice();return;}if(!joined){notice('Enter the city first.');return;}voiceBusy=true;try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone needs HTTPS or localhost.');const config=await fetch('/config').then(r=>r.json());iceServers=config.iceServers;const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(!joined){media.getTracks().forEach(t=>t.stop());return;}stream=media;micMuted=false;send({type:'voice',enabled:true});$('voice').textContent='Disable microphone';$('mute').disabled=false;$('mute').textContent='Mute mic';$('voiceStatus').textContent='Voice enabled · connecting to your crew…';}catch(e){notice(e.message||'Microphone permission was denied.');}finally{voiceBusy=false;}};
$('mute').onclick=()=>{if(!stream)return;micMuted=!micMuted;stream.getAudioTracks().forEach(t=>t.enabled=!micMuted);$('mute').textContent=micMuted?'Unmute mic':'Mute mic';};
function makePeer(pid){if(peers.has(pid))return peers.get(pid);const pc=new RTCPeerConnection({iceServers}),peer={pc,pending:[],chain:Promise.resolve(),audio:null};peers.set(pid,peer);for(const t of stream.getTracks())pc.addTrack(t,stream);pc.onicecandidate=e=>{if(e.candidate)send({type:'signal',to:pid,data:{candidate:e.candidate}});};pc.ontrack=e=>{if(peer.audio)return;const audio=document.createElement('audio');audio.autoplay=true;audio.srcObject=e.streams[0];audio.muted=mutedPeers.has(pid);document.body.append(audio);peer.audio=audio;audio.play().catch(()=>notice('Tap anywhere to hear voice.'));};pc.onconnectionstatechange=()=>{const connected=[...peers.values()].filter(p=>p.pc.connectionState==='connected').length;$('voiceStatus').textContent=`Voice · ${connected} connected${pc.connectionState==='failed'?' · connection failed; TURN may be needed':''}`;};return peer;}
function syncVoice(){if(!stream||!state)return;for(const p of state.players){if(p.id===id||!p.voice||blocked.has(p.id)||remoteBlocked.has(p.id)||peers.has(p.id)||id>p.id)continue;const peer=makePeer(p.id);peer.chain=peer.chain.then(async()=>{await peer.pc.setLocalDescription(await peer.pc.createOffer());send({type:'signal',to:p.id,data:{description:peer.pc.localDescription}});}).catch(()=>closePeer(p.id));}}
async function handleSignal(m){if(!stream||blocked.has(m.from)||remoteBlocked.has(m.from))return;const peer=makePeer(m.from);peer.chain=peer.chain.then(async()=>{if(m.data.description){await peer.pc.setRemoteDescription(m.data.description);for(const c of peer.pending)await peer.pc.addIceCandidate(c);peer.pending=[];if(m.data.description.type==='offer'){await peer.pc.setLocalDescription(await peer.pc.createAnswer());send({type:'signal',to:m.from,data:{description:peer.pc.localDescription}});}}else if(m.data.candidate){if(peer.pc.remoteDescription)await peer.pc.addIceCandidate(m.data.candidate);else peer.pending.push(m.data.candidate);}});await peer.chain;}
// Any deliberate tap also resumes audio on browsers requiring a fresh user gesture.
document.addEventListener('pointerdown',()=>{if(joined)carAudio.activate();for(const p of peers.values())p.audio?.play().catch(()=>{});});
const map=$('map').getContext('2d');
function toggleMap(){const on=$('mapWrap').classList.toggle('expanded');$('mapToggle').setAttribute('aria-expanded',String(on));}
$('mapToggle').onclick=toggleMap;
function drawMap(){
 const size=400,scale=360/(LIMIT*2),at=v=>200+v*scale;
 map.fillStyle='#173c49';map.fillRect(0,0,size,size);map.fillStyle='#678d86';map.fillRect(20,20,360,360);
 for(const p of parks){map.fillStyle='#8bae77';map.fillRect(at(p.x-p.w/2),at(p.z-p.d/2),p.w*scale,p.d*scale);}
 map.fillStyle='#3d5a62';for(const r of roads){map.fillRect(at(r-7),20,14*scale,360);map.fillRect(20,at(r-7),360,14*scale);}
 for(const b of buildings){map.fillStyle=b.district==='Mariner Quarter'?'#a8bdb4':'#bfbaa1';map.fillRect(at(b.x-b.w/2),at(b.z-b.d/2),b.w*scale,b.d*scale);}
 const me=state?.players.find(p=>p.id===id);if(me?.mission){map.setLineDash([5,5]);map.strokeStyle='#74d4df';map.lineWidth=2;map.beginPath();map.moveTo(at(me.x),at(me.z));map.lineTo(at(DROP.x),at(DROP.z));map.stroke();map.setLineDash([]);}
 for(const star of state?.stars||[]){if(star.readyAt>(Date.now()+serverOffset))continue;map.fillStyle='#ffe193';map.fillRect(at(star.x)-2,at(star.z)-2,4,4);}
 if(me?.job){const goal=jobTarget(me.job);map.strokeStyle='#6ffff0';map.lineWidth=2;map.setLineDash([4,4]);map.beginPath();map.moveTo(at(me.x),at(me.z));map.lineTo(at(goal.x),at(goal.z));map.stroke();map.setLineDash([]);map.fillStyle='#6ffff0';map.beginPath();map.arc(at(goal.x),at(goal.z),6,0,Math.PI*2);map.fill();}map.fillStyle='#6ffff0';map.font='bold 15px system-ui';map.fillText('F',at(FISHING_SPOT.x),at(FISHING_SPOT.z));
 const racer=state?.race?.entries.find(e=>e.id===id);if(state?.race?.phase==='running'&&racer?.finished===null){const cp=RACE_ROUTE[racer.checkpoint];map.strokeStyle='#d4a4ff';map.lineWidth=3;map.beginPath();map.arc(at(cp.x),at(cp.z),7,0,Math.PI*2);map.stroke();}
 map.font='600 12px system-ui';map.textAlign='center';map.fillStyle='#dce5cf';map.fillText('SOUTH QUAY',200,15);
 for(const [p,c]of [[DEPOT,'#ffd18b'],[DROP,'#8be8f1']]){map.fillStyle=c;map.fillRect(at(p.x)-4,at(p.z)-4,8,8);}
 for(const c of state?.cars||VEHICLES){map.fillStyle='#'+c.color.toString(16).padStart(6,'0');map.fillRect(at(c.x)-4,at(c.z)-4,8,8);if(c.driver){map.strokeStyle='#ffffff';map.lineWidth=1;map.strokeRect(at(c.x)-4,at(c.z)-4,8,8);}}
 for(const p of state?.players||[]){map.fillStyle=p.id===id?'#ffffff':'#9cdad4';map.beginPath();map.arc(at(p.x),at(p.z),p.id===id?4:3,0,Math.PI*2);map.fill();if(p.id===id){map.strokeStyle='#183e4a';map.lineWidth=2;map.stroke();}}
}
const clock=new THREE.Clock(),target=new THREE.Vector3(),desired=new THREE.Vector3();camera.position.set(95,110,140);let mapTime=0,frameCount=0,fpsTime=0;
function frame(){requestAnimationFrame(frame);if(document.hidden){clock.getDelta();fpsTime=clock.elapsedTime;frameCount=0;return;}const dt=Math.min(clock.getDelta(),.1),time=clock.elapsedTime,k=1-Math.exp(-14*dt);const ambientTime=reducedMotion?0:time;world.update(ambientTime);depot.diamond.rotation.y=ambientTime;drop.diamond.rotation.y=-ambientTime;depot.diamond.position.y=4+Math.sin(ambientTime*2)*.3;drop.diamond.position.y=4+Math.sin(ambientTime*2)*.3;
 if(state){for(const p of state.players){const a=actors.get(p.id);const speed=Math.hypot(p.x-a.position.x,p.z-a.position.z)*14;a.position.x+=(p.x-a.position.x)*k;a.position.z+=(p.z-a.position.z)*k;a.rotation.y=p.a;a.userData.animate(time,speed,reducedMotion?null:p.emote?.name,p.job?.kind==='fishing'&&p.job.phase!=='travel');}for(const c of state.cars){const model=cars.get(c.id);if(!model)continue;model.position.x+=(c.x-model.position.x)*k;model.position.z+=(c.z-model.position.z)*k;let delta=c.a-model.rotation.y;delta=Math.atan2(Math.sin(delta),Math.cos(delta));model.rotation.y+=delta*k;updateCar(model,c,dt,{reducedMotion,quality});}const me=actors.get(id);if(me){target.set(me.position.x,1.4,me.position.z);desired.set(target.x+Math.sin(camYaw)*camDist,target.y+camDist*.26,target.z+Math.cos(camYaw)*camDist);cameraPosition(target,desired);camera.position.lerp(desired,1-Math.exp(-7*dt));camera.lookAt(target);}}
 else{camera.position.set(95+(reducedMotion?0:Math.sin(time*.03)*28),110,140);camera.lookAt(0,0,-50);}
 const driven=state&&drivenCar(state,id),myModel=driven&&cars.get(driven.id);
 headBeam.visible=!!myModel&&quality==='high';
 if(myModel){const a=myModel.rotation.y;headBeam.position.set(myModel.position.x+Math.sin(a)*2,1.05,myModel.position.z+Math.cos(a)*2);headBeam.target.position.set(myModel.position.x+Math.sin(a)*16,.25,myModel.position.z+Math.cos(a)*16);}
 if(joined&&!document.hidden)carAudio.update(state?.cars||[],{x:target.x,z:target.z,yaw:camYaw},id);
 sun.target.position.copy(target);sun.position.set(target.x-75,target.y+95,target.z-45);
 if(time-mapTime>.1){drawMap();mapTime=time;}
 festival.update(state,id,Date.now()+serverOffset,ambientTime,dt,reducedMotion,quality);graphics.render(dt);frameCount++;if(time-fpsTime>=1){$('performance').textContent=Math.round(frameCount/(time-fpsTime))+' FPS · '+renderer.info.render.calls+' draws';frameCount=0;fpsTime=time;}
}frame();window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyQuality();});

function setActivities(open){$('activities').classList.toggle('hidden',!open);$('activitiesBtn').setAttribute('aria-expanded',String(open));clearInput();if(open){$('social').classList.add('hidden');$('peopleBtn').setAttribute('aria-expanded','false');}}
$('activitiesBtn').onclick=()=>setActivities($('activities').classList.contains('hidden'));
$('closeActivities').onclick=()=>{setActivities(false);$('activitiesBtn').focus();};
$('joinRace').onclick=()=>{send({type:'act',action:'race'});setActivities(false);canvas.focus();};
for(const action of ['wave','dance','cheer'])$(action).onclick=()=>send({type:'act',action});
function syncActivities(me){
 const now=Date.now()+serverOffset,r=state.race,entry=r?.entries.find(e=>e.id===id);
 $('myScore').textContent=me.score;
 $('crewGoal').textContent='Crew goal: '+(state.crewStars%12)+' / 12 · '+Math.floor(state.crewStars/12)+' completed';$('starProgress').value=state.crewStars%12;
 $('joinRace').textContent=entry&&r.phase!=='finished'?'Leave race':r?.phase==='running'?'Race in progress':r?.phase==='finished'?'Next race shortly':'Join & move to start';
 $('joinRace').disabled=!!(r&&(r.phase==='running'&&!entry||r.phase==='finished'));
 let status='8-second countdown · 2-minute race limit',hud='';
 if(r?.phase==='countdown'){status='Starting in '+Math.max(0,Math.ceil((r.startsAt-now)/1000))+'s · '+r.entries.length+' racers';if(entry)hud='CIVIC SPRINT · '+Math.max(0,Math.ceil((r.startsAt-now)/1000));}
 if(r?.phase==='running'){status='Race running · '+Math.max(0,Math.ceil((r.endsAt-now)/1000))+'s left';if(entry)hud=entry.finished!==null?'FINISHED · '+(entry.finished/1000).toFixed(1)+'s':'GATE '+(entry.checkpoint+1)+'/4 · '+Math.round(distance(me,RACE_ROUTE[entry.checkpoint]))+' M · RUN';}
 if(r?.phase==='finished'){const finishes=r.entries.filter(e=>e.finished!==null).sort((a,b)=>a.finished-b.finished);status=finishes.length?'Winner: '+finishes[0].name+' · '+(finishes[0].finished/1000).toFixed(1)+'s':'Time up — try another round.';if(entry)hud=entry.finished!==null?'RACE COMPLETE · '+(entry.finished/1000).toFixed(1)+'s':'TIME UP · NEXT ROUND SOON';}
 if($('raceStatus').textContent!==status)$('raceStatus').textContent=status;
 $('raceHud').classList.toggle('hidden',!hud);if($('raceHud').textContent!==hud)$('raceHud').textContent=hud;
 const key=JSON.stringify([state.players.map(p=>[p.id,p.name,p.score]),state.events.map(e=>e.id)]);if(key===lastActivityMarkup)return;lastActivityMarkup=key;
 $('leaderboard').replaceChildren();state.players.slice().sort((a,b)=>b.score-a.score).forEach((p,i)=>{const li=document.createElement('li'),name=document.createElement('span'),score=document.createElement('strong');name.textContent=(i+1)+'. '+p.name+(p.id===id?' (you)':'');score.textContent=p.score;li.append(name,score);$('leaderboard').append(li);});
 $('eventFeed').replaceChildren();for(const e of state.events.slice(-4).reverse()){const p=document.createElement('p');p.textContent=e.text;$('eventFeed').append(p);}
}


for(const kind of ['taxi','fishing','trail'])$('start'+kind).onclick=()=>{send({type:'act',action:kind});setActivities(false);canvas.focus();};
$('cancelJob').onclick=()=>send({type:'act',action:'jobCancel'});
$('jobUse').onclick=()=>{send({type:'act',action:'jobUse'});canvas.focus();};
function syncJob(me){
 const j=me.job,goal=jobTarget(j),now=Date.now()+serverOffset;
 $('cancelJob').classList.toggle('hidden',!j);$('jobUse').classList.toggle('hidden',!j);
 $('jobSummary').textContent=j?'Active: '+({taxi:'Taxi shift',fishing:'Harbor fishing',trail:'City trail'}[j.kind]):'Taxi +100 · Fishing +30–60 · City trail +80';
 $('jobStats').textContent=me.taxiTrips+' fares · '+me.catches+' fish · '+me.trails+' trails';
 $('missionKind').textContent=j?'CITY ACTIVITY / '+j.kind.toUpperCase():'COURIER CONTRACT / 01';jobMarker.g.visible=!!j;if(!j){$('fishingCue').classList.add('hidden');return;}
 jobMarker.g.position.set(goal.x,0,goal.z);
 $('objective').textContent=j.kind==='taxi'?(j.phase==='pickup'?'Pick up your passenger':'Take your passenger home'):j.kind==='fishing'?'Harbor fishing':'City trail · '+(j.step+1)+'/3';
 let text=j.kind==='taxi'?'Drive to '+goal.name+'. Stop, then press Q or ACT.':j.kind==='trail'?'Find '+goal.name+'. Press Q or ACT at the landmark.':j.phase==='travel'?'At the cyan deck marker, Q or ACT casts your line.':j.phase==='casting'?'Line cast. Wait for the bite, then Q or ACT to reel.':'REEL NOW! Press Q or ACT before the fish escapes.';
 $('missionText').textContent=text;$('distance').textContent=goal.name.toUpperCase()+' · '+Math.round(distance(me,goal))+' M';$('deliveries').textContent=j.kind==='taxi'?Math.max(0,Math.ceil((j.expiresAt-now)/1000))+' S LEFT':'CITY ACTIVITY';
 $('jobUse').textContent=j.kind==='fishing'?(j.phase==='travel'?'CAST · Q':j.phase==='casting'?'WAIT…':'REEL! · Q'):'ACT · Q';
 const cue=j.kind==='fishing'&&j.phase!=='travel';$('fishingCue').classList.toggle('hidden',!cue);$('fishingCue').classList.toggle('bite',j.phase==='bite');const cueText=j.phase==='bite'?'REEL NOW · Q / ACT':'Waiting for a bite…';if($('fishingCue').textContent!==cueText)$('fishingCue').textContent=cueText;
}

let garageKey='';
function syncGarage(me){
 const driving=drivenCar(state,id),available=state.cars.filter(c=>!c.driver).sort((a,b)=>distance(a,me)-distance(b,me)),nearest=available[0];
 $('touchCar').textContent=driving?'EXIT':'CAR';$('touchCar').setAttribute('aria-label',driving?'Exit '+driving.name:'Enter nearest available car');
 $('carHint').textContent=driving?'E / CAR · Exit '+driving.name:nearest?'E / CAR · '+nearest.name+' · '+Math.round(distance(me,nearest))+' M':'All cars occupied';
 const key=JSON.stringify(state.cars.map(c=>[c.id,c.driver,Math.round(distance(c,me))]));if(key===garageKey)return;garageKey=key;$('garage').replaceChildren();
 for(const c of state.cars){const row=document.createElement('div');row.className='garageCar';const dot=document.createElement('span');dot.className='carDot';dot.style.background='#'+c.color.toString(16).padStart(6,'0');const name=document.createElement('strong');name.textContent=c.name;const status=document.createElement('small');status.textContent=districtAt(c.x,c.z)+' · '+(c.driver===id?'You are driving':c.driver?'Occupied':Math.round(distance(c,me))+' m · Available')+' · '+ENGINE_PROFILES[c.id].label;row.append(dot,name,status);$('garage').append(row);}
}
