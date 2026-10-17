const {game,seed}=require('./game.test.cjs');const assert=require('node:assert/strict');
const base=game();
for(const ending of ['two','five','six'])for(const taken of [false,true]){
 const lines=[{speaker:'chicken',text:'咕咕！'}];const g=game(seed({phase:'ending',ending,endingStage:'story',endingReality:false,scene:'dragon',quests:{hatTaken:taken},narrative:{lines,index:0,shown:0,after:'ending-story'}}));g.act('continue');g.act('restore','auto');assert.match(g.html,/assets\/chicken-dialogue.png/);assert.doesNotMatch(g.html,/assets\/chicken-hat-dialogue.png/);
}
const oldLine='你低头一看，傻不拉鸡不知什么时候已经站在桌边，帽子戴得端端正正，面前摆着一只空碗。';const old=game(seed({phase:'ending',ending:'two',endingStage:'story',scene:'dragon',narrative:{lines:[{text:oldLine}],index:0,shown:999,after:'ending-story'}}));old.act('continue');old.act('restore','auto');assert.doesNotMatch(old.html,/帽子戴得端端正正/);assert.match(old.html,/光着小脑袋/);
for(const collected of [[],['fallen_leaves']]){const g=game(seed({scene:'forest',collected,quests:{hatTaken:false,chickenStage:'done'},narrative:{lines:[{speaker:'chicken',text:'咕咕！'}],index:0,shown:0,after:''}}));g.act('continue');g.act('restore','auto');assert.match(g.html,/assets\/chicken-dialogue.png/);}
console.log('PASS: ending chicken always uses hatless dialogue art, old ending text is repaired, completed handovers stay hatless after discarding or loading.');
