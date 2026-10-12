(function(){
 'use strict';
 const D=GameData,R=GameRules,app=document.getElementById('app'),KEY='little-magic-save-v1';
 let state=R.createState(),bag=false,modal=null,dialog=null,timer=null,mixTimer=null,selected=null,notice='';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const btn=(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`;
 const mat=id=>D.materials.find(m=>m.id===id);
 const names={hub:'中央公园',lab:'制药所',ice:'冰雪塔楼',bath:'泡泡王国',sky:'天空之城',forest:'梦幻森林',palace:'宫殿长廊',dragon:'巨龙盘踞之地'};
 const backgrounds={lab:'lab',ice:'ice',bath:'bath',sky:'sky'};
 const spots={shampoo:[10,29,14,22],body_wash:[22,32,10,23],detergent:[68,37,14,23],toothpaste:[86,37,10,28],bleach:[79,1,15,19],soy_sauce:[88,46,10,25],vinegar:[30,4,10,21],salt:[64,33,9,15],sugar:[13,53,10,17],cooking_wine:[17,14,10,12],ice_cream:[54,55,19,22],dumpling:[60,72,36,15],frost:[30,79,15,20],apple:[12,55,18,22],grape:[2,74,14,22],cabbage:[78,52,17,21]};
 const tags={edible:'能吃',tasty:'好吃',inedible:'不能吃',nonToxic:'无毒',toxic:'有毒',foaming:'出泡'};
 function readSave(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||s.version!==1)return null;const v=s.state;if(!v||!['explore','brew','mixing','ready','ending'].includes(v.phase)||!names[v.scene]||typeof v.playerName!=='string'||!v.playerName.trim()||!Array.isArray(v.collected)||v.collected.length>8||new Set(v.collected).size!==v.collected.length||v.collected.some(id=>!mat(id))||!Array.isArray(v.pot)||new Set(v.pot).size!==v.pot.length||v.pot.some(id=>!v.collected.includes(id))||!Number.isInteger(v.risk)||v.risk<0||!Number.isInteger(v.dialogueCount)||v.dialogueCount<0||![0,1,2].includes(v.bleachStage)||!['upper','lower'].includes(v.section)||v.phase==='ending'&&!D.endings[v.ending]||['mixing','ready'].includes(v.phase)&&v.pot.length!==8)return null;return v;}catch{return null;}}
 function save(){if(['intro','exit'].includes(state.phase))return;try{localStorage.setItem(KEY,JSON.stringify({version:1,state}));}catch{notice='浏览器无法保存进度，请允许本地存储。';}}
 function hot(label,action,id,rect){return `<button class="hotspot" data-action="${action}" data-id="${id}" style="left:${rect[0]}%;top:${rect[1]}%;width:${rect[2]}%;height:${rect[3]}%" aria-label="${esc(label)}"><span>${esc(label)}</span></button>`;}
 function scene(){
  if(state.scene==='hub')return `<div class="hub"><h2>中央公园</h2><p>沿着小路，去寻找你的魔法。</p>${['lab','bath','sky','forest','palace'].map(id=>btn(names[id],'scene',`data-id="${id}"`)).join('')}</div>${hot('门边的巨龙','scene','dragon',[3,55,18,22])}`;
  if(state.scene==='lab')return hot('离开制药所','scene','hub',[34,20,18,36])+hot('大锅与搅拌木棍','brew','',[34,51,64,46]);
  if(state.scene==='dragon')return `<div class="placeholder"><div class="dragon">⌁</div><h2>巨龙静静守在门边</h2>${btn('与巨龙交谈','talk')}</div>`;
  const rows=D.materials.filter(m=>m.scene===state.scene&&(!m.section||m.section===state.section));
  let content=rows.map((m,i)=>hot(m.name+(state.collected.includes(m.id)?' · 已收集':''),'inspect',m.id,spots[m.id]||[15+i%2*40,25+Math.floor(i/2)*25,28,18])).join('');
  if(!backgrounds[state.scene])content=`<div class="placeholder"><h2>${names[state.scene]}</h2><p>试运行场景 · 点击宝物探索</p></div>`+content;
  if(state.scene==='sky')content+=hot('通往冰雪塔楼的云梯','scene','ice',[58,0,20,29]);
  if(state.scene==='bath')content+=hot('小椅子','chair','',[40,73,13,16]);
  if(state.scene==='ice')content+=hot('返回天空之城','scene','sky',[40,4,15,23]);
  if(state.scene==='ice')content+=`<div class="section-tabs">${btn('上层冰塔','section','data-id="upper"')}${btn('下层冰窟','section','data-id="lower"')}</div>`;
  if(state.scene==='ice'&&state.section==='lower')content+=hot('冰窟里的大冰石头','stone','',[4,54,12,18]);
  return content;
 }
 function inventory(){return `<aside class="inventory" aria-label="背包"><h2>背包 · ${state.collected.length}/8</h2><div class="items">${state.collected.map(id=>`<button class="item ${state.pot.includes(id)?'used':''}" data-action="item" data-id="${id}"><span>✦</span>${mat(id).name}<small>${state.pot.includes(id)?'已入锅':state.phase==='brew'?'选择后点击大锅投入':'查看'}</small></button>`).join('')||'<p>背包还是空的，去找找宝物吧。</p>'}</div></aside>`;}
 function popup(){if(!modal)return '';if(modal.type==='name')return `<div class="shade"><form class="modal" id="name-form"><h2>小精灵，你叫什么名字？</h2><input id="player-name" maxlength="24" required autocomplete="off" placeholder="输入你的名字" aria-label="玩家名字"><div class="choices">${btn('取消','close','type="button"')}<button type="submit">开始冒险</button></div></form></div>`;
  const m=modal.id&&mat(modal.id);return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-label="${m?m.name:'提示'}">${btn('×','close','class="close" aria-label="关闭提示"')}${m?`<div class="item-art" style="${backgrounds[m.scene]?'background-image:url(assets/'+backgrounds[m.scene]+'.jpg);background-size:'+(10000/(spots[m.id]?.[2]||30))+'% '+(10000/(spots[m.id]?.[3]||30))+'%;background-position:'+((spots[m.id]?.[0]||0)/(100-(spots[m.id]?.[2]||30))*100)+'% '+((spots[m.id]?.[1]||0)/(100-(spots[m.id]?.[3]||30))*100)+'%':''}">✦</div><h2>${m.name}</h2><p>${m.description}</p><p>${m.tags.map(t=>tags[t]).join(' · ')}</p><div class="choices">${btn(state.collected.includes(m.id)?'已收集':'收集','collect',`data-id="${m.id}" ${state.collected.includes(m.id)?'disabled':''}`)}${btn('丢弃','close')}</div>`:`<h2>提示</h2><p>${esc(modal.text)}</p>`}</section></div>`;}
 function render(){
  clearInterval(timer);
  if(state.phase==='intro'||state.phase==='exit'){app.innerHTML=`<div class="stage menu"><h1>一锅小小的魔法</h1><p>${state.phase==='exit'?'游戏已结束，进度已保存。':'小精灵的第一次冒险'}</p>${btn('开始','start')}${btn('继续','continue',readSave()?'':'disabled')}${btn('结束游戏','exit')}${popup()}</div>`;if(modal?.type==='name')document.getElementById('player-name').focus();return;}
  const bg=backgrounds[state.scene];
  app.innerHTML=`<div class="stage ${bg?'illustrated':''}" ${bg?`style="background-image:url(assets/${bg}.jpg)"`:''}><header>${btn('← 返回','back')}<span>${esc(names[state.scene])}</span><div>${btn('存档','save')}${btn('读档','load')}${btn('菜单','menu')}${btn('背包','bag','aria-expanded="'+bag+'"')}</div></header>${state.phase==='ending'?`<div class="ending"><h2>${D.endings[state.ending].title}</h2><p>${D.endings[state.ending].subtitle}</p>${btn('重返启动界面','menu')}</div>`:['brew','mixing','ready'].includes(state.phase)?`<div class="brew-panel ${state.phase==='mixing'?'mixing':''}"><h2>${state.phase==='mixing'?'魔法正在涌现…':state.phase==='ready'?'魔法药做好了':'把八种宝物逐一放入大锅'}</h2><p>${state.pot.length}/8 已入锅</p>${btn(selected?'投入「'+mat(selected).name+'」':'大锅','deposit','id="pot"')}${state.phase==='brew'?btn('开始制药','mix',R.canBrew(state)?'':'disabled'):state.phase==='ready'?btn(state.dialogueCount>=3?'放下药，去找巨龙':'喝下魔法药','finish'):''}</div>`:scene()}${bag?inventory():''}${notice?`<div class="notice" role="status">${esc(notice)}</div>`:''}${dialog?`<div class="dialogue" role="button" tabindex="0" aria-label="点击推进对话"><div class="portrait"><img src="assets/player.png" alt="玩家立绘"></div>${dialog.lines[dialog.index].speaker?`<div class="speaker">${esc(dialog.lines[dialog.index].speaker)}</div>`:''}<p id="dialog-text"></p><small>点击画面继续</small></div>`:''}${popup()}</div>`;
  if(dialog){const line=dialog.lines[dialog.index].text,node=document.getElementById('dialog-text');node.textContent=line.slice(0,dialog.shown);timer=setInterval(()=>{if(!dialog){clearInterval(timer);return;}dialog.shown=Math.min(line.length,dialog.shown+1);node.textContent=line.slice(0,dialog.shown);if(dialog.shown===line.length)clearInterval(timer);},55);}
 }
 function say(lines,done){bag=false;dialog={lines,index:0,shown:0,done};render();}
 function advance(){const line=dialog.lines[dialog.index];if(dialog.shown<line.text.length){dialog.shown=line.text.length;render();return;}if(dialog.index<dialog.lines.length-1){dialog.index++;dialog.shown=0;render();return;}const done=dialog.done;dialog=null;clearInterval(timer);if(done)done();save();render();}
 function go(id){clearTimeout(mixTimer);state.phase='explore';state.scene=id;selected=null;bag=false;save();}
 function restore(){const s=readSave();if(!s){notice='没有可读取的有效存档。';return;}clearTimeout(mixTimer);state=s;if(state.phase==='mixing')state.phase='ready';modal=null;dialog=null;bag=false;selected=null;notice='进度已读取。';}
 app.addEventListener('submit',e=>{if(e.target.id!=='name-form')return;e.preventDefault();const name=document.getElementById('player-name').value.trim();if(!name)return;state={...R.createState(),playerName:name,phase:'explore',scene:'lab'};modal=null;save();say([{text:'你是这片大陆唯一的精灵。巨龙守在光明世界的交界处。'},{speaker:name,text:'我要寻找八种宝物，调制属于我的魔法药！'}]);});
 app.addEventListener('click',e=>{
  if(dialog&&!modal){advance();return;}const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action,id=el.dataset.id;notice='';
  if(a==='start')modal={type:'name'};
  if(a==='continue'||a==='load')restore();
  if(a==='exit'||a==='menu'){save();clearTimeout(mixTimer);state.phase=a==='exit'?'exit':'intro';modal=null;bag=false;}
  if(a==='close')modal=null;
  if(a==='bag')bag=!bag;
  if(a==='save'){save();notice=notice||'进度已保存。';}
  if(a==='scene')go(id);
  if(a==='back')go(state.scene==='hub'?'lab':state.scene==='ice'?'sky':['brew','mixing','ready'].includes(state.phase)?'lab':'hub');
  if(a==='section')state.section=id;
  if(a==='stone'){say([{speaker:state.playerName,text:'这块大冰石头纹丝不动，今天带不走啦。'}]);return;}
  if(a==='inspect'){
   if(id==='bleach'&&state.bleachStage<2){state.bleachStage=1;say([{speaker:state.playerName,text:'呜呜呜太高了够不着，有什么办法可以拿到它呢'}]);save();return;}
   modal={id};
  }
  if(a==='chair'){if(state.bleachStage===1)state.bleachStage=2;say([{speaker:state.playerName,text:state.bleachStage===2?'把小椅子搬到瓶子下面，这下就够得着了！':'一把小椅子，也许能帮我够到高处的宝物。'}]);save();return;}
  if(a==='collect'){const result=R.collect(state,id);notice=result.message;modal=null;if(state.phase==='ending'){showEnding();return;}}
  if(a==='talk'){const d=D.dialogues[Math.min(state.dialogueCount,D.dialogues.length-1)];say([{speaker:'巨龙',text:d.dragon},{text:d.thought},{speaker:state.playerName,text:d.reply}],()=>state.dialogueCount++);return;}
  if(a==='brew'){if(state.collected.length!==8)modal={text:'需要先收集八种不同的宝物，再来制药。'};else{state.phase='brew';bag=true;}}
  if(a==='item'){if(state.phase==='brew'&&!state.pot.includes(id)){selected=id;notice='已选中「'+mat(id).name+'」，点击大锅投入。';}else modal={id};}
  if(a==='deposit'&&selected&&R.putInPot(state,selected)){selected=null;notice='宝物放入大锅了。';}
  if(a==='mix'&&R.canBrew(state)){state.phase='mixing';bag=false;mixTimer=setTimeout(()=>{if(state.phase!=='mixing')return;state.phase='ready';save();render();},3200);}
  if(a==='finish'&&state.phase==='ready'){state.ending=R.resolveEnding(state);state.phase='ending';showEnding();return;}
  save();render();
 });
 function showEnding(){save();say(D.endings[state.ending].text.map(text=>({text})));}
 document.addEventListener('keydown',e=>{if(e.isComposing||e.target.tagName==='INPUT')return;if(dialog&&!modal&&['Enter',' '].includes(e.key)){e.preventDefault();advance();}else if(e.key==='Escape'){if(modal)modal=null;else bag=false;render();}});
 render();
})();
