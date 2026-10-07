/* Sprites — 角色圖集（真人繪製的動作格）取代程式繪製的骨架。
 * 有圖集的角色 id 登錄在 MAP；沒有圖集的角色維持原本的程式繪製。
 * 圖集：assets/<id>.png + assets/<id>.json（frames: {名稱:{x,y,w,h,ax,ay}}, ppu = 圖集像素/遊戲像素）
 * 所有格子面向右，ax = 身體中線 x，ay = 腳底（格底）。
 * 用法：Sprites.drawChar(ctx, ch, 姿勢名, x, 地面y, 面向(1|-1), 縮放[, alpha]) → 有畫就回傳 true。 */
(function (G) {
  'use strict';
  var SET = {};                                  // id → { img, f, ppu, portrait }
  /* 姿勢名（Rig.POSE 的名稱）→ 圖格。陣列 = 依序輪播。 */
  var MAP = {
    long: {
      idleA: 'A1', idleB: 'A5', idle: ['A1', 'A5'], crouch: 'A4', blockL: 'A4', blockH: 'A8',
      jump: 'A7', jumpF: 'A7', jumpB: 'A7', air: 'C3', hurtH: 'C1', hurtL: 'C2', lie: 'C4', getup: 'C7', grabbed: 'C1',
      intro: 'D6', win: 'C8', win2: 'C8', lose: 'D8',
      jab0: 'B1', jab1: 'B2', kick0: 'B3', kick1: 'B4', hp0: 'B1', hp1: 'D5', hk0: 'B3', hk1: 'B4',
      cp0: 'A4', cp1: 'A4', ck0: 'A4', ck1: 'A4', ap1: 'B8', ak1: 'B8',
      throwA: 'B2', throwB: 'D3', cast0: 'D7', cast1: 'D1', rise0: 'A4', rise1: 'D2', lunge: 'D5',
      walk: ['A2', 'A5', 'A3', 'A5'], fallback: 'A1'
    }
  };
  var Sprites = {
    MAP: MAP,
    has: function (id) { return !!(SET[id] && SET[id].ok); },
    portrait: function (id) { return SET[id] && SET[id].portrait && SET[id].portrait.complete && SET[id].portrait.naturalWidth ? SET[id].portrait : null; },
    /* 只先讀頭像（很小）；整張圖集（幾 MB）等到真的要用才 ensure() 載入。 */
    load: function (base) {
      this.base = base;
      Object.keys(MAP).forEach(function (id) {
        var s = SET[id] = { ok: false, st: 0, cbs: [] };
        try { var p = new G.Image(); p.onload = function () { s.portrait = p; }; p.src = base + id + '_portrait.jpg'; } catch (e) {}
      });
    },
    /* 沒有圖集的角色（仍用程式繪製）直接視為就緒。cb 在載入完成或失敗時呼叫。 */
    ensure: function (id, cb) {
      var s = SET[id]; cb = cb || function () {};
      if (!s || s.ok || s.st === 3) { cb(); return; }
      s.cbs.push(cb); if (s.st === 1) return; s.st = 1;
      var base = this.base, x = new G.XMLHttpRequest(), fin = function (good) { s.st = good ? 2 : 3; var q = s.cbs.splice(0); q.forEach(function (f) { try { f(); } catch (e) {} }); };
      try {
        x.open('GET', base + id + '.json'); x.onerror = function () { fin(false); };
        x.onload = function () {
          try { var j = JSON.parse(x.responseText), img = new G.Image(); img.onload = function () { s.img = img; s.f = j.frames; s.ppu = j.ppu; s.ok = true; fin(true); }; img.onerror = function () { fin(false); }; img.src = base + id + '.png'; } catch (e) { fin(false); }
        }; x.send();
      } catch (e) { fin(false); }
    },
    /* 還在載入中的圖集數量（載入畫面用） */
    pending: function () { var n = 0; for (var k in SET) if (SET[k].st === 1) n++; return n; },
    ready: function (id) { var s = SET[id]; return !s || s.ok || s.st === 3; },
    /* 姿勢名 → 圖格名；n 為輪播索引（走路 / 待機呼吸用） */
    frame: function (id, pose, n) {
      var m = MAP[id], v = m && (m[pose] || m.fallback); if (v instanceof Array) v = v[((n | 0) % v.length + v.length) % v.length]; return v;
    },
    draw: function (c, id, fname, x, gy, face, sc, alpha, bob) {
      var s = SET[id], f = s && s.ok && s.f[fname]; if (!f) return false;
      var k = (sc || 1) / s.ppu, w = f.w * k, h = f.h * k; c.save(); if (alpha != null) c.globalAlpha = alpha;
      c.translate(x, gy); if (face < 0) c.scale(-1, 1); if (bob) c.scale(1, 1 + bob);
      c.drawImage(s.img, f.x, f.y, f.w, f.h, -f.ax * k, -h, w, h); c.restore(); return true;
    },
    drawChar: function (c, ch, pose, x, gy, face, sc, alpha, n) {
      var id = ch && (ch.id || ch); if (!this.has(id)) return false;
      return this.draw(c, id, this.frame(id, pose, n), x, gy, face, sc, alpha);
    }
  };
  G.Sprites = Sprites;
})(window);
