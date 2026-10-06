/* Combat — 飛行道具、特效粒子、每幀命中判定。
 * Projectile 由招式 spawn 欄位生成；Fx 管理火花 / 光環 / 塵土 / 文字等短命粒子。 */
(function (G) {
  'use strict';
  var GROUND = 0;
  function ov(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; }

  /* ---------- 飛行道具 ---------- */
  function Proj(owner, sp) {
    this.owner = owner; this.sp = sp; this.kind = sp.kind; this.face = owner.face; this.t = 0; this.dead = false; this.life = sp.life; this.hitT = {}; this.back = false;
    this.x = sp.abs != null ? sp.abs : owner.x + owner.face * sp.x * owner.sc; this.y = sp.y * owner.sc; this.vx = sp.vx * owner.face; this.vy = sp.vy || 0; this.g = sp.g || 0; this.rot = 0; this.dmgMul = 1;
    this.w = sp.w * owner.sc; this.h = sp.h * owner.sc; this.ox0 = this.x;
  }
  var PP = Proj.prototype;
  PP.box = function () {
    if (this.sp.fixed) { var a = this.x, b = this.x + this.face * this.w; return { x0: Math.min(a, b), x1: Math.max(a, b), y0: this.y - this.h / 2, y1: this.y + this.h / 2 }; }
    return { x0: this.x - this.w / 2, x1: this.x + this.w / 2, y0: this.y - this.h / 2, y1: this.y + this.h / 2 };
  };
  PP.update = function (scene) {
    var sp = this.sp; this.t++; this.rot += .3 * (this.vx >= 0 ? 1 : -1);
    if (sp.boom && !this.back && this.t >= sp.life / 2) { this.back = true; this.vx = -this.vx * 1.15; this.hitT = {}; }
    if (sp.tether && this.t > 10 && !this.hitDone) this.vx *= 0;                          // 水袖伸到最長後停住
    this.vy -= this.g; this.x += this.vx; this.y += this.vy;
    if (sp.kind === 'bucket' && this.t < 4) this.vy = -10;
    if (this.y - this.h / 2 <= GROUND && this.vy < 0) {
      if (sp.ground === 'fire') scene.spawnRaw(this.owner, { kind: 'fire', x: 0, y: 22, vx: 0, life: 80, dmg: 16, hs: 14, bs: 8, w: 70, h: 44, kb: 2, rehit: 14, lvl: 'l', color: 0xff7a20, abs: this.x, noBlockStop: 1 }, this.x);
      else if (sp.ground === 'boom') scene.spawnRaw(this.owner, { kind: 'boom', x: 0, y: 40, vx: 0, life: 14, dmg: Math.round(sp.dmg * .7), hs: sp.hs, bs: sp.bs, w: 120, h: 90, kb: 6, color: 0xffc23a, abs: this.x, kd: sp.kd, launch: sp.kd ? [5, 9] : null }, this.x);
      G.FxAudio.play('proj_hit'); scene.fx.ring(this.x, 0, sp.color, 40); this.dead = true; return;
    }
    if (--this.life <= 0) this.dead = true;
    if (this.back && Math.abs(this.x - this.owner.x) < 30) this.dead = true;
    if (this.x < -80 || this.x > CFG.STAGE_W + 80) this.dead = true;
  };
  PP.dmgObj = function () {
    var s = this.sp; return { dmg: Math.round(s.dmg * this.dmgMul), hs: s.hs, bs: s.bs, kb: s.kb, lvl: s.lvl || 'm', kd: s.kd, launch: s.launch, pull: s.pull, stop: s.dmg < 35 ? 2 : 4, sfx: 'proj_hit' };
  };

  /* ---------- 特效粒子 ---------- */
  function FxSys() { this.ps = []; this.texts = []; }
  var FP = FxSys.prototype;
  FP.add = function (p) { if (this.ps.length > 260) this.ps.shift(); this.ps.push(p); };
  FP.spark = function (x, y, lvl, color) {
    var n = lvl === 'h' ? 14 : lvl === 'm' ? 9 : 5, i, a, s;
    this.add({ k: 'star', x: x, y: y, r: lvl === 'h' ? 54 : lvl === 'm' ? 38 : 24, life: 8, t: 0, c: color || 0xffffff, rot: Math.random() * 3 });
    for (i = 0; i < n; i++) { a = Math.random() * 6.283; s = 2 + Math.random() * (lvl === 'h' ? 9 : 6); this.add({ k: 'dot', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: .3, r: 2 + Math.random() * 3, life: 14 + Math.random() * 8, t: 0, c: color || 0xffe27a }); }
  };
  FP.block = function (x, y) { var i; this.add({ k: 'ring', x: x, y: y, r: 8, rv: 3.5, life: 10, t: 0, c: 0x9fd8ff, w: 4 }); for (i = 0; i < 6; i++) this.add({ k: 'dot', x: x, y: y, vx: (Math.random() - .5) * 9, vy: -Math.random() * 6, g: .3, r: 2, life: 12, t: 0, c: 0x9fd8ff }); };
  FP.ring = function (x, y, c, r) { this.add({ k: 'ring', x: x, y: y, r: 6, rv: (r || 40) / 10, life: 12, t: 0, c: c || 0xffffff, w: 5 }); };
  FP.dust = function (x, y, n) { for (var i = 0; i < (n || 6); i++) this.add({ k: 'dust', x: x + (Math.random() - .5) * 40, y: y, vx: (Math.random() - .5) * 3, vy: -Math.random() * 1.5, r: 5 + Math.random() * 7, life: 22, t: 0, c: 0xd8d0c0 }); };
  FP.text = function (x, y, s, c, size) { this.texts.push({ x: x, y: y, s: s, c: c, size: size || 22, t: 0, life: 40 }); };
  FP.line = function (x1, y1, x2, y2, c, w, life) { this.add({ k: 'line', x: x1, y: y1, x2: x2, y2: y2, c: c, w: w || 3, life: life || 8, t: 0 }); };
  FP.trail = function (f, c) { this.add({ k: 'ghost', f: f, c: c, life: 10, t: 0, pose: f.pose, x: f.x, y: f.y, face: f.face }); };
  FP.update = function () {
    var i, p, ps = this.ps;
    for (i = ps.length - 1; i >= 0; i--) { p = ps[i]; p.t++; if (p.vx != null) { p.x += p.vx; p.y += p.vy; if (p.g) p.vy += p.g; p.vx *= .96; } if (p.rv) p.r += p.rv; if (p.t >= p.life) ps.splice(i, 1); }
    for (i = this.texts.length - 1; i >= 0; i--) { p = this.texts[i]; p.t++; p.y -= .8; if (p.t >= p.life) this.texts.splice(i, 1); }
  };
  FP.draw = function (c, camX) {
    var i, p, k, a, hex = G.cssColor;
    for (i = 0; i < this.ps.length; i++) {
      p = this.ps[i]; k = p.t / p.life; a = 1 - k;
      if (p.k === 'star') { c.save(); c.translate(p.x - camX, p.y); c.rotate(p.rot); c.fillStyle = hex(p.c, a); c.beginPath(); for (var j = 0; j < 8; j++) { var rr = j % 2 ? p.r * .35 : p.r * (1 - k * .3); c.lineTo(Math.cos(j * .785) * rr, Math.sin(j * .785) * rr); } c.closePath(); c.fill(); c.restore(); }
      else if (p.k === 'dot') { c.fillStyle = hex(p.c, a); c.beginPath(); c.arc(p.x - camX, p.y, p.r * a + .5, 0, 6.283); c.fill(); }
      else if (p.k === 'ring') { c.strokeStyle = hex(p.c, a); c.lineWidth = p.w * a + 1; c.beginPath(); c.arc(p.x - camX, p.y, p.r, 0, 6.283); c.stroke(); }
      else if (p.k === 'dust') { c.fillStyle = hex(p.c, a * .5); c.beginPath(); c.arc(p.x - camX, p.y, p.r * (1 + k), 0, 6.283); c.fill(); }
      else if (p.k === 'ghost') { c.save(); c.globalAlpha = .34 * a; c.globalCompositeOperation = 'lighter'; var J = G.Rig.solve(p.f.look, p.pose, p.x - camX, CFG.GROUND - p.y, p.face, p.f.sc); G.Rig.draw(new G.CanvasPen(c), J, p.f.look, 'n'); c.restore(); }
      else if (p.k === 'line') { c.strokeStyle = hex(p.c, a); c.lineWidth = p.w * a + 1; c.beginPath(); c.moveTo(p.x - camX, p.y); c.lineTo(p.x2 - camX, p.y2); c.stroke(); }
    }
  };
  FP.drawTexts = function (c, camX) {
    for (var i = 0; i < this.texts.length; i++) { var p = this.texts[i], a = 1 - p.t / p.life; c.font = '900 ' + p.size + 'px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,' + a + ')'; c.fillStyle = G.cssColor(p.c, a); c.strokeText(p.s, p.x - camX, p.y); c.fillText(p.s, p.x - camX, p.y); }
  };

  /* ---------- 命中判定 ---------- */
  var Combat = {
    ov: ov,
    resolve: function (scene, fs) {
      var i, A, B, ah, hb, g, res, pos, ps = scene.projs, p;
      for (i = 0; i < 2; i++) {
        A = fs[i]; B = fs[1 - i]; if (A.dead && A.state !== 'attack') continue;
        g = A.activeGrab();
        if (g) {
          hb = B.hurtbox();
          if (hb && B.y <= 0 && !B.inv && { idle: 1, walk: 1, crouch: 1, block: 1, hurt: 1, blockstun: 1 }[B.state] && ov(g.b, hb)) {
            B.grabbed(A, g.g); A.setHeld(B); G.FxAudio.play('hit_m'); scene.fx.spark((g.b.x0 + g.b.x1) / 2, scene.gy(B.y + 90), 'm'); scene.hitStop = Math.max(scene.hitStop, 6);
          } else if (A.phase() && A.mf >= A.pn - 1) A.grabDone = true;
        }
        ah = A.activeHit();
        if (ah) {
          hb = B.hurtbox();
          if (hb && ov(ah.b, hb)) {
            res = B.takeHit(A, ah.h, false);
            if (res.hit || res.counter) { A.hitLanded(res.blocked); scene.onHit(A, B, res, ah.h, Math.max(ah.b.x0, hb.x0) / 2 + Math.min(ah.b.x1, hb.x1) / 2, (Math.max(ah.b.y0, hb.y0) + Math.min(ah.b.y1, hb.y1)) / 2); }
          }
        }
      }
      for (i = ps.length - 1; i >= 0; i--) {
        p = ps[i]; if (p.dead) continue; for (var kk in p.hitT) if (p.hitT[kk] > 0 && p.hitT[kk] < 999) p.hitT[kk]--;
        var o = p.owner, T = o === fs[0] ? fs[1] : fs[0], pb = p.box();
        hb = T.hurtbox();
        if (T.reflect && hb && ov(pb, hb) && !p.sp.fixed) { p.owner = T; p.vx = -p.vx * 1.35; p.face = -p.face; p.dmgMul *= 1.25; p.life += 40; p.hitT = {}; G.FxAudio.play('block'); scene.fx.ring(p.x, scene.gy(p.y), 0xffffff, 50); continue; }
        if (hb && ov(pb, hb)) {
          if (p.hitT[T.side] > 0) continue;
          res = T.takeHit(o, p.dmgObj(), true);
          if (res.hit) {
            p.hitT[T.side] = p.sp.rehit || 999; 
            scene.onHit(o, T, res, p.dmgObj(), (pb.x0 + pb.x1) / 2, p.y, p);
            if (!p.sp.rehit && !p.sp.boom && !p.sp.fixed) p.dead = true;
          }
        }
      }
      // 飛行道具互相抵銷
      for (i = 0; i < ps.length; i++) for (var j = i + 1; j < ps.length; j++) {
        var a = ps[i], b = ps[j]; if (a.dead || b.dead || a.owner === b.owner) continue;
        if (ov(a.box(), b.box())) { if (a.sp.fixed && !b.sp.fixed) b.dead = true; else if (b.sp.fixed && !a.sp.fixed) a.dead = true; else if (!a.sp.fixed) { a.dead = b.dead = true; scene.fx.ring((a.x + b.x) / 2, scene.gy(a.y), 0xffffff, 60); G.FxAudio.play('block'); } }
      }
    }
  };
  G.Proj = Proj; G.FxSys = FxSys; G.Combat = Combat;
})(window);
