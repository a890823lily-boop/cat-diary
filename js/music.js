/* 背景音樂：全部由 Web Audio 即時合成，沒有音樂檔、離線也能播 */
const Music = (function () {
  'use strict';

  /* 旋律以八分音符為一格，數字是 MIDI 音高，null 是休止 */
  const TRACKS = [
    {
      id: 'musicbox',
      icon: '🎹',
      name: '貓咪音樂盒',
      type: 'melody',
      bpm: 92,
      steps: 8,
      voice: 'bell',
      melody: [
        [76, 79, 84, 79, 76, null, 74, null],
        [72, 76, 81, 76, 72, null, 71, null],
        [69, 72, 77, 72, 69, null, 72, 74],
        [74, null, 71, null, 67, null, null, null],
        [79, null, 76, 79, 84, null, 83, null],
        [81, null, 76, null, 72, null, 76, null],
        [77, 76, 74, 72, 69, null, 72, null],
        [74, null, 71, null, 72, null, null, null]
      ],
      chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
    },
    {
      id: 'lullaby',
      icon: '🌙',
      name: '晚安搖籃曲',
      type: 'melody',
      bpm: 120,
      steps: 6,
      voice: 'soft',
      melody: [
        [71, null, null, 69, 67, null],
        [67, null, null, 64, null, null],
        [64, null, 67, null, 72, null],
        [71, null, null, 69, null, null],
        [71, null, 74, null, 71, null],
        [69, null, 67, null, 64, null],
        [64, null, 62, null, 60, null],
        [62, null, null, null, null, null]
      ],
      chords: [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57], [55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]]
    },
    { id: 'rain', icon: '🌧️', name: '雨聲', type: 'rain' },
    { id: 'purr', icon: '🐱', name: '貓咪呼嚕聲', type: 'purr' }
  ];

  let ctx = null, master = null, reverb = null;
  let track = null;
  let playing = false;
  let timer = null;
  let nodes = [];        // 環境音持續播放的節點
  let step = 0, nextTime = 0;
  let volume = 0.6;
  const GAIN = 1.1; // 整體音量倍率
  const listeners = [];

  function readPref(key, fallback) {
    try { const v = localStorage.getItem('cat-diary:music-' + key); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function writePref(key, value) {
    try { localStorage.setItem('cat-diary:music-' + key, String(value)); } catch (e) { /* 忽略 */ }
  }

  volume = Number(readPref('volume', 0.6));
  track = TRACKS.find(function (t) { return t.id === readPref('track', 'musicbox'); }) || TRACKS[0];

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function setup() {
    if (ctx) return;
    // iPhone：讓靜音模式下也能播放（Safari 16.4 以上支援）
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 忽略 */ }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * GAIN;
    master.connect(ctx.destination);
    // 簡單的殘響，讓聲音比較柔和
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet);
    wet.connect(master);
  }

  function noiseBuffer(seconds, brown) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; d[i] = last * 3.5; } else d[i] = white;
    }
    return buf;
  }

  /* ---------- 樂器 ---------- */
  function note(time, midi, dur, vol, voice) {
    const out = ctx.createGain();
    out.connect(master);
    out.connect(reverb);
    const f = freq(midi);
    const partials = voice === 'bell' ? [[1, 1], [2, 0.35], [3, 0.12], [4.2, 0.05]] : [[1, 1], [2, 0.12]];
    partials.forEach(function (p) {
      const o = ctx.createOscillator();
      o.type = voice === 'bell' ? 'sine' : 'triangle';
      o.frequency.value = f * p[0];
      const g = ctx.createGain();
      const attack = voice === 'bell' ? 0.005 : 0.08;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol * p[1], time + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g);
      g.connect(out);
      o.start(time);
      o.stop(time + dur + 0.05);
    });
  }

  function pad(time, chord, dur, vol) {
    chord.forEach(function (m) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(vol, time + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, time + dur);
      o.connect(g);
      g.connect(master);
      g.connect(reverb);
      o.start(time);
      o.stop(time + dur + 0.05);
    });
  }

  /* ---------- 排程：每 25ms 預先排好接下來 0.15 秒的音符 ---------- */
  function schedule() {
    const t = track;
    const stepDur = 60 / t.bpm / 2;
    const total = t.melody.length * t.steps;
    while (nextTime < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / t.steps) % t.melody.length;
      const pos = step % t.steps;
      if (pos === 0) pad(nextTime, t.chords[bar], stepDur * t.steps, t.voice === 'bell' ? 0.035 : 0.05);
      const m = t.melody[bar][pos];
      if (m != null) note(nextTime, m, t.voice === 'bell' ? 1.6 : 1.2, t.voice === 'bell' ? 0.22 : 0.2, t.voice);
      nextTime += stepDur;
      step = (step + 1) % total;
    }
  }

  /* ---------- 環境音 ---------- */
  function startRain() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4, false);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    bp.Q.value = 0.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master);
    src.start();
    nodes.push(src);
    // 偶爾的雨滴聲
    timer = setInterval(function () {
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.5) continue;
        const tt = now + Math.random() * 0.1;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(1800 + Math.random() * 2500, tt);
        o.frequency.exponentialRampToValueAtTime(600, tt + 0.05);
        const dg = ctx.createGain();
        dg.gain.setValueAtTime(0.03 + Math.random() * 0.04, tt);
        dg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
        o.connect(dg); dg.connect(master); dg.connect(reverb);
        o.start(tt); o.stop(tt + 0.08);
      }
    }, 100);
  }

  function startPurr() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4, true);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    // 每秒約 26 下的震動感
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 26;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth); lfoDepth.connect(am.gain);
    // 一吸一吐的呼吸起伏（約 2.6 秒一次）
    const breath = ctx.createGain();
    breath.gain.value = 0.55;
    const slow = ctx.createOscillator();
    slow.frequency.value = 1 / 2.6;
    const slowDepth = ctx.createGain();
    slowDepth.gain.value = 0.35;
    slow.connect(slowDepth); slowDepth.connect(breath.gain);
    src.connect(lp); lp.connect(am); am.connect(breath); breath.connect(master);
    src.start(); lfo.start(); slow.start();
    nodes.push(src, lfo, slow);
  }

  function stopAll() {
    clearInterval(timer);
    timer = null;
    nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* 忽略 */ } });
    nodes = [];
  }

  function play() {
    setup();
    if (ctx.state === 'suspended') ctx.resume();
    stopAll();
    // 換曲時淡入
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume * GAIN, ctx.currentTime + 0.8);
    if (track.type === 'melody') {
      step = 0;
      nextTime = ctx.currentTime + 0.1;
      schedule();
      timer = setInterval(schedule, 25);
    } else if (track.type === 'rain') startRain();
    else startPurr();
    playing = true;
    notify();
  }

  function pause() {
    if (!playing) return;
    stopAll();
    if (ctx) ctx.suspend();
    playing = false;
    notify();
  }

  function select(id) {
    track = TRACKS.find(function (t) { return t.id === id; }) || TRACKS[0];
    writePref('track', track.id);
    play();
  }

  function setVolume(v) {
    volume = v;
    writePref('volume', v);
    if (master) master.gain.setTargetAtTime(v * GAIN, ctx.currentTime, 0.05);
  }

  function notify() {
    listeners.forEach(function (fn) { fn({ playing: playing, track: track, volume: volume }); });
  }

  return {
    tracks: TRACKS,
    play: play,
    pause: pause,
    toggle: function () { playing ? pause() : play(); },
    select: select,
    setVolume: setVolume,
    state: function () { return { playing: playing, track: track, volume: volume }; },
    onChange: function (fn) { listeners.push(fn); fn(this.state()); }
  };
})();
