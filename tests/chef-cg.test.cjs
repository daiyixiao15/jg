const {game,seed}=require('./game.test.cjs');
const assert=require('node:assert/strict');
const base=game(),lines=JSON.parse(JSON.stringify(base.context.GameEndingStory.endings.two));
const files=['chef-park-empty-q85.webp','chef-park-tv-q85.webp','chef-park-cat-q85.webp','chef-park-princess-q85.webp','chef-park-dragon-q85.webp','chef-park-all-q85.webp'];
const stages={tv:1,cat:2,princess:3,dragon:4,chicken:5};let stage=0;
const start=lines.findIndex(l=>l.setting==='park');
const g=game(seed({phase:'ending',ending:'two',endingStage:'story',narrative:{lines,index:start,shown:0,after:'ending-story'}}));g.act('continue');g.act('restore','auto');
for(let i=start;i<lines.length;i++){
 assert.equal(g.library.autosave.narrative.index,i);assert.ok(g.html.includes('background-image:url(assets/'+files[stage]+')'),i+': '+lines[i].text);
 g.next();assert.ok(g.html.includes('background-image:url(assets/'+files[stage]+')'),'typing completion must not reveal arrival');
 if(stages[lines[i].speaker])stage=Math.max(stage,stages[lines[i].speaker]);
 g.next();
 if(i<lines.length-1){const restored=game(g.storage);restored.act('continue');restored.act('restore','auto');assert.ok(restored.html.includes('background-image:url(assets/'+files[stage]+')'),'saved CG');}
}
assert.equal(stage,5);assert.equal(g.library.autosave.endingStage,'summary');assert.ok(!g.html.includes('background-image:url(assets/chef-park-'));
console.log('PASS: six chef CG stages, reveal after dialogue advancement, no early reveals, full meal story, save restoration at every line and clean ending summary.');
