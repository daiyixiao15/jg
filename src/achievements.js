(function(root){
  'use strict';
  const entries=[
    ['park_jam','天酱好运！','尝了尝果酱。'],
    ['ending_one','软绵绵的小猪','达成结局一。'],['ending_two','大厨也是大魔法师','达成结局二。'],
    ['ending_three','屁股火辣的小英雄','达成结局三。'],['ending_four','咕噜咕噜','达成结局四。'],
    ['ending_five','光明世界的尽头是一双手','达成喝药中毒真结局。'],['ending_six','和我一起去光明世界吧！','达成陪伴真结局。'],
    ['listen','听恶龙的话～','完成第四周目的恶龙对白。'],['snacks','妙...喵...妙脆角！','找到两份妙脆角并交给绒绒大王。'],
    ['refuse_cat','大王？婉拒了哈','第一次拒绝绒绒大王的请求。'],['leave_hat','咕！人，你真好！','在新剧情中最后选择把帽子还给傻不拉鸡。'],['body_fur','大王不发威，你当我是病猫啊！','同一周目尝试拔三次身上的毛绒绒。'],
    ['stone','不服气又怎样？','同一周目连续敲击三次大冰石头。'],['cabbage','小菜精在灯火阑珊处','在冰塔下层发现冰草草彩蛋。'],
    ['early_dragon','龙龙我来啦！','尚未收集材料就来到恶龙面前。'],['gate','都说了别敲了！','同一周目点击被恶龙挡住的门三次。'],
    ['dragon_flowers','怎么也飞不出 花花的世界','同一周目点击恶龙草丛里的花三次。'],['lollipop','请你吃糖','同一周目点击冰冰糖三次。'],
    ['bath_bubbles','咕噜咕噜','同一周目点击泡泡王国的泡泡三次。'],['discard20','散财童子！','累计丢弃二十次背包物品。'],
    ['all_materials','我是小小百宝箱','每种制药材料都曾收集过。'],['all_endings','你的每一面我都见过','累计收集六个编号结局。']
  ].map(([id,title,description])=>({id,title,description}));
  root.GameAchievements={entries,key:'little-magic-achievements-v1'};
})(globalThis);
