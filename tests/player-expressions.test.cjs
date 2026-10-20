const {game,seed}=require('./game.test.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=game(),N=base.context.GameNpcStory;
const actual=[];
function collect(value){if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object'){if(value.speaker==='player')actual.push(value.text);else Object.values(value).forEach(collect);}}
collect(base.context.GameExpansion);
let count=0;
for(const [expression,texts] of Object.entries(N.playerExpressions)){
 assert.ok(fs.statSync(`assets/player-${expression}.webp`).size<250000);
 for(const text of texts){
  assert.ok(actual.includes(text),`approved text exists: ${text}`);
  const lines=[{speaker:'player',text},{speaker:'player',text:'普通回答。'}];
  const g=game(seed({scene:'forest',narrative:{lines,index:0,shown:999,after:''}}));
  g.act('continue');g.act('restore','auto');
  assert.ok(g.html.includes(`src="assets/player-${expression}.webp"`),text);
  g.next();assert.match(g.html,/src="assets\/player-default.webp"/,'next ordinary line resets expression');count++;
 }
}
assert.equal(count,35);
assert.equal(N.playerExpressions.scared.length,3,'only the three approved scared lines');
assert.equal(N.playerPortrait({speaker:'tv',text:'呀！'}),'player-default.webp');
for(const [form,file]of [['chef','player-chef.png'],['pig','ending-pig.png'],['ugly','ending-ugly.png'],['beast','red-dragon.png']]){
 const g=game(seed({scene:'dragon',narrative:{lines:[{speaker:'player',text:'呀！',form}],index:0,shown:99,after:''}}));
 g.act('continue');g.act('restore','auto');assert.ok(g.html.includes(file),`${form} retains transformed portrait`);
}
console.log('PASS: all 35 approved expressions render after restore, ordinary lines reset to default, compressed assets and transformed forms remain correct.');
