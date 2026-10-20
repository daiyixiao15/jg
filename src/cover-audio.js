(function(root){
  'use strict';
  function create(options={}){
    const storage=options.storage||root.localStorage;
    let audio=options.audio||(typeof Audio==='function'?new Audio():null);
    const clickAudio=options.effectsAudio||(typeof Audio==='function'?new Audio('assets/button-click.mp3'):null);
    const boilAudio=options.boilAudio||(typeof Audio==='function'?new Audio('assets/brewing-boil.mp3'):null);
    const splashAudio=options.splashAudio||(typeof Audio==='function'?new Audio('assets/ingredient-splash.wav'):null);
    const lollipopAudio=options.lollipopAudio||(typeof Audio==='function'?new Audio('assets/lollipop-click.mp3'):null);
    const pageTurnAudio=options.pageTurnAudio||(typeof Audio==='function'?new Audio('assets/book-page-turn.mp3'):null);
    const buffers=new Map(),voices=new Set();
    let effectsContext=null,effectsGain=null,effectsPrimed=false;
    // Decode short effects once; each trigger starts a fresh in-memory voice.
    // Keep media playback available for file:// and browsers without Web Audio.
    try{
      const Context=root.AudioContext||root.webkitAudioContext;
      if(Context&&root.fetch){
        effectsContext=new Context({latencyHint:'interactive'});
        effectsGain=effectsContext.createGain();effectsGain.connect(effectsContext.destination);
        for(const clip of [clickAudio,splashAudio,lollipopAudio,pageTurnAudio]){
          if(!clip?.src)continue;
          root.fetch(clip.src).then(response=>{if(!response.ok)throw new Error('Audio load failed');return response.arrayBuffer();})
            .then(bytes=>effectsContext.decodeAudioData(bytes)).then(buffer=>buffers.set(clip,buffer)).catch(()=>{});
        }
      }
    }catch{effectsContext=null;}
    function unlockEffects(){
      if(!effectsContext||!visible())return;
      try{
        if(effectsContext.state==='suspended'||effectsContext.state==='interrupted')Promise.resolve(effectsContext.resume()).catch(()=>{});
        // Prime the mobile output during the actual gesture, before the first effect.
        if(!effectsPrimed&&effectsContext.createBuffer){
          const source=effectsContext.createBufferSource();source.buffer=effectsContext.createBuffer(1,1,effectsContext.sampleRate);
          source.connect(effectsContext.destination);source.onended=()=>source.disconnect();source.start();effectsPrimed=true;
        }
      }catch{}
    }
    function stopEffects(){for(const voice of voices)try{voice.stop();}catch{}voices.clear();for(const clip of [clickAudio,splashAudio,lollipopAudio,pageTurnAudio])clip?.pause?.();}
    let brewing=false;
    if(boilAudio)boilAudio.loop=true;
    const tracks={cover:'assets/cover-bgm-fairytale.mp3',prologue:'assets/prologue-bgm-c13.mp3',collection:'assets/collection-bgm.m4a',dragon:'assets/dragon-bgm-c23.mp3',ice:'assets/ice-tower-bgm-f1.mp3',bubble:'assets/ending-bubble-bgm.m4a',chef:'assets/ending-chef-bgm-n5.mp3',summary:'assets/ending-summary-bgm.m4a',trueOne:'assets/ending-true-one-bgm-0618.m4a',ugly:'assets/ending-ugly-bgm-hidamari.mp3',pig:'assets/ending-pig-bgm-picnic.mp3',trueTwo:'assets/ending-true-two-bgm-from52.m4a',easter:'assets/easter-bgm-strawberry.m4a'};
    let preferences={muted:false,volume:.45,effectsVolume:.7},track=null,pending=null,revision=0;
    try{const saved=JSON.parse(storage?.getItem('little-magic-audio-v1'));if(saved){preferences.muted=!!saved.muted;for(const key of ['volume','effectsVolume'])if(Number.isFinite(saved[key]))preferences[key]=Math.min(1,Math.max(0,saved[key]));}}catch{}
    let musicFade=1,musicFadeTimer=null;
    function applyMusicVolume(){if(audio)audio.volume=preferences.volume*musicFade;}
    function beginMusicFade(){
      root.clearInterval?.(musicFadeTimer);musicFadeTimer=null;
      musicFade=track==='trueTwo'?0:1;applyMusicVolume();
      if(musicFade===0)musicFadeTimer=root.setInterval(()=>{
        if(!audio||audio.paused||!visible())return;
        musicFade=Math.min(1,Math.max(0,audio.currentTime/3));applyMusicVolume();
        if(musicFade===1){root.clearInterval(musicFadeTimer);musicFadeTimer=null;}
      },50);
    }
    const loadedTracks=new Map();
    function prepare(clip){if(!clip)return;clip.preload='auto';try{clip.load?.();}catch{}}
    if(audio){audio.loop=true;audio.autoplay=true;audio.src=tracks.cover;audio.volume=preferences.volume;audio.muted=preferences.muted;prepare(audio);if(!options.audio)loadedTracks.set('cover',audio);}
    [clickAudio,boilAudio,splashAudio,lollipopAudio,pageTurnAudio].forEach(prepare);
    // Warm the remaining music after the initial page has had a chance to render.
    function preloadMusic(){
      if(options.audio||typeof Audio!=='function')return;
      for(const [name,src] of Object.entries(tracks)){
        if(loadedTracks.has(name))continue;
        // Do not download every full music track alongside the short effect buffers.
        const clip=new Audio(src);clip.loop=true;clip.preload='metadata';try{clip.load?.();}catch{}loadedTracks.set(name,clip);
      }
    }
    if(root.requestIdleCallback)root.requestIdleCallback(preloadMusic,{timeout:2000});
    else root.setTimeout?.(preloadMusic,500);
    function save(){try{storage?.setItem('little-magic-audio-v1',JSON.stringify(preferences));}catch{}}
    function visible(){return !root.document?.hidden;}
    function stop(reset=false){if(!audio)return;audio.pause();if(reset)try{audio.currentTime=0;}catch{}}
    function play(){
      if(!audio||!track||preferences.muted||!visible()||pending===revision||!audio.paused)return;
      const attempt=revision;pending=attempt;
      try{Promise.resolve(audio.play()).catch(()=>{}).finally(()=>{
        if(attempt!==revision)return;
        pending=null;if(!track||preferences.muted||!visible())stop(!track);
      });}catch{if(attempt===revision)pending=null;}
    }
    function update(next){
      next=next===true?'cover':tracks[next]?next:null;
      if(track===next)return;
      revision++;pending=null;root.clearInterval?.(musicFadeTimer);musicFadeTimer=null;stop(true);track=next;
      if(audio&&track){
        if(loadedTracks.has(track)){audio=loadedTracks.get(track);if(audio.preload!=='auto')prepare(audio);}
        else{audio.src=tracks[track];prepare(audio);}
        beginMusicFade();audio.muted=preferences.muted;play();
      }
    }
    function toggle(){preferences.muted=!preferences.muted;if(audio)audio.muted=preferences.muted;save();if(preferences.muted)stop();else play();}
    function setVolume(value){preferences.volume=Math.min(1,Math.max(0,Number(value)||0));preferences.muted=preferences.volume===0;if(audio){applyMusicVolume();audio.muted=preferences.muted;}save();if(preferences.muted)stop();else play();}
    function setEffectsVolume(value){preferences.effectsVolume=Math.min(1,Math.max(0,Number(value)||0));if(effectsGain)effectsGain.gain.value=preferences.effectsVolume;if(!preferences.effectsVolume)stopEffects();save();syncBrewing();}
    function effect(clip){
      if(!clip||!visible()||preferences.effectsVolume===0)return;
      unlockEffects();
      if(effectsContext&&effectsContext.state!=='closed'&&buffers.has(clip)){
        // resume() is asynchronous on phones. Queue the source in the context now
        // instead of falling back to a slower media seek while it is resuming.
        try{
          const voice=effectsContext.createBufferSource();voice.buffer=buffers.get(clip);
          effectsGain.gain.value=preferences.effectsVolume;voice.connect(effectsGain);
          voices.add(voice);voice.onended=()=>{voices.delete(voice);voice.disconnect();};voice.start();return;
        }catch{}
      }
      try{clip.volume=preferences.effectsVolume;clip.currentTime=0;Promise.resolve(clip.play()).catch(()=>{});}catch{}
    }
    function syncBrewing(){
      if(!boilAudio)return;
      boilAudio.volume=preferences.effectsVolume;
      if(!brewing||!visible()||preferences.effectsVolume===0){boilAudio.pause();if(!brewing)try{boilAudio.currentTime=0;}catch{};return;}
      if(boilAudio.paused)try{Promise.resolve(boilAudio.play()).catch(()=>{});}catch{}
    }
    function setBrewing(active){brewing=!!active;syncBrewing();}
    function splash(){effect(splashAudio);}
    function click(){
      effect(clickAudio);
    }
    function lollipop(){effect(lollipopAudio);}
    function pageTurn(){effect(pageTurnAudio);}
    for(const event of ['pointerdown','touchstart','touchend','click','keydown'])root.document?.addEventListener(event,unlockEffects,{capture:true,passive:true});
    root.document?.addEventListener('pointerdown',play);
    root.document?.addEventListener('click',play);
    root.document?.addEventListener('touchend',play);
    root.document?.addEventListener('keydown',play);
    root.document?.addEventListener('visibilitychange',()=>{if(visible()){unlockEffects();play();}else{stop();stopEffects();effectsPrimed=false;}syncBrewing();});
    root.addEventListener?.('pagehide',()=>{stop();boilAudio?.pause();stopEffects();});root.addEventListener?.('pageshow',()=>{play();syncBrewing();});
    return {update,toggle,setVolume,setEffectsVolume,click,lollipop,pageTurn,setBrewing,splash,get effectsVolume(){return preferences.effectsVolume;},get muted(){return preferences.muted;},get volume(){return preferences.volume;}};
  }
  root.GameCoverAudio={create};
})(globalThis);
