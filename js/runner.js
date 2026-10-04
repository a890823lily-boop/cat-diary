/* 小貓跑酷：溜冰貓在屋頂上跑，點一下跳過花盆和小黃瓜，沿路吃小魚乾 */
const Runner = (function () {
  'use strict';

  const BEST_KEY = 'cat-diary:runner-best';
  const GRAVITY = 2300;
  const JUMP = 760;

  let canvas, ctx, overlay, scoreEl, fishEl, bestEl;
  let W = 0, H = 0, dpr = 1, groundY = 0;
  let running = false, frame = null, lastT = 0;
  const s = { t: 0, speed: 260, dist: 0, fish: 0, cat: null, obs: [], fishes: [], spawnIn: 0, fishIn: 0, bg: 0, fx: [] };

  const img = {};
  ['deco-skate', 'game-fish', 'game-cucumber'].forEach(function (n) {
    const i = new Image();
    i.src = 'images/' + n + '.png';
    img[n] = i;
  });

  function readBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; } }
  function writeBest(n) { try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* 忽略 */ } }
  function score() { return Math.floor(s.dist / 40) + s.fish * 5; }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.parentElement.clientWidth;
    H = Math.max(260, Math.min(380, Math.round(W * 0.75)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - 54;
    draw();
  }

  function hud() {
    scoreEl.textContent = score();
    fishEl.textContent = s.fish;
    bestEl.textContent = readBest();
  }

  function overlayMsg(title, text, label, deco) {
    overlay.textContent = '';
    if (deco) { const d = new Image(); d.className = 'overlay-deco'; d.src = deco; d.alt = ''; overlay.appendChild(d); }
    const t = document.createElement('p'); t.className = 'game-title'; t.textContent = title;
    const p = document.createElement('p'); p.className = 'game-text'; p.textContent = text;
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', function (e) { e.stopPropagation(); start(); });
    overlay.append(t, p, b);
    overlay.hidden = false;
  }

  function start() {
    s.t = 0; s.speed = 260; s.dist = 0; s.fish = 0; s.obs = []; s.fishes = []; s.fx = [];
    s.spawnIn = 1.2; s.fishIn = 0.6;
    s.cat = { x: Math.max(60, W * 0.18), y: groundY, vy: 0, w: 64, h: 74, jumps: 0 };
    overlay.hidden = true;
    running = true;
    hud();
    lastT = performance.now();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  }

  function jump() {
    if (!running) return;
    const c = s.cat;
    if (c.jumps >= 2) return; // 可以二段跳
    c.vy = -JUMP * (c.jumps ? 0.85 : 1);
    c.jumps++;
  }

  function over() {
    running = false;
    cancelAnimationFrame(frame);
    const sc = score();
    const best = readBest();
    const record = sc > best;
    if (record) writeBest(sc);
    if (typeof Kitty !== 'undefined' && sc >= 30) Kitty.gain('game');
    hud();
    draw(true);
    overlayMsg(record ? '🎉 新紀錄！' : '撞到了！喵～',
      '跑了 ' + Math.floor(s.dist / 40) + ' 公尺・吃了 ' + s.fish + ' 條小魚乾・' + sc + ' 分' + (record ? '' : '（最高 ' + best + '）'),
      '再跑一次', 'images/deco-baseball.png');
  }

  function spawnObstacle() {
    const kind = Math.random() < 0.55 ? 'pot' : 'cucumber';
    const h = kind === 'pot' ? 34 + Math.random() * 10 : 44;
    s.obs.push({ kind: kind, x: W + 30, w: kind === 'pot' ? 34 : 30, h: h });
    // 偶爾連續兩個，需要二段跳
    if (Math.random() < 0.22 && s.speed > 320) s.obs.push({ kind: 'pot', x: W + 30 + 70, w: 34, h: 36 });
    const gap = Math.max(0.75, 1.6 - s.t * 0.012);
    s.spawnIn = gap * (0.8 + Math.random() * 0.6);
  }

  function spawnFish() {
    const high = Math.random() < 0.5;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) s.fishes.push({ x: W + 20 + i * 36, y: groundY - (high ? 110 + Math.random() * 30 : 34), r: 14 });
    s.fishIn = 1 + Math.random() * 1.6;
  }

  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function update(dt) {
    s.t += dt;
    s.speed = Math.min(620, 260 + s.t * 7);
    const dx = s.speed * dt;
    s.dist += dx;
    s.bg += dx;
    const c = s.cat;
    c.vy += GRAVITY * dt;
    c.y += c.vy * dt;
    if (c.y >= groundY) { c.y = groundY; c.vy = 0; c.jumps = 0; }

    s.spawnIn -= dt; if (s.spawnIn <= 0) spawnObstacle();
    s.fishIn -= dt; if (s.fishIn <= 0) spawnFish();

    // 判定框比圖片小一點，比較公平
    const box = { x: c.x - c.w * 0.32, y: c.y - c.h * 0.85, w: c.w * 0.62, h: c.h * 0.82 };
    for (let i = s.obs.length - 1; i >= 0; i--) {
      const o = s.obs[i];
      o.x -= dx;
      if (o.x < -60) { s.obs.splice(i, 1); continue; }
      if (hit(box, { x: o.x + 4, y: groundY - o.h + 4, w: o.w - 8, h: o.h - 4 })) { over(); return; }
    }
    for (let i = s.fishes.length - 1; i >= 0; i--) {
      const f = s.fishes[i];
      f.x -= dx;
      if (f.x < -30) { s.fishes.splice(i, 1); continue; }
      if (hit(box, { x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2 })) {
        s.fishes.splice(i, 1);
        s.fish++;
        s.fx.push({ x: f.x, y: f.y, life: 0.6 });
        hud();
      }
    }
    for (let i = s.fx.length - 1; i >= 0; i--) { s.fx[i].life -= dt; s.fx[i].y -= 50 * dt; if (s.fx[i].life <= 0) s.fx.splice(i, 1); }
    if (Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) scoreEl.textContent = score();
  }

  /* ---------- 繪圖 ---------- */
  function drawPot(x, h) {
    const top = groundY - h;
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(x + 17, top + 4, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f47aa0';
    ctx.beginPath(); ctx.arc(x + 17, top - 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8553d';
    ctx.beginPath();
    ctx.moveTo(x, top + 10); ctx.lineTo(x + 34, top + 10); ctx.lineTo(x + 29, groundY); ctx.lineTo(x + 5, groundY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a83c2a';
    ctx.fillRect(x - 2, top + 8, 38, 7);
  }

  function draw(dead) {
    if (!ctx) return;
    // 天空與遠方的房子
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffcf9e'); g.addColorStop(0.6, '#ffe9d1'); g.addColorStop(1, '#fff6ea');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.22, 26, 0, Math.PI * 2); ctx.fill();
    const far = (s.bg * 0.2) % 120;
    ctx.fillStyle = '#e8bfa0';
    for (let x = -far - 120; x < W + 120; x += 120) {
      const bh = 60 + ((Math.abs(Math.floor((x + s.bg * 0.2) / 120)) * 37) % 50);
      ctx.fillRect(x, groundY - bh - 10, 70, bh + 10);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(x + 14, groundY - bh + 6, 12, 12); ctx.fillRect(x + 42, groundY - bh + 6, 12, 12);
      ctx.fillStyle = '#e8bfa0';
    }
    // 屋頂
    ctx.fillStyle = '#b5523b'; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#9a4430';
    const tile = s.bg % 28;
    for (let x = -tile; x < W; x += 28) { ctx.beginPath(); ctx.arc(x + 14, groundY + 10, 14, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#8a3b2a';
    for (let x = -tile + 14; x < W; x += 28) { ctx.beginPath(); ctx.arc(x + 14, groundY + 30, 14, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#d8735a'; ctx.fillRect(0, groundY - 3, W, 5);

    s.fishes.forEach(function (f) {
      if (img['game-fish'].complete) ctx.drawImage(img['game-fish'], f.x - f.r - 4, f.y - f.r - 4, f.r * 2 + 8, f.r * 2 + 8);
    });
    s.obs.forEach(function (o) {
      if (o.kind === 'pot') drawPot(o.x, o.h);
      else if (img['game-cucumber'].complete) ctx.drawImage(img['game-cucumber'], o.x - 8, groundY - o.h - 6, o.w + 16, o.h + 12);
    });
    const c = s.cat;
    if (c && img['deco-skate'].complete) {
      ctx.save();
      ctx.translate(c.x, c.y);
      const tilt = c.y < groundY ? Math.max(-0.35, Math.min(0.25, c.vy / 2000)) : Math.sin(s.t * 14) * 0.04;
      ctx.rotate(tilt);
      if (dead) ctx.globalAlpha = 0.6;
      ctx.drawImage(img['deco-skate'], -c.w / 2, -c.h, c.w, c.h);
      ctx.restore();
    }
    ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#e07a3f'; ctx.textAlign = 'center';
    s.fx.forEach(function (f) { ctx.globalAlpha = f.life / 0.6; ctx.fillText('+5', f.x, f.y); });
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;
    update(dt);
    if (running) draw();
    if (running) frame = requestAnimationFrame(loop);
  }

  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
    overlay.textContent = '';
    const t = document.createElement('p'); t.className = 'game-title'; t.textContent = '暫停中';
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = '繼續';
    b.addEventListener('click', function (e) { e.stopPropagation(); overlay.hidden = true; running = true; lastT = performance.now(); frame = requestAnimationFrame(loop); });
    const r = document.createElement('button'); r.className = 'link-btn'; r.textContent = '重新開始';
    r.addEventListener('click', function (e) { e.stopPropagation(); start(); });
    overlay.append(t, b, r);
    overlay.hidden = false;
  }

  function init() {
    if (canvas) { resize(); hud(); return; }
    canvas = document.getElementById('run-canvas');
    ctx = canvas.getContext('2d');
    overlay = document.getElementById('run-overlay');
    scoreEl = document.getElementById('run-score');
    fishEl = document.getElementById('run-fish');
    bestEl = document.getElementById('run-best');
    const stage = canvas.parentElement;
    stage.addEventListener('pointerdown', function (e) { if (e.target === canvas) { e.preventDefault(); jump(); } });
    document.addEventListener('keydown', function (e) {
      if (running && (e.key === ' ' || e.key === 'ArrowUp')) { e.preventDefault(); jump(); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    window.addEventListener('resize', function () { if (canvas.offsetParent) resize(); });
    resize();
    hud();
    overlayMsg('小貓跑酷', '點一下畫面跳起來（可以二段跳），跳過花盆和小黃瓜，沿路吃小魚乾！', '開始跑', 'images/deco-skate.png');
    img['deco-skate'].onload = function () { if (!running) draw(); };
  }

  return { show: init, pause: pause };
})();
