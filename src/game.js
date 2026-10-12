(function(){
  'use strict';
  const D=GameData,R=GameRules,S=GameStory,app=document.getElementById('app');
  const KEY='little-magic-library-v2',OLD_KEY='little-magic-save-v1',NAME_KEY='little-magic-last-name';
  const names={lab:'制药所',hub:'中央公园',bath:'泡泡王国',sky:'天空之城',ice:'冰雪塔楼',forest:'梦幻森林',palace:'宫殿长廊',dragon:'恶龙盘踞之地'};
  const backgrounds={lab:'lab.jpg',bath:'bath.jpg',sky:'sky.jpg',ice:'ice.jpg',dragon:'dragon-resting.png'};
  const itemImages={ice_cream:'sweet-snow.png',dumpling:'dumplings.png',frost:'frost.png'};
  const spots={shampoo:[10,29,14,22],body_wash:[22,32,10,23],detergent:[68,37,14,23],toothpaste:[86,37,10,28],bleach:[79,1,15,19],soy_sauce:[88,46,10,25],vinegar:[30,4,10,21],salt:[64,33,9,15],sugar:[13,53,10,17],cooking_wine:[17,14,10,12],ice_cream:[54,53,39,22],dumpling:[60,73,38,15],frost:[0,30,12,22]};
  let state=R.createState(),bag=false,modal=null,notice='',typingTimer=null,mixingTimer=null,drag=null,suppressClickUntil=0,autosavePaused=false;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const material=id=>D.materials.find(m=>m.id===id);
  const button=(label,action,attrs='')=>`<button type="button" data-action="${action}" ${attrs}>${esc(label)}</button>`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function valid(s){
    if(s?.phase==='prologue'&&!s.narrative)return false;
    if(s?.phase==='brew'&&s.collected?.length!==8)return false;
    if(s&&s.visited!==undefined&&(!Array.isArray(s.visited)||s.visited.some(key=>!['lab','hub','bath','sky','ice_lower','ice_upper','forest','palace','dragon'].includes(key))))return false;
    if(s&&s.round!==undefined&&(!Number.isInteger(s.round)||s.round<1))return false;
    if(s&&s.adventureId!==undefined&&typeof s.adventureId!=='string')return false;
    return s&&['explore','prologue','brew','mixing','ready','ending'].includes(s.phase)&&names[s.scene]&&typeof s.playerName==='string'&&s.playerName.trim()&&s.playerName.length<=24&&Array.isArray(s.collected)&&s.collected.length<=8&&new Set(s.collected).size===s.collected.length&&s.collected.every(id=>material(id))&&Array.isArray(s.pot)&&new Set(s.pot).size===s.pot.length&&s.pot.every(id=>s.collected.includes(id))&&Number.isInteger(s.risk)&&s.risk>=0&&Number.isInteger(s.dialogueCount)&&s.dialogueCount>=0&&[0,1,2].includes(s.bleachStage)&&['upper','lower'].includes(s.section)&&['ending'].every(()=>s.phase!=='ending'||D.endings[s.ending])&&(!['mixing','ready'].includes(s.phase)||s.pot.length===8)&&(!s.narrative||Array.isArray(s.narrative.lines)&&s.narrative.lines.length>0&&s.narrative.lines.length<=30&&s.narrative.lines.every(l=>typeof l.text==='string'&&l.text.length<1000&&[undefined,'player','dragon'].includes(l.speaker))&&Number.isInteger(s.narrative.index)&&s.narrative.index>=0&&s.narrative.index<s.narrative.lines.length&&Number.isInteger(s.narrative.shown)&&s.narrative.shown>=0&&['','lab','round'].includes(s.narrative.after));
  }
  function readLibrary(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY));
      if(raw&&raw.version===2)return {version:2,autosave:valid(raw.autosave)?raw.autosave:null,slots:Array.from({length:3},(_,i)=>raw.slots?.[i]&&valid(raw.slots[i].state)?raw.slots[i]:null),completed:Array.isArray(raw.completed)?raw.completed.filter(id=>typeof id==='string'):[]};
      const old=JSON.parse(localStorage.getItem(OLD_KEY));
      return {version:2,autosave:old?.version===1&&valid(old.state)?{...old.state,dialogueCount:0,round:1,visited:[],adventureId:'legacy',narrative:null}:null,slots:[null,null,null],completed:[]};
    }catch{return {version:2,autosave:null,slots:[null,null,null],completed:[]};}
  }
  let library=readLibrary();
  function readLastName(){
    try{const name=localStorage.getItem(NAME_KEY);if(typeof name==='string'&&name.trim()&&name.trim().length<=24)return name.trim();}catch{}
    return library.autosave?.playerName||library.slots.find(Boolean)?.state.playerName||'';
  }
  let lastName=readLastName();
  function rememberName(name){
    lastName=name;
    try{localStorage.setItem(NAME_KEY,name);}catch{notice='浏览器无法保存名字，请允许本地存储。';}
  }
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(library));return true;}catch{notice='浏览器无法保存进度，请允许本地存储。';return false;}}
  function autosave(resume=false){if(resume)autosavePaused=false;if(!autosavePaused&&valid(state)){library.autosave=clone(state);persist();}}
  function markEnding(){if(!library.completed.includes(state.adventureId))library.completed.push(state.adventureId);autosave();}
  function sceneKey(){return state.scene==='ice'?'ice_'+state.section:state.scene;}
  function hot(label,action,id,rect,extra=''){
    const placeholder=(!backgrounds[state.scene]||state.scene==='ice'&&state.section==='upper')&&action==='inspect';
    const glimmer=action!=='inspect'||!state.collected.includes(id);
    const color={bath:'#ffe3f9',ice:'#d7ffff',sky:'#fff0ad',forest:'#d5ffc5',palace:'#ecdcff',dragon:'#d5ffc5'}[state.scene]||'#fff0ad';
    return `<button type="button" class="hotspot" ${glimmer?'data-glimmer="true"':''} data-action="${action}" data-id="${id}" style="left:${rect[0]}%;top:${rect[1]}%;width:${rect[2]}%;height:${rect[3]}%;--glimmer-color:${color};--glimmer-delay:-${(rect[0]+rect[1])%36/10}s" aria-label="${esc(label)}" ${extra}>${placeholder?art(material(id)):''}</button>`;
  }
  function arrow(label,id,section=''){
    return `<button type="button" class="travel-arrow" data-action="scene" data-id="${id}" data-section="${section}" aria-label="${esc(label)}"><span>${esc(label)}</span></button>`;
  }
  function art(m){
    if(itemImages[m.id])return `<img class="item-picture" src="assets/${itemImages[m.id]}" alt="${esc(m.name)}" draggable="false">`;
    const rect=spots[m.id],bg=backgrounds[m.scene];
    if(rect&&bg)return `<span class="item-crop" role="img" aria-label="${esc(m.name)}" style="background-image:url(assets/${bg});background-size:${10000/rect[2]}% ${10000/rect[3]}%;background-position:${rect[0]/(100-rect[2])*100}% ${rect[1]/(100-rect[3])*100}%"></span>`;
    return `<span class="item-symbol" aria-hidden="true">✦</span>`;
  }
  function scene(){
    if(state.scene==='hub')return `<div class="hub">${['lab','bath','sky','forest','palace'].map(id=>button(names[id],'scene',`data-id="${id}"`)).join('')}</div>`;
    if(state.scene==='lab')return hot('离开制药所','scene','hub',[40,19,15,35])+hot('紫色大锅与搅拌木棍','brew','',[35,53,62,44]);
    if(state.scene==='dragon')return hot('与恶龙互动','talk','',[21,46,76,37]);
    const rows=D.materials.filter(m=>m.scene===state.scene&&(!m.section||m.section===state.section));
    let view=rows.map((m,i)=>hot(m.name+(state.collected.includes(m.id)?' · 已收集':''),'inspect',m.id,spots[m.id]||[12+i%2*42,29+Math.floor(i/2)*23,31,18])).join('');
    if(!backgrounds[state.scene]||state.scene==='ice'&&state.section==='upper')view=`<div class="placeholder"><p>寻找散落在这里的宝物</p></div>`+view;
    if(state.scene==='sky')view+=arrow('前往冰雪塔楼下层','ice','lower');
    if(state.scene==='palace')view+=arrow('前往恶龙盘踞之地','dragon');
    if(state.scene==='ice'&&state.section==='lower')view+=hot('黄白色冰门 · 前往上层','scene','ice',[43,6,10,21],'data-section="upper"')+hot('大冰石头','stone','',[12,55,18,22]);
    return view;
  }
  function inventory(){
    return `<aside class="inventory" aria-label="背包"><div class="inventory-caption">背包 · ${state.collected.length}/8${state.phase==='brew'?' · 按住材料直接拖到锅口':''}</div><div class="items">${Array.from({length:8},(_,i)=>{const id=state.collected[i],m=material(id);return m?`<button type="button" class="item ${state.pot.includes(id)?'used':''}" data-action="item" data-id="${id}" ${state.phase==='brew'&&!state.pot.includes(id)?'data-draggable="true"':''}>${art(m)}<span>${esc(m.name)}</span>${state.pot.includes(id)?'<small>已入锅</small>':''}</button>`:`<div class="item empty" aria-label="空格 ${i+1}"><span>${i+1}</span></div>`;}).join('')}</div></aside>`;
  }
  function saveList(){
    const saveMode=modal.mode==='save';
    const row=(label,id,exists,action)=>`<div class="save-row">${button(label,action,`data-id="${id}" class="save-slot" ${!saveMode&&!exists?'disabled':''}`)}${exists?button('删除','delete-save',`data-id="${id}" class="delete-save" aria-label="删除${id==='auto'?'自动存档':'存档 '+(Number(id)+1)}"`):''}</div>`;
    return `<h2>${saveMode?'选择存档位置':'选择要继续的存档'}</h2>${!saveMode&&library.autosave?row('自动存档 · '+library.autosave.playerName,'auto',true,'restore'):''}${library.slots.map((slot,i)=>row('存档 '+(i+1)+(slot?' · '+slot.state.playerName+' · '+slot.date:' · 空'),i,!!slot,saveMode?'save-slot':'restore')).join('')}`;
  }
  function popup(){
    if(!modal)return '';
    let body='';
    if(modal.type==='name')body=`<form id="name-form"><h2>小精灵，你叫什么名字？</h2><input id="player-name" maxlength="24" required autocomplete="off" aria-label="玩家名字" placeholder="输入你的名字"><div class="choices">${button('取消','close')}<button type="submit">开始冒险</button></div></form>`;
    else if(modal.type==='reuse-name')body=`<h2>继续使用上次的名字吗？</h2><p>上次使用的名字是「${esc(lastName)}」。</p><div class="choices">${button('继续使用','reuse-name')}${button('换一个名字','change-name')}</div>`;
    else if(modal.type==='settings')body=`<h2>设置</h2><div class="setting-buttons">${button('存档','save-list')}${button('读档','load-list')}${button('返回启动界面','menu')}</div><p class="storage-note">存档保存在当前浏览器，共三个手动存档位置。</p>`;
    else if(modal.type==='saves')body=saveList();
    else if(modal.type==='material'){
      const m=material(modal.id),owned=state.collected.includes(m.id);
      body=`<div class="item-art">${art(m)}</div><h2>${esc(m.name)}</h2><p>${esc(m.description)}</p><div class="choices">${button(owned?'已收集':'收集','collect',`data-id="${m.id}" ${owned?'disabled':''}`)}${button('丢弃','discard',`data-id="${m.id}"`)}</div>`;
    }else if(modal.type==='travel')body=`<h2>魔法药做好了</h2><p>是否前往恶龙盘踞之地？</p><div class="choices">${button('确认','potion-travel')}${button('稍后再去','close')}</div>`;
    else if(modal.type==='drink')body=`<h2>恶龙就在眼前</h2><p>你握着已经调制好的魔法药。</p><div class="choices">${button('喝下药水','drink')}${button('暂时收好','close')}</div>`;
    else body=`<h2>提示</h2><p>${esc(modal.text)}</p>`;
    return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-label="${modal.type==='material'?esc(material(modal.id).name):'游戏提示'}">${button('×','close','class="close" aria-label="关闭窗口"')}${body}</section></div>`;
  }
  function narrativeView(){
    const n=state.narrative;if(!n)return '';
    const line=n.lines[n.index],speaker=line.speaker==='player'?state.playerName:line.speaker==='dragon'?'恶龙':'';
    return `<div class="reading-layer"><button type="button" class="reading-surface" data-action="advance" aria-label="点击画面推进文字"></button>${line.speaker==='dragon'?'<img class="npc-portrait" src="assets/dragon.png" alt="恶龙立绘">':''}${speaker?'<img class="player-portrait" src="assets/player.png" alt="玩家立绘">':''}<div class="dialogue ${speaker?'':'narration'}" role="button" tabindex="0" data-action="advance" aria-label="点击推进对话">${speaker?`<div class="speaker">${esc(speaker)}</div>`:''}<p id="dialog-text">${esc(line.text.slice(0,n.shown))}</p><small>${state.phase==='prologue'?'点击画面翻页':'点击画面继续'}</small></div></div>`;
  }
  function render(){
    clearInterval(typingTimer);
    if(['intro','exit'].includes(state.phase)){
      app.innerHTML=`<div class="stage menu"><div class="menu-content" ${modal?'inert':''}><h1>一锅小小的魔法</h1><p>${state.phase==='exit'?'游戏已结束':'小精灵的第一次冒险'}</p>${button('开始','start')}${button('继续','continue',library.autosave||library.slots.some(Boolean)?'':'disabled')}${button('结束游戏','exit')}</div>${popup()}</div>`;
    }else{
      const prologue=state.phase==='prologue',ending=state.phase==='ending',bg=ending||prologue||state.scene==='ice'&&state.section==='upper'?null:state.scene==='dragon'&&state.narrative?'dragon-empty.png':backgrounds[state.scene];
      let view='';
      if(prologue)view=`<div class="storybook" aria-label="翻开的故事书"><div class="book-left"><span>一锅小小的魔法</span><i>✦</i></div><div class="book-right"><span>第 ${state.narrative.index+1} 页</span><i>✧</i></div><div class="turning-page" style="--page:${state.narrative.index}"></div></div>`;
      else if(ending)view=`<div class="ending"><h2>${esc(D.endings[state.ending].title)}</h2><p>${esc(D.endings[state.ending].subtitle)}</p>${button('返回启动界面','menu')}</div>`;
      else if(['brew','mixing','ready'].includes(state.phase)&&state.scene==='lab')view=`<div class="brew-panel ${state.phase==='mixing'?'mixing':''}"><h2>${state.phase==='mixing'?'魔法正在涌现……':state.phase==='ready'?'魔法药做好了':'把背包材料直接拖到锅口'}</h2><p>${state.pot.length}/8 已入锅</p><div id="pot" role="img" aria-label="制药大锅"><div id="pot-mouth" aria-label="锅口">${state.phase==='brew'?'拖到锅口松开':'✦'}</div><span class="pot-decoration" aria-hidden="true">✦</span></div>${state.phase==='brew'?button('开始制药','mix',R.canBrew(state)?'':'disabled'):state.phase==='ready'?button('前往恶龙盘踞之地','potion-prompt'):''}</div>`;
      else view=scene()+(state.phase==='ready'&&state.scene==='dragon'?button('拿出魔法药','potion-prompt','class="potion-button"'):'');
      app.innerHTML=`<div class="stage ${bg?'illustrated':''}" ${bg?`style="background-image:url(assets/${bg})"`:''}><div class="world" ${state.narrative||modal?'inert':''}>${!prologue?`<header>${!ending?button('← 返回','back'):''}<div>${button('设置','settings')}${button('背包','bag',`aria-expanded="${bag}"`)}</div></header>`:''}${view}${bag&&!prologue?inventory():''}</div>${notice?`<div class="notice" role="status">${esc(notice)}</div>`:''}${narrativeView()}${popup()}</div>`;
    }
    if(modal?.type==='name')document.getElementById('player-name').focus();
    else if(modal){const controls=app.querySelectorAll('.modal button:not([disabled])');controls[0]?.focus();}
    if(state.narrative){
      const n=state.narrative,line=n.lines[n.index],node=document.getElementById('dialog-text');
      typingTimer=setInterval(()=>{if(state.narrative!==n){clearInterval(typingTimer);return;}n.shown=Math.min(line.text.length,n.shown+1);node.textContent=line.text.slice(0,n.shown);if(n.shown===line.text.length)clearInterval(typingTimer);},50);
    }
  }
  function say(lines,after=''){modal=null;bag=false;state.narrative={lines:clone(lines),index:0,shown:0,after};autosave(true);render();}
  function advance(){
    const n=state.narrative;if(!n)return;
    const text=n.lines[n.index].text;
    if(state.phase!=='prologue'&&n.shown<text.length){n.shown=text.length;autosave(true);render();return;}
    if(n.index<n.lines.length-1){n.index++;n.shown=0;autosave(true);render();return;}
    state.narrative=null;clearInterval(typingTimer);
    if(n.after==='lab'){
      state.phase='explore';state.scene='lab';state.visited=state.visited||[];
      if(!state.visited.includes('lab')){state.visited.push('lab');say([S.narration(S.intros.lab)]);return;}
    }
    if(n.after==='round'&&state.round>=5){state.dialogueCount=3;showEnding('six');return;}
    if(state.phase==='ready'&&state.scene==='dragon')modal={type:'drink'};
    autosave(true);render();
  }
  function enter(scene,section){
    clearTimeout(mixingTimer);cancelDrag();bag=false;modal=null;
    const potion=state.phase==='ready';state.phase=potion?'ready':'explore';state.scene=scene;
    if(scene==='ice')state.section=section||'lower';
    state.visited=state.visited||[];const key=sceneKey();
    if(!state.visited.includes(key)&&S.intros[key]){state.visited.push(key);say([S.narration(S.intros[key])]);return;}
    if(potion&&scene==='dragon')modal={type:'drink'};
    autosave(true);render();
  }
  function restore(id){
    const saved=id==='auto'?library.autosave:library.slots[Number(id)]?.state;
    if(!valid(saved)){modal={type:'text',text:'没有可读取的有效存档。'};render();return;}
    clearTimeout(mixingTimer);cancelDrag();autosavePaused=false;state=clone(saved);state.round=Number.isInteger(state.round)&&state.round>0?state.round:1;state.adventureId=state.adventureId||'legacy';state.visited=state.visited||[];modal=null;bag=false;notice='进度已读取。';rememberName(state.playerName);
    if(state.phase==='mixing'){state.phase='ready';modal={type:'travel'};}
    else if(state.phase==='ready'&&!state.narrative)modal={type:state.scene==='dragon'?'drink':'travel'};
    autosave();render();
  }
  function showEnding(id){
    clearTimeout(mixingTimer);state.ending=id;state.phase='ending';state.narrative=null;bag=false;modal=null;markEnding();say(D.endings[id].text.map(S.narration));
  }
  function returnTarget(){
    if(state.scene==='hub')return ['lab'];
    if(state.scene==='ice')return state.section==='upper'?['ice','lower']:['sky'];
    if(state.scene==='dragon')return ['palace'];
    if(['brew','mixing','ready'].includes(state.phase)&&state.scene==='lab')return ['lab'];
    return ['hub'];
  }
  function startMixing(){
    if(!R.canBrew(state))return;
    state.phase='mixing';bag=false;cancelDrag();autosave(true);render();
    mixingTimer=setTimeout(()=>{if(state.phase!=='mixing')return;state.phase='ready';modal={type:'travel'};autosave();render();},3200);
  }
  function startAdventure(name){
    name=name.trim();if(!name||name.length>24)return;
    clearTimeout(mixingTimer);cancelDrag();notice='';autosavePaused=false;
    rememberName(name);
    state={...R.createState(),phase:'prologue',scene:'lab',playerName:name,section:'lower',round:library.completed.length+1,adventureId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),visited:[],narrative:null};
    say(S.opening,'lab');
  }
  app.addEventListener('submit',event=>{
    if(event.target.id!=='name-form')return;event.preventDefault();
    if(modal?.type!=='name')return;
    startAdventure(document.getElementById('player-name').value);
  });
  app.addEventListener('click',event=>{
    if(drag?.active)return;
    if(event.isTrusted&&Date.now()<suppressClickUntil)return;
    const el=event.target.closest('[data-action]');
    if(state.narrative&&!modal){advance();return;}
    if(!el||el.disabled)return;
    const action=el.dataset.action,id=el.dataset.id;
    // A popup blocks all underlying world controls, including keyboard activation.
    const popupActions=['close','reuse-name','change-name','save-list','load-list','menu','restore','save-slot','delete-save','collect','discard','potion-travel','drink'];
    if(modal&&!popupActions.includes(action))return;
    notice='';
    if(action==='start')modal={type:lastName?'reuse-name':'name'};
    else if(action==='reuse-name'&&modal?.type==='reuse-name'){startAdventure(lastName);return;}
    else if(action==='change-name'&&modal?.type==='reuse-name')modal={type:'name'};
    else if(action==='continue'||action==='load-list')modal={type:'saves',mode:'load'};
    else if(action==='settings')modal={type:'settings'};
    else if(action==='save-list')modal={type:'saves',mode:'save'};
    else if(action==='save-slot'){
      if(valid(state)&&[0,1,2].includes(Number(id))){const date=new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});library.slots[Number(id)]={date,state:clone(state)};if(persist()){modal={type:'settings'};notice='进度已保存到存档 '+(Number(id)+1)+'。';}}
    }else if(action==='delete-save'){
      if(modal?.type!=='saves'||!(id==='auto'||['0','1','2'].includes(id)))return;
      const previous=clone(library);
      if(id==='auto')library.autosave=null;else library.slots[Number(id)]=null;
      if(persist()){if(id==='auto')autosavePaused=true;notice=id==='auto'?'自动存档已删除。':'存档 '+(Number(id)+1)+' 已删除。';}else library=previous;
      render();return;
    }else if(action==='restore'){restore(id);return;}
    else if(action==='menu'||action==='exit'){autosave();clearTimeout(mixingTimer);clearInterval(typingTimer);state={...R.createState(),phase:action==='exit'?'exit':'intro'};modal=null;bag=false;}
    else if(action==='close')modal=null;
    else if(action==='bag')bag=!bag;
    else if(action==='scene'){enter(id,el.dataset.section);return;}
    else if(action==='back'){
      const target=returnTarget();
      if(['brew','mixing'].includes(state.phase)&&state.scene==='lab'){clearTimeout(mixingTimer);state.phase='explore';}
      enter(...target);return;
    }else if(action==='stone'){say([S.player('诶呀，完全敲不下来！'),S.narration('这里面好像冰冻着可以吃的东西，但是你不管怎么样都无法挪动它。')]);return;}
    else if(action==='inspect'){
      if(id==='bleach'){say([S.player('呜呜呜太高了够不着，有什么办法可以拿到它呢。可惜我的翅膀是装饰，不然就可以飞起来了！')]);return;}
      modal={type:'material',id};
    }else if(action==='item')modal={type:'material',id};
    else if(action==='collect'){
      if(modal?.type!=='material'||modal.id!==id)return;
      if(state.collected.length>=8&&!state.collected.includes(id)){modal={type:'text',text:'背包已满，不可继续收集。请先丢弃物品，腾出空格。'};render();return;}
      const result=R.collect(state,id);notice=result.message;modal=null;if(state.phase==='ending'){showEnding(state.ending);return;}
    }else if(action==='discard'){
      if(modal?.type!=='material'||modal.id!==id)return;
      if(R.discard(state,id)){notice='已从背包丢弃「'+material(id).name+'」。';}modal=null;
    }else if(action==='talk'){
      // The story changes by completed playthroughs, never by repeated clicks.
      say(S.rounds[Math.min((state.round||1)-1,4)],'round');return;
    }else if(action==='brew'){
      if(state.phase==='ready')modal={type:'travel'};
      else if(state.collected.length!==8)modal={type:'text',text:'需要先收集八种不同的宝物，再来制药。'};
      else{state.phase='brew';bag=true;}
    }else if(action==='mix'){startMixing();return;}
    else if(action==='potion-prompt')modal={type:state.scene==='dragon'?'drink':'travel'};
    else if(action==='potion-travel'&&state.phase==='ready'){enter('dragon');return;}
    else if(action==='drink'&&state.phase==='ready'&&state.scene==='dragon'){showEnding(R.resolveEnding(state));return;}
    autosave(['collect','discard','brew'].includes(action));render();
  });
  function cancelDrag(){
    if(!drag)return;
    const current=drag;drag=null;current.ghost?.remove();
    try{current.element.releasePointerCapture(current.pointer);}catch{}
  }
  function atPotMouth(x,y){
    const rect=document.getElementById('pot-mouth')?.getBoundingClientRect();
    return !!rect&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
  }
  app.addEventListener('pointerdown',event=>{
    const el=event.target.closest('[data-draggable]');
    if(drag||!el||event.button!==0||state.phase!=='brew'||modal||state.narrative)return;
    drag={id:el.dataset.id,element:el,pointer:event.pointerId,x:event.clientX,y:event.clientY,active:false,ghost:null};
    try{el.setPointerCapture(event.pointerId);}catch{}
  });
  window.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;
    if(modal||state.narrative||state.phase!=='brew'){cancelDrag();return;}
    if(!drag.active&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6){
      drag.active=true;drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.setAttribute('aria-hidden','true');drag.ghost.innerHTML=art(material(drag.id));document.body.appendChild(drag.ghost);
    }
    if(drag.active){event.preventDefault();drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';}
  },{passive:false});
  function finishDrag(event,cancelled=false){
    if(!drag||event.pointerId!==drag.pointer)return;
    const current=drag;cancelDrag();
    if(!current.active)return;
    suppressClickUntil=Date.now()+250;
    if(!cancelled&&state.phase==='brew'&&!modal&&!state.narrative&&atPotMouth(event.clientX,event.clientY)&&R.putInPot(state,current.id)){
      notice='宝物放入大锅了。';autosave(true);
    }else if(!cancelled)notice='把材料拖到锅口再松开，就能放入大锅。';
    render();
  }
  window.addEventListener('pointerup',event=>finishDrag(event));
  window.addEventListener('pointercancel',event=>finishDrag(event,true));
  window.addEventListener('blur',()=>{if(drag?.active)suppressClickUntil=Date.now()+250;cancelDrag();});
  app.addEventListener('dragstart',event=>{if(event.target.closest('[data-draggable]'))event.preventDefault();});
  document.addEventListener('keydown',event=>{
    if(event.isComposing||['INPUT','TEXTAREA'].includes(event.target.tagName))return;
    if(state.narrative&&!modal){if(['Enter',' '].includes(event.key)){event.preventDefault();advance();}else if(event.key==='Tab'){event.preventDefault();}return;}
    if(event.key==='Escape'&&drag){cancelDrag();return;}
    const item=event.target.closest?.('[data-draggable]');
    if(event.key==='Enter'&&state.phase==='brew'&&!modal&&item){event.preventDefault();if(R.putInPot(state,item.dataset.id)){notice='宝物放入大锅了。';autosave(true);render();}return;}
    if(event.key==='Escape'){if(modal)modal=null;else bag=false;render();}
    if(event.key==='Tab'&&modal){const nodes=Array.from(app.querySelectorAll('.modal button:not([disabled]),.modal input'));if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  render();
})();
