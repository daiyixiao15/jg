const {game,seed}=require('./game.test.cjs');
const assert=require('node:assert/strict');
const base=game(),lines=JSON.parse(JSON.stringify(base.context.GameEndingStory.endings.one));
const reveal=lines.findIndex(line=>line.form==='pig'&&!line.speaker);
assert.ok(reveal>=0);
function load(index,storage){const g=game(storage||seed({phase:'ending',ending:'one',endingStage:'story',scene:'dragon',narrative:{lines,index,shown:0,after:'ending-story'}}));g.act('continue');g.act('restore','auto');return g;}
for(let index=0;index<=reveal;index++){
 const g=load(index);assert.doesNotMatch(g.html,/data-npc="dragon"/);
 const restored=load(index,g.storage);assert.doesNotMatch(restored.html,/data-npc="dragon"/);
 if(index===reveal)assert.match(g.html,/ending-form-art/);
}
const speaking=lines.findIndex(line=>line.speaker==='dragon');assert.ok(speaking>reveal);assert.match(load(speaking).html,/data-npc="dragon"/);
console.log('PASS: no dragon portrait from pig ending start through transformation; pig reveal and later dragon dialogue retained; restored saves match.');
