import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom,makePlayer,vehicle,tick,free,interact,DEPOT,DROP,snapshot} from '../public/world.mjs';
import {raceAction,emoteAction,tickActivities,RACE_ROUTE,STAR_SPAWNS} from '../public/activities.mjs';
function setup(){const r=makeRoom(),a=makePlayer('a','Alice'),b=makePlayer('b','Bob');r.players.set(a.id,a);r.players.set(b.id,b);return {r,a,b};}
test('race start freezes entrants, gates are ordered, finish awards once',()=>{
 const {r,a,b}=setup();raceAction(r,a,10000);raceAction(r,b,10000);assert.equal(r.race.entries.length,2);a.input={f:1,run:true};a.inputAt=10000;tick(r,.05,10000);assert.equal(a.z,52);assert.equal(r.cars[0].driver,null);assert.match(vehicle(r,a),/footrace/);
 tickActivities(r,18000);assert.equal(r.race.phase,'running');Object.assign(a,RACE_ROUTE[3]);tickActivities(r,19000);assert.equal(r.race.entries[0].checkpoint,0);assert.equal(a.score,0);
 RACE_ROUTE.forEach((p,i)=>{Object.assign(a,p);tickActivities(r,20000+i*1000);});assert.equal(a.races,1);assert.equal(a.score,100);tickActivities(r,24000);assert.equal(a.score,100);
 RACE_ROUTE.forEach((p,i)=>{Object.assign(b,p);tickActivities(r,25000+i*1000);});assert.equal(b.score,75);assert.equal(r.race.phase,'finished');assert.match(raceAction(r,a,29000),/shortly/);tickActivities(r,41000);assert.equal(r.race,null);
});
test('race handles driver rejection, late join, cancellation, disconnect and time limit',()=>{
 const {r,a,b}=setup();a.x=5;vehicle(r,a);assert.match(raceAction(r,a,10000),/exit/);assert.equal(r.race,null);vehicle(r,a);raceAction(r,a,10000);assert.match(raceAction(r,b,18000),/progress/);tickActivities(r,18000);assert.match(raceAction(r,b,18001),/progress/);raceAction(r,a,19000);tickActivities(r,19000);assert.equal(r.race,null);
 raceAction(r,a,20000);r.players.delete(a.id);tickActivities(r,20000);assert.equal(r.race,null);raceAction(r,b,30000);tickActivities(r,38000);tickActivities(r,158000);assert.equal(r.race.phase,'finished');assert.equal(b.score,0);
});
test('shared stars have a single winner and a server-controlled respawn',()=>{
 const {r,a,b}=setup();Object.assign(a,STAR_SPAWNS[0]);Object.assign(b,STAR_SPAWNS[0]);tickActivities(r,10000);assert.equal(a.score+b.score,10);assert.equal(r.crewStars,1);assert.equal(r.stars[0].readyAt,40000);tickActivities(r,39999);assert.equal(a.score+b.score,10);tickActivities(r,40000);assert.equal(a.score+b.score,20);assert.equal(snapshot(r).crewStars,2);
 for(const p of [...STAR_SPAWNS,...RACE_ROUTE])assert.ok(free(p.x,p.z),JSON.stringify(p));
});
test('crew goal celebrates once, emotes validate/cool down/expire, delivery scores',()=>{
 const {r,a}=setup();r.crewStars=11;Object.assign(a,STAR_SPAWNS[0]);tickActivities(r,10000);assert.equal(r.events.filter(e=>e.kind==='party').length,1);tickActivities(r,10001);assert.equal(r.events.filter(e=>e.kind==='party').length,1);
 emoteAction(r,a,'arbitrary',11000);assert.equal(a.emote,null);emoteAction(r,a,'wave',11000);assert.equal(a.emote.name,'wave');emoteAction(r,a,'dance',11001);assert.equal(a.emote.name,'wave');tickActivities(r,16000);assert.equal(a.emote,null);Object.assign(a,DEPOT);interact(r,a);Object.assign(a,DROP);interact(r,a);assert.equal(a.score,60);
});
