import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom,makePlayer,free,tick,vehicle,interact,DEPOT,DROP,LIMIT,buildings,roads,parks} from '../public/world.mjs';
test('expanded map matches building collisions, world boundary and non-finite coordinates',()=>{
 assert.equal(LIMIT,186);assert.equal(buildings.length,64);assert.equal(parks.length,4);
 for(const b of buildings){assert.equal(free(b.x,b.z),false);assert.ok(Math.abs(b.x)+b.w/2<LIMIT);assert.ok(Math.abs(b.z)+b.d/2<LIMIT);assert.equal(parks.some(p=>Math.abs(b.x-p.x)<(b.w+p.w)/2&&Math.abs(b.z-p.z)<(b.d+p.d)/2),false);}
 assert.equal(free(LIMIT,0),false);assert.equal(free(NaN,0),false);assert.equal(free(0,0),true);
 const r=makeRoom(),p=makePlayer('a','A'),b=buildings[0];r.players.set('a',p);p.x=b.x-b.w/2-3;p.z=b.z;p.input={t:1};p.inputAt=1000;for(let n=0;n<100;n++)tick(r,.05,1000);assert.ok(p.x<b.x-b.w/2-.64);
});
test('road grid, expanded harbor route and mission markers are navigable by car',()=>{
 for(const road of roads)for(let v=-180;v<=180;v+=.5){assert.ok(free(road,v,2.1),`${road},${v}`);assert.ok(free(v,road,2.1),`${v},${road}`);}
 assert.ok(free(DEPOT.x,DEPOT.z));assert.ok(free(DROP.x,DROP.z,2.1));assert.ok(Math.hypot(DROP.x-DEPOT.x,DROP.z-DEPOT.z)>200);
 for(let x=0;x<=DROP.x;x+=.5)assert.ok(free(x,-174,2.1));
});
test('stale inputs stop movement, diagonal motion normalized, analog input proportional',()=>{
 const r=makeRoom(),p=makePlayer('a','A');r.players.set('a',p);p.input={f:1,t:1};p.inputAt=1000;tick(r,.05,1000);assert.ok(Math.abs(Math.hypot(p.x,p.z-15)-.25)<.0001);const x=p.x,z=p.z;tick(r,.05,2000);assert.equal(p.x,x);assert.equal(p.z,z);p.input={f:.2,t:0};tick(r,.05,1000);assert.ok(Math.abs(p.z-(z-.05))<.0001);
});
test('exclusive driver, steering, braking and safe exit',()=>{
 const r=makeRoom(),p=makePlayer('a','A'),q=makePlayer('b','B');p.x=3;q.x=3;r.players.set(p.id,p);r.players.set(q.id,q);vehicle(r,p);assert.equal(r.cars[0].driver,p.id);vehicle(r,q);assert.equal(r.cars[0].driver,p.id);p.input={f:1,t:1};p.inputAt=1000;for(let n=0;n<20;n++)tick(r,.05,1000);assert.ok(r.cars[0].speed>0);assert.notEqual(r.cars[0].a,Math.PI);assert.equal(p.x,r.cars[0].x);const speed=r.cars[0].speed;p.input={brake:true};tick(r,.05,1000);assert.ok(r.cars[0].speed<speed);vehicle(r,p);assert.equal(r.cars[0].driver,null);assert.ok(free(p.x,p.z));
});
test('mission needs pickup and delivery proximity; repeatable',()=>{
 const r=makeRoom(),p=makePlayer('a','A');interact(r,p);assert.equal(p.mission,0);Object.assign(p,DEPOT);interact(r,p);assert.equal(p.mission,1);interact(r,p);assert.equal(p.deliveries,0);Object.assign(p,DROP);interact(r,p);assert.equal(p.deliveries,1);assert.equal(p.mission,0);
});
