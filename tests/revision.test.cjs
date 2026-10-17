const {game,seed,KEY}=require('./game.test.cjs');
const assert=require('node:assert/strict');
const achievementKey='little-magic-achievements-v1',readKey='little-magic-read-v1';
const achievement=JSON.stringify({unlocked:['ending_one'],collected:['apple'],discarded:9});
const storage={...seed({scene:'palace',visited:['palace'],round:4}),[achievementKey]:achievement,'unrelated-app':'keep'};
const g=game(storage);g.act('continue');g.act('restore','auto');g.act('settings');g.act('save-list');g.act('save-slot','0');
const before=storage[KEY];assert.doesNotMatch(g.html,/data-action="reset-data"/);g.act('reset-data');g.act('reset-confirm');assert.equal(storage[KEY],before);assert.equal(storage[achievementKey],achievement);
// Skipping must stop at unread content and must never skip an identity choice.
const a=game(seed({scene:'palace',visited:['palace']}));a.act('continue');a.act('restore','auto');a.act('princess-talk');
a.act('skip-read');assert.equal(a.library.autosave.narrative.index,0);
a.next();a.next();assert.equal(a.library.autosave.narrative.index,1); // First line completed/read.
const b=game({...seed({scene:'palace',visited:['palace']}),[readKey]:a.storage[readKey]});b.act('continue');b.act('restore','auto');b.act('princess-talk');b.act('skip-read');assert.equal(b.library.autosave.narrative.index,1);
b.finishText();assert.match(b.html,/我不是公主/);
// Updated long ending scripts survive save/reload and complete to the correct summary.
const ids=['apple','grape','cabbage','ice_cream','dumpling','frost','plants','cat_food'];
const e=game(seed({scene:'dragon',visited:['dragon'],phase:'ready',collected:ids,pot:ids}));e.act('continue');e.act('restore','auto');e.act('drink');assert.equal(e.library.autosave.ending,'two');
const lines=e.library.autosave.narrative.lines;assert.ok(lines.length>30);assert.ok(lines.some(l=>l.text.includes('大魔法厨师')));assert.ok(lines.some(l=>l.speaker==='tv'));assert.ok(lines.some(l=>l.speaker==='princess'));assert.ok(lines.some(l=>l.speaker==='cat'));assert.ok(lines.some(l=>l.speaker==='chicken'));
const resumed=game(e.storage);resumed.act('continue');resumed.act('restore','auto');assert.equal(resumed.library.autosave.narrative.lines.length,lines.length);resumed.finishText();assert.equal(resumed.library.autosave.endingStage,'summary');
for(const id of ['skincare','perfume','lipstick'])assert.deepEqual(Array.from(e.context.GameData.materials.find(m=>m.id===id).tags),['inedible','nonToxic']);
console.log('PASS: removed reset controls and preserved data, unread skipping and choices, document ending cast and long-story restoration, non-toxic gifts.');
