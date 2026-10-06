/* CanvasPen — 人物繪製用的畫筆。所有座標為畫面座標（y 向下），顏色為 0xRRGGBB。
 * 戰鬥、選角肖像、招式表都用同一份繪製程式碼。 */
(function (G) {
  'use strict';
  function css(n, a) { return a == null || a >= 1 ? '#' + ('000000' + (n >>> 0).toString(16)).slice(-6) : 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function CanvasPen(c) { this.c = c; c.lineCap = 'round'; c.lineJoin = 'round'; }
  CanvasPen.prototype = {
    line: function (x1, y1, x2, y2, w, col, a) { var c = this.c; c.strokeStyle = css(col, a); c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); },
    polyline: function (p, w, col, a) { var c = this.c, i; c.strokeStyle = css(col, a); c.lineWidth = w; c.beginPath(); c.moveTo(p[0], p[1]); for (i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); },
    circle: function (x, y, r, col, a) { var c = this.c; c.fillStyle = css(col, a); c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, 6.2832); c.fill(); },
    ellipse: function (x, y, rx, ry, col, a) { var c = this.c; c.fillStyle = css(col, a); c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, 6.2832); c.fill(); },
    poly: function (p, col, a) { var c = this.c, i; c.fillStyle = css(col, a); c.beginPath(); c.moveTo(p[0], p[1]); for (i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); },
    rect: function (x, y, w, h, col, a) { this.c.fillStyle = css(col, a); this.c.fillRect(x, y, w, h); }
  };
  G.CanvasPen = CanvasPen; G.cssColor = css;
})(window);
