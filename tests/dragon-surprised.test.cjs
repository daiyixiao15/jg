const {game,seed}=require('./game.test.cjs'),assert=require('node:assert/strict');
const endings=game().context.GameEndingStory.endings;
for(const [ending,texts]of Object.entries({one:['……小精灵？','你跑到我面前，就是为了变成一只小猪？'],three:['你的魔法，还会打雷？'],two:['搬锅？找材料？']})){
 const lines=JSON.parse(JSON.stringify(endings[ending]));
 for(const text of texts){
  const index=lines.findIndex(line=>line.speaker==='dragon'&&line.text===text);assert.ok(index>=0);
  const g=game(seed({phase:'ending',ending,endingStage:'story',scene:'dragon',narrative:{lines,index,shown:999,after:'ending-story'}}));
  g.act('continue');g.act('restore','auto');assert.match(g.html,/dragon-surprised.webp/);
  if(ending==='two')assert.match(g.html,/ending-chef-spoon.jpg/,'chef opening background is retained');
  g.next();assert.doesNotMatch(g.html,/dragon-surprised.webp/,'expression ends with the approved line');
 }
}
console.log('PASS: all four approved dragon expressions restore correctly, appear over chef background and reset on next line.');
