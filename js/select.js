/* SelectScene — 選角（含 Boss 解鎖）、場景選擇、招式表預覽。
 * opts: { steps:['p1','p2','stage'], title, done({p1,p2,stage}), back() }；各步驟可用鍵盤 / 搖桿 / 觸控點選。 */
(function (G) {
  'use strict';
  var W = CFG.W, H = CFG.H, FI = G.FightInput, R = G.Rig, UI = G.UI, FX = G.FxAudio, M = G.Moves;
  var HOME = { long: 1, cai: 1, su: 0, wu: 4, yu: 3, feng: 2, ting: 3, die: 0, boss: 7 };
  function SelectScene(game, o) { this.game = game; this.o = o; }
  var P = SelectScene.prototype;
  P.bossOpen = function () { return !!SaveManager.get('bossUnlocked', false); };
  P.enter = function () {
    var me = this; this.t = 0; this.step = 0; this.sel = 0; this.picks = {}; this.view = null; this.stageSel = 0; this.cache = {};
    this.list = Roster.chars.slice(); this.list.push(Roster.boss); this.stageCount = Stage.count;
    FTouch.show(null); FI.setMode(1); FX.music('sel');
    this._off = FI.on('nav', function (d) { me.nav(d); });
  };
  P.exit = function () { if (this._off) this._off(); };
  P.cur = function () { return this.o.steps[this.step]; };
  P.locked = function (i) { return this.list[i].boss && !this.bossOpen(); };
  P.stageLocked = function (i) { return i === 7 && !this.bossOpen(); };
  P.nav = function (d) {
    var s = this.cur(), n = this.list.length;
    if (this.view) { if (d === 'back' || d === 'ok' || d === 'pause') this.view = null; else if (d === 'left' || d === 'right') { this.sel = (this.sel + (d === 'left' ? -1 : 1) + n) % n; } return; }
    if (s === 'stage') {
      if (d === 'left' || d === 'right') { var c = this.stageCount; do { this.stageSel = (this.stageSel + (d === 'left' ? -1 : 1) + c) % c; } while (this.stageLocked(this.stageSel)); FX.play('blip'); }
      else if (d === 'ok') this.confirm(); else if (d === 'back') this.back(); return;
    }
    if (d === 'left' || d === 'right' || d === 'up' || d === 'down') {
      var col = this.sel % 3, row = (this.sel / 3) | 0; if (d === 'left') col = (col + 2) % 3; if (d === 'right') col = (col + 1) % 3; if (d === 'up') row = (row + 2) % 3; if (d === 'down') row = (row + 1) % 3;
      this.sel = Math.min(n - 1, row * 3 + col); FX.play('blip');
    } else if (d === 'ok') this.confirm(); else if (d === 'back') this.back(); else if (d === 'pause') { if (!this.locked(this.sel)) this.view = 'moves'; }
  };
  P.back = function () { FX.play('back'); if (this.step > 0) { this.step--; var s = this.cur(); if (s !== 'stage') this.sel = this.list.findIndex(function (c) { return c.id === this.picks[s]; }, this); } else this.o.back(); };
  P.confirm = function () {
    var s = this.cur();
    if (s === 'stage') { this.picks.stage = this.stageSel; this.finish(); return; }
    if (this.locked(this.sel)) { FX.play('back'); return; }
    this.picks[s] = this.list[this.sel].id; FX.play('ok'); FX.say(this.list[this.sel].name, this.list[this.sel].tts);
    this.step++;
    if (this.cur() === 'stage') this.stageSel = HOME[this.picks.p2 || this.picks.p1] === 7 && !this.bossOpen() ? 0 : (HOME[this.picks.p2 || this.picks.p1] || 0);
    else if (this.step >= this.o.steps.length) this.finish();
  };
  P.finish = function () { this.o.done(this.picks); };
  P.pointer = function (type, x, y) {
    if (this.view) { if (type === 'down') this.view = null; return; }
    if (type !== 'down' && type !== 'move') return;
    var s = this.cur();
    if (type === 'down' && x < 110 && y < 70) { this.back(); return; }
    if (s === 'stage') {
      if (type === 'down') { if (x < 200) this.nav('left'); else if (x > W - 200) this.nav('right'); else this.confirm(); } return;
    }
    var gx = 30, gy = 96, cw = 148, ch = 120, gap = 8, i;
    for (i = 0; i < this.list.length; i++) {
      var cx = gx + (i % 3) * (cw + gap), cy = gy + ((i / 3) | 0) * (ch + gap);
      if (x >= cx && x < cx + cw && y >= cy && y < cy + ch) { if (type === 'down') { if (this.sel === i) this.confirm(); else { this.sel = i; FX.play('blip'); } } else this.sel = i; return; }
    }
    if (type === 'down') {
      if (x > 520 && x < 700 && y > 450 && y < 500) this.confirm();
      else if (x >= 710 && x < 920 && y > 450 && y < 500 && !this.locked(this.sel)) this.view = 'moves';
    }
  };
  P.update = function () { this.t++; G.G_TIME = this.t / 60; };
  P.portrait = function (c, ch, x, y, w, h, t, active) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); var g = c.createLinearGradient(x, y, x, y + h), col = ch.color; g.addColorStop(0, G.cssColor(col, .9)); g.addColorStop(1, G.cssColor(R.sh(col, .35), 1)); c.fillStyle = g; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,.08)'; for (var i = -2; i < 8; i++) { c.beginPath(); c.moveTo(x + i * 30, y + h); c.lineTo(x + i * 30 + 40, y); c.lineTo(x + i * 30 + 60, y); c.lineTo(x + i * 30 + 20, y + h); c.fill(); }
    var pim = G.Sprites.portrait(ch.id); if (pim) { var ks = Math.max(w / pim.naturalWidth, h / pim.naturalHeight), iw = pim.naturalWidth * ks, ih = pim.naturalHeight * ks; c.drawImage(pim, x + (w - iw) / 2, y, iw, ih); c.restore(); return; }
    var pen = new CanvasPen(c), sc = (h / 232) * (ch.scale || 1), br = active ? Math.sin(t * 3) * .5 + .5 : .5, pose = R.lerpPose(R.POSE.idleA, R.POSE.idleB, br);
    var J = R.solve(ch.look, pose, x + w * .46, y + h - 4, 1, sc); R.draw(pen, J, ch.look, 'n'); c.restore();
  };
  P.draw = function (c) {
    var t = this.t / 60, i, s = this.cur();
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#120a2a'); bg.addColorStop(1, '#2a1030'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.04)'; for (i = 0; i < 20; i++) c.fillRect((i * 97 + t * 20) % W, 0, 2, H);
    Brush.text(c, s === 'stage' ? '選擇場景' : (this.o.steps.length > 1 && s === 'p2' ? (this.o.mode === 'vs2p' ? '玩家二 選角' : '對手 選角') : this.o.steps.length > 1 ? (this.o.mode === 'vs2p' ? '玩家一 選角' : '我方 選角') : '選擇角色'), W / 2, 58, 48, { style: 'gold' });
    UI.text(c, '◀ 返回', 14, 30, 18, '#cdd3ee', 'left', { weight: 800 });
    if (s === 'stage') { this.drawStage(c, t); if (this.view) this.drawView(c); return; }
    for (i = 0; i < this.list.length; i++) {
      var ch = this.list[i], cx = 30 + (i % 3) * 156, cy = 96 + ((i / 3) | 0) * 128, sel = i === this.sel, lk = this.locked(i);
      if (lk) { c.fillStyle = '#1a1a2a'; c.fillRect(cx, cy, 148, 120); UI.text(c, '？？？', cx + 74, cy + 56, 30, '#4a4e6a', 'center', { weight: 900 }); UI.text(c, '街機通關後解鎖', cx + 74, cy + 92, 13, '#6a6e8a', 'center'); }
      else { this.portrait(c, ch, cx, cy, 148, 120, t, sel); UI.text(c, ch.name, cx + 8, cy + 108, 18, '#fff', 'left', { stroke: '#000', weight: 900 }); }
      c.lineWidth = sel ? 5 : 2; c.strokeStyle = sel ? '#ffd24a' : 'rgba(255,255,255,.35)'; c.strokeRect(cx, cy, 148, 120);
      if (sel) { c.strokeStyle = 'rgba(255,230,140,' + (.4 + .3 * Math.sin(t * 8)) + ')'; c.lineWidth = 3; c.strokeRect(cx - 4, cy - 4, 156, 128); }
      var tag = this.picks.p1 === ch.id ? '1P' : this.picks.p2 === ch.id ? '2P' : null; if (tag) { c.fillStyle = tag === '1P' ? '#3a78ff' : '#ff4a3a'; c.fillRect(cx, cy, 36, 22); UI.text(c, tag, cx + 18, cy + 12, 15, '#fff', 'center', { weight: 900 }); }
    }
    var ch2 = this.list[this.sel];
    UI.panel(c, 500, 88, 430, 424, {});
    if (!this.locked(this.sel)) {
      this.portrait(c, ch2, 516, 100, 190, 230, t, true); c.strokeStyle = '#e8b84a'; c.lineWidth = 2; c.strokeRect(516, 100, 190, 230);
      Brush.text(c, ch2.name, 818, 142, 54, { style: 'gold', align: 'center' }); UI.text(c, ch2.full + '　' + ch2.age + ' 歲', 818, 188, 16, '#ffe8a0', 'center', { weight: 800 }); UI.text(c, ch2.title + '・' + ch2.place, 818, 210, 15, '#cdd3ee', 'center');
      var st = [['力量', ch2.stats.pow], ['速度', ch2.stats.spd], ['射程', ch2.stats.rng], ['防禦', ch2.stats.def]];
      for (i = 0; i < 4; i++) { var sy = 240 + i * 22; UI.text(c, st[i][0], 726, sy, 15, '#ffd870', 'left', { weight: 800 }); for (var k = 0; k < 5; k++) { c.fillStyle = k < st[i][1] ? '#ffd24a' : 'rgba(255,255,255,.2)'; c.fillRect(772 + k * 24, sy - 7, 20, 13); } }
      UI.wrap(c, ch2.bio, 518, 354, 396, 20, 15, '#dfe4ff');
      var sp = [M.special(ch2.id, 1), M.special(ch2.id, 2), M.special(ch2.id, 3)]; for (i = 0; i < 3; i++) UI.text(c, (i === 2 ? '大招　' : '小招　') + sp[i].name + '　' + M.motionName(sp[i]), 518, 404 + i * 20, 15, i === 2 ? '#ffb23a' : '#fff', 'left', { weight: 700 });
      UI.pill(c, 520, 456, 170, 40, 'rgba(232,184,74,.9)', '#fff'); UI.text(c, '決定', 605, 477, 22, '#2a1408', 'center', { weight: 900 }); UI.pill(c, 710, 456, 200, 40, 'rgba(60,70,120,.9)', '#9ac8ff'); UI.text(c, '招式表', 810, 477, 20, '#fff', 'center', { weight: 800 });
    } else UI.text(c, '尚未解鎖', 715, 300, 30, '#6a6e8a', 'center', { weight: 900 });
    UI.text(c, '方向鍵 / 搖桿 選擇　確定(J)　返回(K)　P 招式表', W / 2, 526, 14, '#8a90b8', 'center');
    if (this.view) this.drawView(c);
  };
  P.drawView = function (c) { c.fillStyle = 'rgba(4,4,16,.8)'; c.fillRect(0, 0, W, H); UI.drawMoves(c, this.list[this.sel], 100, 30, 760); UI.text(c, '◀ ▶ 切換角色　點一下或確定返回', W / 2, 512, 16, '#aab2d8', 'center'); };
  P.drawStage = function (c, t) {
    var i = this.stageSel, st = this.cache[i] || (this.cache[i] = Stage.make(i)), cam = 400 + Math.sin(t * .5) * 300;
    c.save(); c.translate(130, 100); c.scale(.72, .72); c.beginPath(); c.rect(0, 0, W, H); c.clip(); st.draw(c, cam, t); c.restore(); c.strokeStyle = '#e8b84a'; c.lineWidth = 4; c.strokeRect(130, 100, W * .72, H * .72);
    Brush.text(c, st.name, W / 2, 506, 56, { style: 'gold', align: 'center' }); UI.text(c, st.place, W / 2, 536 - 14, 16, '#cdd3ee', 'center');
    UI.text(c, '◀', 70, 300, 60, '#ffd24a', 'center', { weight: 900 }); UI.text(c, '▶', W - 70, 300, 60, '#ffd24a', 'center', { weight: 900 }); UI.text(c, (i + 1) + ' / ' + this.stageCount, W / 2, 92, 16, '#cdd3ee', 'center');
  };
  G.SelectScene = SelectScene;
})(window);
