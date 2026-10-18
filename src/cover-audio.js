(function(root){
  'use strict';
  function create(options={}){
    const storage=options.storage||root.localStorage;
    const audio=options.audio||(typeof Audio==='function'?new Audio():null);
    let preferences={muted:false,volume:.45,effectsVolume:.7},cover=false,pending=false;
    try{const saved=JSON.parse(storage?.getItem('little-magic-audio-v1'));if(saved){if(Number.isFinite(saved.effectsVolume))preferences.effectsVolume=Math.min(1,Math.max(0,saved.effectsVolume));preferences.muted=!!saved.muted;if(Number.isFinite(saved.volume))preferences.volume=Math.min(1,Math.max(0,saved.volume));}}catch{}
    if(audio){audio.src='assets/cover-bgm-fairytale.mp3';audio.loop=true;audio.preload='none';audio.volume=preferences.volume;audio.muted=preferences.muted;}
    function save(){try{storage?.setItem('little-magic-audio-v1',JSON.stringify(preferences));}catch{}}
    function visible(){return !root.document?.hidden;}
    function stop(reset=false){if(!audio)return;audio.pause();if(reset)try{audio.currentTime=0;}catch{}}
    function play(){
      if(!audio||!cover||preferences.muted||!visible()||pending||!audio.paused)return;
      pending=true;
      try{Promise.resolve(audio.play()).catch(()=>{}).finally(()=>{pending=false;if(!cover||preferences.muted||!visible())stop(!cover);});}catch{pending=false;}
    }
    function update(onCover){const changed=cover!==onCover;cover=onCover;if(!cover)stop(true);else if(changed)play();}
    function toggle(){preferences.muted=!preferences.muted;if(audio)audio.muted=preferences.muted;save();if(preferences.muted)stop();else play();}
    function setVolume(value){preferences.volume=Math.min(1,Math.max(0,Number(value)||0));preferences.muted=preferences.volume===0;if(audio){audio.volume=preferences.volume;audio.muted=preferences.muted;}save();if(preferences.muted)stop();else play();}
    function setEffectsVolume(value){preferences.effectsVolume=Math.min(1,Math.max(0,Number(value)||0));save();}
    root.document?.addEventListener('pointerdown',play);
    root.document?.addEventListener('keydown',play);
    root.document?.addEventListener('visibilitychange',()=>{if(visible())play();else stop();});
    root.addEventListener?.('pagehide',()=>stop());
    root.addEventListener?.('pageshow',play);
    return {update,toggle,setVolume,setEffectsVolume,get effectsVolume(){return preferences.effectsVolume;},get muted(){return preferences.muted;},get volume(){return preferences.volume;}};
  }
  root.GameCoverAudio={create};
})(globalThis);
