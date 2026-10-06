/* Fighter — 單一格鬥角色：物理、狀態機、指令辨識（含簡易模式）、招式時間軸執行、受擊 / 格擋 / 擊飛。
 * 座標：x 為世界水平位置，y 為離地高度（0=站在地上、向上為正）；face=+1 面向右、-1 面向左。
 * 逐幀 update(inp, opp, scene)：inp 為 FightInput.poll() 或 AI 產生的同格式物件。 */
(function (G) {
  'use strict';
  var GRAV = .85, M = G.Moves, R = G.Rig, POSE = R.POSE;
  var CTRL = { idle: 1, walk: 1, crouch: 1, block: 1 };            // 可自由行動的地面狀態
  var FWD = { 3: 1, 6: 1, 9: 1 }, BACK = { 1: 1, 4: 1, 7: 1 };

  function tokenize(c) { return c.split(''); }
  function match(t, d) {
    switch (t) { case '2': return d === 1 || d === 2 || d === 3; case '6': return !!FWD[d]; case '4': return !!BACK[d]; case '8': return d === 7 || d === 8 || d === 9; case 'x': return !FWD[d]; default: return d === +t; }
  }
  function Fighter(ch, side, ctrl) {
    this.ch = ch; this.look = ch.look; this.id = ch.id; this.side = side; this.ctrl = ctrl || 'p1'; this.sc = ch.scale || 1;
    this.maxHp = ch.hp; this.hist = []; this.reset(side);
  }
  var FP = Fighter.prototype;
  FP.reset = function (side) {
    this.x = side === 0 ? 560 : 940; this.y = 0; this.vx = 0; this.vy = 0; this.kbv = 0; this.face = side === 0 ? 1 : -1;
    this.hp = this.maxHp; this.state = 'idle'; this.st = 0; this.pose = R.lerpPose(POSE.idleA, POSE.idleA, 0); this.pt = 0; this.wp = 0;
    this.move = null; this.mi = 0; this.mf = 0; this.pn = 1; this.hitDone = false; this.rehitT = 0; this.hitConfirmed = false; this.grabOK = false; this.grabDone = false; this.chainN = 0;
    this.inv = false; this.reflect = false; this.buff = null; this.frame = 0; this.hist.length = 0; this.hist.push({ d: 5, f: 0 }); this.chg = 0; this.chgG = 0;
    this.buf = { p: 0, k: 0, j: 0, s1: 0, s2: 0, s3: 0 }; this.pf = { p: -99, k: -99 }; this.combo = 0; this.comboDmg = 0; this.airUsed = false; this.expr = 'n';
    this.hurtLvl = 'h'; this.blocking = false; this.crouching = false; this.dead = false; this.lastHit = null; this.curDir = 5; this.meterFlash = 0; this.hitFlash = 0; this.stun = 0;
    this.holder = null; this.holdSpec = null; this.speak = 0;
    if (this.meter == null) this.meter = 0;
  };
  FP.rel = function (inp) { var f = ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * this.face, v = inp.d ? -1 : inp.u ? 1 : 0; return { f: f, v: v }; };
  FP.dirNum = function (inp) {
    var r = this.rel(inp), f = r.f, v = r.v;
    return v < 0 ? (f > 0 ? 3 : f < 0 ? 1 : 2) : v > 0 ? (f > 0 ? 9 : f < 0 ? 7 : 8) : (f > 0 ? 6 : f < 0 ? 4 : 5);
  };
  FP.cmd = function (c) {
    var easy = G.FSettings && FSettings.get('easy'), win = easy ? 26 : 16, rec = easy ? 16 : 10, now = this.frame, H = this.hist, n = H.length;
    if (c === 'c46') return this.chg >= (easy ? 20 : 28) && !!FWD[this.curDir];
    var toks = c === '66' ? ['6', 'x', '6'] : tokenize(c), i = toks.length - 1, j, e, end, lastEnd = -1, opt;
    for (j = n - 1; j >= 0 && i >= 0; j--) {
      e = H[j]; end = j === n - 1 ? now : H[j + 1].f; if (now - end > win) break;
      while (i >= 0 && (opt = (toks[i] === '3' || toks[i] === '1' || toks[i] === '7' || toks[i] === '9') && i > 0 && i < toks.length - 1) && !match(toks[i], e.d)) i--;
      if (i >= 0 && match(toks[i], e.d)) { if (i === toks.length - 1) lastEnd = end; i--; }
    }
    return i < 0 && now - lastEnd <= rec;
  };
  FP.want = function (k) { return this.buf[k] > 0; };
  FP.eat = function (k) { this.buf[k] = 0; };
  FP.can = function () { return !!CTRL[this.state]; };
  FP.box = function (b) {                                          // 角色空間 [x0,x1,y0,y1] → 世界 {x0,x1,y0,y1}
    var a = this.x + this.face * b[0] * this.sc, c = this.x + this.face * b[1] * this.sc;
    return { x0: Math.min(a, c), x1: Math.max(a, c), y0: this.y + b[2] * this.sc, y1: this.y + b[3] * this.sc };
  };
  FP.hurtbox = function () {
    var s = this.sc, st = this.state;
    if (st === 'down' || st === 'getup' || st === 'grabbed') return null;
    if (st === 'launched') return { x0: this.x - 30 * s, x1: this.x + 30 * s, y0: this.y, y1: this.y + 90 * s };
    var crouch = this.crouching && this.y <= 0;
    if (this.y > 0) return { x0: this.x - 22 * s, x1: this.x + 22 * s, y0: this.y + 10 * s, y1: this.y + 150 * s };
    return { x0: this.x - 22 * s, x1: this.x + 22 * s, y0: 0, y1: (crouch ? 98 : 168) * s };
  };
  FP.phase = function () { return this.move ? this.move.phases[this.mi] : null; };
  FP.activeHit = function () {
    if (this.state !== 'attack' || !this.move) return null; var ph = this.phase(); if (!ph || !ph.hit) return null;
    if (this.hitDone && !(ph.hit.rehit && this.rehitT <= 0)) return null;
    return { h: ph.hit, b: this.box(ph.hit.box) };
  };
  FP.activeGrab = function () {
    if (this.state !== 'attack' || !this.move) return null; var ph = this.phase(); if (!ph || !ph.grab || this.grabDone) return null;
    return { g: ph.grab, b: this.box(ph.grab.box) };
  };
  FP.hitLanded = function (blocked) {
    var ph = this.phase(); this.hitDone = true; this.rehitT = ph && ph.hit ? ph.hit.rehit || 0 : 0; this.hitConfirmed = true;
    if (ph && ph.hit && ph.hit.rehit === 1) this.hitDone = true;
  };

  /* ---------- 招式 ---------- */
  FP.startMove = function (mv, normal) {
    this.move = mv; this.mi = -1; this.state = 'attack'; this.hitConfirmed = false; this.grabOK = false; this.isNormal = !!normal; this.crouching = !!mv.crouch;
    if (!normal && mv.cmd && this.ch.id) { this.speak = 0; }
    if (mv.air && this.y <= 0) this.y = 0;
    this._next();
  };
  FP.startSpecial = function (n, scene) {
    var mv = M.special(this.id, n); if (!mv) return false;
    if (n === 3) { if (this.meter < 100) return false; this.meter = 0; this.meterFlash = 20; scene && scene.onUltStart && scene.onUltStart(this, mv); }
    this.startMove(mv, false); return true;
  };
  FP._next = function () {                                         // 進入下一個可執行的 phase
    var phs = this.move.phases, ph;
    for (;;) {
      this.mi++; if (this.mi >= phs.length) { this._endMove(); return; }
      ph = phs[this.mi]; if ((ph.ifGrab && !this.grabOK) || (ph.ifWhiff && this.grabOK)) continue; break;
    }
    this.mf = 0; this.hitDone = false; this.rehitT = 0; this.grabDone = false; this.pn = Math.max(1, Math.round(ph.n * (this.isNormal ? (this.ch.spdMul || 1) : 1)));
    this.inv = !!ph.inv; this.reflect = !!ph.reflect; this.counter = ph.counter || null;
    if (ph.sfx) G.FxAudio.play(ph.sfx);
    if (ph.voice) G.FxAudio.grunt(this.ch.tts.pitch, ph.voice);
    if (ph.vy != null) this.vy = ph.vy; if (ph.vyd != null) this.vy = ph.vyd;
    if (ph.vx != null) this.vx = ph.vx * this.face; else if (!this.move.flying) this.vx = 0;
    if (ph.buff) { this.buff = { dmg: ph.buff.dmg, t: ph.buff.t }; this.maskFlash = 30; }
    if (ph.spawn) this.scene.spawn(this, ph.spawn);
    if (ph.ult) this.scene.ultFx(this, ph.ult);
    if (ph.release) this.scene.release(this, ph.release);
    this.expr = this.move.ult || ph.ult ? 'ult' : 'atk';
  };
  FP._endMove = function () {
    this.move = null; this.inv = false; this.reflect = false; this.counter = null; this.expr = 'n'; this.chainN = 0;
    if (this.holder) this.holder = null;
    this.state = this.y > 0 ? 'air' : 'idle'; if (this.y <= 0) this.vx = 0;
    if (this.heldOpp) { this.heldOpp.state = 'launched'; this.heldOpp = null; }
  };

  /* ---------- 受擊 ---------- */
  FP.canGuard = function (h, from) {
    if (!CTRL[this.state] && this.state !== 'blockstun') return false; if (this.y > 0) return false;
    var back = this.holdBack; if (!back) return false; var low = this.holdDown;
    if (h.lvl === 'l') return low; if (h.lvl === 'h') return !low; return true;
  };
  FP.takeHit = function (att, h, isProj) {
    var res = { hit: false, blocked: false, dmg: 0, counter: false };
    if (this.inv || this.state === 'down' || this.state === 'getup' || this.state === 'grabbed' || this.dead) return res;
    var ph = this.phase();
    if (this.state === 'attack' && this.counter && !isProj) { res.counter = true; this._doCounter(att, this.counter); return res; }
    var sc = this.scene, guard = this.canGuard(h);
    if (guard) {
      res.hit = true; res.blocked = true; this.state = 'blockstun'; this.st = h.bs || 10; this.blocking = true;
      var chip = (isProj || h.dmg >= 60) ? Math.round(h.dmg * .09 * (att.ch.dmg || 1)) : 0; if (this.hp - chip < 1) chip = Math.max(0, this.hp - 1); this.hp -= chip; res.dmg = chip;
      this.kbv = -att.face * Math.min(9, (h.kb || 4) * .8 + 2); this.meter = Math.min(100, this.meter + h.dmg * .04); att.meter = Math.min(100, att.meter + h.dmg * .05);
      if (h.pull) res.hit = true;
      return res;
    }
    var scale = Math.max(.35, 1 - (att.combo) * .1), dmg = Math.round(h.dmg * (att.ch.dmg || 1) * (att.buff ? att.buff.dmg : 1) * scale);
    res.hit = true; res.dmg = dmg; this.hp = Math.max(0, this.hp - dmg); att.combo++; att.comboDmg += dmg; this.hitFlash = 6;
    att.meter = Math.min(100, att.meter + dmg * .13); this.meter = Math.min(100, this.meter + dmg * .1); this.lastHit = h;
    var wasAir = this.y > 0 || this.state === 'launched';
    if (this.move) { this.move = null; this.inv = false; this.reflect = false; this.counter = null; }
    this.hurtLvl = h.lvl === 'l' ? 'l' : 'h'; this.expr = 'hurtH'; this.crouching = false; this.landing = false;
    if (this.hp <= 0) { this.ko(att, h); res.ko = true; return res; }
    if (h.kd || wasAir) {
      var L = h.launch || [h.kb || 4, wasAir ? 5 : 7]; this.state = 'launched'; this.vx = att.face * L[0]; this.vy = L[1]; this.kbv = 0; if (this.y <= 0) this.y = 1; res.launch = true;
    } else { this.state = 'hurt'; this.st = h.hs || 16; this.kbv = att.face * (h.kb || 4); this.vx = 0; }
    if (h.pull) { this.x = att.x + att.face * h.pull * att.sc; this.kbv = 0; this.state = 'hurt'; this.st = h.hs || 20; }
    this.stun = this.st;
    G.FxAudio.grunt(this.ch.tts.pitch, 'hurt');
    return res;
  };
  FP.ko = function (att, h) {
    this.dead = true; this.state = 'launched'; this.vx = att.face * ((h.launch && h.launch[0]) || 6); this.vy = (h.launch && h.launch[1]) || 8; this.kbv = 0; this.move = null; this.expr = 'ko'; if (this.y <= 0) this.y = 1;
  };
  FP._doCounter = function (att, spec) {
    var sc = this.scene; this.hitConfirmed = true; this.counter = null; this.hitFlash = 4;
    sc.counterFx && sc.counterFx(this, att);
    att.applyRaw(this, spec); var cp = this.move.counterPhases; if (cp) this.move = { name: this.move.name, phases: cp }; this.mi = -1; this._next();
  };
  FP.applyRaw = function (from, spec) {                           // 不可格擋、無視連段補正的直接傷害（反制、投技）
    this.hp = Math.max(0, this.hp - Math.round(spec.dmg * (from.ch.dmg || 1))); from.meter = Math.min(100, from.meter + spec.dmg * .15); from.combo++; from.comboDmg += spec.dmg;
    this.move = null; this.inv = false; this.reflect = false; this.counter = null; this.crouching = false; this.expr = 'hurtH'; this.hurtLvl = 'h'; this.hitFlash = 6; this.holder = null; this.landing = false;
    if (this.hp <= 0) { this.dead = true; this.expr = 'ko'; }
    this.state = 'launched'; this.vx = from.face * spec.launch[0]; this.vy = spec.launch[1]; this.kbv = 0; if (this.y <= 0) this.y = 1;
    G.FxAudio.play(spec.sfx || 'throw'); G.FxAudio.grunt(this.ch.tts.pitch, this.dead ? 'ko' : 'hurt');
  };
  FP.grabbed = function (by, spec) {
    this.state = 'grabbed'; this.move = null; this.inv = false; this.reflect = false; this.counter = null; this.holder = by; this.crouching = false; this.expr = 'hurtH'; this.vx = 0; this.vy = 0; this.kbv = 0;
  };

  /* ---------- 主更新 ---------- */
  FP.update = function (inp, opp, scene) {
    this.scene = scene; this.frame++; var s = this.state, i, k;
    // 指令歷史 / 蓄力
    var dn = this.dirNum(inp); this.curDir = dn;
    if (this.hist[this.hist.length - 1].d !== dn) { this.hist.push({ d: dn, f: this.frame }); if (this.hist.length > 20) this.hist.shift(); }
    if (BACK[dn]) { this.chg = Math.min(70, this.chg + 1); this.chgG = 0; } else if (this.chg > 0 && ++this.chgG > 12) this.chg = 0;
    for (k in this.buf) { if (this.buf[k] > 0) this.buf[k]--; if (inp['x' + k]) { this.buf[k] = 6; if (k === 'p' || k === 'k') this.pf[k] = this.frame; } }
    var r = this.rel(inp); this.holdBack = r.f < 0; this.holdDown = r.v < 0;
    if (this.buff && --this.buff.t <= 0) this.buff = null;
    if (this.rehitT > 0) this.rehitT--; if (this.meterFlash > 0) this.meterFlash--; if (this.hitFlash > 0) this.hitFlash--; if (this.maskFlash > 0) this.maskFlash--;
    this.pt += 1 / 60;

    // 面向
    if ((CTRL[s] || s === 'air') && !this.move && !this.dead) this.face = opp.x >= this.x ? 1 : -1;

    if (CTRL[s]) this._ground(inp, r, opp);
    else if (s === 'air') this._air(inp, r, opp);
    else if (s === 'attack') this._attack(inp, r, opp);
    else if (s === 'hurt') { if (--this.st <= 0) { this.state = 'idle'; this.expr = 'n'; this.landing = false; } }
    else if (s === 'blockstun') { if (--this.st <= 0) { this.state = 'idle'; this.blocking = false; } }
    else if (s === 'launched') { /* 物理處理在下方 */ }
    else if (s === 'down') { if (!this.dead && --this.st <= 0) { this.state = 'getup'; this.st = 16; } }
    else if (s === 'getup') { if (--this.st <= 0) { this.state = 'idle'; this.expr = 'n'; } }
    else if (s === 'grabbed') { var h = this.holder; if (h && h.move && h.heldPhase) { /* 位置由持有者設定 */ } if (!h || h.state !== 'attack') { this.state = 'launched'; this.holder = null; } }

    // 物理
    var wasAir = this.y > 0;
    if (s !== 'grabbed') {
      var ph = this.phase(), noG = s === 'attack' && ph && ph.nograv;
      if (this.y > 0 || this.vy > 0) { if (!noG) this.vy -= GRAV; this.y += this.vy; }
      this.x += this.vx + this.kbv; this.kbv *= .82; if (Math.abs(this.kbv) < .1) this.kbv = 0;
      if (this.state === 'launched' || this.state === 'air' || this.state === 'attack') { /* 空中水平速度保留 */ }
      if (this.y <= 0 && (wasAir || this.vy < 0)) {
        this.y = 0; var landed = wasAir && this.vy < 0; this.vy = 0;
        if (landed) this._landed();
      }
    }
    var lo = 50, hi = CFG.STAGE_W - 50; if (this.x < lo) { this.x = lo; this.kbv = 0; this.atWall = -1; } else if (this.x > hi) { this.x = hi; this.kbv = 0; this.atWall = 1; } else this.atWall = 0;
    if (s === 'launched' && this.y <= 0) this.vx = 0;
    this._poseUpdate(inp);
  };
  FP._landed = function () {
    var s = this.state;
    if (s === 'launched') { this.state = 'down'; this.st = this.dead ? 9999 : 34; this.vx = 0; G.FxAudio.play('land'); this.scene.landFx && this.scene.landFx(this); }
    else if (s === 'air') { this.state = 'idle'; this.vx = 0; this.airUsed = false; }
    else if (s === 'attack' && this.move) {
      var ph = this.phase();
      if (this.move.flying || this.move.air) { var rec = this.move.landRec || 6; this._endMove(); this.state = 'land'; this.state = 'hurt'; this.st = rec; this.expr = 'n'; this.landing = true; this.vx = 0; }
      else if (ph && ph.untilLand) { this.mf = this.pn; }
    }
  };
  FP._ground = function (inp, r, opp) {
    var ch = this.ch, dn = this.curDir;
    this.crouching = r.v < 0; this.airUsed = false;
    // 招式（優先序：大招 → 小招 → 投 → 普通技）
    if (this._tryActions(inp, r, opp)) return;
    if (r.v > 0 || this.want('j')) { this.eat('j'); this._jump(r); return; }
    if (this.crouching) { this.state = 'crouch'; this.vx = 0; this.blocking = this.holdBack; return; }
    if (r.f !== 0) { this.state = this.holdBack ? 'block' : 'walk'; this.vx = r.f * this.face * (r.f > 0 ? ch.walk : ch.back); this.wp += (r.f > 0 ? 1 : -1) * Math.abs(this.vx) * .075; if (this.holdBack) this.vx *= 1; }
    else { this.state = 'idle'; this.vx = 0; }
    this.blocking = this.holdBack;
  };
  FP._jump = function (r) {
    this.state = 'air'; this.vy = this.ch.jump; this.vx = r.f * this.face * this.ch.walk * 1.25; this.jdir = r.f; this.airUsed = false; this.crouching = false; this.kbv = 0; G.FxAudio.play('whoosh', { gap: .05 });
  };
  FP._air = function (inp, r, opp) {
    if (!this.airUsed) {
      if (this.want('p')) { this.eat('p'); this.airUsed = true; this.startMove(M.NORMAL.apunch, true); return; }
      if (this.want('k')) { this.eat('k'); this.airUsed = true; this.startMove(M.NORMAL.akick, true); return; }
    }
  };
  FP._tryActions = function (inp, r, opp) {
    var i, mv, ids = [3, 1, 2], dist = Math.abs(opp.x - this.x);
    for (i = 0; i < 3; i++) {
      var n = ids[i]; mv = M.special(this.id, n); if (!mv) continue;
      if (this.want('s' + n)) { if (n === 3 && this.meter < 100) { this.eat('s3'); continue; } this.eat('s' + n); if (this.startSpecial(n, this.scene)) return true; }
    }
    for (i = 0; i < 3; i++) {
      n = ids[i]; mv = M.special(this.id, n); if (!mv) continue;
      if (n === 3 && this.meter < 100) continue;
      if (this.want(mv.btn) && this.cmd(mv.cmd)) { this.eat(mv.btn); if (this.startSpecial(n, this.scene)) return true; }
    }
    return this._normals(inp, r, opp, dist);
  };
  FP._normals = function (inp, r, opp, dist) {
    var N = M.NORMAL, wp = this.want('p'), wk = this.want('k');
    if (wp && wk && Math.abs(this.pf.p - this.pf.k) <= 3 && dist < 100 && opp.y <= 0) { this.eat('p'); this.eat('k'); this.startMove(N.throw, true); return true; }
    if (wp) { this.eat('p'); this.startMove(r.v < 0 ? N.cpunch : r.f > 0 ? N.hpunch : N.jab, true); return true; }
    if (wk) { this.eat('k'); this.startMove(r.v < 0 ? N.ckick : r.f > 0 ? N.hkick : N.kick, true); return true; }
    return false;
  };
  FP._attack = function (inp, r, opp) {
    var mv = this.move, ph = mv.phases[this.mi], i, n, m;
    if (!ph) { this._endMove(); return; }
    // 取消：普通技命中 / 被擋後可接必殺技；輕技可連打
    if (this.isNormal && this.hitConfirmed && mv.sc !== undefined) {
      var ids = [3, 1, 2];
      for (i = 0; i < 3; i++) { n = ids[i]; m = M.special(this.id, n); if (!m) continue;
        var go = this.want('s' + n) || (this.want(m.btn) && this.cmd(m.cmd));
        if (go && (n !== 3 || this.meter >= 100)) { this.eat('s' + n); this.eat(m.btn); if (this.startSpecial(n, this.scene)) return; }
      }
      if (mv.chain && this.chainN < 3 && this.mi >= 1 && !mv.air) {
        var N = M.NORMAL, nm = null;
        if (this.want('p')) { this.eat('p'); nm = r.v < 0 ? N.cpunch : N.jab; } else if (this.want('k')) { this.eat('k'); nm = r.v < 0 ? N.ckick : N.kick; }
        if (nm) { var c = this.chainN + 1; this.startMove(nm, true); this.chainN = c; this.hitConfirmed = true; return; }
      }
    }
    // 持有投技對手
    if (this.heldOpp === undefined) this.heldOpp = null;
    if (ph.hold && this.heldOpp) { var o = this.heldOpp, f = this.face; o.x = this.x + f * ph.hold.dx; o.y = ph.hold.y; this.heldPhase = true; }
    if (ph.vx != null) this.vx = ph.vx * this.face;
    if (++this.mf >= this.pn) this._next();
  };
  FP.setHeld = function (opp) { this.heldOpp = opp; this.grabOK = true; this.grabDone = true; };

  /* ---------- 姿勢 ---------- */
  FP._target = function () {
    var s = this.state, t, ph;
    switch (s) {
      case 'idle': t = R.lerpPose(POSE.idleA, POSE.idleB, .5 + Math.sin(this.pt * 3.2) * .5); break;
      case 'walk': t = R.walkPose(this.wp * 2.2, this.vx * this.face >= 0 ? 1 : -1); break;
      case 'block': t = POSE.blockH; break;
      case 'crouch': t = this.holdBack ? POSE.blockL : POSE.crouch; break;
      case 'air': t = this.jdir > 0 ? POSE.jumpF : this.jdir < 0 ? POSE.jumpB : POSE.jump; break;
      case 'blockstun': t = this.holdDown ? POSE.blockL : POSE.blockH; break;
      case 'hurt': t = this.landing ? POSE.crouch : (this.hurtLvl === 'l' ? POSE.hurtL : POSE.hurtH); break;
      case 'launched': t = this.vy > 0 || this.y > 20 ? POSE.air : POSE.air; break;
      case 'down': t = POSE.lie; break;
      case 'getup': t = R.lerpPose(POSE.getup, POSE.idleA, 1 - this.st / 16); break;
      case 'grabbed': t = POSE.grabbed; break;
      case 'intro': t = POSE.intro; break; case 'win': t = this.pt % 1 < .5 ? POSE.win : POSE.win2; break; case 'lose': t = POSE.lose; break;
      case 'attack': ph = this.phase(); t = ph ? this._phasePose(ph) : POSE.idleA; break;
      default: t = POSE.idleA;
    }
    return t;
  };
  FP._phasePose = function (ph) {
    var p = ph.pose, k = Math.min(1, this.mf / Math.max(1, this.pn - 1));
    if (p instanceof Array) return R.lerpPose(POSE[p[0]], POSE[p[1]], k);
    return POSE[p] || POSE.idleA;
  };
  FP._poseUpdate = function (inp) {
    var t = this._target(), s = this.state, k = s === 'attack' ? .8 : s === 'hurt' || s === 'launched' || s === 'blockstun' ? .85 : s === 'down' ? .5 : .38;
    if (s === 'launched' && this.dead) t = this.y > 6 ? POSE.air : POSE.lie;
    this.pose = R.lerpPose(this.pose, t, k);
    if (s === 'idle' || s === 'walk' || s === 'block' || s === 'crouch') this.expr = 'n';
    if (s === 'blockstun') this.expr = 'n';
    if (s === 'win' && this.pt > 0) this.expr = 'win'; if (s === 'lose') this.expr = 'hurt';
    if (s === 'down') this.expr = this.dead ? 'ko' : 'hurt';
  };
  FP.draw = function (pen, sx, gy, alpha) {
    var J = R.solve(this.look, this.pose, sx, gy - this.y, this.face, this.sc);
    if (this.hitFlash > 0 || alpha != null) { /* 受擊閃白由 scene 在外層處理 */ }
    R.draw(pen, J, this.look, this.expr);
    return J;
  };
  G.Fighter = Fighter;
})(window);
