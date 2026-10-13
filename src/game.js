(function(){
  'use strict';
  const D=GameData,R=GameRules,S=GameStory,Q=GameQuests,N=GameNpcStory,A=GameAchievements,E=GameEndingStory,app=document.getElementById('app');
  const KEY='little-magic-library-v2',OLD_KEY='little-magic-save-v1',NAME_KEY='little-magic-last-name';
  const names={lab:'制药所',hub:'中央公园',bath:'泡泡王国',sky:'天空之城',ice:'冰雪塔楼',forest:'梦幻森林',palace:'宫殿长廊',dragon:'恶龙盘踞之地'};
  const backgrounds={lab:'lab.jpg',bath:'bath.jpg',sky:'sky.jpg',ice:'ice.jpg',forest:'forest.png',palace:'palace.png',dragon:'dragon-resting.png'};
  const itemImages={ice_cream:'sweet-snow.png',dumpling:'dumplings.png',frost:'frost.png',apple:'ice-fruit.png',grape:'grape.png',cabbage:'ice-grass.png',plants:'flowers.png',fallen_leaves:'chicken-hat.png',cat_fur:'fur.png',skincare:'skincare.png',perfume:'perfume.png',lipstick:'sunset.png',snack_small:'snack-small.png',snack_large:'snack-large.png'};
  const spots={shampoo:[10,29,14,22],body_wash:[22,32,10,23],detergent:[68,37,14,23],toothpaste:[86,37,10,28],bleach:[79,1,15,19],soy_sauce:[88,46,10,25],vinegar:[30,4,10,21],salt:[64,33,9,15],sugar:[13,53,10,17],cooking_wine:[17,14,10,12],ice_cream:[54,53,39,22],dumpling:[60,73,38,15],frost:[0,30,12,22]};
  Object.assign(spots,{apple:[28,76,24,24],grape:[58,0,25,30],cabbage:[67,41,32,50],plants:[68,0,20,30],cat_fur:[54,79,11,18],fallen_leaves:[0,49,25,50],skincare:[13,45,23,27],perfume:[34,29,17,28],lipstick:[55,37,33,45]});
  let state=Q.normalize(R.createState()),bag=false,modal=null,notice='',typingTimer=null,mixingTimer=null,drag=null,suppressClickUntil=0,autosavePaused=false;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const material=id=>D.materials.concat(Q.questItems).find(m=>m.id===id);
  const gifts=['skincare','perfume','lipstick'];
  let achievementToasts=[],toastTimer=null;
  function readAchievements(){try{const raw=JSON.parse(localStorage.getItem(A.key));return {unlocked:Array.isArray(raw?.unlocked)?raw.unlocked.filter(id=>A.entries.some(a=>a.id===id)):[],collected:Array.isArray(raw?.collected)?raw.collected.filter(id=>D.materials.some(m=>m.id===id)):[],discarded:Number.isInteger(raw?.discarded)?Math.max(0,raw.discarded):0};}catch{return {unlocked:[],collected:[],discarded:0};}}
  const achievements=readAchievements();
  function persistAchievements(){try{localStorage.setItem(A.key,JSON.stringify(achievements));}catch{notice='浏览器无法保存成就。';}}
  function unlock(id){if(achievements.unlocked.includes(id))return;const a=A.entries.find(a=>a.id===id);if(!a)return;achievements.unlocked.push(id);persistAchievements();achievementToasts.push(a);achievementToasts=achievementToasts.slice(-3);clearTimeout(toastTimer);toastTimer=setTimeout(()=>{achievementToasts=[];app.querySelector('.achievement-toasts')?.remove();},8000);}
  function recordCollected(id){if(!D.materials.some(m=>m.id===id))return;if(!achievements.collected.includes(id))achievements.collected.push(id);persistAchievements();if(D.materials.every(m=>achievements.collected.includes(m.id)))unlock('all_materials');}
  function countClick(id,achievement){const q=state.quests;q.clicks[id]=(q.clicks[id]||0)+1;if(q.clicks[id]>=3)unlock(achievement);}
  const button=(label,action,attrs='')=>`<button type="button" data-action="${action}" ${attrs}>${esc(label)}</button>`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function valid(s){
    if(s?.quests){const q=s.quests;if(!['new','refused','accepted','rewarded'].includes(q.cat)||!Array.isArray(q.princessClaimed)||!Array.isArray(q.princessReturned)||!Number.isInteger(q.princessDiscards)||q.princessDiscards<0||!q.clicks||typeof q.clicks!=='object')return false;}
    if(s?.phase==='prologue'&&!s.narrative)return false;
    if(s?.phase==='brew'&&s.collected?.length!==8)return false;
    if(s&&s.visited!==undefined&&(!Array.isArray(s.visited)||s.visited.some(key=>!['lab','hub','bath','sky','ice_lower','ice_upper','forest','palace','dragon'].includes(key))))return false;
    if(s&&s.round!==undefined&&(!Number.isInteger(s.round)||s.round<1))return false;
    if(s&&s.adventureId!==undefined&&typeof s.adventureId!=='string')return false;
    return s&&['explore','prologue','brew','mixing','ready','ending'].includes(s.phase)&&names[s.scene]&&typeof s.playerName==='string'&&s.playerName.trim()&&s.playerName.length<=24&&Array.isArray(s.collected)&&s.collected.length<=8&&new Set(s.collected).size===s.collected.length&&s.collected.every(id=>material(id))&&Array.isArray(s.pot)&&new Set(s.pot).size===s.pot.length&&s.pot.every(id=>s.collected.includes(id))&&Number.isInteger(s.risk)&&s.risk>=0&&Number.isInteger(s.dialogueCount)&&s.dialogueCount>=0&&[0,1,2].includes(s.bleachStage)&&['upper','lower'].includes(s.section)&&['ending'].every(()=>s.phase!=='ending'||D.endings[s.ending])&&(!['mixing','ready'].includes(s.phase)||s.pot.length===8)&&(!s.narrative||Array.isArray(s.narrative.lines)&&s.narrative.lines.length>0&&s.narrative.lines.length<=30&&s.narrative.lines.every(l=>typeof l.text==='string'&&l.text.length<1000&&[undefined,'player','dragon','cat','chicken','princess','unknown'].includes(l.speaker))&&Number.isInteger(s.narrative.index)&&s.narrative.index>=0&&s.narrative.index<s.narrative.lines.length&&Number.isInteger(s.narrative.shown)&&s.narrative.shown>=0&&typeof s.narrative.after==='string'&&s.narrative.after.length<60);
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
    const placeholder=false;
    const glimmer=action!=='inspect'||!state.collected.includes(id);
    const color={bath:'#ffe3f9',ice:'#d7ffff',sky:'#fff0ad',forest:'#d5ffc5',palace:'#ecdcff',dragon:'#d5ffc5'}[state.scene]||'#fff0ad';
    return `<button type="button" class="hotspot" ${glimmer?'data-glimmer="true"':''} data-action="${action}" data-id="${id}" style="left:${rect[0]}%;top:${rect[1]}%;width:${rect[2]}%;height:${rect[3]}%;--glimmer-color:${color};--glimmer-delay:-${(rect[0]+rect[1])%36/10}s" aria-label="${esc(label)}" ${extra}>${placeholder?art(material(id)):''}</button>`;
  }
  function arrow(label,id,section=''){
    return `<button type="button" class="travel-arrow" data-action="scene" data-id="${id}" data-section="${section}" aria-label="${esc(label)}"><span>${esc(label)}</span></button>`;
  }
  function art(m){
    if(itemImages[m.id])return sprite(itemImages[m.id],m.name);
    const rect=spots[m.id],bg=backgrounds[m.scene];
    if(rect&&bg)return `<span class="item-crop" role="img" aria-label="${esc(m.name)}" style="background-image:url(assets/${bg});background-size:${10000/rect[2]}% ${10000/rect[3]}%;background-position:${rect[0]/(100-rect[2])*100}% ${rect[1]/(100-rect[3])*100}%"></span>`;
    return `<span class="item-symbol" aria-hidden="true">✦</span>`;
  }
  function sprite(file,label,extra=''){
    const info=GameAssets[file];
    if(!info)return `<img class="item-picture" src="assets/${file}" alt="${esc(label)}" draggable="false">`;
    const [x,y,right,bottom]=info.bounds,w=right-x,h=bottom-y;
    return `<svg class="sprite-art ${extra}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label)}"><image href="assets/${file}" width="${info.width}" height="${info.height}" /></svg>`;
  }
  function spriteObject(file,label,rect,action='inspect',id='',extra=''){
    return `<div class="scene-sprite ${extra}" style="left:${rect[0]}%;top:${rect[1]}%;width:${rect[2]}%;height:${rect[3]}%">${sprite(file,label)}</div>`+hot(label,action,id,rect);
  }
  function achievementView(){return `<div class="achievement-toasts" aria-live="polite">${achievementToasts.map(a=>`<div><strong>成就解锁 · ${esc(a.title)}</strong><small>${esc(a.description)}</small></div>`).join('')}</div>`;}
  function princessAvailable(){const q=state.quests;return q.princessLocked?[]:gifts.filter(id=>!state.collected.includes(id)&&(!q.princessClaimed.includes(id)||q.princessReturned.includes(id)));}
  function giftMenu(){
    const available=princessAvailable(),space=8-state.collected.length;
    if(!available.length){say([N.princess('本公主送你的宝物，你有好好收着吗？下次路过，也要记得来找我玩哦！')]);return;}
    if(!space){say([N.princess('哎呀，背包还是满满的呢。先腾出一点位置吧，我会在这里等你的！')]);return;}
    modal={type:'gifts',available};autosave(true);render();
  }
  function princessTalk(){
    const q=state.quests;
    if(!q.princessMet){q.princessMet=true;say(N.first,'princess-choice');return;}
    if(!q.princessOffered){modal={type:'princess-choice'};render();return;}
    if(q.princessLocked){say([N.princess('不可以了。我已经把它们收好了。'),N.princess('你可以留下来陪我玩，但是宝物不能再给你了。'),S.narration('小公主把收藏室的门轻轻关上，却没有关上通往长廊的门。')]);return;}
    if(q.princessReturned.length){say([S.narration('小公主看见你走近，把收回的宝物往怀里拢了拢。'),N.princess('怎么啦，你又想要它们了吗？'),N.princess('我已经擦干净了……这次要好好收着哦。')],'princess-reclaim');return;}
    if(princessAvailable().length){say([N.princess('你回来啦！我还给你留着宝物呢，要不要再看看？')],'princess-gifts');return;}
    say(N.random[Math.floor(Math.random()*N.random.length)]);
  }
  function catTalk(){
    const q=state.quests;
    if(q.cat==='new'){say([N.cat('唔啊，小精灵，你吵醒本绒绒大王的美梦了！'),S.player('大王大王，小精灵想要炼制魔法药水，请问大王有没有魔法材料供小精灵炼制！'),N.cat('小精灵，绒绒大王的妙脆角丢了，你要是能为本王找到两个妙脆角，大王便赏赐你珍贵的魔法材料。')],'cat-choice');return;}
    if(q.cat==='refused'){say([N.cat('哼！我就知道，本大王绝不是差你一只精灵，但是既然你诚心，本大王就再给你一次机会吧。')],'cat-retry');return;}
    if(Q.deliver(state)){unlock('snacks');say([N.cat('哇！本王的妙脆角！'),N.cat('诺……就这一个咯，本王可是很大方的，再多就没了喔……'),S.player('一看就是骗精灵的……')],'cat-reward');return;}
    if(q.cat==='accepted'){say([N.cat('找到后带着妙脆角来见本王！')]);return;}
    if(q.catRewardGround){modal={type:'cat-reward'};render();return;}
    say([N.cat('本王可是很大方的，再多就没了喔……')]);
  }
  function inspectMaterial(id){
    if(id==='bleach'){say([S.player('呜呜呜太高了够不着，有什么办法可以拿到它呢。可惜我的翅膀是装饰，不然就可以飞起来了！')]);return;}
    if(state.scene==='palace'&&gifts.includes(id)&&!state.collected.includes(id)){
      if(!state.quests.princessMet||!state.quests.princessOffered||state.quests.princessLocked||state.quests.princessReturned.includes(id)){princessTalk();return;}
    }
    if(state.scene==='forest'&&id==='fallen_leaves'&&!state.collected.includes(id)){modal={type:'hat'};render();return;}
    if(id==='cat_food'&&!state.collected.includes(id)&&!state.quests.catRewardGround){catTalk();return;}
    modal={type:'material',id};render();
  }
  function collectItem(id){
    const result=Q.questItems.some(m=>m.id===id)?Q.collectSnack(state,id):R.collect(state,id);
    if(result.ok){state.quests.hasCollected=true;recordCollected(id);if(gifts.includes(id)){const q=state.quests;if(!q.princessClaimed.includes(id))q.princessClaimed.push(id);q.princessReturned=q.princessReturned.filter(x=>x!==id);}if(id==='cat_food')state.quests.catRewardGround=false;}
    if(state.phase==='ending'){showEnding(state.ending);return result;}
    notice=result.message;return result;
  }
  function scene(){
    if(state.scene==='hub')return `<div class="hub">${['lab','bath','sky','forest','palace'].map(id=>button(names[id],'scene',`data-id="${id}"`)).join('')}</div>`;
    if(state.scene==='lab')return hot('离开制药所','scene','hub',[40,19,15,35])+hot('紫色大锅与搅拌木棍','brew','',[35,53,62,44]);
    if(state.scene==='dragon')return hot('与恶龙互动','talk','',[21,46,76,37])+hot('被恶龙挡住的石头门','gate','',[66,7,34,50])+hot('草丛里的花','dragon-flowers','',[1,82,27,17]);
    if(state.scene==='forest'){
      const q=state.quests;
      let view=hot('毛绒绒怪','cat-talk','',[74,60,26,40])+hot('身上的毛绒绒','body-fur','',[83,66,13,17])+hot('奇幻花','inspect','plants',spots.plants)+hot('落叶','inspect','fallen_leaves',spots.fallen_leaves)+hot('地上的毛绒绒','inspect','cat_fur',spots.cat_fur);


      if(q.cat!=='rewarded')for(const [id,rect] of [['snack_small',[29,36,20,19]],['snack_large',[44,14,22,21]]])if(!state.collected.includes(id))view+=hot(material(id).name,'inspect',id,rect);
      if(q.catRewardGround)view+=spriteObject('fluffy-reward.png','毛绒绒怪的美食',[67,76,9,14],'inspect','cat_food');
      return view;
    }
    if(state.scene==='ice'&&state.section==='upper')return hot('冰果','inspect','apple',spots.apple)+hot('串串冰','inspect','grape',spots.grape)+hot('冰草草','inspect','cabbage',spots.cabbage)+hot('树上的冰果','tree-fruit','',[0,0,22,33])+hot('冰冰糖','lollipop','',[20,38,28,35]);
    const rows=D.materials.filter(m=>m.scene===state.scene&&(!m.section||m.section===state.section));
    let view=rows.map(m=>hot(m.name+(state.collected.includes(m.id)?' · 已收集':''),'inspect',m.id,spots[m.id])).join('');
    if(state.scene==='bath')view+=hot('泡泡','bath-bubbles','',[42,32,13,25]);
    if(state.scene==='sky')view+=arrow('前往冰雪塔楼下层','ice','lower');
    if(state.scene==='palace')view+=arrow('前往恶龙盘踞之地','dragon')+hot('小公主','princess-talk','',[65,76,9,17]);
    if(state.scene==='ice'&&state.section==='lower')view+=hot('黄白色冰门 · 前往上层','scene','ice',[43,6,10,21],'data-section="upper"')+hot('大冰石头','stone','',[12,55,18,22])+hot('冰草草彩蛋','cabbage-secret','',[6,75,12,22]);
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
    else if(modal.type==='achievements')body=`<h2>成就 · ${achievements.unlocked.length}/${A.entries.length}</h2><div class="achievement-list">${A.entries.map(a=>`<div class="${achievements.unlocked.includes(a.id)?'unlocked':'locked'}"><strong>${esc(a.title)}</strong><small>${esc(a.description)}</small><span>${achievements.unlocked.includes(a.id)?'已达成':'未达成'}</span></div>`).join('')}</div>`;
    else if(modal.type==='cat-choice')body=`<h2>是否帮助这只傲娇的毛绒绒怪？</h2><div class="choices">${button('是','cat-accept')}${button('否','cat-refuse')}</div>`;
    else if(modal.type==='cat-retry')body=`<h2>绒绒大王又给了你一次机会</h2>${button('谢谢大王！','cat-accept')}`;
    else if(modal.type==='cat-reward')body=`<h2>获得奖励：毛绒绒怪的美食！</h2><p>${state.collected.length>=8?'你的背包已经放不下啦！':'绒绒大王把美食递给你。'}</p><div class="choices">${button(state.collected.length>=8?'从背包里丢一个东西':'收下美食',state.collected.length>=8?'reward-discard':'reward-take')}${button('丢掉毛绒绒怪的美食','reward-leave')}</div>`;
    else if(modal.type==='reward-discard')body=`<h2>从背包里丢一个东西</h2><div class="gift-list">${state.collected.map(id=>button(material(id).name,'reward-discard-item',`data-id="${id}"`)).join('')}</div>`;
    else if(modal.type==='hat')body=`<h2>你确定要抢走傻不拉鸡的帽子吗？</h2><div class="choices">${button('确定','hat-take')}${button('算了','hat-leave')}</div>`;
    else if(modal.type==='princess-choice')body=`<h2>你是公主吗？</h2><div class="setting-buttons">${['我不是公主','我是精灵公主！','我只是一般路过的小精灵'].map((label,i)=>button(label,'princess-answer',`data-id="${i}"`)).join('')}</div>`;
    else if(modal.type==='princess-reclaim')body=`<h2>怎么啦，你又想要它们了吗？</h2><div class="choices">${button('这次我会珍惜的','princess-reclaim-yes')}${button('我还是先不拿了','princess-reclaim-no')}</div>`;
    else if(modal.type==='gifts')body=`<h2>小公主的宝物</h2><p>${8-state.collected.length>=3?'你可以查看宝物，再决定收下哪些。':`背包还有${8-state.collected.length}个空位，最多可以选择${8-state.collected.length}件宝物。`}</p><div class="gift-list">${princessAvailable().map(id=>`<button data-action="gift-inspect" data-id="${id}">${art(material(id))}<span>${esc(material(id).name)}</span></button>`).join('')}</div><div class="choices">${8-state.collected.length>=princessAvailable().length?button('全部收下','gifts-all'):''}${button('挑选喜欢的宝物','gifts-select')}${button('暂时不收','gifts-later')}</div>`;
    else if(modal.type==='gate-ready')body=`<h2>前往光明世界吧！</h2>${button('我准备好了！','gate-ready')}`;
    else if(modal.type==='companion-ready')body=`<h2>和你的大龙一起前往光明世界吧！</h2>${button('我这次是真的准备好啦！','companion-ready')}`;
    else if(modal.type==='next-round')body=`<h2>是否开启下一周目？</h2><p>${state.ending==='five'?'再去和龙聊聊吧。':state.ending&&!D.endings[state.ending].trueEnding?'还不是最终结局哦～再去找恶龙试试看！':'风从远方吹来，下一次冒险也在等你。'}</p><div class="choices">${button('是','next-round')}${button('存档','next-save')}</div>`;
    else if(modal.type==='material'){
      const m=material(modal.id),owned=state.collected.includes(m.id);
      body=`<div class="item-art">${art(m)}</div><h2>${esc(m.name)}</h2><p>${esc(m.description)}</p><div class="choices">${button(owned?'已收集':'收集','collect',`data-id="${m.id}" ${owned?'disabled':''}`)}${button('丢弃','discard',`data-id="${m.id}" ${owned?'':'disabled'}`)}</div>`;
    }else if(modal.type==='travel')body=`<h2>魔法药做好了</h2><p>是否前往恶龙盘踞之地？</p><div class="choices">${button('确认','potion-travel')}${button('稍后再去','close')}</div>`;
    else if(modal.type==='drink')body=`<h2>恶龙就在眼前</h2><p>你握着已经调制好的魔法药。</p><div class="choices">${button('喝下药水','drink')}${button('暂时收好','close')}</div>`;
    else body=`<h2>提示</h2><p>${esc(modal.text)}</p>`;
    return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-label="${modal.type==='material'?esc(material(modal.id).name):'游戏提示'}">${button('×','close','class="close" aria-label="关闭窗口"')}${body}</section></div>`;
  }
  function narrativeView(){
    const n=state.narrative;if(!n)return '';
    const line=n.lines[n.index],speaker=line.speaker==='player'?state.playerName:({dragon:'恶龙',cat:'毛绒绒怪',chicken:'傻不拉鸡',princess:'小公主',unknown:'未知的声音'})[line.speaker]||'';
    const npcFile=line.speaker==='dragon'?(line.expression==='smile'?'dragon-smile.png':'dragon.png'):line.speaker==='cat'?(['accepted','rewarded'].includes(state.quests.cat)?'fluffy-reward.png':'fluffy-wait.png'):line.speaker==='chicken'?(state.quests.hatTaken?'chicken.png':'chicken-hat.png'):line.speaker==='princess'?'princess-dialogue.png':null;
    const playerFile=line.form==='pig'?'ending-pig.png':line.form==='ugly'?'ending-ugly.png':'player.png';
    return `<div class="reading-layer"><button type="button" class="reading-surface" data-action="advance" aria-label="点击画面推进文字"></button>${npcFile?(line.speaker==='dragon'?`<img class="npc-portrait" src="assets/${npcFile}" alt="恶龙立绘">`:`<div class="npc-portrait other-npc" data-npc="${line.speaker}">${sprite(npcFile,speaker+'立绘')}</div>`):''}${speaker&&line.speaker!=='unknown'&&!state.endingReality?`<img class="player-portrait" src="assets/${playerFile}" alt="玩家立绘">`:''}<div class="dialogue ${speaker?'':'narration'}" role="button" tabindex="0" data-action="advance" aria-label="点击推进对话">${speaker?`<div class="speaker">${esc(speaker)}</div>`:''}<p id="dialog-text">${esc(line.text.replaceAll('{name}',state.playerName).slice(0,n.shown))}</p><small>${state.phase==='prologue'?'点击画面翻页':'点击画面继续'}</small></div></div>`;
  }

  function render(){
    clearInterval(typingTimer);
    if(['intro','exit'].includes(state.phase)){
      app.innerHTML=`<div class="stage menu"><div class="menu-content" ${modal?'inert':''}><h1>一锅小小的魔法</h1><p>${state.phase==='exit'?'游戏已结束':'小精灵的第一次冒险'}</p>${button('开始','start')}${button('继续','continue',library.autosave||library.slots.some(Boolean)?'':'disabled')}${button('结束游戏','exit')}${button('成就','achievements')}</div>${popup()}${achievementView()}</div>`;
    }else{
      const prologue=state.phase==='prologue',ending=state.phase==='ending',bg=prologue?null:ending?(['gate','companion'].includes(state.endingStage)||state.narrative&&!state.endingReality?'dragon-empty.png':null):state.scene==='ice'&&state.section==='upper'?'ice-upper.png':state.scene==='dragon'&&state.narrative?'dragon-empty.png':backgrounds[state.scene];
      let view='';
      if(prologue)view=`<div class="storybook" aria-label="翻开的故事书"><div class="book-left"><span>一锅小小的魔法</span><i>✦</i></div><div class="book-right"><span>第 ${state.narrative.index+1} 页</span><i>✧</i></div><div class="turning-page" style="--page:${state.narrative.index}"></div></div>`;
      else if(ending){
        if(state.endingStage==='white')view='<button class="white-screen" data-action="ending-white">点击空白处继续</button>';
        else if(state.endingStage==='gate')view=hot('前往光明世界的门','ending-gate','',[66,7,34,50]);
        else if(state.endingStage==='companion')view=spriteObject('dragon-smile.png','与你一起出发的大龙',[26,12,48,76],'ending-companion','');
        else if(!state.narrative)view=`<button class="ending-screen" data-action="ending-next"><span>${state.endingStage==='fin'?'完':`达成结局${({one:'一',two:'二',three:'三',four:'四'})[state.ending]||''}<br>${esc(state.ending==='five'?'光明世界的尽头原来是一双手～':state.ending==='six'?'和我一起去光明世界吧！':D.endings[state.ending].title)}`}</span><small>点击任意空白处继续</small></button>`;
      }
      else if(['brew','mixing','ready'].includes(state.phase)&&state.scene==='lab')view=`<div class="brew-panel ${state.phase==='mixing'?'mixing':''}"><h2>${state.phase==='mixing'?'魔法正在涌现……':state.phase==='ready'?'魔法药做好了':'把背包材料直接拖到锅口'}</h2><p>${state.pot.length}/8 已入锅</p><div id="pot" role="img" aria-label="制药大锅"><div id="pot-mouth" aria-label="锅口">${state.phase==='brew'?'拖到锅口松开':'✦'}</div><span class="pot-decoration" aria-hidden="true">✦</span></div>${state.phase==='brew'?button('开始制药','mix',R.canBrew(state)?'':'disabled'):state.phase==='ready'?button('前往恶龙盘踞之地','potion-prompt'):''}</div>`;
      else view=scene()+(state.phase==='ready'&&state.scene==='dragon'?button('拿出魔法药','potion-prompt','class="potion-button"'):'');
      app.innerHTML=`<div class="stage ${bg?'illustrated':''} ${state.narrative?.allowNavigation?'npc-navigation':''}" ${bg?`style="background-image:url(assets/${bg})"`:''}><div class="world" ${state.narrative&&!state.narrative.allowNavigation||modal?'inert':''}>${!prologue?`<header>${!ending?button('← 返回','back'):''}<div>${button('设置','settings')}${button('背包','bag',`aria-expanded="${bag}"`)}</div></header>`:''}${view}${bag&&!prologue?inventory():''}</div>${state.phase==='ending'&&state.narrative?.lines[state.narrative.index].form&&!state.narrative.lines[state.narrative.index].speaker?`<div class="ending-form-art">${sprite(state.narrative.lines[state.narrative.index].form==='pig'?'ending-pig.png':'ending-ugly.png','变身形态')}</div>`:''}${notice?`<div class="notice" role="status">${esc(notice)}</div>`:''}${narrativeView()}${popup()}${achievementView()}${state.effects?'<div class="magic-smoke" aria-hidden="true"></div>':''}</div>`;
    }
    if(modal?.type==='name')document.getElementById('player-name').focus();
    else if(modal){const controls=app.querySelectorAll('.modal button:not([disabled])');controls[0]?.focus();}
    if(state.narrative){
      const n=state.narrative,line=n.lines[n.index],node=document.getElementById('dialog-text'),fullText=line.text.replaceAll('{name}',state.playerName);
      typingTimer=setInterval(()=>{if(state.narrative!==n){clearInterval(typingTimer);return;}n.shown=Math.min(fullText.length,n.shown+1);node.textContent=fullText.slice(0,n.shown);if(n.shown===fullText.length)clearInterval(typingTimer);},50);
    }
  }
  function say(lines,after=''){modal=null;bag=false;state.narrative={lines:clone(lines),index:0,shown:0,after,allowNavigation:state.scene==='palace'&&state.phase!=='ending'};autosave(true);render();}
  function advance(){
    const n=state.narrative;if(!n)return;
    const text=n.lines[n.index].text.replaceAll('{name}',state.playerName);
    if(state.phase!=='prologue'&&n.shown<text.length){n.shown=text.length;autosave(true);render();return;}
    if(n.index<n.lines.length-1){n.index++;n.shown=0;autosave(true);render();return;}
    state.narrative=null;clearInterval(typingTimer);
    if(n.after==='lab'){
      state.phase='explore';state.scene='lab';state.visited=state.visited||[];
      if(!state.visited.includes('lab')){state.visited.push('lab');say([S.narration(S.intros.lab)]);return;}
    }
    if(n.after==='round'&&state.round>=5){state.dialogueCount=3;showEnding('six');return;}
    if(n.after==='princess-choice'||n.after==='cat-choice'||n.after==='cat-retry'||n.after==='princess-reclaim'){modal={type:n.after};autosave(true);render();return;}
    if(n.after==='princess-gifts'){giftMenu();return;}
    if(n.after==='cat-reward'){if(state.collected.length<8){collectItem('cat_food');modal={type:'text',text:'获得奖励：毛绒绒怪的美食！'};}else modal={type:'cat-reward'};autosave(true);render();return;}
    if(n.after==='ending-story'){state.endingStage=state.ending==='five'?'gate':state.ending==='six'?'companion':'summary';}
    if(n.after==='ending-white'){state.endingStage='white';state.whiteReadyAt=Date.now()+3000;}
    if(n.after==='ending-summary')state.endingStage='summary';
    if(n.after==='ending-gate-choice')modal={type:'gate-ready'};
    if(n.after==='round'&&state.round===4)unlock('listen');
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
    clearTimeout(mixingTimer);cancelDrag();autosavePaused=false;state=Q.normalize(clone(saved));state.round=Number.isInteger(state.round)&&state.round>0?state.round:1;state.adventureId=state.adventureId||'legacy';state.visited=state.visited||[];modal=null;bag=false;notice='进度已读取。';rememberName(state.playerName);
    if(state.phase==='mixing'){state.phase='ready';modal={type:'travel'};}
    else if(state.phase==='ready'&&!state.narrative)modal={type:state.scene==='dragon'?'drink':'travel'};
    autosave();render();
  }
  function showEnding(id){
    clearTimeout(mixingTimer);state.ending=id;state.phase='ending';state.endingStage='story';state.endingReality=false;state.effects=true;setTimeout(()=>{state.effects=false;app.querySelector('.magic-smoke')?.remove();},1400);state.narrative=null;bag=false;modal=null;markEnding();unlock('ending_'+id);if(['one','two','three','four','five','six'].every(e=>achievements.unlocked.includes('ending_'+e)))unlock('all_endings');say(E.endings[id],'ending-story');
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
    state={...Q.normalize(R.createState()),phase:'prologue',scene:'lab',playerName:name,section:'lower',round:library.completed.length+1,adventureId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),visited:[],narrative:null};
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
    if(state.narrative&&!modal&&!(state.narrative.allowNavigation&&['back','settings','bag'].includes(el?.dataset.action))){advance();return;}
    if(!el||el.disabled)return;
    const action=el.dataset.action,id=el.dataset.id;
    // A popup blocks all underlying world controls, including keyboard activation.
    const popupActions=['achievements','cat-accept','cat-refuse','reward-take','reward-leave','reward-discard','reward-discard-item','hat-take','hat-leave','princess-answer','princess-reclaim-yes','princess-reclaim-no','gift-inspect','gifts-all','gifts-select','gifts-later','next-round','next-save','gate-ready','companion-ready','close','reuse-name','change-name','save-list','load-list','menu','restore','save-slot','delete-save','collect','discard','potion-travel','drink'];
    if(modal&&!popupActions.includes(action))return;
    notice='';
    if(!['advance','stone','close'].includes(action)&&!modal)state.quests.clicks.lastAction=action;
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
    else if(action==='menu'||action==='exit'){autosave();clearTimeout(mixingTimer);clearInterval(typingTimer);state={...Q.normalize(R.createState()),phase:action==='exit'?'exit':'intro'};modal=null;bag=false;}
    else if(action==='close'){modal=null;}
    else if(action==='achievements')modal={type:'achievements'};
    else if(action==='bag')bag=!bag;
    else if(action==='scene'){enter(id,el.dataset.section);return;}
    else if(action==='back'){
      const target=returnTarget();
      if(['brew','mixing'].includes(state.phase)&&state.scene==='lab'){clearTimeout(mixingTimer);state.phase='explore';}
      enter(...target);return;
    }else if(action==='stone'){state.quests.clicks.stone=(state.quests.clicks.lastAction==='stone'?state.quests.clicks.stone||0:0)+1;state.quests.clicks.lastAction='stone';if(state.quests.clicks.stone>=3)unlock('stone');say([S.player('诶呀，完全敲不下来！'),S.narration('这里面好像冰冻着可以吃的东西，但是你不管怎么样都无法挪动它。')]);return;}
    else if(action==='inspect'){inspectMaterial(id);autosave(true);return;
    }else if(action==='item')modal={type:'material',id};
    else if(action==='collect'){
      if(modal?.type!=='material'||modal.id!==id)return;
      if(state.collected.length>=8&&!state.collected.includes(id)){modal={type:'text',text:'背包已满，不可继续收集。请先丢弃物品，腾出空格。'};render();return;}
      const result=collectItem(id);if(state.phase==='ending')return;modal=null;
    }else if(action==='discard'){
      if(modal?.type!=='material'||modal.id!==id||!state.collected.includes(id))return;
      if(R.discard(state,id)){
        achievements.discarded++;persistAchievements();if(achievements.discarded>=20)unlock('discard20');
        if(state.scene==='palace'&&gifts.includes(id)&&state.quests.princessClaimed.includes(id)){
          const q=state.quests;q.princessDiscards++;if(!q.princessReturned.includes(id))q.princessReturned.push(id);
          if(q.princessDiscards>=3){q.princessLocked=true;say(N.thirdDiscard);return;}
          say(q.princessDiscards===1?N.discards[0]:N.discards[1+Math.floor(Math.random()*3)]);return;
        }
        notice='已从背包丢弃「'+material(id).name+'」。';
      }modal=null;
    }else if(action==='talk'){
      // The story changes by completed playthroughs, never by repeated clicks.
      if(state.collected.length===0&&!state.quests.hasCollected)unlock('early_dragon');
      say(S.rounds[Math.min((state.round||1)-1,4)],'round');return;
    }else if(action==='cat-talk'){catTalk();return;}
    else if(action==='cat-accept'){state.quests.cat='accepted';say([N.cat('找到后带着妙脆角来见本王！')]);return;}
    else if(action==='cat-refuse'){state.quests.cat='refused';unlock('refuse_cat');say([N.cat('小气精灵！……诶！别走啊，你要是改变主意了记得回来找本大王！')]);return;}
    else if(action==='reward-leave'){state.quests.catRewardGround=true;modal=null;notice='美食留在地上了，腾出空位后可以回来拾取。';}
    else if(action==='reward-discard')modal={type:'reward-discard'};
    else if(action==='reward-discard-item'){
      if(state.collected.includes(id)){R.discard(state,id);achievements.discarded++;persistAchievements();if(achievements.discarded>=20)unlock('discard20');collectItem('cat_food');}modal=null;
    }else if(action==='reward-take'){if(state.quests.catRewardGround){collectItem('cat_food');modal=null;}}
    else if(action==='body-fur'){say([S.player('这些可爱的小毛绒绒似乎在对我眨眼睛？'),N.cat('唔……痛，拔不下来啦！')]);return;}
    else if(action==='hat-take'){
      if(state.collected.length>=8){modal={type:'text',text:'背包已满，不可继续收集。请先腾出一个空位。'};}
      else{const result=collectItem('fallen_leaves');if(result.ok){state.quests.hatTaken=true;state.quests.hatDecided=true;say([N.chicken('咕咕！咕的帽！')]);return;}}
    }else if(action==='hat-leave'){if(!state.quests.hatDecided)unlock('leave_hat');state.quests.hatDecided=true;modal=null;}
    else if(action==='princess-talk'){princessTalk();return;}
    else if(action==='princess-answer'){const branch=Number(id);if(branch>=0&&branch<3){state.quests.princessOffered=true;say(N.branches[branch].concat(N.offer),'princess-gifts');return;}}
    else if(action==='princess-reclaim-yes'){say([N.princess('那就说好啦！本公主可是会记住的。'),S.narration('她把宝物递向你，直到你伸出手，才慢慢松开手指。')],'princess-gifts');return;}
    else if(action==='princess-reclaim-no'){say([N.princess('好吧，我把它们放回收藏室。'),N.princess('想好了再来找我，可不要拿走以后又乱丢呀。')]);return;}
    else if(action==='gift-inspect'){if(princessAvailable().includes(id))modal={type:'material',id};}
    else if(action==='gifts-select'){modal=null;notice='点击画面中的宝物，查看介绍后决定是否收集。';}
    else if(action==='gifts-later'){say([N.princess('现在不想要吗？好吧，那我先替你收着。你可要记得回来找我呀！')]);return;}
    else if(action==='gifts-all'){
      const available=princessAvailable();if(available.length<=8-state.collected.length){for(const gift of available){collectItem(gift);if(state.phase==='ending')return;}say([N.princess('嘿嘿，我就知道你会喜欢！一定要好好珍藏哦，这可是本公主亲自挑选的！')]);return;}
    }else if(action==='tree-fruit'){say([S.player('好多漂亮的蓝色果子呀！可是好高呀够不着……')]);return;}
    else if(action==='lollipop'){countClick('lollipop','lollipop');state.effects=false;notice='巨大的冰棒棒糖诶！小草精好像很爱吃的样子？';autosave(true);render();const stage=app.querySelector('.stage');if(stage){const candy=document.createElement('div');candy.className='candy-shaking-bg';candy.setAttribute('aria-hidden','true');stage.appendChild(candy);setTimeout(()=>candy.remove(),550);}return;}
    else if(action==='cabbage-secret'){unlock('cabbage');say([S.narration('冰草草探出小脑袋：糖糖，糖糖……原来小菜精也来到了这里！')]);return;}
    else if(action==='gate'){countClick('gate','gate');say([S.player('可恶，被恶龙死死地挡住了诶！')]);return;}
    else if(action==='dragon-flowers'){countClick('dragon_flowers','dragon_flowers');notice='花花在风里晃动，挡住你的去路。';}
    else if(action==='bath-bubbles'){countClick('bath_bubbles','bath_bubbles');notice='咕噜咕噜，泡泡又冒了出来。';}
    else if(action==='ending-gate'&&state.endingStage==='gate'){say([S.narration('前方所有阻碍已经清除，前往光明世界吧！')],'ending-gate-choice');return;}
    else if(action==='ending-companion'&&state.endingStage==='companion'){modal={type:'companion-ready'};render();return;}
    else if(action==='ending-white'&&state.endingStage==='white'){if(Date.now()<state.whiteReadyAt)return;state.endingReality=true;say(E.endings.fiveReveal,'ending-summary');return;}
    else if(action==='gate-ready'){state.endingStage='white';state.whiteReadyAt=Date.now()+3000;modal=null;}
    else if(action==='companion-ready'){state.endingReality=true;say(E.endings.sixReveal,'ending-summary');return;}
    else if(action==='ending-next'){
      if(state.endingStage==='summary')state.endingStage='fin';
      else if(state.endingStage==='fin')modal={type:'next-round'};
    }else if(action==='next-round'||action==='next-save'){
      clearTimeout(mixingTimer);state={...Q.normalize(R.createState()),phase:'explore',scene:'lab',playerName:state.playerName,section:'lower',round:(state.round||1)+1,adventureId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),visited:[],narrative:null};bag=false;autosave(true);
      if(action==='next-save')modal={type:'saves',mode:'save'};else{enter('lab');return;}
    }else if(action==='brew'){
      if(state.phase==='ready')modal={type:'travel'};
      else if(state.collected.length!==8||state.collected.some(id=>material(id).questOnly))modal={type:'text',text:'需要八种制药材料。妙脆角是任务道具，不能入锅，请先交给绒绒大王。'};
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
  // Activate a touch release explicitly: browsers may suppress compatibility clicks
  // after pointer-captured dragging. Ignore the later native click to avoid doubling.
  app.addEventListener('pointerup',event=>{
    if(event.pointerType!=='touch'||drag?.active)return;
    const control=event.target.closest('[data-action]');
    if(!control||control.disabled)return;
    event.preventDefault();suppressClickUntil=Date.now()+500;control.click();
  });
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
