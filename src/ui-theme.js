(function(root){
  'use strict';
  function apply(stage){
    if(!stage||stage.classList.contains('cover-menu')||stage.classList.contains('khaki-ui'))return;
    const excluded='.hotspot,.reading-surface,.ending-screen,.white-screen,.travel-arrow,.body-fur-icon,.television';
    const surfaces='button,input,.modal,.dialogue,.speaker,.inventory,.inventory-caption,.notice,.audio-setting-row,.item,.brew-panel,.achievement-toasts>div,.travel-arrow span';
    for(const element of stage.querySelectorAll(surfaces)){
      if(element.matches(excluded)||element.closest('.storybook'))continue;
      const original=getComputedStyle(element);
      const color=original.backgroundColor.match(/rgba?\(([^)]+)\)/);
      if(color){
        const channels=color[1].split(',').map(Number),alpha=channels.length===4?channels[3]:1;
        if(alpha>0){
          element.style.backgroundColor=`rgba(147,129,96,${alpha})`;
          if(parseFloat(original.borderTopWidth)>0&&original.borderTopStyle!=='none'){
            element.style.borderWidth='2px';element.style.borderStyle='solid';element.style.borderColor='#d2c19d';
          }
        }
      }
    }
    for(const element of stage.querySelectorAll('button,.speaker,.dialogue p')){
      if(element.matches(excluded)||element.closest('.storybook'))continue;
      const size=parseFloat(getComputedStyle(element).fontSize);
      element.style.fontSize=(size/stage.clientWidth*106)+'cqw';
    }
    stage.classList.add('khaki-ui');
  }
  root.GameUiTheme={apply};
})(globalThis);
