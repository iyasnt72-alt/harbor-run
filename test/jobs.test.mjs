import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom,makePlayer,free,snapshot,tick} from '../public/world.mjs';
import {raceAction} from '../public/activities.mjs';
import {startJob,useJob,cancelJob,tickJobs,jobTarget,FISHING_SPOT,TAXI_ROUTES,TRAIL} from '../public/jobs.mjs';
function setup(){const r=makeRoom(),p=makePlayer('a','A');r.players.set(p.id,p);return {r,p};}
test('taxi requires driver, ordered stops, stationary car, and awards once',()=>{
 const {r,p}=setup();assert.match(startJob(r,p,'taxi',10000),/Enter/);assert.equal(p.job,null);
 r.cars[0].driver=p.id;startJob(r,p,'taxi',10000);Object.assign(p,TAXI_ROUTES[0].drop);useJob(r,p,11000);assert.equal(p.job.phase,'pickup');
 Object.assign(p,jobTarget(p.job));r.cars[0].speed=4;assert.match(useJob(r,p,12000),/Stop/);assert.equal(p.job.phase,'pickup');r.cars[0].speed=0;useJob(r,p,13000);assert.equal(p.job.phase,'dropoff');assert.equal(p.job.expiresAt,103000);
 Object.assign(p,jobTarget(p.job));useJob(r,p,20000);assert.equal(p.taxiTrips,1);assert.equal(p.score,100);assert.equal(p.job,null);useJob(r,p,20001);assert.equal(p.score,100);
 startJob(r,p,'taxi',21000);assert.equal(p.job.route,1);r.cars[0].driver=null;tickJobs(r,21001);assert.equal(p.job,null);
});
test('fishing checks deck proximity, wait/reel window, cooldown and movement',()=>{
 const {r,p}=setup();startJob(r,p,'fishing',10000);useJob(r,p,10000);assert.equal(p.job.phase,'travel');Object.assign(p,FISHING_SPOT);useJob(r,p,11000);assert.equal(p.job.phase,'casting');useJob(r,p,12000);assert.equal(p.score,0);assert.equal(p.job.phase,'travel');
 useJob(r,p,13000);assert.equal(p.job.phase,'travel');useJob(r,p,14000);tickJobs(r,18500);assert.equal(p.job.phase,'bite');useJob(r,p,18600);assert.equal(p.catches,1);assert.equal(p.score,30);useJob(r,p,18601);assert.equal(p.catches,1);
 useJob(r,p,22000);p.x=30;tickJobs(r,23000);assert.equal(p.job.phase,'travel');Object.assign(p,FISHING_SPOT);useJob(r,p,25000);tickJobs(r,34900);assert.equal(p.job.phase,'travel');assert.equal(p.catches,1);
 useJob(r,p,37000);useJob(r,p,p.job.reelUntil);assert.equal(p.catches,1);assert.equal(p.job.phase,'travel');
});
test('city trail checks ordered locations, cancellation, race exclusion, deadlines and replication',()=>{
 const {r,p}=setup();startJob(r,p,'trail',10000);assert.match(raceAction(r,p,10001),/cancel/);assert.match(startJob(r,p,'fishing',10001),/cancel/);
 Object.assign(p,TRAIL[2]);useJob(r,p,11000);assert.equal(p.job.step,0);
 for(const point of TRAIL){Object.assign(p,point);useJob(r,p,20000);}
 assert.equal(p.trails,1);assert.equal(p.score,80);assert.equal(p.job,null);assert.equal(snapshot(r).players[0].trails,1);
 startJob(r,p,'trail',30000);cancelJob(r,p);assert.equal(p.job,null);raceAction(r,p,31000);assert.match(startJob(r,p,'trail',31001),/race/);raceAction(r,p,32000);tick(r,.05,32000);
 startJob(r,p,'trail',33000);tickJobs(r,633000);assert.equal(p.job,null);
 for(const point of [FISHING_SPOT,...TRAIL,...TAXI_ROUTES.flatMap(r=>[r.pickup,r.drop])])assert.ok(free(point.x,point.z,2.1),point.name);
});
