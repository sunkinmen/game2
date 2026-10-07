/* TutorialScene — 互動式新手教學：在訓練場中一關一關教，偵測玩家真的做出動作才過關。
 * 內部包一個 FightScene（訓練模式），上面疊教學提示。完成後寫入存檔 tutorialDone。 */
(function (G) {
  'use strict';
  var W = CFG.W, H = CFG.H, UI = G.UI, FX = G.FxAudio, FI = G.FightInput, M = G.Moves;
  function TutorialScene(game, o) { this.game = game; this.o = o || {}; }
  var T = TutorialScene.prototype;
  function touchy() { return !!(G.FTouch && G.FTouch.visible && G.FTouch.visible() && (('ontouchstart' in G) || G.navigator.maxTouchPoints > 0)); }
  T.enter = function () {
    var me = this, g = this.game;
    this.fsc = new G.FightScene(g, { mode: 'train', p1: this.o.p1 || 'long', p2: 'cai', stage: 0, onEnd: function () { me.finish(false); } });
    this.fsc.enter(); this.fsc.phase = 'fight'; this.fsc.fs.forEach(function (f) { f.state = 'idle'; f.expr = 'n'; });
    this.fsc.stage.bgm && FX.fadeMusic && FX.fadeMusic(.18);
    this.me = this.fsc.fs[0]; this.dm = this.fsc.fs[1]; this.li = -1; this.t = 0; this.done = 0; this.wait = 0; this.cnt = 0; this.seen = {};
    this.lessons = this.build(); this.begin(0);
    this._off2 = FI.on('nav', function (d) { if (me.li >= me.lessons.length && (d === 'ok' || d === 'back')) me.finish(true); });
  };
  T.exit = function () { if (this._off2) this._off2(); this.fsc.exit(); };
  T.build = function () {
    var me = this, S1 = M.special(this.me.id, 1), S2 = M.special(this.me.id, 2), td = touchy();
    var hand = td ? '「手」鈕' : 'J 鍵', kick = td ? '「腳」鈕' : 'K 鍵', jump = td ? '「跳」鈕或搖桿往上' : 'L / 空白鍵（或 W / ↑）', mv = td ? '左下搖桿' : 'A D / ← →';
    return [
      { t: '移動', d: '用 ' + mv + ' 前進、後退。走過去靠近對手！', goal: 3, st: function (s) { s.x0 = me.me.x; s.acc = 0; }, chk: function (s) { var d = Math.abs(me.me.x - s.x0); s.x0 = me.me.x; if (me.me.state === 'walk') s.acc += d; return s.acc / 220; } },
      { t: '跳躍', d: '按 ' + jump + ' 跳起來。', goal: 1, chk: function () { return me.me.state === 'air' ? 1 : 0; } },
      { t: '拳與腿', d: '靠近對手，按 ' + hand + ' 出拳、' + kick + ' 踢腿，打中 4 次。輕攻擊可以連按！', goal: 4, hp: true },
      { t: '防禦', d: '對手會來打你。對手出招時按住「後方」（遠離對手的方向）就能擋住，蹲下 + 後 = 擋下段。擋住 3 次。', goal: 3, dummy: 'atk', chk: function (s) { var b = me.me.state === 'blockstun'; if (b && !s.was) s.n = (s.n || 0) + 1; s.was = b; return (s.n || 0) / 3; } },
      { t: '投技', d: '對手一直擋？同時按 ' + hand + ' + ' + kick + ' 抓住他，防禦對投技無效！成功投出一次。', goal: 1, dummy: 'guard', chk: function (s) { var d = me.dm; if (me.me.move && me.me.move.throw && me.me.move.name === '投技' && (d.state === 'grabbed' || d.state === 'launched')) s.ok = 1; return s.ok || 0; } },
      { t: '必殺技', d: '角色有兩招必殺技，招式表請看暫停選單。' + (td ? '點右側「' + S1.name + '」鈕即可發招（設定中開啟簡易模式），或用搖桿打出指令。' : '快速按 U 鍵發「' + S1.name + '」、I 鍵發「' + S2.name + '」，或輸入指令：' + (S1.cmd) + ' + ' + (S1.btn === 'p' ? 'J' : 'K') + '（數字為方向鍵盤位置，6=前、2=下）。') + ' 發出任一招。', goal: 1, chk: function (s) { var m = me.me.move; if (m && (m.name === S1.name || m.name === S2.name || m.name === S1.name + ' EX' || m.name === S2.name + ' EX')) s.ok = 1; return s.ok || 0; } },
      { t: 'EX 必殺', d: '氣量條滿 30 就能發 EX：必殺技的同時按住 ' + (td ? '紫色「EX」鈕' : 'H 鍵') + '，無敵起手、傷害更高、更難擋。氣量已幫你補滿，用 EX 發一次必殺！', goal: 1, st: function () { me.me.meter = 60; }, chk: function (s) { if (me.me.move && me.me.move.ex) s.ok = 1; if (!s.ok && me.me.meter < 30 && !me.me.move) me.me.meter = 60; return s.ok || 0; } },
      { t: '防禦崩潰', d: '一直被擋會累積「防禦槽」（對手血條下的小藍條），滿了就會崩潰、暈眩並多吃 25% 傷害。對手正在死守——用重攻擊與 EX 一直壓，把他打崩！', goal: 1, dummy: 'guard', st: function () { me.dm.gg = 82; }, chk: function (s) { if (me.dm.crushed) s.ok = 1; return s.ok || 0; } },
      { t: '大招', d: '打擊與被打都會累積氣量，滿 100 就能放大招（有演出的那招）。氣量已補滿，放一次大招！', goal: 1, st: function () { me.me.meter = 100; me.fsc.infMeter = false; }, chk: function (s) { if (me.me.move && me.me.move.name === M.special(me.me.id, 3).name) s.ok = 1; if (!s.ok && me.me.meter < 100 && !me.me.move && me.fsc.freeze <= 0) me.me.meter = 100; return s.ok || 0; } }
    ];
  };
  T.begin = function (i) {
    var L = this.lessons[i], s = this.seen = {}, m = this.me, d = this.dm; this.li = i; this.prog = 0; this.wait = 0; this.cnt = 0; this.hp0 = d.hp;
    m.x = 520; d.x = 760; m.state = 'idle'; d.state = 'idle'; m.move = d.move = null; m.vx = d.vx = 0; m.y = d.y = 0; d.hp = d.maxHp; d.hpLag = d.hp; d.gg = 0; d.crushed = false; this.fsc.projs.length = 0; this.fsc.camX = this.fsc.camTarget = 150;
    this.hitN = 0; this.lastHp = d.hp;
    this.fsc.dummy = L.dummy === 'guard' ? G.TrainDummy.make(3, d) : L.dummy === 'atk' ? this.attacker(d) : G.TrainDummy.make(0, d);
    if (L.st) L.st(s);
  };
  T.attacker = function (d) {                                       // 會走近並出拳的假人
    var t = 0;
    return { think: function (me, opp) { var o = G.AI.blank(), dx = opp.x - me.x, dist = Math.abs(dx); t++; if (me.state === 'idle' || me.state === 'walk') { if (dist > 105) o[dx > 0 ? 'r' : 'l'] = true; else if (t % 60 === 0) { o.xp = true; o.p = true; } } return o; } };
  };
  T.finish = function (ok) { if (ok) G.SaveManager.set('tutorialDone', true); this.game.toTitle(); };
  T.update = function () {
    var L = this.lessons[this.li], g = this.game; this.t++;
    if (this.li >= this.lessons.length) { this.fsc.update(); return; }
    if (this.wait > 0) { if (--this.wait === 0) { if (this.li + 1 >= this.lessons.length) { this.li = this.lessons.length; G.SaveManager.set('tutorialDone', true); this.endT = 0; } else this.begin(this.li + 1); } this.fsc.update(); return; }
    this.fsc.update();
    if (L.hp) { if (this.dm.hp < this.lastHp) this.hitN++; this.lastHp = this.dm.hp; if (this.dm.hp >= this.dm.maxHp * .5) { /* 保持有血 */ } this.prog = Math.min(1, this.hitN / L.goal); this.dm.hp = Math.max(this.dm.hp, this.dm.maxHp * .6); this.lastHp = this.dm.hp; }
    else if (L.chk) this.prog = Math.min(1, L.chk(this.seen));
    if (this.prog >= 1) { this.wait = 80; FX.play('ok'); }
  };
  T.pointer = function (type, x, y) {
    if (type === 'down' && Math.hypot(x - 922, y - 204) < 30) { this.finish(this.li >= this.lessons.length); return; }
    if (type === 'down' && this.li >= this.lessons.length) { this.finish(true); return; }
    this.fsc.pointer(type, x, y);
  };
  T.draw = function (c) {
    this.fsc.draw(c); var L = this.lessons[this.li], n = this.lessons.length, i;
    c.beginPath(); c.arc(922, 204, 22, 0, 6.3); c.fillStyle = 'rgba(8,8,20,.6)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(232,184,74,.8)'; c.stroke(); UI.text(c, this.li >= n ? '離開' : '略過', 922, 205, 12, '#ffe8a0', 'center', { weight: 900 });
    if (this.li >= n) {
      UI.panel(c, 170, 150, 620, 150, { title: '教學完成！' });
      UI.text(c, '你已學會：移動、攻擊、防禦、投技、必殺、EX、防禦崩潰、大招。', 480, 215, 18, '#fff', 'center');
      UI.text(c, '隨時可從主選單「新手教學」重溫。點一下或按任意鍵返回', 480, 255, 16, '#ffe8a0', 'center');
      return;
    }
    UI.panel(c, 120, 146, 720, 118);
    UI.text(c, '教學 ' + (this.li + 1) + '/' + n + '　' + L.t, 148, 166, 22, '#ffd870', 'left', { weight: 900 });
    this.wrap(c, L.d, 148, 196, 664, 20, 17);
    var pw = 200, px = 640, py = 156; c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(px, py, pw, 10); c.fillStyle = this.prog >= 1 ? '#7aff9a' : '#ffd24a'; c.fillRect(px, py, pw * this.prog, 10);
    if (this.prog >= 1) UI.text(c, '✔ 完成！', 700, 184, 20, '#7aff9a', 'center', { weight: 900, stroke: '#000' });
  };
  T.wrap = function (c, s, x, y, w, lh, size) {
    c.font = '600 ' + size + 'px ' + UI.FONT; var line = '', i, ch, yy = y; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#eef2ff';
    for (i = 0; i < s.length; i++) { ch = s[i]; if (c.measureText(line + ch).width > w) { c.fillText(line, x, yy); yy += lh; line = ch; } else line += ch; }
    c.fillText(line, x, yy);
  };
  G.TutorialScene = TutorialScene;
})(window);
