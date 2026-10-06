/* FightInput — 格鬥遊戲唯一輸入入口（鍵盤 / 多點觸控 / 滑鼠）
 * 每個邏輯幀呼叫 FightInput.poll(player)：回傳目前按住狀態（l r u d p k j s1 s2 s3），
 * 以及兩幀之間的「按下事件」（xp xk xj xs1…，短點擊不會漏）。
 * 選單導覽事件：FightInput.on('nav', fn)，值為 up/down/left/right/ok/back/pause。
 * mode=1：單人（P1 可用 WASD 或方向鍵）；mode=2：雙人（P1 = WASD+JKL+UIO，P2 = 方向鍵+,./+;'] ）。 */
(function (G) {
  'use strict';
  var BT = ['p', 'k', 'j', 's1', 's2', 's3'], DR = ['l', 'r', 'u', 'd'];
  var KM1 = { KeyA: 'l', KeyD: 'r', KeyW: 'u', KeyS: 'd', ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', KeyJ: 'p', KeyK: 'k', KeyL: 'j', Space: 'j', KeyU: 's1', KeyI: 's2', KeyO: 's3' };
  var KM2A = { KeyA: 'l', KeyD: 'r', KeyW: 'u', KeyS: 'd', KeyJ: 'p', KeyK: 'k', KeyL: 'j', KeyU: 's1', KeyI: 's2', KeyO: 's3' };
  var KM2B = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', Comma: 'p', Period: 'k', Slash: 'j', Numpad4: 'p', Numpad5: 'k', Numpad6: 'j', Semicolon: 's1', Quote: 's2', BracketRight: 's3', Numpad7: 's1', Numpad8: 's2', Numpad9: 's3' };
  function mk() { var o = {}, i; for (i = 0; i < DR.length; i++) o[DR[i]] = 0; for (i = 0; i < BT.length; i++) o[BT[i]] = 0; return o; }
  function mkb() { var o = {}, i; for (i = 0; i < BT.length; i++) o[BT[i]] = false; return o; }

  var FI = {
    mode: 1, touchMode: false, touchOn: false, modal: false, ready: false,
    kb: [mk(), mk()], tc: [mk(), mk()], latch: [mkb(), mkb()],
    btn: [], pads: [], _touch: {}, _kd: {}, _ev: {}, _chg: [], labels: [[], []], _lastTouch: 0, _lastVib: 0, stick: [null, null],

    init: function () {
      if (this.ready) return this; this.ready = true; var self = this, o = { passive: false };
      this.touchMode = ('ontouchstart' in G) || (G.navigator.maxTouchPoints > 0);
      G.addEventListener('keydown', function (e) { self._key(e, true); });
      G.addEventListener('keyup', function (e) { self._key(e, false); });
      G.addEventListener('touchstart', function (e) { self._ts(e); }, o);
      G.addEventListener('touchmove', function (e) { self._tm(e); }, o);
      G.addEventListener('touchend', function (e) { self._te(e); }, o);
      G.addEventListener('touchcancel', function (e) { self._te(e); }, o);
      G.addEventListener('mousedown', function (e) { self._md(e); });
      G.addEventListener('mousemove', function (e) { if (self._touch.m) self._update('m', e.clientX, e.clientY); });
      G.addEventListener('mouseup', function () { self._release('m'); });
      G.addEventListener('blur', function () { self.reset(); });
      G.document.addEventListener('visibilitychange', function () { if (G.document.hidden) self.reset(); });
      ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'dblclick', 'selectstart'].forEach(function (ev) {
        G.addEventListener(ev, function (e) { if (!self._skip(e) && e.cancelable) e.preventDefault(); }, o);
      });
      return this;
    },
    poll: function (pl) {
      var r = {}, i, n, k = this.kb[pl], t = this.tc[pl], lt = this.latch[pl];
      for (i = 0; i < DR.length; i++) { n = DR[i]; r[n] = k[n] > 0 || t[n] > 0; }
      for (i = 0; i < BT.length; i++) { n = BT[i]; r[n] = k[n] > 0 || t[n] > 0; r['x' + n] = lt[n]; lt[n] = false; }
      if (r.l && r.r) r.l = r.r = false; if (r.u && r.d) r.u = r.d = false;
      return r;
    },
    clearLatch: function () { var pl, n; for (pl = 0; pl < 2; pl++) for (n in this.latch[pl]) this.latch[pl][n] = false; },
    touchDown: function (pl, a) { return this.tc[pl][a] > 0; },
    on: function (n, fn) { var l = this._ev[n] || (this._ev[n] = []); l.push(fn); return function () { var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }; },
    emit: function (n, a) { var l = this._ev[n]; if (!l) return; l = l.slice(); for (var i = 0; i < l.length; i++) try { l[i](a); } catch (e) { if (G.console) console.error(e); } },
    onChange: function (f) { this._chg.push(f); }, _changed: function () { for (var i = 0; i < this._chg.length; i++) this._chg[i](); },
    setMode: function (m) { this.mode = m; this.reset(); },
    setLabels: function (pl, a) { this.labels[pl] = a || []; this._changed(); },
    setLayout: function (btn, pads) { this.btn = btn || []; this.pads = pads || []; },
    setTouch: function (on) { this.touchOn = !!on; if (!on) this.reset(); this._changed(); },
    touchWanted: function () { var m = G.FSettings ? FSettings.get('touch') : 'auto'; return m === 'on' || (m === 'auto' && this.touchMode); },
    _hit: function (x, y, cur) {
      var best = null, bd = 1e9, i, b, d, r;
      for (i = 0; i < this.btn.length; i++) {
        b = this.btn[i]; d = Math.hypot(x - b.x, y - b.y);
        r = b.r * (cur && cur.k === 'b' && cur.pl === b.pl && cur.a === b.a ? 1.35 : 1.1);
        if (d <= r && d / b.r < bd) { bd = d / b.r; best = b; }
      }
      if (best) return { k: 'b', pl: best.pl, a: best.a };
      for (i = 0; i < this.pads.length; i++) { b = this.pads[i]; if (Math.hypot(x - b.x, y - b.y) <= b.r * 1.45 || (cur && cur.k === 'p' && cur.pl === b.pl)) return { k: 'p', pl: b.pl, pad: b }; }
      return null;
    },
    _skip: function (e) { if (this.modal) return true; var t = e && e.target; return !!(t && t.closest && t.closest('[data-tg-modal]')); },
    _set: function (id, h) {
      var cur = this._touch[id], n;
      if (cur) {
        if (cur.k === 'b' && h && h.k === 'b' && cur.pl === h.pl && cur.a === h.a) return;
        this._clear(id, cur);
      }
      if (!h) { delete this._touch[id]; this._changed(); return; }
      this._touch[id] = h;
      if (h.k === 'b') { this.tc[h.pl][h.a]++; this.latch[h.pl][h.a] = true; this.vibrate(10); }
      else { h.dirs = this._padDir(h); for (n in h.dirs) if (h.dirs[n]) this.tc[h.pl][n]++; }
      this._changed();
    },
    _clear: function (id, cur) {
      var n;
      if (cur.k === 'b') { if (this.tc[cur.pl][cur.a] > 0) this.tc[cur.pl][cur.a]--; }
      else if (cur.dirs) { for (n in cur.dirs) if (cur.dirs[n] && this.tc[cur.pl][n] > 0) this.tc[cur.pl][n]--; this.stick[cur.pl] = null; }
      delete this._touch[id];
    },
    _release: function (id) { var c = this._touch[id]; if (c) { this._clear(id, c); this._changed(); } },
    _padDir: function (h) {
      var p = h.pad, dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy), r = { l: false, r: false, u: false, d: false };
      this.stick[h.pl] = { x: p.x + (d > p.r ? dx / d * p.r : dx), y: p.y + (d > p.r ? dy / d * p.r : dy) };
      if (d < p.r * .22) return r;
      var nx = dx / d, ny = dy / d;
      if (nx < -.38) r.l = true; if (nx > .38) r.r = true; if (ny < -.38) r.u = true; if (ny > .38) r.d = true;
      return r;
    },
    _update: function (id, x, y) {
      var cur = this._touch[id], h = this._hit(x, y, cur);
      if (h && h.k === 'p') {
        h.x = x; h.y = y;
        if (cur && cur.k === 'p' && cur.pl === h.pl) {            // 同一個十字鍵：只更新方向
          var nd = this._padDir(h), n;
          for (n in nd) { if (nd[n] !== cur.dirs[n]) { if (nd[n]) this.tc[h.pl][n]++; else if (this.tc[h.pl][n] > 0) this.tc[h.pl][n]--; } }
          cur.dirs = nd; cur.x = x; cur.y = y; this._changed(); return;
        }
      }
      this._set(id, h);
    },
    _ts: function (e) {
      if (this._skip(e)) return; this._lastTouch = G.performance.now();
      if (!this.touchMode) { this.touchMode = true; this._changed(); }
      var ts = e.changedTouches || [], i, t;
      if (this.touchOn && this.touchWanted()) for (i = 0; i < ts.length; i++) { t = ts[i]; this._update(t.identifier, t.clientX, t.clientY); }
    },
    _tm: function (e) {
      if (this._skip(e)) return; var ts = e.changedTouches || [], i, t;
      for (i = 0; i < ts.length; i++) { t = ts[i]; if (this._touch[t.identifier]) this._update(t.identifier, t.clientX, t.clientY); }
      if (this.touchOn && e.cancelable) e.preventDefault();
    },
    _te: function (e) {
      var ts = e.changedTouches || [], i; for (i = 0; i < ts.length; i++) this._release(ts[i].identifier);
      this._lastTouch = G.performance.now();
    },
    _md: function (e) { if (this._skip(e) || G.performance.now() - this._lastTouch < 700 || !this.touchOn || !this.touchWanted()) return; this._update('m', e.clientX, e.clientY); },
    _key: function (e, down) {
      var t = e.target, tag = t && t.tagName, code = e.code || e.key, inForm = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (down && !e.repeat) {
        var nav = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', Enter: 'ok', KeyJ: 'ok', Space: 'ok', Escape: 'back', Backspace: 'back', KeyP: 'pause' }[code];
        if (nav && !inForm) this.emit('nav', nav);
      }
      if (inForm || this.modal) return;
      var pl, a, any = false, map, key;
      for (pl = 0; pl < 2; pl++) {
        if (this.mode === 1 && pl === 1) break;
        map = this.mode === 2 ? (pl === 0 ? KM2A : KM2B) : KM1; a = map[code]; if (!a) continue; any = true; key = pl + code;
        if (down) { if (this._kd[key]) continue; this._kd[key] = 1; this.kb[pl][a]++; if (BT.indexOf(a) >= 0) this.latch[pl][a] = true; }
        else { if (!this._kd[key]) continue; delete this._kd[key]; if (this.kb[pl][a] > 0) this.kb[pl][a]--; }
      }
      if (any && e.cancelable) e.preventDefault();
    },
    reset: function () {
      var pl, n; for (n in this._touch) delete this._touch[n]; this._kd = {};
      for (pl = 0; pl < 2; pl++) { for (n in this.kb[pl]) { this.kb[pl][n] = 0; this.tc[pl][n] = 0; } this.stick[pl] = null; }
      this._changed();
    },
    setModal: function (b) { this.modal = !!b; this.reset(); },
    vibrate: function (p) {
      if (!G.FSettings || !FSettings.get('vibrate') || !G.navigator.vibrate) return;
      var now = G.performance.now(); if (now - this._lastVib < 25) return; this._lastVib = now; try { G.navigator.vibrate(p); } catch (e) {}
    }
  };
  G.FightInput = FI;
})(window);
