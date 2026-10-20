const assert=require('node:assert/strict');const {game,seed}=require('./game.test.cjs');
function start(choice='chicken-hold'){const g=game(seed({scene:'forest',visited:['forest'],collected:[]}));g.act('continue');g.act('restore','auto');g.act('inspect','fallen_leaves');g.finishText();g.act(choice);return g;}
const held=start();assert.ok(held.library.autosave.narrative.lines.some(l=>l.text==='这个名字……挺好记的。'));assert.ok(!held.library.autosave.narrative.lines.some(l=>l.text.includes('哈哈')));
const laughed=start('chicken-laugh');assert.ok(laughed.library.autosave.narrative.lines[0].text.includes('草地'));assert.ok(!laughed.library.autosave.narrative.lines.some(l=>l.text.includes('雷霆')));
for(const method of ['chicken-grab','chicken-plead'])for(const outcome of ['chicken-return','chicken-keep']){
let g=start();g.finishText();g.act(method);g.finishText();g=game(g.storage);g.act('continue');g.act('restore','auto');g.act(outcome);
const lines=g.library.autosave.narrative.lines,text=lines.map(l=>l.text).join('\n');
assert.ok(text.includes('放进锅里以后'));assert.ok(text.includes('等我到了新世界，再从新世界给你带一顶'));assert.ok(!text.includes('先借走'));
if(outcome==='chicken-keep'){assert.equal(text.includes('明明是抢的'),method==='chicken-grab');assert.equal(text.includes('我还一直拿着不还给你'),method==='chicken-plead');}
g.finishText();assert.ok(g.library.autosave.collected.includes('fallen_leaves'));
const random=g.context.GameExpansion.chickenRandom;assert.equal(random.length,4);assert.ok(random[0][0].text.includes('新世界'));assert.ok(random[2][0].text.includes('新世界'));assert.ok(random[1][0].text.includes('蝴蝶'));assert.ok(random[3][0].text.includes('聪明'));
}
console.log('PASS: distinct hold/laugh, four hat branches after reload, potion consent, new-world promise and preserved random dialogue pool.');
