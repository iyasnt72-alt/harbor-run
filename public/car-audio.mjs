// Original, sample-free engine synthesis. No microphone access or network audio.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const finite=v=>Number.isFinite(v)?v:0;
// Each car has its own firing waveform, bass, intake and transmission character.
// Harmonics change the timbre, rather than transposing the same buzzy oscillator.
export const ENGINE_PROFILES={
 quay:{label:'Warm growl',idle:39,range:2.6,harmonics:[1,.6,.18,.32,.12,.09,.06],bass:.42,whine:.015,whineRatio:3,flutter:.1,air:.01,cutoff:520,brightness:1000,shift:.14},
 comet:{label:'Turbo rasp',idle:61,range:3.3,harmonics:[1,.28,.68,.13,.44,.1,.23,.08,.1],bass:.16,whine:.065,whineRatio:6,flutter:.025,air:.035,cutoff:950,brightness:2000,shift:.1},
 sunbeam:{label:'Soft hum',idle:48,range:2.1,harmonics:[1,.13,.045,.02],bass:.12,whine:.009,whineRatio:2.8,flutter:.012,air:.004,cutoff:340,brightness:620,shift:.2},
 trail:{label:'Diesel rumble',idle:26,range:2.25,harmonics:[1,.9,.38,.12,.23,.12,.08],bass:.64,whine:.007,whineRatio:4,flutter:.2,air:.022,cutoff:480,brightness:740,shift:.24},
 palm:{label:'High-rev bark',idle:56,range:3.5,harmonics:[1,.3,.42,.16,.3,.12,.1],bass:.2,whine:.025,whineRatio:4.5,flutter:.035,air:.025,cutoff:820,brightness:1600,shift:.11},
 hatch:{label:'Compact buzz',idle:53,range:2.65,harmonics:[1,.7,.12,.4,.04,.13],bass:.11,whine:.012,whineRatio:3.7,flutter:.065,air:.008,cutoff:620,brightness:1000,shift:.16},
 van:{label:'Heavy diesel',idle:22,range:2,harmonics:[1,.86,.66,.25,.36,.17,.1,.08],bass:.74,whine:.005,whineRatio:5,flutter:.26,air:.038,cutoff:400,brightness:620,shift:.3},
 wagon:{label:'Smooth low note',idle:35,range:2.4,harmonics:[1,.32,.16,.08,.025],bass:.48,whine:.012,whineRatio:3.2,flutter:.045,air:.007,cutoff:430,brightness:850,shift:.21}
};
export const engineProfile=id=>ENGINE_PROFILES[id]||ENGINE_PROFILES.quay;

export function engineMix(car,listener,myId){
 const speed=Math.abs(finite(car.speed)),max=Math.max(1,finite(car.maxSpeed)||23),ratio=clamp(speed/max,0,1);
 const own=car.driver===myId,dx=finite(car.x)-listener.x,dz=finite(car.z)-listener.z,dist=Math.hypot(dx,dz);
 const attenuation=own?1:clamp(1-dist/55,0,1)**2*.62;
 const throttle=clamp(Math.abs(finite(car.throttle)),0,1),profile=engineProfile(car.id);
 const reverse=finite(car.speed)<-.5,gear=reverse?-1:Math.min(4,Math.floor(ratio*4.2)+1);
 const gearFraction=reverse?ratio:Math.max(0,ratio*4.2-(gear-1));
 const rev=clamp(gearFraction*.65+ratio*.22+throttle*.14,0,1);
 return {active:!!car.driver&&attenuation>.002,
  motorGain:(.12+throttle*.045+ratio*.015)*attenuation,bass:profile.bass,
  whineGain:profile.whine*(.1+rev*.45+throttle*.45)*attenuation,
  airGain:profile.air*(.12+throttle*.55+rev*.33)*attenuation,
  roadGain:(ratio*.018+(car.braking&&speed>3?.055:0))*attenuation,
  cutoff:profile.cutoff+rev*profile.brightness,gear,rev,throttle,speed,attenuation,
  frequency:profile.idle*(1+rev*profile.range),
  pan:own?0:clamp((dx*Math.cos(listener.yaw)-dz*Math.sin(listener.yaw))/24,-.85,.85)};
}

export class CarAudio{
 constructor({Context=globalThis.AudioContext||globalThis.webkitAudioContext,onStatus=()=>{}}={}){
  this.Context=Context;this.onStatus=onStatus;this.ctx=null;this.voices=new Map();this.enabled=true;this.volume=.55;this.lastUpdate=-Infinity;this.waves=new Map();this.preview=null;
 }
 async activate(){
  if(!this.enabled)return false;
  if(!this.Context){this.onStatus('unavailable');return false;}
  try{
   if(!this.ctx){
    this.ctx=new this.Context();const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.volume*.7;
    this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.knee.value=15;this.compressor.ratio.value=5;
    this.master.connect(this.compressor);this.compressor.connect(c.destination);
    this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);
    for(let n=0;n<data.length;n++)data[n]=Math.random()*2-1;
   }
   if(this.ctx.state==='suspended')await this.ctx.resume();
   this.onStatus(this.ctx.state==='running'?'on':'tap');return this.ctx.state==='running';
  }catch{this.onStatus('unavailable');return false;}
 }
 setEnabled(enabled){this.enabled=!!enabled;this.setVolume(this.volume);if(!enabled)this.clear();this.onStatus(enabled?'tap':'off');}
 setVolume(volume){this.volume=clamp(finite(volume),0,1);if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?this.volume*.7:0,this.ctx.currentTime,.04);}
 async previewEngine(id){
  if(!ENGINE_PROFILES[id]||!await this.activate())return false;
  this.clear();this.preview={id,start:this.ctx.currentTime};return true;
 }
 makeVoice(id){
  const c=this.ctx,profile=engineProfile(id),filter=c.createBiquadFilter(),gain=c.createGain(),bassGain=c.createGain(),whineGain=c.createGain(),roadGain=c.createGain(),roadFilter=c.createBiquadFilter(),airFilter=c.createBiquadFilter(),airGain=c.createGain(),flutterGain=c.createGain();
  const pan=c.createStereoPanner(),engine=c.createOscillator(),bass=c.createOscillator(),whine=c.createOscillator(),flutter=c.createOscillator(),noise=c.createBufferSource();
  filter.type='lowpass';filter.Q.value=.55;roadFilter.type='bandpass';roadFilter.frequency.value=1050;roadFilter.Q.value=.65;airFilter.type='bandpass';airFilter.frequency.value=id==='comet'?2700:id==='trail'?650:1400;airFilter.Q.value=.8;
  if(!this.waves.has(id)){const imag=Float32Array.from([0,...profile.harmonics]);this.waves.set(id,c.createPeriodicWave(new Float32Array(imag.length),imag));}
  engine.setPeriodicWave(this.waves.get(id));bass.type='sine';whine.type='sine';flutter.type='sine';
  gain.gain.value=roadGain.gain.value=airGain.gain.value=whineGain.gain.value=0;bassGain.gain.value=profile.bass;flutterGain.gain.value=profile.flutter*.02;
  engine.connect(filter);bass.connect(bassGain);bassGain.connect(filter);filter.connect(gain);gain.connect(pan);whine.connect(whineGain);whineGain.connect(pan);
  flutter.connect(flutterGain);flutterGain.connect(gain.gain);
  noise.buffer=this.noise;noise.loop=true;noise.connect(roadFilter);roadFilter.connect(roadGain);roadGain.connect(pan);noise.connect(airFilter);airFilter.connect(airGain);airGain.connect(pan);pan.connect(this.master);
  const sources=[engine,bass,whine,flutter,noise];for(const source of sources)source.start();
  const voice={engine,bass,whine,flutter,noise,filter,gain,bassGain,whineGain,roadGain,airGain,flutterGain,pan,profile,lastGear:null,lastThrottle:0,shiftUntil:0,releaseUntil:0,lastRelease:-Infinity,sources,
   nodes:[...sources,filter,gain,bassGain,whineGain,roadGain,roadFilter,airFilter,airGain,flutterGain,pan]};this.voices.set(id,voice);return voice;
 }
 update(cars,listener,myId){
  const c=this.ctx;if(!c||c.state!=='running'||!this.enabled)return;
  if(c.currentTime-this.lastUpdate<.035)return;this.lastUpdate=c.currentTime;
  if(this.preview){
   const elapsed=c.currentTime-this.preview.start;
   if(elapsed>=2.8){this.clear();}
   else{const speed=elapsed<.5?0:elapsed<2.2?(elapsed-.5)*11:Math.max(0,18-(elapsed-2.2)*20);
    cars=[{id:this.preview.id,driver:'preview',x:0,z:0,speed,maxSpeed:24,throttle:elapsed>.5&&elapsed<2.2?1:0}];listener={x:0,z:0,yaw:0};myId='preview';}
  }
  const active=new Set();
  for(const car of cars){
   const mix=engineMix(car,listener,myId);if(!mix.active)continue;active.add(car.id);const v=this.voices.get(car.id)||this.makeVoice(car.id),t=c.currentTime;
   if(v.lastGear!==null&&mix.gear>v.lastGear&&mix.speed>3)v.shiftUntil=t+v.profile.shift;
   if(car.id==='comet'&&v.lastThrottle>.6&&mix.throttle<.2&&mix.speed>5&&t-v.lastRelease>.3){v.releaseUntil=t+.2;v.lastRelease=t;}
   const shifting=t<v.shiftUntil,release=t<v.releaseUntil;
   v.engine.frequency.setTargetAtTime(mix.frequency,t,.085);v.bass.frequency.setTargetAtTime(mix.frequency*.5,t,.12);v.whine.frequency.setTargetAtTime(mix.frequency*v.profile.whineRatio,t,.14);v.flutter.frequency.setTargetAtTime(5+mix.rev*8,t,.15);
   v.filter.frequency.setTargetAtTime(mix.cutoff,t,.1);v.flutterGain.gain.setTargetAtTime(mix.motorGain*v.profile.flutter,t,.08);
   v.gain.gain.setTargetAtTime(mix.motorGain*(shifting?.62:1),t,.04);v.whineGain.gain.setTargetAtTime(mix.whineGain,t,.1);
   v.airGain.gain.setTargetAtTime(mix.airGain+((release||(shifting&&car.id==='comet'))?.06*mix.attenuation:0),t,.03);
   v.roadGain.gain.setTargetAtTime(mix.roadGain,t,.08);v.pan.pan.setTargetAtTime(mix.pan,t,.1);v.lastGear=mix.gear;v.lastThrottle=mix.throttle;
  }
  for(const id of this.voices.keys())if(!active.has(id))this.remove(id);
 }
 remove(id){const v=this.voices.get(id);if(!v)return;for(const source of v.sources)source.stop();for(const node of v.nodes)node.disconnect();this.voices.delete(id);}
 clear(){for(const id of [...this.voices.keys()])this.remove(id);this.preview=null;}
 pause(){this.clear();if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
 dispose(){this.clear();this.ctx?.close().catch(()=>{});this.ctx=null;this.waves.clear();this.lastUpdate=-Infinity;}
}
