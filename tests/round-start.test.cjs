const {game,seed,KEY}=require('./game.test.cjs');
const assert=require('node:assert/strict');
const storage=seed({round:5,scene:'dragon',visited:['dragon'],collected:[]},['a','b','c','d']);
const lib=JSON.parse(storage[KEY]);
lib.slots[0]={state:{...lib.autosave,round:2,scene:'bath',visited:['bath']},date:'test'};
lib.slots[1]={state:{...lib.autosave,round:4,scene:'palace',visited:['palace']},date:'test'};
storage[KEY]=JSON.stringify(lib);
const old=game(storage);old.act('continue');old.act('restore','auto');assert.equal(old.library.autosave.round,5);
for(const [id,round,scene] of [['0',2,'bath'],['1',4,'palace']]){old.act('menu');old.act('continue');old.act('restore',id);assert.equal(old.library.autosave.round,round);assert.equal(old.library.autosave.scene,scene);}
old.act('menu');old.start();assert.equal(old.library.autosave.round,1);assert.equal(old.library.completed.length,4);assert.equal(old.library.slots[1].state.round,4);old.finishText();old.act('scene','dragon');old.finishText();old.act('talk');old.finishText();assert.equal(old.library.autosave.phase,'explore');assert.equal(old.library.autosave.ending,null);
old.act('next-round');assert.equal(old.library.autosave.round,2);
const reused=game(storage);reused.act('menu');reused.act('start');reused.act('reuse-name');assert.equal(reused.library.autosave.round,1);
console.log('PASS: new games and reused names begin at round one despite four past completions; autosave and individual manual saves retain their rounds; next round increments the current run; first-round dragon avoids final ending.');
