/* Stage — 八個台北場景（程式繪製、啟動時預繪成 4 層）：
 *   sky（不動）/ far（視差 0.3）/ mid（視差 0.6）/ near（視差 1.0：地面與近景）+ 逐幀動畫（霓虹閃爍、燈籠、蒸氣、列車…）
 * Stage.make(i).draw(ctx, camX, t)；GROUND=470 為角色腳底線，地面從 y=440 起。 */
(function (G) {
  'use strict';
  var W = 960, H = 540, SW = 1500, FY = 440;
  var PAR = { far: .3, mid: .6 };
  function seeded(s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function mk(w, h) { var c = G.document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function lg(c, y0, y1, stops) { var g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function hex(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }
  function windows(c, x, y, w, h, rnd, lit, dark, gx, gy, p) {
    gx = gx || 12; gy = gy || 14; var i, j; for (j = y + 8; j < y + h - 10; j += gy) for (i = x + 6; i < x + w - 8; i += gx) { c.fillStyle = rnd() < (p == null ? .55 : p) ? lit : dark; c.fillRect(i, j, gx * .5, gy * .55); }
  }
  function skyline(c, w, base, rnd, hmin, hmax, wmin, wmax, cols, lit, dark) {
    var x = -20, bw, bh; while (x < w) { bw = wmin + rnd() * (wmax - wmin); bh = hmin + rnd() * (hmax - hmin); c.fillStyle = cols[(rnd() * cols.length) | 0]; c.fillRect(x, base - bh, bw, bh); if (lit) windows(c, x, base - bh, bw, bh, rnd, lit, dark); x += bw + rnd() * 6; }
  }
  function glowText(c, s, x, y, size, col, vertical) {
    c.save(); c.font = '900 ' + size + 'px "Noto Sans TC","PingFang TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = col; c.shadowBlur = 14; c.fillStyle = '#fff'; c.strokeStyle = col; c.lineWidth = 3;
    if (vertical) { for (var i = 0; i < s.length; i++) { c.strokeText(s[i], x, y + i * size * 1.05); c.fillText(s[i], x, y + i * size * 1.05); } } else { c.strokeText(s, x, y); c.fillText(s, x, y); } c.restore();
  }
  function tiles(c, w, y0, y1, col1, col2, tw, line) {
    c.fillStyle = lg(c, y0, y1, [[0, col1], [1, col2]]); c.fillRect(0, y0, w, y1 - y0); c.strokeStyle = line; c.lineWidth = 1.5; c.globalAlpha = .35;
    var x, y; for (x = -((y1 - y0) * .9); x < w + 200; x += tw) { c.beginPath(); c.moveTo(x + (y1 - y0) * .9 * ((x % 2) ? 1 : 1), y1); c.lineTo(x + tw / 2 + 0, y0); c.stroke(); }
    for (y = y0 + 12; y < y1; y += 18 + (y - y0) * .15) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.globalAlpha = 1;
  }
  function lamp(c, x, base, col, h) { c.fillStyle = '#20202a'; c.fillRect(x - 3, base - h, 6, h); c.fillRect(x - 3, base - h, 22, 5); c.fillStyle = col; c.beginPath(); c.arc(x + 18, base - h + 10, 8, 0, 6.3); c.fill(); }

  /* 每個場景：build(L,rnd) 在 L.sky/far/mid/near 四個 context 上繪製；anim(c,camX,t,S) 逐幀動畫 */
  var DEFS = [];
  DEFS[0] = { name: '西門町', place: '電影街霓虹夜', bgm: 'st0', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#120a30'], [.5, '#4a1a6e'], [.85, '#b83a7a'], [1, '#e86a8a']]); c.fillRect(0, 0, W, H);
    for (var i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,' + (.2 + r() * .5) + ')'; c.fillRect(r() * W, r() * 200, 2, 2); }
    skyline(L.far, 1122, FY, r, 150, 300, 50, 110, ['#26124a', '#31175a', '#3a1c66'], '#ffd98a', '#40206a');
    var m = L.mid, x = -10, signs = S.signs = [], names = ['西門', '紅樓', '電影', '潮流', '動漫', '鹽酥雞', '手搖', '服飾', 'KTV'], cols = ['#ff3a9a', '#3af0ff', '#ffe83a', '#9a5aff', '#3aff9a'], k = 0;
    while (x < 1284) { var bw = 130 + r() * 90, bh = 210 + r() * 90; m.fillStyle = ['#1c1038', '#241446', '#2a1a52'][k % 3]; m.fillRect(x, FY - bh, bw, bh); windows(m, x, FY - bh, bw, bh - 90, r, '#ffe0a0', '#2c1a52', 14, 16, .4);
      var col = cols[k % 5]; m.fillStyle = '#10081f'; m.fillRect(x + 8, FY - 90, bw - 16, 70); glowText(m, names[k % names.length], x + bw / 2, FY - 55, 36, col); signs.push({ x: x, y: FY - 90, w: bw, h: 70, c: col, p: r() * 6 });
      if (k % 2) { glowText(m, names[(k + 3) % names.length], x + bw - 16, FY - bh + 20, 20, cols[(k + 2) % 5], true); } x += bw + 8; k++; }
    tiles(L.near, SW, FY, H, '#413a58', '#2a2540', 90, '#7a6ab0'); for (i = 0; i < 6; i++) { L.near.fillStyle = ['#ff3a9a', '#3af0ff', '#ffe83a'][i % 3]; L.near.globalAlpha = .5; L.near.fillRect(150 + i * 250, FY + 30, 120, 6); L.near.globalAlpha = 1; }
    lamp(L.near, 60, FY + 20, '#ffd98a', 200); lamp(L.near, SW - 80, FY + 20, '#ffd98a', 200);
  }, anim: function (c, camX, t, S) { var m = -camX * PAR.mid; S.signs.forEach(function (s) { var a = .1 + .16 * Math.max(0, Math.sin(t * 4 + s.p) * Math.sin(t * 1.3 + s.p)); c.fillStyle = s.c; c.globalAlpha = a; c.fillRect(m + s.x, s.y, s.w, s.h); c.globalAlpha = 1; }); } };

  DEFS[1] = { name: '艋舺夜市', place: '龍山寺旁的夜晚', bgm: 'st1', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#06102a'], [.6, '#18285a'], [1, '#5a3a5a']]); c.fillRect(0, 0, W, H);
    var f = L.far; f.fillStyle = '#10142e'; f.fillRect(0, FY - 90, 1122, 90);                                  // 龍山寺剪影
    function roof(x, y, w, h) { f.fillStyle = '#1a1f40'; f.beginPath(); f.moveTo(x - 24, y); f.quadraticCurveTo(x + 10, y + 6, x + w * .1, y - h * .3); f.lineTo(x + w * .3, y - h); f.lineTo(x + w * .7, y - h); f.lineTo(x + w * .9, y - h * .3); f.quadraticCurveTo(x + w - 10, y + 6, x + w + 24, y); f.closePath(); f.fill(); f.fillRect(x + 4, y, w - 8, 36); }
    roof(300, FY - 120, 360, 90); roof(380, FY - 210, 200, 70); roof(180, FY - 90, 130, 50); roof(650, FY - 90, 130, 50); f.fillStyle = '#ffb04a'; for (var i = 0; i < 14; i++) f.fillRect(330 + i * 22, FY - 118, 6, 14);
    var m = L.mid, x = -10, k = 0, names = ['鹽酥雞', '臭豆腐', '滷肉飯', '青草茶', '蚵仔煎', '蔥油餅', '涼麵', '豆花'];
    while (x < 1284) { var bw = 150 + r() * 40; m.fillStyle = '#251830'; m.fillRect(x, FY - 220, bw, 220);
      for (var s = 0; s < bw; s += 20) { m.fillStyle = (s / 20 + k) % 2 ? '#d8352a' : '#f4ead8'; m.beginPath(); m.moveTo(x + s, FY - 120); m.lineTo(x + s + 20, FY - 120); m.lineTo(x + s + 24, FY - 90); m.lineTo(x + s + 4, FY - 90); m.fill(); }
      m.fillStyle = '#ffd98a'; m.fillRect(x + 12, FY - 190, bw - 24, 44); m.fillStyle = '#7a1a10'; m.font = '900 30px "Noto Sans TC",sans-serif'; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(names[k % names.length], x + bw / 2, FY - 168);
      m.fillStyle = '#3a2430'; m.fillRect(x + 8, FY - 86, bw - 16, 60); for (var b = 0; b < 5; b++) { m.fillStyle = '#fff2b0'; m.beginPath(); m.arc(x + 20 + b * (bw - 40) / 4, FY - 112 + (b % 2) * 6, 5, 0, 6.3); m.fill(); } x += bw + 6; k++; }
    var n = L.near; n.fillStyle = lg(n, FY, H, [[0, '#2a2438'], [1, '#14101e']]); n.fillRect(0, FY, SW, H - FY); n.strokeStyle = 'rgba(255,180,90,.22)'; n.lineWidth = 6;
    for (i = 0; i < 12; i++) { n.beginPath(); n.moveTo(60 + i * 130, FY + 4); n.lineTo(40 + i * 130 - 20, H); n.stroke(); }
    S.lants = []; for (i = 0; i < 18; i++) S.lants.push({ x: 40 + i * 85, y: 18 + (i % 3) * 18, p: r() * 6 });
  }, anim: function (c, camX, t, S) {
    var m = -camX * .8; c.strokeStyle = '#3a2420'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 40); c.lineTo(W, 40); c.stroke();
    S.lants.forEach(function (l) { var x = m + l.x * 1.0, sw = Math.sin(t * 1.6 + l.p) * 5; x = ((x % 1500) + 1500) % 1500 - 100; if (x > W + 40) return; c.strokeStyle = '#3a2420'; c.beginPath(); c.moveTo(x, 40); c.lineTo(x + sw, l.y + 40); c.stroke();
      var g = c.createRadialGradient(x + sw, l.y + 58, 2, x + sw, l.y + 58, 40); g.addColorStop(0, 'rgba(255,170,60,.45)'); g.addColorStop(1, 'rgba(255,170,60,0)'); c.fillStyle = g; c.fillRect(x + sw - 40, l.y + 18, 80, 80);
      c.fillStyle = '#d8352a'; c.beginPath(); c.ellipse(x + sw, l.y + 58, 14, 18, 0, 0, 6.3); c.fill(); c.fillStyle = '#ffd24a'; c.fillRect(x + sw - 6, l.y + 38, 12, 4); c.fillRect(x + sw - 6, l.y + 74, 12, 4); });
    var i; for (i = 0; i < 8; i++) { var px = ((i * 197 + t * 14 - camX * .9) % 1100 + 1100) % 1100 - 80, py = 410 - ((t * 30 + i * 53) % 120); c.fillStyle = 'rgba(255,255,255,' + (.14 - ((t * 30 + i * 53) % 120) / 1000) + ')'; c.beginPath(); c.arc(px, py, 14 + ((t * 30 + i * 53) % 120) * .15, 0, 6.3); c.fill(); }
  } };

  DEFS[2] = { name: '迪化街', place: '百年南北貨老街', bgm: 'st2', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#f0a860'], [.5, '#fbd8a0'], [1, '#fff0d0']]); c.fillRect(0, 0, W, H);
    skyline(L.far, 1122, FY, r, 130, 220, 70, 130, ['#b8885a', '#a87850', '#c89a68'], '#7a5030', '#8a6038');
    var m = L.mid, x = -10, k = 0, names = ['南北貨', '茶行', '中藥行', '布莊', '干貝', '香料'];
    while (x < 1284) { var bw = 170 + r() * 40, bh = 230 + r() * 40, col = ['#9a3a2a', '#b0502e', '#8a3226'][k % 3]; m.fillStyle = col; m.fillRect(x, FY - bh, bw, bh);
      m.fillStyle = '#e8d4a8'; m.fillRect(x, FY - bh, bw, 18); m.beginPath(); m.moveTo(x, FY - bh); m.lineTo(x + bw / 2, FY - bh - 36); m.lineTo(x + bw, FY - bh); m.fill();
      for (var a = 0; a < 3; a++) { var ax = x + 16 + a * (bw - 20) / 3; m.fillStyle = '#3a2418'; m.beginPath(); m.moveTo(ax, FY - bh + 90); m.lineTo(ax, FY - bh + 62); m.arc(ax + 17, FY - bh + 62, 17, Math.PI, 0); m.lineTo(ax + 34, FY - bh + 90); m.fill(); m.fillStyle = '#e8d4a8'; m.fillRect(ax + 6, FY - bh + 62, 22, 3); }
      m.fillStyle = '#4a2a18'; m.fillRect(x + 10, FY - 150, bw - 20, 100); m.fillStyle = '#f2d890'; m.font = '900 34px "Noto Serif TC","Noto Sans TC",serif'; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(names[k % names.length], x + bw / 2, FY - 100);
      m.fillStyle = '#2a1810'; m.fillRect(x + 20, FY - 40, bw - 40, 40); x += bw + 4; k++; }
    tiles(L.near, SW, FY, H, '#b09a7a', '#8a7658', 100, '#5a4630'); lamp(L.near, 90, FY + 20, '#fff0b0', 180);
    S.ban = []; for (var i = 0; i < 9; i++) S.ban.push({ x: 60 + i * 170, p: r() * 6, c: i % 2 ? '#d8352a' : '#f2c14e' });
  }, anim: function (c, camX, t, S) { var m = -camX * .75; S.ban.forEach(function (b) { var x = ((m + b.x) % 1500 + 1500) % 1500 - 100; if (x > W + 40) return; var sw = Math.sin(t * 2 + b.p) * 4; c.fillStyle = b.c; c.beginPath(); c.moveTo(x, 70); c.lineTo(x + 26, 70); c.lineTo(x + 26 + sw, 140); c.lineTo(x + 13 + sw, 128); c.lineTo(x + sw, 140); c.fill(); c.fillStyle = '#6a3a18'; c.fillRect(x - 2, 66, 30, 5); }); } };

  DEFS[3] = { name: '信義區', place: '101 下的黃昏', bgm: 'st3', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#18286a'], [.45, '#8a4a8a'], [.8, '#ff8a5a'], [1, '#ffc88a']]); c.fillRect(0, 0, W, H);
    var f = L.far; skyline(f, 1122, FY, r, 120, 240, 50, 90, ['#3a3a7a', '#44448a'], '#ffe8a0', '#4a4a90');
    var tx = 600, seg = 8, i; f.fillStyle = '#2a4a8a'; f.fillRect(tx - 2, FY - 520, 4, 90);                    // 101
    for (i = 0; i < seg; i++) { var w = 66 - i * 0 + (i % 2) * 8, y = FY - 70 - i * 44; f.fillStyle = i % 2 ? '#3a6aaa' : '#4a7aba'; f.beginPath(); f.moveTo(tx - 34, y); f.lineTo(tx - 42, y - 44); f.lineTo(tx + 42, y - 44); f.lineTo(tx + 34, y); f.closePath(); f.fill(); f.fillStyle = 'rgba(255,255,255,.25)'; f.fillRect(tx - 36, y - 44, 6, 44); }
    f.fillStyle = '#3a6aaa'; f.fillRect(tx - 48, FY - 70, 96, 70); f.fillStyle = '#1a3a6a'; f.fillRect(tx - 24, FY - 440, 48, 16);
    var m = L.mid, x = -10; while (x < 1284) { var bw = 90 + r() * 70, bh = 180 + r() * 150; m.fillStyle = lg(m, FY - bh, FY, [[0, '#5a7ab0'], [1, '#2a3a6a']]); m.fillRect(x, FY - bh, bw, bh); m.strokeStyle = 'rgba(255,255,255,.18)'; m.lineWidth = 1; for (var gx = x; gx < x + bw; gx += 12) { m.beginPath(); m.moveTo(gx, FY - bh); m.lineTo(gx, FY); m.stroke(); } windows(m, x, FY - bh, bw, bh, r, '#ffe8a0', 'rgba(20,30,70,.4)', 12, 16, .3); x += bw + 10 + r() * 20; }
    tiles(L.near, SW, FY, H, '#c4c0d0', '#8a88a0', 110, '#6a688a'); L.near.fillStyle = '#7ab0e0'; L.near.globalAlpha = .35; L.near.fillRect(600, FY + 24, 300, 50); L.near.globalAlpha = 1;
    lamp(L.near, 80, FY + 20, '#fff0c0', 200); lamp(L.near, SW - 80, FY + 20, '#fff0c0', 200);
  }, anim: function (c, camX, t) { var x = 600 - camX * .3, hue = (t * 40) | 0; c.fillStyle = 'hsla(' + hue % 360 + ',90%,65%,.7)'; for (var i = 0; i < 8; i++) c.fillRect(x - 36, 440 - 70 - i * 44 - 4, 72, 3); c.fillStyle = 'hsla(' + hue % 360 + ',100%,70%,' + (.5 + .4 * Math.sin(t * 3)) + ')'; c.beginPath(); c.arc(x, 440 - 522, 5, 0, 6.3); c.fill(); } };

  DEFS[4] = { name: '北投溫泉', place: '煙霧繚繞的湯屋', bgm: 'st4', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#0a2a3a'], [.6, '#1a5a6a'], [1, '#4a8a8a']]); c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(760, 90, 38, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,246,208,.15)'; c.beginPath(); c.arc(760, 90, 80, 0, 6.3); c.fill();
    var f = L.far, layers = [['#16444e', 200], ['#1a5058', 150]]; layers.forEach(function (l, li) { f.fillStyle = l[0]; f.beginPath(); f.moveTo(0, FY); for (var x = 0; x <= 1122; x += 40) f.lineTo(x, FY - l[1] - Math.sin(x * .012 + li * 2) * 50 - r() * 18); f.lineTo(1122, FY); f.fill(); });
    var m = L.mid; for (var i = 0; i < 9; i++) { var px = 20 + i * 150 + r() * 40, ph = 90 + r() * 70; m.fillStyle = '#0e3a2e'; m.fillRect(px - 4, FY - ph, 8, ph); for (var j = 0; j < 4; j++) { m.beginPath(); m.moveTo(px - 40 + j * 4, FY - ph + j * 26 + 30); m.lineTo(px, FY - ph + j * 26 - 10); m.lineTo(px + 40 - j * 4, FY - ph + j * 26 + 30); m.fill(); } }
    m.fillStyle = '#5a3a28'; m.fillRect(430, FY - 160, 380, 160); m.fillStyle = '#2a1a14'; m.beginPath(); m.moveTo(400, FY - 160); m.quadraticCurveTo(620, FY - 230, 840, FY - 160); m.lineTo(820, FY - 140); m.lineTo(420, FY - 140); m.fill();
    m.fillStyle = '#ffe0a0'; for (i = 0; i < 4; i++) m.fillRect(460 + i * 90, FY - 120, 50, 70); m.fillStyle = '#d8352a'; m.fillRect(600, FY - 200, 40, 26); m.fillStyle = '#fff'; m.font = '900 18px "Noto Sans TC",sans-serif'; m.textAlign = 'center'; m.fillText('湯', 620, FY - 181);
    tiles(L.near, SW, FY, H, '#58606a', '#383e48', 100, '#8a929a'); var n = L.near; n.fillStyle = lg(n, FY + 10, FY + 60, [[0, '#6adad0'], [1, '#2a9aa0']]); n.fillRect(0, FY + 6, 400, 54); n.fillRect(1120, FY + 6, 380, 54); n.strokeStyle = '#a8b0b8'; n.lineWidth = 6; n.strokeRect(-6, FY + 6, 406, 54); n.strokeRect(1120, FY + 6, 386, 54);
    S.puff = []; for (i = 0; i < 26; i++) S.puff.push({ x: r() * SW, o: r() * 8 });
  }, anim: function (c, camX, t, S) { S.puff.forEach(function (p) { var k = ((t * .18 + p.o) % 1), x = p.x - camX + Math.sin(t + p.o) * 14, y = 460 - k * 360; if (x < -60 || x > W + 60) return; c.fillStyle = 'rgba(235,250,250,' + (.22 * (1 - k)) + ')'; c.beginPath(); c.arc(x, y, 22 + k * 40, 0, 6.3); c.fill(); }); } };

  DEFS[5] = { name: '淡水老街', place: '夕陽下的河岸', bgm: 'st5', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#3a3a7a'], [.35, '#e86a5a'], [.62, '#ffb860'], [1, '#ffe0a0']]); c.fillRect(0, 0, W, H);
    var g = c.createRadialGradient(660, 270, 10, 660, 270, 140); g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(.3, 'rgba(255,200,100,.7)'); g.addColorStop(1, 'rgba(255,160,80,0)'); c.fillStyle = g; c.fillRect(380, 100, 560, 340);
    var f = L.far; f.fillStyle = '#2a2a58'; f.beginPath(); f.moveTo(0, 300); for (var x = 0; x <= 1122; x += 30) f.lineTo(x, 270 - Math.max(0, 90 - Math.abs(x - 300) * .3) - Math.sin(x * .02) * 6); f.lineTo(1122, 300); f.fill();   // 觀音山
    f.fillStyle = lg(f, 300, FY, [[0, '#e8905a'], [1, '#4a5a9a']]); f.fillRect(0, 300, 1122, FY - 300);
    for (var i = 0; i < 3; i++) { var bx = 150 + i * 340, by = 340 + i * 14; f.fillStyle = '#1a1a3a'; f.beginPath(); f.moveTo(bx, by); f.lineTo(bx + 60, by); f.lineTo(bx + 46, by + 12); f.lineTo(bx + 10, by + 12); f.fill(); f.beginPath(); f.moveTo(bx + 30, by - 50); f.lineTo(bx + 30, by); f.lineTo(bx + 52, by); f.fill(); }
    var m = L.mid, xx = -10, k = 0, names = ['魚丸', '鐵蛋', '阿給', '蝦捲', '酸梅湯', '魚酥']; while (xx < 1284) { var bw = 160 + r() * 40, bh = 150 + r() * 60; m.fillStyle = ['#7a4a38', '#8a5a40', '#6a4030'][k % 3]; m.fillRect(xx, FY - bh, bw, bh); m.fillStyle = '#3a2218'; m.fillRect(xx - 4, FY - bh - 8, bw + 8, 12);
      m.fillStyle = '#f4e0b0'; m.fillRect(xx + 14, FY - 100, bw - 28, 56); m.fillStyle = '#7a2a18'; m.font = '900 30px "Noto Sans TC",sans-serif'; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(names[k % names.length], xx + bw / 2, FY - 72);
      windows(m, xx, FY - bh, bw, bh - 110, r, '#ffd890', '#3a2218', 22, 20, .5); xx += bw + 6; k++; }
    var n = L.near; for (i = 0; i < SW; i += 50) { n.fillStyle = (i / 50) % 2 ? '#9a7048' : '#8a6038'; n.fillRect(i, FY, 50, H - FY); } n.fillStyle = 'rgba(0,0,0,.25)'; for (i = FY + 16; i < H; i += 22) n.fillRect(0, i, SW, 2);
    n.fillStyle = '#5a3a20'; n.fillRect(0, FY - 6, SW, 8);
  }, anim: function (c, camX, t) { c.fillStyle = 'rgba(255,230,160,.4)'; for (var i = 0; i < 18; i++) { var x = ((i * 70 + Math.sin(t * 2 + i) * 20) - camX * .3) % 1100; c.fillRect(((x % 1100) + 1100) % 1100 - 40, 310 + (i % 5) * 20 + Math.sin(t * 3 + i) * 2, 20 + (i % 3) * 8, 2); }
    for (i = 0; i < 3; i++) { var gx = ((t * 40 + i * 400) % 1300) - 150, gy = 120 + i * 30 + Math.sin(t * 2 + i) * 10; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(gx - 10, gy); c.quadraticCurveTo(gx - 5, gy - 6 + Math.sin(t * 12 + i) * 5, gx, gy); c.quadraticCurveTo(gx + 5, gy - 6 + Math.sin(t * 12 + i) * 5, gx + 10, gy); c.stroke(); } } };

  DEFS[6] = { name: '捷運月台', place: '末班車進站前', bgm: 'st6', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#14161e'], [1, '#2a2e3a']]); c.fillRect(0, 0, W, H); c.fillStyle = '#e8f0ff'; for (var i = 0; i < 5; i++) { c.globalAlpha = .85; c.fillRect(40 + i * 200, 30, 120, 10); c.globalAlpha = .12; c.fillRect(30 + i * 200, 40, 140, 160); } c.globalAlpha = 1;
    var f = L.far; f.fillStyle = '#20242e'; f.fillRect(0, 160, 1122, 280); f.fillStyle = '#3a4050'; for (i = 0; i < 1122; i += 40) f.fillRect(i, 160, 38, 120); f.fillStyle = '#10121a'; f.fillRect(0, 330, 1122, 110); f.fillStyle = '#5a6070'; f.fillRect(0, 436, 1122, 4); f.fillStyle = '#6a7080'; for (i = 0; i < 1122; i += 24) f.fillRect(i, 400, 2, 36);
    var m = L.mid, names = ['台北車站', '忠孝復興', '西門', '中山'], cols = ['#e3002c', '#0070bd', '#008659', '#f8b61c'];
    for (i = 0; i < 5; i++) { var px = 60 + i * 280; m.fillStyle = '#c8ccd4'; m.fillRect(px, 40, 70, 400); m.fillStyle = 'rgba(0,0,0,.18)'; m.fillRect(px + 52, 40, 18, 400); m.fillStyle = cols[i % 4]; m.fillRect(px, 250, 70, 14);
      m.fillStyle = '#101820'; m.fillRect(px + 100, 110, 140, 70); m.fillStyle = '#fff'; m.font = '900 26px "Noto Sans TC",sans-serif'; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(names[i % 4], px + 170, 138); m.fillStyle = cols[i % 4]; m.fillRect(px + 100, 168, 140, 8);
      m.fillStyle = '#2a3a5a'; m.fillRect(px + 110, 270, 120, 100); m.fillStyle = '#8ac0ff'; m.fillRect(px + 118, 278, 104, 84); }
    var n = L.near; tiles(n, SW, FY, H, '#b8bcc4', '#8a8e98', 110, '#6a6e78'); n.fillStyle = '#f8c81c'; n.fillRect(0, FY + 4, SW, 8); n.fillStyle = '#d8a810'; for (i = 0; i < SW; i += 18) n.fillRect(i, FY + 4, 8, 8);
  }, anim: function (c, camX, t) { var cyc = t % 16; if (cyc < 5) { var x = -700 + cyc / 5 * 2000 - camX * .3; c.fillStyle = '#d8dce8'; c.fillRect(x, 300, 640, 120); c.fillStyle = '#3a4a6a'; c.fillRect(x, 330, 640, 36); c.fillStyle = '#ffe8a0'; for (var i = 0; i < 8; i++) c.fillRect(x + 14 + i * 78, 336, 56, 24); c.fillStyle = '#0070bd'; c.fillRect(x, 392, 640, 10); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x - 40, 300, 40, 120); } } };

  DEFS[7] = { name: '總統府', place: '最終決戰・凱達格蘭大道', bgm: 'st7', build: function (L, r, S) {
    var c = L.sky; c.fillStyle = lg(c, 0, H, [[0, '#14061c'], [.5, '#5a1a3a'], [.85, '#c8402a'], [1, '#e8803a']]); c.fillRect(0, 0, W, H); for (var i = 0; i < 50; i++) { c.fillStyle = 'rgba(255,255,255,' + (.15 + r() * .4) + ')'; c.fillRect(r() * W, r() * 180, 2, 2); }
    var f = L.far; skyline(f, 1122, FY, r, 90, 180, 60, 110, ['#2a1030', '#331238'], '#ffb870', '#3a1640');
    var m = L.mid, bx = 40, bw = 1200, by = FY - 220; m.fillStyle = '#8a2e22'; m.fillRect(bx, by, bw, 220); m.fillStyle = '#e8d8c0'; m.fillRect(bx, by, bw, 14); m.fillRect(bx, FY - 14, bw, 14);
    for (i = 0; i < 18; i++) { var wx = bx + 24 + i * 65; if (Math.abs(wx - (bx + bw / 2)) < 130) continue; m.fillStyle = '#3a1410'; m.fillRect(wx, by + 40, 30, 60); m.fillRect(wx, by + 130, 30, 60); m.fillStyle = '#ffd890'; m.fillRect(wx + 4, by + 44, 22, 52); m.fillRect(wx + 4, by + 134, 22, 52); m.fillStyle = '#e8d8c0'; m.fillRect(wx - 3, by + 36, 36, 5); }
    var cx = bx + bw / 2; m.fillStyle = '#9a3626'; m.fillRect(cx - 110, by - 90, 220, 310); m.fillStyle = '#e8d8c0'; m.fillRect(cx - 116, by - 96, 232, 12); m.fillRect(cx - 116, by + 200, 232, 20);
    m.fillStyle = '#8a2e22'; m.fillRect(cx - 52, by - 300, 104, 214); m.fillStyle = '#e8d8c0'; m.fillRect(cx - 58, by - 306, 116, 12); m.fillRect(cx - 58, by - 120, 116, 8);
    m.fillStyle = '#b84a30'; m.beginPath(); m.moveTo(cx - 70, by - 306); m.lineTo(cx, by - 380); m.lineTo(cx + 70, by - 306); m.fill(); m.fillStyle = '#ffd890'; for (i = 0; i < 3; i++) m.fillRect(cx - 40 + i * 32, by - 270, 16, 40);
    for (i = 0; i < 5; i++) { m.fillStyle = '#f4ead8'; m.fillRect(cx - 95 + i * 40, by + 100, 12, 100); } m.fillStyle = '#3a1410'; m.fillRect(cx - 40, by + 120, 80, 100); m.fillStyle = '#e8d8c0'; m.font = '900 20px "Noto Serif TC",serif'; m.textAlign = 'center'; m.fillText('總統府', cx, by + 90);
    var n = L.near; n.fillStyle = lg(n, FY, H, [[0, '#2a2028'], [1, '#14101a']]); n.fillRect(0, FY, SW, H - FY); n.fillStyle = '#e8d8c0'; for (i = 0; i < SW; i += 120) n.fillRect(i, FY + 62, 60, 5); n.fillStyle = '#c8402a'; n.globalAlpha = .5; n.fillRect(0, FY + 90, SW, 4); n.globalAlpha = 1;
    S.cx = cx; S.by = by;
  }, anim: function (c, camX, t, S) {
    var m = -camX * .6, i; for (i = 0; i < 2; i++) { var fx = m + 40 + (i ? 1100 : 40), wv = Math.sin(t * 3 + i) * 6; c.fillStyle = '#d8d0c0'; c.fillRect(fx, 60, 4, 140); c.fillStyle = '#e8d8c0'; c.beginPath(); c.moveTo(fx + 4, 64); c.lineTo(fx + 56 + wv, 74); c.lineTo(fx + 52 + wv, 100); c.lineTo(fx + 4, 96); c.fill(); c.fillStyle = '#d8352a'; c.fillRect(fx + 6, 70, 22, 22); }
    for (i = 0; i < 2; i++) { var a = Math.sin(t * .7 + i * 2.2) * .5, x0 = 200 + i * 560 - camX * .6; var g = c.createLinearGradient(x0, 440, x0 + a * 500, 0); g.addColorStop(0, 'rgba(255,230,160,.22)'); g.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x0 - 18, 440); c.lineTo(x0 + 18, 440); c.lineTo(x0 + a * 500 + 60, 0); c.lineTo(x0 + a * 500 - 60, 0); c.fill(); } } };

  var Stage = { defs: DEFS, count: DEFS.length };
  Stage.make = function (i) {
    var d = DEFS[i % DEFS.length], r = seeded(1000 + i * 77), S = {}, L = {}, cv = {
      sky: mk(W, H), far: mk(Math.ceil(W + (SW - W) * PAR.far), H), mid: mk(Math.ceil(W + (SW - W) * PAR.mid), H), near: mk(SW, H) };
    for (var k in cv) { L[k] = cv[k].getContext('2d'); L[k].textBaseline = 'alphabetic'; }
    d.build(L, r, S);
    var o = { name: d.name, place: d.place, bgm: d.bgm, idx: i };
    o.draw = function (c, camX, t) {
      c.drawImage(cv.sky, 0, 0); c.drawImage(cv.far, -camX * PAR.far, 0); c.drawImage(cv.mid, -camX * PAR.mid, 0); c.drawImage(cv.near, -camX, 0);
      if (d.anim) { c.save(); d.anim(c, camX, t, S); c.restore(); }
    };
    return o;
  };
  G.Stage = Stage;
})(window);
