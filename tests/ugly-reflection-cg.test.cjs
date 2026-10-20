const {game,seed}=require('./game.test.cjs');
const assert=require('node:assert/strict');
const lines=JSON.parse(JSON.stringify(game().context.GameEndingStory.endings.three));
const start=lines.findIndex(line=>line.text.startsWith('你还没来得及放下瓶子'));
const end=lines.findIndex(line=>line.text==='好吧，是我。');
for(let index=start-1;index<=end+1;index++){
 const g=game(seed({phase:'ending',ending:'three',endingStage:'story',scene:'dragon',narrative:{lines,index,shown:999,after:'ending-story'}}));
 g.act('continue');g.act('restore','auto');
 if(index>=start&&index<=end){
  assert.match(g.html,/background-image:url\(assets\/ending-ugly-reflection.png\)/);
  assert.doesNotMatch(g.html,/class="(?:player-portrait|npc-portrait|ending-form-art)/);
  if(index===end){g.next();assert.doesNotMatch(g.html,/ending-ugly-reflection.png/);}
 }else assert.doesNotMatch(g.html,/ending-ugly-reflection.png/);
}
const dragon=lines.findIndex(line=>line.speaker==='dragon');
const normal=game(seed({phase:'ending',ending:'three',endingStage:'story',scene:'dragon',narrative:{lines,index:dragon,shown:999,after:'ending-story'}}));
normal.act('continue');normal.act('restore','auto');
assert.match(normal.html,/data-npc="dragon"/);assert.match(normal.html,/ending-ugly.png/);
console.log('PASS: ugly reflection CG spans the requested text, restores at every line, hides portraits and exits into ordinary dialogue.');
