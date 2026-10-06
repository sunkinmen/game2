/* FxAudio — 全部由 Web Audio 即時合成（無音檔）：
 *  - SFX：拳腳 / 格擋 / 投技 / 氣功 / 鑼鼓 / KO / 歡呼
 *  - Grunt：以「共振峰合成」製作的喊叫聲（出拳哈、受擊啊、KO 長音），音高隨角色
 *  - Voice：Web Speech API（zh-TW）念角色台詞，沒有中文語音時自動略過
 *  - BGM：16 步音序器，10 首（選單 / 選角 / 8 個場景），五聲音階，帶鼓組
 * 瀏覽器要求使用者手勢才能發聲：第一次觸控 / 按鍵時自動解鎖。 */
(function (G) {
  'use strict';
  var ctx = null, master, sfxBus, musBus, noiseBuf, unlocked = false, curTrack = null, sched = null, nextT = 0, step = 0, trk = null, lastSfx = {}, vocalBus;
  var FS = function (k) { return G.FSettings ? FSettings.get(k) : true; };

  function ensure() {
    if (ctx) return ctx;
    var AC = G.AudioContext || G.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = .8;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = .9; sfxBus.connect(master);
    vocalBus = ctx.createGain(); vocalBus.gain.value = .75; vocalBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = .32; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function unlock() {
    if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume();
    if (!unlocked) { unlocked = true; var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); try { s.start(0); } catch (e) {} if (G.speechSynthesis) try { G.speechSynthesis.getVoices(); } catch (e) {} if (curTrack && !sched) FX.music(curTrack); }
  }
  ['touchend', 'mousedown', 'keydown', 'pointerdown'].forEach(function (ev) { G.addEventListener(ev, unlock, { passive: true }); });
  G.document.addEventListener('visibilitychange', function () { if (!ctx) return; if (G.document.hidden) ctx.suspend(); else if (unlocked) ctx.resume(); });

  function tone(type, f0, f1, dur, vol, t0, bus, o) {
    var t = t0 || ctx.currentTime, os = ctx.createOscillator(), g = ctx.createGain(); o = o || {};
    os.type = type; os.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.a || .004)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(bus || sfxBus); os.start(t); os.stop(t + dur + .05); return os;
  }
  function noise(dur, vol, ft, f0, f1, t0, bus, q) {
    var t = t0 || ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = ft; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  var SFX = {
    hit_l: function () { noise(.09, .7, 'bandpass', 1800, 700, 0, 0, 1.2); tone('triangle', 220, 90, .09, .6); },
    hit_m: function () { noise(.14, .9, 'bandpass', 1400, 400, 0, 0, 1); tone('triangle', 170, 55, .15, .8); },
    hit_h: function () { noise(.26, 1, 'lowpass', 2800, 200); tone('sine', 120, 38, .3, 1); tone('sawtooth', 200, 60, .12, .4); },
    block: function () { noise(.07, .6, 'highpass', 3000, 3000, 0, 0, 2); tone('square', 520, 380, .06, .3); },
    whoosh: function () { noise(.2, .35, 'bandpass', 500, 2600, 0, 0, 1.5); },
    whoosh2: function () { noise(.32, .45, 'bandpass', 300, 3200, 0, 0, 1.2); },
    throw: function () { noise(.16, .8, 'lowpass', 1400, 200); tone('sine', 140, 50, .25, .9); },
    land: function () { noise(.1, .5, 'lowpass', 900, 200); tone('sine', 90, 45, .12, .6); },
    proj: function () { tone('sawtooth', 300, 900, .25, .25); noise(.25, .3, 'bandpass', 800, 2400, 0, 0, 2); },
    proj_hit: function () { noise(.16, .8, 'bandpass', 2000, 500, 0, 0, 1); tone('sine', 300, 80, .18, .7); },
    gong: function () { [196, 293, 397, 520].forEach(function (f, i) { tone('sine', f, f * .985, 2.4 - i * .3, .35 / (i + 1)); }); noise(.3, .3, 'bandpass', 2000, 800); },
    drum: function () { tone('sine', 160, 60, .28, 1); noise(.06, .5, 'lowpass', 1200, 400); },
    ko: function () { SFX.hit_h(); tone('sawtooth', 600, 60, .9, .4); G.setTimeout(function () { if (ctx) SFX.gong(); }, 250); },
    crowd: function () { noise(1.6, .4, 'bandpass', 1200, 2400, 0, 0, .6); noise(1.6, .3, 'bandpass', 700, 1500, ctx.currentTime + .1, 0, .5); },
    ult_go: function () { tone('sawtooth', 120, 1200, .6, .4); noise(.6, .5, 'bandpass', 300, 5000, 0, 0, 1); G.setTimeout(function () { if (ctx) { SFX.hit_h(); SFX.gong(); } }, 520); },
    blip: function () { tone('square', 880, 1100, .05, .25); },
    ok: function () { tone('square', 660, 990, .08, .3); tone('square', 990, 1320, .1, .25, ctx.currentTime + .07); },
    back: function () { tone('square', 500, 330, .1, .25); },
    count: function () { tone('square', 660, 660, .12, .3); },
    fight: function () { tone('square', 880, 880, .25, .35); tone('square', 1320, 1320, .35, .3, ctx.currentTime + .1); SFX.drum(); },
    bell: function () { tone('sine', 1320, 1318, .8, .3); tone('sine', 1980, 1976, .6, .15); },
    meter: function () { tone('triangle', 600, 1400, .18, .3); },
    jingle: function () { var t = ctx.currentTime, n = [523, 659, 784, 1047, 784, 1047, 1319]; n.forEach(function (f, i) { tone('square', f, f, .2, .22, t + i * .11); tone('triangle', f / 2, f / 2, .2, .3, t + i * .11); }); }
  };
  var FX = {
    ok: function () { return !!ensure(); },
    play: function (n, opts) {
      if (!ensure() || !unlocked || ctx.state !== 'running') return; var now = ctx.currentTime, gap = (opts && opts.gap) || .025;
      if (lastSfx[n] && now - lastSfx[n] < gap) return; lastSfx[n] = now;
      try { if (SFX[n]) SFX[n](); } catch (e) {}
    },
    /* 共振峰喊叫：kind = atk / hurt / ko / ult；pitch 來自角色（0.7 ~ 1.6） */
    grunt: function (pitch, kind) {
      if (!FS('grunt') || !ensure() || !unlocked || ctx.state !== 'running') return; var t = ctx.currentTime, p = pitch || 1;
      var F = { atk: [[800, 1200], .16, 1.15, .9], hurt: [[700, 1100], .2, 1.3, .8], ko: [[620, 1000], .7, .55, .9], ult: [[800, 1300], .5, 1.05, 1] }[kind] || [[800, 1200], .15, 1, .8];
      var o = ctx.createOscillator(), g = ctx.createGain(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), dur = F[1];
      o.type = 'sawtooth'; o.frequency.setValueAtTime(130 * p * F[2], t); o.frequency.exponentialRampToValueAtTime(130 * p * (kind === 'ko' ? .5 : kind === 'hurt' ? .8 : 1.0), t + dur);
      f1.type = f2.type = 'bandpass'; f1.Q.value = f2.Q.value = 6; f1.frequency.setValueAtTime(F[0][0], t); f1.frequency.linearRampToValueAtTime(F[0][0] * 1.25, t + dur * .6); f2.frequency.setValueAtTime(F[0][1], t); f2.frequency.linearRampToValueAtTime(F[0][1] * .85, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(F[3] * 1.4, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(vocalBus); o.start(t); o.stop(t + dur + .05);
      noise(dur * .6, .25, 'bandpass', 1800, 1200, t, vocalBus, 1);
    },
    /* 台詞：Web Speech zh-TW */
    say: function (text, tts, queue) {
      if (!FS('voice') || !G.speechSynthesis || !G.SpeechSynthesisUtterance || !text) return;
      try {
        var u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; tts = tts || {}; u.pitch = tts.pitch || 1; u.rate = tts.rate || 1; u.volume = 1;
        var vs = G.speechSynthesis.getVoices(), v = null, i; for (i = 0; i < vs.length; i++) { var l = (vs[i].lang || '').replace('_', '-'); if (l === 'zh-TW' || /zh-Hant/i.test(l)) { v = vs[i]; break; } }
        if (v) u.voice = v; else if (vs.length && !vs.some(function (x) { return /^zh/i.test(x.lang); })) return;
        if (!queue) G.speechSynthesis.cancel(); G.speechSynthesis.speak(u);
      } catch (e) {}
    },
    stopSpeech: function () { try { G.speechSynthesis && G.speechSynthesis.cancel(); } catch (e) {} },
    /* ---------- BGM ---------- */
    music: function (name) {
      curTrack = name; this.stopMusic(true); if (!FS('music') || !name || !TR[name]) return; if (!ensure() || !unlocked) return;
      trk = TR[name]; trk.pat = trk.pat || compose(name, trk); step = 0; nextT = ctx.currentTime + .08; musBus.gain.cancelScheduledValues(ctx.currentTime); musBus.gain.setValueAtTime(.0001, ctx.currentTime); musBus.gain.linearRampToValueAtTime(.32, ctx.currentTime + .6);
      sched = G.setInterval(tick, 40);
    },
    stopMusic: function (keep) { if (sched) { G.clearInterval(sched); sched = null; } if (!keep) curTrack = null; },
    fadeMusic: function (to) { if (ctx && musBus) { musBus.gain.cancelScheduledValues(ctx.currentTime); musBus.gain.linearRampToValueAtTime(to, ctx.currentTime + .4); } },
    refresh: function () { if (!FS('music')) this.stopMusic(true); else if (curTrack && !sched) this.music(curTrack); }
  };
  var TR = {
    menu: { bpm: 96, root: 57, sc: [0, 2, 4, 7, 9], dr: 'march', lead: 'triangle', prog: [0, -3, -5, -2] },
    sel: { bpm: 112, root: 55, sc: [0, 3, 5, 7, 10], dr: 'rock', lead: 'square', prog: [0, 0, -2, -4] },
    st0: { bpm: 128, root: 60, sc: [0, 2, 4, 7, 9], dr: 'four', lead: 'sawtooth', prog: [0, -3, -5, -7] },
    st1: { bpm: 118, root: 52, sc: [0, 2, 5, 7, 9], dr: 'march', lead: 'square', prog: [0, 5, -2, 3] },
    st2: { bpm: 104, root: 55, sc: [0, 3, 5, 7, 10], dr: 'sparse', lead: 'triangle', prog: [0, -2, -4, -2] },
    st3: { bpm: 124, root: 59, sc: [0, 2, 4, 7, 9], dr: 'four', lead: 'sawtooth', prog: [0, -5, -3, -7] },
    st4: { bpm: 84, root: 53, sc: [0, 2, 4, 7, 9], dr: 'sparse', lead: 'triangle', prog: [0, -3, -7, -5] },
    st5: { bpm: 90, root: 57, sc: [0, 3, 5, 7, 10], dr: 'sparse', lead: 'square', prog: [0, -4, -2, -5] },
    st6: { bpm: 132, root: 62, sc: [0, 2, 3, 7, 8], dr: 'rock', lead: 'square', prog: [0, 0, -2, 3] },
    st7: { bpm: 140, root: 50, sc: [0, 1, 5, 7, 8], dr: 'rock', lead: 'sawtooth', prog: [0, 0, -4, -2] }
  };
  function seeded(s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function compose(name, T) {
    var r = seeded(name.split('').reduce(function (a, c) { return a * 31 + c.charCodeAt(0); }, 7)), bars = [], b, i, idx = 2;
    for (b = 0; b < 4; b++) {
      var lead = [], motif = b === 2 ? null : bars[0];
      for (i = 0; i < 16; i++) {
        if (motif && b % 2 === 1 && i < 10) { lead.push(motif.lead[i]); continue; }
        if (i % 2 === 0 || r() < .3) { if (r() < .22) { lead.push(-1); continue; } idx = Math.max(0, Math.min(11, idx + Math.round((r() - .5) * 4))); lead.push(idx); } else lead.push(-1);
      }
      bars.push({ lead: lead });
    }
    return bars;
  }
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function note(idx, T, off) { var sc = T.sc, o = Math.floor(idx / sc.length); return T.root + off + sc[idx % sc.length] + 12 * o; }
  function tick() {
    if (!ctx || !trk) return; var spb = 60 / trk.bpm / 4;
    while (nextT < ctx.currentTime + .18) {
      var bar = (step >> 4) & 3, s = step & 15, pat = trk.pat[bar], off = trk.prog[bar], t = nextT, sw = (s & 1) ? spb * .08 : 0; t += sw;
      var L = pat.lead[s]; if (L >= 0) tone(trk.lead, midi(note(L, trk, off) + 12), 0, spb * 1.6, .13, t, musBus);
      if (s % 4 === 0 || (trk.dr === 'rock' && s % 8 === 6)) tone('triangle', midi(trk.root + off - 12 + (s % 8 === 6 ? 7 : 0)), 0, spb * 2.2, .34, t, musBus);
      if (s % 2 === 0) tone('sine', midi(note([0, 2, 4, 2][(s >> 1) & 3], trk, off)), 0, spb * 1.2, .06, t, musBus);
      var d = trk.dr;
      if ((d === 'four' && s % 4 === 0) || (d === 'rock' && (s === 0 || s === 8 || s === 10)) || (d === 'march' && s % 8 === 0) || (d === 'sparse' && s === 0)) tone('sine', 150, 45, .16, .55, t, musBus);
      if ((d !== 'sparse' && (s === 4 || s === 12)) || (d === 'sparse' && s === 8)) noise(.1, .22, 'highpass', 1800, 1800, t, musBus, .8);
      if (d !== 'sparse' && s % 2 === 0) noise(.03, .07, 'highpass', 7000, 7000, t, musBus, .8);
      step++; nextT += spb;
    }
  }
  G.FxAudio = FX;
})(window);
