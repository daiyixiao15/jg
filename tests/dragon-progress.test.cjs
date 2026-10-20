const {game,seed,KEY}=require('./game.test.cjs');
const assert=require('node:assert/strict');
const food=['apple','grape','cabbage','ice_cream','dumpling','frost','plants','cat_food'];
function load(extra={}){const g=game(seed({scene:'dragon',visited:['lab','dragon'],collected:food,...extra}));g.act('continue');g.act('restore','auto');return g;}
function finishRound(g){g.act('drink');g.finishText();g.act('ending-next');g.act('ending-next');g.act('next-round');g.finishText();}
const quiet=load({phase:'ready',pot:food,round:1,dragonProgress:{stage:1,poisonSeen:false,talked:false}});
finishRound(quiet);assert.equal(quiet.library.autosave.round,2);assert.equal(quiet.library.autosave.dragonProgress.stage,1);
quiet.act('scene','dragon');quiet.finishText();quiet.act('talk');quiet.finishText();assert.equal(quiet.library.autosave.dragonProgress.stage,1);assert.equal(quiet.library.autosave.dragonProgress.talked,true);
quiet.act('talk');quiet.finishText();assert.equal(quiet.library.autosave.dragonProgress.stage,1);
const talked=load({...quiet.library.autosave,phase:'ready',collected:food,pot:food,scene:'dragon'});finishRound(talked);assert.equal(talked.library.autosave.dragonProgress.stage,2);
// An advanced playthrough number cannot bypass the poison ending prerequisite.
const waiting=load({round:12,dragonProgress:{stage:4,poisonSeen:false,talked:false}});waiting.act('talk');waiting.finishText();assert.equal(waiting.library.autosave.quests.ladder,true);assert.notEqual(waiting.library.autosave.ending,'six');
const saved=waiting.library.autosave;
const again=load({...saved,phase:'ready',scene:'dragon',pot:food});finishRound(again);assert.equal(again.library.autosave.dragonProgress.stage,4);again.act('scene','dragon');again.finishText();again.act('talk');assert.ok(again.library.autosave.narrative.lines.some(l=>l.text.includes('梯子')));again.finishText();
const poison=['apple','grape','cabbage','ice_cream','dumpling','frost','plants','bleach'];
const poisoned=load({phase:'ready',pot:poison,collected:poison,dragonProgress:{stage:4,poisonSeen:false,talked:true}});poisoned.act('drink');assert.equal(poisoned.library.autosave.ending,'five');assert.equal(poisoned.library.autosave.dragonProgress.poisonSeen,true);
// Continue from the completed poison ending; the next conversation can be the final one.
const next=load({...poisoned.library.autosave,endingStage:'fin',narrative:null,cinematic:null});next.act('ending-next');next.act('next-round');next.finishText();assert.equal(next.library.autosave.dragonProgress.stage,5);next.act('scene','dragon');next.finishText();next.act('talk');next.finishText();next.act('departure-now');assert.equal(next.library.autosave.ending,'six');
const lab=load({scene:'lab',phase:'explore'});assert.doesNotMatch(lab.html,/data-action="back"/);lab.act('scene','bath');lab.finishText();assert.match(lab.html,/data-action="back"/);
// Names are editable independently of player ID, survive overwrites and reloads.
lab.act('settings');lab.act('save-list');lab.act('save-slot','0');lab.act('save-list');lab.act('rename-save','0');
const original=lab.context.document.getElementById;let newName='我的梯子冒险';lab.context.document.getElementById=id=>id==='save-name'?{value:newName}:original(id);
lab.act('rename-confirm');assert.equal(lab.library.slots[0].name,newName);lab.act('save-slot','0');assert.equal(lab.library.slots[0].name,newName);
const reload=game(lab.storage);reload.act('continue');assert.match(reload.html,/我的梯子冒险/);assert.equal(reload.library.slots[0].state.playerName,'测试');
lab.act('load-list');lab.act('rename-save','auto');newName='自动旅程';lab.act('rename-confirm');assert.equal(lab.library.autosaveName,newName);lab.act('close');lab.act('scene','sky');lab.finishText();assert.equal(lab.library.autosaveName,newName);
console.log('PASS: no-talk round holds story, repeated talk does not advance, ladder story repeats until poison, poison prerequisite carried within save, lab-only back removal, automatic/manual rename and overwrite persistence.');
