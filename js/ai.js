/* AI — CPU 對手與訓練場假人。產生與 FightInput.poll() 相同格式的輸入物件。
 * 難度 0/1/2：反應延遲、防禦機率、連段與大招使用率逐級提高。
 * 行為依距離分區（遠 / 中 / 近）與角色射程傾向（stats.rng）決定；以「計畫佇列」逐幀播放按鍵。 */
(function (G) {
  'use strict';
  var KEYS = ['l', 'r', 'u', 'd', 'p', 'k', 'j', 's1', 's2', 's3', 'ex'];
  var LV = [{ rt: 22, block: .22, aggr: .5, combo: .25, ult: .25, jump: .08 }, { rt: 12, block: .5, aggr: .75, combo: .55, ult: .55, jump: .14 }, { rt: 5, block: .78, aggr: 1, combo: .85, ult: .85, jump: .2 }];
  function blank() { var o = {}, i; for (i = 0; i < KEYS.length; i++) { o[KEYS[i]] = false; o['x' + KEYS[i]] = false; } return o; }
  function AI(level, fighter) { this.lv = LV[Math.max(0, Math.min(2, level | 0))]; this.f = fighter; this.plan = []; this.cool = 20; this.react = -1; this.seenAtk = null; this.sp = 0; }
  var AP = AI.prototype;
  AP.step = function (keys, n, tap) { this.plan.push({ n: n, keys: keys, tap: tap }); return this; };
  AP.rnd = function () { return Math.random(); };
  AP.spk = function (me, n) { var ex = me.meter >= 30 && me.meter < 100 && this.rnd() < this.lv.ult * .55; return ex ? ['s' + n, 'ex'] : ['s' + n]; };
  AP.think = function (me, opp, scene) {
    var out = blank(), L = this.lv, dx = opp.x - me.x, dist = Math.abs(dx), tow = dx > 0 ? 'r' : 'l', away = dx > 0 ? 'l' : 'r', k, st = me.state;
    if (this.cool > 0) this.cool--;
    if (this.sp > 0) this.sp--;
    // 移動類計畫遇到威脅時中斷，改走防禦反應
    if (this.plan.length && !this.plan[0].tap && (st === 'idle' || st === 'walk' || st === 'block' || st === 'crouch') && this.rnd() < .5) {
      var pk = this.plan[0].keys, mv0 = true, q; for (q = 0; q < pk.length; q++) if (pk[q] === 'p' || pk[q] === 'k' || pk[q][0] === 's') mv0 = false;
      if (mv0 && pk.indexOf('away') < 0 && pk.indexOf(away) < 0 && this.threat(me, opp, scene, dist)) this.plan.length = 0;
    }
    // 播放計畫
    if (this.plan.length) {
      var s = this.plan[0], arr = s.keys;
      for (var i = 0; i < arr.length; i++) { var a = arr[i]; a = a === 'tow' ? tow : a === 'away' ? away : a; out[a] = true; if (s.tap && !s.done) out['x' + a] = true; }
      s.done = true; if (--s.n <= 0) this.plan.shift();
      if (me.state === 'hurt' || me.state === 'launched' || me.state === 'blockstun') { if (me.state !== 'blockstun') this.plan.length = 0; }
      return out;
    }
    if (st === 'blockstun') { out[away] = true; return out; }
    if (!(st === 'idle' || st === 'walk' || st === 'crouch' || st === 'block' || st === 'air')) return out;
    if (st === 'air') { if (me.y > 40 && !me.airUsed && this.rnd() < .12) { out.xk = this.rnd() < .5; out.xp = !out.xk; } return out; }
    if (opp.state === 'win' || opp.state === 'lose' || opp.dead) return out;

    // ---- 防禦反應 ----
    var thr = this.threat(me, opp, scene, dist);
    if (thr) {
      if (this.react < 0) this.react = Math.round(L.rt * (.6 + this.rnd() * .8));
      if (--this.react <= 0) {
        this.react = -1;
        var cm = G.Moves.special(me.id, 2); if (!thr.proj && cm && cm.phases.some(function (q) { return q.counter; }) && this.rnd() < .5 + L.combo * .3) { this.step(['s2'], 1, true); this.cool = 30; return out; }
        if (thr.proj && dist > 190 && this.rnd() < L.jump * 1.4) { this.step(['u', tow], 6, false); this.step([tow, 'k'], 1, true); this.cool = 8; return out; }
        if (this.rnd() < L.block * (me.gg > 75 ? .55 : me.gg > 50 ? .8 : 1)) { var cr = thr.lvl === 'l'; if (thr.proj && thr.eta > 16) this.step([], thr.eta - 12, false); this.step(cr ? [away, 'd'] : [away], thr.hold, false); return out; }
        else if (thr.proj && this.rnd() < L.jump * 2) { this.step(['u', tow], 8, false); return out; }
      }
    } else this.react = -1;
    if (this.cool > 0) { if (dist > 120 && this.rnd() < .5) out[tow] = false; return out; }

    // ---- 攻擊決策 ----
    var ch = me.ch, rng = ch.stats.rng, ranged = rng >= 4, meter = me.meter, W = me.sc, r = this.rnd();
    if (meter >= 100 && this.rnd() < L.ult && (dist < 230 || ranged) && opp.state !== 'launched') { this.step(['s3'], 1, true); this.cool = 40; return out; }
    if (dist > 360) {
      if (ranged && r < .6 * L.aggr + .2) { this.step(this.spk(me, this.rnd() < .5 ? 1 : 2), 1, true); this.cool = 38 + (2 - L.rt / 11) * 4; }
      else if (r < L.jump) { this.step(['u', tow], 30, false); this.cool = 10; }
      else this.step([tow], 18 + (this.rnd() * 20 | 0), false);
    } else if (dist > 170) {
      if (ranged) { if (r < .55) { this.step(this.spk(me, this.rnd() < .5 ? 1 : 2), 1, true); this.cool = 30; } else this.step([away], 14, false); }
      else if (r < .22 * L.aggr) { this.step(this.spk(me, 1 + (this.rnd() * 2 | 0)), 1, true); this.cool = 40; }
      else if (r < L.jump + .1) { this.step(['u', tow], 4, false); this.step([], 14, false); this.step(['k'], 1, true); this.cool = 30; }
      else if (r < .6) this.step([tow], 12, false);
      else { this.step([], 10 + (this.rnd() * 15 | 0), false); }
    } else {
      this.closeCombo(me, opp, dist, tow, away, L, r);
    }
    return out;
  };
  AP.closeCombo = function (me, opp, dist, tow, away, L, r) {
    var chain = this.rnd() < L.combo;
    if (opp.state === 'down' || opp.state === 'getup') { this.step([tow], 10, false); this.step(['d'], 1, false); this.step(['d', 'k'], 1, true); this.cool = 25; return; }
    if (opp.crushed && opp.state === 'hurt') { this.step([tow], 4, false); this.step(['p'], 1, true); this.step([], 7, false); this.step(this.spk(me, this.rnd() < .5 ? 1 : 2), 1, true); this.cool = 40; return; }
    if (opp.blocking && opp.gg > 45 && r < .5) { this.step([tow, 'p'], 1, true); this.step([], 14, false); this.step([tow, 'k'], 1, true); this.cool = 36; return; }
    if (opp.blocking && r < .3) { this.step(['p', 'k'], 1, true); this.cool = 40; return; }                                        // 投技破防
    if (r < .24) { this.step(['p'], 1, true); if (chain) { this.step([], 6, false); this.step(['p'], 1, true); this.step([], 7, false); this.step(this.spk(me, this.rnd() < .5 ? 1 : 2), 1, true); } this.cool = 18; }
    else if (r < .44) { this.step(['k'], 1, true); if (chain) { this.step([], 8, false); this.step([tow, 'p'], 1, true); } this.cool = 22; }
    else if (r < .58) { this.step([tow, 'p'], 1, true); this.cool = 34; }
    else if (r < .7) { this.step(['d', 'k'], 1, true); this.cool = 34; }
    else if (r < .8) { this.step(['d', 'p'], 1, true); this.step([], 6, false); this.step(['d', 'p'], 1, true); this.cool = 22; }
    else if (r < .9) { this.step([tow, 'k'], 1, true); this.cool = 40; }
    else if (r < .95) { this.step(['u', tow], 4, false); this.step([], 12, false); this.step(['p'], 1, true); this.cool = 30; }
    else this.step([away], 16, false);
  };
  /* 判斷對手是否正在發動可能打到自己的攻擊 / 飛行道具；回傳 {hold, lvl, proj} */
  AP.threat = function (me, opp, scene, dist) {
    if (opp.state === 'attack' && opp.move) {
      var ph = opp.phase(), i, reach = 0, lvl = 'm', rem = 0, phs = opp.move.phases;
      for (i = opp.mi; i < phs.length; i++) { if (phs[i].hit) { var b = phs[i].hit.box; reach = Math.max(reach, b[1] * opp.sc); lvl = phs[i].hit.lvl || 'm'; break; } if (phs[i].spawn) break; rem += phs[i].n; }
      if (reach && dist < reach + 70 && me.y <= 0) return { hold: 14 + rem, lvl: lvl };
    }
    var ps = scene.projs, j; for (j = 0; j < ps.length; j++) { var p = ps[j]; if (p.owner !== me && !p.dead && (p.x - me.x) * p.vx < 0 && Math.abs(p.x - me.x) < 260) return { hold: 14, lvl: p.sp.lvl || 'm', proj: true, eta: Math.ceil(Math.abs(p.x - me.x) / Math.max(1, Math.abs(p.vx))) }; }
    return null;
  };

  /* ---------- 訓練場假人 ---------- */
  var Dummy = {
    modes: ['站立', '蹲姿', '跳躍', '全防禦', 'CPU'],
    make: function (mode, f) {
      var ai = new AI(1, f), t = 0;
      return { think: function (me, opp, scene) {
        var o = blank(), dx = opp.x - me.x, away = dx > 0 ? 'l' : 'r'; t++;
        if (mode === 1) o.d = true; else if (mode === 2) { if (t % 90 === 0) { o.u = true; o.xu = true; o.xj = true; } }
        else if (mode === 3) { o[away] = true; if (opp.state === 'attack') o.d = opp.phase() && opp.phase().hit && opp.phase().hit.lvl === 'l'; }
        else if (mode === 4) return ai.think(me, opp, scene);
        return o;
      } };
    }
  };
  AI.blank = blank; G.AI = AI; G.TrainDummy = Dummy;
})(window);
