const {game,seed}=require('./game.test.cjs'),assert=require('node:assert/strict');
function load(extra){const g=game(seed({collected:[],visited:['hub','palace','dragon','forest'],...extra}));g.act('continue');g.act('restore','auto');return g;}
const princess=load({scene:'palace'});
princess.act('princess-talk');const before=princess.library.autosave.narrative;
princess.act('back');assert.equal(princess.library.autosave.scene,'hub');assert.equal(princess.library.autosave.narrative,null);
const resumed=game(princess.storage);resumed.act('continue');resumed.act('restore','auto');resumed.act('scene','palace');resumed.act('princess-talk');assert.deepEqual(resumed.library.autosave.narrative.lines,before.lines);
resumed.finishText();assert.match(resumed.html,/我不是公主/);
for(const scene of ['palace','hub','forest']){
 const g=load({scene,collected:['lipstick'],quests:{princessMet:true,princessOffered:true,princessClaimed:['lipstick']}});
 g.act('bag');g.act('item','lipstick');g.act('discard','lipstick');g.act('discard-confirm');g.finishText();
 assert.equal(g.library.autosave.quests.princessDiscards,1);assert.ok(g.library.autosave.quests.princessReturned.includes('lipstick'));
 g.act('scene','palace');g.act('princess-talk');g.finishText();g.act('princess-reclaim-yes');g.finishText();g.act('gifts-all');g.finishText();assert.ok(g.library.autosave.collected.includes('lipstick'));
}
const food=['apple','grape','cabbage','ice_cream','dumpling','frost','plants','cat_food'];
const final=load({scene:'dragon',phase:'ready',collected:food,pot:food,dragonProgress:{stage:5,poisonSeen:true,talked:false}});
assert.match(final.html,/先和大龙说说话/);final.act('dragon-chat-first');final.finishText();
assert.equal(final.library.autosave.ending,null);assert.match(final.html,/准备好了，一起出发/);
final.act('departure-later');assert.equal(final.library.autosave.phase,'ready');assert.deepEqual(final.library.autosave.pot,food);
const restored=game(final.storage);restored.act('continue');restored.act('restore','auto');assert.match(restored.html,/和大龙一起出发/);
restored.act('talk');restored.act('departure-now');assert.equal(restored.library.autosave.ending,'six');
// Declining departure still permits the prepared ordinary recipe.
final.act('settings');final.act('close');final.act('potion-prompt');final.act('drink');assert.equal(final.library.autosave.ending,'two');
for(const hatTaken of [false,true]){
 const g=load({scene:'dragon',phase:'ready',collected:food,pot:food,quests:{hatTaken}});g.act('drink');
 const text=g.library.autosave.narrative.lines.find(line=>line.text.includes('傻不拉鸡不知什么时候'))?.text;
 assert.ok(text.includes(hatTaken?'光着小脑袋':'帽子戴得端端正正'));
 const reload=game(g.storage);reload.act('continue');reload.act('restore','auto');
 assert.ok(reload.library.autosave.narrative.lines.some(line=>line.text===text));
}
console.log('PASS: palace dialogue exit/resume, gift return across scenes, optional final departure with reload/ordinary brewing, conditional chicken hat.');
