(function(root) {
  'use strict';
  function createState() {return {phase:'intro',scene:'ice',section:'upper',collected:[],pot:[],risk:0,dialogueCount:0,bleachStage:0,ending:null};}
  function collect(state,id) {
    if(state.phase!=='explore') return {ok:false,message:'现在不能收集材料。'};
    const m=root.GameData.materials.find(x=>x.id===id);
    if(!m || m.scene!==state.scene || (m.section && m.section!==state.section)) return {ok:false,message:'请先前往材料所在的地方。'};
    if(state.collected.includes(id)) return {ok:false,message:'这份宝物已经在你的收集栏里了。'};
    if(state.collected.length>=8) return {ok:false,message:'已经收满八种宝物，去大锅那里吧。'};
    if(id==='bleach' && state.bleachStage<2) return {ok:false,message:'女巫毒药太高了。先看看它，再借助椅子吧。'};
    state.collected.push(id);
    if(m.scene==='palace' || m.scene==='sky') state.risk++;
    if(state.risk>5) {state.phase='ending';state.ending='caught';}
    return {ok:true,message:'收好了：'+m.name};
  }
  function putInPot(state,id) {
    if(state.phase!=='brew' || state.collected.length!==8 || !state.collected.includes(id) || state.pot.includes(id)) return false;
    state.pot.push(id); return true;
  }
  function canBrew(state) {return state.phase==='brew' && state.collected.length===8 && state.pot.length===8 && new Set(state.pot).size===8 && state.pot.every(id=>state.collected.includes(id));}
  function resolveEnding(state) {
    if(state.risk>5) return 'caught';
    const rows=state.pot.map(id=>root.GameData.materials.find(m=>m.id===id));
    if(rows.length!==8 || new Set(state.pot).size!==8 || rows.some(m=>!m)) throw new Error('制药需要八种不同的有效材料');
    if(state.dialogueCount>=3) return 'six';
    if(rows.some(m=>m.tags.includes('toxic'))) return 'five';
    if(rows.filter(m=>m.tags.includes('foaming')).length>=3) return 'four';
    const allEdible=rows.every(m=>m.tags.includes('edible'));
    if(allEdible && rows.filter(m=>m.tags.includes('tasty')).length>=4) return 'two';
    if(allEdible) return 'one';
    return 'three';
  }
  root.GameRules={createState,collect,putInPot,canBrew,resolveEnding};
})(typeof globalThis !== 'undefined' ? globalThis : window);
