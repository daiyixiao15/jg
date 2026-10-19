const {game,seed}=require('./game.test.cjs'),assert=require('node:assert/strict');
for(const npc of ['dragon','cat','chicken','princess','fur','tv']){
 const lines=[{speaker:'player',text:'你好。'},{speaker:npc,text:'你好呀。'},{speaker:'player',text:'再说说吧。'},{text:'风轻轻吹过。'}];
 const storage=seed({scene:'forest',narrative:{lines,index:0,shown:99,after:''}});
 const g=game(storage);g.act('continue');g.act('restore','auto');
 for(let i=0;i<lines.length;i++){
  assert.match(g.html,/class="npc-portrait/ ,`${npc} line ${i}`);
  if(npc!=='dragon')assert.match(g.html,new RegExp(`data-npc="${npc}"`));
  if(i<lines.length-1){g.next();g.next();}
 }
 const restored=game(g.storage);restored.act('continue');restored.act('restore','auto');assert.match(restored.html,/class="npc-portrait/);
}
const solo=game(seed({narrative:{lines:[{speaker:'player',text:'这里没有别人。'}],index:0,shown:99,after:''}}));solo.act('continue');solo.act('restore','auto');assert.doesNotMatch(solo.html,/class="npc-portrait/);
console.log('PASS: NPC portraits persist on player/narrator lines, before the first NPC line, and after reload; solo text has no NPC.');
