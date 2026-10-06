/* Rig — 側視人形骨架（雙骨 IK）+ 姿勢庫 + 人物繪製
 * 角色空間：原點在雙腳中間的地面，x 向前（面向方向）、y 向上。姿勢以「關節目標位置」描述：
 *   hx,hy 髖；t 軀幹前傾角；h 頭部傾角；hF/hB 前後手；fF/fB 前後腳（鞋底離地高度）；rot 整體繞髖旋轉（倒地用）。
 * 手腳由 IK 算出手肘/膝蓋，所以任何動作只要給目標點就會自然彎曲。
 * 每段肢體先畫深色外框再填色 + 高光線，營造漫畫描邊感。 */
(function (G) {
  'use strict';
  var RAD = Math.PI / 180, ANK = 7;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sh(c, t) { var r = (c >> 16 & 255), g = (c >> 8 & 255), b = (c & 255); return ((clamp(r * t, 0, 255) | 0) << 16) | ((clamp(g * t, 0, 255) | 0) << 8) | (clamp(b * t, 0, 255) | 0); }
  function lit(c, t) { var r = (c >> 16 & 255), g = (c >> 8 & 255), b = (c & 255); return (((r + (255 - r) * t) | 0) << 16) | (((g + (255 - g) * t) | 0) << 8) | ((b + (255 - b) * t) | 0); }

  /* 雙骨 IK：a 根部、b 目標；side=+1 / -1 決定關節彎向 */
  function ik(ax, ay, bx, by, L1, L2, side) {
    var dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy), mx = L1 + L2 - .5, mn = Math.abs(L1 - L2) + 1;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; } if (d < mn) { var k = mn / (d || 1); dx = d ? dx * k : mn; dy = d ? dy * k : 0; d = mn; }
    var a1 = Math.atan2(dy, dx), A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), an = a1 + side * A;
    return { mx: ax + Math.cos(an) * L1, my: ay + Math.sin(an) * L1, ex: ax + dx, ey: ay + dy };
  }

  /* ---------- 姿勢 ---------- */
  var BASE = { hx: 0, hy: 84, t: 8, h: 0, hF: [34, 146], hB: [20, 134], fF: [30, 0], fB: [-30, 0], rot: 0 };
  function P(o) { var r = {}, k; for (k in BASE) r[k] = BASE[k]; for (k in o) r[k] = o[k]; return r; }
  var POSE = {
    idleA: P({}), idleB: P({ hy: 81, t: 10, hF: [33, 142], hB: [19, 130] }),
    crouch: P({ hy: 50, t: 16, hF: [34, 108], hB: [20, 98], fF: [34, 0], fB: [-30, 0] }),
    jump: P({ hy: 96, t: 8, hF: [38, 146], hB: [22, 134], fF: [22, 26], fB: [-16, 14] }),
    jumpF: P({ hy: 96, t: 14, hF: [40, 144], hB: [24, 134], fF: [30, 28], fB: [-14, 16] }),
    jumpB: P({ hy: 96, t: 0, hF: [34, 148], hB: [20, 136], fF: [16, 24], fB: [-20, 16] }),
    blockH: P({ hy: 82, t: 4, hF: [38, 150], hB: [32, 130], fF: [30, 0], fB: [-32, 0] }),
    blockL: P({ hy: 50, t: 12, hF: [40, 110], hB: [34, 90], fF: [34, 0], fB: [-30, 0] }),
    hurtH: P({ hy: 80, t: -14, h: -14, hx: -8, hF: [10, 130], hB: [-14, 120], fF: [26, 0], fB: [-36, 0] }),
    hurtL: P({ hy: 70, t: 24, h: 8, hx: -4, hF: [30, 98], hB: [10, 94], fF: [30, 0], fB: [-30, 0] }),
    air: P({ hy: 96, t: -30, h: -20, hx: -6, hF: [0, 146], hB: [-18, 130], fF: [10, 36], fB: [-30, 30] }),
    lie: P({ hx: 0, hy: 16, t: 0, rot: 90, hF: [30, 100], hB: [18, 90], fF: [24, 0], fB: [-22, 0] }),
    getup: P({ hy: 40, t: 40, hF: [40, 70], hB: [20, 60], fF: [34, 0], fB: [-30, 0] }),
    win: P({ hy: 86, t: -4, hF: [26, 190], hB: [-10, 120], fF: [24, 0], fB: [-26, 0] }),
    win2: P({ hy: 86, t: 0, hF: [30, 172], hB: [-6, 172], fF: [22, 0], fB: [-22, 0] }),
    lose: P({ hy: 60, t: 28, h: 20, hF: [26, 70], hB: [10, 66], fF: [20, 0], fB: [-24, 0] }),
    intro: P({ hy: 84, t: 4, hF: [40, 150], hB: [28, 140] }),
    throwA: P({ hy: 78, t: 18, hF: [62, 128], hB: [58, 116], fF: [34, 0], fB: [-30, 0] }),
    throwB: P({ hy: 80, t: -10, hF: [26, 190], hB: [30, 184], fF: [26, 0], fB: [-30, 0] }),
    grabbed: P({ hy: 74, t: 0, h: 10, hF: [20, 150], hB: [10, 150], fF: [10, 6], fB: [-20, 10] }),
    jab0: P({ hy: 83, t: 4, hF: [18, 134], hB: [26, 142] }), jab1: P({ hx: 6, hy: 83, t: 14, hF: [96, 148], hB: [20, 134] }),
    kick0: P({ hy: 84, t: -4, hF: [26, 144], hB: [14, 130], fF: [22, 56], fB: [-26, 0] }), kick1: P({ hy: 86, t: -14, hx: -4, hF: [24, 136], hB: [4, 126], fF: [100, 108], fB: [-22, 0] }),
    hp0: P({ hx: -4, hy: 80, t: -2, hF: [-6, 130], hB: [30, 136], fF: [34, 0], fB: [-34, 0] }), hp1: P({ hx: 16, hy: 76, t: 22, hF: [102, 134], hB: [10, 128], fF: [50, 0], fB: [-28, 0] }),
    hk0: P({ hy: 84, t: -2, fF: [10, 76], hF: [24, 140], hB: [10, 126] }), hk1: P({ hx: -8, hy: 88, t: -20, h: -6, fF: [108, 134], fB: [-24, 0], hF: [14, 130], hB: [-2, 120] }),
    cp0: P({ hy: 52, t: 16, hF: [24, 100], hB: [30, 106], fF: [34, 0], fB: [-30, 0] }), cp1: P({ hx: 4, hy: 52, t: 22, hF: [92, 90], hB: [18, 98], fF: [34, 0], fB: [-30, 0] }),
    ck0: P({ hy: 40, t: 20, hF: [20, 60], hB: [-6, 54], fF: [20, 4], fB: [-30, 0] }), ck1: P({ hx: -12, hy: 34, t: 30, hF: [30, 60], hB: [-14, 48], fF: [112, 10], fB: [-34, 0] }),
    ap1: P({ hy: 96, t: 16, hF: [92, 130], hB: [24, 136], fF: [22, 26], fB: [-14, 14] }), ak1: P({ hy: 96, t: -4, hF: [20, 140], hB: [6, 130], fF: [92, 54], fB: [-14, 24] }),
    cast0: P({ hy: 76, t: 0, hF: [-4, 118], hB: [-12, 114], fF: [36, 0], fB: [-36, 0] }), cast1: P({ hx: 10, hy: 74, t: 20, hF: [88, 126], hB: [80, 118], fF: [44, 0], fB: [-34, 0] }),
    rise0: P({ hy: 56, t: 22, hF: [10, 60], hB: [-8, 70], fF: [34, 0], fB: [-28, 0] }), rise1: P({ hy: 130, t: -6, hF: [40, 218], hB: [10, 160], fF: [10, 40], fB: [-12, 24] }),
    spin: P({ hy: 70, t: 30, hF: [60, 100], hB: [-40, 100], fF: [70, 30], fB: [-50, 10] }),
    lunge: P({ hx: 22, hy: 64, t: 36, hF: [100, 120], hB: [70, 116], fF: [70, 0], fB: [-36, 0] }),
    arms: P({ hy: 76, t: 6, hF: [66, 116], hB: [64, 110], fF: [36, 0], fB: [-36, 0] }),
    counter: P({ hy: 70, t: -2, hF: [40, 138], hB: [26, 112], fF: [30, 0], fB: [-34, 0] }),
    dive: P({ hy: 100, t: 10, hF: [30, 130], hB: [10, 120], fF: [90, -30], fB: [-10, 30] }),
    handstand: P({ hx: 0, hy: 80, t: 0, rot: 180, hF: [20, 6], hB: [-16, 6], fF: [60, 150], fB: [-40, 150] })
  };

  function lerpPose(a, b, k) {
    var r = {}, n, x, y;
    for (n in BASE) {
      x = a[n]; y = b[n];
      if (x instanceof Array) r[n] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k]; else r[n] = x + (y - x) * k;
    }
    return r;
  }
  function walkPose(ph, dir) {
    var s = Math.sin(ph), c = Math.cos(ph), p = lerpPose(POSE.idleA, POSE.idleA, 0);
    p.fF = [30 + s * 24 * dir, Math.max(0, c * 12)]; p.fB = [-30 - s * 24 * dir, Math.max(0, -c * 12)];
    p.hy = 84 - Math.abs(s) * 3; p.t = 8 + (dir > 0 ? 3 : -2); p.hF = [34 - s * 5, 146]; p.hB = [20 + s * 5, 134];
    return p;
  }

  /* ---------- 求解 ---------- */
  function rotp(p, cx, cy, a) { var c = Math.cos(a), s = Math.sin(a), x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; }
  function solve(look, pose, ox, oy, f, sc) {
    var B = look.B, hx = pose.hx, hy = pose.hy, t = pose.t * RAD, nk = [hx + B.Lt * Math.sin(t), hy + B.Lt * Math.cos(t)];
    var sd = [hx + B.Lt * .88 * Math.sin(t), hy + B.Lt * .88 * Math.cos(t)];
    var hd = [nk[0] + Math.sin(t + pose.h * RAD) * B.hr * .95, nk[1] + Math.cos(t + pose.h * RAD) * B.hr * .95 + 3];
    // 座標系 y 向上：用 side 讓膝蓋朝前、手肘朝下
    var kF = ik(hx + 3, hy, pose.fF[0], pose.fF[1] + ANK, B.Lth, B.Lsh, 1), kB = ik(hx - 3, hy, pose.fB[0], pose.fB[1] + ANK, B.Lth, B.Lsh, 1);
    var aF = ik(sd[0] + 3, sd[1], pose.hF[0], pose.hF[1], B.Lua, B.Lfa, -1), aB = ik(sd[0] - 3, sd[1], pose.hB[0], pose.hB[1], B.Lua, B.Lfa, -1);
    var pts = { hip: [hx, hy], neck: nk, sh: sd, head: hd, kF: [kF.mx, kF.my], aF: [kF.ex, kF.ey], tF: [0, 0], kB: [kB.mx, kB.my], aB: [kB.ex, kB.ey], tB: [0, 0],
      eF: [aF.mx, aF.my], hF: [aF.ex, aF.ey], eB: [aB.mx, aB.my], hB: [aB.ex, aB.ey], shF: [sd[0] + 3, sd[1]], shB: [sd[0] - 3, sd[1]], hipF: [hx + 3, hy], hipB: [hx - 3, hy] };
    // 腳尖：沿小腿方向旋轉 90° 指向前方（腳掌隨小腿傾斜，踢腿時腳尖自然跟著）
    pts.tF = foot(kF, B.foot); pts.tB = foot(kB, B.foot);
    if (pose.rot) { var a = pose.rot * RAD, k; for (k in pts) pts[k] = rotp(pts[k], hx, hy, a); }
    var J = { f: f, sc: sc, rot: pose.rot, t: pose.t, ox: ox, oy: oy };
    for (var k2 in pts) J[k2] = { x: ox + f * pts[k2][0] * sc, y: oy - pts[k2][1] * sc };
    J.hr = B.hr * sc; return J;
  }
  function foot(k, len) {
    var dx = k.ex - k.mx, dy = k.ey - k.my, d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    // 小腿向下時 (dx≈0,dy≈-1)，腳尖應朝前 (+x)；以小腿方向逆時針轉 90° => (-dy, dx)
    return [k.ex - dy * len, k.ey + dx * len - 2];
  }

  /* ---------- 繪製 ---------- */
  var OL = 0x1a0f22;
  function chain(pen, pts, w, cols, ol) {
    var i, n = pts.length / 2 - 1;
    for (i = 0; i < n; i++) pen.line(pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3], w + ol * 2, OL);
    for (i = 0; i <= n; i++) pen.circle(pts[i * 2], pts[i * 2 + 1], (w + ol * 2) / 2, OL);
    for (i = 0; i < n; i++) {
      var c = cols[Math.min(i, cols.length - 1)];
      pen.line(pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3], w, c); pen.circle(pts[i * 2 + 2], pts[i * 2 + 3], w / 2, c);
    }
    pen.circle(pts[0], pts[1], w / 2, cols[0]);
    for (i = 0; i < n; i++) pen.line(pts[i * 2] - w * .18, pts[i * 2 + 1] - w * .2, pts[i * 2 + 2] - w * .18, pts[i * 2 + 3] - w * .2, w * .28, lit(cols[Math.min(i, cols.length - 1)], .22), .55);
  }
  function limbs(look) { return look.sleeve === 'long' ? [look.top, look.top] : look.sleeve === 'short' ? [look.top, look.skin] : [look.skin, look.skin]; }
  function arm(pen, J, look, front) {
    var sc = J.sc, W = look.B.aw * sc, s = front ? J.shF : J.shB, e = front ? J.eF : J.eB, h = front ? J.hF : J.hB, c = limbs(look);
    if (!front) c = c.map(function (x) { return sh(x, .82); });
    chain(pen, [s.x, s.y, e.x, e.y, h.x, h.y], W, c, 2 * sc);
    var fc = front ? look.skin : sh(look.skin, .85);
    if (look.glove) fc = look.glove;
    pen.circle(h.x, h.y, W * .62 + 2 * sc, OL); pen.circle(h.x, h.y, W * .62, fc);
    if (look.wrist) pen.circle(e.x * .35 + h.x * .65, e.y * .35 + h.y * .65, W * .56, look.wrist, .95);
  }
  function leg(pen, J, look, front) {
    var sc = J.sc, W = look.B.lw * sc, hp = front ? J.hipF : J.hipB, k = front ? J.kF : J.kB, a = front ? J.aF : J.aB, t = front ? J.tF : J.tB;
    var pc = look.pants, cols = look.legSkin ? [pc, look.skin] : [pc, pc];
    if (look.shortPants) cols = [pc, look.skin];
    if (!front) cols = cols.map(function (x) { return sh(x, .82); });
    chain(pen, [hp.x, hp.y, k.x, k.y, a.x, a.y], W, cols, 2 * sc);
    var sc2 = front ? look.shoe : sh(look.shoe, .8), sw = W * .9;
    pen.line(a.x, a.y, t.x, t.y, sw + 4 * sc, OL); pen.circle(a.x, a.y, sw / 2 + 2 * sc, OL); pen.circle(t.x, t.y, sw / 2 + 2 * sc, OL);
    pen.line(a.x, a.y, t.x, t.y, sw, sc2); pen.circle(a.x, a.y, sw / 2, sc2); pen.circle(t.x, t.y, sw / 2, sc2);
    pen.line(a.x, a.y + sw * .2, t.x, t.y + sw * .2, sw * .3, lit(sc2, .4), .5);
    if (look.heel) pen.line(a.x - J.f * 3 * sc, a.y, a.x - J.f * 4 * sc, a.y + 9 * sc, 3 * sc, OL);
  }
  function torso(pen, J, look) {
    var sc = J.sc, W = look.B.tw * sc, h = J.hip, n = J.neck;
    pen.line(h.x, h.y, n.x, n.y, W + 5 * sc, OL); pen.circle(h.x, h.y, W / 2 + 2.5 * sc, OL); pen.circle(n.x, n.y, W / 2 * .86 + 2.5 * sc, OL);
    pen.line(h.x, h.y, n.x, n.y, W, look.top); pen.circle(h.x, h.y, W / 2, look.pants); pen.circle(n.x, n.y, W / 2 * .86, look.top);
    var mx = h.x + (n.x - h.x) * .22, my = h.y + (n.y - h.y) * .22;
    pen.line(h.x, h.y, mx, my, W, look.belt != null ? look.belt : look.pants);
    pen.line(h.x + (n.x - h.x) * .3, h.y + (n.y - h.y) * .3, n.x, n.y, W * .3, sh(look.top, .8), .5);
    pen.line(h.x - W * .22 * J.f, h.y, n.x - W * .22 * J.f, n.y, W * .25, lit(look.top, .25), .5);
    if (look.collar) pen.line(n.x, n.y, n.x + (J.sh.x - n.x) * .5, n.y + (J.sh.y - n.y) * .5 - 1, W * .34, look.collar);
  }
  function hairBack(pen, J, look) {
    var c = J.head, r = J.hr, f = J.f, hs = look.hairStyle, col = look.hair, sc = J.sc;
    if (hs === 'long' || hs === 'bob') { var L = hs === 'long' ? 1.9 : 1.1; pen.poly([c.x - f * r * .1, c.y - r * .9, c.x - f * r * 1.15, c.y - r * .2, c.x - f * r * 1.15, c.y + r * L, c.x - f * r * .1, c.y + r * (L - .4)], OL); pen.poly([c.x - f * r * .1, c.y - r * .8, c.x - f * r * 1.0, c.y - r * .2, c.x - f * r * 1.0, c.y + r * (L - .1), c.x - f * r * .15, c.y + r * (L - .5)], col); }
    if (hs === 'pony') { var sw = Math.sin((G.G_TIME || 0) * 6) * r * .25, p = [c.x - f * r * .8, c.y - r * .3, c.x - f * (r * 1.5 + sw * .3), c.y + r * .2, c.x - f * (r * 1.8 + sw), c.y + r * 1.3]; pen.polyline(p, r * .62 + 4 * sc, OL); pen.polyline(p, r * .62, col); pen.circle(c.x - f * r * .85, c.y - r * .3, r * .22, look.tie || 0xff7aa8); }
    if (hs === 'bun' || hs === 'opera') { pen.circle(c.x - f * r * .55, c.y - r * 1.1, r * .62 + 2 * sc, OL); pen.circle(c.x - f * r * .55, c.y - r * 1.1, r * .62, col); }
  }
  function hairFront(pen, J, look) {
    var c = J.head, r = J.hr, f = J.f, hs = look.hairStyle, col = look.hair, i;
    if (hs === 'bald') return;
    if (hs === 'spiky') {
      for (i = 0; i < 5; i++) { var a = (200 - i * 36) * RAD, bx = c.x + Math.cos(a) * r * .8 * f, by = c.y - Math.sin(a) * r * .8, tx = c.x + Math.cos(a) * r * 1.65 * f, ty = c.y - Math.sin(a) * r * 1.65, px = -Math.sin(a) * r * .36, py = -Math.cos(a) * r * .36;
        pen.poly([bx + px * f, by + py, tx, ty, bx - px * f, by - py], OL); }
    }
    var cap = [c.x - f * r * 1.02, c.y + r * .25, c.x - f * r * 1.0, c.y - r * .5, c.x - f * r * .5, c.y - r * 1.05, c.x + f * r * .3, c.y - r * 1.12, c.x + f * r * .95, c.y - r * .55, c.x + f * r * .98, c.y - r * .12, c.x + f * r * .45, c.y - r * .5, c.x - f * r * .2, c.y - r * .38, c.x - f * r * .7, c.y + r * .1];
    pen.poly(cap, col);
    if (hs === 'spiky') for (i = 0; i < 5; i++) { var a2 = (200 - i * 36) * RAD, bx2 = c.x + Math.cos(a2) * r * .78 * f, by2 = c.y - Math.sin(a2) * r * .78, tx2 = c.x + Math.cos(a2) * r * 1.58 * f, ty2 = c.y - Math.sin(a2) * r * 1.58, qx = -Math.sin(a2) * r * .3, qy = -Math.cos(a2) * r * .3; pen.poly([bx2 + qx * f, by2 + qy, tx2, ty2, bx2 - qx * f, by2 - qy], col); }
    pen.line(c.x - f * r * .1, c.y - r * .98, c.x + f * r * .8, c.y - r * .62, r * .16, lit(col, .35), .55);
  }
  function face(pen, J, look, expr) {
    var c = J.head, r = J.hr, f = J.f, sc = J.sc;
    pen.circle(c.x, c.y, r + 2.2 * sc, OL); pen.circle(c.x, c.y, r, look.skin);
    pen.circle(c.x - f * r * .62, c.y + r * .28, r * .26, sh(look.skin, .86));
    var ex = c.x + f * r * .42, ey = c.y + r * .02, e = expr || 'n';
    if (look.opera) pen.ellipse(ex, ey, r * .24, r * .2, 0xd93a52);
    if (e === 'ko' || e === 'hurtH') { pen.line(ex - r * .16, ey - r * .12, ex + r * .16, ey + r * .12, 2.2 * sc, OL); pen.line(ex - r * .16, ey + r * .12, ex + r * .16, ey - r * .12, 2.2 * sc, OL); }
    else if (e === 'hurt') pen.line(ex - r * .2, ey, ex + r * .14, ey, 2.4 * sc, OL);
    else { pen.ellipse(ex, ey, r * .13, r * .19, 0x15101c); pen.circle(ex + f * r * .03, ey - r * .06, r * .05, 0xffffff); }
    if (look.glasses) pen.polyline([ex - f * r * .3, ey - r * .3, ex + f * r * .3, ey - r * .3, ex + f * r * .3, ey + r * .3, ex - f * r * .3, ey + r * .3, ex - f * r * .3, ey - r * .3], 1.8 * sc, OL);
    var ang = e === 'atk' || e === 'win' || e === 'ult' ? -.5 : e === 'hurt' || e === 'hurtH' ? .35 : -.18;
    pen.line(ex - f * r * .3, ey - r * .34 + (ang > 0 ? -ang * r * .2 : 0), ex + f * r * .34, ey - r * .34 + ang * r * .5, 2.8 * sc, look.brow != null ? look.brow : look.hair);
    var mx = c.x + f * r * .5, my = c.y + r * .5;
    if (e === 'atk' || e === 'ult') { pen.ellipse(mx, my, r * .2, r * .22, 0x3a0c16); pen.ellipse(mx, my + r * .07, r * .12, r * .08, 0xe8606a); }
    else if (e === 'hurtH' || e === 'ko') pen.ellipse(mx, my + r * .05, r * .18, r * .26, 0x3a0c16);
    else if (e === 'win') pen.polyline([mx - f * r * .2, my - r * .04, mx, my + r * .1, mx + f * r * .2, my - r * .1], 2.4 * sc, 0x5a1a24);
    else pen.line(mx - f * r * .18, my, mx + f * r * .14, my + r * .02, 2.4 * sc, 0x5a1a24);
    if (look.blush) pen.ellipse(c.x + f * r * .18, c.y + r * .36, r * .2, r * .12, 0xff7a8a, .5);
    if (look.facial) look.facial(pen, J, look, e);
  }

  var DECO = {};
  function draw(pen, J, look, expr) {
    var i, d = look.deco || [];
    for (i = 0; i < d.length; i++) if (DECO[d[i]]) DECO[d[i]](pen, J, look, 'behind');
    hairBack(pen, J, look); arm(pen, J, look, false); leg(pen, J, look, false);
    torso(pen, J, look);
    for (i = 0; i < d.length; i++) if (DECO[d[i]]) DECO[d[i]](pen, J, look, 'body');
    leg(pen, J, look, true);
    if (look.skirt) look.skirt(pen, J, look);
    pen.line(J.neck.x, J.neck.y, J.head.x, J.head.y + J.hr * .3, J.hr * .62 + 4 * J.sc, OL); pen.line(J.neck.x, J.neck.y, J.head.x, J.head.y + J.hr * .3, J.hr * .62, sh(look.skin, .92));
    face(pen, J, look, expr); hairFront(pen, J, look);
    for (i = 0; i < d.length; i++) if (DECO[d[i]]) DECO[d[i]](pen, J, look, 'head');
    arm(pen, J, look, true);
    for (i = 0; i < d.length; i++) if (DECO[d[i]]) DECO[d[i]](pen, J, look, 'front');
  }
  G.Rig = { POSE: POSE, BASE: BASE, lerpPose: lerpPose, walkPose: walkPose, solve: solve, draw: draw, DECO: DECO, sh: sh, lit: lit, ik: ik, OL: OL, P: P };
})(window);
