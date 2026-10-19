(function(root){
  'use strict';
  function create(options={}){
    const storage=options.storage||root.localStorage;
    let audio=options.audio||(typeof Audio==='function'?new Audio():null);
    const clickAudio=options.effectsAudio||(typeof Audio==='function'?new Audio('assets/button-click.mp3'):null);
    const boilAudio=options.boilAudio||(typeof Audio==='function'?new Audio('assets/brewing-boil.mp3'):null);
    const splashAudio=options.splashAudio||(typeof Audio==='function'?new Audio('assets/ingredient-splash.wav'):null);
    let brewing=false;
    if(boilAudio)boilAudio.loop=true;
    const tracks={cover:'assets/cover-bgm-fairytale.mp3',prologue:'assets/prologue-bgm-c13.mp3',collection:'assets/collection-bgm.m4a',dragon:'assets/dragon-bgm-c23.mp3',ice:'assets/ice-tower-bgm-f1.mp3',bubble:'assets/ending-bubble-bgm.m4a',chef:'assets/ending-chef-bgm-n5.mp3',summary:'assets/ending-summary-bgm.m4a',trueOne:'assets/dragon-bgm-siren.m4a',trueTwo:'assets/cover-bgm-universe.m4a'};
    let preferences={muted:false,volume:.45,effectsVolume:.7},track=null,pending=null,revision=0;
    try{const saved=JSON.parse(storage?.getItem('little-magic-audio-v1'));if(saved){preferences.muted=!!saved.muted;for(const key of ['volume','effectsVolume'])if(Number.isFinite(saved[key]))preferences[key]=Math.min(1,Math.max(0,saved[key]));}}catch{}
    const loadedTracks=new Map();
    function prepare(clip){if(!clip)return;clip.preload='auto';try{clip.load?.();}catch{}}
    if(audio){audio.loop=true;audio.autoplay=true;audio.src=tracks.cover;audio.volume=preferences.volume;audio.muted=preferences.muted;prepare(audio);if(!options.audio)loadedTracks.set('cover',audio);}
    [clickAudio,boilAudio,splashAudio].forEach(prepare);
    // Warm the remaining music after the initial page has had a chance to render.
    function preloadMusic(){
      if(options.audio||typeof Audio!=='function')return;
      for(const [name,src] of Object.entries(tracks)){
        if(loadedTracks.has(name))continue;
        const clip=new Audio(src);clip.loop=true;prepare(clip);loadedTracks.set(name,clip);
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
      revision++;pending=null;stop(true);track=next;
      if(audio&&track){
        if(loadedTracks.has(track))audio=loadedTracks.get(track);
        else{audio.src=tracks[track];prepare(audio);}
        audio.volume=preferences.volume;audio.muted=preferences.muted;play();
      }
    }
    function toggle(){preferences.muted=!preferences.muted;if(audio)audio.muted=preferences.muted;save();if(preferences.muted)stop();else play();}
    function setVolume(value){preferences.volume=Math.min(1,Math.max(0,Number(value)||0));preferences.muted=preferences.volume===0;if(audio){audio.volume=preferences.volume;audio.muted=preferences.muted;}save();if(preferences.muted)stop();else play();}
    function setEffectsVolume(value){preferences.effectsVolume=Math.min(1,Math.max(0,Number(value)||0));save();syncBrewing();}
    function effect(clip){
      if(!clip||!visible()||preferences.effectsVolume===0)return;
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
      if(!clickAudio||!visible()||preferences.effectsVolume===0)return;
      try{clickAudio.volume=preferences.effectsVolume;clickAudio.currentTime=0;Promise.resolve(clickAudio.play()).catch(()=>{});}catch{}
    }
    root.document?.addEventListener('pointerdown',play);
    root.document?.addEventListener('click',play);
    root.document?.addEventListener('touchend',play);
    root.document?.addEventListener('keydown',play);
    root.document?.addEventListener('visibilitychange',()=>{if(visible())play();else stop();syncBrewing();if(!visible())splashAudio?.pause();});
    root.addEventListener?.('pagehide',()=>{stop();boilAudio?.pause();splashAudio?.pause();});root.addEventListener?.('pageshow',()=>{play();syncBrewing();});
    return {update,toggle,setVolume,setEffectsVolume,click,setBrewing,splash,get effectsVolume(){return preferences.effectsVolume;},get muted(){return preferences.muted;},get volume(){return preferences.volume;}};
  }
  root.GameCoverAudio={create};
})(globalThis);
