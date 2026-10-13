(function(root){
  'use strict';
  const n=GameStory.narration,p=GameStory.player,d=GameStory.dragon;
  const transformed=(lines,form)=>lines.map(line=>({...line,form}));
  const endings={
    one:transformed([n('你喝了馋馋药水，变成小猪了！'),p('哼哼唧唧。'),d('小猪小猪，你软绵绵的。'),d('吃一堑。'),p('好饱喔～'),n('那就请安心做自在小猪吧。不完美，是小猪，是软绵绵的小猪，也没有关系～。')],'pig'),
    two:[n('你做出了世间绝无仅有的美味养生魔法药！'),n('汤的香气慢慢飘进恶龙鼻子。大龙一把夺过剩下的药水，开始畅饮起来。'),{...d('再来一碗！'),expression:'smile'},p('你这只贪吃龙！'),n('谁说美食不是一种魔法呢！')],
    three:transformed([n('你做出了魔法黑暗料理变丑药水！你变成大丑怪了！'),{...d('哈哈哈哈哈哈哈！'),expression:'smile'},n('黑暗料理，也是一次尝试。')],'ugly'),
    four:[n('你尝了一口药。咕噜，咕噜！一个接一个的泡泡从嘴里冒出来。'),n('你变成了一只泡泡龙。刚想大吼一声，一大串泡泡就抢先飞了出去。'),n('巨龙一下子就把你制服了。泡泡慢慢散开，你的冒险也被带走了。')],
    five:[n('恭喜你！成功做出了可以变身为最强大魔兽的超级魔法药！快去战胜恶龙，到达光明的彼岸吧！'),n('你变成强大的怪兽，打败了恶龙。通往光明世界的门，就在眼前。')],
    fiveReveal:[p('好刺眼。'),{speaker:'unknown',text:'嗷——呜——！'},p('咦……是大龙吗？她……不是被我打败了吗……'),{speaker:'unknown',text:'{name}！'},n('是妈妈在叫我。'),n('再睁开眼时，没有魔法，没有巨龙，也没有通往远方的门。'),n('只有陌生的天花板，消毒水的气味，和床边一双很久没有松开的手。'),p('妈妈，我再也不乱喝了……'),n('回家的时候，病床上落下一根恶龙的羽毛。也许，那片魔法大陆，并没有完全消失。')],
    six:[n('大龙匍匐下身子，让小精灵爬上来。风从远方吹来，这一次，你终于有人陪着出发。')],
    sixReveal:[n('光芒散去。你是一个沉浸在幻想里的孩子，妈妈正牵着你的手。'),p('妈妈，我们一起去看看外面吧！'),n('她握紧你的手，陪你一起走向光明的世界。')],
    caught:GameData.endings.caught.text.map(n)
  };
  root.GameEndingStory={endings};
})(globalThis);
