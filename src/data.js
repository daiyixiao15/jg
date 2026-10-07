(function(root) {
  'use strict';
  const scenes = [
    {id:'ice', name:'冰雪塔楼', icon:'❄', color:'#d6e8eb', intro:'冰塔里藏着沉睡的宝物。上层泛着柔光，下层传来冰块的咔嚓声。'},
    {id:'bath', name:'泡泡王国', icon:'○', color:'#e8def3', intro:'彩色的瓶子排成一列。最高处，那瓶女巫毒药正俯视着你。'},
    {id:'forest', name:'梦幻森林', icon:'♧', color:'#dae8d3', intro:'阳光洒过魔法树。毛绒绒怪眯着眼睛，在暖风里打了个哈欠。'},
    {id:'palace', name:'宫殿长廊', icon:'◇', color:'#f2dbe0', intro:'晚霞被装进小小的鞘里，香气在宫殿里打转。这里的宝物格外引人注意。', risky:true},
    {id:'sky', name:'天空之城', icon:'☁', color:'#f3e5c9', intro:'乌云、酸雨与星光都住在小瓶子里。拿走这里的宝物，容易惊动巨龙。', risky:true},
    {id:'dragon', name:'巨龙盘踞之地', icon:'⌁', color:'#e7d8c8', intro:'巨龙守在光明世界的交界处。它看上去很威严，却没有向你扑来。'}
  ];
  const row = (id,scene,name,real,tags,section='') => ({id,scene,name,real,tags,section});
  const materials = [
    row('apple','ice','冰果','苹果',['edible','tasty'],'upper'),
    row('grape','ice','串串冰','葡萄',['edible','tasty'],'upper'),
    row('cabbage','ice','冰草草','大白菜',['edible','tasty'],'upper'),
    row('ice_cream','ice','甜雪','雪糕冰激凌',['edible','tasty'],'lower'),
    row('dumpling','ice','小冰石头','速冻饺子',['edible'],'lower'),
    row('frost','ice','冰窟里刮下来的冰霜','冷冻区冰霜',['edible'],'lower'),
    row('shampoo','bath','粉色药水','洗发水',['inedible','foaming']),
    row('body_wash','bath','黄色药水','沐浴露',['inedible','foaming']),
    row('detergent','bath','白砂','洗衣粉',['inedible','foaming']),
    row('toothpaste','bath','莓莓泡泡云','儿童草莓味牙膏',['edible','foaming']),
    row('bleach','bath','女巫毒药','84消毒液',['inedible','toxic']),
    row('plants','forest','魔法花与魔法草','花草',['edible']),
    row('fallen_leaves','forest','魔法树的落叶','枯枝落叶',['inedible','nonToxic']),
    row('cat_fur','forest','毛绒绒怪的毛绒绒','猫毛',['inedible','nonToxic']),
    row('cat_food','forest','毛绒绒怪的粮仓粮食','猫粮',['edible']),
    row('lipstick','palace','装在鞘里的晚霞','口红',['inedible','nonToxic']),
    row('skincare','palace','粘腻腻药水','护肤品',['inedible','toxic']),
    row('perfume','palace','香香剂','香水',['inedible','toxic']),
    row('soy_sauce','sky','乌云墨水','酱油',['edible']),
    row('vinegar','sky','魔法酸雨','醋',['edible']),
    row('salt','sky','咸咸星光晶','盐',['edible']),
    row('sugar','sky','甜甜月光晶','白糖',['edible','tasty']),
    row('cooking_wine','sky','闪电药水','料酒',['edible'])
  ];
  const descriptions = {
    apple:'一颗圆滚滚的冰果，红得像刚睡醒的太阳。', grape:'小小的冰珠挤在一起，像一串紫色的秘密。', cabbage:'一层又一层的冰草草，包着一个安静的冬天。',
    ice_cream:'雪也会甜吗？这块甜雪好像知道答案。', dumpling:'白白的小冰石头，肚子里似乎藏着宝贝。', frost:'冰壁上薄薄的霜，像碎掉的银色月光。',
    shampoo:'粉色药水轻轻一晃，细细的泡泡便冒了出来。', body_wash:'黄色药水像一小瓶阳光，摇起来却满是泡泡。', detergent:'白砂细得像雪，遇见水就开始热闹。', toothpaste:'莓莓泡泡云缩在细长的管子里，挤出来就蓬松起来。', bleach:'女巫毒药站得太高。你踮起脚尖，还是差了一点点。',
    plants:'魔法花和魔法草依偎在一起，摇着小小的叶子。', fallen_leaves:'魔法树落下的叶子，脆脆的，像写满咒语的纸。', cat_fur:'毛绒绒怪留下一小撮毛。它软得像一朵睡着的云。', cat_food:'毛绒绒怪的粮仓里，装着一颗颗小小的粮食。',
    lipstick:'小小的鞘里藏着晚霞。轻轻打开，天空的颜色就露出来了。', skincare:'粘腻腻药水慢吞吞地流动，好像还没有睡醒。', perfume:'香香剂只露出一点，整个长廊就闻到了它。',
    soy_sauce:'浓浓的乌云，被收进一瓶深色的墨水里。', vinegar:'魔法酸雨还没有落下来，你的鼻尖就先皱了起来。', salt:'咸咸的星光晶，闪着细小的光。', sugar:'甜甜的月光晶，一粒一粒，像月亮掉下的碎屑。', cooking_wine:'闪电药水安安静静的，也许闪电都藏在里面。'
  };
  materials.forEach(m => {m.description=descriptions[m.id];});
  const dialogues = [
    {dragon:'小精灵，站住！光明世界的门外，你还不能一个人去。', thought:'它的声音像雷。可它只是挡住门，没有伸出爪子。', reply:'为什么不让我过去？'},
    {dragon:'门外的路很长，也有你还不认识的危险。我怕你找不到回来的路。', thought:'原来，巨龙记得回来的路。它一直守在这里，是在等我吗？', reply:'那你会陪着我吗？'},
    {dragon:'当然。你想看什么，就告诉我。我们一起去，我会一直在你身边。', thought:'你第一次认真看它的眼睛。那里没有火焰，只有暖暖的光。也许，你根本不需要打败它。', reply:'那就一起去吧。'},
    {dragon:'小精灵，我在这里。等你准备好了，我们就一起出发。', thought:'它不再像一座挡路的山，更像一把为你撑开的伞。', reply:'我知道了。'}
  ];
  const endings = {
    caught:{title:'药还没喝呢！', subtitle:'这趟冒险，被提前发现了。', text:['你又拿起一件宝物，身后忽然落下巨大的影子。','“小精灵，你在这里做什么？”巨龙一把将你拎走。','大锅还没有开始冒泡，魔法药也没来得及喝。'], trueEnding:false},
    six:{title:'双向奔赴', subtitle:'原来，光明世界可以一起去。', text:['锅里的魔法药已经做好。你看着涌起的光，又想起巨龙的眼睛。','你把药放下：“我不想打败你了。你能陪我去看看外面吗？”','巨龙俯下身来，轻轻点头。','光芒散去，门口站着妈妈。她牵住你的手：“走吧，我们一起出去玩。”','你也握紧她的手。今天的冒险，不需要打败任何人。'], trueEnding:true},
    five:{title:'抵达新世界', subtitle:'一道白光，落在另一个世界。', text:['你喝下魔法药，身体里涌出前所未有的力量。你变成强大的怪兽，终于打败了巨龙。','光明世界的门打开了，一道白光将你吞没。','再睁开眼睛，是医院的天花板。妈妈守在病床边，紧紧握着你的手。原来你是一个沉浸在幻想里的孩子，误食了不该吃的东西。','回家的时候，病床上落着一根恶龙的羽毛。','也许，那片魔法大陆，并没有完全消失。'], trueEnding:true},
    four:{title:'咕噜咕噜', subtitle:'泡泡比魔法还要热闹。', text:['你尝了一口药。咕噜，咕噜！一个接一个的泡泡从嘴里冒出来。','你变成了一只泡泡龙。刚想大吼一声，一大串泡泡就抢先飞了出去。','巨龙一下子就把你制服了。泡泡慢慢散开，你的冒险也被带走了。'], trueEnding:false},
    two:{title:'大厨也是大魔法师', subtitle:'最厉害的魔法，也许香喷喷的。', text:['锅里飘出好闻的香气。你尝了尝药，周身立刻亮起柔和的光。','你变成了高级魔法师，连威严的巨龙也被你的魔法驯服。','它坐下来，与你一起分享锅里的美食。','“你做得真好。”巨龙说。你把魔法师的帽子扶得更正了一点。'], trueEnding:false},
    one:{title:'软绵绵的小猪', subtitle:'小小的魔法，把你变得软绵绵。', text:['你喝下魔法药，身上闪过一团柔光。','没有长出利爪，也没有喷出火焰。你低头一看：自己变成了一只软绵绵的小猪。','巨龙把你领走，说该吃饭了。','你的小肚子，也恰好咕噜了一声。'], trueEnding:false},
    three:{title:'屁股火辣的小英雄', subtitle:'黑暗料理，也是一次勇敢尝试。', text:['你喝下自己的魔法药。味道太奇怪了，肚子马上开始咕噜咕噜。','你变成了一个大丑怪，原本的英雄姿势也站不稳了。','巨龙看着你，忍不住笑了。你捂着肚子，匆匆结束了这场冒险。','下次调制魔法药，还是再想一想吧。'], trueEnding:false}
  };
  root.GameData={scenes, materials, dialogues, endings};
})(typeof globalThis !== 'undefined' ? globalThis : window);
