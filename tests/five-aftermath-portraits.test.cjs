const {game,seed}=require('./game.test.cjs');const assert=require('node:assert/strict');
function load(lines,index=0,after='ending-story'){const g=game(seed({phase:'ending',ending:'five',endingReality:false,endingStage:'story',scene:'dragon',narrative:{lines:JSON.parse(JSON.stringify(lines)),index,shown:0,after}}));g.act('continue');g.act('restore','auto');return g;}
const base=game(),X=base.context.GameExpansion;
for(const legacy of [false,true]){
 const lines=JSON.parse(JSON.stringify(X.fiveAfterHit));if(legacy)for(const l of lines){l.form='beast';delete l.hidePortrait;}
 const g=load(lines);
 for(let i=0;i<lines.length;i++){assert.equal(g.library.autosave.narrative.index,i);assert.doesNotMatch(g.html,/red-dragon.png|class="player-portrait"|class="ending-form-art/);g.next();g.next();}
 assert.equal(g.library.autosave.endingStage,'gate');assert.doesNotMatch(g.html,/red-dragon.png/);g.act('ending-gate');assert.doesNotMatch(g.html,/red-dragon.png|class="player-portrait"/);g.finishText();assert.match(g.html,/gate-ready/);
}
const before=load(X.fiveStart,2,'five-hit');assert.match(before.html,/red-dragon.png/);
console.log('PASS: new and old saves hide all beast/player portraits from dragon collapse through gate dialogue; pre-hit transformation retains red beast portrait.');
