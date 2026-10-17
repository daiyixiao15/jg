const {game,seed}=require('./game.test.cjs');
const assert=require('node:assert/strict');
function load(extra){const g=game(seed({scene:'dragon',visited:['dragon'],...extra}));g.act('continue');g.act('restore','auto');return g;}
const ingredients=['apple','grape','cabbage','ice_cream','dumpling','shampoo','body_wash','detergent'];
const bubble=load({phase:'ready',collected:ingredients,pot:ingredients});bubble.act('drink');assert.equal(bubble.library.autosave.ending,'four');
while(bubble.library.autosave.narrative){
 assert.match(bubble.html,/background-image:url\(assets\/ending-bubble.jpg\)/);
 assert.doesNotMatch(bubble.html,/class="(?:player-portrait|npc-portrait|ending-form-art)/);
 const n=bubble.library.autosave.narrative;const restored=load(bubble.library.autosave);assert.equal(restored.library.autosave.narrative.index,n.index);assert.match(restored.html,/ending-bubble.jpg/);
 bubble.next();
}
assert.equal(bubble.library.autosave.endingStage,'summary');assert.doesNotMatch(bubble.html,/ending-bubble.jpg/);
const X=bubble.context.GameExpansion;
assert.ok(X.fiveHospital.some(l=>l.text.includes('不小心食用了妈妈放在浴室高处的清洁剂')));
assert.equal(X.fiveHospital.at(-1).text,'你笑了笑没有多想，转回头更紧地环住了妈妈的脖子。');
assert.equal(X.easter.at(-1).text,'她会回来的，只要童心未泯。');assert.ok(X.easter.some(l=>l.text==='她也答应过我要回来讲她的冒险故事。'));
for(const [lines,after,stage] of [[X.fiveWake,'five-wake','light-story'],[X.fiveHospital,'five-finish','story'],[X.easter,'easter-finished','easter']]){
 for(let index=0;index<lines.length;index++){
  const l=lines[index],g=load({phase:'ending',ending:stage==='easter'?'six':'five',endingStage:stage,endingReality:stage!=='easter',narrative:{lines,index,shown:0,after}});
  if(l.setting==='black'){assert.doesNotMatch(g.html,/background-image:url/);assert.match(g.html,/centered-message/);assert.doesNotMatch(g.html,/class="dialogue/);}
  else assert.match(g.html,new RegExp('assets/'+({ceiling:'ending-ceiling.png',home:'ending-home.png','home-lookback':'ending-home.jpg',peek:'ending-easter.jpg'})[l.setting]));
 }
}
console.log('PASS: bubble CG throughout dialogue without portraits, clean ending summary, final document wording, ceiling/home/easter background order and per-line save restoration.');
