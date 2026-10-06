/* 標題 / 設定 / 招式表 / 對戰預告 / 街機通關 場景 */
(function (G) {
  'use strict';
  var W = CFG.W, H = CFG.H, FI = G.FightInput, R = G.Rig, UI = G.UI, FX = G.FxAudio, M = G.Moves;
  function bgStage(i) { return Stage.make(i); }
  function ppose(t, k) {                                          // 標題畫面的招式循環動畫
    var seq = ['idleA', 'idleB', 'jab0', 'jab1', 'jab0', 'idleA', 'kick0', 'kick1', 'kick0', 'idleB', 'hp0', 'hp1', 'hp0', 'idleA'], i = Math.floor((t * 2.2 + k) % seq.length), j = (i + 1) % seq.length, f = (t * 2.2 + k) % 1;
    return R.lerpPose(R.POSE[seq[i]], R.POSE[seq[j]], f);
  }

  /* ---------- 標題 ---------- */
  function TitleScene(game, o) { this.game = game; this.o = o || {}; }
  var T = TitleScene.prototype;
  T.enter = function () {
    var me = this, g = this.game; this.t = 0; FTouch.show(null); this.stage = bgStage(0); var a = Roster.chars, i = (Math.random() * a.length) | 0; this.a = a[i]; this.b = a[(i + 3) % a.length];
    function sel(mode, steps, title) { g.go(function () { return new SelectScene(g, { mode: mode, steps: steps, back: function () { g.toTitle(); }, done: function (p) { g.launch(mode, p); } }); }); }
    this.list = UI.list([
      { label: '街機模式', onOk: function () { sel('arcade', ['p1']); } },
      { label: '對戰電腦', onOk: function () { sel('cpu', ['p1', 'p2', 'stage']); } },
      { label: '雙人對戰', onOk: function () { sel('vs2p', ['p1', 'p2', 'stage']); } },
      { label: '訓練場', onOk: function () { sel('train', ['p1', 'p2', 'stage']); } },
      { label: '招式表', onOk: function () { g.go(function () { return new MoveBookScene(g); }); } },
      { label: '設定', onOk: function () { g.go(function () { return new SettingsScene(g); }); } }], 340, 236, 280, 40, { size: 24, center: true });
    this._off = FI.on('nav', function (d) { UI.nav(me.list, d); });
    FX.music('menu');
  };
  T.exit = function () { if (this._off) this._off(); };
  T.update = function () { this.t++; G.G_TIME = this.t / 60; };
  T.pointer = function (type, x, y) { UI.pointer(this.list, type, x, y); };
  T.draw = function (c) {
    var t = this.t / 60, pen = new CanvasPen(c);
    this.stage.draw(c, 300 + Math.sin(t * .25) * 260, t); c.fillStyle = 'rgba(8,4,24,.45)'; c.fillRect(0, 0, W, H);
    [[this.a, 250, 1, 0], [this.b, 710, -1, 5]].forEach(function (p) { var J = R.solve(p[0].look, ppose(t, p[3]), p[1], 480, p[2], 1.35 * (p[0].scale || 1)); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(p[1], 484, 80, 12, 0, 0, 6.3); c.fill(); R.draw(pen, J, p[0].look, 'atk'); });
    c.fillStyle = 'rgba(8,4,24,.35)'; c.fillRect(0, 0, W, 228);
    Brush.text(c, '台北格鬥風雲', W / 2, 142 + Math.sin(t * 2) * 3, 124, { style: 'gold', align: 'center' });
    UI.text(c, 'T A I P E I   F I G H T', W / 2, 206, 22, '#ffe8a0', 'center', { stroke: '#000', weight: 900, sw: 5 });
    UI.rr(c, 322, 228, 316, 252, 18); c.fillStyle = 'rgba(8,6,26,.62)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(232,184,74,.6)'; c.stroke();
    UI.drawList(c, this.list, t);
    UI.text(c, 'v' + CFG.VERSION + '　8 位台北英雄 ＋ 最終 Boss　按任意鍵 / 點一下 開始', W / 2, 520, 14, 'rgba(230,236,255,.85)', 'center', { stroke: '#000', sw: 3 });
  };

  /* ---------- 設定 ---------- */
  function SettingsScene(game) { this.game = game; }
  var S = SettingsScene.prototype;
  S.enter = function () {
    var me = this, g = this.game; this.t = 0; this.stage = bgStage(2); FTouch.show(null);
    this.list = UI.list(UI.settingsItems().concat([{ label: '恢復預設值', onOk: function () { FSettings.reset(); } }, { label: '返回', onOk: function () { g.toTitle(); } }]), 200, 92, 560, 30, { size: 18 });
    this._off = FI.on('nav', function (d) { if (d === 'back') g.toTitle(); else UI.nav(me.list, d); });
  };
  S.exit = function () { if (this._off) this._off(); };
  S.update = function () { this.t++; };
  S.pointer = function (type, x, y) { UI.pointer(this.list, type, x, y); };
  S.draw = function (c) { this.stage.draw(c, 200, this.t / 60); c.fillStyle = 'rgba(4,4,16,.6)'; c.fillRect(0, 0, W, H); UI.panel(c, 180, 30, 600, 480, { title: '設定' }); UI.drawList(c, this.list, this.t / 60); };

  /* ---------- 招式表 ---------- */
  function MoveBookScene(game) { this.game = game; }
  var B = MoveBookScene.prototype;
  B.enter = function () {
    var me = this, g = this.game; this.t = 0; this.i = 0; this.stage = bgStage(3); FTouch.show(null); this.all = Roster.chars.concat([Roster.boss]);
    this._off = FI.on('nav', function (d) { if (d === 'back') g.toTitle(); else if (d === 'left') me.i = (me.i + me.all.length - 1) % me.all.length; else if (d === 'right' || d === 'ok') me.i = (me.i + 1) % me.all.length; });
  };
  B.exit = function () { if (this._off) this._off(); };
  B.update = function () { this.t++; };
  B.pointer = function (type, x, y) { if (type !== 'down') return; if (x < 110 && y < 60) this.game.toTitle(); else if (x < W / 2) this.i = (this.i + this.all.length - 1) % this.all.length; else this.i = (this.i + 1) % this.all.length; };
  B.draw = function (c) { this.stage.draw(c, 500, this.t / 60); c.fillStyle = 'rgba(4,4,16,.72)'; c.fillRect(0, 0, W, H); UI.drawMoves(c, this.all[this.i], 100, 30, 760); UI.text(c, '◀ 返回　　點左 / 右半邊或 ◀ ▶ 切換角色（' + (this.i + 1) + '/' + this.all.length + '）', W / 2, 522, 15, '#aab2d8', 'center'); };

  /* ---------- 對戰預告 ---------- */
  function VsScene(game, o) { this.game = game; this.o = o; }
  var V = VsScene.prototype;
  V.enter = function () { var me = this; this.t = 0; FTouch.show(null); this.a = Roster.get(this.o.p1); this.b = Roster.get(this.o.p2); this.stage = Stage.make(this.o.stage); FX.play('drum'); FX.stopMusic(); this._off = FI.on('nav', function (d) { if (me.t > 20 && (d === 'ok' || d === 'pause')) me.t = 999; }); };
  V.exit = function () { if (this._off) this._off(); };
  V.update = function () { this.t++; if (this.t === 20) FX.play('gong'); if (this.t > 120) this.o.done(); };
  V.pointer = function (type) { if (type === 'down' && this.t > 20) this.t = 999; };
  V.draw = function (c) {
    var t = this.t, k = Math.min(1, t / 14), pen = new CanvasPen(c), me = this, hex = G.cssColor;
    this.stage.draw(c, 400, t / 60); c.fillStyle = 'rgba(4,2,14,.7)'; c.fillRect(0, 0, W, H);
    [[this.a, 0], [this.b, 1]].forEach(function (p) {
      var ch = p[0], s = p[1], x0 = s ? W : 0, dx = (1 - k) * (s ? 500 : -500); c.save(); c.translate(dx, 0); var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, hex(ch.color, 0)); g.addColorStop(.5, hex(ch.color, .55)); g.addColorStop(1, hex(ch.color, 0));
      c.fillStyle = g; c.beginPath(); if (s) { c.moveTo(W, 0); c.lineTo(W / 2 + 90, 0); c.lineTo(W / 2 - 60, H); c.lineTo(W, H); } else { c.moveTo(0, 0); c.lineTo(W / 2 + 60, 0); c.lineTo(W / 2 - 90, H); c.lineTo(0, H); } c.fill();
      var J = R.solve(ch.look, R.POSE.intro, s ? W - 230 : 230, 420, s ? -1 : 1, 2.0 * (ch.scale || 1)); R.draw(pen, J, ch.look, 'atk');
      Brush.text(c, ch.name, s ? W - 260 : 260, 470, 60, { style: s ? 'red' : 'cyan', align: 'center' }); c.restore();
    });
    Brush.text(c, '對', W / 2, 270, 150, { style: 'gold', scale: 1 + (1 - k) * 2, alpha: k });
    UI.text(c, this.stage.name + '・' + this.stage.place, W / 2, 500, 22, '#fff', 'center', { stroke: '#000', weight: 800 });
    if (this.o.round != null) UI.text(c, '第 ' + this.o.round + ' 戰', W / 2, 60, 28, '#ffe8a0', 'center', { stroke: '#000', weight: 900 });
  };

  /* ---------- 街機通關 ---------- */
  function ClearScene(game, o) { this.game = game; this.o = o; }
  var C = ClearScene.prototype;
  C.enter = function () { var me = this; this.t = 0; FTouch.show(null); this.ch = Roster.get(this.o.p1); this.stage = Stage.make(7); this.newly = !SaveManager.get('bossUnlocked', false); SaveManager.set('bossUnlocked', true); FX.play('jingle'); FX.say(this.ch.lines.win, this.ch.tts); this._off = FI.on('nav', function (d) { if (me.t > 60 && (d === 'ok' || d === 'back')) me.game.toTitle(); }); };
  C.exit = function () { if (this._off) this._off(); };
  C.update = function () { this.t++; G.G_TIME = this.t / 60; if (this.t % 40 === 0) FX.play('crowd'); };
  C.pointer = function (type) { if (type === 'down' && this.t > 60) this.game.toTitle(); };
  C.draw = function (c) {
    var t = this.t / 60, pen = new CanvasPen(c); this.stage.draw(c, 420, t); c.fillStyle = 'rgba(4,4,16,.5)'; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 30; i++) { var a = (t * .5 + i / 30) % 1, x = (i * 137) % W, y = a * H; c.fillStyle = ['#ffd24a', '#ff6a4a', '#6ad8ff', '#fff'][i % 4]; c.fillRect(x, y, 6, 10); }
    var J = R.solve(this.ch.look, t % 1 < .5 ? R.POSE.win : R.POSE.win2, W / 2, 440, 1, 2.1 * (this.ch.scale || 1)); R.draw(pen, J, this.ch.look, 'win');
    Brush.text(c, '街機通關', W / 2, 120, 110, { style: 'gold', align: 'center' }); UI.text(c, this.ch.name + ' 打倒了總統府的西裝男！', W / 2, 190, 26, '#fff', 'center', { stroke: '#000', weight: 900 });
    if (this.newly) UI.text(c, '已解鎖：最終 Boss「西裝男」可在選角畫面使用', W / 2, 232, 22, '#ffd24a', 'center', { stroke: '#000', weight: 900 });
    UI.text(c, '按確定 / 點一下 回到標題', W / 2, 516, 18, '#e8ecff', 'center', { stroke: '#000' });
  };
  G.TitleScene = TitleScene; G.SettingsScene = SettingsScene; G.MoveBookScene = MoveBookScene; G.VsScene = VsScene; G.ClearScene = ClearScene;
})(window);
