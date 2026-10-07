/* Roster — 八位角色 + Boss：外觀（look）、裝飾（decorator）、數值、台詞
 * 招式資料在 moves.js。外觀全由程式繪製（暫用美術）；日後換成圖集時，只需替換 look 的繪製。 */
(function (G) {
  'use strict';
  var R = G.Rig, sh = R.sh, OL = R.OL, DECO = R.DECO;
  function B(o) { var b = { Lth: 44, Lsh: 44, Lt: 56, hr: 20, Lua: 30, Lfa: 30, aw: 11, lw: 14, tw: 32, foot: 14 }; for (var k in o) b[k] = o[k]; return b; }
  function T() { return G.G_TIME || 0; }

  /* ---------- 裝飾 ---------- */
  DECO.flag = function (pen, J, look, L) {                         // 廟口令旗（背在背後）
    if (L !== 'behind') return; var f = J.f, sc = J.sc, n = J.neck, bx = n.x - f * 14 * sc, by = n.y + 6 * sc, tx = bx - f * 12 * sc, ty = by - 62 * sc, w = Math.sin(T() * 7) * 4 * sc;
    pen.line(bx + f * 4 * sc, by + 52 * sc, tx, ty, 5 * sc, OL); pen.line(bx + f * 4 * sc, by + 52 * sc, tx, ty, 3 * sc, 0x8a5a2a);
    pen.poly([tx, ty, tx - f * (40 * sc + w), ty + 6 * sc + w, tx - f * (46 * sc + w), ty + 26 * sc, tx, ty + 30 * sc], OL);
    pen.poly([tx - f * 2, ty + 2 * sc, tx - f * (36 * sc + w), ty + 8 * sc + w, tx - f * (41 * sc + w), ty + 24 * sc, tx - f * 2, ty + 27 * sc], 0xd8352a);
    pen.circle(tx - f * 20 * sc, ty + 16 * sc, 6 * sc, 0xffd24a);
  };
  DECO.headband = function (pen, J, look, L) {
    if (L !== 'head') return; var c = J.head, r = J.hr, f = J.f, sc = J.sc, w = Math.sin(T() * 8) * 5 * sc;
    pen.line(c.x - f * r * .95, c.y - r * .3, c.x + f * r * .95, c.y - r * .5, r * .34 + 4 * sc, OL); pen.line(c.x - f * r * .95, c.y - r * .3, c.x + f * r * .95, c.y - r * .5, r * .34, 0xd8352a);
    var p = [c.x - f * r, c.y - r * .3, c.x - f * (r + 14 * sc), c.y - r * .1 + w, c.x - f * (r + 30 * sc), c.y + r * .5 + w];
    pen.polyline(p, 5 * sc + 3, OL); pen.polyline(p, 5 * sc, 0xd8352a);
  };
  DECO.apron = function (pen, J, look, L) {
    if (L !== 'body') return; var f = J.f, sc = J.sc, n = J.neck, h = J.hip, col = look.apron || 0x3f6f8f;
    var p = [n.x + f * 12 * sc, n.y - 2 * sc, h.x + f * 18 * sc, h.y - 40 * sc, h.x - f * 6 * sc, h.y - 42 * sc, n.x - f * 3 * sc, n.y - 2 * sc];
    pen.poly(p, OL); pen.poly([p[0] - f, p[1] + 2, p[2] - f * 2, p[3] - 2, p[4] + f * 2, p[5] - 2, p[6] + f, p[7] + 2], col);
    pen.rect(Math.min(h.x, h.x + f * 12 * sc), h.y - 28 * sc, 12 * sc, 9 * sc, sh(col, .8));
  };
  DECO.towel = function (pen, J, look, L) {
    if (L !== 'head') return; var c = J.head, r = J.hr, f = J.f, sc = J.sc;
    pen.poly([c.x - f * r * 1.05, c.y + r * .1, c.x - f * r * .9, c.y - r * .8, c.x + f * r * .1, c.y - r * 1.2, c.x + f * r * 1.0, c.y - r * .6, c.x + f * r * 1.0, c.y - r * .2, c.x, c.y - r * .5, c.x - f * r * .6, c.y - r * .2], OL);
    pen.poly([c.x - f * r * .98, c.y + r * .02, c.x - f * r * .84, c.y - r * .76, c.x + f * r * .1, c.y - r * 1.12, c.x + f * r * .94, c.y - r * .6, c.x + f * r * .92, c.y - r * .26, c.x, c.y - r * .5, c.x - f * r * .56, c.y - r * .22], 0xf4f4ee);
    pen.line(c.x - f * r * .1, c.y - r * 1.1, c.x + f * r * .1, c.y - r * .5, 2.6 * sc, 0x3a6fd8); pen.line(c.x + f * r * .45, c.y - r * 1.0, c.x + f * r * .5, c.y - r * .45, 2.6 * sc, 0x3a6fd8);
    pen.polyline([c.x - f * r * .9, c.y - r * .2, c.x - f * r * 1.5, c.y + r * .3], 6 * sc, OL); pen.polyline([c.x - f * r * .9, c.y - r * .2, c.x - f * r * 1.5, c.y + r * .3], 4 * sc, 0xf4f4ee);
  };
  DECO.basket = function (pen, J, look, L) {
    if (L !== 'front') return; var h = J.hB, sc = J.sc;
    pen.circle(h.x, h.y + 8 * sc, 13 * sc + 2, OL); pen.circle(h.x, h.y + 8 * sc, 13 * sc, 0xb8bcc4); pen.circle(h.x, h.y + 8 * sc, 9 * sc, 0xe6a23c);
    for (var i = -1; i <= 1; i++) pen.line(h.x + i * 6 * sc, h.y + 1 * sc, h.x + i * 6 * sc, h.y + 15 * sc, 1.5 * sc, 0xb8bcc4);
  };
  DECO.helmet = function (pen, J, look, L) {
    if (L !== 'head') return; var c = J.head, r = J.hr, f = J.f, sc = J.sc;
    pen.poly([c.x - f * r * 1.1, c.y + r * .2, c.x - f * r * 1.05, c.y - r * .5, c.x - f * r * .4, c.y - r * 1.2, c.x + f * r * .5, c.y - r * 1.2, c.x + f * r * 1.15, c.y - r * .5, c.x + f * r * 1.2, c.y - r * .1, c.x + f * r * .3, c.y - r * .3, c.x - f * r * .6, c.y - r * .2], OL);
    pen.poly([c.x - f * r * 1.02, c.y + r * .1, c.x - f * r * .98, c.y - r * .48, c.x - f * r * .4, c.y - r * 1.1, c.x + f * r * .5, c.y - r * 1.1, c.x + f * r * 1.05, c.y - r * .5, c.x + f * r * 1.08, c.y - r * .14, c.x + f * r * .3, c.y - r * .36, c.x - f * r * .6, c.y - r * .26], 0xff9c1a);
    pen.line(c.x - f * r * .2, c.y - r * 1.08, c.x + f * r * .3, c.y - r * 1.06, r * .22, 0xffd88a, .8); pen.line(c.x - f * r * .95, c.y - r * .1, c.x + f * r * .9, c.y - r * .3, 2.4 * sc, 0xffffff, .85);
  };
  DECO.deliverybox = function (pen, J, look, L) {
    if (L !== 'behind') return; var f = J.f, sc = J.sc, n = J.neck, h = J.hip, mx = (n.x + h.x) / 2 - f * 20 * sc, my = (n.y + h.y) / 2, w = 30 * sc, hh = 34 * sc;
    var x0 = Math.min(mx - f * w, mx + f * w * .4), x1 = Math.max(mx - f * w, mx + f * w * .4);
    pen.rect(x0 - 2, my - hh - 2, x1 - x0 + 4, hh * 2 + 4, OL); pen.rect(x0, my - hh, x1 - x0, hh * 2, 0xffb02e); pen.rect(x0 + 3, my - 3 * sc, x1 - x0 - 6, 6 * sc, 0xfff0b8, .9);
  };
  DECO.opera = function (pen, J, look, L) {
    if (L !== 'head') return; var c = J.head, r = J.hr, f = J.f, sc = J.sc, w = Math.sin(T() * 4) * 6 * sc, i;
    var a = [c.x - f * r * .4, c.y - r * 1.4, c.x - f * (r * .9 + w), c.y - r * 3.1, c.x - f * (r * 2.1 + w * 1.4), c.y - r * 3.2];
    var b = [c.x - f * r * .1, c.y - r * 1.4, c.x + f * (r * .3 + w), c.y - r * 3.0, c.x - f * (r * .4 - w), c.y - r * 3.4];
    pen.polyline(a, 4 * sc + 3, OL); pen.polyline(a, 4 * sc, 0x3fc8b0); pen.polyline(b, 4 * sc + 3, OL); pen.polyline(b, 4 * sc, 0xff6a8a);
    pen.polyline([c.x - f * r * .9, c.y - r * .5, c.x + f * r * .9, c.y - r * .7], r * .46 + 4 * sc, OL); pen.polyline([c.x - f * r * .9, c.y - r * .5, c.x + f * r * .9, c.y - r * .7], r * .46, 0xffd24a);
    for (i = 0; i < 4; i++) pen.circle(c.x - f * r * .6 + f * i * r * .5, c.y - r * .6 - i * r * .05, r * .13, i % 2 ? 0x3fc8b0 : 0xd8352a);
  };
  DECO.waterSleeves = function (pen, J, look, L) {
    var f = J.f, sc = J.sc, w = Math.sin(T() * 5) * 6 * sc;
    function slv(h, e, k) {
      var dx = h.x - e.x, d = Math.hypot(dx, h.y - e.y) || 1, nx = dx / d;
      var p = [e.x, e.y - 5 * sc, h.x + nx * 8 * sc, h.y - 8 * sc, h.x + nx * 40 * sc - f * 10 * sc, h.y + 12 * sc + w * k, h.x + nx * 54 * sc - f * 16 * sc, h.y + 46 * sc + w * k, h.x + nx * 20 * sc, h.y + 40 * sc + w * k, e.x, e.y + 6 * sc];
      pen.poly(p, OL); pen.poly([p[0], p[1] + 1, p[2], p[3] + 1, p[4] - f, p[5] + 1, p[6] - f * 2, p[7] - 2, p[8], p[9] - 2, p[10], p[11] - 1], 0xf6f0ff);
      pen.polyline([p[2], p[3] + 4, p[4], p[5], p[6], p[7] - 4], 2 * sc, 0xe8a0c8);
    }
    if (L === 'behind') slv(J.hB, J.eB, -1); if (L === 'front') slv(J.hF, J.eF, 1);
  };
  DECO.fan = function (pen, J, look, L) {
    if (L !== 'front') return; var h = J.hF, sc = J.sc, a = Math.atan2(h.y - J.eF.y, h.x - J.eF.x), cx = h.x + Math.cos(a) * 4 * sc, cy = h.y + Math.sin(a) * 4 * sc, R = 30 * sc, i, pp = [cx, cy], p2 = [cx, cy];
    for (i = 0; i <= 6; i++) { pp.push(cx + Math.cos(a - .9 + i * .3) * R, cy + Math.sin(a - .9 + i * .3) * R); p2.push(cx + Math.cos(a - .86 + i * .287) * (R - 2.5 * sc), cy + Math.sin(a - .86 + i * .287) * (R - 2.5 * sc)); }
    pen.poly(pp, OL); pen.poly(p2, 0xd8352a);
    for (i = 1; i < 6; i++) pen.line(cx, cy, cx + Math.cos(a - .9 + i * .3) * (R - 3 * sc), cy + Math.sin(a - .9 + i * .3) * (R - 3 * sc), 1 * sc, 0xffd24a);
  };
  function robeSkirt(pen, J) {
    var f = J.f, sc = J.sc, h = J.hip, kf = J.kF, kb = J.kB, w = 18 * sc, bot = Math.max(kf.y, kb.y) + 22 * sc;
    var p = [h.x - f * w, h.y - 2 * sc, h.x + f * w, h.y - 2 * sc, kf.x + f * 14 * sc, kf.y + 14 * sc, (kf.x + kb.x) / 2, bot, kb.x - f * 10 * sc, kb.y + 14 * sc];
    pen.poly(p, OL); pen.poly([p[0], p[1] + 1, p[2], p[3] + 1, p[4] - f, p[5] - 2, p[6], p[7] - 3, p[8] + f, p[9] - 2], 0x7a3ac0);
    pen.polyline([p[4], p[5] - 3 * sc, p[6], p[7] - 4 * sc, p[8], p[9] - 3 * sc], 3 * sc, 0xffd24a);
  }
  function pencilSkirt(pen, J) {
    var f = J.f, sc = J.sc, h = J.hip, kf = J.kF, kb = J.kB, w = 17 * sc, by = h.y + 36 * sc;
    pen.poly([h.x - f * w, h.y - 2 * sc, h.x + f * w, h.y - 2 * sc, h.x + f * 13 * sc + (kf.x - h.x) * .25, by, h.x - f * 13 * sc + (kb.x - h.x) * .25, by], OL);
    pen.poly([h.x - f * (w - 2), h.y, h.x + f * (w - 2), h.y, h.x + f * 11 * sc + (kf.x - h.x) * .25, by - 2, h.x - f * 11 * sc + (kb.x - h.x) * .25, by - 2], 0x24304e);
  }
  DECO.briefcase = function (pen, J, look, L) {
    if (L !== 'front') return; var h = J.hB, sc = J.sc, w = 26 * sc, hh = 19 * sc;
    pen.line(h.x - 7 * sc, h.y + 6 * sc, h.x + 7 * sc, h.y + 6 * sc, 3 * sc + 3, OL);
    pen.rect(h.x - w / 2 - 2, h.y + 6 * sc - 2, w + 4, hh + 4, OL); pen.rect(h.x - w / 2, h.y + 6 * sc, w, hh, 0x7a4a2a); pen.rect(h.x - w / 2, h.y + 6 * sc, w, 4 * sc, 0x9a6a3a); pen.rect(h.x - 3 * sc, h.y + 12 * sc, 6 * sc, 4 * sc, 0xffd24a);
  };
  DECO.headset = function (pen, J, look, L) {
    if (L !== 'head') return; var c = J.head, r = J.hr, f = J.f, sc = J.sc, p = [c.x - f * r * .95, c.y + r * .1, c.x - f * r * .7, c.y - r * 1.05, c.x + f * r * .4, c.y - r * 1.08];
    pen.polyline(p, 3 * sc + 3, OL); pen.polyline(p, 3 * sc, 0x2a2e3a);
    pen.circle(c.x - f * r * .1, c.y + r * .08, r * .3, OL); pen.circle(c.x - f * r * .1, c.y + r * .08, r * .24, 0xe8446a);
  };
  DECO.snapback = function (pen, J, look, L) {
    if (L !== 'head') return; var c = J.head, r = J.hr, f = J.f;
    pen.poly([c.x - f * r * 1.08, c.y - r * .1, c.x - f * r * 1.02, c.y - r * .7, c.x - f * r * .2, c.y - r * 1.2, c.x + f * r * .8, c.y - r * .9, c.x + f * r * .9, c.y - r * .4, c.x + f * r * .1, c.y - r * .5], OL);
    pen.poly([c.x - f * r * 1.0, c.y - r * .14, c.x - f * r * .96, c.y - r * .68, c.x - f * r * .2, c.y - r * 1.12, c.x + f * r * .76, c.y - r * .88, c.x + f * r * .82, c.y - r * .44, c.x + f * r * .1, c.y - r * .56], 0x7a3ad8);
    pen.poly([c.x - f * r * .9, c.y - r * .4, c.x - f * r * 1.7, c.y - r * .1, c.x - f * r * 1.55, c.y + r * .1, c.x - f * r * .8, c.y - r * .15], OL); pen.poly([c.x - f * r * .88, c.y - r * .36, c.x - f * r * 1.6, c.y - r * .1, c.x - f * r * 1.5, c.y + r * .02, c.x - f * r * .8, c.y - r * .2], 0xc89aff);
  };
  DECO.hoodieStripe = function (pen, J, look, L) {
    if (L !== 'body') return; var n = J.neck, h = J.hip, sc = J.sc;
    pen.line(h.x + (n.x - h.x) * .45, h.y + (n.y - h.y) * .45, h.x + (n.x - h.x) * .45 + 1, h.y + (n.y - h.y) * .45, 32 * sc, 0xff4fa0, .9);
    pen.line(h.x + (n.x - h.x) * .6, h.y + (n.y - h.y) * .6, h.x + (n.x - h.x) * .6 + 1, h.y + (n.y - h.y) * .6, 32 * sc, 0x3af0d0, .9);
  };
  DECO.reflect = function (pen, J, look, L) {
    if (L !== 'body') return; var n = J.neck, h = J.hip, sc = J.sc, a = n.x - h.x, b = n.y - h.y;
    pen.line(h.x + a * .62, h.y + b * .62, h.x + a * .62 + 1, h.y + b * .62, 34 * sc, 0xffffff, .65);
  };
  DECO.thermos = function (pen, J, look, L) {
    if (L !== 'front') return; var h = J.hipB, sc = J.sc;
    pen.rect(h.x - 6 * sc - 2, h.y + 4 * sc - 2, 12 * sc + 4, 24 * sc + 4, OL); pen.rect(h.x - 6 * sc, h.y + 4 * sc, 12 * sc, 24 * sc, 0x3a9a6a); pen.rect(h.x - 6 * sc, h.y + 4 * sc, 12 * sc, 5 * sc, 0xd0d4dc);
  };
  DECO.tie = function (pen, J, look, L) {
    if (L !== 'body') return; var n = J.neck, h = J.hip, f = J.f, sc = J.sc, x = n.x + f * 5 * sc, y = n.y - 4 * sc, dx = (h.x - n.x);
    pen.poly([x - 7 * sc, y, x + 7 * sc, y, x + 5 * sc + dx * .5, y + 18 * sc, x + dx * .6, y + 42 * sc, x - 5 * sc + dx * .5, y + 18 * sc], OL);
    pen.poly([x - 5 * sc, y + 1, x + 5 * sc, y + 1, x + 3 * sc + dx * .5, y + 17 * sc, x + dx * .6, y + 38 * sc, x - 3 * sc + dx * .5, y + 17 * sc], 0xc8202e);
    pen.poly([n.x - 12 * sc, n.y - 5 * sc, n.x, n.y + 12 * sc, n.x + f * 12 * sc, n.y - 5 * sc], 0xf4f4f4);
  };
  DECO.folder = function (pen, J, look, L) {
    if (L !== 'front') return; var h = J.hF, sc = J.sc, w = 24 * sc, hh = 30 * sc;
    pen.rect(h.x - w * .4 - 2, h.y - hh * .7 - 2, w * 1.3 + 4, hh + 4, OL); pen.rect(h.x - w * .4, h.y - hh * .7, w * 1.3, hh, 0x2a8a4a); pen.rect(h.x - w * .1, h.y - hh * .45, w * .7, 4 * sc, 0xf2f2e6); pen.rect(h.x - w * .1, h.y - hh * .2, w * .5, 3 * sc, 0xf2f2e6);
  };
  DECO.straw = function (pen, J, look, L) {
    if (L !== 'front') return; var h = J.hF, e = J.eF, sc = J.sc, a = Math.atan2(h.y - e.y, h.x - e.x), L2 = 74 * sc, ca = Math.cos(a), sa = Math.sin(a);
    pen.line(h.x - ca * 16 * sc, h.y - sa * 16 * sc, h.x + ca * L2, h.y + sa * L2, 7 * sc, OL); pen.line(h.x - ca * 16 * sc, h.y - sa * 16 * sc, h.x + ca * L2, h.y + sa * L2, 4.4 * sc, 0xff8fb4);
  };
  DECO.cup = function (pen, J, look, L) {
    if (L !== 'front') return; var h = J.hB, sc = J.sc;
    pen.poly([h.x - 10 * sc, h.y - 8 * sc, h.x + 10 * sc, h.y - 8 * sc, h.x + 7 * sc, h.y + 18 * sc, h.x - 7 * sc, h.y + 18 * sc], OL); pen.poly([h.x - 8 * sc, h.y - 6 * sc, h.x + 8 * sc, h.y - 6 * sc, h.x + 5.5 * sc, h.y + 16 * sc, h.x - 5.5 * sc, h.y + 16 * sc], 0xe8c8a0);
    pen.rect(h.x - 8 * sc, h.y - 8 * sc, 16 * sc, 3 * sc, 0xffffff);
    for (var i = 0; i < 5; i++) pen.circle(h.x - 4 * sc + (i % 3) * 4 * sc, h.y + 11 * sc + ((i / 3) | 0) * 3 * sc, 1.7 * sc, 0x2a1a14);
  };

  /* ---------- 角色 ---------- */
  var C = [];
  function add(c) { C.push(c); return c; }
  add({ id: 'long', name: '阿龍', full: '林天龍', title: '廟口武者', place: '艋舺廟口', age: 24, tts: { pitch: .9, rate: 1.2 }, color: 0xd8352a,
    bio: '艋舺陣頭長大的少年，拳頭比廟口的鑼鼓還響。均衡型。', stats: { pow: 4, spd: 3, rng: 3, def: 3 }, hp: 1040, walk: 3.2, back: 2.4, jump: 17, dmg: 1.05, scale: 1,
    look: { B: B({}), skin: 0xe4a678, hair: 0x14101c, hairStyle: 'spiky', top: 0xd8352a, sleeve: 'none', pants: 0xf2e8d6, belt: 0x1a1420, shoe: 0x9a6a3a, wrist: 0x1a1420, deco: ['flag', 'headband'], collar: 0xf2c14e },
    lines: { intro: '來啊！廟口的拳頭最大粒！', ult: '龍神附體！九龍破！', win: '這樣就倒喔？', ko: '廟口……不會輸……' } });
  add({ id: 'cai', name: '阿財', full: '張阿財', title: '夜市老闆', place: '士林夜市', age: 38, tts: { pitch: .7, rate: 1.1 }, color: 0x3f6f8f,
    bio: '鹽酥雞攤的老闆，食材是熱油和肌肉。重量級投技型。', stats: { pow: 5, spd: 1, rng: 2, def: 5 }, hp: 1150, walk: 2.5, back: 1.9, jump: 15.5, scale: 1.08, dmg: 1.12,
    look: { B: B({ hr: 22, tw: 44, aw: 14, lw: 17, Lt: 54, Lth: 42, Lsh: 42 }), skin: 0xe6b088, hair: 0x2a2018, hairStyle: 'bald', top: 0xf2f2ee, sleeve: 'short', pants: 0x3a3a46, shoe: 0xe8eaee, apron: 0x3f6f8f, deco: ['apron', 'towel', 'basket'] },
    lines: { intro: '要加辣嗎？免費送你拳頭！', ult: '全家桶，送你上路！', win: '胡椒鹽灑下去，剛剛好！', ko: '我的鹹酥雞……' } });
  add({ id: 'su', name: '阿速', full: '陳小捷', title: '外送員', place: '台北市區', age: 21, tts: { pitch: 1.1, rate: 1.35 }, color: 0xff9c1a,
    bio: '騎著機車穿梭大街小巷，出拳比外送還快。速攻型。', stats: { pow: 2, spd: 5, rng: 3, def: 2 }, hp: 920, walk: 3.9, back: 2.9, jump: 18, scale: .98, spdMul: .85,
    look: { B: B({ tw: 28, lw: 12.5, Lt: 54 }), skin: 0xefc29c, hair: 0x14101c, hairStyle: 'short', top: 0xff9c1a, sleeve: 'long', pants: 0x2e3340, shoe: 0xf4f4f4, deco: ['deliverybox', 'helmet', 'reflect'], collar: 0xffe0a0 },
    lines: { intro: '五分鐘內送到你的醫藥費！', ult: '準時送達，不收小費！', win: '差評？我給你好評啦！', ko: '遲到了……' } });
  add({ id: 'wu', name: '吳師父', full: '吳守仁', title: '太極師父', place: '大安森林公園', age: 58, tts: { pitch: .8, rate: 1.0 }, color: 0x3a9a6a,
    bio: '晨練的老師傅，四兩撥千斤。反擊型，慢熱但穩。', stats: { pow: 3, spd: 2, rng: 2, def: 5 }, hp: 1120, walk: 2.7, back: 2.2, jump: 15.5, dmg: 1.15, scale: .93,
    look: { B: B({ hr: 19, tw: 34, Lt: 52 }), skin: 0xe2b084, hair: 0xe6e6ea, brow: 0xe6e6ea, hairStyle: 'short', top: 0xf6f4ee, sleeve: 'long', pants: 0xf0eee6, belt: 0x3a3a3a, shoe: 0x22222a, deco: ['thermos'], collar: 0xe0dcd0,
      facial: function (pen, J) { var c = J.head, r = J.hr, f = J.f; pen.poly([c.x + f * r * .4, c.y + r * .7, c.x + f * r * .75, c.y + r * .72, c.x + f * r * .56, c.y + r * 1.5], 0xf0f0f4); } },
    lines: { intro: '年輕人，火氣不要這麼大。', ult: '太極歸一，以柔克剛。', win: '喝口茶，再來。', ko: '老了……不中用了……' } });
  add({ id: 'yu', name: '小瑜', full: '劉小瑜', title: '珍奶店員', place: '東區', age: 19, tts: { pitch: 1.5, rate: 1.25 }, color: 0xff8fb4,
    bio: '手搖飲料店的打工妹，珍珠可以當子彈。遠程壓制型。', stats: { pow: 2, spd: 4, rng: 5, def: 2 }, hp: 880, walk: 3.3, back: 2.6, jump: 17.5, dmg: .92, scale: .95,
    look: { B: B({ tw: 27, lw: 12, aw: 10, Lt: 52, hr: 19 }), skin: 0xf6cba6, hair: 0x6a3a22, hairStyle: 'pony', tie: 0xff7aa8, top: 0xfaf0f4, sleeve: 'short', pants: 0x3a64a8, shoe: 0xf6f6f6, apron: 0xc8905a, deco: ['apron', 'cup', 'straw'], blush: true },
    lines: { intro: '三分糖，七分狠！', ult: '滿杯暴擊，珍珠管夠！', win: '甜度冰塊，自己選！', ko: '珍珠……灑了……' } });
  add({ id: 'feng', name: '小鳳', full: '陳小鳳', title: '歌仔戲名伶', place: '大稻埕', age: 33, tts: { pitch: 1.4, rate: 1.0 }, color: 0x7a3ac0,
    bio: '大稻埕戲台上的名角，水袖一甩，連對手都要入戲。中距離控場型。', stats: { pow: 3, spd: 3, rng: 5, def: 3 }, hp: 1000, walk: 3.0, back: 2.4, jump: 16.5, scale: .98,
    look: { B: B({ tw: 28, lw: 12, Lt: 54 }), skin: 0xf4d6bc, opera: true, hair: 0x14101c, hairStyle: 'opera', top: 0x7a3ac0, sleeve: 'long', pants: 0x7a3ac0, shoe: 0xd8352a, belt: 0xffd24a, deco: ['opera', 'waterSleeves', 'fan'], skirt: robeSkirt, blush: true },
    lines: { intro: '且慢，待奴家唱完這段再收拾你！', ult: '絕唱一曲，送君上路！', win: '哎呀呀，好大的膽子～', ko: '曲終……人散……' } });
  add({ id: 'ting', name: '雅婷', full: '黃雅婷', title: '業績女王', place: '信義區', age: 29, tts: { pitch: 1.3, rate: 1.3 }, color: 0x24304e,
    bio: '信義區的上班族，高跟鞋是她的武器。空中與腿技型。', stats: { pow: 3, spd: 4, rng: 3, def: 2 }, hp: 960, walk: 3.4, back: 2.7, jump: 18.5, scale: 1,
    look: { B: B({ tw: 27, lw: 12, Lt: 54, Lth: 45, Lsh: 45 }), skin: 0xf2c6a2, hair: 0x14101c, hairStyle: 'bob', top: 0x24304e, sleeve: 'long', pants: 0x24304e, legSkin: true, shoe: 0xd8202e, heel: true, collar: 0xffffff, deco: ['briefcase', 'headset'], skirt: pencilSkirt, blush: true },
    lines: { intro: '下班前搞定你。', ult: '加班地獄，開始！', win: 'KPI 達成！', ko: '我要……請假……' } });
  add({ id: 'die', name: '小蝶', full: '蘇小蝶', title: '街舞少女', place: '西門町', age: 20, tts: { pitch: 1.6, rate: 1.35 }, color: 0x3af0d0,
    bio: '西門町的街舞少女，倒立旋轉都是日常。低姿態旋轉型。', stats: { pow: 3, spd: 5, rng: 2, def: 1 }, hp: 1000, walk: 3.7, back: 3.0, jump: 19, dmg: 1.2, scale: .94,
    look: { B: B({ tw: 27, lw: 13, aw: 10.5, Lt: 50, hr: 19 }), skin: 0xe9b894, hair: 0x14101c, hairStyle: 'short', top: 0xf4ee3a, sleeve: 'long', pants: 0x2a9d8f, shoe: 0xf4f4f4, deco: ['snapback', 'hoodieStripe'], blush: true, wrist: 0xff4fa0 },
    lines: { intro: 'Battle 開始！別眨眼喔。', ult: '霓虹連環，閃瞎你！', win: '這招叫……閃瞎你。', ko: '舞台……暗了……' } });
  var BOSS = { id: 'boss', name: '西裝男', full: '中分頭西裝男', title: '總統府的最後關主', place: '總統府', age: 52, tts: { pitch: .8, rate: 1.0 }, color: 0x2a8a4a, boss: true,
    bio: '手持綠色公文夾的神祕西裝男，總統府前的最終關主。', stats: { pow: 5, spd: 3, rng: 4, def: 4 }, hp: 1250, walk: 2.9, back: 2.3, jump: 16, scale: 1.04, dmg: 1.05,
    look: { B: B({ tw: 36, aw: 12, lw: 14, hr: 21, Lt: 58, Lth: 46, Lsh: 46 }), skin: 0xeac29c, hair: 0x14101c, hairStyle: 'short', top: 0x23252d, sleeve: 'long', pants: 0x23252d, shoe: 0x0c0c10, collar: 0xf4f4f4, deco: ['tie', 'folder'] },
    lines: { intro: '各位，請聽我說。', ult: '政令宣導，全面落實！', win: '本案，圓滿結案。', ko: '會議……散會……' } };
  var Roster = { chars: C, boss: BOSS, all: C.concat([BOSS]), byId: {} };
  Roster.all.forEach(function (c) { Roster.byId[c.id] = c; });
  Roster.get = function (id) { return Roster.byId[id]; };
  G.Roster = Roster;
})(window);
