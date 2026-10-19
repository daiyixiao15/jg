const {game,seed}=require('./game.test.cjs'),assert=require('node:assert/strict');const lines=JSON.parse(JSON.stringify(game().context.GameEndingStory.endings.two));const start=lines.findIndex(l=>l.setting==='park');const seen=new Set();
for(let index=start;index<lines.length;index++){const line=lines[index];const g=game(seed({phase:'ending',ending:'two',endingStage:'story',narrative:{lines,index,shown:999,after:'ending-story'}}));g.act('continue');g.act('restore','auto');assert.doesNotMatch(g.html,/class="npc-portrait/);}

console.log('PASS: chef CGs never overlay NPC portraits, including first arrival dialogue.');
