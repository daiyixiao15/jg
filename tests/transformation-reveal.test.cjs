const {game,seed}=require('./game.test.cjs');const assert=require('node:assert/strict');
for(const [ending,form,file] of [['one','pig','ending-pig.png']]){
 const base=game(),lines=JSON.parse(JSON.stringify(base.context.GameEndingStory.endings[ending])),index=lines.findIndex(l=>l.form===form);
 const g=game(seed({phase:'ending',ending,endingStage:'story',scene:'dragon',narrative:{lines,index:index-1,shown:1000,after:'ending-story'}}));g.act('continue');g.act('restore','auto');assert.doesNotMatch(g.html,/transformation-reveal/);g.next();assert.match(g.html,/ending-form-art transformation-reveal/);assert.ok(g.html.includes(file));assert.equal(g.library.autosave.narrative.index,index);
 const restored=game(g.storage);restored.act('continue');restored.act('restore','auto');assert.match(restored.html,/transformation-reveal/);
 g.next();assert.match(g.html,/transformation-reveal/);g.next();assert.doesNotMatch(g.html,/transformation-reveal/);g.finishText();assert.equal(g.library.autosave.endingStage,'summary');assert.doesNotMatch(g.html,/ending-form-art/);
}
for(const ending of ['two','four']){const base=game(),lines=JSON.parse(JSON.stringify(base.context.GameEndingStory.endings[ending]));const index=lines.findIndex(l=>l.form);const g=game(seed({phase:'ending',ending,scene:'dragon',endingStage:'story',narrative:{lines,index,shown:0,after:'ending-story'}}));g.act('continue');g.act('restore','auto');assert.doesNotMatch(g.html,/transformation-reveal/);if(ending==='four')assert.match(g.html,/ending-bubble-q85.webp/);}
console.log('PASS: pig transformation reveal, reload and progression; other CG endings do not show a reveal portrait.');
