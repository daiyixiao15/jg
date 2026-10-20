(function(){
  'use strict';
  const D=GameData,R=GameRules,S=GameStory,Q=GameQuests,N=GameNpcStory,A=GameAchievements,E=GameEndingStory,X=GameExpansion,app=document.getElementById('app');
  S.rounds=X.rounds;
  const KEY='little-magic-library-v2',OLD_KEY='little-magic-save-v1',NAME_KEY='little-magic-last-name';
  const READ_KEY='little-magic-read-v1';
  const readLines=new Set((()=>{try{const value=JSON.parse(localStorage.getItem(READ_KEY));return Array.isArray(value)?value.filter(x=>typeof x==='string'):[];}catch{return [];}})());
  const readKey=line=>JSON.stringify([line.speaker||'',line.text,line.form||'']);
  function rememberLine(line){readLines.add(readKey(line));try{localStorage.setItem(READ_KEY,JSON.stringify([...readLines].slice(-5000)));}catch{}}
  function skipRead(){
    const n=state.narrative;if(!n||n.preview)return;
    if(!readLines.has(readKey(n.lines[n.index]))){notice='';render();return;}
    while(!state.cinematic&&state.narrative===n&&readLines.has(readKey(n.lines[n.index]))){
      n.shown=n.lines[n.index].text.replaceAll('{name}',state.playerName).length;
      const index=n.index;advance();
      if(state.narrative===n&&n.index===index)break;
    }
  }
  let saveDestination=null,saveSource=null;
  const names={lab:'制药所',hub:'中央公园',bath:'泡泡王国',sky:'天空之城',ice:'冰雪塔楼',forest:'梦幻森林',palace:'宫殿长廊',dragon:'恶龙盘踞之地'};
  const backgrounds={hub:'central-park-q85.webp',lab:'lab-q85.webp',bath:'bath-q85.webp',sky:'sky-q85.webp',ice:'ice-q85.webp',forest:'forest-q85.webp',palace:'palace-q85.webp',dragon:'dragon-resting-q85.webp'};
  const itemImages={body_wash:'bath-yellow.png',shampoo:'bath-pink.png',detergent:'bath-powder.png',toothpaste:'bath-berry.png',bleach:'bath-poison.png',soy_sauce:'material-soy-sauce.png',vinegar:'material-vinegar.png',salt:'material-salt.png',sugar:'material-sugar.png',cooking_wine:'material-cooking-wine.png',ice_cream:'sweet-snow.png',dumpling:'dumplings.png',frost:'frost.png',apple:'ice-fruit.png',grape:'grape.png',cabbage:'ice-grass.png',plants:'flowers.png',fallen_leaves:'chicken-leaf.png',cat_fur:'fur.png',skincare:'skincare.png',perfume:'perfume.png',lipstick:'sunset.png',cat_food:'cat-food.png',snack_small:'snack-small.png',snack_large:'snack-large.png'};
  const spots={shampoo:[10,29,14,22],body_wash:[22,32,10,23],detergent:[68,37,14,23],toothpaste:[86,37,10,28],bleach:[79,1,15,19],soy_sauce:[88,46,10,25],vinegar:[30,4,10,21],salt:[64,33,9,15],sugar:[13,53,10,17],cooking_wine:[17,14,10,12],ice_cream:[54,53,39,22],dumpling:[60,73,38,15],frost:[0,30,12,22]};
  Object.assign(spots,{apple:[28,76,24,24],grape:[58,0,25,30],cabbage:[67,41,32,50],plants:[68,0,20,30],cat_fur:[54,79,11,18],fallen_leaves:[0,49,25,50],skincare:[13,45,23,27],perfume:[34,29,17,28],lipstick:[55,37,33,45]});
  let state=Q.normalize(R.createState()),bag=false,modal=null,notice='',typingTimer=null,mixingTimer=null,drag=null,suppressClickUntil=0,autosavePaused=false;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const material=id=>D.materials.concat(Q.questItems).find(m=>m.id===id);
  const gifts=['skincare','perfume','lipstick'];
  const ownsItem=id=>state.collected.includes(id)||state.quests.snacks.includes(id);
  let achievementToasts=[],toastTimer=null,cinematicTimer=null;
  function readAchievements(){try{const raw=JSON.parse(localStorage.getItem(A.key));return {unlocked:Array.isArray(raw?.unlocked)?raw.unlocked.filter(id=>A.entries.some(a=>a.id===id)):[],collected:Array.isArray(raw?.collected)?raw.collected.filter(id=>D.materials.some(m=>m.id===id)):[],discarded:Number.isInteger(raw?.discarded)?Math.max(0,raw.discarded):0};}catch{return {unlocked:[],collected:[],discarded:0};}}
  const achievements=readAchievements();
  function persistAchievements(){try{localStorage.setItem(A.key,JSON.stringify(achievements));}catch{notice='浏览器无法保存成就。';}}
  function unlock(id){if(achievements.unlocked.includes(id))return;const a=A.entries.find(a=>a.id===id);if(!a)return;achievements.unlocked.push(id);persistAchievements();achievementToasts.push(a);achievementToasts=achievementToasts.slice(-3);clearTimeout(toastTimer);toastTimer=setTimeout(()=>{achievementToasts=[];app.querySelector('.achievement-toasts')?.remove();},8000);}
  function recordCollected(id){if(!D.materials.some(m=>m.id===id))return;if(!achievements.collected.includes(id))achievements.collected.push(id);persistAchievements();if(D.materials.every(m=>achievements.collected.includes(m.id)))unlock('all_materials');}
  function countClick(id,achievement){const q=state.quests;q.clicks[id]=(q.clicks[id]||0)+1;if(q.clicks[id]>=3)unlock(achievement);}
  const button=(label,action,attrs='')=>`<button type="button" data-action="${action}" ${attrs}>${esc(label)}</button>`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function dragonProgress(s=state){
    if(!s.dragonProgress)s.dragonProgress={stage:Math.min(Math.max(s.round||1,1),4),poisonSeen:false,talked:false};
    if(s.dragonProgress.stage===5&&!s.dragonProgress.poisonSeen)s.dragonProgress.stage=4;
    return s.dragonProgress;
  }
  function renameSave(){
    if(modal?.type!=='rename-save')return;
    const name=document.getElementById('save-name').value.trim();
    if(!name||name.length>30){notice='请输入1至30个字的存档名。';render();return;}
    const previous=clone(library),id=modal.id;
    if(id==='auto'&&library.autosave)library.autosaveName=name;
    else if(library.slots[Number(id)])library.slots[Number(id)].name=name;else return;
    if(persist()){modal={type:'saves',mode:modal.mode};notice='存档已重命名。';}else library=previous;
    render();
  }
  function valid(s){
    if(s?.dragonProgress&&(!Number.isInteger(s.dragonProgress.stage)||s.dragonProgress.stage<1||s.dragonProgress.stage>5||typeof s.dragonProgress.poisonSeen!=='boolean'||typeof s.dragonProgress.talked!=='boolean'))return false;
    if(s?.quests){const q=s.quests;if(!['new','refused','accepted','rewarded'].includes(q.cat)||!Array.isArray(q.princessClaimed)||!Array.isArray(q.princessReturned)||!Number.isInteger(q.princessDiscards)||q.princessDiscards<0||!q.clicks||typeof q.clicks!=='object')return false;}
    if(s?.phase==='prologue'&&!s.narrative)return false;
    if(s?.phase==='brew'&&s.collected?.length!==8)return false;
    if(s&&s.visited!==undefined&&(!Array.isArray(s.visited)||s.visited.some(key=>!['lab','hub','bath','sky','ice_lower','ice_upper','forest','palace','dragon'].includes(key))))return false;
    if(s&&s.round!==undefined&&(!Number.isInteger(s.round)||s.round<1))return false;
    if(s&&s.adventureId!==undefined&&typeof s.adventureId!=='string')return false;
    return s&&['explore','prologue','brew','mixing','ready','ending'].includes(s.phase)&&names[s.scene]&&typeof s.playerName==='string'&&s.playerName.trim()&&s.playerName.length<=24&&Array.isArray(s.collected)&&s.collected.length<=8&&new Set(s.collected).size===s.collected.length&&s.collected.every(id=>material(id))&&Array.isArray(s.pot)&&new Set(s.pot).size===s.pot.length&&s.pot.every(id=>s.collected.includes(id))&&Number.isInteger(s.dialogueCount)&&s.dialogueCount>=0&&[0,1,2].includes(s.bleachStage)&&['upper','lower'].includes(s.section)&&['ending'].every(()=>s.phase!=='ending'||D.endings[s.ending])&&(!['mixing','ready'].includes(s.phase)||s.pot.length===8)&&(!s.narrative||Array.isArray(s.narrative.lines)&&s.narrative.lines.length>0&&s.narrative.lines.length<=200&&s.narrative.lines.every(l=>typeof l.text==='string'&&l.text.length<1000&&[undefined,'player','dragon','cat','chicken','princess','unknown','tv','mother','fur'].includes(l.speaker))&&Number.isInteger(s.narrative.index)&&s.narrative.index>=0&&s.narrative.index<s.narrative.lines.length&&Number.isInteger(s.narrative.shown)&&s.narrative.shown>=0&&typeof s.narrative.after==='string'&&s.narrative.after.length<60);
  }
  function migrateSave(s){return s&&typeof s==='object'&&!Array.isArray(s)?Q.normalize(s):s;}
  function readLibrary(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY));
      if(raw&&raw.version===2){raw.autosave=migrateSave(raw.autosave);if(Array.isArray(raw.slots))for(const slot of raw.slots)if(slot&&typeof slot==='object')slot.state=migrateSave(slot.state);}
      if(raw&&raw.version===2)return {version:2,autosave:valid(raw.autosave)?raw.autosave:null,slots:Array.from({length:3},(_,i)=>raw.slots?.[i]&&valid(raw.slots[i].state)?raw.slots[i]:null),autosaveName:typeof raw.autosaveName==="string"?raw.autosaveName.slice(0,30):"",televisionSeen:!!raw.televisionSeen,completed:Array.isArray(raw.completed)?raw.completed.filter(id=>typeof id==='string'):[]};
      const old=JSON.parse(localStorage.getItem(OLD_KEY));if(old?.state)old.state=migrateSave(old.state);
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
  function giftMenu(ready=false){
    const available=princessAvailable(),space=8-state.collected.length;
    if(!available.length){say([N.princess('本公主送你的宝物，你有好好收着吗？下次路过，也要记得来找我玩哦！')]);return;}
    if(!space){
      const q=state.quests,lines=q.princessReclaiming?[N.princess('你的背包还是装不下呀。我先替你保管，等你腾出位置再来吧。')]:q.princessCapacityShown?[N.princess('哎呀，背包还是满满的呢。先腾出一点位置吧，我会在这里等你的！')]:[N.princess('诶呀，你的背包怎么鼓鼓的，连一点位置都没有啦！'),N.princess('没关系，我先替你保管。如果你想收下，就腾出一点位置，再来找我吧！'),S.narration('小公主有些不舍地把宝物抱回怀里，又抬头看了看你。她似乎已经开始期待你下一次来了。')];
      q.princessCapacityShown=true;say(lines);return;
    }
    if(space<3&&!ready&&!state.quests.princessReclaiming){say([N.princess('唔，你的背包好像只能再装一点点东西。'),N.princess('那就先挑你最喜欢的吧！剩下的我替你留着，不会送给别人的。')],'princess-gift-menu');return;}
    state.quests.princessCapacityShown=true;
    state.quests.princessBatchSmall=space<3;state.quests.princessGiftBatch=0;modal={type:'gifts',available};autosave(true);render();
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
  function randomDialogue(groups,key){
    const q=state.quests,last=q.randomLast?.[key],available=groups.map((_,i)=>i).filter(i=>groups.length===1||i!==last),index=available[Math.floor(Math.random()*available.length)];
    q.randomLast={...(q.randomLast||{}),[key]:index};return groups[index];
  }
  function catTalk(){
    const q=state.quests;
    q.catMet=true;
    if(q.cat==='new'){say(X.catFirst,'cat-choice');return;}
    if(q.cat==='refused'){say(X.catRetry,'cat-retry');return;}
    if(Q.deliver(state)){unlock('snacks');say(X.catRewardIntro,'cat-farewell');return;}
    if(q.cat==='accepted'){const found=['snack_small','snack_large'].filter(id=>state.quests.snacks.includes(id)).length;say(found?X.catOne:X.catZero);return;}
    if(!q.catFarewellDone){modal={type:'cat-farewell'};render();return;}
    if(q.catRewardGround){modal={type:'cat-reward'};render();return;}
    say(randomDialogue(X.catRandom,'cat'));
  }
  function syncChickenHat(){
    const n=state.narrative;if(!n)return;
    // Follow the actual handover, before the final inventory reward.
    if(n.after==='chicken-return'){
      const offered=n.lines[0]?.text===X.chickenPlead[0].text;
      state.quests.hatTaken=!offered||n.index>=10;
    }else if(n.after==='chicken-grant'){
      state.quests.hatTaken=state.quests.hatOutcome!=='returned'||n.index>=9;
    }else if(state.quests.chickenStage==='done'||state.collected.includes('fallen_leaves')||state.quests.hatRewardPending)state.quests.hatTaken=true;
  }
  function chickenTalk(){
    const q=state.quests;
    if(q.chickenStage==='done'){
      if(q.hatRewardPending&&!state.collected.includes('fallen_leaves')){modal={type:'material',id:'fallen_leaves'};render();return;}
      say(randomDialogue(X.chickenRandom,'chicken'));return;
    }
    if(q.chickenStage==='laugh'){modal={type:'chicken-laugh'};render();return;}
    if(q.chickenStage==='method'){modal={type:'chicken-method'};render();return;}
    if(q.chickenStage==='return'){modal={type:'chicken-return'};render();return;}
    say(X.chickenFirst,'chicken-laugh');
  }
  function televisionTalk(){
    const q=state.quests;
    if(!q.tvIntroDone){say(X.tvIntro,'tv-first-menu');return;}
    if(q.tvReturnPending&&q.tvReturnOrigin){
      q.tvReturnPending=false;const origin=q.tvReturnOrigin;
      if(origin==='dragon'&&q.ladder&&!q.tvLadderReaction){q.tvLadderReaction=true;say(X.tvLadder,'tv-menu');return;}
      let groups=X.tvReturn[origin]||X.tvReturn.lab;
      if(origin==='forest'&&q.cat!=='rewarded')groups=groups.slice(0,1);
      if(origin==='palace'&&!q.princessClaimed.length)groups=groups.slice(0,1);
      say(randomDialogue(groups,'tv-'+origin),'tv-menu');return;
    }
    modal={type:'tv-menu'};render();
  }
  function trackTrip(destination,section){
    const q=state.quests,key=destination==='ice'?'ice_'+(section||'lower'):destination;
    if(destination==='hub'){
      if(state.scene!=='hub'){q.tvReturnOrigin=q.tvTripOrigin||sceneKey();q.tvReturnPending=true;q.tvTripOrigin=null;}
      return;
    }
    const depth={lab:1,bath:1,sky:1,forest:1,palace:1,ice_lower:2,ice_upper:3,dragon:2};
    if(state.scene==='hub'||!q.tvTripOrigin||depth[key]>=(depth[q.tvTripOrigin]||0))q.tvTripOrigin=key;
  }
  function giftAftercare(mode){
    const q=state.quests;if(!q.princessGiftBatch)return false;
    const reclaimed=q.princessBatchReclaimed;q.princessReclaiming=false;q.princessGiftBatch=0;q.princessBatchReclaimed=false;
    if(reclaimed)return false;
    const words=mode==='all'?'嘿嘿，我就知道你会喜欢！一定要好好珍藏哦，这可是本公主亲自挑选的！':q.princessBatchSmall?'收好啦？嘿嘿，要是还想要剩下的宝物，就再来找我吧！':'你的眼光不错嘛！剩下的我先替你留着，你想要的时候，再来找我就好啦。';
    q.princessGiftReminderDone=true;say([N.princess(words),...X.princessReminder]);return true;
  }
  function playImpact(){
    const effectsVolume=coverAudio?.effectsVolume??.7;if(effectsVolume<=0)return;
    try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(115,c.currentTime);o.frequency.exponentialRampToValueAtTime(35,c.currentTime+.45);g.gain.setValueAtTime(.16*effectsVolume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.48);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.5);o.onended=()=>c.close();}catch{}
  }
  function timedScene(kind,milliseconds,next){
    clearTimeout(cinematicTimer);state.cinematic={kind,until:Date.now()+milliseconds,next};autosave(true);render();
    cinematicTimer=setTimeout(finishTimedScene,milliseconds);
  }
  function finishTimedScene(){
    const next=state.cinematic?.next;if(!next)return;state.cinematic=null;cinematicTimer=null;
    if(next==='five-after-hit'){say(X.fiveAfterHit,'ending-story');return;}
    if(next==='five-hospital'){state.endingReality=true;say(X.fiveHospital,'five-finish');return;}
    if(next==='five-home'){autosave(true);render();return;}
    if(next==='six-reality'){state.endingReality=true;say(X.sixReality,'ending-summary',{preview:true});return;}
    if(next==='credits'){showCredits();return;}
    state.endingStage='summary';autosave(true);render();
  }
  function showCredits(){
    state.endingStage='credits';state.creditsUntil=Date.now()+5000;autosave(true);render();clearTimeout(cinematicTimer);
    cinematicTimer=setTimeout(startEaster,5000);
  }
  function startEaster(){
    if(state.phase!=='ending'||state.ending!=='six'||state.endingStage!=='credits')return;
    clearTimeout(cinematicTimer);state.endingStage='easter';state.endingReality=false;say(X.easter,'easter-finished',{preview:true,title:'故事已经翻到了最后一页。\n不过，还有几个家伙，迟迟不肯散场。'});
  }
  function inspectMaterial(id){
    if(state.scene==='forest'&&Q.questItems.some(m=>m.id===id)&&!ownsItem(id)){
      const q=state.quests;
      if(q.cat==='rewarded')return;
      if(!q.catMet){
        if(!q.snacksSeenBefore.includes(id))q.snacksSeenBefore.push(id);
        say(id==='snack_small'?[S.narration('草丛里躺着一个尖尖的小东西。'),S.narration('小精灵伸出手，又停住了。'),S.player('看起来像是谁弄丢的……还是先别乱拿啦。')]:[S.narration('石头旁边也有一个一模一样的东西。'),S.player('怎么又有一个？'),S.player('到底是谁一路掉东西呀……')]);return;
      }
      say([S.player('等等……这个不会就是大王说的妙脆角吧？'),...(q.snacksSeenBefore.includes(id)?[S.player('原来一路掉东西的是你啊！！')]:[])],'snack-pickup:'+id);return;
    }
    if(id==='bleach'){if(state.collected.includes(id)){modal={type:'material',id};render();return;}if(state.quests.ladder){say(X.bleachReach,'bleach-window');return;}say([S.player('呜呜呜太高了够不着，有什么办法可以拿到它呢。可惜我的翅膀是装饰，不然就可以飞起来了！')]);return;}
    if(state.scene==='palace'&&gifts.includes(id)&&!state.collected.includes(id)){
      if(!state.quests.princessMet||!state.quests.princessOffered||state.quests.princessLocked||state.quests.princessReturned.includes(id)){princessTalk();return;}
    }
    if(state.scene==='forest'&&id==='fallen_leaves'){chickenTalk();return;}
    if(state.scene==='forest'&&id==='cat_fur'){state.quests.groundFurSeen=true;if(!state.collected.includes(id)){say(X.groundFur,'ground-fur-window');return;}}
    if(id==='cat_food'&&!state.collected.includes(id)&&!state.quests.catRewardGround){catTalk();return;}
    modal={type:'material',id};render();
  }
  function poisonReturns(){
    say([S.narration('你刚松开手，瓶身两侧的黑色翅膀便“扑棱”一声张开了。'),S.narration('女巫毒药绕着你晃了一圈，一溜烟飞回泡泡王国，稳稳落回了原先的高处。')]);
  }
  function collectItem(id){
    const result=Q.questItems.some(m=>m.id===id)?Q.collectSnack(state,id):R.collect(state,id);
    if(result.ok){state.quests.hasCollected=true;recordCollected(id);if(id==='fallen_leaves')state.quests.hatRewardPending=false;if(gifts.includes(id)){const q=state.quests;q.princessGiftBatch=(q.princessGiftBatch||0)+1;q.princessBatchReclaimed=!!q.princessReclaiming;if(!q.princessClaimed.includes(id))q.princessClaimed.push(id);q.princessReturned=q.princessReturned.filter(x=>x!==id);}if(id==='cat_food')state.quests.catRewardGround=false;}
    if(state.phase==='ending'){showEnding(state.ending);return result;}
    notice=result.message;return result;
  }
  function scene(){
    if(state.scene==='hub')return `${hot('电视机先生','tv-entry','',[19,49,19,29])}${hot('青苹果','park-apple','',[76,26,16,23])}<div class="hub">${['lab','bath','sky','forest','palace'].map(id=>button(names[id],'scene',`data-id="${id}"`)).join('')}</div>`;
    if(state.scene==='lab')return hot('离开制药所','scene','hub',[40,19,15,35])+hot('紫色大锅与搅拌木棍','brew','',[35,53,62,44]);
    if(state.scene==='dragon')return hot('与恶龙互动','talk','',[21,46,76,37])+hot('被恶龙挡住的石头门','gate','',[66,7,34,50])+hot('恶龙身下草坪里的花','dragon-flowers','',[1,84,98,15]);
    if(state.scene==='forest'){
      const q=state.quests;
      let view=hot('毛绒绒怪','cat-talk','',[73,58,27,42])+hot('奇幻花','inspect','plants',spots.plants)+hot('落叶','inspect','fallen_leaves',spots.fallen_leaves)+hot('地上的毛绒绒','inspect','cat_fur',spots.cat_fur);


      view+=[[85.8,59,6.5,8.7],[94.1,68,5.9,8],[73.6,80.4,6.5,8.7]].map((rect,i)=>`<button type="button" class="body-fur-icon" data-action="body-fur" data-id="${i+1}" aria-label="身上的小毛绒绒 ${i+1}" style="left:${rect[0]}%;top:${rect[1]}%;width:${rect[2]}%;height:${rect[3]}%">${sprite('fur-icon.png','身上的小毛绒绒')}</button>`).join('');
      if(q.cat!=='rewarded')for(const [id,rect] of [['snack_small',[29,36,20,19]],['snack_large',[44,14,22,21]]])if(!state.quests.snacks.includes(id))view+=hot(material(id).name,'inspect',id,rect);
      if(q.catRewardGround)view+=spriteObject('cat-food.png','毛绒绒怪的美食',[67,76,9,14],'inspect','cat_food');
      return view;
    }
    if(state.scene==='ice'&&state.section==='upper')return '<svg class="ice-lollipop" viewBox="440 688 778 859" aria-hidden="true"><image href="assets/ice-lollipop.png" width="2800" height="1840" /></svg>'+hot('冰果','inspect','apple',spots.apple)+hot('串串冰','inspect','grape',spots.grape)+hot('冰草草','inspect','cabbage',spots.cabbage)+hot('树上的冰果','tree-fruit','',[0,0,22,33])+hot('冰冰糖','lollipop','',[20,38,28,35]);
    const rows=D.materials.filter(m=>m.scene===state.scene&&(!m.section||m.section===state.section)&&!(m.id==='bleach'&&state.collected.includes('bleach')));
    let view=rows.map(m=>hot(m.name+(state.collected.includes(m.id)?' · 已收集':''),'inspect',m.id,spots[m.id])).join('');
    if(state.scene==='bath')view+=hot('泡泡','bath-bubbles','',[42,32,13,25]);
    if(state.scene==='sky')view+=arrow('前往冰雪塔楼下层','ice','lower');
    if(state.scene==='palace')view+=arrow('前往恶龙盘踞之地','dragon')+hot('小公主','princess-talk','',[65,76,9,17]);
    if(state.scene==='ice'&&state.section==='lower')view+=hot('黄白色冰门 · 前往上层','scene','ice',[43,6,10,21],'data-section="upper"')+hot('大冰石头','stone','',[12,55,18,22])+hot('冰草草彩蛋','cabbage-secret','',[6,75,12,22]);
    return view;
  }
  function inventory(){
    return `<aside class="inventory" aria-label="背包">${state.quests.ladder?'<button class="quest-tool" data-action="ladder-info">任务道具 · 小木梯</button>':''}${state.quests.snacks.map(id=>button('任务道具 · '+material(id).name,'item',`data-id="${id}" class="quest-tool"`)).join('')}<div class="inventory-caption">背包 · ${state.collected.length}/8${state.phase==='brew'?' · 按住材料直接拖到锅口':''}</div><div class="items">${Array.from({length:8},(_,i)=>{const id=state.collected[i],m=material(id);return m?`<button type="button" class="item ${state.pot.includes(id)?'used':''}" data-action="item" data-id="${id}" ${state.phase==='brew'&&!state.pot.includes(id)?'data-draggable="true"':''}>${art(m)}<span>${esc(m.name)}</span>${state.pot.includes(id)?'<small>已入锅</small>':''}</button>`:`<div class="item empty" aria-label="空格 ${i+1}"><span>${i+1}</span></div>`;}).join('')}</div></aside>`;
  }
  function saveList(){
    const saveMode=modal.mode==='save';
    const row=(label,id,exists,action)=>`<div class="save-row">${button(label,action,`data-id="${id}" class="save-slot" ${!saveMode&&!exists?'disabled':''}`)}${exists?button('重命名','rename-save',`data-id="${id}" class="rename-save"`)+button('删除','delete-save',`data-id="${id}" class="delete-save" aria-label="删除${id==='auto'?'自动存档':'存档 '+(Number(id)+1)}"`):''}</div>`;
    return `<h2>${saveMode?'选择存档位置':'选择要继续的存档'}</h2>${!saveMode&&library.autosave?row((library.autosaveName||'自动存档')+' · '+library.autosave.playerName,'auto',true,'restore'):''}${library.slots.map((slot,i)=>row((slot?.name||'存档 '+(i+1))+(slot?' · '+slot.state.playerName+' · '+slot.date:' · 空'),i,!!slot,saveMode?'save-slot':'restore')).join('')}`;
  }
  const choiceModalTypes=new Set(['name','reuse-name','rename-save','reset-game-confirm','new-confirm','delete-confirm','discard-confirm','saved-menu','park-jam-choice','tv-entry','tv-menu','tv-routes','tv-applause','cat-farewell','chicken-laugh','chicken-method','chicken-return','grip-ready','cat-choice','cat-retry','cat-reward','reward-discard','princess-choice','princess-reclaim','gifts','gate-ready','companion-ready','next-round','snack-pickup','travel','drink']);
  function popup(){
    if(!modal)return '';
    let body='';
    if(modal.type==='name')body=`<form id="name-form"><h2>小精灵，你叫什么名字？</h2><input id="player-name" maxlength="24" required autocomplete="off" aria-label="玩家名字" placeholder="输入你的名字"><div class="choices">${button('取消','close')}<button type="button" data-action="begin-adventure">开始冒险</button></div></form>`;
    else if(modal.type==='reuse-name')body=`<h2>继续使用上次的名字吗？</h2><p>上次使用的名字是「${esc(lastName)}」。</p><div class="choices">${button('继续使用','reuse-name')}${button('换一个名字','change-name')}</div>`;
    else if(modal.type==='rename-save')body=`<form id="rename-save-form"><h2>重命名存档</h2><input id="save-name" value="${esc(modal.name)}" maxlength="30" required aria-label="存档名字"><div class="choices">${button('取消','rename-cancel')}${button('保存名字','rename-confirm')}</div></form>`;
    else if(modal.type==='settings')body=`<h2>设置</h2>${!['intro','exit'].includes(state.phase)?`<div class="setting-buttons in-game-settings">${button('存档','save-list')}${button('读档','load-list')}${button('返回标题画面','menu')}</div>`:''}<div class="audio-settings"><label class="audio-setting-row"><span>音乐</span><input type="range" min="0" max="100" value="${Math.round((coverAudio?.muted?0:coverAudio?.volume??.45)*100)}" data-music-volume aria-label="音乐音量"><output>${Math.round((coverAudio?.muted?0:coverAudio?.volume??.45)*100)}%</output></label><label class="audio-setting-row"><span>音效</span><input type="range" min="0" max="100" value="${Math.round((coverAudio?.effectsVolume??.7)*100)}" data-effects-volume aria-label="音效音量"><output>${Math.round((coverAudio?.effectsVolume??.7)*100)}%</output></label>${button('重置游戏数据','reset-game','class="reset-game-button"')}</div>`;
    else if(modal.type==='reset-game-confirm')body=`<h2>确定重置游戏数据吗？</h2><p>所有自动存档、手动存档、成就和已读进度都会清空，游戏将从头开始。此操作无法恢复。</p><div class="choices">${button('取消','confirm-cancel')}${button('确定重置','reset-game-confirm')}</div>`;
    else if(modal.type==='new-confirm')body=`<h2>要开启一段全新的冒险吗？</h2><p>已有冒险尚未达到最终结局。开始新冒险会从第一周目重新开始，大龙的剧情进度重新计算，自动存档将被覆盖。手动存档和成就会保留。若想接着揭示故事，请选择‘继续已有冒险’。</p><div class="choices new-adventure-choices">${button('继续已有冒险','load-list')}${library.autosave?button('先保存旧进度','start-backup'):''}${button('开始新冒险','new-confirm')}${button('取消','close')}</div>`;
    else if(modal.type==='delete-confirm')body=`<h2>你确定要删除吗？</h2><p>即将删除「${esc(modal.name)}」。删除后无法恢复，其他存档和已获得的成就会保留。</p><div class="choices">${button('确定','delete-confirm')}${button('取消','confirm-cancel')}</div>`;
    else if(modal.type==='discard-confirm')body=`<h2>丢弃这件物品吗？</h2><p>${modal.id==='fallen_leaves'?'你确定要丢掉傻不拉鸡送你的帽子吗？丢了就再也找不到了哦。':`即将从背包中丢弃「${esc(material(modal.id).name)}」。${gifts.includes(modal.id)?'小公主可能会在意你丢弃她的礼物。':'需要时可能要重新寻找。'}`}</p><div class="choices">${button('取消','confirm-cancel')}${button('确认丢弃','discard-confirm')}</div>`;
    else if(modal.type==='saved-menu')body=`<h2>冒险记录已保存。</h2><p>下次在标题页点击‘继续’，选择这份存档，就能接着冒险。</p><div class="choices">${button('返回标题','saved-menu')}</div>`;
    else if(modal.type==='saves')body=saveList();
    else if(modal.type==='achievements')body=`<h2>成就 · ${achievements.unlocked.length}/${A.entries.length}</h2><div class="achievement-list">${A.entries.map(a=>`<div class="${achievements.unlocked.includes(a.id)?'unlocked':'locked'}"><strong>${esc(a.title)}</strong><small>${esc(a.description)}</small><span>${achievements.unlocked.includes(a.id)?'已达成':'未达成'}</span></div>`).join('')}</div>`;
    else if(modal.type==='park-jam-choice')body=`<h2>要尝尝吗？</h2><div class="choices">${button('尝尝','park-jam-taste')}${button('不要！','park-jam-refuse')}</div>`;
    else if(modal.type==='tv-entry')body=`<h2>电视机先生</h2><div class="setting-buttons">${button('和电视机先生聊聊天','tv-chat')}${button('我先自己逛逛','tv-wander')}</div>`;
    else if(modal.type==='tv-menu')body=`<h2>想问哪条路？</h2><div class="setting-buttons">${['我想收集制药材料','我想去找大龙','介绍一下这里的路','你的方向真的靠谱吗？'].map((label,i)=>button(label,'tv-topic',`data-id="${i}"`)).join('')}${state.round>1&&library.televisionSeen?button('我赶时间，我先走了！','tv-hurry'):''}</div>`;
    else if(modal.type==='tv-routes')body=`<h2>中央公园的路</h2><div class="setting-buttons">${['制药所','泡泡王国','天空之城与冰雪塔楼','梦幻森林','宫殿长廊'].map((label,i)=>button(label,'tv-route',`data-id="${i}"`)).join('')}${button('我都知道啦','tv-routes-done')}</div>`;
    else if(modal.type==='tv-applause')body=`<h2>现在可以鼓掌了。</h2><div class="choices">${button('认真鼓掌','tv-clap')}${button('给它竖起大拇指','tv-thumb')}</div>`;
    else if(modal.type==='cat-farewell')body=`<h2>拿了本王的宝物，你要去哪呢？</h2><div class="setting-buttons">${button('嘘——我要去很远的地方～','cat-far')}${button('我要炼制出变强药水打败恶龙去往光明世界！','cat-dragon')}</div>`;
    else if(modal.type==='chicken-laugh')body=`<h2>它叫傻不拉鸡。</h2><div class="choices">${button('笑','chicken-laugh')}${button('绷住','chicken-hold')}</div>`;
    else if(modal.type==='chicken-method')body=`<h2>你想了想……</h2><div class="setting-buttons">${button('管他呢，上手抢就完了！','chicken-grab')}${button('呜呜呜……你为什么不愿意送给这只可怜的小精灵你的帽子呢？','chicken-plead')}</div>`;
    else if(modal.type==='chicken-return')body=`<h2>是否还给傻不拉鸡？</h2><div class="choices">${button('还','chicken-return')}${button('不还','chicken-keep')}</div>`;
    else if(modal.type==='grip-ready')body=`<h2>抓稳了吗？</h2>${button('抓稳啦！','grip-ready')}`;
    else if(modal.type==='cat-choice')body=`<h2>是否帮助这只傲娇的毛绒绒怪？</h2><div class="choices">${button('是','cat-accept')}${button('否','cat-refuse')}</div>`;
    else if(modal.type==='cat-retry')body=`<h2>绒绒大王又给了你一次机会</h2>${button('谢谢大王！','cat-accept')}`;
    else if(modal.type==='cat-received')body=`<div class="item-art">${art(material('cat_food'))}</div><h2>获得奖励：毛绒绒怪的美食！</h2><p>${esc(material('cat_food').description)}</p>`;
    else if(modal.type==='cat-reward')body=`<div class="item-art">${art(material('cat_food'))}</div><h2>获得奖励：毛绒绒怪的美食！</h2><p>${esc(material('cat_food').description)}</p><p>${state.collected.length>=8?'你的背包已经放不下啦！':'绒绒大王把美食递给你。'}</p><div class="choices">${button(state.collected.length>=8?'从背包里丢一个东西':'收下美食',state.collected.length>=8?'reward-discard':'reward-take')}${button('丢掉毛绒绒怪的美食','reward-leave')}</div>`;
    else if(modal.type==='reward-discard')body=`<h2>从背包里丢一个东西</h2><div class="gift-list">${state.collected.map(id=>button(material(id).name,'reward-discard-item',`data-id="${id}"`)).join('')}</div>`;
    else if(modal.type==='hat')body=`<h2>你确定要抢走傻不拉鸡的帽子吗？</h2><div class="choices">${button('确定','hat-take')}${button('算了','hat-leave')}</div>`;
    else if(modal.type==='princess-choice')body=`<h2>你是公主吗？</h2><div class="setting-buttons">${['我不是公主','我是精灵公主！','我只是一般路过的小精灵'].map((label,i)=>button(label,'princess-answer',`data-id="${i}"`)).join('')}</div>`;
    else if(modal.type==='princess-reclaim')body=`<h2>怎么啦，你又想要它们了吗？</h2><div class="choices">${button('这次我会珍惜的','princess-reclaim-yes')}${button('我还是先不拿了','princess-reclaim-no')}</div>`;
    else if(modal.type==='gifts')body=`<h2>小公主的宝物</h2><p>${8-state.collected.length>=3?'你可以查看宝物，再决定收下哪些。':`背包还有${8-state.collected.length}个空位，最多可以选择${8-state.collected.length}件宝物。`}</p><div class="gift-list">${princessAvailable().map(id=>`<button data-action="gift-inspect" data-id="${id}">${art(material(id))}<span>${esc(material(id).name)}</span></button>`).join('')}</div><div class="choices">${8-state.collected.length>=princessAvailable().length?button('全部收下','gifts-all'):''}${button('挑选喜欢的宝物','gifts-select')}${button('暂时不收','gifts-later')}</div>`;
    else if(modal.type==='gate-ready')body=`<h2>前往光明世界吧！</h2>${button('我准备好了！','gate-ready')}`;
    else if(modal.type==='companion-ready')body=`<h2>和你的大龙一起前往光明世界吧！</h2>${button('我这次是真的准备好啦！','companion-ready')}`;
    else if(modal.type==='next-round'&&state.ending==='six')body=`<h2>故事暂时告一段落。</h2><p>你已经抵达最终结局，可以保存这段冒险，也可以再去看看熟悉的朋友们。</p><div class="choices">${button('保存并返回标题','ending-save-menu')}${button('继续下一周目','next-round')}${button('返回标题','menu')}</div>`;
    else if(modal.type==='next-round')body=`<h2>这次冒险结束了，故事还没有。</h2><p>还有一些话，你和大龙没有说完。保存这次冒险，下次点击标题页的‘继续’，就能带着当前的故事进度开启下一周目。自动存档会随游玩更新，建议另存一份手动存档。</p><div class="choices">${button('保存并返回标题','ending-save-menu')}${button('继续下一周目','next-round')}${button('暂不手动保存，返回标题','menu')}</div>`;
    else if(modal.type==='snack-pickup')body=`<div class="item-art">${art(material(modal.id))}</div><h2>${esc(material(modal.id).name)}</h2><div class="choices">${button('捡起来','snack-pickup',`data-id="${modal.id}"`)}${button('暂时不拿','close')}</div>`;
    else if(modal.type==='material'){
      const m=material(modal.id),owned=ownsItem(m.id),reading=!!state.narrative;
      body=`<div class="item-art">${art(m)}</div><h2>${esc(m.name)}</h2><p>${esc(m.description)}</p>${reading?'<p class="storage-note">对话期间可以查看物品，结束对话后可整理背包。</p>':''}<div class="choices">${button(owned?'已收集':'收集','collect',`data-id="${m.id}" ${owned||reading?'disabled':''}`)}${button('丢弃','discard',`data-id="${m.id}" ${owned&&!reading?'':'disabled'}`)}</div>`;
    }else if(modal.type==='travel')body=`<h2>魔法药做好了</h2><p>是否前往恶龙盘踞之地？</p><div class="choices">${button('确认','potion-travel')}${button('稍后再去','close')}</div>`;
    else if(modal.type==='drink')body=`<h2>恶龙就在眼前</h2><p>你握着已经调制好的魔法药。</p><div class="choices">${button('喝下药水','drink')}${button('暂时收好','close')}</div>`;
    else body=`<h2>提示</h2><p>${esc(modal.text)}</p>`;
    return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-label="${modal.type==='material'?esc(material(modal.id).name):'游戏提示'}">${choiceModalTypes.has(modal.type)?'':button('×','close','class="close" aria-label="关闭窗口"')}${body}</section></div>`;
  }
  function companionFarewellIndex(n){
    return state.ending==='six'&&n?.after==='ending-summary'?n.lines.findIndex(line=>line.moment==='farewell'||line.text==='你是不是还没和他们好好道别呢'):-1;
  }
  function narrativeView(){
    const n=state.narrative;if(!n)return '';
    if(n.title)return `<div class="reading-layer"><button type="button" class="ending-screen" data-action="advance" aria-label="点击观看彩蛋画面"><span>${esc(n.title)}</span><small>点击画面继续</small></button></div>`;
    if(n.preview)return '<div class="reading-layer cg-preview"><button type="button" class="reading-surface" data-action="advance" aria-label="点击开始对白"></button></div>';
    const line=n.lines[n.index],speaker=line.speaker==='player'?state.playerName:({dragon:'恶龙',cat:'毛绒绒怪',chicken:'傻不拉鸡',princess:'小公主',unknown:'未知的声音',tv:'电视机先生',mother:'妈妈',fur:'毛绒绒'})[line.speaker]||'';
    if(line.centered||n.index===companionFarewellIndex(n))return `<div class="reading-layer centered-reading"><button type="button" class="reading-surface" data-action="advance" aria-label="点击画面推进文字"></button><div class="centered-message"><p id="dialog-text">${esc(line.text.replaceAll('{name}',state.playerName).slice(0,n.shown))}</p></div><small>点击画面继续</small></div>`;
    const cgOnly=state.phase==='prologue'||!!pigMudCG()||!!uglyReflectionCG()||!!chefOpeningCG()||state.phase==='ending'&&(state.ending==='four'||state.endingStage==='easter');
    const catThinking=n.after==='cat-choice'&&(line.expression==='thinking'||line.text==='魔法材料？'||line.text.includes('这只黑色毛球的眼睛藏在'));
    const npcNames={dragon:'恶龙',cat:'毛绒绒怪',chicken:'傻不拉鸡',princess:'小公主',fur:'毛绒绒',tv:'电视机先生'};
    // Keep the conversation partner visible while the player or narrator speaks.
    const sceneLines=n.lines.filter((entry,index)=>index<=n.index&&entry.setting===line.setting);
    const npcLine=npcNames[line.speaker]?line:[...sceneLines].reverse().find(entry=>npcNames[entry.speaker])||n.lines.slice(n.index+1).find(entry=>entry.setting===line.setting&&npcNames[entry.speaker]);
    const portraitSpeaker=catThinking?'cat':npcLine?.speaker||(n.after==='round'?'dragon':null);
    // Chef park scenes use ordinary dialogue portraits over the arrival backgrounds.
    const endingCG=state.phase==='ending'&&(!!endingBackground()||state.ending==='six');
    const pigRevealIndex=n.lines.findIndex(entry=>entry.form==='pig'&&!entry.speaker);
    const hidePigOpeningDragon=state.phase==='ending'&&state.ending==='one'&&pigRevealIndex>=0&&n.index<=pigRevealIndex&&portraitSpeaker==='dragon';
    const npcFile=cgOnly||endingCG||hidePigOpeningDragon||state.endingReality||line.setting==='black'?null:catThinking?'fluffy-thinking.png':portraitSpeaker==='dragon'?(npcLine?.expression==='smile'?'dragon-smile.png':'dragon.png'):portraitSpeaker==='cat'?(state.quests.cat==='rewarded'?'fluffy-delivered.png':state.quests.cat==='accepted'?'fluffy-reward.png':'fluffy-wait.png'):portraitSpeaker==='chicken'?(state.phase==='ending'||state.quests.hatTaken?'chicken-dialogue.png':'chicken-hat-dialogue.png'):portraitSpeaker==='princess'?N.princessPortrait(npcLine?.text):portraitSpeaker==='fur'?'fur-dialogue.png':portraitSpeaker==='tv'?'tv-dialogue.png':null;
    const playerFile=line.form==='chef'?'player-chef.png':line.form==='beast'?'red-dragon.png':line.form==='pig'?'ending-pig.png':line.form==='ugly'?'ending-ugly.png':'player.png';
    return `<div class="reading-layer"><button type="button" class="reading-surface" data-action="advance" aria-label="点击画面推进文字"></button>${npcFile?(portraitSpeaker==='dragon'?`<div class="npc-portrait dragon-full-body" data-npc="dragon">${sprite(npcFile,"恶龙立绘")}</div>`:`<div class="npc-portrait other-npc" data-npc="${portraitSpeaker}">${sprite(npcFile,npcNames[portraitSpeaker]+'立绘')}</div>`):''}${!line.hidePortrait&&!cgOnly&&speaker&&line.speaker!=='unknown'&&!state.endingReality&&n.after!=='easter-finished'&&line.form!=='bubble'&&line.setting!=='black'?`${line.form==='chef'?`<div class="player-portrait chef-player-portrait">${sprite(playerFile,"玩家立绘").replace("xMidYMid meet","xMidYMax meet")}</div>`:["pig","ugly"].includes(line.form)?`<div class="player-portrait ending-dialogue-portrait">${sprite(playerFile,"玩家立绘").replace("xMidYMid meet","xMinYMax meet")}</div>`:`<img class="player-portrait" src="assets/${playerFile}" alt="玩家立绘">`}`:''}<div class="dialogue ${speaker?'':'narration'}" role="button" tabindex="0" data-action="advance" aria-label="点击推进对话">${speaker?`<div class="speaker">${esc(speaker)}</div>`:''}<p id="dialog-text">${esc(line.text.replaceAll('{name}',state.playerName).slice(0,n.shown))}</p><small>${state.phase==='prologue'?'点击画面翻页':'点击画面继续'}</small></div></div>`;
  }

  function endingFormArt(){
    const n=state.narrative,line=n?.lines[n.index];
    if(state.phase!=='ending'||!n||n.preview||n.title||!line||line.hidePortrait||line.setting||line.speaker)return '';
    if(line.form==='beast'||pigMudCG()||uglyReflectionCG())return '';
    const file=({pig:'ending-pig.png',ugly:'ending-ugly.png'})[line.form];
    if(!file)return '';
    const reveal=['one','three'].includes(state.ending)&&!n.lines.slice(0,n.index).some(previous=>previous.form===line.form);
    if(!reveal)return '';
    return `<div class="ending-form-art${reveal?' transformation-reveal':''}" aria-label="${reveal?'变身立绘展示':'变身形态'}">${sprite(file,'变身形态')}</div>`;
  }

  function endingBackground(){
    if(state.phase!=='ending'||!state.narrative)return null;
    if(state.ending==='four')return 'ending-bubble-q85.webp';
    if(pigMudCG())return pigMudCG();
    if(uglyReflectionCG())return uglyReflectionCG();
    if(chefOpeningCG())return chefOpeningCG();
    const n=state.narrative,setting=n.lines[n.index].setting;
    if(state.ending==='five'&&n.after==='five-hit'&&!state.endingReality){
      const from=n.lines.findIndex(line=>line.text.startsWith('你感到一阵头晕目眩'));
      if(from>=0&&n.index>=from)return 'ending-beast-battle-q85.webp';
    }
    if(state.ending==='five'&&n.after==='five-finish'&&['home','home-lookback'].includes(setting)){
      // Derive the range from dialogue too, so existing saves get the corrected CG sequence.
      const from=n.lines.findIndex(line=>line.text.startsWith('你回过头去'));
      const to=n.lines.findIndex((line,i)=>i>=from&&line.text.startsWith('没事妈妈'));
      return from>=0&&to>=from&&n.index>=from&&n.index<=to?'ending-home-lookback-q85.webp':'ending-home-q85.webp';
    }
    return ({ceiling:'ending-ceiling-q85.webp',home:'ending-home-q85.webp','home-lookback':'ending-home-lookback-q85.webp',peek:'ending-easter-q85.webp'})[setting]||null;
  }
  function pigMudCG(){
    const n=state.narrative;
    if(state.phase!=='ending'||state.ending!=='one'||!n||n.title||n.preview)return null;
    const start=n.lines.findIndex(line=>line.text==='哼唧！哼唧哼唧！');
    const end=n.lines.findIndex((line,index)=>index>=start&&line.text.startsWith('大龙没有喷火，也没有赶你走。'));
    return start>=0&&end>=start&&n.index>=start&&n.index<=end?'ending-pig-mud.png':null;
  }
  function uglyReflectionCG(){
    const n=state.narrative;
    if(state.phase!=='ending'||state.ending!=='three'||!n||n.title||n.preview)return null;
    const start=n.lines.findIndex(line=>line.text.startsWith('你还没来得及放下瓶子'));
    const end=n.lines.findIndex((line,index)=>index>=start&&line.text==='好吧，是我。');
    return start>=0&&end>=start&&n.index>=start&&n.index<=end?'ending-ugly-reflection.png':null;
  }
  function chefOpeningCG(){
    const n=state.narrative;if(state.phase!=='ending'||state.ending!=='two'||!n||n.title||n.preview)return null;
    const park=n.lines.findIndex(line=>line.setting==='park');
    return park>=0&&n.index<park?'ending-chef-spoon.jpg':null;
  }
  function chefBackground(){
    const n=state.narrative;
    if(state.phase!=='ending'||state.ending!=='two'||n?.lines[n.index]?.setting!=='park')return null;
    // Reveal each arrival only after its first park dialogue has been advanced.
    const stages={tv:1,cat:2,princess:3,dragon:4,chicken:5};
    let stage=0;
    for(const line of n.lines.slice(0,n.index))if(line.setting==='park')stage=Math.max(stage,stages[line.speaker]||0);
    return ['chef-park-empty-q85.webp','chef-park-tv-q85.webp','chef-park-cat-q85.webp','chef-park-princess-q85.webp','chef-park-dragon-q85.webp','chef-park-all-q85.webp'][stage];
  }

  // The document's three illustrations span dialogue groups, rather than single lines.
  const storybookPages=['storybook-page-1-q85.webp','storybook-page-2-q85.webp','storybook-page-3-q85.webp','storybook-dragon-resting-lossless.webp','storybook-dragon.jpg','storybook-dragon.jpg','storybook-magic-lossless.webp','storybook-journey-lossless.webp','storybook-journey-lossless.webp'];
  let lastBookPage=-1,bookTransitionPending=false,bookTransitionTimer=null,stopBookTurn=null;
  function storybookView(){
    const index=state.narrative.index,file=storybookPages[index];
    const previous=storybookPages[lastBookPage],changed=file!==previous;
    lastBookPage=index;
    if(changed){
      clearTimeout(bookTransitionTimer);bookTransitionPending=false;
      if(file&&previous&&typeof GameBookPhysics!=='undefined')bookTransitionPending=true;
    }
    if(!file)return `<div class="storybook" aria-label="翻开的故事书"><div class="book-left"><span>一锅小小的魔法</span><i>✦</i></div><div class="book-right"><span>第 ${index+1} 页</span><i>✧</i></div></div>`;
    const ink=image=>`<div class="book-ink" style="background-image:url(assets/${image})"></div>`;
    return `<div class="storybook illustrated-book${changed&&previous?' physics-turn':''}" aria-label="绘本第 ${index+1} 页" data-page="${index+1}"><div class="book-left">${ink(file)}</div><div class="book-right">${ink(file)}</div>${changed&&previous?`<canvas class="book-physics-canvas" data-from="${previous}" data-to="${file}" aria-hidden="true"></canvas><div class="book-loading-cover" style="background-image:url(assets/${previous})" aria-hidden="true"></div>`:''}<div class="book-spine" aria-hidden="true"></div></div>`;
  }
  const coverAudio=typeof GameCoverAudio!=='undefined'?GameCoverAudio.create():null;
  const backgroundLoader=typeof GameBackgroundLoader!=='undefined'?GameBackgroundLoader.create():null;
  function backgroundMusic(){
    if(state.phase==='intro')return 'cover';
    if(state.phase==='prologue')return 'prologue';
    if(state.phase==='ending'){
      if(state.ending==='six')return state.endingStage==='easter'||state.easterSeen?'easter':'trueTwo';
      if(['summary','fin','credits','epilogue','easter'].includes(state.endingStage))return 'summary';
      return ({one:'pig',two:'chef',three:'ugly',four:'bubble',five:'trueOne',six:'trueTwo'})[state.ending]||null;
    }
    if(['explore','brew','mixing','ready'].includes(state.phase))return state.scene==='dragon'?'dragon':state.scene==='ice'?'ice':'collection';
    return null;
  }
  function likelyBackgrounds(){
    if(['hub','palace'].includes(state.scene)&&state.phase!=='ending')return ['default','proud','sad','smile','confused'].map(name=>`princess-${name}.webp`).concat(state.scene==='hub'?['central-park-dialogue-q85.webp',backgrounds.bath,backgrounds.sky,backgrounds.forest,backgrounds.palace,backgrounds.lab]:[backgrounds.dragon,backgrounds.hub]);
    if(state.scene==='bath'&&state.phase!=='ending')return [backgrounds.hub,backgrounds.bath,'bath-no-poison.webp'];
    if(['intro','exit'].includes(state.phase))return [...new Set(storybookPages)];
    if(state.phase==='prologue')return [...new Set(storybookPages.slice(state.narrative.index+1)),backgrounds.lab];
    if(state.phase==='ending'){
      if(state.ending==='two'){
        const files=['chef-park-empty-q85.webp','chef-park-tv-q85.webp','chef-park-cat-q85.webp','chef-park-princess-q85.webp','chef-park-dragon-q85.webp','chef-park-all-q85.webp'];
        return files.slice(Math.max(0,files.indexOf(chefBackground())+1),Math.max(0,files.indexOf(chefBackground())+1)+2);
      }
      if(state.ending==='five'){
        const files=['ending-beast-battle-q85.webp','dragon-empty-q85.webp','ending-ceiling-q85.webp','ending-home-q85.webp','ending-home-lookback-q85.webp'];
        const current=endingBackground();
        if(current==='ending-home-lookback-q85.webp')return ['ending-home-q85.webp'];
        return files.slice(Math.max(0,files.indexOf(current)+1),Math.max(0,files.indexOf(current)+1)+2);
      }
      if(state.ending==='six')return state.endingReality?['ending-companion-friends-q85.webp','ending-home-q85.webp']:['dragon-boarding-q85.webp','ending-companion-q85.webp'];
      return ['dragon-empty-q85.webp'];
    }
    return ({lab:[backgrounds.hub],hub:['central-park-dialogue-q85.webp',backgrounds.bath,backgrounds.sky,backgrounds.forest,backgrounds.palace,backgrounds.lab],bath:[backgrounds.hub],sky:[backgrounds.ice,backgrounds.hub],ice:state.section==='upper'?[backgrounds.ice]:['ice-upper-q85.webp',backgrounds.sky],forest:[backgrounds.hub],palace:[backgrounds.dragon,backgrounds.hub],dragon:['dragon-empty-q85.webp',backgrounds.palace]})[state.scene]||[];
  }
  function render(){
    let visibleBackground=null;
    clearInterval(typingTimer);
    if(['intro','exit'].includes(state.phase)){
      lastBookPage=-1;bookTransitionPending=false;clearTimeout(bookTransitionTimer);visibleBackground='cover-q85.webp';
      app.innerHTML=`<div class="stage menu cover-menu" style="background-image:url(assets/cover-q85.webp)"><div class="menu-content" ${modal?'inert':''}><h1>一锅小小的魔法</h1><p>${state.phase==='exit'?'游戏已结束':'小精灵的第一次冒险'}</p>${button('开始','start')}${button('继续','continue',library.autosave||library.slots.some(Boolean)?'':'disabled')}${button('设置','settings')}${button('成就','achievements')}</div>${popup()}${achievementView()}</div>`;
    }else{
      const prologue=state.phase==='prologue',ending=state.phase==='ending',tvConversation=state.scene==='hub'&&!ending&&(state.narrative?.lines.some(line=>line.speaker==='tv')||modal?.type.startsWith('tv-')),boardingCG=ending&&state.ending==='six'&&state.endingStage==='companion'&&!state.endingReality,companionCG=ending&&state.ending==='six'&&state.endingReality&&state.narrative?.after==='ending-summary',farewellIndex=companionFarewellIndex(state.narrative),friendsRevealed=companionCG&&farewellIndex>=0&&(state.narrative.friendsRevealed||state.narrative.index>farewellIndex),bg=prologue||state.narrative?.title||state.narrative?.lines[state.narrative.index].setting==='black'?null:endingBackground()?endingBackground():chefBackground()?chefBackground():tvConversation?'central-park-dialogue-q85.webp':ending&&state.ending==='five'&&state.endingReality&&state.narrative?.after==='five-finish'?'ending-home-q85.webp':companionCG?(friendsRevealed?'ending-companion-friends-q85.webp':'ending-companion-q85.webp'):boardingCG?'dragon-boarding-q85.webp':ending&&state.endingStage==='easter'?'ending-easter-q85.webp':ending?(state.narrative?.lines[state.narrative.index].setting?null:['gate','companion'].includes(state.endingStage)||state.narrative&&!state.endingReality&&!['light-story','easter'].includes(state.endingStage)?'dragon-empty-q85.webp':null):state.scene==='ice'&&state.section==='upper'?'ice-upper-no-lollipop.webp':state.scene==='dragon'&&state.narrative?.after==='round'?'dragon-empty-q85.webp':state.scene==='bath'&&state.collected.includes('bleach')?'bath-no-poison.webp':backgrounds[state.scene];
      visibleBackground=bg;
      let view='';
      if(prologue){view=storybookView();visibleBackground=storybookPages[state.narrative.index]||null;}
      else if(ending){
        if(state.cinematic)view=`<div class="cinematic ${state.cinematic.kind}" aria-live="polite">${state.cinematic.kind==='impact'?'<span>✿</span><span>✿</span><span>✿</span><span>✿</span>':''}</div>`;
        else if(companionCG)view='';
        else if(state.endingStage==='mother-call'&&!state.narrative)view='<button class="ending-screen" data-action="ending-wake">是妈妈在叫我</button>';
        else if(state.endingStage==='credits')view=`<button class="ending-screen credits" data-action="credits-skip"><strong>制作团队</strong><span>${esc(X.creditsName)}</span><p>感谢游玩</p><small>本游戏所有情节均为虚构，千万不要模仿小精灵乱喝东西哦～<br>点击任意位置继续</small></button>`;
        else if(state.endingStage==='epilogue')view=`<button class="ending-screen" data-action="ending-next"><span>${esc(X.epilogue[0].text).replaceAll('\n','<br>')}</span><small>点击画面继续</small></button>`;
        else if(state.endingStage==='white')view='<button class="white-screen" data-action="ending-white">点击空白处继续</button>';
        else if(state.endingStage==='gate')view=hot('前往光明世界的门','ending-gate','',[66,7,34,50]);
        else if(state.endingStage==='companion')view=hot('爬上大龙的背','ending-companion','',[20,46,80,39]);
        else if(!state.narrative)view=`<button class="ending-screen" data-action="ending-next"><span>${state.endingStage==='fin'?'完':`${state.ending==='six'?'达成真结局二':`达成结局${({one:'一',two:'二',three:'三',four:'四'})[state.ending]||''}`}<br>${esc(state.ending==='five'?'光明世界的尽头是一双手':state.ending==='six'?'和我一起去光明世界吧！':D.endings[state.ending].title)}${E.captions[state.ending]?`<br><span class="ending-caption">${esc(E.captions[state.ending])}</span>`:''}`}</span><small>点击任意空白处继续</small></button>`;
      }
      else if(['brew','mixing','ready'].includes(state.phase)&&state.scene==='lab')view=`<div class="brew-panel ${state.phase==='mixing'?'mixing':''}"><h2>${state.phase==='mixing'?'魔法正在涌现……':state.phase==='ready'?'魔法药做好了':'把背包材料直接拖到锅口'}</h2><p>${state.pot.length}/8 已入锅</p><div id="pot" role="img" aria-label="制药大锅"><span class="pot-decoration" aria-hidden="true">✦</span><div id="pot-mouth" aria-label="锅口">${state.phase==='brew'?'拖到锅口松开':'✦'}</div></div>${state.phase==='brew'?button('开始制药','mix',R.canBrew(state)?'':'disabled'):state.phase==='ready'?button('前往恶龙盘踞之地','potion-prompt'):''}</div>`;
      else view=tvConversation?'':scene();
      app.innerHTML=`<div class="stage ${bg?'illustrated':''} ${state.narrative?.preview?'cg-preview-stage':''} ${state.narrative?'dialogue-active':''} ${state.narrative?.allowNavigation?'npc-navigation':''}" ${bg?`style="background-image:url(assets/${bg})"`:''}><div class="world" ${modal?'inert':''}><header>${!prologue&&!ending&&!(state.scene==='lab'&&state.phase==='explore')?button('← 返回','back'):''}<div>${button('设置','settings')}${button('背包','bag',`aria-expanded="${bag}"`)}</div></header>${view}${bag?inventory():''}</div>${endingFormArt()}${notice?`<div class="notice" role="status">${esc(notice)}</div>`:''}${narrativeView()}${state.narrative&&!state.narrative.preview?button('快进至未读','skip-read','class="skip-read" aria-label="跳过已读对白，停在未读内容"'):''}${popup()}${achievementView()}${state.effects?'<div class="magic-smoke" aria-hidden="true"></div>':''}</div>`;
    }
    stopBookTurn?.();stopBookTurn=null;
    const bookCanvas=app.querySelector('.book-physics-canvas');
    if(bookCanvas&&typeof GameBookPhysics!=='undefined'){
      const book=app.querySelector('.storybook');
      stopBookTurn=GameBookPhysics.mount(bookCanvas,bookCanvas.dataset.from,bookCanvas.dataset.to,()=>{
        bookTransitionPending=false;book?.classList.remove('physics-turn');bookCanvas.remove();book?.querySelector('.book-loading-cover')?.remove();
      });
    }else if(bookCanvas){bookTransitionPending=false;app.querySelector('.storybook')?.classList.remove('physics-turn');bookCanvas.remove();}
    coverAudio?.update(backgroundMusic());
    coverAudio?.setBrewing?.(state.phase==='mixing'&&state.scene==='lab');
    backgroundLoader?.update(visibleBackground,likelyBackgrounds());
    if(state.endingStage==='light-story'&&!endingBackground())app.querySelector?.('.stage')?.classList.add('light-story');
    if(modal?.type==='name')document.getElementById('player-name').focus();
    else if(modal){const controls=app.querySelectorAll('.modal button:not([disabled])');controls[0]?.focus();}
    if(state.narrative&&!state.narrative.preview&&!state.cinematic&&!modal&&!bag){
      const n=state.narrative,line=n.lines[n.index],node=document.getElementById('dialog-text'),fullText=line.text.replaceAll('{name}',state.playerName);
      typingTimer=setInterval(()=>{if(state.narrative!==n){clearInterval(typingTimer);return;}n.shown=Math.min(fullText.length,n.shown+1);node.textContent=fullText.slice(0,n.shown);if(n.shown===fullText.length)clearInterval(typingTimer);},50);
    }
  }
  function say(lines,after='',options={}){modal=null;bag=false;state.narrative={lines:clone(lines),index:0,shown:0,after,allowNavigation:state.scene==='palace'&&state.phase!=='ending',...options};syncChickenHat();autosave(true);render();}
  function advance(){
    if(state.phase==='prologue'&&bookTransitionPending)return;
    const n=state.narrative;if(!n)return;
    if(n.title){delete n.title;autosave(true);render();return;}
    if(n.preview){n.preview=false;autosave(true);render();return;}
    const text=n.lines[n.index].text.replaceAll('{name}',state.playerName);
    if(state.phase!=='prologue'&&n.shown<text.length){n.shown=text.length;autosave(true);render();return;}
    if(n.index===companionFarewellIndex(n)&&!n.friendsRevealed){n.friendsRevealed=true;autosave(true);render();return;}
    rememberLine(n.lines[n.index]);
    if(n.index<n.lines.length-1){
      const goingHome=state.ending==='five'&&n.after==='five-finish'&&n.lines[n.index].setting==='ceiling'&&n.lines[n.index+1].setting==='home';
      n.index++;n.shown=0;syncChickenHat();
      if(goingHome){clearInterval(typingTimer);timedScene('white',1000,'five-home');return;}
      autosave(true);render();return;
    }
    state.narrative=null;clearInterval(typingTimer);
    if(n.after.startsWith('snack-pickup:')){modal={type:'snack-pickup',id:n.after.split(':')[1]};autosave(true);render();return;}
    if(n.after==='lab'){
      state.phase='explore';state.scene='lab';state.visited=state.visited||[];
      if(!state.visited.includes('lab')){state.visited.push('lab');say([S.narration(S.intros.lab)]);return;}
    }
    if(n.after==='round')dragonProgress().talked=true;
    if(n.after==='round'&&state.quests.dragonSceneStage===4){state.quests.ladder=true;state.bleachStage=2;notice='获得任务道具：小木梯';}
    if(n.after==='round'&&state.quests.dragonSceneStage===5&&dragonProgress().poisonSeen){state.dialogueCount=3;showEnding('six');return;}
    if(n.after==='princess-choice'||n.after==='cat-choice'||n.after==='cat-retry'||n.after==='princess-reclaim'){modal={type:n.after};autosave(true);render();return;}
    if(n.after==='princess-gifts'){giftMenu();return;}
    if(n.after==='princess-gift-menu'){giftMenu(true);return;}
    if(n.after==='cat-reward'){if(state.collected.length<8){collectItem('cat_food');modal={type:'cat-received'};}else modal={type:'cat-reward'};autosave(true);render();return;}
    if(n.after==='tv-first-menu'){state.quests.tvIntroDone=true;state.quests.tvNeedApplause=true;state.quests.tvReturnPending=false;library.televisionSeen=true;modal={type:'tv-menu'};}
    if(n.after==='park-jam-choice')modal={type:'park-jam-choice'};
    if(n.after==='park-jam-tasted')unlock('park_jam');
    if(n.after==='tv-menu')modal={type:'tv-menu'};
    if(n.after==='tv-routes')modal={type:'tv-routes'};
    if(n.after==='tv-answer'){if(state.quests.tvNeedApplause){say(X.tvApplause,'tv-applause');return;}modal={type:'tv-menu'};}
    if(n.after==='tv-applause')modal={type:'tv-applause'};
    if(n.after==='tv-finish'){state.quests.tvNeedApplause=false;say(X.tvClose);return;}
    if(n.after==='bleach-window'){state.bleachStage=2;modal={type:'material',id:'bleach'};}
    if(n.after==='ground-fur-window')modal={type:'material',id:'cat_fur'};
    if(n.after==='cat-farewell')modal={type:'cat-farewell'};
    if(n.after==='chicken-laugh'){state.quests.chickenStage='laugh';modal={type:'chicken-laugh'};}
    if(n.after==='chicken-method'){state.quests.chickenStage='method';modal={type:'chicken-method'};}
    if(n.after==='chicken-return'){state.quests.chickenStage='return';modal={type:'chicken-return'};}
    if(n.after==='chicken-grant'){
      state.quests.chickenStage='done';state.quests.hatTaken=true;state.quests.hatRewardPending=true;
      if(state.collected.length<8){collectItem('fallen_leaves');modal={type:'text',text:'获得材料：傻不拉鸡的小破帽子。'};}
      else modal={type:'text',text:'背包已满，小破帽子暂时由傻不拉鸡保管。腾出空位后再来领取。'};
    }
    if(n.after==='five-hit'){playImpact();timedScene('impact',500,'five-after-hit');return;}
    if(n.after==='five-center'){state.endingStage='mother-call';}
    if(n.after==='five-wake'){state.endingReality=true;say(X.fiveHospital,'five-finish');return;}
    if(n.after==='five-finish'){timedScene('black',3000,'summary');return;}
    if(n.after==='six-grip-choice')modal={type:'grip-ready'};
    if(n.after==='six-white'){timedScene('white',1000,'six-reality');return;}
    if(n.after==='easter-finished'){state.easterSeen=true;state.endingStage='fin';state.endingReality=true;}
    if(n.after==='ending-story'){state.endingStage=state.ending==='five'?'gate':state.ending==='six'?'companion':'summary';}
    if(n.after==='ending-white'){state.endingStage='white';state.whiteReadyAt=Date.now()+3000;}
    if(n.after==='ending-summary')state.endingStage='summary';
    if(n.after==='ending-gate-choice')modal={type:'gate-ready'};
    if(n.after==='round'&&state.quests.dragonSceneStage===4)unlock('listen');
    if(state.phase==='ready'&&state.scene==='dragon')modal={type:'drink'};
    autosave(true);render();
  }
  function enter(scene,section){
    clearTimeout(mixingTimer);cancelDrag();trackTrip(scene,section);bag=false;modal=null;
    const potion=state.phase==='ready';state.phase=potion?'ready':'explore';state.scene=scene;
    if(scene==='ice')state.section=section||'lower';
    state.visited=state.visited||[];const key=sceneKey();
    if(!state.visited.includes(key)&&S.intros[key]){state.visited.push(key);say((Array.isArray(S.intros[key])?S.intros[key]:[S.intros[key]]).map(S.narration));return;}
    if(potion&&scene==='dragon')modal={type:'drink'};
    autosave(true);render();
  }
  function restore(id){
    const saved=id==='auto'?library.autosave:library.slots[Number(id)]?.state;
    if(!valid(saved)){modal={type:'text',text:'没有可读取的有效存档。'};render();return;}
    clearTimeout(mixingTimer);clearTimeout(cinematicTimer);cancelDrag();autosavePaused=false;state=Q.normalize(clone(saved));state.round=Number.isInteger(state.round)&&state.round>0?state.round:1;state.adventureId=state.adventureId||'legacy';state.visited=state.visited||[];modal=null;bag=false;notice='进度已读取。';rememberName(state.playerName);syncChickenHat();
    if(state.phase==='ending'&&state.ending==='five'&&!state.endingReality&&state.narrative){
      const n=state.narrative,from=n.after==='five-hit'?n.lines.findIndex(line=>line.text===X.fiveStart[1].text):n.after==='ending-story'?0:-1;
      if(from>=0)n.lines.slice(from).forEach(line=>{if(n.after==='ending-story'){delete line.form;line.hidePortrait=true;}else line.form='beast';});
    }
    if(state.cinematic){const remaining=Math.max(0,state.cinematic.until-Date.now());cinematicTimer=setTimeout(finishTimedScene,remaining);}
    else if(state.endingStage==='credits'&&state.ending==='six'){cinematicTimer=setTimeout(startEaster,Math.max(0,(state.creditsUntil||Date.now())-Date.now()));}
    if(state.phase==='mixing'){state.phase='ready';modal={type:'travel'};}
    else if(state.phase==='ready'&&!state.narrative)modal={type:state.scene==='dragon'?'drink':'travel'};
    autosave();render();
  }
  function showEnding(id){
    if(id==='five'&&state.pot.includes('bleach'))dragonProgress().poisonSeen=true;
    clearTimeout(mixingTimer);state.ending=id;state.phase='ending';state.endingStage='story';state.endingReality=false;state.effects=true;setTimeout(()=>{state.effects=false;app.querySelector('.magic-smoke')?.remove();},1400);state.narrative=null;bag=false;modal=null;markEnding();unlock('ending_'+id);if(['one','two','three','four','five','six'].every(e=>achievements.unlocked.includes('ending_'+e)))unlock('all_endings');if(id==='six'){state.endingStage='companion';autosave(true);render();return;}say(id==='five'?[S.narration('恭喜你！成功做出了可以变身为最强大魔兽的超级魔法药！快去战胜恶龙，到达光明的彼岸吧！'),...X.fiveStart]:E.endings[id],id==='five'?'five-hit':'ending-story');
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
    clearTimeout(mixingTimer);clearTimeout(cinematicTimer);cancelDrag();notice='';autosavePaused=false;
    rememberName(name);
    state={...Q.normalize(R.createState()),phase:'prologue',scene:'lab',playerName:name,section:'lower',round:1,adventureId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),visited:[],narrative:null};
    say(S.opening,'lab');
  }
  function resetGameData(){
    try{for(const key of [KEY,OLD_KEY,NAME_KEY,READ_KEY,A.key])localStorage.removeItem(key);}
    catch{notice='无法清空游戏数据，请检查浏览器存储权限。';render();return;}
    clearTimeout(mixingTimer);clearTimeout(cinematicTimer);clearInterval(typingTimer);clearTimeout(toastTimer);clearTimeout(bookTransitionTimer);cancelDrag();
    library={version:2,autosave:null,slots:[null,null,null],completed:[],televisionSeen:false,autosaveName:''};
    achievements.unlocked=[];achievements.collected=[];achievements.discarded=0;
    readLines.clear();lastName='';saveDestination=null;saveSource=null;achievementToasts=[];
    state=Q.normalize(R.createState());bag=false;modal=null;notice='游戏数据已重置。';autosavePaused=false;lastBookPage=-1;bookTransitionPending=false;render();
  }
  app.addEventListener('input',event=>{
    const input=event.target;
    if(input.hasAttribute?.('data-music-volume'))coverAudio?.setVolume(Number(input.value)/100);
    else if(input.hasAttribute?.('data-effects-volume'))coverAudio?.setEffectsVolume(Number(input.value)/100);
    else return;
    const output=input.parentElement?.querySelector('output');if(output)output.textContent=input.value+'%';
  });
  app.addEventListener('submit',event=>{
    if(event.target.id==='rename-save-form'){event.preventDefault();renameSave();return;}
    if(event.target.id!=='name-form')return;event.preventDefault();
    if(modal?.type!=='name')return;
    startAdventure(document.getElementById('player-name').value);
  });
  app.addEventListener('click',event=>{
    if(drag?.active)return;
    if(state.cinematic)return;
    if(event.isTrusted&&Date.now()<suppressClickUntil)return;
    const el=event.target.closest('[data-action]');
    if(el?.dataset.action==='skip-read'&&!el.disabled&&state.narrative&&!modal){coverAudio?.click?.();skipRead();return;}
    if(state.narrative&&!modal&&!['settings','bag','item','ladder-info'].includes(el?.dataset.action)&&!(state.narrative.allowNavigation&&el?.dataset.action==='back')){advance();return;}
    if(!el||el.disabled)return;
    let action=el.dataset.action,id=el.dataset.id;
    if(action==='delete-confirm'&&modal?.type==='delete-confirm')id=modal.id;
    if(action==='discard-confirm'&&modal?.type==='discard-confirm'){id=modal.id;action=modal.reward?'reward-discard-item':'discard';const previous=modal.previous;modal=previous;el.confirmedDiscard=true;}
    // A popup blocks all underlying world controls, including keyboard activation.
    const popupActions=['snack-pickup','reset-game','reset-game-confirm','music-toggle','rename-save','rename-confirm','rename-cancel','park-jam-taste','park-jam-refuse','begin-adventure','new-confirm','confirm-cancel','delete-confirm','discard-confirm','ending-save-menu','saved-menu','start-backup','achievements','cat-accept','cat-refuse','reward-take','reward-leave','reward-discard','reward-discard-item','hat-take','hat-leave','princess-answer','princess-reclaim-yes','princess-reclaim-no','gift-inspect','gifts-all','gifts-select','gifts-later','next-round','next-save','gate-ready','companion-ready','tv-wander','tv-chat','tv-topic','tv-route','tv-routes-done','tv-clap','tv-thumb','tv-hurry','cat-far','cat-dragon','chicken-laugh','chicken-hold','chicken-grab','chicken-plead','chicken-return','chicken-keep','grip-ready','close','reuse-name','change-name','save-list','load-list','menu','restore','save-slot','delete-save','collect','discard','potion-travel','drink'];
    if(modal&&!popupActions.includes(action))return;
    if(action==='lollipop')coverAudio?.lollipop?.();
    else if(!['advance','ending-next','ending-white','ending-wake','credits-skip','inspect','item','gift-inspect','close'].includes(action))coverAudio?.click?.();
    notice='';
    if(!['advance','stone','close'].includes(action)&&!modal)state.quests.clicks.lastAction=action;
    if(action==='start'){saveDestination=null;saveSource=null;modal=(library.autosave&&library.autosave.ending!=='six')||library.slots.some(slot=>slot&&slot.state.ending!=='six')?{type:'new-confirm'}:{type:lastName?'reuse-name':'name'};}
    else if(action==='new-confirm'&&modal?.type==='new-confirm')modal={type:lastName?'reuse-name':'name'};
    else if(action==='confirm-cancel'&&modal?.previous)modal=modal.previous;
    else if(action==='start-backup'&&modal?.type==='new-confirm'){if(library.autosave){saveSource='auto';saveDestination='title';modal={type:'saves',mode:'save'};}else modal={type:'saves',mode:'load'};}
    else if(action==='ending-save-menu'){saveSource=null;saveDestination='title';modal={type:'saves',mode:'save'};}
    else if(action==='saved-menu'){saveDestination=null;clearTimeout(cinematicTimer);clearInterval(typingTimer);state={...Q.normalize(R.createState()),phase:'intro'};modal=null;bag=false;}
    else if(action==='begin-adventure'&&modal?.type==='name'){const input=document.getElementById('player-name');if(!input.reportValidity||input.reportValidity())startAdventure(input.value);return;}
    else if(action==='reuse-name'&&modal?.type==='reuse-name'){startAdventure(lastName);return;}
    else if(action==='change-name'&&modal?.type==='reuse-name')modal={type:'name'};
    else if(action==='continue'||action==='load-list'){saveDestination=null;modal={type:'saves',mode:'load'};}
    else if(action==='reset-game'&&modal?.type==='settings')modal={type:'reset-game-confirm',previous:{type:'settings'}};
    else if(action==='reset-game-confirm'&&modal?.type==='reset-game-confirm'){resetGameData();return;}
    else if(action==='music-toggle'){coverAudio?.toggle();}
    else if(action==='settings')modal={type:'settings'};
    else if(action==='rename-save'&&modal?.type==='saves'){
      const slot=id==='auto'?library.autosave:library.slots[Number(id)];if(!slot)return;
      modal={type:'rename-save',id,mode:modal.mode,name:id==='auto'?(library.autosaveName||'自动存档'):(slot.name||'存档 '+(Number(id)+1))};
    }
    else if(action==='rename-confirm'){renameSave();return;}
    else if(action==='rename-cancel'&&modal?.type==='rename-save')modal={type:'saves',mode:modal.mode};
    else if(action==='save-list'){saveSource=null;saveDestination=null;modal={type:'saves',mode:'save'};}
    else if(action==='save-slot'){
      const saved=saveSource==='auto'?library.autosave:state;
      if(valid(saved)&&[0,1,2].includes(Number(id))){const date=new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});library.slots[Number(id)]={name:library.slots[Number(id)]?.name||'',date,state:clone(saved)};if(persist()){modal={type:saveDestination==='title'?'saved-menu':'settings'};notice='进度已保存到存档 '+(Number(id)+1)+'。';}}
    }else if(action==='delete-save'){
      if(modal?.type!=='saves')return;
      const slot=id==='auto'?library.autosave:library.slots[Number(id)];if(!slot)return;
      modal={type:'delete-confirm',id,name:id==='auto'?(library.autosaveName||'自动存档'):(slot.name||'存档 '+(Number(id)+1)),previous:modal};render();return;
    }else if(action==='delete-confirm'){
      if(modal?.type!=='delete-confirm')return;
      const target=modal.id;modal=modal.previous;
      id=target;

      if(modal?.type!=='saves'||!(id==='auto'||['0','1','2'].includes(id)))return;
      const previous=clone(library);
      if(id==='auto')library.autosave=null;else library.slots[Number(id)]=null;
      if(persist()){if(id==='auto')autosavePaused=true;notice=id==='auto'?'自动存档已删除。':'存档 '+(Number(id)+1)+' 已删除。';}else library=previous;
      render();return;
    }else if(action==='restore'){restore(id);return;}
    else if(action==='menu'||action==='exit'){autosave();clearTimeout(mixingTimer);clearTimeout(cinematicTimer);clearInterval(typingTimer);state={...Q.normalize(R.createState()),phase:action==='exit'?'exit':'intro'};modal=null;bag=false;}
    else if(action==='close'){const closing=modal;modal=null;if(['saves','saved-menu'].includes(closing?.type)){saveDestination=null;saveSource=null;}if(closing?.type==='material'&&gifts.includes(closing.id)&&giftAftercare('select'))return;}
    else if(action==='achievements')modal={type:'achievements'};
    else if(action==='bag')bag=!bag;
    else if(action==='ladder-info')modal={type:'text',text:'小木梯是大龙借给你的任务道具。可以用它够到高处的女巫毒药，不占八个制药材料格，也不能入锅。'};
    else if(action==='park-apple'&&state.scene==='hub'){say([S.narration('呲，绿色的不明液体落在了你的头上。'),S.narration('你用手摸了摸，拿到面前看了看。'),S.player('晶莹剔透的。')],'park-jam-choice');return;}
    else if(action==='park-jam-taste'&&modal?.type==='park-jam-choice'){say([S.narration('你伸进嘴里尝了尝。'),S.player('唔！是青苹果果酱！')],'park-jam-tasted');return;}
    else if(action==='park-jam-refuse'&&modal?.type==='park-jam-choice'){say([S.narration('你嫌弃地擦干净然后丢到一边。'),{speaker:'tv',text:'天哪！你怎么把奇幻世界第一美味的青苹果果酱丢掉了！'}]);return;}
    else if(action==='tv-entry')modal={type:'tv-entry'};
    else if(action==='tv-wander'){modal=null;}
    else if(action==='tv-chat'){televisionTalk();return;}
    else if(action==='tv-topic'){const topic=Number(id);if(topic>=0&&topic<4){say(X.tvTopics[topic],topic===2?'tv-routes':'tv-answer');return;}}
    else if(action==='tv-route'){const route=Number(id);if(route>=0&&route<5){say(X.tvRoutes[route],'tv-routes');return;}}
    else if(action==='tv-routes-done'){say([{speaker:'tv',text:'很好！很有方向感的小精灵！那么你想去哪里呢？'}],'tv-answer');return;}
    else if(action==='tv-clap'){say(X.tvClap,'tv-finish');return;}
    else if(action==='tv-thumb'){say(X.tvThumb,'tv-finish');return;}
    else if(action==='tv-hurry'){say([{speaker:'tv',text:'赶时间？明白，掌声可以下次补！看好脚下，别把自己赶丢啦！'}]);return;}
    else if(action==='scene'){enter(id,el.dataset.section);return;}
    else if(action==='back'){
      const target=returnTarget();
      if(['brew','mixing'].includes(state.phase)&&state.scene==='lab'){clearTimeout(mixingTimer);state.phase='explore';}
      enter(...target);return;
    }else if(action==='stone'){state.quests.clicks.stone=(state.quests.clicks.lastAction==='stone'?state.quests.clicks.stone||0:0)+1;state.quests.clicks.lastAction='stone';if(state.quests.clicks.stone>=3)unlock('stone');say([S.player('诶呀，完全敲不下来！'),S.narration('这里面好像冰冻着可以吃的东西，但是你不管怎么样都无法挪动它。')]);return;}
    else if(action==='inspect'){inspectMaterial(id);autosave(true);return;
    }else if(action==='item')modal={type:'material',id};
    else if(action==='snack-pickup'&&modal?.type==='snack-pickup'&&modal.id===id){const result=collectItem(id);modal={type:'text',text:result.ok?'获得：妙脆角 ×1。':result.message};}
    else if(action==='collect'){
      if(modal?.type!=='material'||modal.id!==id)return;
      if(!material(id)?.questOnly&&state.collected.length>=8&&!state.collected.includes(id)){modal={type:'text',text:'背包已满，不可继续收集。请先丢弃物品，腾出空格。'};render();return;}
      const result=collectItem(id);if(state.phase==='ending')return;modal=null;if(result.ok&&gifts.includes(id)&&giftAftercare('select'))return;
    }else if(action==='discard'){
      if(modal?.type!=='material'||modal.id!==id||!ownsItem(id))return;
      if(!el.confirmedDiscard){modal={type:'discard-confirm',id,previous:modal};render();return;}
      if(material(id)?.questOnly?Q.discardSnack(state,id):R.discard(state,id)){
        achievements.discarded++;persistAchievements();if(achievements.discarded>=20)unlock('discard20');
        if(id==='bleach'){poisonReturns();return;}
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
      const progress=dragonProgress();state.quests.dragonSceneStage=progress.stage;say(S.rounds[progress.stage-1],'round');return;
    }else if(action==='cat-talk'){catTalk();return;}
    else if(action==='cat-accept'){state.quests.cat='accepted';say(X.catAccept);return;}
    else if(action==='cat-refuse'){state.quests.cat='refused';unlock('refuse_cat');say(X.catRefuse);return;}
    else if(action==='reward-leave'){state.quests.catRewardGround=true;modal=null;notice='美食留在地上了，腾出空位后可以回来拾取。';}
    else if(action==='reward-discard')modal={type:'reward-discard'};
    else if(action==='reward-discard-item'){
      if(!el.confirmedDiscard){if(!state.collected.includes(id))return;modal={type:'discard-confirm',id,reward:true,previous:modal};render();return;}
      if(state.collected.includes(id)){R.discard(state,id);achievements.discarded++;persistAchievements();if(achievements.discarded>=20)unlock('discard20');collectItem('cat_food');if(id==='bleach'){poisonReturns();return;}}modal=null;
    }else if(action==='reward-take'){if(state.quests.catRewardGround){collectItem('cat_food');modal=null;}}
    else if(action==='body-fur'){countClick('body_fur','body_fur');say(state.quests.groundFurSeen?X.bodyFur.concat(X.bodyFurExtra):X.bodyFur);return;}
    else if(action==='cat-far'||action==='cat-dragon'){state.quests.catFarewellDone=true;say(action==='cat-far'?X.catFar:X.catDragon,'cat-reward');return;}
    else if(action==='chicken-laugh'||action==='chicken-hold'){say((action==='chicken-hold'?X.chickenHold:[]).concat(X.chickenLaugh),'chicken-method');return;}
    else if(action==='chicken-grab'||action==='chicken-plead'){state.quests.hatTaken=true;say(action==='chicken-grab'?X.chickenGrab:X.chickenPlead,'chicken-return');return;}
    else if(action==='chicken-return'||action==='chicken-keep'){state.quests.hatOutcome=action==='chicken-return'?'returned':'kept';if(action==='chicken-return')unlock('leave_hat');say(action==='chicken-return'?X.chickenReturn:X.chickenKeep,'chicken-grant');return;}
    else if(action==='hat-take'){
      if(state.collected.length>=8){modal={type:'text',text:'背包已满，不可继续收集。请先腾出一个空位。'};}
      else{const result=collectItem('fallen_leaves');if(result.ok){state.quests.hatTaken=true;state.quests.hatDecided=true;say([N.chicken('咕咕！咕的帽！')]);return;}}
    }else if(action==='hat-leave'){state.quests.hatDecided=true;modal=null;}
    else if(action==='princess-talk'){princessTalk();return;}
    else if(action==='princess-answer'){const branch=Number(id);if(branch>=0&&branch<3){state.quests.princessOffered=true;say(N.branches[branch].concat(N.offer),'princess-gifts');return;}}
    else if(action==='princess-reclaim-yes'){state.quests.princessReclaiming=true;say([N.princess('那就说好啦！本公主可是会记住的。'),S.narration('她把宝物递向你，直到你伸出手，才慢慢松开手指。')],'princess-gifts');return;}
    else if(action==='princess-reclaim-no'){say([N.princess('好吧，我把它们放回收藏室。'),N.princess('想好了再来找我，可不要拿走以后又乱丢呀。')]);return;}
    else if(action==='gift-inspect'){if(princessAvailable().includes(id))modal={type:'material',id};}
    else if(action==='gifts-select'){modal=null;notice='点击画面中的宝物，查看介绍后决定是否收集。';}
    else if(action==='gifts-later'){say([N.princess('现在不想要吗？好吧，那我先替你收着。你可要记得回来找我呀！')]);return;}
    else if(action==='gifts-all'){
      const available=princessAvailable();if(available.length<=8-state.collected.length){for(const gift of available){collectItem(gift);if(state.phase==='ending')return;}if(giftAftercare('all'))return;}
    }else if(action==='tree-fruit'){say([S.player('好多漂亮的蓝色果子呀！可是好高呀够不着……会不会有掉在地上的呢？')]);return;}
    else if(action==='lollipop'){countClick('lollipop','lollipop');state.effects=false;notice='巨大的冰棒棒糖诶！小草精好像很爱吃的样子？';autosave(true);render();const candy=app.querySelector('.ice-lollipop');if(candy)candy.classList.add('is-swaying');return;}
    else if(action==='cabbage-secret'){unlock('cabbage');say([S.narration('冰草草探出小脑袋：糖糖，糖糖……原来小菜精也来到了这里！')]);return;}
    else if(action==='gate'){countClick('gate','gate');say([S.player('可恶，被恶龙死死地挡住了诶！')]);return;}
    else if(action==='dragon-flowers'){countClick('dragon_flowers','dragon_flowers');notice='花花在风里晃动，挡住你的去路。';}
    else if(action==='bath-bubbles'){countClick('bath_bubbles','bath_bubbles');notice='咕噜咕噜，泡泡又冒了出来。';}
    else if(action==='ending-gate'&&state.endingStage==='gate'){say([S.narration('前方所有阻碍已经清除，前往光明世界吧！')],'ending-gate-choice');return;}
    else if(action==='ending-companion'&&state.endingStage==='companion'){say(X.sixBoard,'six-grip-choice');return;}
    else if(action==='ending-white'&&state.endingStage==='white'){if(Date.now()<state.whiteReadyAt)return;state.endingStage='light-story';say(X.fiveWhite,'five-center');return;}
    else if(action==='ending-wake'){state.endingReality=true;say(X.fiveWake.filter(line=>line.text!=='是妈妈在叫我'),'five-wake');return;}
    else if(action==='credits-skip'){startEaster();return;}
    else if(action==='gate-ready'){state.endingStage='white';state.whiteReadyAt=Date.now()+3000;modal=null;}
    else if(action==='companion-ready'){state.endingReality=false;say(X.sixJourney,'six-white');return;}
    else if(action==='grip-ready')modal={type:'companion-ready'};
    else if(action==='ending-next'){
      if(state.endingStage==='summary'){if(state.ending==='six'){showCredits();return;}state.endingStage='fin';}
      else if(state.endingStage==='fin'&&state.ending==='six'&&!state.easterSeen){showCredits();return;}
      else if(state.endingStage==='epilogue'){timedScene('black',3000,'credits');return;}
      else if(state.endingStage==='fin')modal={type:'next-round'};
    }else if(action==='next-round'||action==='next-save'){
      clearTimeout(mixingTimer);const progress=dragonProgress(),nextStage=progress.talked?Math.min(progress.stage+1,progress.poisonSeen?5:4):progress.stage;
      state={...Q.normalize(R.createState()),dragonProgress:{stage:nextStage,poisonSeen:progress.poisonSeen,talked:false},phase:'explore',scene:'lab',playerName:state.playerName,section:'lower',round:(state.round||1)+1,adventureId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),visited:[],narrative:null};bag=false;autosave(true);
      if(action==='next-save')modal={type:'saves',mode:'save'};else{enter('lab');return;}
    }else if(action==='brew'){
      if(state.phase==='ready')modal={type:'travel'};
      else if(state.collected.length!==8)modal={type:'text',text:'需要八种制药材料。'};
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
      coverAudio?.splash?.();notice='宝物放入大锅了。';autosave(true);
    }else if(!cancelled)notice='把材料拖到锅口再松开，就能放入大锅。';
    render();
  }
  window.addEventListener('pointerup',event=>finishDrag(event));
  window.addEventListener('pointercancel',event=>finishDrag(event,true));
  window.addEventListener('blur',()=>{if(drag?.active)suppressClickUntil=Date.now()+250;cancelDrag();});
  app.addEventListener('dragstart',event=>{if(event.target.closest('[data-draggable]'))event.preventDefault();});
  document.addEventListener('keydown',event=>{
    if(event.isComposing)return;
    if(event.key==='Enter'&&event.target.id==='save-name'&&modal?.type==='rename-save'){event.preventDefault();renameSave();return;}
    if(event.key==='Enter'&&event.target.id==='player-name'&&modal?.type==='name'){event.preventDefault();const input=event.target;if(!input.reportValidity||input.reportValidity())startAdventure(input.value);return;}
    if(['INPUT','TEXTAREA'].includes(event.target.tagName))return;
    if(state.narrative&&!modal&&!['settings','bag','item','ladder-info'].includes(event.target.closest?.('[data-action]')?.dataset.action)){if(['Enter',' '].includes(event.key)){event.preventDefault();advance();}return;}
    if(event.key==='Escape'&&drag){cancelDrag();return;}
    const item=event.target.closest?.('[data-draggable]');
    if(event.key==='Enter'&&state.phase==='brew'&&!modal&&item){event.preventDefault();if(R.putInPot(state,item.dataset.id)){coverAudio?.splash?.();notice='宝物放入大锅了。';autosave(true);render();}return;}
    if(event.key==='Escape'){if(modal&&choiceModalTypes.has(modal.type)){event.preventDefault();return;}if(modal)modal=null;else bag=false;render();}
    if(event.key==='Tab'&&modal){const nodes=Array.from(app.querySelectorAll('.modal button:not([disabled]),.modal input'));if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  render();
})();
