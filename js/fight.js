/* FightScene — 戰鬥場景：回合流程、HUD、攝影機、必殺技演出、暫停選單、訓練場、結算。
 * opts: { mode:'arcade'|'cpu'|'vs2p'|'train', p1, p2, stage, level, onEnd(action, info) } */
(function (G) {
  'use strict';
  var W = CFG.W, H = CFG.H, GROUND = CFG.GROUND, SW = CFG.STAGE_W, FX = G.FxAudio, FI = G.FightInput, FS = G.FSettings, M = G.Moves, R = G.Rig, UI = G.UI;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function FightScene(game, o) { this.game = game; this.o = o; }
  var P = FightScene.prototype;
  P.gy = function (h) { return GROUND - h; };

  P.enter = function () {
    var o = this.o, c1 = Roster.get(o.p1), c2 = Roster.get(o.p2), me = this;
    this.mode = o.mode; this.train = o.mode === 'train'; this.round = 1; this.wins = [0, 0]; this.need = FS.get('wins');
    this.stage = Stage.make(o.stage || 0); FX.preloadVoice && (FX.preloadVoice(c1.id), FX.preloadVoice(c2.id)); this.fx = new FxSys(); this.projs = []; this.hitStop = 0; this.freeze = 0; this.slow = 0; this.shake = 0; this.zoom = 0; this.impact = null; this.t = 0; this.paused = null; this.ult = null; this.result = null;
    this.combos = [{ n: 0, dmg: 0, t: 0 }, { n: 0, dmg: 0, t: 0 }]; this.lastDmg = 0; this.maxCombo = 0; this.hist = []; this.dummyMode = 0; this.infMeter = false; this.flash = 0; this.koT = 0;
    FI.setMode(o.mode === 'vs2p' ? 2 : 1); FTouch.show(o.mode === 'vs2p' ? '2p' : '1p'); FI.reset();
    var f1 = new Fighter(c1, 0, 'h0'), f2 = new Fighter(c2, 1, o.mode === 'vs2p' ? 'h1' : this.train ? 'dummy' : 'ai');
    this.fs = [f1, f2]; this.ai = [null, null];
    if (f2.ctrl === 'ai') this.ai[1] = new AI(o.level != null ? o.level : FS.get('diff'), f2);
    if (this.train) this.dummy = TrainDummy.make(0, f2);
    [f1, f2].forEach(function (f, i) { FI.setLabels(i, [M.special(f.id, 1).name, M.special(f.id, 2).name, M.special(f.id, 3).name]); f.scene = me; });
    this.camX = clamp(750 - W / 2, 0, SW - W); this.camTarget = this.camX;
    this.startRound(); FX.music(this.stage.bgm);
    this._off = FI.on('nav', function (d) { me.nav(d); });
  };
  P.exit = function () { if (this._off) this._off(); FX.stopSpeech(); FTouch.show(null); FX.stopMusic(); };
  P.startRound = function () {
    var fs = this.fs, i; this.projs.length = 0; this.phase = 'intro'; this.pt = 0; this.timer = this.train ? 0 : FS.get('time') * 60; this.slow = 0; this.freeze = 0; this.hitStop = 0; this.ult = null;
    for (i = 0; i < 2; i++) { var f = fs[i], keepMeter = f.meter || 0; f.reset(i); f.meter = keepMeter; f.state = 'intro'; f.hpLag = f.hp; f.scene = this; f.x = i === 0 ? 520 : 980; }
    this.camX = this.camTarget = clamp(750 - W / 2, 0, SW - W); this.koT = 0; this.winner = null; this.overT = 0;
  };
  P.opp = function (f) { return f === this.fs[0] ? this.fs[1] : this.fs[0]; };

  /* ---------- 與 Fighter / Combat 的介面 ---------- */
  P.spawn = function (f, spec) { this.projs.push(new Proj(f, spec)); };
  P.spawnRaw = function (owner, spec, absX) { var s = {}, k; for (k in spec) s[k] = spec[k]; s.abs = absX; this.projs.push(new Proj(owner, s)); };
  P.release = function (f, spec) {
    var opp = f.heldOpp; if (!opp) return; f.heldOpp = null; opp.applyRaw(f, spec); this.hitStop = Math.max(this.hitStop, 8); this.shake = Math.max(this.shake, 9 * FS.get('shake'));
    this.fx.spark(opp.x, GROUND - opp.y - 60, 'h'); this.fx.dust(opp.x, GROUND, 8); if (this.train) this.fx.text(opp.x, GROUND - 190, spec.dmg, '#ffe27a');
    this.noteCombo(f);
  };
  P.counterFx = function (def, att) { FX.play('block'); this.hitStop = 12; this.fx.ring(def.x, GROUND - 90, 0xffe27a, 80); this.fx.text(def.x, GROUND - 200, '反制！', '#ffe27a', 30); };
  P.landFx = function (f) { this.fx.dust(f.x, GROUND, 7); this.shake = Math.max(this.shake, 3 * FS.get('shake')); };
  P.onHit = function (A, B, res, h, x, y) {
    if (res.counter) return;
    var sx = x, sy = GROUND - y, lvl = h.dmg >= 75 ? 'h' : h.dmg >= 38 ? 'm' : 'l', sh = FS.get('shake');
    if (res.blocked) {
      this.fx.block(sx, sy); FX.play(h.ex ? 'block_ex' : 'block'); this.hitStop = Math.max(this.hitStop, h.ex ? 6 : 3); this.shake = Math.max(this.shake, (h.ex ? 3 : 1.5) * sh); if (res.dmg) this.fx.text(B.x, GROUND - 180, res.dmg, '#9fd8ff', 18);
      if (B.gg > 60 && !res.crush) this.fx.text(B.x, GROUND - 205, '小心！', '#ff9a4a', 16);
    } else {
      var st = lvl === 'h' ? 9 : lvl === 'm' ? 6 : 4; if (h.stop && h.stop > st) st = h.stop; if (res.chit) st += 3; if (h.ex) st += 2;
      this.fx.spark(sx, sy, lvl, A.ch.color); FX.play(h.sfx || (lvl === 'h' ? 'hit_h' : lvl === 'm' ? 'hit_m' : 'hit_l')); this.hitStop = Math.max(this.hitStop, st); this.shake = Math.max(this.shake, (lvl === 'h' ? 9 : lvl === 'm' ? 5 : 2.5) * sh * (h.ex ? 1.3 : 1));
      this.zoom = Math.max(this.zoom, (lvl === 'h' ? .035 : lvl === 'm' ? .018 : .008) * (h.ex ? 1.5 : 1)); this.impact = { x: sx - this.camX * 0 , y: sy, t: 8, big: lvl === 'h' || h.ex || res.chit, face: A.face };
      if (res.launch) this.fx.dust(B.x, GROUND, 4);
      if (res.chit) { this.fx.text(B.x, GROUND - 235, 'COUNTER', '#ff8a3a', 22); FX.play('counter'); }
      if (res.ko) { this.shake = 14 * sh; this.hitStop = 16; this.zoom = .09; this.flash = Math.max(this.flash, 5); }
      this.lastDmg = res.dmg; if (this.train || res.dmg >= 60) this.fx.text(B.x, GROUND - 190, res.dmg, '#ffe27a', this.train ? 22 : 26);
      this.noteCombo(A);
      if (A.meter >= 100 && !A._full) { A._full = true; FX.play('meter'); } else if (A.meter < 100) A._full = false;
    }
  };
  P.crushFx = function (f, att) {
    this.hitStop = 16; this.shake = Math.max(this.shake, 10 * FS.get('shake')); this.zoom = Math.max(this.zoom, .05); this.flash = Math.max(this.flash, 4);
    FX.play('crush'); this.fx.ring(f.x, GROUND - 100, 0x9fd8ff, 120); this.fx.ring(f.x, GROUND - 100, 0xffffff, 70); this.fx.text(f.x, GROUND - 230, '防禦崩潰！', '#ffd24a', 34); this.fx.spark(f.x, GROUND - 100, 'h', 0x9fd8ff);
  };
  P.onExStart = function (f, mv) {
    FX.play('ex_go'); this.fx.ring(f.x, GROUND - f.y - 90, 0xc88aff, 110); this.fx.ring(f.x, GROUND - f.y - 90, 0xffffff, 60); this.fx.text(f.x, GROUND - f.y - 215, 'EX', '#d8a8ff', 30); this.hitStop = Math.max(this.hitStop, 7); this.zoom = Math.max(this.zoom, .03); this.shake = Math.max(this.shake, 3 * FS.get('shake'));
    FX.grunt(f.ch.tts.pitch * 1.08, 'ult', f.id);
  };
  P.noteCombo = function (A) { var i = this.fs.indexOf(A), c = this.combos[i]; c.n = A.combo; c.dmg = A.comboDmg; c.t = 90; if (A.combo > this.maxCombo) this.maxCombo = A.combo; };
  P.onUltStart = function (f, mv) {
    this.freeze = 56; this.ult = { f: f, mv: mv, t: 0 }; FX.play('ult_go'); FX.say(f.ch.lines.ult, f.ch.tts, false, f.id + '/ult'); FX.grunt(f.ch.tts.pitch, 'ult', f.id); this.flash = 10;
  };
  P.ultFx = function (f, tag) { f.ultTag = tag; f.ultT = 0; };

  /* ---------- 輸入 ---------- */
  P.inputFor = function (i) {
    var f = this.fs[i], o = this.fs[1 - i];
    if (this.phase !== 'fight' && !(this.phase === 'ko' && false)) { if (f.ctrl === 'h0') FI.poll(0); else if (f.ctrl === 'h1') FI.poll(1); return AI.blank(); }
    if (f.ctrl === 'h0') return FI.poll(0); if (f.ctrl === 'h1') return FI.poll(1);
    if (f.ctrl === 'ai') return this.ai[i].think(f, o, this);
    if (f.ctrl === 'dummy') return this.dummy.think(f, o, this);
    return AI.blank();
  };

  /* ---------- 更新 ---------- */
  P.update = function () {
    this.t++; G.G_TIME = this.t / 60;
    if (this.paused || this.phase === 'matchEnd') { this.fx.update(); if (this.phase === 'matchEnd') this.overT++; return; }
    if (this.freeze > 0) { this.freeze--; this.ult && this.ult.t++; return; }
    if (this.hitStop > 0) { this.hitStop--; this.shake *= .9; this.zoom *= .95; if (this.impact && this.impact.t > 0 && !(this.hitStop & 1)) this.impact.t--; this.fx.update(); return; }
    if (this.slow > 0) { this.slow--; if (this.t & 1) { this.fx.update(); return; } }
    this.pt++;
    var fs = this.fs, i, f, inp = [];
    if (this.phase === 'intro') this.updateIntro();
    else if (this.phase === 'ko') this.updateKo();
    else if (this.phase === 'roundEnd') { this.overT++; if (this.overT > 170) this.nextRound(); }
    for (i = 0; i < 2; i++) inp[i] = this.inputFor(i);
    if (this.train) this.trainHooks(inp);
    for (i = 0; i < 2; i++) { f = fs[i]; if (f.state === 'intro' || f.state === 'win' || f.state === 'lose') { f.pt += 1 / 60; f.frame++; f._poseUpdate(inp[i]); continue; } f.update(inp[i], fs[1 - i], this); }
    // 角色互推 / 攝影機
    this.separate();
    if (this.phase === 'fight' || this.phase === 'ko' || this.phase === 'roundEnd' || this.phase === 'intro') Combat.resolve(this, fs);
    var ps = this.projs; for (i = ps.length - 1; i >= 0; i--) { ps[i].update(this); if (ps[i].dead) ps.splice(i, 1); }
    this.fx.update(); this.fxEmit();
    this.camera(); this.zoom *= .86; if (this.zoom < .001) this.zoom = 0; if (this.impact && --this.impact.t <= 0) this.impact = null; this.shake *= .86; if (this.shake < .2) this.shake = 0; if (this.flash > 0) this.flash--;
    // 連段計數
    for (i = 0; i < 2; i++) { var B = fs[1 - i], A = fs[i], cb = this.combos[i]; if (!(B.state === 'hurt' || B.state === 'launched' || B.state === 'grabbed' || B.state === 'down')) { A.combo = 0; A.comboDmg = 0; if (cb.t > 0) cb.t--; } }
    for (i = 0; i < 2; i++) { f = fs[i]; f.hpLag += (f.hp - f.hpLag) * (f.hpLag > f.hp ? .04 : 1); if (f.hpLag < f.hp) f.hpLag = f.hp; }
    if (this.phase === 'fight') {
      if (!this.train && this.timer > 0 && --this.timer <= 0) { this.endRound('time'); }
      for (i = 0; i < 2; i++) if (fs[i].dead && this.phase === 'fight') { this.endRound('ko'); break; }
    }
  };
  P.updateIntro = function () {
    var t = this.pt, fs = this.fs;
    if (t === 8 && this.round === 1 && !this.train) { FX.say(fs[0].ch.lines.intro, fs[0].ch.tts, false, fs[0].id + '/intro'); }
    if (t === 24) { FX.play('drum'); }
    if (t === 62 && this.round === 1 && !this.train) FX.say(fs[1].ch.lines.intro, fs[1].ch.tts, true, fs[1].id + '/intro');
    if (t === 118) { FX.play('fight'); }
    if (t >= 118 + 14 || (this.train && t > 30)) { fs[0].state = fs[1].state = 'idle'; fs[0].expr = fs[1].expr = 'n'; this.phase = 'fight'; FI.clearLatch(); }
  };
  P.updateKo = function () {
    this.koT++; if (this.koT === 150) { var w = this.winner; if (w >= 0) { var wf = this.fs[w]; wf.state = 'win'; wf.pt = 0; wf.vx = 0; if (this.wins[w] >= this.need) FX.say(wf.ch.lines.win, wf.ch.tts, false, wf.id + '/win'); else FX.play('crowd'); FX.play('jingle'); } this.phase = 'roundEnd'; this.overT = 0; }
  };
  P.endRound = function (why) {
    var fs = this.fs, w = -1; this.phase = 'ko'; this.koT = 0; this.why = why;
    if (why === 'ko') { var d0 = fs[0].dead, d1 = fs[1].dead; w = d0 && d1 ? -1 : d0 ? 1 : 0; this.slow = 100; FX.play('ko'); FX.grunt(fs[w === 0 ? 1 : 0].ch.tts.pitch, 'ko', fs[w === 0 ? 1 : 0].id); this.shake = 12; if (!this.train && (w >= 0 ? fs[1 - w] : fs[0]).ch.lines.ko && w >= 0 && this.wins[w] + 1 >= this.need) FX.say(fs[1 - w].ch.lines.ko, fs[1 - w].ch.tts, false, fs[1 - w].id + '/ko'); }
    else { var p0 = fs[0].hp / fs[0].maxHp, p1 = fs[1].hp / fs[1].maxHp; w = Math.abs(p0 - p1) < .001 ? -1 : p0 > p1 ? 0 : 1; FX.play('gong'); }
    this.winner = w; if (w >= 0) this.wins[w]++; else { this.wins[0]++; this.wins[1]++; }
    for (var i = 0; i < 2; i++) { if (i !== w && !fs[i].dead && w >= 0) { fs[i].state = 'lose'; fs[i].pt = 0; } if (w < 0 && !fs[i].dead) { fs[i].state = 'lose'; } }
  };
  P.nextRound = function () {
    var need = this.need, a = this.wins[0] >= need, b = this.wins[1] >= need;
    if (a || b) {
      this.phase = 'matchEnd'; this.overT = 0; var w = a && b ? (this.fs[0].hp >= this.fs[1].hp ? 0 : 1) : a ? 0 : 1; this.result = { winner: w, wins: this.wins.slice(), maxCombo: this.maxCombo };
      this.buildEndMenu(); FX.music(null); FX.play('jingle'); return;
    }
    this.round++; this.startRound();
  };
  P.separate = function () {
    var a = this.fs[0], b = this.fs[1], dx = b.x - a.x, md = 46 * (a.sc + b.sc) * .5, ok = a.y < 70 && b.y < 70 && a.state !== 'grabbed' && b.state !== 'grabbed' && a.state !== 'down' && b.state !== 'down';
    if (ok && Math.abs(dx) < md) { var push = (md - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1; if (a.atWall) b.x += s * push * 2; else if (b.atWall) a.x -= s * push * 2; else { a.x -= s * push; b.x += s * push; } }
    a.x = clamp(a.x, 50, SW - 50); b.x = clamp(b.x, 50, SW - 50);
  };
  P.camera = function () {
    var a = this.fs[0], b = this.fs[1], mid = (a.x + b.x) / 2, tg = clamp(mid - W / 2, 0, SW - W);
    this.camX += (tg - this.camX) * .14; var lo = this.camX + 52, hi = this.camX + W - 52;
    [a, b].forEach(function (f) { if (f.state === 'grabbed') return; if (f.x < lo) { f.x = lo; f.atWall = -1; f.kbv = 0; } else if (f.x > hi) { f.x = hi; f.atWall = 1; f.kbv = 0; } });
    var gap = Math.abs(a.x - b.x), maxGap = W - 104; if (gap > maxGap) { var o = (gap - maxGap) / 2, s = a.x < b.x ? 1 : -1; a.x += s * o; b.x -= s * o; }
  };
  P.fxEmit = function () {
    var i, f; for (i = 0; i < 2; i++) {
      f = this.fs[i];
      if (f.ultTag) { if (!f.move) f.ultTag = null; else { f.ultT++; if (f.ultT % 2 === 0) this.fx.trail(f, f.ch.color); } }
      if (f.state === 'walk' && (this.t % 14 === 0) && Math.abs(f.vx) > 1) this.fx.dust(f.x - f.face * 10, GROUND, 1);
      if (f.state === 'attack' && f.move && f.vx && Math.abs(f.vx) > 7 && this.t % 3 === 0) this.fx.dust(f.x, GROUND, 1);
    }
  };

  /* ---------- 訓練場 ---------- */
  P.trainHooks = function (inp) {
    var f = this.fs[0], d = this.fs[1], i; if (this.infMeter) { f.meter = 100; d.meter = 100; }
    if (d.hp < d.maxHp * .3 || (d.state === 'idle' && d.hp < d.maxHp && this.t % 240 === 0)) { d.hp = d.maxHp; d.hpLag = d.hp; } if (f.hp < f.maxHp * .3) { f.hp = f.maxHp; f.hpLag = f.hp; }
    if (d.dead) { d.dead = false; d.state = 'idle'; d.hp = d.maxHp; d.y = 0; d.vy = 0; d.expr = 'n'; }
    var p = inp[0], s = (p.l ? '←' : '') + (p.r ? '→' : '') + (p.u ? '↑' : '') + (p.d ? '↓' : '') + (p.xp ? '手' : '') + (p.xk ? '腳' : '') + (p.xj ? '跳' : '') + (p.xs1 ? 'A' : '') + (p.xs2 ? 'B' : '') + (p.xs3 ? '絕' : '');
    if (s && (this.hist.length === 0 || this.hist[this.hist.length - 1].s !== s)) { this.hist.push({ s: s, t: this.t }); if (this.hist.length > 9) this.hist.shift(); }
  };

  /* ---------- 選單 ---------- */
  P.nav = function (d) {
    if (this.paused) { this.pauseNav(d); return; }
    if (this.phase === 'matchEnd') { if (this.endList) { UI.nav(this.endList, d); } return; }
    if (d === 'pause' || d === 'back') this.openPause();
  };
  P.openPause = function () {
    if (this.phase === 'matchEnd') return; var me = this; this.paused = { stack: [] }; FI.reset(); FX.fadeMusic(.12);
    this.showMain();
  };
  P.showMain = function () {
    var me = this, items = [
      { label: '繼續', onOk: function () { me.closePause(); } },
      { label: '招式表', onOk: function () { me.paused.stack.push(me.paused.view); me.paused.view = 'moves'; me.paused.who = 0; } },
      { label: '設定', onOk: function () { me.showSettings(); } }];
    if (this.train) {
      items.push({ label: '假人模式', value: function () { return TrainDummy.modes[me.dummyMode]; }, onLeft: function () { me.setDummy(-1); }, onRight: function () { me.setDummy(1); }, onOk: function () { me.setDummy(1); } });
      items.push({ label: '氣量全滿', value: function () { return me.infMeter ? '開' : '關'; }, onOk: function () { me.infMeter = !me.infMeter; }, onLeft: function () { me.infMeter = !me.infMeter; }, onRight: function () { me.infMeter = !me.infMeter; } });
      items.push({ label: '對手招式表', onOk: function () { me.paused.view = 'moves'; me.paused.who = 1; } });
    }
    if (this.mode !== 'arcade') items.push({ label: '重新開始', onOk: function () { me.closePause(); me.restart(); } });
    items.push({ label: '回主選單', onOk: function () { me.closePause(); me.o.onEnd('menu', null); } });
    this.paused.view = 'main'; this.paused.list = UI.list(items, 300, 150, 360, 46, { size: 24 }); this.paused.l = this.paused.list;
  };
  P.showSettings = function () {
    var me = this; this.paused.view = 'settings'; this.paused.list = UI.list(UI.settingsItems().concat([{ label: '返回', onOk: function () { me.showMain(); } }]), 200, 92, 560, 30, { size: 18 });
  };
  P.setDummy = function (d) { var n = TrainDummy.modes.length; this.dummyMode = (this.dummyMode + d + n) % n; this.dummy = TrainDummy.make(this.dummyMode, this.fs[1]); };
  P.closePause = function () { this.paused = null; FI.reset(); FX.fadeMusic(.32); };
  P.pauseNav = function (d) {
    var p = this.paused; if (!p) return;
    if (p.view === 'moves') { if (d === 'back' || d === 'ok' || d === 'pause') { p.view = 'main'; } else if (d === 'left' || d === 'right') p.who = 1 - p.who; return; }
    if (d === 'back' || d === 'pause') { if (p.view === 'settings') this.showMain(); else this.closePause(); return; }
    UI.nav(p.list, d);
  };
  P.restart = function () { this.wins = [0, 0]; this.round = 1; this.maxCombo = 0; this.fs.forEach(function (f) { f.meter = 0; }); this.startRound(); FX.music(this.stage.bgm); };
  P.buildEndMenu = function () {
    var me = this, w = this.result.winner, o = this.o, items = [];
    if (o.mode === 'arcade') {
      if (w === 0) items.push({ label: o.last ? '通關！' : '下一戰', onOk: function () { o.onEnd('next', me.result); } });
      else items.push({ label: '再挑戰一次', onOk: function () { o.onEnd('retry', me.result); } });
      items.push({ label: '回主選單', onOk: function () { o.onEnd('menu', me.result); } });
    } else {
      items.push({ label: '再來一場', onOk: function () { o.onEnd('rematch', me.result); } }, { label: '重新選角', onOk: function () { o.onEnd('select', me.result); } }, { label: '回主選單', onOk: function () { o.onEnd('menu', me.result); } });
    }
    this.endList = UI.list(items, 330, 340, 300, 48, { size: 24, center: true });
  };
  P.pointer = function (type, x, y) {
    if (type === 'down' && !this.paused && this.phase !== 'matchEnd' && Math.hypot(x - 922, y - 142) < 34) { this.openPause(); return; }
    if (this.paused) { if (this.paused.view === 'moves') { if (type === 'down') this.pauseNav(x < 480 ? 'left' : 'ok'); return; } if (this.paused.list) UI.pointer(this.paused.list, type, x, y); return; }
    if (this.phase === 'matchEnd' && this.endList) UI.pointer(this.endList, type, x, y);
  };

  /* ---------- 繪製 ---------- */
  P.draw = function (c) {
    var t = this.t / 60, sx = 0, sy = 0, fs = this.fs, i, pen = new CanvasPen(c);
    if (this.shake > 0) { sx = (Math.random() - .5) * this.shake * 2; sy = (Math.random() - .5) * this.shake * 2; }
    c.save(); c.translate(sx, sy); if (this.zoom > 0) { var zk = 1 + this.zoom, zx = this.impact ? this.impact.x - this.camX : W / 2; c.translate(zx, GROUND - 100); c.scale(zk, zk); c.translate(-zx, -(GROUND - 100)); } G.G_TIME = t;
    this.stage.draw(c, this.camX, t);
    var order = fs.slice(); if (fs[1].state === 'attack' && fs[0].state !== 'attack') order.reverse(); else if (fs[0].state === 'attack') order = [fs[1], fs[0]];
    for (i = 0; i < 2; i++) this.drawShadow(c, order[i]);
    for (i = 0; i < 2; i++) this.drawFighter(c, pen, order[i]);
    this.drawProjs(c, pen);
    this.fx.draw(c, this.camX); this.fx.drawTexts(c, this.camX);
    if (this.impact) this.drawImpact(c);
    c.restore();
    if (this.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + this.flash / 12 + ')'; c.fillRect(0, 0, W, H); }
    if (this.freeze > 0 && this.ult) this.drawUlt(c, pen);
    this.drawHud(c);
    if (this.phase === 'intro') this.drawIntro(c);
    else if (this.phase === 'ko' || this.phase === 'roundEnd') this.drawKo(c);
    if (this.phase === 'matchEnd') this.drawEnd(c);
    if (this.paused) this.drawPause(c);
  };
  P.drawImpact = function (c) {
    var im = this.impact, n = im.big ? 14 : 9, k = 1 - im.t / 8, i, a, r0 = 18 + k * 30, r1 = r0 + (im.big ? 90 : 52) * (1 - k * .5);
    c.save(); c.translate(im.x - this.camX, im.y); c.strokeStyle = 'rgba(255,255,255,' + (.85 * (1 - k)) + ')'; c.lineCap = 'round';
    for (i = 0; i < n; i++) { a = i / n * 6.283 + (i % 2) * .12; c.lineWidth = im.big ? 4 : 2.5; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke(); }
    c.restore();
  };
  P.drawShadow = function (c, f) {
    var k = clamp(1 - f.y / 260, .25, 1), x = f.x - this.camX; c.fillStyle = 'rgba(0,0,0,' + .32 * k + ')'; c.beginPath(); c.ellipse(x, GROUND + 2, 40 * f.sc * k, 8 * k, 0, 0, 6.3); c.fill();
  };
  P.drawFighter = function (c, pen, f) {
    var x = f.x - this.camX + (f.hitFlash > 0 ? (this.t % 2 ? 2 : -2) : 0);
    if (f.ultTag) this.drawUltBack(c, f, x);
    f.draw(pen, x, GROUND);
    if (f.maskFlash > 0) { c.strokeStyle = 'rgba(255,200,80,' + f.maskFlash / 30 + ')'; c.lineWidth = 4; c.beginPath(); c.arc(x, GROUND - f.y - 90, 60 + (30 - f.maskFlash) * 2, 0, 6.3); c.stroke(); }
    if (f.buff) { c.fillStyle = 'rgba(255,170,60,.9)'; c.font = '900 14px ' + UI.FONT; c.textAlign = 'center'; c.fillText('增傷', x, GROUND - f.y - 200 * f.sc); }
    if (f.crushed && f.state === 'hurt') { c.save(); c.fillStyle = '#ffe27a'; c.font = '900 22px ' + UI.FONT; c.textAlign = 'center'; for (var q = 0; q < 3; q++) { var an = this.t * .12 + q * 2.094; c.fillText('★', x + Math.cos(an) * 34, GROUND - f.y - 190 * f.sc + Math.sin(an) * 9); } c.restore(); }
    if (f.exFlash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; var ek = f.exFlash / 24, g2 = c.createRadialGradient(x, GROUND - f.y - 90, 10, x, GROUND - f.y - 90, 110); g2.addColorStop(0, 'rgba(200,140,255,' + ek * .55 + ')'); g2.addColorStop(1, 'rgba(200,140,255,0)'); c.fillStyle = g2; c.fillRect(x - 120, GROUND - f.y - 210, 240, 240); c.restore(); }
    if (f.ultTag) this.drawUltFront(c, f, x);
  };
  P.drawProjs = function (c, pen) {
    var i, p, cx = this.camX, hex = G.cssColor;
    for (i = 0; i < this.projs.length; i++) {
      p = this.projs[i]; var x = p.x - cx, y = GROUND - p.y, sp = p.sp, col = sp.color, fa = p.face; c.save(); c.translate(x, y);
      var glow = c.createRadialGradient(0, 0, 2, 0, 0, Math.max(p.w, p.h) * .9); glow.addColorStop(0, hex(col, .55)); glow.addColorStop(1, hex(col, 0)); c.fillStyle = glow; c.fillRect(-p.w, -p.h, p.w * 2, p.h * 2);
      switch (p.kind) {
        case 'beam': { var w = p.w, h = p.h * (1 - Math.abs(Math.sin(p.t * .3)) * .15), x0 = fa > 0 ? 0 : -w, gg = c.createLinearGradient(0, -h / 2, 0, h / 2); c.restore(); c.save(); c.translate(x, y); gg.addColorStop(0, hex(col, 0)); gg.addColorStop(.3, hex(col, .9)); gg.addColorStop(.5, '#fff'); gg.addColorStop(.7, hex(col, .9)); gg.addColorStop(1, hex(col, 0)); c.fillStyle = gg; c.fillRect(x0, -h / 2, w, h); for (var k = 0; k < 14; k++) { c.fillStyle = '#2a1a14'; c.beginPath(); c.arc((fa > 0 ? 1 : -1) * ((p.t * 22 + k * 40) % w), Math.sin(k * 2 + p.t * .4) * h * .3, 7, 0, 6.3); c.fill(); } break; }
        case 'flag': c.scale(fa, 1); c.fillStyle = '#240606'; c.beginPath(); c.moveTo(-26, -22); c.lineTo(22, -10); c.lineTo(22, 12); c.lineTo(-26, 24); c.fill(); c.fillStyle = '#ff4a38'; c.beginPath(); c.moveTo(-22, -17); c.lineTo(18, -7); c.lineTo(18, 8); c.lineTo(-22, 19); c.fill(); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(-2, 1, 8, 0, 6.3); c.fill(); for (var q = 0; q < 3; q++) { c.fillStyle = hex(0xffb090, .5 - q * .15); c.fillRect(-30 - q * 14, -10 + q * 3, 14, 14 - q * 3); } break;
        case 'oil': c.fillStyle = '#ff9a2a'; c.beginPath(); c.arc(0, 0, 14, 0, 6.3); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(-3, -3, 7, 0, 6.3); c.fill(); c.fillStyle = '#ff5a1a'; c.beginPath(); c.moveTo(-8, -10); c.lineTo(0, -26 - Math.sin(p.t) * 4); c.lineTo(8, -10); c.fill(); break;
        case 'fire': for (var f = -2; f <= 2; f++) { var hh = 24 + Math.sin(p.t * .6 + f) * 8; c.fillStyle = '#ff5a1a'; c.beginPath(); c.moveTo(f * 14 - 9, 20); c.lineTo(f * 14, 20 - hh * 1.5); c.lineTo(f * 14 + 9, 20); c.fill(); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(f * 14 - 5, 20); c.lineTo(f * 14, 20 - hh); c.lineTo(f * 14 + 5, 20); c.fill(); } break;
        case 'bucket': c.fillStyle = '#2a0d08'; c.fillRect(-26, -26, 52, 52); c.fillStyle = '#d8352a'; c.fillRect(-23, -23, 46, 46); c.fillStyle = '#fff'; for (var s = -20; s < 22; s += 14) c.fillRect(s, -23, 7, 46); c.fillStyle = '#ffc23a'; c.beginPath(); c.arc(0, -28, 16, Math.PI, 0); c.fill(); break;
        case 'boom': { var k2 = p.t / 14; c.fillStyle = hex(0xffe27a, 1 - k2); c.beginPath(); c.arc(0, 0, 20 + k2 * 80, 0, 6.3); c.fill(); c.strokeStyle = hex(0xff7a20, 1 - k2); c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 30 + k2 * 70, 0, 6.3); c.stroke(); break; }
        case 'helmet': c.rotate(p.rot); c.fillStyle = '#240c04'; c.beginPath(); c.arc(0, 0, 21, Math.PI, 0); c.lineTo(21, 8); c.lineTo(-21, 8); c.fill(); c.fillStyle = '#ff9c1a'; c.beginPath(); c.arc(0, 0, 18, Math.PI, 0); c.lineTo(18, 5); c.lineTo(-18, 5); c.fill(); c.fillStyle = '#fff'; c.fillRect(-18, -4, 36, 4); break;
        case 'pearl': c.fillStyle = '#e8c8a0'; c.beginPath(); c.arc(0, 0, 15, 0, 6.3); c.fill(); c.fillStyle = '#2a1a14'; c.beginPath(); c.arc(0, 0, 12, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(-4, -4, 3.5, 0, 6.3); c.fill(); break;
        case 'cup': c.rotate(p.rot); c.fillStyle = '#2a1a14'; c.beginPath(); c.moveTo(-17, -20); c.lineTo(17, -20); c.lineTo(12, 22); c.lineTo(-12, 22); c.fill(); c.fillStyle = '#e8c8a0'; c.beginPath(); c.moveTo(-14, -17); c.lineTo(14, -17); c.lineTo(10, 19); c.lineTo(-10, 19); c.fill(); c.fillStyle = '#fff'; c.fillRect(-14, -20, 28, 5); break;
        case 'sleeve': { var o = p.owner, ox = o.x - cx - x, oy = GROUND - o.y - 120 * o.sc - y; c.strokeStyle = '#6a5a8a'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(ox, oy); c.quadraticCurveTo(ox / 2, oy / 2 + 20 + Math.sin(p.t) * 8, 0, 0); c.stroke(); c.strokeStyle = '#f6f0ff'; c.lineWidth = 17; c.beginPath(); c.moveTo(ox, oy); c.quadraticCurveTo(ox / 2, oy / 2 + 20 + Math.sin(p.t) * 8, 0, 0); c.stroke(); c.strokeStyle = '#e8a0c8'; c.lineWidth = 3; c.stroke(); break; }
        case 'brief': c.rotate(p.rot); c.fillStyle = '#240c04'; c.fillRect(-23, -17, 46, 34); c.fillStyle = '#7a4a2a'; c.fillRect(-20, -14, 40, 28); c.fillStyle = '#ffd24a'; c.fillRect(-4, -4, 8, 8); c.strokeStyle = '#240c04'; c.lineWidth = 4; c.strokeRect(-9, -22, 18, 6); break;
        case 'paper': c.rotate(p.rot * .6); c.fillStyle = '#0a2a14'; c.fillRect(-22, -19, 44, 38); c.fillStyle = '#2a8a4a'; c.fillRect(-19, -16, 38, 32); c.fillStyle = '#f2f2e6'; c.fillRect(-12, -8, 24, 4); c.fillRect(-12, 1, 18, 4); break;
        default: c.fillStyle = hex(col); c.beginPath(); c.arc(0, 0, p.w / 2, 0, 6.3); c.fill();
      }
      c.restore();
    }
  };
  /* ---- 大招特效 ---- */
  P.drawUltBack = function (c, f, x) {
    var tag = f.ultTag, y = GROUND - f.y, t = f.ultT, fa = f.face, i;
    if (tag === 'dragon') { for (i = 0; i < 3; i++) { c.strokeStyle = i === 1 ? 'rgba(255,214,90,.8)' : 'rgba(255,60,40,.7)'; c.lineWidth = 16 - i * 4; c.beginPath(); for (var s = 0; s < 14; s++) c.lineTo(x - fa * s * 22, y - 100 + Math.sin(s * .8 + t * .4 + i * 2) * 26); c.stroke(); } }
    else if (tag === 'scooter') { c.fillStyle = '#10141c'; c.beginPath(); c.arc(x - fa * 34, y - 12, 18, 0, 6.3); c.arc(x + fa * 34, y - 12, 18, 0, 6.3); c.fill(); c.fillStyle = '#ff9c1a'; c.fillRect(Math.min(x - 40, x + 40), y - 38, 80, 16); c.fillStyle = 'rgba(255,255,255,.5)'; for (i = 0; i < 4; i++) c.fillRect(x - fa * (50 + i * 24), y - 30 + i * 6, 30, 3); }
    else if (tag === 'neon') { ['#ff4fa0', '#3af0d0', '#f4ee3a'].forEach(function (col, k) { c.strokeStyle = col; c.globalAlpha = .6; c.lineWidth = 6; c.beginPath(); for (var s = 0; s < 10; s++) c.lineTo(x - fa * s * 20, y - 80 + Math.sin(s * .9 + t * .5 + k * 2) * 28 + k * 18); c.stroke(); }); c.globalAlpha = 1; }
    else if (tag === 'decree') { for (i = 0; i < 18; i++) { var px = x + fa * ((t * 18 + i * 61) % 900), py = y - 220 + ((i * 53) % 220) + Math.sin(t * .3 + i) * 12; c.fillStyle = 'rgba(244,244,230,.9)'; c.fillRect(px, py, 22, 28); c.fillStyle = '#2a8a4a'; c.fillRect(px + 3, py + 5, 14, 3); c.fillRect(px + 3, py + 12, 10, 3); } }
  };
  P.drawUltFront = function (c, f, x) {
    var tag = f.ultTag, y = GROUND - f.y, t = f.ultT, i;
    if (tag === 'taiji') { var r = 40 + Math.min(t, 20) * 6; c.save(); c.translate(x, y - 90); c.rotate(t * .12); c.globalAlpha = .75; c.fillStyle = '#f4f4ee'; c.beginPath(); c.arc(0, 0, r, 0, 6.3); c.fill(); c.fillStyle = '#16161e'; c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); c.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); c.arc(0, -r / 2, r / 2, Math.PI / 2, 3 * Math.PI / 2); c.fill(); c.fillStyle = '#f4f4ee'; c.beginPath(); c.arc(0, -r / 2, r / 7, 0, 6.3); c.fill(); c.fillStyle = '#16161e'; c.beginPath(); c.arc(0, r / 2, r / 7, 0, 6.3); c.fill(); c.restore(); }
    else if (tag === 'sing') { for (i = 0; i < 4; i++) { var k = ((t * 3 + i * 25) % 100) / 100; c.strokeStyle = 'rgba(255,170,240,' + (1 - k) + ')'; c.lineWidth = 8 * (1 - k) + 1; c.beginPath(); c.arc(x, y - 100, 30 + k * 420, -.6, .6); c.stroke(); c.beginPath(); c.arc(x, y - 100, 30 + k * 420, Math.PI - .6, Math.PI + .6); c.stroke(); } c.fillStyle = '#ffd0f0'; c.font = '900 34px ' + UI.FONT; c.textAlign = 'center'; for (i = 0; i < 6; i++) c.fillText(i % 2 ? '♪' : '♫', x + f.face * (60 + ((t * 9 + i * 70) % 380)), y - 150 + Math.sin(t * .2 + i) * 40); }
    else if (tag === 'overtime') { c.save(); c.translate(x, y - 100); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 70, 0, 6.3); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * .5) * 52, Math.sin(t * .5) * 52); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * .12) * 34, Math.sin(t * .12) * 34); c.stroke(); c.restore(); }
  };
  P.drawUlt = function (c, pen) {
    var u = this.ult, f = u.f, k = 1 - this.freeze / 56, ch = f.ch, side = f.side, i, hex = G.cssColor, col = ch.color;
    c.fillStyle = 'rgba(4,2,14,.78)'; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W / 2, H / 2); for (i = 0; i < 46; i++) { var a = i / 46 * 6.283 + k * .2; c.strokeStyle = hex(col, .3 + (i % 3) * .1); c.lineWidth = 2 + (i % 4); c.beginPath(); c.moveTo(Math.cos(a) * 120, Math.sin(a) * 120); c.lineTo(Math.cos(a) * 760, Math.sin(a) * 760); c.stroke(); } c.restore();
    var sl = Math.min(1, k * 4), bx = (side === 0 ? -1 : 1) * (1 - sl) * 600;
    c.save(); c.translate(bx, 0); var g = c.createLinearGradient(0, 150, 0, 390); g.addColorStop(0, hex(col, .0)); g.addColorStop(.2, hex(col, .8)); g.addColorStop(.8, hex(col, .8)); g.addColorStop(1, hex(col, 0)); c.fillStyle = g; c.fillRect(0, 150, W, 240);
    c.save(); c.beginPath(); c.rect(0, 120, W, 300); c.clip(); if (!G.Sprites.drawChar(c, ch, 'cast1', side === 0 ? 250 : W - 250, 410, side === 0 ? 1 : -1, 1.5 * (ch.scale || 1))) { var J = R.solve(ch.look, R.POSE.cast1, side === 0 ? 250 : W - 250, 400, side === 0 ? 1 : -1, 2.0 * (ch.scale || 1)); R.draw(pen, J, ch.look, 'ult'); } c.restore();
    Brush.text(c, u.mv.name, side === 0 ? 640 : 320, 280, 92 + Math.sin(k * 20) * 3, { style: 'gold', rot: side === 0 ? -.06 : .06 });
    UI.text(c, ch.name + '・必殺', side === 0 ? 640 : 320, 340, 22, '#fff', 'center', { stroke: '#000', weight: 900 });
    c.restore();
  };
  P.drawHud = function (c) {
    var fs = this.fs, i, f, hex = G.cssColor;
    for (i = 0; i < 2; i++) {
      f = fs[i]; var bw = 392, bx = i === 0 ? 34 : W - 34 - bw, by = 22, k = f.hp / f.maxHp, kl = f.hpLag / f.maxHp, ch = f.ch;
      c.save(); c.beginPath(); if (i === 0) { c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw - 14, by + 28); c.lineTo(bx, by + 28); } else { c.moveTo(bx + bw, by); c.lineTo(bx, by); c.lineTo(bx + 14, by + 28); c.lineTo(bx + bw, by + 28); } c.closePath(); c.clip();
      c.fillStyle = 'rgba(8,8,20,.78)'; c.fillRect(bx, by, bw, 28);
      var lagW = bw * kl, hpW = bw * k; c.fillStyle = '#f4f0a0'; if (i === 0) c.fillRect(bx, by, lagW, 28); else c.fillRect(bx + bw - lagW, by, lagW, 28);
      var gr = c.createLinearGradient(0, by, 0, by + 28); var low = k < .3; gr.addColorStop(0, low ? '#ff8a6a' : '#8aff6a'); gr.addColorStop(.5, low ? '#e8321a' : '#2ec84a'); gr.addColorStop(1, low ? '#a01408' : '#168a2e'); c.fillStyle = gr; if (i === 0) c.fillRect(bx, by, hpW, 28); else c.fillRect(bx + bw - hpW, by, hpW, 28);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(bx, by, bw, 8); c.restore();
      c.save(); c.beginPath(); if (i === 0) { c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw - 14, by + 28); c.lineTo(bx, by + 28); } else { c.moveTo(bx + bw, by); c.lineTo(bx, by); c.lineTo(bx + 14, by + 28); c.lineTo(bx + bw, by + 28); } c.closePath(); c.lineWidth = 3; c.strokeStyle = '#e8b84a'; c.stroke(); c.restore();
      UI.text(c, ch.name + (i === 1 && this.mode !== 'vs2p' && !this.train ? ' (CPU)' : this.train && i === 1 ? ' (假人)' : ''), i === 0 ? bx + 6 : bx + bw - 6, by + 44, 20, '#fff', i === 0 ? 'left' : 'right', { stroke: '#000', weight: 900 });
      for (var w = 0; w < this.need; w++) { var wx = i === 0 ? bx + 18 + w * 24 : bx + bw - 18 - w * 24; c.beginPath(); c.arc(wx, by + 70, 8, 0, 6.3); c.fillStyle = w < this.wins[i] ? '#ffd24a' : 'rgba(0,0,0,.5)'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#e8b84a'; c.stroke(); }
      var mw = 220, mx = i === 0 ? bx + 86 : bx + bw - 86 - mw, my = by + 64, mk = f.meter / 100; UI.bar(c, mx, my, mw, 12, mk, mk >= 1 ? '#ffd24a' : '#4ab8ff');
      c.strokeStyle = mk >= 1 ? '#fff' : 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.strokeRect(mx, my, mw, 12);
      if (mk >= 1) { var pu = .6 + .4 * Math.sin(this.t * .25); UI.text(c, 'READY', mx + mw / 2, my + 6.5, 11, 'rgba(60,20,0,' + (.6 + pu * .4) + ')', 'center', { weight: 900 }); } else UI.text(c, '絕', i === 0 ? mx - 14 : mx + mw + 14, my + 6, 16, '#9ac8ff', 'center', { weight: 900 });
      var gx = i === 0 ? bx + bw - 176 : bx + 26, gk = Math.min(1, f.gg / 100); c.fillStyle = 'rgba(8,8,20,.7)'; c.fillRect(gx, by + 38, 150, 6); c.fillStyle = f.crushed ? '#ff4a3a' : gk > .7 ? '#ff8a3a' : '#7ad0ff'; if (i === 0) c.fillRect(gx, by + 38, 150 * gk, 6); else c.fillRect(gx + 150 * (1 - gk), by + 38, 150 * gk, 6); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; c.strokeRect(gx, by + 38, 150, 6);
      if (gk > .7 && this.t % 16 < 8) UI.text(c, '防禦危險', i === 0 ? gx - 6 : gx + 156, by + 41.5, 11, '#ff8a3a', i === 0 ? 'right' : 'left', { weight: 900 });
      var tk = [30, 60, 90]; c.fillStyle = 'rgba(255,255,255,.55)'; for (var tq = 0; tq < 2; tq++) c.fillRect(mx + mw * (tq + 1) / 3 - .5, my, 1.5, 12);
      if (f.meter >= 30 && f.meter < 100 && this.t % 40 < 28) UI.text(c, 'EX', i === 0 ? mx + mw + 14 : mx - 14, my + 6, 13, '#d8a8ff', 'center', { weight: 900 });
      var cb = this.combos[i]; if (cb.n >= 2 && cb.t > 0) { var al = Math.min(1, cb.t / 30), cx = i === 0 ? 24 : W - 24, sc = 1 + Math.max(0, cb.t - 82) * .05; c.save(); c.globalAlpha = al; UI.text(c, cb.n + '', cx + (i === 0 ? 0 : 0), 190, 64 * sc, '#ffd24a', i === 0 ? 'left' : 'right', { weight: 900, stroke: '#2a0d08', sw: 7 }); UI.text(c, '連擊', cx, 238, 24, '#fff', i === 0 ? 'left' : 'right', { weight: 900, stroke: '#2a0d08' }); UI.text(c, cb.dmg + ' 傷害', cx, 266, 20, '#ffe8a0', i === 0 ? 'left' : 'right', { weight: 800, stroke: '#2a0d08' }); c.restore(); }
    }
    var tm = this.train ? '∞' : Math.max(0, Math.ceil(this.timer / 60)) + ''; c.beginPath(); c.arc(W / 2, 46, 34, 0, 6.3); c.fillStyle = 'rgba(8,8,20,.85)'; c.fill(); c.lineWidth = 4; c.strokeStyle = this.timer > 0 && this.timer < 600 && !this.train && (this.t % 30 < 15) ? '#ff6a4a' : '#e8b84a'; c.stroke();
    UI.text(c, tm, W / 2, 48, this.train ? 34 : 34, '#fff', 'center', { weight: 900, stroke: '#000' });
    if (this.train) this.drawTrainHud(c);
    if (!this.paused && this.phase !== 'matchEnd') { c.beginPath(); c.arc(922, 142, 22, 0, 6.3); c.fillStyle = 'rgba(8,8,20,.6)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(232,184,74,.8)'; c.stroke(); c.fillStyle = '#ffe8a0'; c.fillRect(914, 132, 5, 20); c.fillRect(925, 132, 5, 20); }
  };
  P.drawTrainHud = function (c) {
    UI.text(c, '訓練場　假人：' + TrainDummy.modes[this.dummyMode], 480, 112, 18, '#ffe8a0', 'center', { stroke: '#000', weight: 800 });
    UI.text(c, '最後傷害 ' + this.lastDmg + '　最大連擊 ' + this.maxCombo, 480, 136, 16, '#cdd3ee', 'center', { stroke: '#000' });
    for (var i = 0; i < this.hist.length; i++) { var h = this.hist[this.hist.length - 1 - i]; UI.text(c, h.s, 40, 300 + i * 22, 18, 'rgba(255,255,255,' + (1 - i * .1) + ')', 'left', { stroke: '#000', weight: 800 }); }
  };
  P.drawIntro = function (c) {
    var t = this.pt;
    if (t > 20 && t < 100) { var k = Math.min(1, (t - 20) / 8), a = t > 85 ? (100 - t) / 15 : 1; Brush.text(c, this.train ? '訓練場' : '第' + ['', '一', '二', '三', '四', '五'][this.round] + '回合', W / 2, 250, 90, { style: 'gold', scale: 2 - k, alpha: a * k }); if (!this.train) UI.text(c, this.stage.name + '・' + this.stage.place, W / 2, 316, 24, '#fff', 'center', { stroke: '#000', weight: 800 }); }
    if (t >= 118 && t < 150) { var k2 = Math.min(1, (t - 118) / 5); Brush.text(c, '開打！', W / 2, 260, 130, { style: 'red', scale: 1.8 - .8 * k2, alpha: t > 140 ? (150 - t) / 10 : 1 }); }
  };
  P.drawKo = function (c) {
    var k = Math.min(1, this.koT / 10);
    if (this.koT < 150 && (this.why === 'ko' || this.why === 'time')) Brush.text(c, this.why === 'ko' ? '一擊必殺' : '時間到', W / 2, 250, this.why === 'ko' ? 100 : 100, { style: 'red', scale: 2.2 - 1.2 * k, alpha: k });
    if (this.phase === 'roundEnd') { var w = this.winner, s = w < 0 ? '平手' : this.fs[w].ch.name + ' 勝利'; var a2 = Math.min(1, this.overT / 12); Brush.text(c, s, W / 2, 230, 84, { style: 'gold', alpha: a2, scale: 1 + (1 - a2) * .5 }); if (w >= 0 && this.wins[w] >= this.need) UI.text(c, '「' + this.fs[w].ch.lines.win + '」', W / 2, 300, 24, '#fff', 'center', { stroke: '#000', weight: 800 }); }
  };
  P.drawEnd = function (c) {
    var r = this.result, k = Math.min(1, this.overT / 20), w = r.winner, o = this.o; c.fillStyle = 'rgba(4,4,16,' + .72 * k + ')'; c.fillRect(0, 0, W, H);
    var title = o.mode === 'arcade' ? (w === 0 ? (o.last ? '街機通關！' : '勝利') : '挑戰失敗') : this.fs[w].ch.name + ' 獲勝';
    Brush.text(c, title, W / 2, 130, 92, { style: w === 0 || o.mode !== 'arcade' ? 'gold' : 'red', alpha: k });
    var f = this.fs[w]; var pen = new CanvasPen(c); if (!G.Sprites.drawChar(c, f, 'win', 160, 300, 1, 1.5 * f.sc)) { var J = R.solve(f.look, R.POSE.win2, 160, 300, 1, 1.5 * f.sc); R.draw(pen, J, f.look, 'win'); } var L2 = this.fs[1 - w]; if (!G.Sprites.drawChar(c, L2, 'lose', 800, 300, -1, 1.2 * L2.sc)) { var J2 = R.solve(L2.look, R.POSE.lose, 800, 300, -1, 1.2 * L2.sc); R.draw(pen, J2, L2.look, 'hurt'); }
    UI.text(c, '「' + f.ch.lines.win + '」', W / 2, 205, 24, '#fff', 'center', { stroke: '#000', weight: 800 });
    UI.text(c, '最大連擊 ' + r.maxCombo + '　　回合 ' + r.wins[0] + ' : ' + r.wins[1], W / 2, 250, 20, '#ffe8a0', 'center', { stroke: '#000', weight: 800 });
    if (this.endList) UI.drawList(c, this.endList, this.t / 60);
  };
  P.drawPause = function (c) {
    var p = this.paused, t = this.t / 60; c.fillStyle = 'rgba(4,4,16,.7)'; c.fillRect(0, 0, W, H);
    if (p.view === 'moves') { this.drawMoves(c, this.fs[p.who]); return; }
    if (p.view === 'main') { UI.panel(c, 270, 90, 420, 100 + p.list.items.length * 46 + 20, { title: '暫停' }); UI.drawList(c, p.list, t); }
    else { UI.panel(c, 180, 30, 600, 440, { title: '設定' }); UI.drawList(c, p.list, t); }
  };
  P.drawMoves = function (c, f) { UI.drawMoves(c, f.ch, 100, 30, 760); UI.text(c, '◀ ▶ 切換角色　確定 / 返回', W / 2, 512, 16, '#aab2d8', 'center'); };
  G.FightScene = FightScene;
})(window);
