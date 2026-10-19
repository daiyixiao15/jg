const {game,seed}=require('./game.test.cjs');const assert=require('node:assert/strict');
for(const [ending,form] of [['one','pig'],['three','ugly']]){
 const lines=JSON.parse(JSON.stringify(game().context.GameEndingStory.endings[ending]));const first=lines.findIndex(l=>l.form===form);
 for(let index=first;index<lines.length;index++){
  const g=game(seed({phase:'ending',ending,endingStage:'story',scene:'dragon',narrative:{lines,index,shown:1000,after:'ending-story'}}));g.act('continue');g.act('restore','auto');
  if(index===first)assert.match(g.html,/ending-form-art transformation-reveal/);else assert.doesNotMatch(g.html,/class="ending-form-art/);
  if(lines[index].speaker==='player'&&!lines[index].setting&&!lines[index].hidePortrait)assert.match(g.html,/player-portrait ending-dialogue-portrait/);
 }
}
console.log('PASS: one enlarged reveal per ending, no repeated large portrait in later narration, and small portraits retained during player speech.');
