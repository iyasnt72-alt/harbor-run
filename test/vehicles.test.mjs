import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom,makePlayer,vehicle,tick,free,snapshot,districtAt} from '../public/world.mjs';
import {VEHICLES,drivenCar,releaseVehicle} from '../public/vehicles.mjs';
import {startJob,useJob,jobTarget} from '../public/jobs.mjs';
import {raceAction} from '../public/activities.mjs';

test('eight drivers can acquire and move distinct cars across districts; rooms and releases stay independent',()=>{
 const room=makeRoom(),other=makeRoom();assert.equal(room.cars.length,8);assert.equal(new Set(room.cars.map(c=>districtAt(c.x,c.z))).size,5);
 for(const [i,c]of room.cars.entries()){assert.ok(free(c.x,c.z,c.radius));const p=makePlayer('p'+i,'Driver '+i);p.x=c.x;p.z=c.z;room.players.set(p.id,p);vehicle(room,p);assert.equal(c.driver,p.id);assert.equal(drivenCar(room,p.id),c);p.input={f:1};p.inputAt=1000;}
 const before=room.cars.map(c=>({x:c.x,z:c.z}));for(let i=0;i<10;i++)tick(room,.05,1000);
 room.cars.forEach((c,i)=>{assert.ok(Math.hypot(c.x-before[i].x,c.z-before[i].z)>.1,c.name);assert.equal(room.players.get(c.driver).z,c.z);});
 assert.ok(other.cars.every(c=>c.driver===null&&c.speed===0));assert.equal(snapshot(room).cars.length,8);
 releaseVehicle(room,'p1');assert.equal(room.cars[1].driver,null);assert.equal(room.cars[1].speed,0);assert.equal(room.cars[0].driver,'p0');
});
test('entry selects nearby free car, refuses theft and distant entry, and preserves safe exits',()=>{
 const room=makeRoom(),a=makePlayer('a','A'),b=makePlayer('b','B');room.players.set('a',a);room.players.set('b',b);
 vehicle(room,a);vehicle(room,b);assert.equal(drivenCar(room,'a').id,'quay');assert.equal(drivenCar(room,'b').id,'comet');
 const outsider=makePlayer('c','C');outsider.x=3;assert.match(vehicle(room,outsider),/occupied/);assert.equal(drivenCar(room,'c'),undefined);outsider.x=104;assert.match(vehicle(room,outsider),/5 metres/);
 vehicle(room,b);assert.equal(drivenCar(room,'b'),undefined);assert.ok(free(b.x,b.z));assert.equal(drivenCar(room,'a').id,'quay');
});
test('every vehicle supports taxi fares, forbids footrace entry, and has distinct handling',()=>{
 const speeds=[];
 for(const definition of VEHICLES){const room=makeRoom(),c=room.cars.find(c=>c.id===definition.id),p=makePlayer('a','A');p.x=c.x;p.z=c.z;room.players.set('a',p);vehicle(room,p);assert.match(raceAction(room,p),/exit/);startJob(room,p,'taxi',10000);assert.equal(p.job.kind,'taxi');Object.assign(p,jobTarget(p.job));useJob(room,p,11000);assert.equal(p.job.phase,'dropoff');Object.assign(p,jobTarget(p.job));useJob(room,p,12000);assert.equal(p.score,100);
 p.input={f:1};p.inputAt=13000;tick(room,.05,13000);speeds.push(c.speed);}
 assert.equal(new Set(speeds).size,8);
});
test('cars stop at other cars without overlapping',()=>{
 const room=makeRoom(),p=makePlayer('a','A'),c=room.cars[0],obstacle=room.cars[1];room.players.set(p.id,p);p.x=c.x;p.z=c.z;vehicle(room,p);obstacle.x=c.x;obstacle.z=c.z-4.3;c.speed=12;p.input={f:1};p.inputAt=1000;const z=c.z;tick(room,.05,1000);assert.equal(c.z,z);assert.equal(c.speed,0);assert.equal(p.z,z);
});
