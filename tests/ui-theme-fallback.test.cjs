const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('src/ui-theme.css','utf8');
assert.match(css,/\.stage:not\(\.cover-menu\) \.dialogue\{background-color:rgba\(91,81,64,\.68\)!important\}/);
assert.match(css,/\.stage:not\(\.cover-menu\) button[^\n]+background-color:rgba\(147,129,96,\.9\)/);
assert.match(fs.readFileSync('index.html','utf8'),/href="src\/ui-theme.css"/);
console.log('PASS: dialogue and button colors apply without the JavaScript theme marker.');
