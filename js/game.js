/* 貓咪接魚乾小遊戲：左右拖曳溜冰貓，接住魚乾和炸蝦，避開小黃瓜 */
const CatGame = (function () {
  'use strict';

  const ITEMS = {
    fish: { emoji: '🐟', points: 1 },
    shrimp: { emoji: '🍤', points: 3 },
    cucumber: { emoji: '🥒', points: 0 }
  };
  const LIVES = 3;
  const BEST_KEY = 'cat-diary:game-best';

  let canvas, ctx, overlay, scoreEl, livesEl, bestEl;
  let W = 0, H = 0, dpr = 1;
  const catImg = new Image();
  catImg.src = 'images/deco-skate.png';

  const s = {
    running: false,
    score: 0,
    lives: LIVES,
    items: [],
    effects: [],
    cat: { x: 0, targetX: 0, w: 70, h: 81, facing: 1, hurt: 0 },
    spawnIn: 0,
    elapsed: 0,
    lastTime: 0,
    shake: 0,
    frame: null
  };

  function readBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function writeBest(n) {
    try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* 忽略 */ }
  }

  function init() {
    if (canvas) return;
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    overlay = document.getElementById('game-overlay');
    scoreEl = document.getElementById('game-score');
    livesEl = document.getElementById('game-lives');
    bestEl = document.getElementById('game-best');

    // 手指或滑鼠在畫面上的位置就是貓咪要去的位置
    function pointTo(clientX) {
      const rect = canvas.getBoundingClientRect();
      s.cat.targetX = Math.max(s.cat.w / 2, Math.min(W - s.cat.w / 2, clientX - rect.left));
    }
    canvas.addEventListener('pointerdown', function (e) { pointTo(e.clientX); });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) pointTo(e.clientX);
    });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (!s.running) return;
      if (e.key === 'ArrowLeft') { s.cat.targetX = Math.max(s.cat.w / 2, s.cat.targetX - 60); e.preventDefault(); }
      if (e.key === 'ArrowRight') { s.cat.targetX = Math.min(W - s.cat.w / 2, s.cat.targetX + 60); e.preventDefault(); }
    });
    window.addEventListener('resize', function () { if (isVisible()) resize(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  }

  function isVisible() {
    return canvas && canvas.offsetParent !== null;
  }

  function resize() {
    const stage = canvas.parentElement;
    dpr = window.devicePixelRatio || 1;
    W = stage.clientWidth;
    H = Math.max(320, Math.min(560, window.innerHeight - 260));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s.cat.x = Math.max(s.cat.w / 2, Math.min(W - s.cat.w / 2, s.cat.x || W / 2));
    s.cat.targetX = s.cat.x;
    draw();
  }

  function updateHud() {
    scoreEl.textContent = s.score;
    livesEl.textContent = '❤️'.repeat(s.lives) + '🤍'.repeat(LIVES - s.lives);
    bestEl.textContent = readBest();
  }

  function showOverlay(title, text, btnLabel, onClick) {
    overlay.textContent = '';
    const t = document.createElement('p');
    t.className = 'game-title';
    t.textContent = title;
    const p = document.createElement('p');
    p.className = 'game-text';
    p.textContent = text;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = btnLabel;
    b.addEventListener('click', onClick || start);
    overlay.append(t, p, b);
    if (onClick) {
      // 暫停時另外提供重新開始
      const again = document.createElement('button');
      again.className = 'link-btn';
      again.textContent = '重新開始';
      again.addEventListener('click', start);
      overlay.append(again);
    }
    overlay.hidden = false;
  }

  function start() {
    s.running = true;
    s.score = 0;
    s.lives = LIVES;
    s.items = [];
    s.effects = [];
    s.elapsed = 0;
    s.spawnIn = 0.5;
    s.cat.x = s.cat.targetX = W / 2;
    s.cat.hurt = 0;
    overlay.hidden = true;
    updateHud();
    s.lastTime = performance.now();
    cancelAnimationFrame(s.frame);
    s.frame = requestAnimationFrame(loop);
  }

  function pause() {
    if (!s.running) return;
    s.running = false;
    cancelAnimationFrame(s.frame);
    showOverlay('暫停中', '目前 ' + s.score + ' 分', '繼續', resume);
  }

  function resume() {
    overlay.hidden = true;
    s.running = true;
    s.lastTime = performance.now();
    cancelAnimationFrame(s.frame);
    s.frame = requestAnimationFrame(loop);
  }

  function gameOver() {
    s.running = false;
    cancelAnimationFrame(s.frame);
    const best = readBest();
    const record = s.score > best;
    if (record) writeBest(s.score);
    s.cat.hurt = 0; // 結束畫面不要停在閃爍的半透明
    updateHud();
    draw();
    showOverlay(
      record ? '🎉 新紀錄！' : '被小黃瓜嚇跑了！',
      '這次得到 ' + s.score + ' 分' + (record ? '，好厲害！' : '，最高紀錄 ' + best + ' 分'),
      '再玩一次'
    );
  }

  function spawn() {
    // 越玩越難：小黃瓜比例和掉落速度都會增加
    const level = Math.min(1, s.elapsed / 60);
    const r = Math.random();
    const cucumberRate = 0.22 + level * 0.13;
    const type = r < cucumberRate ? 'cucumber' : r < cucumberRate + 0.1 ? 'shrimp' : 'fish';
    const size = 34;
    s.items.push({
      type: type,
      x: size / 2 + Math.random() * (W - size),
      y: -size,
      size: size,
      vy: 150 + level * 230 + Math.random() * 40,
      spin: (Math.random() - 0.5) * 3,
      angle: 0
    });
    s.spawnIn = Math.max(0.35, 0.9 - level * 0.55) * (0.7 + Math.random() * 0.6);
  }

  function addEffect(x, y, text, color) {
    s.effects.push({ x: x, y: y, text: text, color: color, life: 0.8 });
  }

  function loop(now) {
    if (!s.running) return;
    const dt = Math.min(0.05, (now - s.lastTime) / 1000);
    s.lastTime = now;
    update(dt);
    draw();
    s.frame = requestAnimationFrame(loop);
  }

  function update(dt) {
    s.elapsed += dt;
    s.spawnIn -= dt;
    if (s.spawnIn <= 0) spawn();

    const cat = s.cat;
    const dx = cat.targetX - cat.x;
    if (Math.abs(dx) > 1) cat.facing = dx > 0 ? 1 : -1;
    cat.x += dx * Math.min(1, dt * 14);
    cat.hurt = Math.max(0, cat.hurt - dt);
    s.shake = Math.max(0, s.shake - dt);

    const catTop = H - cat.h - 6;
    for (let i = s.items.length - 1; i >= 0; i--) {
      const it = s.items[i];
      it.y += it.vy * dt;
      it.angle += it.spin * dt;
      const caught = it.y + it.size / 2 >= catTop + 8 &&
        it.y - it.size / 2 <= catTop + cat.h * 0.55 &&
        Math.abs(it.x - cat.x) < cat.w * 0.5 + it.size * 0.3;
      if (caught) {
        s.items.splice(i, 1);
        if (it.type === 'cucumber') {
          s.lives--;
          cat.hurt = 0.6;
          s.shake = 0.3;
          addEffect(cat.x, catTop, '嚇！', '#2e8b57');
          if (navigator.vibrate) navigator.vibrate(120);
          updateHud();
          if (s.lives <= 0) { gameOver(); return; }
        } else {
          const pts = ITEMS[it.type].points;
          s.score += pts;
          addEffect(it.x, catTop, '+' + pts, '#e07a3f');
          updateHud();
        }
      } else if (it.y - it.size > H) {
        s.items.splice(i, 1);
      }
    }

    for (let i = s.effects.length - 1; i >= 0; i--) {
      const e = s.effects[i];
      e.life -= dt;
      e.y -= 40 * dt;
      if (e.life <= 0) s.effects.splice(i, 1);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 8, 0);

    // 冰面
    const ice = ctx.createLinearGradient(0, H - 40, 0, H);
    ice.addColorStop(0, 'rgba(160, 210, 240, 0)');
    ice.addColorStop(1, 'rgba(160, 210, 240, 0.45)');
    ctx.fillStyle = ice;
    ctx.fillRect(0, H - 40, W, 40);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    s.items.forEach(function (it) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.angle);
      ctx.font = it.size + 'px sans-serif';
      ctx.fillText(ITEMS[it.type].emoji, 0, 0);
      ctx.restore();
    });

    const cat = s.cat;
    if (catImg.complete && catImg.naturalWidth) {
      ctx.save();
      ctx.translate(cat.x, H - cat.h / 2 - 6);
      ctx.scale(cat.facing, 1);
      if (cat.hurt > 0) ctx.globalAlpha = Math.floor(cat.hurt * 12) % 2 ? 0.35 : 1;
      ctx.drawImage(catImg, -cat.w / 2, -cat.h / 2, cat.w, cat.h);
      ctx.restore();
    }

    s.effects.forEach(function (e) {
      ctx.globalAlpha = Math.max(0, e.life / 0.8);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = e.color;
      ctx.fillText(e.text, e.x, e.y);
    });
    ctx.restore();
  }

  /* 切到遊戲分頁時呼叫 */
  function show() {
    init();
    resize();
    updateHud();
    if (!overlay.dataset.ready) {
      overlay.dataset.ready = '1';
      showOverlay('貓咪接魚乾', '左右拖曳貓咪，接住 🐟 +1 分、🍤 +3 分，碰到 🥒 會被嚇到喔！', '開始遊戲');
    }
  }

  catImg.onload = function () { if (isVisible()) draw(); };

  return { show: show, pause: pause };
})();
