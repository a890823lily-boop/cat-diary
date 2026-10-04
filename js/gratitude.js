/* 感恩罐：把開心的小事變成星星存起來；搖一搖，隨機掉出一顆以前的好事 */
const Gratitude = (function () {
  'use strict';

  const KEY = 'cat-diary:gratitude';
  const COLORS = ['#ffd166', '#ffe08a', '#f7a1b9', '#b8e0f6', '#c7e9b0', '#d7c4f2', '#ffc9a8'];

  let jar, input, countEl, dlg;
  let stars = [];
  let W = 0, H = 0, frame = null, lastT = 0, active = false;
  let lastShake = 0, motionOn = false;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(stars.map(function (s) { return { id: s.id, text: s.text, date: s.date, color: s.color }; })));
    } catch (e) { /* 忽略 */ }
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function today() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function measure() { W = jar.clientWidth; H = jar.clientHeight; }

  function makeStar(d, x, y) {
    const r = Math.max(20, Math.min(30, W / 13));
    const node = document.createElement('button');
    node.className = 'g-star';
    node.style.width = node.style.height = (r * 2.4) + 'px';
    node.style.setProperty('--c', d.color);
    node.setAttribute('aria-label', '好事：' + d.text);
    const s = Object.assign({}, d, { r: r, x: x, y: y, vx: (Math.random() - 0.5) * 80, vy: 0, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 200, el: node });
    node.addEventListener('click', function () { reveal(s, false); });
    jar.appendChild(node);
    return s;
  }

  function updateCount() {
    countEl.textContent = stars.length ? '罐子裡有 ' + stars.length + ' 顆星星 ⭐' : '罐子還是空的，寫下一件開心的小事吧！';
    jar.classList.toggle('is-empty', !stars.length);
  }

  /* ---------- 物理：跟內耗球一樣的重力與碰撞 ---------- */
  function step(dt) {
    stars.forEach(function (s) {
      s.vy += 1200 * dt;
      s.vx *= 0.99;
      s.vr *= 0.98;
      s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
      if (s.x < s.r) { s.x = s.r; s.vx = -s.vx * 0.4; }
      if (s.x > W - s.r) { s.x = W - s.r; s.vx = -s.vx * 0.4; }
      if (s.y > H - s.r) { s.y = H - s.r; s.vy = -s.vy * 0.25; s.vx *= 0.85; s.vr *= 0.8; }
    });
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i], b = stars[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const min = a.r + b.r;
          if (dist >= min) continue;
          const nx = dx / dist, ny = dy / dist, o = (min - dist) / 2;
          a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const imp = -0.65 * rel;
            a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
          }
        }
      }
      stars.forEach(function (s) { s.x = Math.max(s.r, Math.min(W - s.r, s.x)); s.y = Math.min(H - s.r, s.y); });
    }
  }

  function paint() {
    stars.forEach(function (s) {
      const half = s.r * 1.2;
      s.el.style.transform = 'translate(' + (s.x - half) + 'px,' + (s.y - half) + 'px) rotate(' + s.rot + 'deg)';
    });
  }

  function loop(t) {
    if (!active) return;
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;
    for (let i = 0; i < 3; i++) step(dt / 3);
    paint();
    frame = requestAnimationFrame(loop);
  }

  /* ---------- 新增、搖一搖 ---------- */
  function add(text) {
    text = text.trim().slice(0, 120);
    if (!text) return;
    measure();
    const d = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: text, date: today(), color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    const s = makeStar(d, 30 + Math.random() * Math.max(1, W - 60), -30);
    s.el.classList.add('is-new');
    stars.push(s);
    save();
    updateCount();
    if (typeof Kitty !== 'undefined') Kitty.gain('gratitude');
  }

  function shake() {
    if (!stars.length) {
      countEl.textContent = '罐子還是空的，先存一顆星星吧 ⭐';
      return;
    }
    if (Date.now() - lastShake < 1200 || (dlg && dlg.open)) return;
    lastShake = Date.now();
    jar.classList.remove('is-shaking');
    void jar.offsetWidth;
    jar.classList.add('is-shaking');
    stars.forEach(function (s) {
      s.vx += (Math.random() - 0.5) * 700;
      s.vy -= 300 + Math.random() * 500;
      s.vr += (Math.random() - 0.5) * 900;
    });
    if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
    const pick = stars[Math.floor(Math.random() * stars.length)];
    setTimeout(function () { reveal(pick, true); }, 750);
  }

  function reveal(s, fromShake) {
    // 星星飛出來的動畫
    const rect = s.el.getBoundingClientRect();
    const fly = document.createElement('span');
    fly.className = 'g-fly';
    fly.style.setProperty('--c', s.color);
    fly.style.left = rect.left + rect.width / 2 + 'px';
    fly.style.top = rect.top + rect.height / 2 + 'px';
    document.body.appendChild(fly);
    setTimeout(function () { fly.remove(); }, 700);

    dlg.textContent = '';
    const p = function (cls, t) { const n = document.createElement('p'); n.className = cls; n.textContent = t; return n; };
    const big = document.createElement('div');
    big.className = 'g-big-star';
    big.style.setProperty('--c', s.color);
    dlg.append(
      p('pop-kicker', fromShake ? '✨ 從罐子裡掉出一顆好事' : '⭐ 這顆星星裡裝著'),
      big,
      p('g-text', s.text),
      p('hint', s.date.replace(/-/g, '/') + ' 的好事'),
      p('g-note', fromShake ? '看，你的生活裡其實有好多閃閃發亮的時刻 💛' : '')
    );
    const row = document.createElement('div');
    row.className = 'pop-actions';
    const close = document.createElement('button');
    close.className = 'btn';
    close.textContent = fromShake ? '收好了 ⭐' : '關閉';
    close.addEventListener('click', function () { dlg.close(); });
    if (fromShake) {
      const again = document.createElement('button');
      again.className = 'btn btn-outline';
      again.textContent = '再搖一次';
      again.addEventListener('click', function () { dlg.close(); lastShake = 0; setTimeout(shake, 250); });
      row.appendChild(again);
    } else {
      const del = document.createElement('button');
      del.className = 'btn btn-outline';
      del.textContent = '刪除';
      del.addEventListener('click', function () {
        if (!confirm('要把這顆星星拿出罐子嗎？')) return;
        stars = stars.filter(function (x) { return x !== s; });
        s.el.remove();
        save();
        updateCount();
        dlg.close();
      });
      row.appendChild(del);
    }
    row.appendChild(close);
    dlg.appendChild(row);
    setTimeout(function () { dlg.showModal(); }, fromShake ? 350 : 0);
  }

  /* 真的搖手機也可以（iPhone 需要先允許動作感應） */
  function enableMotion() {
    if (motionOn) return;
    const start = function () {
      motionOn = true;
      window.addEventListener('devicemotion', function (e) {
        if (!active) return;
        const a = e.accelerationIncludingGravity || e.acceleration;
        if (!a) return;
        const g = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0));
        if (g > 24) shake();
      });
    };
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(function (r) { if (r === 'granted') start(); }).catch(function () {});
    } else if (window.DeviceMotionEvent) {
      start();
    }
  }

  function init() {
    if (jar) { start(); return; }
    jar = document.getElementById('g-jar');
    input = document.getElementById('g-input');
    countEl = document.getElementById('g-count');
    dlg = document.getElementById('g-dialog');
    document.getElementById('g-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input.value.trim()) { input.focus(); return; }
      add(input.value);
      input.value = '';
      input.blur();
    });
    document.getElementById('g-shake').addEventListener('click', function () { enableMotion(); shake(); });
    window.addEventListener('resize', function () { if (active) measure(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    measure();
    read().forEach(function (d, i) { stars.push(makeStar(d, 30 + Math.random() * Math.max(1, W - 60), -30 - i * 30)); });
    updateCount();
    start();
  }

  function start() {
    measure();
    active = true;
    cancelAnimationFrame(frame);
    lastT = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    active = false;
    cancelAnimationFrame(frame);
  }

  return {
    show: init,
    pause: pause,
    // 給小日曆用：依日期分組
    byDate: function () {
      const map = {};
      read().forEach(function (s) { (map[s.date] = map[s.date] || []).push(s); });
      return map;
    }
  };
})();
