const {game,seed}=require('./game.test.cjs'),assert=require('node:assert/strict');const lines=JSON.parse(JSON.stringify(game().context.GameEndingStory.endings.two));const start=lines.findIndex(l=>l.setting==='park');const seen=new Set();
const npcs=new Set(['tv','cat','princess','dragon','chicken','fur']);
for(let index=start;index<lines.length;index++){
 const line=lines[index];const g=game(seed({phase:'ending',ending:'two',endingStage:'story',narrative:{lines,index,shown:999,after:'ending-story'}}));g.act('continue');g.act('restore','auto');
 assert.match(g.html,/class="npc-portrait/,`park line ${index} keeps the conversation partner after restore`);
 if(npcs.has(line.speaker)){assert.ok(g.html.includes(`data-npc="${line.speaker}"`),`${line.speaker} speaks with their portrait`);seen.add(line.speaker);}
}
assert.deepEqual([...seen].sort(),[...npcs].sort());
const opening=game(seed({phase:'ending',ending:'two',endingStage:'story',narrative:{lines,index:0,shown:999,after:'ending-story'}}));opening.act('continue');opening.act('restore','auto');assert.doesNotMatch(opening.html,/class="npc-portrait/);

console.log('PASS: chef park NPC dialogue and restored lines retain portraits for all six speakers; opening CG remains unchanged.');
