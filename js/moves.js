/* Moves — 全部招式用「時間軸資料」描述，Fighter 只負責逐幀執行：
 *   move = { name, cmd, btn, air?, phases:[ {n 幀數, pose, vx?, vy?, hit?, spawn?, inv?, ...} ] }
 *   phase 欄位：
 *     n      持續幀數            pose  姿勢名或 [起,終]（整段平滑插值）
 *     vx     水平速度（朝前為正，每幀套用）   vy  進入該段時的垂直初速
 *     hit    攻擊判定 {box:[x0,x1,y0,y1], dmg, hs, bs, kb, lvl:'h|m|l', kd, launch:[vx,vy], rehit, pull, stop, sfx}
 *     spawn  發射飛行道具 {kind,x,y,vx,vy,g,life,dmg,hs,bs,w,h,boom,ground,...}
 *     grab   指令投：命中則進入 ifGrab 段，否則走 ifWhiff 段
 *     inv    無敵    reflect 反彈飛行道具    counter 接招反制    untilLand 空中直到落地才結束
 *     buff   {dmg,t} 增傷    sfx / voice  該段開始時播放音效 / 喊叫
 *   招式指令用數字鍵盤方向：2=↓ 3=↘ 6=→ 4=← 1=↙ 7=↖ 8=↑，236=↓↘→（波動拳）、623=→↓↘（升龍拳）、214=↓↙←、c46=後蓄力再前。
 *   cmd 後面接按鈕 btn。簡易模式的 小招A / 小招B / 大招 按鈕等同於各角色第 1 / 2 / 大招。 */
(function (G) {
  'use strict';
  function lv(d) { return d < 35 ? 'hit_l' : d < 78 ? 'hit_m' : 'hit_h'; }
  function H(box, dmg, hs, bs, o) {
    var h = { box: box, dmg: dmg, hs: hs, bs: bs, kb: dmg < 35 ? 3 : dmg < 78 ? 5 : 8, lvl: 'm', sfx: lv(dmg), stop: dmg < 35 ? 3 : dmg < 78 ? 5 : 8 }, k;
    for (k in o) h[k] = o[k]; return h;
  }
  function P(n, pose, o) { var p = { n: n, pose: pose }, k; for (k in o) p[k] = o[k]; return p; }
  function Sp(o) { var s = { kind: 'orb', x: 60, y: 100, vx: 7, vy: 0, g: 0, life: 70, dmg: 50, hs: 18, bs: 11, w: 44, h: 44, kb: 5, color: 0xffffff, lvl: 'm' }, k; for (k in o) s[k] = o[k]; return s; }

  /* ---------- 共通普通招式 ---------- */
  var NORMAL = {
    jab: { name: '小拳', sc: true, chain: true, phases: [P(4, 'jab0'), P(3, 'jab1', { hit: H([26, 98, 100, 152], 28, 14, 9, { kb: 3, sfx: 'hit_l' }), sfx: 'whoosh' }), P(7, 'jab0')] },
    kick: { name: '小腳', sc: true, chain: true, phases: [P(6, 'kick0'), P(3, 'kick1', { hit: H([26, 108, 60, 124], 40, 17, 11, { kb: 4, sfx: 'hit_l' }), sfx: 'whoosh' }), P(10, 'kick0')] },
    hpunch: { name: '重拳', sc: true, phases: [P(10, 'hp0'), P(4, 'hp1', { vx: 3, hit: H([26, 120, 90, 152], 72, 24, 15, { kb: 8 }), sfx: 'whoosh2', voice: 'atk' }), P(16, 'hp1', { vx: 0 })] },
    hkick: { name: '重腳', sc: true, phases: [P(12, 'hk0'), P(4, 'hk1', { hit: H([26, 126, 80, 168], 82, 26, 16, { kb: 9, launch: null }), sfx: 'whoosh2', voice: 'atk' }), P(18, 'hk0')] },
    cpunch: { name: '蹲拳', sc: true, chain: true, crouch: true, phases: [P(5, 'cp0'), P(3, 'cp1', { hit: H([26, 92, 40, 94], 26, 13, 9, { kb: 3, sfx: 'hit_l' }), sfx: 'whoosh' }), P(9, 'cp0')] },
    ckick: { name: '掃堂腿', sc: true, crouch: true, phases: [P(7, 'ck0'), P(4, 'ck1', { hit: H([20, 124, 0, 32], 50, 20, 14, { lvl: 'l', kd: 1, launch: [3, 6], sfx: 'hit_m' }), sfx: 'whoosh2' }), P(16, 'ck0')] },
    apunch: { name: '空中拳', air: true, phases: [P(3, 'jump'), P(16, 'ap1', { hit: H([14, 88, 40, 140], 40, 19, 12, { kb: 4 }), untilLand: true, sfx: 'whoosh' })] },
    akick: { name: '空中腳', air: true, phases: [P(4, 'jump'), P(18, 'ak1', { hit: H([14, 100, 10, 100], 54, 22, 14, { kb: 5 }), untilLand: true, sfx: 'whoosh' })] },
    throw: { name: '投技', throw: true, phases: [
      P(4, 'throwA'), P(2, 'throwA', { grab: { box: [10, 78, 0, 160], dmg: 100 } }), P(16, 'throwA', { ifWhiff: true }),
      P(20, 'throwB', { ifGrab: true, hold: { dx: 46, y: 36 }, vx: 0 }), P(8, 'throwB', { ifGrab: true, hold: { dx: 64, y: 30 }, release: { dmg: 100, launch: [-6, 8], sfx: 'throw' }, voice: 'atk' }), P(14, 'throwB', { ifGrab: true })] }
  };

  /* ---------- 各角色招式 ---------- */
  var BY = {};

  BY.long = {
    s1: { name: '令旗波', cmd: '236', btn: 'p', phases: [P(9, 'cast0', { voice: 'atk' }), P(5, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'flag', x: 70, y: 100, vx: 7.5, life: 80, dmg: 62, hs: 20, bs: 12, w: 54, h: 64, kb: 6, color: 0xff5040 }) }), P(22, 'cast1')] },
    s2: { name: '升龍腳', cmd: '623', btn: 'k', flying: true, landRec: 14, phases: [P(3, 'rise0', { inv: true }), P(10, 'rise1', { vy: 15, vx: 2, inv: true, voice: 'atk', hit: H([-10, 76, 40, 210], 68, 26, 20, { kd: 1, launch: [3.5, 10], stop: 8, sfx: 'hit_h' }) }), P(60, 'rise1', { untilLand: true, vx: 1 })] },
    ult: { name: '九龍破', cmd: '236236', btn: 'p', phases: [P(14, 'cast0', { inv: true }), P(34, 'lunge', { vx: 5.5, inv: true, ult: 'dragon', sfx: 'whoosh2', hit: H([0, 130, 30, 190], 26, 14, 10, { rehit: 4, kb: 2, stop: 2, sfx: 'hit_l' }) }), P(8, 'hp1', { vx: 2, hit: H([0, 150, 30, 190], 90, 40, 20, { kd: 1, launch: [7, 9], sfx: 'hit_h', stop: 12 }) }), P(26, 'hp1')] }
  };
  BY.cai = {
    s1: { name: '熱油潑灑', cmd: '214', btn: 'p', phases: [P(12, 'cast0'), P(5, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'oil', x: 60, y: 120, vx: 5, vy: 6, g: .38, life: 90, dmg: 52, hs: 18, bs: 11, w: 34, h: 34, color: 0xff9a2a, ground: 'fire' }) }), P(22, 'cast1')] },
    s2: { name: '大鍋翻', cmd: '66', btn: 'p', throw: true, phases: [P(8, 'throwA'), P(3, 'throwA', { grab: { box: [10, 92, 0, 170], dmg: 150 } }), P(22, 'throwA', { ifWhiff: true }), P(22, 'throwB', { ifGrab: true, hold: { dx: 40, y: 150 }, vx: 0 }), P(8, 'throwB', { ifGrab: true, hold: { dx: 70, y: 40 }, release: { dmg: 150, launch: [-7, 9], sfx: 'throw' }, voice: 'atk' }), P(16, 'throwB', { ifGrab: true })] },
    ult: { name: '全家桶爆擊', cmd: '236236', btn: 'p', phases: [P(16, 'throwB', { inv: true }), P(10, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'bucket', x: 200, y: 560, vx: 0, vy: -10, life: 60, dmg: 48, hs: 26, bs: 14, w: 60, h: 60, kb: 6, color: 0xffc23a, ground: 'boom', rehit: 0 }) }),
      P(10, 'cast1', { spawn: Sp({ kind: 'bucket', x: 280, y: 560, vx: 0, vy: -10, life: 60, dmg: 48, hs: 26, bs: 14, w: 60, h: 60, kb: 6, color: 0xffc23a, ground: 'boom' }) }),
      P(10, 'cast1', { spawn: Sp({ kind: 'bucket', x: 120, y: 560, vx: 0, vy: -10, life: 60, dmg: 48, hs: 26, bs: 14, w: 60, h: 60, kb: 6, color: 0xffc23a, ground: 'boom' }) }),
      P(10, 'cast1', { spawn: Sp({ kind: 'bucket', x: 360, y: 560, vx: 0, vy: -10, life: 60, dmg: 48, hs: 26, bs: 14, w: 60, h: 60, kb: 6, color: 0xffc23a, ground: 'boom' }) }),
      P(10, 'cast1', { spawn: Sp({ kind: 'bucket', x: 60, y: 560, vx: 0, vy: -10, life: 60, dmg: 60, hs: 30, bs: 14, w: 70, h: 70, kb: 8, color: 0xffc23a, ground: 'boom', kd: 1 }) }),
      P(40, 'throwB')] }
  };
  BY.su = {
    s1: { name: '飛撞', cmd: 'c46', btn: 'k', phases: [P(6, 'lunge', { voice: 'atk' }), P(22, 'dive', { vx: 11, sfx: 'whoosh2', hit: H([0, 100, 20, 150], 70, 22, 14, { kb: 12, lvl: 'm', kd: 1, launch: [6, 5], sfx: 'hit_h' }) }), P(22, 'lunge', { vx: 1 })] },
    s2: { name: '安全帽迴旋', cmd: '214', btn: 'p', phases: [P(8, 'cast0'), P(5, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'helmet', x: 60, y: 110, vx: 8, life: 64, boom: 1, dmg: 40, hs: 16, bs: 10, w: 44, h: 44, kb: 4, color: 0xff9c1a }) }), P(18, 'cast1')] },
    ult: { name: '準時送達', cmd: '236236', btn: 'k', phases: [P(14, 'lunge', { inv: true }), P(44, 'lunge', { vx: 12, inv: true, ult: 'scooter', sfx: 'whoosh2', hit: H([-10, 120, 10, 170], 34, 16, 10, { rehit: 5, kb: 3, stop: 2, sfx: 'hit_m' }) }), P(8, 'dive', { vx: 5, hit: H([-10, 140, 10, 190], 90, 40, 20, { kd: 1, launch: [8, 7], sfx: 'hit_h', stop: 12 }) }), P(30, 'lunge', { vx: 0 })] }
  };
  BY.wu = {
    s1: { name: '雲手', cmd: '236', btn: 'p', phases: [P(4, 'arms'), P(34, ['arms', 'cast1'], { reflect: true, sfx: 'blip' }), P(14, 'arms')] },
    s2: { name: '四兩撥千斤', cmd: '214', btn: 'p', phases: [P(3, 'counter'), P(30, 'counter', { counter: { dmg: 110, launch: [-6, 9], sfx: 'throw', pose: 'throwB' } }), P(22, 'counter')],
      counterPhases: [P(10, 'throwB', { voice: 'atk' }), P(16, 'throwB')] },
    ult: { name: '太極歸一', cmd: '236236', btn: 'p', phases: [P(14, 'arms', { inv: true }), P(8, 'cast1', { inv: true, ult: 'taiji', hit: H([-90, 230, 0, 230], 20, 30, 20, { pull: 70, kb: 0, stop: 3, sfx: 'hit_l' }) }), P(14, 'cast1', { hit: H([0, 150, 20, 200], 190, 40, 22, { kd: 1, launch: [8, 9], sfx: 'hit_h', stop: 14 }) }), P(30, 'arms')] }
  };
  BY.yu = {
    s1: { name: '珍珠連射', cmd: '236', btn: 'p', phases: [P(10, 'cast0'),
      P(6, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'pearl', x: 80, y: 120, vx: 8.5, life: 60, dmg: 26, hs: 14, bs: 10, w: 26, h: 26, kb: 3, color: 0x2a1a14 }) }),
      P(6, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'pearl', x: 80, y: 112, vx: 8.5, life: 60, dmg: 26, hs: 14, bs: 10, w: 26, h: 26, kb: 3, color: 0x2a1a14 }) }),
      P(6, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'pearl', x: 80, y: 128, vx: 8.5, life: 60, dmg: 26, hs: 14, bs: 10, w: 26, h: 26, kb: 3, color: 0x2a1a14 }) }),
      P(6, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'pearl', x: 80, y: 120, vx: 8.5, life: 60, dmg: 30, hs: 18, bs: 10, w: 28, h: 28, kb: 5, color: 0x2a1a14 }) }), P(16, 'cast1')] },
    s2: { name: '搖杯回力', cmd: '214', btn: 'p', phases: [P(9, 'cast0'), P(5, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'cup', x: 60, y: 110, vx: 5.5, life: 80, boom: 1, dmg: 46, hs: 18, bs: 11, w: 40, h: 46, kb: 4, color: 0xe8c8a0 }) }), P(18, 'cast1')] },
    ult: { name: '滿杯暴擊', cmd: '236236', btn: 'p', phases: [P(16, 'cast0', { inv: true }), P(10, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'beam', x: 40, y: 110, vx: 0, life: 44, dmg: 22, hs: 14, bs: 10, w: 560, h: 96, kb: 2, rehit: 4, color: 0xff8fb4, fixed: 1, noBlockStop: 1 }) }), P(40, 'cast1'), P(16, 'cast1', { hit: H([20, 160, 20, 190], 90, 40, 20, { kd: 1, launch: [8, 8], sfx: 'hit_h', stop: 10 }) })] }
  };
  BY.feng = {
    s1: { name: '水袖纏', cmd: '214', btn: 'p', phases: [P(9, 'cast0'), P(5, 'cast1', { sfx: 'whoosh2', spawn: Sp({ kind: 'sleeve', x: 50, y: 118, vx: 11, life: 20, dmg: 30, hs: 26, bs: 12, w: 60, h: 36, kb: 0, pull: 74, color: 0xf6f0ff, tether: 1 }) }), P(20, 'cast1')] },
    s2: { name: '變臉', cmd: '236', btn: 'k', phases: [P(6, 'arms', { buff: { dmg: 1.25, t: 480 }, sfx: 'bell' }), P(5, 'cast1', { vx: 4, hit: H([0, 100, 40, 190], 52, 22, 14, { kd: 1, launch: [4, 7], sfx: 'hit_m' }) }), P(18, 'arms')] },
    ult: { name: '絕唱', cmd: '236236', btn: 'p', phases: [P(16, 'arms', { inv: true }), P(10, ['arms', 'win'], { ult: 'sing', hit: H([0, 420, 0, 240], 60, 24, 16, { kb: 3, stop: 4 }) }), P(12, 'win', { hit: H([0, 460, 0, 240], 60, 26, 16, { kb: 3, stop: 4 }) }), P(14, 'win', { hit: H([0, 500, 0, 260], 100, 40, 20, { kd: 1, launch: [9, 8], sfx: 'hit_h', stop: 12 }) }), P(30, 'win')] }
  };
  BY.ting = {
    s1: { name: '公事包迴旋', cmd: '236', btn: 'p', phases: [P(9, 'cast0'), P(5, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'brief', x: 60, y: 118, vx: 8, vy: 1.5, g: -.02, life: 70, boom: 1, dmg: 54, hs: 18, bs: 11, w: 44, h: 40, kb: 5, color: 0x7a4a2a }) }), P(20, 'cast1')] },
    s2: { name: '高跟鞋墜擊', cmd: '236', btn: 'k', flying: true, landRec: 12, phases: [P(5, 'jump'), P(12, 'jumpF', { vy: 14.5, vx: 4.5, inv: true }), P(60, 'dive', { vx: 5, vyd: -13, untilLand: true, hit: H([-4, 84, -10, 100], 84, 26, 16, { lvl: 'h', kd: 1, launch: [4, 6], stop: 8, sfx: 'hit_h' }), sfx: 'whoosh2' })] },
    ult: { name: '加班地獄', cmd: '236236', btn: 'k', flying: true, landRec: 14, phases: [P(14, 'win', { inv: true }), P(12, 'jumpF', { vy: 15, vx: 5, inv: true }), P(34, 'ak1', { vx: 3, nograv: true, vy: 0, inv: true, ult: 'overtime', hit: H([0, 120, 20, 180], 30, 16, 10, { rehit: 4, kb: 2, stop: 2, sfx: 'hit_l' }) }), P(60, 'dive', { vx: 3, vyd: -14, untilLand: true, hit: H([-4, 100, -10, 140], 100, 40, 20, { kd: 1, launch: [5, 7], stop: 12, sfx: 'hit_h' }) })] }
  };
  BY.die = {
    s1: { name: '地板旋風', cmd: '214', btn: 'k', phases: [P(8, 'ck0'), P(30, 'spin', { vx: 2.5, sfx: 'whoosh2', hit: H([-62, 94, 0, 48], 28, 18, 10, { rehit: 8, lvl: 'l', kb: 3, stop: 3, sfx: 'hit_l' }) }), P(18, 'ck0')] },
    s2: { name: '倒立踢', cmd: '236', btn: 'k', phases: [P(8, 'crouch', { inv: true }), P(16, 'handstand', { vx: 3, sfx: 'whoosh2', hit: H([10, 120, 20, 150], 70, 24, 15, { kd: 1, launch: [3, 8], sfx: 'hit_m', stop: 6 }) }), P(18, 'crouch')] },
    ult: { name: '霓虹連環', cmd: '236236', btn: 'p', phases: [P(14, 'crouch', { inv: true }), P(36, 'spin', { vx: 6.5, inv: true, ult: 'neon', sfx: 'whoosh2', hit: H([-30, 120, 0, 140], 30, 16, 10, { rehit: 5, kb: 3, stop: 2, sfx: 'hit_m' }) }), P(10, 'handstand', { vx: 2, hit: H([0, 130, 10, 190], 80, 40, 20, { kd: 1, launch: [7, 9], sfx: 'hit_h', stop: 12 }) }), P(28, 'crouch')] }
  };
  BY.boss = {
    s1: { name: '公文連擲', cmd: '236', btn: 'p', phases: [P(10, 'cast0'),
      P(10, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'paper', x: 70, y: 120, vx: 6.5, life: 70, dmg: 36, hs: 16, bs: 10, w: 40, h: 34, kb: 4, color: 0x2a8a4a }) }),
      P(10, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'paper', x: 70, y: 100, vx: 6.5, life: 70, dmg: 36, hs: 16, bs: 10, w: 40, h: 34, kb: 4, color: 0x2a8a4a }) }),
      P(10, 'cast1', { sfx: 'proj', spawn: Sp({ kind: 'paper', x: 70, y: 140, vx: 6.5, life: 70, dmg: 36, hs: 16, bs: 10, w: 40, h: 34, kb: 4, color: 0x2a8a4a }) }), P(18, 'cast1')] },
    s2: { name: '震耳官腔', cmd: '214', btn: 'p', phases: [P(12, 'hp0', { voice: 'atk' }), P(8, 'hp1', { sfx: 'gong', hit: H([0, 190, 40, 190], 62, 22, 14, { kb: 14, kd: 0, sfx: 'hit_h', stop: 7 }) }), P(22, 'hp1')] },
    ult: { name: '政令宣導', cmd: '236236', btn: 'p', phases: [P(16, 'win', { inv: true }), P(10, 'cast1', { ult: 'decree', hit: H([0, 700, 0, 260], 70, 26, 16, { kb: 4, stop: 4 }) }), P(12, 'cast1', { hit: H([0, 760, 0, 260], 70, 26, 16, { kb: 4, stop: 4 }) }), P(12, 'hp1', { hit: H([0, 820, 0, 260], 110, 40, 20, { kd: 1, launch: [9, 8], sfx: 'hit_h', stop: 12 }) }), P(30, 'hp1')] }
  };

  var Moves = { NORMAL: NORMAL, BY: BY, H: H, P: P };
  /* 該角色全部指令招式（含大招）依優先順序排列：大招 → 小招 */
  Moves.list = function (id) { var m = BY[id] || {}; return [m.ult, m.s1, m.s2].filter(Boolean); };
  Moves.special = function (id, n) { var m = BY[id]; return m ? (n === 3 ? m.ult : m['s' + n]) : null; };
  Moves.motionName = function (m) {
    var d = { '236': '↓↘→', '214': '↓↙←', '623': '→↓↘', '66': '→→', 'c46': '←蓄力→', '236236': '↓↘→↓↘→' }, b = { p: '手', k: '腳' };
    return (d[m.cmd] || m.cmd) + b[m.btn];
  };
  G.Moves = Moves;
})(window);
