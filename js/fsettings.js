/* FSettings — 第二作設定（經 SaveManager 持久化） */
(function (G) {
  'use strict';
  var DEF = { easy: true, wins: 2, time: 99, diff: 1, voice: true, grunt: true, music: true, shake: 1, btnSize: 1, btnOpacity: .6, leftHand: false, vibrate: true, touch: 'auto', quality: 'auto', showFps: false };
  var D = {}, cbs = [], k;
  var FS = {
    load: function () { var s = G.SaveManager ? SaveManager.section('fight', DEF) : DEF; for (k in DEF) D[k] = s[k]; this._fix(); return this; },
    _fix: function () {
      D.btnSize = Math.min(1.5, Math.max(.7, +D.btnSize || 1)); D.btnOpacity = Math.min(.95, Math.max(.2, +D.btnOpacity || .6));
      D.wins = D.wins === 1 ? 1 : D.wins === 3 ? 3 : 2; D.diff = Math.min(2, Math.max(0, D.diff | 0));
      D.shake = Math.min(2, Math.max(0, +D.shake)); if (isNaN(D.shake)) D.shake = 1;
      D.time = [30, 60, 99].indexOf(D.time) < 0 ? 99 : D.time;
      if (['auto', 'on', 'off'].indexOf(D.touch) < 0) D.touch = 'auto'; if (['auto', 'high', 'mid', 'low'].indexOf(D.quality) < 0) D.quality = 'auto';
    },
    get: function (n) { return D[n]; },
    set: function (n, v) { D[n] = v; this._fix(); if (G.SaveManager) SaveManager.saveSection('fight', D); cbs.forEach(function (f) { try { f(n); } catch (e) {} }); },
    reset: function () { for (k in DEF) D[k] = DEF[k]; if (G.SaveManager) SaveManager.saveSection('fight', D); cbs.forEach(function (f) { f('*'); }); },
    onChange: function (f) { cbs.push(f); }
  };
  FS.load(); G.FSettings = FS;
})(window);
