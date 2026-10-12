const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let html='',click,submit,keydown,name='测试精灵',intervals=[],timeouts=[],saved=null;
const app={set innerHTML(v){html=v},get innerHTML(){return html},addEventListener(type,fn){if(type==='click')click=fn;if(type==='submit')submit=fn}};
const ctx={document:{getElementById(id){return id==='app'?app:id==='player-name'?{value:name,focus(){}}:{textContent:''}},addEventListener(t,f){keydown=f}},localStorage:{getItem(){return saved},setItem(k,v){saved=v}},setInterval(f){intervals.push(f);return intervals.length},clearInterval(){},setTimeout(f){timeouts.push(f);return timeouts.length},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data','rules','game'])vm.runInContext(fs.readFileSync('src/'+f+'.js','utf8'),ctx);
function act(action,id){click({target:{closest(){return {dataset:{action,id},disabled:false}}}})}
function next(){click({target:{closest(){return null}}})}
assert.match(html,/>开始</);assert.match(html,/>继续</);act('start');assert.match(html,/player-name/);submit({target:{id:'name-form'},preventDefault(){}});for(let i=0;i<4;i++)next();assert.match(html,/lab.jpg/);assert.equal(JSON.parse(saved).state.playerName,name);
act('scene','hub');act('scene','bath');act('inspect','bleach');assert.match(html,/dialogue/);next();next();act('chair');next();next();assert.equal(JSON.parse(saved).state.bleachStage,2);act('inspect','shampoo');assert.match(html,/>收集</);act('collect','shampoo');assert.equal(JSON.parse(saved).state.collected.length,1);act('bag');assert.match(html,/背包 · 1\/8/);act('bag');assert.doesNotMatch(html,/<aside/);
act('menu');act('continue');assert.match(html,/bath.jpg/);assert.doesNotMatch(html,/风险/);
const ids=['apple','grape','cabbage','ice_cream','dumpling','frost','plants','cat_food'];
saved=JSON.stringify({version:1,state:{...ctx.GameRules.createState(),phase:'explore',scene:'lab',playerName:name,collected:ids}});act('load');act('brew');for(const id of ids){act('item',id);act('deposit')}assert.equal(JSON.parse(saved).state.pot.length,8);act('mix');timeouts.at(-1)();act('finish');for(let i=0;i<12;i++)next();assert.equal(JSON.parse(saved).state.ending,'two');assert.match(html,/大厨也是大魔法师/);
saved='{broken';act('load');assert.match(html,/没有可读取/);
console.log('PASS: name entry, manual dialogue, scene changes, witch gate, collection, backpack toggle, save/load, eight deposits, mixing, ending, corrupt save.');
