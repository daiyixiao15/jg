const assert=require('node:assert/strict'),fs=require('node:fs');
const {game}=require('./game.test.cjs');
const g=game();g.start();
const expected=['storybook-page-1-q85.webp','storybook-page-2-q85.webp','storybook-page-3-q85.webp','storybook-dragon-resting-lossless.webp','storybook-dragon.jpg','storybook-dragon.jpg','storybook-magic-lossless.webp','storybook-journey-lossless.webp','storybook-journey-lossless.webp'];
for(let i=0;i<expected.length;i++){
 assert.equal(g.library.autosave.narrative.index,i);
 assert.ok(g.html.includes('assets/'+expected[i]),'illustration for line '+i);
 assert.doesNotMatch(g.html,/class="(?:player-portrait|npc-portrait)/);
 if(i>0&&expected[i]!==expected[i-1])assert.match(g.html,/class="book-physics-canvas"/);
 if(i>0&&expected[i]===expected[i-1])assert.doesNotMatch(g.html,/class="book-physics-canvas"/);
 if(i===6){const resumed=game({...g.storage});resumed.act('continue');resumed.act('restore','auto');assert.ok(resumed.html.includes(expected[i]));assert.doesNotMatch(resumed.html,/class="(?:player-portrait|npc-portrait)/);}
 g.next();
}
assert.equal(g.library.autosave.phase,'explore');
for(const file of new Set(expected))assert.ok(fs.existsSync('assets/'+file));
console.log('PASS: all prologue dialogue groups use matching illustrations, page turns only on picture changes, no portraits, reload and lab transition.');
