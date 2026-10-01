import test from 'node:test';
import assert from 'node:assert/strict';
import {engineMix,CarAudio,ENGINE_PROFILES} from '../public/car-audio.mjs';
import {VEHICLES} from '../public/vehicles.mjs';
import {makeRoom,makePlayer,vehicle,tick} from '../public/world.mjs';
import {releaseVehicle} from '../public/vehicles.mjs';

test('car audio responds to distance, engine class and brakes without invalid levels',()=>{
 const car={id:'quay',driver:'a',speed:12,maxSpeed:23,throttle:1,x:0,z:0},listener={x:0,z:0,yaw:0};
 const own=engineMix(car,listener,'a');assert.equal(own.active,true);assert.equal(own.pan,0);
 assert.ok(engineMix({...car,x:30},listener,'b').motorGain<own.motorGain);
 assert.equal(engineMix({...car,x:60},listener,'b').active,false);
 assert.equal(engineMix({...car,driver:null},listener,'a').active,false);
 assert.notEqual(engineMix({...car,id:'comet'},listener,'a').frequency,own.frequency);
 assert.ok(engineMix({...car,braking:true},listener,'a').roadGain>own.roadGain);
 for(const key of ['frequency','motorGain','roadGain','cutoff','pan'])assert.ok(Number.isFinite(engineMix({...car,speed:NaN,throttle:Infinity},listener,'a')[key]));
});

function fakeAudio(){
 const sources=[];const param=()=>({value:0,setTargetAtTime(v){this.value=v;}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),pan:param(),threshold:param(),knee:param(),ratio:param(),connect(){},setPeriodicWave(wave){this.wave=wave;},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}});
 class Context{
  constructor(){this.state='suspended';this.currentTime=1;this.sampleRate=100;this.destination=node();}
  createGain(){return node();}createDynamicsCompressor(){return node();}createBiquadFilter(){return node();}createStereoPanner(){return node();}
  createBuffer(){return {getChannelData:()=>new Float32Array(100)};}
  createPeriodicWave(real,imag){return {real:[...real],imag:[...imag]};}
  createOscillator(){const n=node();sources.push(n);return n;}createBufferSource(){const n=node();sources.push(n);return n;}
  async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
 }
 return {Context,sources};
}
test('audio requires activation, stops unused voices, and mute/visibility/disposal release sources',async()=>{
 const {Context,sources}=fakeAudio();
 const audio=new CarAudio({Context}),car={id:'quay',driver:'a',speed:2,maxSpeed:23,x:0,z:0},listener={x:0,z:0,yaw:0};
 audio.update([car],listener,'a');assert.equal(sources.length,0);
 await audio.activate();audio.update([car],listener,'a');assert.equal(audio.voices.size,1);assert.equal(sources.length,5);
 audio.ctx.currentTime+=1;audio.update([{...car,driver:null}],listener,'a');assert.equal(audio.voices.size,0);assert.ok(sources.every(s=>s.stopped&&s.disconnected));
 audio.ctx.currentTime+=1;audio.update([car],listener,'a');audio.setEnabled(false);assert.equal(audio.voices.size,0);assert.equal(audio.master.gain.value,0);
 audio.setEnabled(true);await audio.activate();audio.ctx.currentTime+=1;audio.update([car],listener,'a');audio.pause();assert.equal(audio.ctx.state,'suspended');assert.equal(audio.voices.size,0);
 await audio.activate();audio.setVolume(9);assert.equal(audio.volume,1);audio.setVolume(-1);assert.equal(audio.volume,0);
 audio.dispose();assert.equal(audio.ctx,null);assert.ok(sources.every(s=>s.stopped));
});

test('every fleet engine has a distinct waveform; previews stay bounded, expire and honor mute',async()=>{
 const {Context,sources}=fakeAudio(),audio=new CarAudio({Context}),listener={x:0,z:0,yaw:0},waves=[];
 for(const car of VEHICLES){assert.ok(ENGINE_PROFILES[car.id]);assert.equal(await audio.previewEngine(car.id),true);audio.ctx.currentTime+=.05;audio.update([],listener,'a');assert.equal(audio.voices.size,1);waves.push(JSON.stringify(audio.voices.get(car.id).engine.wave.imag));}
 assert.equal(new Set(waves).size,VEHICLES.length);
 audio.ctx.currentTime+=3;audio.update([],listener,'a');assert.equal(audio.preview,null);assert.equal(audio.voices.size,0);assert.ok(sources.every(s=>s.stopped));
 audio.setEnabled(false);assert.equal(await audio.previewEngine('quay'),false);assert.equal(audio.voices.size,0);assert.equal(await audio.previewEngine('unknown'),false);audio.dispose();
});

test('turbo release and gear shifts trigger briefly and repeated steady updates do not retrigger',async()=>{
 const {Context}=fakeAudio(),audio=new CarAudio({Context}),listener={x:0,z:0,yaw:0};await audio.activate();
 const car={id:'comet',driver:'a',speed:4,maxSpeed:26,throttle:1,x:0,z:0};audio.update([car],listener,'a');const v=audio.voices.get('comet');assert.equal(v.shiftUntil,0);
 audio.ctx.currentTime+=.05;car.speed=8;audio.update([car],listener,'a');assert.ok(v.shiftUntil>audio.ctx.currentTime);const shift=v.shiftUntil;
 audio.ctx.currentTime+=.05;audio.update([car],listener,'a');assert.equal(v.shiftUntil,shift);
 audio.ctx.currentTime+=.5;car.throttle=0;audio.update([car],listener,'a');assert.ok(v.releaseUntil>audio.ctx.currentTime);const release=v.releaseUntil;
 audio.ctx.currentTime+=1;audio.update([car],listener,'a');assert.equal(v.releaseUntil,release);assert.ok(v.airGain.gain.value<.05);audio.dispose();
});

test('server feedback clears on stale input, exit and disconnect, independently for each driver',()=>{
 const room=makeRoom(),p=makePlayer('driver','D');room.players.set(p.id,p);vehicle(room,p);const car=room.cars[0];
 p.input={f:1,t:.5,brake:true};p.inputAt=1000;tick(room,.05,1000);assert.equal(car.throttle,1);assert.equal(car.steer,.5);assert.equal(car.braking,true);
 tick(room,.05,1700);assert.equal(car.throttle,0);assert.equal(car.steer,0);assert.equal(car.braking,false);
 p.inputAt=1800;tick(room,.05,1800);vehicle(room,p);assert.equal(car.driver,null);assert.equal(car.throttle,0);assert.equal(car.braking,false);
 vehicle(room,p);p.inputAt=1900;tick(room,.05,1900);releaseVehicle(room,p.id);assert.equal(car.steer,0);assert.equal(car.throttle,0);
});
