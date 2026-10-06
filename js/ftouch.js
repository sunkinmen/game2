/* FTouch — 虛擬按鍵：八方向十字鍵（可滑動）+ 手 / 腳 / 跳；簡易模式多 小招A / 小招B / 大招。
 * 全螢幕覆蓋 canvas、只在狀態改變時重畫；避開瀏海 safe-area；支援左右手對調與雙人（各占一側）。 */
(function (G) {
  'use strict';
  var D = G.document, FI = G.FightInput, FS = G.FSettings;
  var TINT = { p: '255,96,84', k: '96,160,255', j: '255,214,80', s1: '120,230,150', s2: '120,230,200', s3: '255,170,60' };
  var LAB = { p: '手', k: '腳', j: '跳' }, DEFN = { s1: '小招A', s2: '小招B', s3: '大招' };
  var T = {
    cv: null, cx: null, dpr: 1, dirty: true, mode: null, _raf: 0, _probe: null, _w: 0, _h: 0, btn: [], pads: [],
    init: function () {
      if (this.cv) return this; var cv = this.cv = D.createElement('canvas');
      cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5;touch-action:none'; cv.setAttribute('aria-hidden', 'true');
      D.body.appendChild(cv); this.cx = cv.getContext('2d');
      var p = this._probe = D.createElement('div');
      p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      D.body.appendChild(p);
      var self = this, rs = function () { self.layout(); G.setTimeout(function () { self.layout(); }, 250); };
      G.addEventListener('resize', rs); G.addEventListener('orientationchange', rs);
      FS.onChange(function () { self.layout(); }); FI.onChange(function () { self.dirty = true; self._kick(); });
      return this;
    },
    /* mode: null（選單，不顯示）、'1p'、'2p' */
    show: function (mode) { this.mode = mode; FI.setTouch(!!mode); this.layout(); },
    visible: function () { return !!this.mode && FI.touchWanted(); },
    layout: function () {
      if (!this.cv) return;
      var vw = G.innerWidth, vh = G.innerHeight, dpr = Math.min(2, G.devicePixelRatio || 1), cs = G.getComputedStyle(this._probe);
      var sf = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
      if (vw !== this._w || vh !== this._h || dpr !== this.dpr) { this._w = vw; this._h = vh; this.dpr = dpr; this.cv.width = Math.round(vw * dpr); this.cv.height = Math.round(vh * dpr); }
      var btn = [], pads = [];
      if (this.mode) {
        var easy = FS.get('easy'), two = this.mode === '2p', Dm = Math.max(46, Math.min(80, Math.min(vw, vh) * .17)) * FS.get('btnSize') * (two ? .8 : 1);
        var r = Dm / 2, g = Dm * .14, u = Dm + g, mx = Math.max(12, vw * .02), my = Math.max(10, vh * .03);
        var Lm = mx + sf.l, Rm = mx + sf.r, Bm = my + sf.b, y0 = vh - Bm - r, padR = Dm * 1.05, left = FS.get('leftHand');
        var addPad = function (pl, cx) { pads.push({ pl: pl, x: cx, y: vh - Bm - padR, r: padR }); };
        var cluster = function (pl, ax, sg) {                           // sg=-1：往左展開（叢集在右側）
          var o = function (a, ox, oy, rr) { btn.push({ pl: pl, a: a, x: ax + sg * ox, y: y0 + oy * 1, r: rr }); };
          o('k', 0, 0, r); o('p', u, -r * .5, r); o('j', 0, -u, r);
          if (easy) { var s = Dm * .4; o('s1', u * 1.75, -u * 1.05, s); o('s2', u * 1.1, -u * 1.75, s); o('s3', 0, -u * 2.0, s * 1.1); }
        };
        if (!two) {
          if (!left) { addPad(0, Lm + padR); cluster(0, vw - Rm - r, -1); }
          else { addPad(0, vw - Rm - padR); cluster(0, Lm + r, 1); }
        } else {
          addPad(0, Lm + padR); cluster(0, Lm + padR * 2 + g * 3 + r, 1);
          addPad(1, vw - Rm - padR); cluster(1, vw - Rm - padR * 2 - g * 3 - r, -1);
        }
      }
      this.btn = btn; this.pads = pads; FI.setLayout(this.visible() ? btn : [], this.visible() ? pads : []); this.dirty = true; this._kick();
    },
    _kick: function () { if (this._raf) return; var self = this; this._raf = G.requestAnimationFrame(function () { self._raf = 0; self.draw(); }); },
    draw: function () {
      if (!this.dirty) return; this.dirty = false;
      var c = this.cx, d = this.dpr, i, A = FS.get('btnOpacity');
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height);
      if (!this.visible()) { FI.setLayout([], []); return; }
      FI.setLayout(this.btn, this.pads); c.setTransform(d, 0, 0, d, 0, 0); c.textAlign = 'center'; c.textBaseline = 'middle';
      var orb = function (x, y, r, rgb, on, a) {
        var g = c.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,' + (a * (on ? .75 : .42)).toFixed(3) + ')'); g.addColorStop(.55, 'rgba(' + rgb + ',' + (a * (on ? .7 : .34)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',' + (a * (on ? .5 : .16)).toFixed(3) + ')');
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fillStyle = g; c.fill(); c.lineWidth = on ? 3 : 2; c.strokeStyle = 'rgba(255,255,255,' + Math.min(1, a + .2).toFixed(3) + ')'; c.stroke();
        if (on) { c.beginPath(); c.arc(x, y, r + 5, 0, 6.2832); c.lineWidth = 3; c.strokeStyle = 'rgba(' + rgb + ',' + (a * .5).toFixed(3) + ')'; c.stroke(); }
      };
      for (i = 0; i < this.pads.length; i++) {
        var p = this.pads[i], st = FI.stick[p.pl], a = Math.min(1, A + .1);
        orb(p.x, p.y, p.r, '140,180,255', false, a * .5);
        for (var k = 0; k < 8; k++) {
          var an = k * Math.PI / 4; c.save(); c.translate(p.x + Math.cos(an) * p.r * .8, p.y + Math.sin(an) * p.r * .8); c.rotate(an);
          c.beginPath(); c.moveTo(4, 0); c.lineTo(-3, -4); c.lineTo(-3, 4); c.closePath(); c.fillStyle = 'rgba(255,255,255,' + (a * (k % 2 ? .3 : .55)).toFixed(3) + ')'; c.fill(); c.restore();
        }
        orb(st ? st.x : p.x, st ? st.y : p.y, p.r * .42, '210,230,255', !!st, Math.min(1, a + .15));
        if (this.mode === '2p') { c.font = 'bold 13px sans-serif'; c.fillStyle = p.pl ? 'rgba(255,120,110,.9)' : 'rgba(120,180,255,.9)'; c.fillText(p.pl ? '2P' : '1P', p.x, p.y - p.r - 10); }
      }
      for (i = 0; i < this.btn.length; i++) {
        var b = this.btn[i], on = FI.touchDown(b.pl, b.a), rr = b.r * (on ? .92 : 1), al = Math.min(1, A + (on ? .3 : .08)), sm = b.a.length > 1;
        orb(b.x, b.y, rr, TINT[b.a], on, al);
        c.lineWidth = 3; c.strokeStyle = 'rgba(10,12,30,' + (al * .85).toFixed(3) + ')'; c.fillStyle = 'rgba(255,255,255,' + Math.min(1, al + .3).toFixed(3) + ')';
        if (!sm) { c.font = '900 ' + Math.round(rr * .74) + 'px "Noto Sans TC",system-ui,sans-serif'; c.strokeText(LAB[b.a], b.x, b.y + 1); c.fillText(LAB[b.a], b.x, b.y + 1); }
        else {
          var nm = (FI.labels[b.pl] || [])[+b.a[1] - 1] || DEFN[b.a], fs = Math.max(9, Math.round(rr * (nm.length > 4 ? .36 : .42)));
          c.font = '800 ' + fs + 'px "Noto Sans TC",system-ui,sans-serif';
          if (nm.length > 3) { var h = Math.ceil(nm.length / 2); c.strokeText(nm.slice(0, h), b.x, b.y - fs * .55); c.fillText(nm.slice(0, h), b.x, b.y - fs * .55); c.strokeText(nm.slice(h), b.x, b.y + fs * .6); c.fillText(nm.slice(h), b.x, b.y + fs * .6); }
          else { c.strokeText(nm, b.x, b.y); c.fillText(nm, b.x, b.y); }
        }
      }
    }
  };
  G.FTouch = T;
})(window);
