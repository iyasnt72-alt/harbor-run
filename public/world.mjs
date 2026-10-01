import {activityState,tickActivities,raceLocked,racing} from './activities.mjs';
import {tickJobs} from './jobs.mjs';
import {createVehicles,drivenCar} from './vehicles.mjs';
export const LIMIT = 186;
export const DEPOT = { x: -8, z: 12 };
export const DROP = { x: 142, z: -174 };
export const SPAWN = { x: 0, z: 15 };
export const ROAD_WIDTH = 14;
export const roads = [-156,-104,-52,0,52,104,156];
export const parks = [78,130].flatMap(x=>[78,130].map(z=>({id:`park-${x}-${z}`,x,z,w:38,d:38})));
export function districtAt(x,z){
 if(z < -156)return 'South Quay';
 if(z < -104)return 'Mariner Quarter';
 if(x > 52 && z > 52)return 'Palm Gardens';
 if(x < -52)return 'Old Town';
 return 'Civic Center';
}
export const buildings=[];
const colors=[0xd0b79b,0xd9caae,0x8faeb0,0xb5ac96,0xc38e75,0xb6c2ac];
for(const x of [-130,-78,-26,26,78,130])for(const z of [-130,-78,-26,26,78,130]){
 if(parks.some(p=>p.x===x&&p.z===z))continue;
 for(const side of [-1,1]){
 const n=buildings.length;
 buildings.push({id:`building-${n}`,x:x+side*9,z:z+(n%3-1)*2,w:10+(n%3),d:24+(n%4)*2,h:(Math.abs(x)<52&&z<52?15:7)+(n*7%15),color:colors[n%colors.length],district:districtAt(x,z)});
 }
}
export function free(x,z,r=0.65) {
 return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<LIMIT-r&&Math.abs(z)<LIMIT-r&&!buildings.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);
}
export function move(body,dx,dz,r) {
 if(free(body.x+dx,body.z,r))body.x+=dx;
 if(free(body.x,body.z+dz,r))body.z+=dz;
}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function makeRoom(){return {...activityState(),players:new Map(),cars:createVehicles()};}
export function makePlayer(id,name){return {id,name,...SPAWN,a:0,mission:0,deliveries:0,score:0,stars:0,races:0,taxiTrips:0,catches:0,trails:0,job:null,emote:null,voice:false,input:{},inputAt:0,blocked:new Set()};}
export function interact(room,p){
 if(p.mission===0&&distance(p,DEPOT)<5){p.mission=1;return 'Parcel collected. Take it to the blue harbor beacon.';}
 if(p.mission===1&&distance(p,DROP)<6){p.mission=0;p.deliveries++;p.score+=50;return 'Delivery complete! Return to the depot for another run.';}
 return 'Get close to the gold depot or blue delivery beacon.';
}
export function vehicle(room,p){
 const c=drivenCar(room,p.id);
 if(racing(room,p))return 'Finish or leave the footrace before using the car.';
 if(c){
  for(const side of [1,-1]){const x=c.x+Math.cos(c.a)*3*side,z=c.z-Math.sin(c.a)*3*side;if(free(x,z)&&!room.cars.some(other=>other!==c&&Math.hypot(other.x-x,other.z-z)<other.radius+.65)){p.x=x;p.z=z;c.driver=null;c.speed=0;c.throttle=0;c.steer=0;c.braking=false;return 'On foot.';}}
  return 'No room to exit here.';
 }
 const nearby=room.cars.filter(c=>distance(c,p)<=5).sort((a,b)=>distance(a,p)-distance(b,p));
 const available=nearby.find(c=>!c.driver);
 if(!available)return nearby.length?'These cars are occupied. Find a free car on the map.':'Move within 5 metres of a car. Colored squares on the map show the fleet.';
 available.driver=p.id;p.x=available.x;p.z=available.z;p.a=available.a;
 return 'Driving '+available.name+'. W/S throttle, A/D steer. E to exit.';
}
export function tick(room,dt,now=Date.now()){
 for(const p of room.players.values()){
 const c=drivenCar(room,p.id);
 if(raceLocked(room,p))continue;
 const i=now-p.inputAt<600?p.input:{};
 const f=Number(i.f)||0,t=Number(i.t)||0;
 if(c){
 c.throttle=f;c.steer=t;c.braking=!!i.brake;
 c.speed+=(f*c.acceleration-c.speed*c.drag)*dt;
 if(i.brake)c.speed*=Math.max(0,1-9*dt);
 c.speed=Math.max(-c.reverseSpeed,Math.min(c.maxSpeed,c.speed));
 c.a-=t*dt*c.turnRate*Math.min(1,Math.abs(c.speed)/3)*Math.sign(c.speed||1);
 const x=c.x,z=c.z;move(c,Math.sin(c.a)*c.speed*dt,Math.cos(c.a)*c.speed*dt,c.radius);
 if(room.cars.some(other=>other!==c&&distance(c,other)<c.radius+other.radius)){c.x=x;c.z=z;c.speed=0;}
 if(Math.hypot(c.x-x,c.z-z)<Math.abs(c.speed*dt)*0.4)c.speed*=0.5;
 p.x=c.x;p.z=c.z;p.a=c.a;
 }else{
 // Fixed north-facing chase view: forward is world north (-Z).
 const n=Math.max(1,Math.hypot(f,t)),s=i.run?8:5;
 move(p,t/n*s*dt,-f/n*s*dt,0.65);
 if(f||t)p.a=Math.atan2(t,-f);
 }
 }
 tickActivities(room,now);
 tickJobs(room,now);
}
export function snapshot(room,now=Date.now()){return {type:'state',now,cars:room.cars,race:room.race,stars:room.stars,crewStars:room.crewStars,events:room.events,players:[...room.players.values()].map(({id,name,x,z,a,mission,deliveries,score,stars,races,taxiTrips,catches,trails,job,emote,voice})=>({id,name,x,z,a,mission,deliveries,score,stars,races,taxiTrips,catches,trails,job,emote,voice}))};}
