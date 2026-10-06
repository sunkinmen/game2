/* Brush — 毛筆風格大字（標題 / KO / 回合 / 招式名…）。
 * 優先使用預先繪製的圖集 assets/brush.png（tools/make_brush.py 以 Noto Serif CJK Black 製作，
 * 每個字略微旋轉 / 位移 / 墨邊暈染，所有裝置看起來一致）；
 * 圖集缺字或載入失敗時，退回 Canvas 即時繪製（快取），所以任意新字串都能顯示。
 * 用法：Brush.text(ctx, '九龍破', x, y, 64, { style:'gold', align:'center' }) */
(function (G) {
  'use strict';
  var EM = 96, atlas = null, cache = {}, FONT = '"Noto Serif TC","Noto Serif CJK TC","Source Han Serif TC","Songti TC","PMingLiU",serif';
  var STY = {
    gold: { top: '#fff6c0', mid: '#ffc93a', bot: '#d8741a', line: '#2a0d08', glow: '#ff9a2a' },
    red: { top: '#ffd0c0', mid: '#ff4a38', bot: '#a01418', line: '#240606', glow: '#ff3a2a' },
    white: { top: '#ffffff', mid: '#eef2ff', bot: '#aab8dc', line: '#0c1230', glow: '#8ab4ff' },
    cyan: { top: '#e0ffff', mid: '#5ae8e0', bot: '#1a8aa0', line: '#06242e', glow: '#3af0d0' },
    ink: { top: '#5a5a66', mid: '#262630', bot: '#0a0a12', line: '#f4f0e0', glow: '#000000' }
  };
  function seeded(s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { var h = 7, i; for (i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function render(str, style, em) {
    var st = STY[style] || STY.gold, rnd = seeded(hash(str + style)), pad = em * .3, ch = str.split(''), c0 = G.document.createElement('canvas'), x = c0.getContext('2d');
    x.font = '900 ' + em + 'px ' + FONT; var w = 0, i, ws = []; for (i = 0; i < ch.length; i++) { ws[i] = x.measureText(ch[i]).width * .94; w += ws[i]; }
    c0.width = Math.ceil(w + pad * 2); c0.height = Math.ceil(em * 1.5 + pad); x = c0.getContext('2d'); x.font = '900 ' + em + 'px ' + FONT; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
    var cx = pad, by = em * 1.05 + pad * .5, pos = [];
    for (i = 0; i < ch.length; i++) { pos.push({ c: ch[i], x: cx + ws[i] / 2, y: by + (rnd() - .5) * em * .08, r: (rnd() - .5) * .1 }); cx += ws[i]; }
    function pass(fn) { pos.forEach(function (p) { x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.transform(1, 0, -.1, 1, 0, 0); x.textAlign = 'center'; fn(p); x.restore(); }); }
    x.shadowColor = st.glow; x.shadowBlur = em * .22; x.strokeStyle = st.line; x.lineWidth = em * .2; pass(function (p) { x.strokeText(p.c, 0, 0); }); x.shadowBlur = 0;
    x.strokeStyle = st.line; x.lineWidth = em * .13; x.globalAlpha = 1; pass(function (p) { x.strokeText(p.c, 0, 0); });
    var g = x.createLinearGradient(0, by - em * .85, 0, by + em * .1); g.addColorStop(0, st.top); g.addColorStop(.45, st.mid); g.addColorStop(1, st.bot); x.fillStyle = g; pass(function (p) { x.fillText(p.c, 0, 0); });
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .18; x.fillStyle = '#000'; for (i = 0; i < 60; i++) { x.fillRect(rnd() * c0.width, rnd() * c0.height, 1 + rnd() * 6, 1); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return c0;
  }
  var Brush = {
    STY: STY, FONT: FONT,
    clear: function () { cache = {}; },
    load: function (base) {
      try {
        var xhr = new G.XMLHttpRequest(); xhr.open('GET', base + 'brush.json'); xhr.onload = function () {
          try { var j = JSON.parse(xhr.responseText), img = new G.Image(); img.onload = function () { atlas = { img: img, f: j.frames, em: j.em || EM }; }; img.src = base + 'brush.png'; } catch (e) {}
        }; xhr.send();
      } catch (e) {}
    },
    /* 取得繪製來源與尺寸 */
    get: function (str, style, size) {
      var key = style + '|' + str, f = atlas && atlas.f[key];
      if (f) return { img: atlas.img, sx: f.x, sy: f.y, sw: f.w, sh: f.h, k: size / atlas.em };
      var q = Math.max(24, Math.round(size / 8) * 8), ck = key + '|' + q, cv = cache[ck] || (cache[ck] = render(str, style, q));
      return { img: cv, sx: 0, sy: 0, sw: cv.width, sh: cv.height, k: size / q };
    },
    width: function (str, style, size) { var g = this.get(str, style || 'gold', size); return g.sw * g.k; },
    text: function (c, str, x, y, size, o) {
      o = o || {}; var g = this.get(str, o.style || 'gold', size), w = g.sw * g.k, h = g.sh * g.k, ax = o.align === 'left' ? 0 : o.align === 'right' ? w : w / 2;
      c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot); if (o.scale) c.scale(o.scale, o.scale); if (o.alpha != null) c.globalAlpha = o.alpha;
      c.drawImage(g.img, g.sx, g.sy, g.sw, g.sh, -ax, -h * .66, w, h); c.restore();
    }
  };
  G.Brush = Brush;
})(window);
