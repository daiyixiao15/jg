const {game,seed}=require('./game.test.cjs'),assert=require('node:assert/strict');
const lines=JSON.parse(JSON.stringify(game().context.GameEndingStory.endings.one));
const start=lines.findIndex(line=>line.text==='哼唧！哼唧哼唧！');
const end=lines.findIndex(line=>line.text.startsWith('大龙没有喷火，也没有赶你走。'));
assert.equal(end-start,2);
assert.ok(lines[start+1].text.includes('一头扎进泥巴里'));
assert.ok(!lines.some(line=>line.text.includes('一屁股坐进草里')));
for(let index=start-1;index<=end+1;index++){
 const g=game(seed({phase:'ending',ending:'one',endingStage:'story',scene:'dragon',narrative:{lines,index,shown:999,after:'ending-story'}}));
 g.act('continue');g.act('restore','auto');
 if(index>=start&&index<=end){
  assert.match(g.html,/background-image:url\(assets\/ending-pig-mud.png\)/);
  assert.doesNotMatch(g.html,/class="(?:player-portrait|npc-portrait|ending-form-art)/);
  if(index===end){g.next();assert.doesNotMatch(g.html,/ending-pig-mud.png/);assert.match(g.html,/data-npc="dragon"/);}
 }else assert.doesNotMatch(g.html,/ending-pig-mud.png/);
}
console.log('PASS: pig mud CG covers the three requested lines, restores correctly, hides portraits, exits to dialogue and uses the new mud wording.');
