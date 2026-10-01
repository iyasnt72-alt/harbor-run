import {drivenCar} from './vehicles.mjs';
// Room-owned activity state: clients send intent, never scores or checkpoints.
export const RACE_START={x:0,z:52};
export const RACE_ROUTE=[{x:0,z:0},{x:52,z:0},{x:52,z:52},{x:0,z:52}];
export const STAR_SPAWNS=[{x:0,z:28},{x:0,z:-28},{x:30,z:0},{x:-30,z:0},{x:52,z:-28},{x:-52,z:28},{x:104,z:28},{x:-104,z:-28},{x:28,z:104},{x:104,z:130},{x:130,z:104},{x:52,z:130},{x:-52,z:130},{x:0,z:-130},{x:104,z:-174},{x:-104,z:-174}];
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<r;
export function activityState(){return {race:null,stars:STAR_SPAWNS.map((p,id)=>({...p,id,readyAt:0})),crewStars:0,events:[],eventId:0};}
export function event(room,text,kind='info',p={x:0,z:15},now=Date.now()){
 room.events.push({id:++room.eventId,text,kind,x:p.x,z:p.z,at:now});room.events=room.events.slice(-6);
}
export function raceAction(room,p,now=Date.now()){
 if(p.job)return 'Finish or cancel your city activity in Play before racing.';
 const race=room.race,entry=race?.entries.find(e=>e.id===p.id);
 if(entry&&race.phase!=='finished'){race.entries=race.entries.filter(e=>e.id!==p.id);event(room,p.name+' left the race.','info',p,now);return 'You left the race.';}
 if(drivenCar(room,p.id))return 'Park and exit the car to enter this footrace.';
 if(race&&race.phase!=='finished'&&(race.phase!=='countdown'||now>=race.startsAt))return 'A race is in progress. Join the next round.';
 if(race?.phase==='finished'&&now<race.clearAt)return 'Results are on the board. The next race opens shortly.';
 if(!race||race.phase==='finished')room.race={phase:'countdown',startsAt:now+8000,endsAt:now+128000,clearAt:0,entries:[]};
 const current=room.race;const lane=current.entries.length;
 p.x=RACE_START.x+(lane-3.5)*1.1;p.z=RACE_START.z;p.input={};p.a=Math.PI;
 current.entries.push({id:p.id,name:p.name,checkpoint:0,finished:null,startX:p.x});
 event(room,p.name+' joined the Civic Sprint.','info',p,now);
 return 'Civic Sprint: moved to the start. Follow four purple gates on foot. Hold Shift or RUN to sprint.';
}
export function emoteAction(room,p,name,now=Date.now()){
 if(!['wave','dance','cheer'].includes(name))return 'Choose wave, dance, or cheer.';
 if(now-(p.emoteAt||0)<1800)return 'Give your next emote a moment.';
 p.emoteAt=now;p.emote={name,until:now+4500};return name==='wave'?'Waving to your crew.':name==='dance'?'Dance break!':'Cheering!';
}
export function raceLocked(room,p){const r=room.race;return !!(r&&r.phase==='countdown'&&r.entries.some(e=>e.id===p.id));}
export function racing(room,p){const r=room.race;return !!(r&&r.phase!=='finished'&&r.entries.some(e=>e.id===p.id&&e.finished===null));}
export function tickActivities(room,now=Date.now()){
 let r=room.race;
 if(r){
  if(r.phase!=='finished')r.entries=r.entries.filter(e=>room.players.has(e.id));
  if(!r.entries.length||r.phase==='finished'&&now>=r.clearAt){room.race=null;r=null;}
 }
 if(r?.phase==='countdown'){
  for(const e of r.entries){const p=room.players.get(e.id);p.x=e.startX;p.z=RACE_START.z;}
  if(now>=r.startsAt){r.phase='running';event(room,'Civic Sprint — GO!','start',RACE_START,now);}
 }
 if(r?.phase==='running'){
  for(const e of r.entries){const p=room.players.get(e.id);if(e.finished!==null||drivenCar(room,e.id))continue;
   if(near(p,RACE_ROUTE[e.checkpoint],4)){
    e.checkpoint++;
    if(e.checkpoint===RACE_ROUTE.length){e.finished=Math.max(0,now-r.startsAt);const place=r.entries.filter(q=>q.finished!==null).length;p.score+=(place===1?100:place===2?75:50);p.races++;event(room,`${p.name} finished #${place} in ${(e.finished/1000).toFixed(1)}s!`,'finish',p,now);}
   }
  }
  if(now>=r.endsAt||r.entries.every(e=>e.finished!==null)){r.phase='finished';r.clearAt=now+12000;event(room,'Race complete. Results in Activities.','info',RACE_START,now);}
 }
 for(const star of room.stars){if(now<star.readyAt)continue;
  for(const p of room.players.values()){
   if(raceLocked(room,p)||!near(p,star,drivenCar(room,p.id)?2.8:1.7))continue;
   star.readyAt=now+30000;p.score+=10;p.stars++;room.crewStars++;
   event(room,p.name+' found a harbor star. +10','star',star,now);
   if(room.crewStars%12===0)event(room,'Crew goal complete! 12 stars together.','party',star,now);
   break;
  }
 }
 for(const p of room.players.values())if(p.emote&&now>=p.emote.until)p.emote=null;
}
