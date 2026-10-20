const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
const clips=[],voices=[],events={};let decodes=0;
class Audio {constructor(src=''){this.src=src;this.plays=0;clips.push(this);}load(){} pause(){} play(){this.plays++;return Promise.resolve();}}
class AudioContext {
 constructor(options){assert.equal(options.latencyHint,'interactive');this.state='suspended';this.destination={};}
 createGain(){return {gain:{value:1},connect(){}};}
 decodeAudioData(){decodes++;return Promise.resolve({decoded:true});}
 resume(){this.state='running';return Promise.resolve();}
 createBufferSource(){const voice={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(voice);return voice;}
}
const context={Audio,AudioContext,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),document:{hidden:false,addEventListener(k,fn){(events[k]??=[]).push(fn);}},localStorage:{getItem(){return null;},setItem(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('src/cover-audio.js','utf8'),context);
const audio=context.GameCoverAudio.create();await new Promise(r=>setImmediate(r));assert.equal(decodes,3);
for(const handler of events.pointerdown)handler();
audio.click();audio.click();audio.lollipop();audio.splash();assert.equal(voices.length,4);assert.ok(voices.every(v=>v.started));assert.ok(clips.every(c=>!c.plays));
audio.setEffectsVolume(0);assert.ok(voices.every(v=>v.stopped));audio.lollipop();assert.equal(voices.length,4);
audio.setEffectsVolume(.4);audio.lollipop();assert.equal(voices.length,5);context.document.hidden=true;for(const handler of events.visibilitychange)handler();assert.ok(voices[4].stopped);audio.click();assert.equal(voices.length,5);
assert.ok(fs.statSync('assets/lollipop-click.mp3').size>0);
console.log('PASS: predecoded effects, independent rapid voices, gesture unlock, lollipop, mute and visibility.');
})();
