/* 放鬆：呼吸練習、擼貓模式 */

/* ---------- 呼吸練習：跟著貓咪的肚子一起呼吸 ---------- */
const Breathe = (function () {
  'use strict';

  // 吸氣 4 秒、停 2 秒、吐氣 6 秒（吐氣比較長，比較容易放鬆）
  const PHASES = [
    { name: 'in', label: '慢慢吸氣…', secs: 4 },
    { name: 'hold', label: '停住…', secs: 2 },
    { name: 'out', label: '慢慢吐氣…', secs: 6 }
  ];
  const CYCLE = PHASES.reduce(function (s, p) { return s + p.secs; }, 0);

  const CAT = '<svg viewBox="0 0 300 210" class="breathe-svg" aria-hidden="true">' +
    '<ellipse cx="150" cy="192" rx="128" ry="12" fill="rgba(0,0,0,0.08)"/>' +
    '<path class="b-tail" d="M236 176 C276 176 286 140 262 128 C252 124 248 136 256 140 C268 148 262 166 232 164 Z" fill="#a88462" stroke="#4a3b33" stroke-width="3" stroke-linejoin="round"/>' +
    '<g class="b-body">' +
    '<ellipse cx="170" cy="150" rx="86" ry="42" fill="#a88462" stroke="#4a3b33" stroke-width="3"/>' +
    '<path d="M180 112 Q188 126 182 140 Q174 126 180 112 Z M206 114 Q216 128 208 142 Q198 128 206 114 Z M230 122 Q240 134 232 148 Q224 134 230 122 Z" fill="#6e5236"/>' +
    '<ellipse cx="150" cy="178" rx="44" ry="12" fill="#fffaf2" stroke="#4a3b33" stroke-width="3"/>' +
    '</g>' +
    '<g class="b-head">' +
    '<path d="M64 112 L60 74 L94 96 Z M104 96 L132 76 L130 114 Z" fill="#a88462" stroke="#4a3b33" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M68 104 L66 84 L86 97 Z M112 97 L127 86 L126 106 Z" fill="#f4b6b0"/>' +
    '<ellipse cx="96" cy="138" rx="46" ry="40" fill="#a88462" stroke="#4a3b33" stroke-width="3"/>' +
    '<path d="M96 100 Q102 110 96 120 Q90 110 96 100 Z" fill="#6e5236"/>' +
    '<ellipse cx="96" cy="160" rx="22" ry="14" fill="#fffaf2"/>' +
    '<path d="M68 136 Q76 142 84 136 M108 136 Q116 142 124 136" fill="none" stroke="#4a3b33" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M91 150 H101 L96 155 Z" fill="#e88a8a"/>' +
    '<path d="M96 155 Q92 161 87 158 M96 155 Q100 161 105 158" fill="none" stroke="#4a3b33" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="72" cy="152" r="6" fill="#f7a1b9" opacity="0.6"/><circle cx="120" cy="152" r="6" fill="#f7a1b9" opacity="0.6"/>' +
    '</g>' +
    '<ellipse cx="128" cy="184" rx="18" ry="9" fill="#fffaf2" stroke="#4a3b33" stroke-width="3"/>' +
    '<text class="b-z" x="140" y="70" font-size="20" font-weight="700" fill="#8a7b70" font-family="sans-serif">z</text>' +
    '<text class="b-z b-z2" x="156" y="52" font-size="16" font-weight="700" fill="#8a7b70" font-family="sans-serif">z</text>' +
    '</svg>';

  let root, stage, body, head, glow, label, count, startBtn, timeLeftEl, soundInput;
  let running = false, frame = null, startAt = 0, duration = 60;

  function init() {
    if (root) return;
    root = document.getElementById('breathe');
    stage = root.querySelector('.breathe-stage');
    stage.insertAdjacentHTML('beforeend', CAT);
    body = stage.querySelector('.b-body');
    head = stage.querySelector('.b-head');
    glow = stage.querySelector('.breathe-glow');
    label = document.getElementById('breathe-label');
    count = document.getElementById('breathe-count');
    timeLeftEl = document.getElementById('breathe-time');
    startBtn = document.getElementById('breathe-start');
    soundInput = document.getElementById('breathe-sound');
    try { soundInput.checked = localStorage.getItem('cat-diary:breathe-sound') !== '0'; } catch (e) { /* 忽略 */ }

    root.querySelectorAll('.breathe-len').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('.breathe-len').forEach(function (x) { x.classList.toggle('is-active', x === b); });
        duration = Number(b.dataset.secs);
        if (!running) showIdle();
      });
    });
    startBtn.addEventListener('click', function () { running ? stop(false) : start(); });
    soundInput.addEventListener('change', function () {
      try { localStorage.setItem('cat-diary:breathe-sound', soundInput.checked ? '1' : '0'); } catch (e) { /* 忽略 */ }
      if (running) Music.purr(soundInput.checked ? 0.45 : 0);
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && running) stop(false); });
    showIdle();
  }

  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function showIdle() {
    label.textContent = '準備好了嗎？';
    count.textContent = '';
    timeLeftEl.textContent = fmt(duration);
    setBreath(0);
  }

  // amount 0～1：肚子鼓起的程度
  function setBreath(amount) {
    const e = amount * amount * (3 - 2 * amount); // 平滑
    body.style.transform = 'scale(' + (1 + e * 0.05) + ',' + (1 + e * 0.14) + ')';
    head.style.transform = 'translateY(' + (-e * 5) + 'px)';
    glow.style.transform = 'scale(' + (0.75 + e * 0.45) + ')';
    glow.style.opacity = 0.35 + e * 0.45;
  }

  function start() {
    if (Music.state().playing) Music.pause();
    running = true;
    startAt = performance.now();
    startBtn.textContent = '■ 結束';
    root.classList.add('is-running');
    if (soundInput.checked) Music.purr(0.45);
    frame = requestAnimationFrame(tick);
  }

  function stop(finished) {
    running = false;
    cancelAnimationFrame(frame);
    Music.purr(0);
    root.classList.remove('is-running');
    startBtn.textContent = '▶ 開始';
    if (finished) {
      label.textContent = '做得很好 🐾';
      count.textContent = '身體有沒有放鬆一點了呢？';
      timeLeftEl.textContent = fmt(0);
      setBreath(0);
    } else {
      showIdle();
    }
  }

  function tick(now) {
    const t = (now - startAt) / 1000;
    if (t >= duration) { stop(true); return; }
    let c = t % CYCLE;
    let i = 0;
    while (c >= PHASES[i].secs) { c -= PHASES[i].secs; i++; }
    const ph = PHASES[i];
    const p = c / ph.secs;
    setBreath(ph.name === 'in' ? p : ph.name === 'hold' ? 1 : 1 - p);
    if (label.textContent !== ph.label) label.textContent = ph.label;
    const left = String(Math.ceil(ph.secs - c));
    if (count.textContent !== left) count.textContent = left;
    timeLeftEl.textContent = fmt(duration - t);
    frame = requestAnimationFrame(tick);
  }

  return {
    show: init,
    pause: function () { if (running) stop(false); }
  };
})();

/* ---------- 擼貓模式：摸摸貓咪，越摸越開心 ---------- */
const Pet = (function () {
  'use strict';

  const B = 'stroke="#4a3b33" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const FUR = '#a88462', DARK = '#6e5236', WHITE = '#fffaf2';
  const CAT = '<svg viewBox="0 0 300 330" class="pet-svg" aria-label="可以摸的貓咪">' +
    '<ellipse cx="150" cy="316" rx="100" ry="10" fill="rgba(0,0,0,0.08)"/>' +
    '<g class="p-tail"><path d="M200 290 C262 292 280 232 254 206 C242 194 228 206 238 218 C252 236 244 268 196 266 Z" fill="' + FUR + '" ' + B + '/>' +
    '<path d="M250 214 l10 -6 M258 232 l12 -2 M254 252 l12 4" ' + B + '/></g>' +
    '<ellipse class="p-body" cx="150" cy="246" rx="70" ry="62" fill="' + FUR + '" ' + B + '/>' +
    '<path d="M96 222 l14 4 M92 244 l16 2 M204 222 l-14 4 M208 244 l-16 2" ' + B + '/>' +
    '<path class="p-belly" d="M150 196 C120 196 112 236 116 270 C122 296 178 296 184 270 C188 236 180 196 150 196 Z" fill="' + WHITE + '" ' + B + '/>' +
    '<ellipse cx="122" cy="300" rx="20" ry="12" fill="' + WHITE + '" ' + B + '/>' +
    '<ellipse cx="178" cy="300" rx="20" ry="12" fill="' + WHITE + '" ' + B + '/>' +
    '<g class="p-ears">' +
    '<g class="p-ear-l"><path d="M84 120 L76 46 L134 86 Z" fill="' + FUR + '" ' + B + '/><path d="M90 106 L86 64 L120 88 Z" fill="#f4b6b0"/></g>' +
    '<g class="p-ear-r"><path d="M216 120 L224 46 L166 86 Z" fill="' + FUR + '" ' + B + '/><path d="M210 106 L214 64 L180 88 Z" fill="#f4b6b0"/></g></g>' +
    '<g class="p-head">' +
    '<ellipse cx="150" cy="138" rx="78" ry="66" fill="' + FUR + '" ' + B + '/>' +
    '<path d="M150 74 Q158 90 150 106 Q142 90 150 74 Z M128 78 Q136 92 128 106 Q120 92 128 78 Z M172 78 Q180 92 172 106 Q164 92 172 78 Z" fill="' + DARK + '"/>' +
    '<path d="M74 132 l18 2 M74 146 l18 -2 M226 132 l-18 2 M226 146 l-18 -2" stroke="' + DARK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<ellipse cx="150" cy="172" rx="36" ry="26" fill="' + WHITE + '"/>' +
    '<g class="p-blush"><ellipse cx="102" cy="164" rx="13" ry="8" fill="#f7a1b9"/><ellipse cx="198" cy="164" rx="13" ry="8" fill="#f7a1b9"/></g>' +
    // 眼睛：睜開、瞇眼、閉眼享受、生氣
    '<g class="p-eyes eyes-open"><ellipse cx="118" cy="138" rx="13" ry="15" fill="#c9d86b" ' + B + '/><ellipse cx="182" cy="138" rx="13" ry="15" fill="#c9d86b" ' + B + '/>' +
    '<ellipse cx="118" cy="140" rx="5" ry="10" fill="#2b2b2b"/><ellipse cx="182" cy="140" rx="5" ry="10" fill="#2b2b2b"/>' +
    '<circle cx="122" cy="133" r="3" fill="#fff"/><circle cx="186" cy="133" r="3" fill="#fff"/></g>' +
    '<g class="p-eyes eyes-half"><path d="M105 138 Q118 146 131 138 Q118 132 105 138 Z M169 138 Q182 146 195 138 Q182 132 169 138 Z" fill="#c9d86b" ' + B + '/>' +
    '<path d="M104 136 H132 M168 136 H196" ' + B + '/></g>' +
    '<g class="p-eyes eyes-closed"><path d="M104 142 Q118 128 132 142 M168 142 Q182 128 196 142" fill="none" ' + B + '/></g>' +
    '<g class="p-eyes eyes-angry"><path d="M104 130 L130 142 L104 148 M196 130 L170 142 L196 148" fill="none" ' + B + '/></g>' +
    '<path d="M143 160 H157 L150 168 Z" fill="#e88a8a" ' + B + '/>' +
    '<path class="p-mouth" d="M150 168 Q144 178 136 173 M150 168 Q156 178 164 173" fill="none" ' + B + '/>' +
    '<path class="p-hiss" d="M136 176 Q150 196 164 176 Z" fill="#c8553d" ' + B + '/>' +
    '<path d="M112 166 l-44 -6 M112 174 l-42 6 M188 166 l44 -6 M188 174 l42 6" stroke="#4a3b33" stroke-width="2" stroke-linecap="round"/>' +
    '</g></svg>';

  let root, stage, svg, meterFill, meterText, msgEl;
  let happy = 0, belly = 0, angryUntil = 0;
  let last = null, travel = 0, frame = null, lastTick = 0, active = false;

  const MSGS = [
    [0, '摸摸貓咪的頭和背，牠會越來越開心。'],
    [20, '咕嚕…貓咪開始享受了。'],
    [50, '呼嚕呼嚕～瞇起眼睛了 😌'],
    [80, '超幸福！貓咪最喜歡你了 💕']
  ];

  function init() {
    if (root) { active = true; loop(); return; }
    root = document.getElementById('pet');
    stage = root.querySelector('.pet-stage');
    stage.insertAdjacentHTML('afterbegin', CAT);
    svg = stage.querySelector('svg');
    meterFill = document.getElementById('pet-meter-fill');
    meterText = document.getElementById('pet-meter-text');
    msgEl = document.getElementById('pet-msg');

    stage.addEventListener('pointerdown', function (e) { Music.unlock(); last = { x: e.clientX, y: e.clientY }; stage.setPointerCapture && stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' && !last) return;
      if (e.pointerType === 'mouse' && !last) { last = { x: e.clientX, y: e.clientY }; return; }
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      last = { x: e.clientX, y: e.clientY };
      if (d < 1 || d > 120) return;
      stroke(e, d);
    });
    function end() { last = null; }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('pointerleave', end);
    stage.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    active = true;
    loop();
  }

  function stroke(e, d) {
    const now = performance.now();
    if (now < angryUntil) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const onBelly = hit && hit.classList && hit.classList.contains('p-belly');
    if (onBelly) {
      // 一直摸肚子，貓咪會生氣
      belly += d;
      if (belly > 420) {
        belly = 0;
        happy = Math.max(0, happy - 35);
        angryUntil = now + 1400;
        heartAt(e, '💢');
        msgEl.textContent = '哈！不要一直摸肚子啦！😾';
        if (navigator.vibrate) navigator.vibrate(80);
      }
      return;
    }
    belly = Math.max(0, belly - d * 0.3);
    happy = Math.min(100, happy + d * 0.025);
    travel += d;
    if (travel > 110) { travel = 0; heartAt(e, happy > 80 ? '💕' : happy > 40 ? '❤️' : '✨'); }
  }

  function heartAt(e, ch) {
    const rect = stage.getBoundingClientRect();
    const h = document.createElement('span');
    h.className = 'pet-heart';
    h.textContent = ch;
    h.style.left = (e.clientX - rect.left) + 'px';
    h.style.top = (e.clientY - rect.top) + 'px';
    stage.appendChild(h);
    setTimeout(function () { h.remove(); }, 1200);
  }

  function loop() {
    cancelAnimationFrame(frame);
    lastTick = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!active) return;
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    // 沒在摸的時候，開心度慢慢下降
    if (!last) happy = Math.max(0, happy - dt * 1.5);
    const angry = now < angryUntil;
    const state = angry ? 'angry' : happy >= 50 ? 'closed' : happy >= 20 ? 'half' : 'open';
    if (svg.getAttribute('data-state') !== state) svg.setAttribute('data-state', state);
    svg.style.setProperty('--blush', angry ? 0 : Math.min(1, happy / 60));
    svg.classList.toggle('is-wagging', !angry && happy >= 35);
    meterFill.style.width = happy + '%';
    meterText.textContent = Math.round(happy) + '%';
    if (!angry) {
      let m = MSGS[0][1];
      MSGS.forEach(function (x) { if (happy >= x[0]) m = x[1]; });
      if (msgEl.textContent !== m) msgEl.textContent = m;
    }
    Music.purr(angry ? 0 : happy < 8 ? 0 : 0.15 + happy / 100 * 0.75);
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    if (!active) return;
    active = false;
    last = null;
    cancelAnimationFrame(frame);
    Music.purr(0);
  }

  return { show: init, pause: pause };
})();
