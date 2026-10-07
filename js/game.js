/* Game — 啟動、固定 60Hz 主迴圈、畫布縮放、場景切換、街機流程。 */
(function (G) {
  'use strict';
  var W = CFG.W, H = CFG.H, D = G.document, FI = G.FightInput;
  var Game = {
    scene: null, cv: null, cx: null, S: 1, acc: 0, last: 0, run: null, paused: false, q: 2, fps: 60, _fa: 0, _fn: 0,
    init: function () {
      var cv = this.cv = D.getElementById('game'), me = this; this.cx = cv.getContext('2d');
      FI.init(); FTouch.init(); Brush.load('assets/'); Sprites.load('assets/');
      this.resize(); G.addEventListener('resize', function () { me.resize(); }); G.addEventListener('orientationchange', function () { G.setTimeout(function () { me.resize(); }, 200); });
      function pt(e, type) { var r = cv.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H; if (me.scene && me.scene.pointer) me.scene.pointer(type, x, y); }
      cv.addEventListener('pointerdown', function (e) { pt(e, 'down'); }); cv.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') pt(e, 'move'); });
      D.addEventListener('visibilitychange', function () { if (D.hidden && me.scene && me.scene.autoPause) me.scene.autoPause(); });
      if (D.fonts && D.fonts.load) { Promise.all(['900 48px "Noto Serif TC"', '700 20px "Noto Sans TC"'].map(function (f) { return D.fonts.load(f, '台北格鬥'); })).then(function () { Brush.clear(); }).catch(function () {}); }
      var qa = SaveManager.get('qAuto', null); this.q = FSettings.get('quality') === 'auto' ? (qa == null ? 2 : qa) : ({ high: 2, mid: 1, low: 0 })[FSettings.get('quality')];
      FSettings.onChange(function (n) { if (n === 'quality' || n === '*') { me.q = FSettings.get('quality') === 'auto' ? 2 : ({ high: 2, mid: 1, low: 0 })[FSettings.get('quality')]; me._fa = me._fn = 0; me.resize(); } });
      this.resize(); this.boot(); this.last = G.performance.now();
      var loop = function (now) { me.frame(now); G.requestAnimationFrame(loop); }; G.requestAnimationFrame(loop);
      if ('serviceWorker' in G.navigator && /^https?:/.test(G.location.protocol)) G.navigator.serviceWorker.register('sw.js').catch(function () {});
    },
    resize: function () {
      var cv = this.cv, vw = G.innerWidth, vh = G.innerHeight, k = Math.min(vw / W, vh / H), cw = Math.floor(W * k), ch = Math.floor(H * k), dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; var S = Math.max(1, Math.min([1, 1.5, 2.5][this.q == null ? 2 : this.q], cw / W * dpr)); this.S = S; cv.width = Math.round(W * S); cv.height = Math.round(H * S);
    },
    frame: function (now) {
      var raw = now - this.last, dt = Math.min(100, raw); this.last = now; this.monitor(raw); this.acc += dt; var n = 0, step = 1000 / 60;
      while (this.acc >= step && n < 5) { if (this.scene && this.scene.update) { try { this.scene.update(); } catch (e) { this.err(e); } } this.acc -= step; n++; }
      if (n === 5) this.acc = 0;
      var c = this.cx; c.setTransform(this.S, 0, 0, this.S, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      if (this.scene && this.scene.draw) { try { this.scene.draw(c); } catch (e) { this.err(e); } }
      if (FSettings.get('showFps')) { c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(6, 6, 96, 22); c.fillStyle = this.fps < 45 ? '#ff8a6a' : '#9aff9a'; c.font = '700 14px monospace'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(this.fps + ' FPS  Q' + this.q, 12, 17); }
    },
    /* 幀時間監看：連續 120 幀平均低於約 46 FPS 且為自動畫質時，降一級解析度（寫入存檔，下次直接沿用） */
    monitor: function (ms) {
      if (D.hidden || ms > 250 || ms <= 0) return; this._fa += ms; this._fn++;
      if (this._fn >= 120) {
        var avg = this._fa / this._fn; this.fps = Math.round(1000 / avg); this._fa = 0; this._fn = 0;
        if (FSettings.get('quality') === 'auto' && avg > 21.5 && this.q > 0 && this.scene && this.scene.fs) { this.q--; SaveManager.set('qAuto', this.q); this.resize(); }
      }
    },
    boot: function () { var me = this; this.go(function () { return new LoadScene(me, { boot: true, ids: [], min: 40, next: function () { me.toTitle(); } }); }); },
    /* 進對戰前確保圖集載好；已載入就直接進行 */
    preload: function (ids, next) {
      var me = this, need = ids.filter(function (id) { return !G.Sprites.ready(id); });
      if (!need.length) { next(); return; }
      this.go(function () { return new LoadScene(me, { ids: need, min: 10, next: next }); });
    },
    err: function (e) { if (G.console) console.error(e); G.__lastErr = e && (e.stack || String(e)); },
    go: function (factory) {
      if (this.scene && this.scene.exit) this.scene.exit(); FI.reset(); FI.clearLatch(); this.scene = factory(); this.scene.enter(); this.acc = 0;
    },
    toTitle: function () { var me = this; this.run = null; this.go(function () { return new TitleScene(me); }); },
    /* 選角完成後啟動各模式 */
    launch: function (mode, p) {
      var me = this;
      if (mode === 'arcade') { this.startArcade(p.p1); return; }
      var opts = { mode: mode, p1: p.p1, p2: p.p2 || p.p1, stage: p.stage || 0 };
      this.versus(opts);
    },
    versus: function (opts) {
      var me = this, again = function () { me.versus(opts); };
      this.preload([opts.p1, opts.p2], function () { me.go(function () { return new VsScene(me, { p1: opts.p1, p2: opts.p2, stage: opts.stage, done: function () {
        me.go(function () { var o = {}, k; for (k in opts) o[k] = opts[k]; o.onEnd = function (a) {
          if (a === 'rematch') again(); else if (a === 'select') me.go(function () { return new SelectScene(me, { mode: opts.mode, steps: ['p1', 'p2', 'stage'], back: function () { me.toTitle(); }, done: function (p) { me.launch(opts.mode, p); } }); }); else me.toTitle(); };
          if (opts.mode === 'train') { return new FightScene(me, o); } return new FightScene(me, o); });
      } }); }); });
    },
    startArcade: function (p1) {
      var others = Roster.chars.filter(function (c) { return c.id !== p1; }), i, j, t;
      for (i = others.length - 1; i > 0; i--) { j = (Math.random() * (i + 1)) | 0; t = others[i]; others[i] = others[j]; others[j] = t; }
      this.run = { p1: p1, order: others.map(function (c) { return c.id; }).concat(['boss']), i: 0 };
      if (p1 === 'boss') { this.run.order = Roster.chars.map(function (c) { return c.id; }).sort(function () { return Math.random() - .5; }).slice(0, 7).concat(['long']); }
      this.nextArcade();
    },
    nextArcade: function () {
      var me = this, r = this.run, i = r.i, FS = G.FSettings; if (i >= r.order.length) { this.go(function () { return new ClearScene(me, { p1: r.p1 }); }); return; }
      var stage = i, level = Math.min(2, FS.get('diff') + (i >= 5 ? 1 : 0));
      this.preload([r.p1, r.order[i]], function () { me.go(function () { return new VsScene(me, { p1: r.p1, p2: r.order[i], stage: stage, round: i + 1, done: function () {
        me.go(function () { return new FightScene(me, { mode: 'arcade', p1: r.p1, p2: r.order[i], stage: stage, level: level, last: i === r.order.length - 1, onEnd: function (a) {
          if (a === 'next') { r.i++; me.nextArcade(); } else if (a === 'retry') me.nextArcade(); else me.toTitle(); } }); });
      } }); }); });
    }
  };
  G.Game = Game;
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { Game.init(); }); else Game.init();
})(window);
