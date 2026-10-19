const {game,seed}=require('./game.test.cjs'),assert=require('node:assert/strict');
const g=game(seed({scene:'hub',visited:['hub'],collected:['apple']}));g.act('continue');g.act('restore','auto');g.act('tv-chat');
const initial=g.library.autosave.narrative.index;
g.act('settings');assert.match(g.html,/<h2>设置<\/h2>/);assert.equal(g.library.autosave.narrative.index,initial);g.act('close');
g.act('bag');assert.match(g.html,/aria-label="背包"/);assert.equal(g.library.autosave.narrative.index,initial);g.act('item','apple');assert.match(g.html,/冰果/);assert.equal(g.library.autosave.narrative.index,initial);g.act('close');g.act('bag');
g.act('skip-read');assert.doesNotMatch(g.html,/已经到达未读内容/);assert.equal(g.library.autosave.narrative.index,initial);
const opening=game();opening.start();opening.act('settings');assert.match(opening.html,/<h2>设置<\/h2>/);assert.equal(opening.library.autosave.narrative.index,0);
const lines=JSON.parse(JSON.stringify(g.context.GameEndingStory.endings.two)),park=lines.findIndex(l=>l.setting==='park');
const chef=game(seed({phase:'ending',ending:'two',endingStage:'story',narrative:{lines,index:0,shown:0,after:'ending-story'}}));chef.act('continue');chef.act('restore','auto');
for(let i=0;i<park;i++){assert.match(chef.html,/background-image:url\(assets\/ending-chef-spoon.jpg\)/);assert.doesNotMatch(chef.html,/class="(?:player-portrait|npc-portrait)/);chef.next();chef.next();}
assert.match(chef.html,/chef-park-empty-q85.webp/);assert.doesNotMatch(chef.html,/ending-chef-spoon.jpg/);
const old=game(seed({phase:'ending',ending:'two',endingStage:'story',narrative:{lines,index:12,shown:0,after:'ending-story'}}));old.act('continue');old.act('restore','auto');assert.match(old.html,/ending-chef-spoon.jpg/);
console.log('PASS: settings/backpack preserve narrative, silent unread stop, prologue controls, chef CG range and old-save restoration.');
