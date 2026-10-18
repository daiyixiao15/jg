(function(root){
  'use strict';
  const questItems=[
    {id:'snack_small',scene:'forest',name:'妙脆角小一',description:'待补充',questOnly:true,tags:[]},
    {id:'snack_large',scene:'forest',name:'妙脆角大二',description:'待补充',questOnly:true,tags:[]}
  ];
  function normalize(state){
    if(['five','six'].includes(state.ending)&&Array.isArray(state.narrative?.lines)){
      for(const line of state.narrative.lines){
        if(typeof line.text!=='string')continue;
        if(line.text.startsWith('你笑了笑'))line.text=line.text.replace('没有多想','');
        if(line.text.startsWith('你回过头去'))line.text=line.text.replace('只看到','');
      }
    }
    if(state.narrative?.title==='接“光明世界的尽头是一双手”结局')state.narrative.title='彩蛋';
    // Remove retired risk data; resume old capture endings with their inventory intact.
    delete state.risk;
    if(state.narrative?.after==='tv-destinations')state.narrative=null;
    if(state.phase==='ending'&&state.ending==='caught'){
      state.phase='explore';state.scene='lab';state.ending=null;state.pot=[];state.narrative=null;
      for(const key of ['endingStage','endingReality','cinematic','effects','creditsUntil','whiteReadyAt'])delete state[key];
    }
    if(state.phase==='ending'&&state.ending==='two'&&Array.isArray(state.narrative?.lines)){
      for(const line of state.narrative.lines)if(typeof line.text==='string')line.text=line.text.replace('傻不拉鸡不知什么时候已经站在桌边，帽子戴得端端正正，','傻不拉鸡不知什么时候已经站在桌边，光着小脑袋，');
    }
    const q=state.quests||{};
    state.quests={ladder:false,tvIntroDone:false,tvTripOrigin:null,tvReturnOrigin:null,tvReturnPending:false,tvLastReturn:{},tvLadderReaction:false,chickenStage:'new',hatOutcome:null,hatRewardPending:false,catFarewellDone:false,groundFurSeen:false,princessGiftBatch:0,princessGiftReminderDone:false,cat:'new',catRewardGround:false,hatTaken:false,princessMet:false,princessOffered:false,princessClaimed:[],princessReturned:[],princessDiscards:0,princessLocked:false,clicks:{},...q};
    if(q.chickenStage===undefined&&q.hatTaken)state.quests.chickenStage='done';
    state.quests.clicks=state.quests.clicks||{};
    state.quests.princessClaimed=state.quests.princessClaimed||[];
    state.quests.princessReturned=state.quests.princessReturned||[];
    const isSnack=id=>questItems.some(m=>m.id===id);
    const legacy=Array.isArray(state.collected)?state.collected.filter(isSnack):[];
    state.quests.snacks=state.quests.cat==='rewarded'?[]:[...new Set([...(Array.isArray(q.snacks)?q.snacks:[]),...legacy])].filter(isSnack);
    if(Array.isArray(state.collected))state.collected=state.collected.filter(id=>!isSnack(id));
    if(Array.isArray(state.pot))state.pot=state.pot.filter(id=>!isSnack(id));
    return state;
  }
  function collectSnack(s,id){
    normalize(s);
    if(s.scene!=='forest'||s.phase!=='explore'||!questItems.some(m=>m.id===id))return {ok:false,message:'现在不能拾取这份妙脆角。'};
    if(s.quests.cat==='rewarded')return {ok:false,message:'妙脆角已经交给绒绒大王了。'};
    if(s.quests.snacks.includes(id))return {ok:false,message:'这份妙脆角已经随身携带了。'};
    s.quests.snacks.push(id);return {ok:true,message:'拾取了'+questItems.find(m=>m.id===id).name+'。'};
  }
  function deliver(s){
    normalize(s);
    if(s.quests.cat!=='accepted'||!['snack_small','snack_large'].every(id=>s.quests.snacks.includes(id)))return false;
    s.quests.snacks=[];
    s.quests.cat='rewarded';s.quests.catRewardGround=!s.collected.includes('cat_food');
    return true;
  }
  function discardSnack(s,id){
    normalize(s);
    if(!['explore','brew','ready'].includes(s.phase)||!s.quests.snacks.includes(id))return false;
    s.quests.snacks=s.quests.snacks.filter(x=>x!==id);return true;
  }
  root.GameQuests={questItems,normalize,collectSnack,discardSnack,deliver};
})(globalThis);
