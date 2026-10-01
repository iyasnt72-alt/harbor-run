// Shared fleet definitions. Ownership and movement are controlled by the server.
export const VEHICLES=[
 {id:'quay',name:'Quay Coupe',asset:'quay-coupe',color:0xe5a05e,x:5,z:15,a:Math.PI,acceleration:24,drag:1.6,maxSpeed:23,reverseSpeed:9,turnRate:1.6,radius:2.1},
 {id:'comet',name:'Comet Sport',asset:'comet-sport',color:0xe66762,x:-5,z:15,a:Math.PI,acceleration:34,drag:1.35,maxSpeed:26,reverseSpeed:9,turnRate:1.85,radius:2.1},
 {id:'sunbeam',name:'Sunbeam Taxi',asset:'sunbeam-taxi',color:0xf5d366,x:5,z:-3,a:Math.PI,acceleration:23,drag:1.5,maxSpeed:21,reverseSpeed:8,turnRate:1.55,radius:2.1},
 {id:'trail',name:'Coast SUV',asset:'coast-suv',color:0x73b8d3,x:-5,z:-3,a:Math.PI,acceleration:21,drag:1.6,maxSpeed:19,reverseSpeed:7,turnRate:1.3,radius:2.25},
 {id:'palm',name:'Palm Roadster',asset:'palm-roadster',color:0x58c4b2,x:104,z:78,a:0,acceleration:30,drag:1.35,maxSpeed:25,reverseSpeed:8,turnRate:1.95,radius:2.1},
 {id:'hatch',name:'Old Town Hatch',asset:'old-town-hatch',color:0xb0cc75,x:-104,z:78,a:Math.PI,acceleration:25,drag:1.7,maxSpeed:20,reverseSpeed:8,turnRate:2.05,radius:1.9},
 {id:'van',name:'Mariner Van',asset:'mariner-van',color:0xe3dcc7,x:-104,z:-130,a:0,acceleration:18,drag:1.6,maxSpeed:17,reverseSpeed:6,turnRate:1.15,radius:2.25},
 {id:'wagon',name:'Harbor Wagon',asset:'harbor-wagon',color:0xb97189,x:52,z:-170,a:Math.PI/2,acceleration:22,drag:1.5,maxSpeed:22,reverseSpeed:8,turnRate:1.45,radius:2.25}
];
export const createVehicles=()=>VEHICLES.map(v=>({...v,speed:0,driver:null,throttle:0,steer:0,braking:false}));
export const drivenCar=(room,id)=>room.cars.find(c=>c.driver===id);
export function releaseVehicle(room,id){for(const c of room.cars)if(c.driver===id){c.driver=null;c.speed=0;c.throttle=0;c.steer=0;c.braking=false;}}
