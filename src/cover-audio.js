(function(root){
  'use strict';
  function create(options={}){
    const storage=options.storage||root.localStorage;
    const audio=options.audio||(typeof Audio==='function'?new Audio():null);
    const clickAudio=options.effectsAudio||(typeof Audio==='function'?new Audio('assets/button-click.mp3'):null);
    const boilAudio=options.boilAudio||(typeof Audio==='function'?new Audio('assets/brewing-boil.mp3'):null);
    const splashAudio=options.splashAudio||(typeof Audio==='function'?new Audio('assets/ingredient-splash.wav'):null);
    let brewing=false;
    if(boilAudio)boilAudio.loop=true;
    const tracks={cover:'assets/cover-bgm-fairytale.mp3',prologue:'assets/prologue-bgm-c13.mp3',collection:'assets/collection-bgm.m4a',dragon:'assets/dragon-bgm-c23.mp3',ice:'assets/ice-tower-bgm-f1.mp3',bubble:'assets/ending-bubble-bgm.m4a',chef:'assets/ending-chef-bgm-n5.mp3',summary:'assets/ending-summary-bgm.m4a',trueOne:'assets/dragon-bgm-siren.m4a',trueTwo:'assets/cover-bgm-universe.m4a'};
    let preferences={muted:false,volume:.45,effectsVolume:.7},track=null,pending=null,revision=0;
    try{const saved=JSON.parse(storage?.getItem('little-magic-audio-v1'));if(saved){preferences.muted=!!saved.muted;for(const key of ['volume','effectsVolume'])if(Number.isFinite(saved[key]))preferences[key]=Math.min(1,Math.max(0,saved[key]));}}catch{}
    if(audio){audio.loop=true;audio.preload='none';audio.volume=preferences.volume;audio.muted=preferences.muted;}
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
      if(audio&&track){audio.src=tracks[track];play();}
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
    root.document?.addEventListener('keydown',play);
    root.document?.addEventListener('visibilitychange',()=>{if(visible())play();else stop();syncBrewing();if(!visible())splashAudio?.pause();});
    root.addEventListener?.('pagehide',()=>{stop();boilAudio?.pause();splashAudio?.pause();});root.addEventListener?.('pageshow',()=>{play();syncBrewing();});
    return {update,toggle,setVolume,setEffectsVolume,click,setBrewing,splash,get effectsVolume(){return preferences.effectsVolume;},get muted(){return preferences.muted;},get volume(){return preferences.volume;}};
  }
  root.GameCoverAudio={create};
})(globalThis);
