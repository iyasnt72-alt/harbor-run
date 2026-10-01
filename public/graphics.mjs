import * as THREE from '/three.module.js';
import {EffectComposer} from './vendor/effects/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/effects/postprocessing/RenderPass.js';
import {SSAOPass} from './vendor/effects/postprocessing/SSAOPass.js';
import {UnrealBloomPass} from './vendor/effects/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/effects/postprocessing/OutputPass.js';

// Keep the expensive normal/depth pass at half resolution. Low and mobile
// Auto use the direct renderer; switching to Low releases the effect buffers.
export function createGraphics(renderer, scene, camera) {
 let composer=null, ao, bloom;
 renderer.info.autoReset=false;
 // Only the beauty pass updates shadows. The AO normal pass reuses that map.
 renderer.shadowMap.autoUpdate=false;
 function release(){
  if(!composer)return;
  for(const pass of composer.passes)pass.dispose?.();
  composer.dispose();composer=null;
 }
 return {
  configure(quality,phone,width,height){
   const enabled=quality==='high'||(quality==='auto'&&!phone);
   if(!enabled){release();return;}
   if(!composer){
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
    composer=new EffectComposer(renderer,target);
    composer.addPass(new RenderPass(scene,camera));
    ao=new SSAOPass(scene,camera,1,1,16);
    const resizeAO=ao.setSize.bind(ao);
    ao.setSize=(w,h)=>resizeAO(Math.max(1,Math.round(w*.5)),Math.max(1,Math.round(h*.5)));
    ao.kernelRadius=1.7;ao.minDistance=.0004;ao.maxDistance=.014;
    composer.addPass(ao);
    bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.14,.35,1.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
   }
   ao.enabled=quality==='high';
   composer.setPixelRatio(renderer.getPixelRatio());
   composer.setSize(width,height);
  },
  render(dt){renderer.info.reset();renderer.shadowMap.needsUpdate=true;if(composer)composer.render(dt);else renderer.render(scene,camera);},
  dispose:release
 };
}
