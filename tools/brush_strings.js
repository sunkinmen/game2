// 列出所有需要預先繪製的毛筆字：node tools/brush_strings.js > tools/brush_strings.json
global.window = global; global.CFG = { W: 960, H: 540 };
['rig', 'roster', 'moves'].forEach(function (f) { require('../js/' + f + '.js'); });
var S = {}; function add(s, st) { S[st + '|' + s] = [s, st]; }
add('台北格鬥風雲', 'gold'); add('選擇角色', 'gold'); add('選擇場景', 'gold'); add('我方 選角', 'gold'); add('對手 選角', 'gold'); add('玩家一 選角', 'gold'); add('玩家二 選角', 'gold');
['', '一', '二', '三', '四', '五'].forEach(function (n, i) { if (i) add('第' + n + '回合', 'gold'); }); add('訓練場', 'gold'); add('開打！', 'red'); add('一擊必殺', 'red'); add('時間到', 'red'); add('平手', 'gold');
add('街機通關', 'gold'); add('勝利', 'gold'); add('挑戰失敗', 'red'); add('街機通關！', 'gold'); add('對', 'gold');
Roster.all.forEach(function (c) { add(c.name, 'gold'); add(c.name, 'cyan'); add(c.name, 'red'); add(c.name + ' 勝利', 'gold'); add(c.name + ' 獲勝', 'gold'); Object.keys(M2(c.id)).forEach(function (k) { var m = M2(c.id)[k]; if (m) add(m.name, 'gold'); }); });
function M2(id) { return Moves.BY[id] || {}; }
console.log(JSON.stringify(Object.keys(S).map(function (k) { return S[k]; })));
