(function() {
  'use strict';
  const D=GameData,R=GameRules,app=document.getElementById('app');
  let state=R.createState(),selected=null,notice='',modal=null,drag=null,suppressClick=false,mixingTimer=null,touchClickUntil=0;
  const tagNames={edible:'能吃',tasty:'好吃',inedible:'不能吃',nonToxic:'无毒',toxic:'有毒',foaming:'出泡'};
  const material=id=>D.materials.find(m=>m.id===id);
  const button=(text,action,extra='',cls='')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
  function inventory() {
    return `<footer class="inventory"><div class="inventory-heading"><div><strong>我的八份宝物</strong><span>${state.collected.length} / 8 已收集${['brew','mixing','ready'].includes(state.phase)?` · ${state.pot.length} / 8 已入锅`:''}</span></div><p>${state.phase==='brew'?'点击选中瓶子，再拖入大锅':'每种宝物只能收集一次'}</p></div><div class="bottles">${Array.from({length:8},(_,i)=>{const id=state.collected[i],m=material(id),used=state.pot.includes(id);return m?`<button class="bottle ${selected===id?'selected':''} ${used?'used':''}" data-action="bottle" data-id="${id}" ${used?'disabled':''} aria-label="${m.name}${used?'，已入锅':''}" ${state.phase==='brew'?'data-draggable="true"':''}><span class="bottle-art" aria-hidden="true">${used?'✓':'✦'}</span><span>${m.name}</span><small>${used?'已入锅':state.phase==='brew'?'拖入大锅':'已收集'}</small></button>`:`<div class="bottle empty"><span class="bottle-art">${i+1}</span><span>等待宝物</span></div>`;}).join('')}</div></footer>`;
  }
  function header() {
    return `<header class="topbar"><div><span class="eyebrow">小精灵的第一次冒险</span><h1>一锅小小的魔法</h1></div><div class="top-actions"><span class="risk ${state.risk>=5?'danger':''}" aria-label="风险 ${state.risk}，超过5被抓">风险 ${state.risk} / 5</span>${button('玩法','help','','quiet')}${button('重新开始','restart','','quiet')}</div></header>`;
  }
  function explore() {
    const s=D.scenes.find(x=>x.id===state.scene);
    let objects='';
    if(s.id==='dragon') {
      objects=`<div class="dragon-figure" aria-hidden="true"><span>⌁</span><i></i><i></i></div><div class="dragon-caption"><h3>${state.dialogueCount>=3?'它的眼睛里有暖暖的光':'巨龙静静地守着门'}</h3><p>已经交谈 ${state.dialogueCount} 次${state.dialogueCount>=3?' · 你开始理解它了':''}</p>${button(state.dialogueCount?'再和它说说话':'与巨龙对话','talk','','primary')}</div>`;
    } else {
      const rows=D.materials.filter(m=>m.scene===s.id && (!m.section || m.section===state.section));
      objects=`<div class="objects">${rows.map((m,i)=>`<button class="object ${state.collected.includes(m.id)?'collected':''}" data-action="inspect" data-id="${m.id}" style="--object-color:${['#e1b1a6','#beb9df','#a9c8a6','#e5c286'][i%4]}"><span class="object-shape" aria-hidden="true">${state.collected.includes(m.id)?'✓':'✦'}</span><strong>${m.name}</strong><small>${state.collected.includes(m.id)?'已收集':'点击查看'}</small></button>`).join('')}${s.id==='ice' && state.section==='lower'?`<button class="object stone" data-action="meat"><span class="object-shape">◇</span><strong>冰窟里的大冰石头</strong><small>点击查看</small></button>`:''}${s.id==='bath'?`<button class="object chair" data-action="chair"><span class="object-shape">▤</span><strong>小椅子</strong><small>${state.bleachStage>=2?'已经搬好了':'点击互动'}</small></button>`:''}</div>`;
    }
    return `<main class="explore-layout"><nav class="scene-nav" aria-label="场景导航"><span class="eyebrow">去哪里找魔法？</span>${D.scenes.map(x=>`<button class="scene-link ${s.id===x.id?'active':''}" data-action="scene" data-id="${x.id}" ${s.id===x.id?'aria-current="page"':''}><span>${x.icon}</span>${x.name}${x.risky?'<small>收集 +1 风险</small>':''}</button>`).join('')}<button class="go-brew ${state.collected.length===8?'complete':''}" data-action="go-brew" ${state.collected.length!==8?'disabled':''}>去大锅那里 <span>${state.collected.length}/8</span></button></nav><section class="scene" style="--scene-color:${s.color}"><div class="scene-heading"><div><span class="eyebrow">场景 ${D.scenes.indexOf(s)+1} / 6</span><h2>${s.name}</h2></div><span class="scene-icon" aria-hidden="true">${s.icon}</span></div><p class="scene-intro">${s.intro}</p>${s.risky?'<p class="risk-hint">每收集一件宝物，风险 +1。超过 5 会被巨龙发现。</p>':''}${s.id==='ice'?`<div class="section-tabs">${button('上层冰塔','section','data-id="upper"',state.section==='upper'?'active':'')}${button('下层冰窟','section','data-id="lower"',state.section==='lower'?'active':'')}</div>`:''}${objects}</section></main>`;
  }
  function brewing() {
    const busy=state.phase==='mixing',ready=state.phase==='ready';
    return `<main class="brew-page"><div class="brew-heading"><span class="eyebrow">八份宝物，一锅魔法</span><h2>${busy?'魔法正在涌现':ready?'你的魔法药做好了':'把宝物放进大锅'}</h2><p>${busy?'光在锅里转圈，气泡一颗颗升起来。':ready?'最后的选择，就在你手里。':'先点击底部的瓶子，再按住它拖到锅里。八种都放进去才能制药。'}</p></div><div class="cauldron-wrap ${busy?'mixing':''} ${ready?'ready':''}"><div class="steam" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div id="pot" class="cauldron" aria-label="大锅，拖放材料到这里"><div class="liquid" style="--level:${20+state.pot.length*6}%"><span>✦</span><span>✧</span><span>✦</span></div><div class="pot-label">${ready?'✦':`${state.pot.length} / 8`}<small>${ready?'魔法药':busy?'搅拌中':'拖到这里'}</small></div></div><div class="pot-feet" aria-hidden="true"></div></div><div class="brew-controls">${state.phase==='brew'?(R.canBrew(state)?button('开始制药 · 搅拌','mix','','primary'): `<p>${selected?`已选中「${material(selected).name}」，把瓶子拖到锅里。`:'还需要放入 '+(8-state.pot.length)+' 种宝物'}</p>`)+button('回去看看巨龙','back','','quiet'):''}${ready?button(state.dialogueCount>=3?'放下药，去找巨龙':'喝下魔法药','finish','','primary'):''}${busy?'<p role="status">正在搅拌……</p>':''}</div><div class="pot-list">${state.pot.map(id=>`<span>${material(id).name}</span>`).join('')}</div></main>`;
  }
  function ending() {
    const e=D.endings[state.ending];
    return `<main class="ending-page"><span class="eyebrow">${e.trueEnding?'真结局':'冒险的一个结局'}</span><div class="ending-symbol" aria-hidden="true">${({one:'☁',two:'✦',three:'〰',four:'○',five:'◇',six:'☀',caught:'！'})[state.ending]}</div><h2>${e.title}</h2><p class="ending-subtitle">${e.subtitle}</p><div class="ending-story">${e.text.map(t=>`<p>${t}</p>`).join('')}</div><p class="ending-note">${e.trueEnding?'谢谢你走到了故事的这一面。':'这还不是真结局。再试一次，也许能发现巨龙的另一面。'}</p>${button('再来一次冒险','restart','','primary')}</main>`;
  }
  function modalView() {
    if(!modal)return '';
    let body='';
    if(modal.type==='material') {
      const m=material(modal.id),owned=state.collected.includes(m.id),full=state.collected.length>=8,locked=m.id==='bleach' && state.bleachStage<2;
      body=`<span class="eyebrow">发现一份宝物</span><h2 id="modal-title">${m.name}</h2><p>${m.description}</p><div class="tags">${m.tags.map(t=>`<span>${tagNames[t]}</span>`).join('')}</div>${locked?'<p>借助小椅子才能够到它。先关上这个窗口，再点击椅子。</p>':''}${button(owned?'已经收集':full?'收集栏已满':locked?'现在够不着':'收集这份宝物','collect',`data-id="${m.id}" ${owned||full||locked?'disabled':''}`,'primary')}`;
    } else if(modal.type==='talk') {
      const d=D.dialogues[Math.min(state.dialogueCount,D.dialogues.length-1)];
      body=`<span class="eyebrow">与巨龙的第 ${state.dialogueCount+1} 次对话</span><h2 id="modal-title">巨龙的声音</h2><blockquote>“${d.dragon}”</blockquote><p>${d.thought}</p>${button(d.reply,'advance-talk','','primary')}`;
    } else if(modal.type==='help') {
      body='<h2 id="modal-title">怎样调制魔法药</h2><p>点击场景里的宝物，查看后收集。每种只能拿一次，一共需要八种。</p><p>宫殿长廊和天空之城每拿一件，风险增加1；超过5，就会提前被抓。</p><p>到大锅那里，点击收集栏里的瓶子，再逐个拖入锅里。全部放入后，点击开始制药。</p><p>也可以去和巨龙说说话。每次交谈，都会多了解它一点。</p><p class="prototype-note">这是虚构的幻想游戏。材料标签只属于游戏设定，请勿模仿调配或食用现实物品。</p>';
    } else {
      body=`<h2 id="modal-title">${modal.title}</h2><p>${modal.text}</p>`;
    }
    return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${button('关闭','close','aria-label="关闭窗口"','close')}${body}</section></div>`;
  }
  function render() {
    if(state.phase==='intro') {
      app.innerHTML=`<main class="intro-page"><span class="eyebrow">点击探索 · 单机小冒险</span><div class="intro-art" aria-hidden="true"><span>✦</span><i>☁</i><b>◇</b></div><h1>一锅小小的魔法</h1><p>你是这片大陆唯一的精灵。</p><p>一位巨龙守在光明世界的交界处。你觉得它是邪恶的象征，可你现在还没有力量战胜它。</p><p>去不同的地方寻找八种宝物，调制增强药水。<br>也许，冒险会给你一个意想不到的答案。</p>${button('出发，寻找魔法','start','','primary')}<small>建议使用浏览器打开 · 鼠标和触屏均可操作</small></main>`;
    } else {
      app.innerHTML=header()+(state.phase==='explore'?explore():state.phase==='ending'?ending():brewing())+(state.phase==='ending'?'':inventory())+`<div class="notice" role="status" aria-live="polite">${notice}</div>`+modalView();
    }
    if(modal) {const focus=app.querySelector('.modal button:not([disabled])');if(focus)focus.focus();}
  }
  function flash(text) {notice=text;render();}
  app.addEventListener('click',event=>{
    const el=event.target.closest('[data-action]'); if(!el || el.disabled)return;
    if(event.isTrusted && event.detail>0 && Date.now()<touchClickUntil)return;
    if(suppressClick && el.dataset.action==='bottle')return;
    const a=el.dataset.action,id=el.dataset.id; notice='';
    if(a==='start') state.phase='explore';
    if(a==='scene' && state.phase==='explore') {state.scene=id;selected=null;}
    if(a==='section') state.section=id;
    if(a==='inspect') {if(id==='bleach' && state.bleachStage===0) state.bleachStage=1;modal={type:'material',id};}
    if(a==='collect') {const result=R.collect(state,id);notice=result.message;modal=null;}
    if(a==='chair') {
      if(state.bleachStage===1) {state.bleachStage=2;notice='你把椅子搬到高处的瓶子下面。现在再点击女巫毒药，就能够到它了。';}
      else notice=state.bleachStage>=2?'椅子已经放好了。再点击女巫毒药吧。':'一把小椅子。也许有什么宝物，是你踮脚也够不到的？';
    }
    if(a==='meat')modal={type:'text',title:'冰窟里的大冰石头',text:'你使劲撬了撬，它纹丝不动。这块大冰石头，今天是带不走啦。'};
    if(a==='talk')modal={type:'talk'};
    if(a==='advance-talk' && modal?.type==='talk') {state.dialogueCount++;modal=null;notice=state.dialogueCount===3?'巨龙的心意，你终于听懂了。':'你又多了解了巨龙一点。';}
    if(a==='go-brew' && state.collected.length===8) {state.phase='brew';selected=null;}
    if(a==='back') {state.phase='explore';state.scene='dragon';selected=null;}
    if(a==='bottle') {if(state.phase==='brew'){selected=id;notice='已选中「'+material(id).name+'」，请按住瓶子拖入大锅。';}else modal={type:'material',id};}
    if(a==='mix' && R.canBrew(state)) {
      state.phase='mixing';selected=null;
      mixingTimer=setTimeout(()=>{state.phase='ready';notice='魔法药做好了。';mixingTimer=null;render();},3200);
    }
    if(a==='finish' && state.phase==='ready') {state.ending=R.resolveEnding(state);state.phase='ending';}
    if(a==='help')modal={type:'help'};
    if(a==='close')modal=null;
    if(a==='restart') {if(mixingTimer)clearTimeout(mixingTimer);mixingTimer=null;state=R.createState();selected=null;modal=null;notice='';}
    render();
  });
  app.addEventListener('pointerup',event=>{
    if(event.pointerType!=='touch' || drag?.active)return;
    const el=event.target.closest('[data-action]');
    if(!el || el.disabled)return;
    event.preventDefault();touchClickUntil=Date.now()+500;el.click();
  });
  app.addEventListener('pointerdown',event=>{
    const el=event.target.closest('[data-draggable]');
    if(!el || el.disabled || state.phase!=='brew' || modal || event.button!==0)return;
    drag={id:el.dataset.id,x:event.clientX,y:event.clientY,pointer:event.pointerId,active:false,ghost:null};
    el.setPointerCapture(event.pointerId);
  });
  function scrollWhileDragging() {
    if(!drag?.active)return;
    if(drag.clientY<65)window.scrollBy(0,-12);
    else if(drag.clientY>window.innerHeight-65)window.scrollBy(0,12);
    const pot=document.getElementById('pot'),rect=pot?.getBoundingClientRect();
    if(pot)pot.classList.toggle('over',!!rect && drag.clientX>=rect.left && drag.clientX<=rect.right && drag.clientY>=rect.top && drag.clientY<=rect.bottom);
    requestAnimationFrame(scrollWhileDragging);
  }
  window.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.pointer)return;
    if(!drag.active && Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>8) {
      drag.active=true;selected=drag.id;requestAnimationFrame(scrollWhileDragging);
      drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.textContent='✦ '+material(drag.id).name;document.body.appendChild(drag.ghost);
    }
    if(drag.active) {
      event.preventDefault();drag.clientX=event.clientX;drag.clientY=event.clientY;drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';
      const pot=document.getElementById('pot'),rect=pot?.getBoundingClientRect();
      if(pot)pot.classList.toggle('over',!!rect && event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom);
    }
  },{passive:false});
  function stopDrag(event,cancelled=false) {
    if(!drag || event.pointerId!==drag.pointer)return;
    const current=drag;drag=null;current.ghost?.remove();
    if(!current.active)return;
    suppressClick=true;setTimeout(()=>{suppressClick=false;},0);
    const pot=document.getElementById('pot'),rect=pot?.getBoundingClientRect();
    if(!cancelled && rect && event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom && R.putInPot(state,current.id)) {selected=null;notice='「'+material(current.id).name+'」放入大锅了。';}
    else notice='还没放进锅里，再拖一次吧。';
    requestAnimationFrame(render);
  }
  window.addEventListener('pointerup',event=>stopDrag(event));
  window.addEventListener('pointercancel',event=>stopDrag(event,true));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && modal){modal=null;render();return;}
    if(event.key==='Tab' && modal){const nodes=Array.from(app.querySelectorAll('.modal button:not([disabled])'));const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}}
    if(event.key==='Enter' && state.phase==='brew' && selected && !modal && event.target.closest('.bottle')){event.preventDefault();if(R.putInPot(state,selected)){selected=null;flash('宝物放进锅里了。');}}
  },true);
  render();
})();




