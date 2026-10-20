const assert=require('node:assert/strict'),fs=require('node:fs');
const {game,seed}=require('./game.test.cjs');
const g=game(seed());g.act('continue');g.act('restore','auto');g.finishText();g.act('bag');
const inventory=g.html.match(/<aside class="inventory"[\s\S]*?<\/aside>/)[0];
assert.equal((inventory.match(/assets\/item-icons\//g)||[]).length,8);
assert.doesNotMatch(inventory,/<svg|<image /);
g.act('item','apple');assert.match(g.html,/href="assets\/ice-fruit.png"/);
const source=fs.readFileSync('src/game.js','utf8');
const mapping=source.match(/const itemImages=\{([^}]+)\}/)[1];let originals=0,icons=0;
for(const [,id,file] of mapping.matchAll(/(\w+):'([^']+)'/g)){
const icon=fs.readFileSync('assets/item-icons/'+id+'.webp');assert.equal(icon.toString('ascii',8,12),'WEBP');
icons+=icon.length;originals+=fs.statSync('assets/'+file).size;
}
assert.ok(icons<originals*.15);console.log(`PASS: inventory uses compact icons, details retain originals; icon bytes ${icons} vs ${originals}.`);
