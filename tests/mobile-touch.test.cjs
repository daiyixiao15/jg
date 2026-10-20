const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/game.js','utf8');const appEvents={},windowEvents={};let clicks=0;
const control={click(){clicks++;}},other={click(){clicks++;}};
const context={app:{addEventListener(k,fn){appEvents[k]=fn;}},window:{addEventListener(k,fn){windowEvents[k]=fn;}},drag:null,state:{phase:'explore'},modal:null,suppressClickUntil:0,Date,Math};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  let touchPress=null;'),source.indexOf('  function finishDrag(')),context);
function event(x,y,button=control){return {pointerType:'touch',pointerId:1,clientX:x,clientY:y,button:0,target:{closest(selector){return selector==='[data-action]'?button:null;}},preventDefault(){}};}
appEvents.pointerdown(event(20,20));appEvents.pointerup(event(22,22));assert.equal(clicks,1);
appEvents.pointerdown(event(20,20));windowEvents.pointermove(event(20,80));appEvents.pointerup(event(20,80));assert.equal(clicks,1);
appEvents.pointerdown(event(20,20));windowEvents.pointermove(event(20,80));appEvents.pointerup(event(20,20));assert.equal(clicks,1);
appEvents.pointerdown(event(20,20));appEvents.pointerup(event(20,20,other));assert.equal(clicks,1);
console.log('PASS: mobile taps activate once; scrolling, returning swipes and changed controls do not activate.');
