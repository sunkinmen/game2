/* UI — 選單用的小工具：面板、可操作清單（鍵盤 / 搖桿 / 觸控點選）、血條、字型。
 * 所有座標為邏輯座標（960×540）。 */
(function (G) {
  'use strict';
  var FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif';
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  var UI = {
    FONT: FONT, rr: rr,
    text: function (c, s, x, y, size, col, align, o) {
      o = o || {}; c.font = (o.weight || 700) + ' ' + size + 'px ' + FONT; c.textAlign = align || 'left'; c.textBaseline = o.base || 'middle';
      if (o.stroke) { c.lineWidth = o.sw || 4; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); } c.fillStyle = col || '#fff'; c.fillText(s, x, y);
    },
    panel: function (c, x, y, w, h, o) {
      o = o || {}; c.save(); rr(c, x, y, w, h, 14); c.fillStyle = o.fill || 'rgba(14,16,34,.9)'; c.fill();
      c.lineWidth = 3; c.strokeStyle = '#e8b84a'; c.stroke(); rr(c, x + 5, y + 5, w - 10, h - 10, 10); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,224,150,.4)'; c.stroke();
      if (o.title) { UI.text(c, o.title, x + w / 2, y + 30, 24, '#ffd870', 'center', { weight: 900 }); c.fillStyle = 'rgba(232,184,74,.5)'; c.fillRect(x + 24, y + 50, w - 48, 2); } c.restore();
    },
    /* items: [{label, value:fn, onOk, onLeft, onRight, disabled, hint}] */
    list: function (items, x, y, w, ih, o) { return { items: items, sel: 0, x: x, y: y, w: w, ih: ih, o: o || {} }; },
    nav: function (l, dir) {
      var n = l.items.length, it, i;
      if (dir === 'up' || dir === 'down') { for (i = 0; i < n; i++) { l.sel = (l.sel + (dir === 'up' ? -1 : 1) + n) % n; if (!l.items[l.sel].disabled) break; } G.FxAudio.play('blip'); return 'move'; }
      it = l.items[l.sel]; if (!it || it.disabled) return;
      if (dir === 'left' && it.onLeft) { it.onLeft(); G.FxAudio.play('blip'); return 'adj'; }
      if (dir === 'right' && it.onRight) { it.onRight(); G.FxAudio.play('blip'); return 'adj'; }
      if (dir === 'ok' && it.onOk) { G.FxAudio.play('ok'); it.onOk(); return 'ok'; }
    },
    pointer: function (l, type, px, py) {
      var i = Math.floor((py - l.y) / l.ih); if (px < l.x || px > l.x + l.w || i < 0 || i >= l.items.length) return false;
      var it = l.items[i]; if (it.disabled) return true;
      if (type === 'move') { if (l.sel !== i) { l.sel = i; } return true; }
      if (type === 'down') { l.sel = i; if (it.onRight && px > l.x + l.w * .72 && it.onLeft && px < l.x + l.w * .86 && false) { } if (it.onOk) { G.FxAudio.play('ok'); it.onOk(); } else if (it.onRight) { G.FxAudio.play('blip'); it.onRight(); } return true; }
      return true;
    },
    drawList: function (c, l, t) {
      var i, it, y, o = l.o, size = o.size || 24;
      for (i = 0; i < l.items.length; i++) {
        it = l.items[i]; y = l.y + i * l.ih; var sel = i === l.sel;
        if (sel) { var g = c.createLinearGradient(l.x, 0, l.x + l.w, 0); g.addColorStop(0, 'rgba(232,184,74,.0)'); g.addColorStop(.1, 'rgba(232,184,74,.35)'); g.addColorStop(.9, 'rgba(232,184,74,.35)'); g.addColorStop(1, 'rgba(232,184,74,0)'); c.fillStyle = g; c.fillRect(l.x, y + 3, l.w, l.ih - 6); c.fillStyle = '#ffd870'; c.beginPath(); var a = Math.sin(t * 8) * 3; c.moveTo(l.x + 8 + a, y + l.ih / 2 - 9); c.lineTo(l.x + 8 + a, y + l.ih / 2 + 9); c.lineTo(l.x + 22 + a, y + l.ih / 2); c.fill(); }
        var col = it.disabled ? '#6a6e86' : sel ? '#fff' : '#cdd3ee', v = it.value ? it.value() : null;
        UI.text(c, it.label, l.x + (o.center ? l.w / 2 : 34), y + l.ih / 2, size, col, o.center ? 'center' : 'left', { weight: sel ? 900 : 700 });
        if (v != null) { UI.text(c, (it.onLeft && sel ? '◀ ' : '') + v + (it.onRight && sel ? ' ▶' : ''), l.x + l.w - 18, y + l.ih / 2, size - 2, sel ? '#ffd870' : '#a8b0d8', 'right', { weight: 800 }); }
      }
    },
    bar: function (c, x, y, w, h, k, col, back) { k = Math.max(0, Math.min(1, k)); c.fillStyle = back || 'rgba(0,0,0,.55)'; c.fillRect(x, y, w, h); c.fillStyle = col; c.fillRect(x, y, w * k, h); },
    pill: function (c, x, y, w, h, fill, stroke) { rr(c, x, y, w, h, h / 2); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 2; c.strokeStyle = stroke; c.stroke(); } },
    wrap: function (c, s, x, y, maxW, lh, size, col) {
      var i, line = '', ln = 0; c.font = '600 ' + size + 'px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = col || '#dfe4ff';
      for (i = 0; i < s.length; i++) { var t = line + s[i]; if (c.measureText(t).width > maxW) { c.fillText(line, x, y + ln * lh); ln++; line = s[i]; } else line = t; } c.fillText(line, x, y + ln * lh); return ln + 1;
    }
  };

  UI.settingsItems = function () {
    var FS = G.FSettings, FA = G.FxAudio;
    function tog(label, key, after) { var f = function () { FS.set(key, !FS.get(key)); if (after) after(); }; return { label: label, value: function () { return FS.get(key) ? '開' : '關'; }, onOk: f, onLeft: f, onRight: f }; }
    function cyc(label, key, arr, names) { var n = arr.length, idx = function () { var i = arr.indexOf(FS.get(key)); return i < 0 ? 0 : i; }; var mv = function (d) { return function () { FS.set(key, arr[(idx() + d + n) % n]); }; }; return { label: label, value: function () { return names ? names[idx()] : arr[idx()]; }, onOk: mv(1), onLeft: mv(-1), onRight: mv(1) }; }
    function num(label, key, lo, hi, st, fmt) { var mv = function (d) { return function () { var v = Math.round((FS.get(key) + d * st) * 100) / 100; FS.set(key, Math.max(lo, Math.min(hi, v))); }; }; return { label: label, value: function () { return fmt(FS.get(key)); }, onOk: function () { var v = FS.get(key) + st; FS.set(key, v > hi + 1e-6 ? lo : v); }, onLeft: mv(-1), onRight: mv(1) }; }
    return [
      tog('簡易模式（小招 / 大招按鈕）', 'easy'), tog('角色語音', 'voice'), tog('喊叫聲', 'grunt'), tog('背景音樂', 'music', function () { FA.refresh(); }),
      cyc('每場回合數', 'wins', [1, 2, 3], ['1 回合', '2 勝制', '3 勝制']), cyc('回合時間', 'time', [30, 60, 99], ['30 秒', '60 秒', '99 秒']), cyc('CPU 難度', 'diff', [0, 1, 2], ['簡單', '普通', '困難']),
      cyc('畫面震動', 'shake', [0, 1, 2], ['關', '標準', '強']), cyc('觸控按鍵', 'touch', ['auto', 'on', 'off'], ['自動', '一律顯示', '隱藏']),
      num('按鍵大小', 'btnSize', .7, 1.5, .1, function (v) { return Math.round(v * 100) + '%'; }), num('按鍵透明度', 'btnOpacity', .2, .95, .15, function (v) { return Math.round(v * 100) + '%'; }),
      tog('左手模式（左右對調）', 'leftHand'), tog('觸控震動', 'vibrate'),
      cyc('畫質', 'quality', ['auto', 'high', 'mid', 'low'], ['自動', '高', '中', '低（省電）']), tog('顯示 FPS', 'showFps')
    ];
  };
  UI.drawMoves = function (c, ch, x, y, w) {
    var M = G.Moves, h = 490; UI.panel(c, x, y, w, h, { title: ch.name + '（' + ch.full + '）・招式表' });
    var lx = x + 30, rx = x + w / 2 + 10, yy = y + 82, lh = 27;
    UI.text(c, '基本技', lx, yy, 20, '#ffd870', 'left', { weight: 900 }); UI.text(c, '必殺技', rx, yy, 20, '#ffd870', 'left', { weight: 900 });
    var N = [['手', '小拳'], ['→ + 手', '重拳'], ['↓ + 手', '蹲拳'], ['腳', '小腳'], ['→ + 腳', '重腳'], ['↓ + 腳', '掃堂腿（下段）'], ['空中 手 / 腳', '空中攻擊'], ['手 + 腳（貼身）', '投技']], i;
    for (i = 0; i < N.length; i++) { UI.text(c, N[i][0], lx, yy + 34 + i * lh, 17, '#9ac8ff', 'left', { weight: 800 }); UI.text(c, N[i][1], lx + 150, yy + 34 + i * lh, 17, '#fff', 'left'); }
    var S = [M.special(ch.id, 1), M.special(ch.id, 2), M.special(ch.id, 3)], lab = ['小招 A', '小招 B', '大招（氣量滿）'];
    for (i = 0; i < 3; i++) { var m = S[i], by = yy + 34 + i * 74; UI.text(c, m.name, rx, by, 21, i === 2 ? '#ffb23a' : '#fff', 'left', { weight: 900 }); UI.text(c, M.motionName(m), rx, by + 26, 16, '#9ac8ff', 'left', { weight: 800 }); UI.text(c, '簡易模式：' + lab[i] + ' 按鈕', rx, by + 46, 14, '#aab2d8', 'left'); }
    var sy = yy + 34 + 8 * lh + 12; c.fillStyle = 'rgba(232,184,74,.35)'; c.fillRect(x + 24, sy - 14, w - 48, 2);
    UI.wrap(c, ch.bio, lx, sy + 12, w - 70, 22, 16, '#dfe4ff');
    var st = [['力量', ch.stats.pow], ['速度', ch.stats.spd], ['射程', ch.stats.rng], ['防禦', ch.stats.def]];
    for (i = 0; i < 4; i++) { var sx = lx + i * 175; UI.text(c, st[i][0], sx, sy + 66, 16, '#ffd870', 'left', { weight: 800 }); for (var k = 0; k < 5; k++) { c.fillStyle = k < st[i][1] ? '#ffd24a' : 'rgba(255,255,255,.2)'; c.fillRect(sx + 48 + k * 18, sy + 58, 14, 14); } }
  };
  G.UI = UI;
})(window);
