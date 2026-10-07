/* FxAudio — 音效 / 配樂優先使用離線渲染的音檔（assets/audio/），任何一項載入失敗都會自動退回下方的即時合成：
 *  - SFX：assets/audio/sfx.wav + sfx.json（41 個片段、拳腳多版本隨機輪替）
 *  - BGM：assets/audio/<曲名>.m4a，無縫循環（含解碼延遲校正 cal.m4a）
 *  - 角色配音：assets/voice/<角色id>/<名稱>.m4a（有檔就用，沒有就退回 Web Speech / 合成喊叫）
 * 原本的即時合成保留如下：
 *  - SFX：拳腳 / 格擋 / 投技 / 氣功 / 鑼鼓 / KO / 歡呼
 *  - Grunt：以「共振峰合成」製作的喊叫聲（出拳哈、受擊啊、KO 長音），音高隨角色
 *  - Voice：Web Speech API（zh-TW）念角色台詞，沒有中文語音時自動略過
 *  - BGM：16 步音序器，10 首（選單 / 選角 / 8 個場景），五聲音階，帶鼓組
 * 瀏覽器要求使用者手勢才能發聲：第一次觸控 / 按鍵時自動解鎖。 */
(function (G) {
  'use strict';
  var ctx = null, master, sfxBus, musBus, noiseBuf, unlocked = false, curTrack = null, sched = null, nextT = 0, step = 0, trk = null, lastSfx = {}, vocalBus, bank = null, bankState = 0, calDelay = 0, calState = 0, tracks = {}, loop = null, trackInfo = null, voices = {}, voiceCur = null;
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
    if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume(); loadBank(); calibrate();
    if (!unlocked) { unlocked = true; var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); try { s.start(0); } catch (e) {} if (G.speechSynthesis) try { G.speechSynthesis.getVoices(); } catch (e) {} if (curTrack && !sched) FX.music(curTrack); }
  }
  ['touchend', 'mousedown', 'keydown', 'pointerdown'].forEach(function (ev) { G.addEventListener(ev, unlock, { passive: true }); });
  G.document.addEventListener('visibilitychange', function () { if (!ctx) return; if (G.document.hidden) ctx.suspend(); else if (unlocked) ctx.resume(); });


  /* ---------- 音檔引擎 ---------- */
  var AB = 'assets/audio/', EXT = (function () { try { var a = G.document.createElement('audio'); if (a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"')) return 'm4a'; } catch (e) {} return 'ogg'; })();
  function fetchBuf(url, ok, bad) {
    try {
      var x = new G.XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
      x.onload = function () { if (x.status !== 200 && x.status !== 0) { bad && bad(); return; } try { var p = ctx.decodeAudioData(x.response, function (b) { ok(b); }, function () { bad && bad(); }); if (p && p.catch) p.catch(function () {}); } catch (e) { bad && bad(); } };
      x.onerror = function () { bad && bad(); }; x.send();
    } catch (e) { bad && bad(); }
  }
  function loadBank() {
    if (bankState || !ctx) return; bankState = 1;
    var x = new G.XMLHttpRequest(); x.open('GET', AB + 'sfx.json');
    x.onload = function () { try { var j = JSON.parse(x.responseText); fetchBuf(AB + 'sfx.wav', function (b) { bank = { buf: b, clips: j.clips, vars: {} }; Object.keys(j.clips).forEach(function (k) { var m = /^(.*)~\d$/.exec(k), base = m ? m[1] : k; (bank.vars[base] = bank.vars[base] || []).push(k); }); bankState = 2; }, function () { bankState = 3; }); } catch (e) { bankState = 3; } };
    x.onerror = function () { bankState = 3; }; x.send();
  }
  var GAIN = { blip: .55, ok: .6, back: .55, count: .6, whoosh: .7, whoosh2: .75, land: .9, crowd: .6, bell: .7, meter: .6, jingle: .6 };
  function playClip(n) {
    if (!bank) return false; var v = bank.vars[n]; if (!v) return false; var k = v[(Math.random() * v.length) | 0], c = bank.clips[k]; if (!c) return false;
    var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bank.buf; g.gain.value = GAIN[n] || 1; s.connect(g); g.connect(sfxBus);
    s.playbackRate.value = 1 + (Math.random() - .5) * (/^(hit|block|whoosh|land)/.test(n) ? .06 : 0); s.start(0, c[0], c[1]); return true;
  }
  /* 解碼延遲校正：cal.m4a 的點擊聲在第 1.000 秒；解碼器若多留了起始靜音，就量得延遲，循環時跳過它。 */
  function calibrate() {
    if (calState || !ctx) return; calState = 1;
    fetchBuf(AB + 'cal.' + EXT, function (b) {
      var d = b.getChannelData(0), i; for (i = 0; i < d.length; i++) if (Math.abs(d[i]) > .3) break;
      var dl = i / b.sampleRate - 1; calDelay = dl > 0 && dl < .12 ? dl : 0; calState = 2;
    }, function () { calState = 3; });
  }
  function loadTrack(name, cb) {
    var t = tracks[name]; if (t && t.buf) { cb(t); return; } if (t && t.bad) return;
    t = tracks[name] = t || { cbs: [] }; t.cbs.push(cb); if (t.loading) return; t.loading = true;
    var go = function () {
      fetchBuf(AB + name + '.' + EXT, function (b) { t.buf = b; t.loading = false; t.cbs.splice(0).forEach(function (f) { f(t); }); }, function () { t.bad = true; t.loading = false; t.cbs.length = 0; });
    };
    if (trackInfo) { go(); return; }
    var x = new G.XMLHttpRequest(); x.open('GET', AB + 'music.json'); x.onload = function () { try { trackInfo = JSON.parse(x.responseText); } catch (e) { trackInfo = {}; } go(); }; x.onerror = function () { trackInfo = {}; go(); }; x.send();
  }
  function stopLoop(fade) {
    if (!loop) return; var l = loop; loop = null; G.clearInterval(l.timer);
    try { l.gain.gain.cancelScheduledValues(ctx.currentTime); l.gain.gain.setValueAtTime(l.gain.gain.value, ctx.currentTime); l.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (fade || .25)); } catch (e) {}
    l.srcs.forEach(function (s) { try { s.stop(ctx.currentTime + (fade || .25) + .05); } catch (e) {} });
  }
  function startLoop(name, t) {
    stopLoop(.3); var body = (trackInfo && trackInfo[name] && trackInfo[name].body) || (t.buf.duration - 2.2), g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(1, ctx.currentTime + .5); g.connect(musBus);
    var l = loop = { gain: g, srcs: [], next: ctx.currentTime + .08, body: body, name: name };
    var sched = function () {
      while (l.next < ctx.currentTime + 1.5) {
        var s = ctx.createBufferSource(); s.buffer = t.buf; s.connect(g); s.start(l.next, calDelay); l.srcs.push(s); l.next += body;
        if (l.srcs.length > 4) l.srcs.shift();
      }
    };
    sched(); l.timer = G.setInterval(function () { if (loop !== l) return; sched(); }, 250);
  }
  /* ---------- 角色配音檔 ---------- */
  function voiceUrl(id, n) { return 'assets/voice/' + id + '/' + n + '.' + EXT; }
  function loadVoice(id, name, cb) {
    var key = id + '/' + name, v = voices[key]; if (v) { if (v.buf && cb) cb(v); return; } v = voices[key] = { buf: null, bad: false };
    fetchBuf(voiceUrl(id, name), function (b) { v.buf = b; cb && cb(v); }, function () { v.bad = true; });
  }
  function playVoice(key, queue) {
    var v = voices[key]; if (!v || !v.buf || !ctx) return false;
    if (voiceCur && !queue) { try { voiceCur.stop(); } catch (e) {} }
    var s = ctx.createBufferSource(); s.buffer = v.buf; s.connect(vocalBus); s.start(0); voiceCur = s; return true;
  }
  function pickVariant(id, kind, n) {
    var ok = [], i, v; for (i = 1; i <= n; i++) { v = voices[id + '/' + kind + i]; if (v && v.buf) ok.push(id + '/' + kind + i); } return ok.length ? ok[(Math.random() * ok.length) | 0] : null;
  }
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
    block_ex: function () { SFX.block(); tone('square', 900, 300, .12, .3); },
    counter: function () { tone('sawtooth', 1400, 500, .18, .35); noise(.12, .6, 'highpass', 3000, 1); },
    crush: function () { SFX.hit_h(); noise(.5, .9, 'bandpass', 2400, 3000, 0, 0, 1); tone('triangle', 1800, 200, .5, .4); G.setTimeout(function () { if (ctx) tone('sine', 90, 30, .5, .8); }, 120); },
    ex_go: function () { tone('sawtooth', 200, 900, .28, .35); noise(.3, .5, 'bandpass', 600, 4000, 0, 0, 1); tone('sine', 1300, 1300, .2, .3); },
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
    debug: function () { return { bank: bankState, cal: calState, calDelay: calDelay, loop: loop ? loop.name : null, tracks: Object.keys(tracks).map(function (k) { return k + ':' + (tracks[k].buf ? 'ok' : tracks[k].bad ? 'bad' : '...'); }), ctx: ctx && ctx.state, voices: Object.keys(voices).length }; },
    play: function (n, opts) {
      if (!ensure() || !unlocked || ctx.state !== 'running') return; var now = ctx.currentTime, gap = (opts && opts.gap) || .025;
      if (lastSfx[n] && now - lastSfx[n] < gap) return; lastSfx[n] = now;
      try { if (playClip(n)) return; if (SFX[n]) SFX[n](); } catch (e) {}
    },
    /* 共振峰喊叫：kind = atk / hurt / ko / ult；pitch 來自角色（0.7 ~ 1.6） */
    grunt: function (pitch, kind, id) {
      if (!FS('grunt') || !ensure() || !unlocked || ctx.state !== 'running') return; var t = ctx.currentTime, p = pitch || 1;
      if (id) { var vk = pickVariant(id, kind, 3); if (vk) { var s0 = ctx.createBufferSource(); s0.buffer = voices[vk].buf; s0.connect(vocalBus); s0.start(0); return; } }
      var F = { atk: [[800, 1200], .16, 1.15, .9], hurt: [[700, 1100], .2, 1.3, .8], ko: [[620, 1000], .7, .55, .9], ult: [[800, 1300], .5, 1.05, 1] }[kind] || [[800, 1200], .15, 1, .8];
      var o = ctx.createOscillator(), g = ctx.createGain(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), dur = F[1];
      o.type = 'sawtooth'; o.frequency.setValueAtTime(130 * p * F[2], t); o.frequency.exponentialRampToValueAtTime(130 * p * (kind === 'ko' ? .5 : kind === 'hurt' ? .8 : 1.0), t + dur);
      f1.type = f2.type = 'bandpass'; f1.Q.value = f2.Q.value = 6; f1.frequency.setValueAtTime(F[0][0], t); f1.frequency.linearRampToValueAtTime(F[0][0] * 1.25, t + dur * .6); f2.frequency.setValueAtTime(F[0][1], t); f2.frequency.linearRampToValueAtTime(F[0][1] * .85, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(F[3] * 1.4, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(vocalBus); o.start(t); o.stop(t + dur + .05);
      noise(dur * .6, .25, 'bandpass', 1800, 1200, t, vocalBus, 1);
    },
    /* 台詞：Web Speech zh-TW */
    say: function (text, tts, queue, key) {
      if (!FS('voice')) return; if (key && ensure() && unlocked && playVoice(key, queue)) return;
      if (key && voices[key] && !voices[key].bad && !voices[key].buf) { /* 配音檔載入中：略過這句，避免 TTS 與音檔重疊 */ }
      if (!G.speechSynthesis || !G.SpeechSynthesisUtterance || !text) return;
      try {
        var u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; tts = tts || {}; u.pitch = tts.pitch || 1; u.rate = tts.rate || 1; u.volume = 1;
        var vs = G.speechSynthesis.getVoices(), v = null, i; for (i = 0; i < vs.length; i++) { var l = (vs[i].lang || '').replace('_', '-'); if (l === 'zh-TW' || /zh-Hant/i.test(l)) { v = vs[i]; break; } }
        if (v) u.voice = v; else if (vs.length && !vs.some(function (x) { return /^zh/i.test(x.lang); })) return;
        if (!queue) G.speechSynthesis.cancel(); G.speechSynthesis.speak(u);
      } catch (e) {}
    },
    stopSpeech: function () { try { G.speechSynthesis && G.speechSynthesis.cancel(); } catch (e) {} try { voiceCur && voiceCur.stop(); } catch (e) {} },
    /* 預載角色配音（進對戰前呼叫；檔案不存在就安靜略過） */
    preloadVoice: function (id) {
      if (!ensure()) return; ['intro', 'ult', 'win', 'ko', 'name', 'atk1', 'atk2', 'atk3', 'hurt1', 'hurt2', 'hurt3', 'ko1', 'ult1'].forEach(function (n) { loadVoice(id, n); });
    },
    /* ---------- BGM ---------- */
    music: function (name) {
      curTrack = name; this.stopMusic(true); if (!FS('music') || !name || !TR[name]) return; if (!ensure() || !unlocked) return;
      var tt = tracks[name]; if (tt && tt.buf) { musBus.gain.cancelScheduledValues(ctx.currentTime); musBus.gain.setValueAtTime(.5, ctx.currentTime); startLoop(name, tt); return; }
      if (!(tt && tt.bad)) loadTrack(name, function (t) { if (curTrack === name && FS('music') && ctx) { if (sched) { G.clearInterval(sched); sched = null; } musBus.gain.cancelScheduledValues(ctx.currentTime); musBus.gain.setValueAtTime(.5, ctx.currentTime); startLoop(name, t); } });
      trk = TR[name]; trk.pat = trk.pat || compose(name, trk); step = 0; nextT = ctx.currentTime + .08; musBus.gain.cancelScheduledValues(ctx.currentTime); musBus.gain.setValueAtTime(.0001, ctx.currentTime); musBus.gain.linearRampToValueAtTime(.32, ctx.currentTime + .6);
      sched = G.setInterval(tick, 40);
    },
    stopMusic: function (keep) { if (sched) { G.clearInterval(sched); sched = null; } if (loop) stopLoop(.2); if (!keep) curTrack = null; },
    fadeMusic: function (to) { if (ctx && musBus) { musBus.gain.cancelScheduledValues(ctx.currentTime); musBus.gain.linearRampToValueAtTime(to, ctx.currentTime + .4); } },
    refresh: function () { if (!FS('music')) this.stopMusic(true); else if (curTrack && !sched && !loop) this.music(curTrack); }
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
