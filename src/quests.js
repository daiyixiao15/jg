(function(root){
  'use strict';
  const questItems=[
    {id:'snack_small',scene:'forest',name:'妙脆角小一',description:'待补充',questOnly:true,tags:[]},
    {id:'snack_large',scene:'forest',name:'妙脆角大二',description:'待补充',questOnly:true,tags:[]}
  ];
  function normalize(state){
    const q=state.quests||{};
    state.quests={cat:'new',catRewardGround:false,hatTaken:false,princessMet:false,princessOffered:false,princessClaimed:[],princessReturned:[],princessDiscards:0,princessLocked:false,clicks:{},...q};
    state.quests.clicks=state.quests.clicks||{};
    state.quests.princessClaimed=state.quests.princessClaimed||[];
    state.quests.princessReturned=state.quests.princessReturned||[];
    return state;
  }
  function collectSnack(s,id){
    normalize(s);
    if(s.scene!=='forest'||s.phase!=='explore'||!questItems.some(m=>m.id===id))return {ok:false,message:'现在不能拾取这份妙脆角。'};
    if(s.quests.cat==='rewarded')return {ok:false,message:'妙脆角已经交给绒绒大王了。'};
    if(s.collected.includes(id))return {ok:false,message:'这份妙脆角已经在背包里了。'};
    if(s.collected.length>=8)return {ok:false,message:'背包已满，不可继续收集。请先丢弃物品，腾出空格。'};
    s.collected.push(id);return {ok:true,message:'拾取了'+questItems.find(m=>m.id===id).name+'。'};
  }
  function deliver(s){
    normalize(s);
    if(s.quests.cat!=='accepted'||!['snack_small','snack_large'].every(id=>s.collected.includes(id)))return false;
    s.collected=s.collected.filter(id=>!['snack_small','snack_large'].includes(id));
    s.quests.cat='rewarded';s.quests.catRewardGround=!s.collected.includes('cat_food');
    return true;
  }
  root.GameQuests={questItems,normalize,collectSnack,deliver};
})(globalThis);
