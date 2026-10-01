import {event,racing} from './activities.mjs';
import {drivenCar} from './vehicles.mjs';

export const FISHING_SPOT={x:0,z:-179,name:'South Quay fishing deck'};
export const TAXI_ROUTES=[
 {pickup:{x:0,z:30,name:'Civic taxi stand'},drop:{x:104,z:52,name:'Palm Gardens'}},
 {pickup:{x:52,z:104,name:'Garden Avenue'},drop:{x:-104,z:0,name:'Old Town'}},
 {pickup:{x:-52,z:-104,name:'Mariner station'},drop:{x:142,z:-174,name:'Harbor terminal'}}
];
export const TRAIL=[{x:78,z:78,name:'Garden fountain',fact:'The four garden blocks are the city’s green heart.'},{x:-104,z:0,name:'Old Town clock',fact:'Old Town grew around its shops and original clock tower.'},{x:-40,z:-179,name:'Quay lookout',fact:'The harbor cranes, boats and distant hills frame South Quay.'}];
const near=(a,b,r=5)=>Math.hypot(a.x-b.x,a.z-b.z)<r;
export function jobTarget(job){if(!job)return null;if(job.kind==='taxi'){const route=TAXI_ROUTES[job.route];return job.phase==='pickup'?route.pickup:route.drop;}return job.kind==='fishing'?FISHING_SPOT:TRAIL[job.step];}
export function startJob(room,p,kind,now=Date.now()){
 if(!['taxi','fishing','trail'].includes(kind))return 'Choose a city activity.';
 if(p.job)return 'Finish your activity or cancel it in Play first.';
 if(racing(room,p))return 'Finish or leave the race first.';
 if(kind==='taxi'&&!drivenCar(room,p.id))return 'Enter any available car first, then start a taxi shift.';
 if(kind==='fishing'&&drivenCar(room,p.id))return 'Park and leave the car before going fishing.';
 p.job={kind,phase:kind==='taxi'?'pickup':'travel',route:p.taxiTrips%TAXI_ROUTES.length,step:0,expiresAt:now+(kind==='taxi'?180000:600000)};
 return kind==='taxi'?'Taxi shift started. Drive to the cyan pickup marker, stop, and press Q or ACT.':kind==='fishing'?'Follow the cyan marker to the fishing deck. Q or ACT casts and reels.':'City trail started. Visit three landmarks and press Q or ACT at each.';
}
export function cancelJob(room,p){p.job=null;return 'City activity cancelled.';}
export function useJob(room,p,now=Date.now()){
 const j=p.job;if(!j)return 'Choose taxi, fishing or the city trail in Play.';
 if(now>=j.expiresAt){p.job=null;return 'Time ran out. Start another activity in Play.';}
 const target=jobTarget(j);
 if(!near(p,target))return 'Follow your activity marker. Get closer to '+target.name+'.';
 if(j.kind==='taxi'){
  if(!drivenCar(room,p.id))return 'The fare needs a driver.';
  if(Math.abs(drivenCar(room,p.id).speed)>1.5)return 'Stop the car to pick up or drop off your passenger.';
  if(j.phase==='pickup'){j.phase='dropoff';j.expiresAt=now+90000;return 'Passenger aboard. Reach '+jobTarget(j).name+' within 90 seconds.';}
  p.taxiTrips++;p.score+=100;p.job=null;event(room,p.name+' completed a taxi fare. +100','finish',p,now);return 'Fare complete! +100 points. Start another shift in Play.';
 }
 if(j.kind==='trail'){
  const fact=target.fact;j.step++;
  if(j.step===TRAIL.length){p.trails++;p.score+=80;p.job=null;event(room,p.name+' explored all three landmarks. +80','finish',p,now);return 'City trail complete! +80 points. '+fact;}
  return fact+' Next: '+jobTarget(j).name+'.';
 }
 if(drivenCar(room,p.id))return 'Leave the car to fish.';
 if(now<(p.fishReadyAt||0))return 'Resetting your line. Try again in a moment.';
 if(j.phase==='travel'){
  p.a=Math.PI;j.phase='casting';j.biteAt=now+4500+(p.catches%3)*900;j.reelUntil=j.biteAt+4500;
  return 'Line cast. Stay by the deck and wait for REEL NOW, then press Q or ACT.';
 }
 if(now<j.biteAt){j.phase='travel';p.fishReadyAt=now+1500;return 'Too early! The fish escaped. Cast again.';}
 if(now>=j.reelUntil){j.phase='travel';p.fishReadyAt=now+1500;return 'That bite slipped away. Cast again.';}
 const fish=['silver bream','blue mackerel','golden snapper'][p.catches%3],points=[30,40,60][p.catches%3];
 p.catches++;p.score+=points;j.phase='travel';p.fishReadyAt=now+2000;
 event(room,p.name+' caught a '+fish+'. +'+points,'fish',p,now);return 'Caught a '+fish+'! +'+points+'. Cast again when ready.';
}
export function tickJobs(room,now){
 for(const p of room.players.values()){
  const j=p.job;if(!j)continue;
  if(now>=j.expiresAt||j.kind==='taxi'&&!drivenCar(room,p.id)){p.job=null;event(room,p.name+' ended their '+j.kind+' activity.','info',p,now);continue;}
  if(j.kind==='fishing'&&j.phase!=='travel'){
   if(!near(p,FISHING_SPOT)||drivenCar(room,p.id)){j.phase='travel';continue;}
   if(now>=j.reelUntil){j.phase='travel';p.fishReadyAt=now+1500;event(room,p.name+' missed a bite. Cast again!','info',p,now);}
   else if(now>=j.biteAt)j.phase='bite';
  }
 }
}
