/* LoadScene — 載入畫面：開機預載與「進對戰前載入角色圖集」共用。有進度條與小提示，逾時（6 秒）就放行，缺圖時角色改用程式繪製。 */
(function (G) {
  'use strict';
  var W = CFG.W, H = CFG.H, UI = G.UI;
  var TIPS = ['防禦太久會「防禦崩潰」，對手就能痛打你一頓', '氣量滿 30 就能用 EX 必殺：無敵起手、傷害更高', '被對手一直壓著打？試試跳起來、投技或反制技', '手 + 腳同時按＝投技，擋住也沒用', '後方 + 蹲下＝防下段，後方站立＝防中段', '對手倒地時，貼近他準備起身攻擊', '設定裡可以開啟「簡易模式」，用按鈕直接發必殺'];
  function LoadScene(game, o) { this.game = game; this.o = o; }
  var L = LoadScene.prototype;
  L.enter = function () {
    var me = this; this.t = 0; this.k = 0; this.tip = TIPS[(Math.random() * TIPS.length) | 0]; this.left = 0; this.total = (this.o.ids || []).length || 1; this.fin = false;
    G.FTouch && G.FTouch.show(null);
    (this.o.ids || []).forEach(function (id) { me.left++; G.Sprites.ensure(id, function () { me.left--; }); });
    if (this.o.boot) { this.left++; this.total++; var d = function () { me.left--; }; if (G.document.fonts && G.document.fonts.ready) G.document.fonts.ready.then(d, d); else d(); }
  };
  L.exit = function () {};
  L.update = function () {
    this.t++; var tgt = this.total ? 1 - this.left / this.total : 1; this.k += (tgt - this.k) * .15;
    if (!this.fin && ((this.left <= 0 && this.t > (this.o.min || 20)) || this.t > 360)) { this.fin = true; var cb = this.o.next; cb && cb(); }
  };
  L.pointer = function () {};
  L.draw = function (c) {
    var t = this.t / 60, g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0a1c'); g.addColorStop(1, '#1d1230'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 18; i++) { c.fillStyle = 'rgba(255,200,90,' + (.04 + (i % 3) * .02) + ')'; c.fillRect(((i * 97 + t * 40) % (W + 80)) - 40, 0, 3 + (i % 4), H); }
    UI.text(c, '台北格鬥風雲', W / 2, 200, 74, '#ffd870', 'center', { weight: 900, stroke: '#2a0d08', sw: 8 });
    var bw = 420, bx = (W - bw) / 2, by = 300; c.fillStyle = 'rgba(255,255,255,.12)'; UI.rr(c, bx, by, bw, 14, 7); c.fill();
    c.fillStyle = '#ffd24a'; UI.rr(c, bx, by, Math.max(14, bw * Math.min(1, this.k)), 14, 7); c.fill();
    UI.text(c, '載入中' + '…'.slice(0, 1 + ((t * 2) | 0) % 3) + '  ' + Math.round(Math.min(1, this.k) * 100) + '%', W / 2, by + 36, 18, '#ffe8a0', 'center', { weight: 800 });
    UI.text(c, '小提示：' + this.tip, W / 2, 430, 17, 'rgba(230,236,255,.85)', 'center');
  };
  G.LoadScene = LoadScene;
})(window);
