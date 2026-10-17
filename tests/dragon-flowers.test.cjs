const {game,seed}=require('./game.test.cjs');const assert=require('node:assert/strict');const AK='little-magic-achievements-v1';
const g=game(seed({scene:'dragon',visited:['dragon'],collected:[]}));g.act('continue');g.act('restore','auto');assert.match(g.html,/恶龙身下草坪里的花/);
const unlocked=x=>JSON.parse(x.storage[AK]||'{"unlocked":[]}').unlocked;
g.act('dragon-flowers');g.act('dragon-flowers');assert.ok(!unlocked(g).includes('dragon_flowers'));assert.equal(g.library.autosave.quests.clicks.dragon_flowers,2);
const reload=game(g.storage);reload.act('continue');reload.act('restore','auto');reload.act('dragon-flowers');assert.ok(unlocked(reload).includes('dragon_flowers'));assert.equal(reload.library.autosave.narrative,null);assert.equal(reload.library.autosave.phase,'explore');reload.act('dragon-flowers');assert.equal(unlocked(reload).filter(x=>x==='dragon_flowers').length,1);reload.act('next-round');assert.equal(reload.library.autosave.quests.clicks.dragon_flowers,undefined);assert.ok(unlocked(reload).includes('dragon_flowers'));
console.log('PASS: foreground flower hotspot, third-click achievement, saved click count, no dialogue conflict, one unlock and round-local counter.');
