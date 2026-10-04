/* 貓咪翻翻樂：翻牌配對，優先用自己日記裡的貓咪照片 */
const Memory = (function () {
  'use strict';

  const LEVELS = {
    easy: { label: '簡單', pairs: 6, cols: 4 },
    normal: { label: '普通', pairs: 8, cols: 4 },
    hard: { label: '困難', pairs: 10, cols: 5 }
  };
  // 照片不夠時補上的圖案
  const BUILTIN = [
    'images/cat-window.jpg', 'images/cat-floor.jpg', 'images/cat-cuddle.jpg', 'images/cat-peek.jpg', 'icons/icon-192.png',
    'images/deco-skate.png', 'images/deco-wizard.png', 'images/deco-suit.png', 'images/deco-sax.png', 'images/deco-fish.png',
    'images/stickers/sleep.png', 'images/stickers/happy.png', 'images/stickers/painter.png'
  ];
  const BEST_KEY = 'cat-diary:memory-best';

  let root, board, movesEl, timeEl, bestEl, overlay;
  let getPhotos = function () { return []; };
  let level = 'easy';
  let cards = [], open = [], matched = 0, moves = 0, startAt = 0, timer = null, locked = false, pausedAt = 0;

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function fmt(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function elapsed() { return startAt ? Math.floor((Date.now() - startAt) / 1000) : 0; }

  function pickImages(n) {
    const mine = shuffle(getPhotos().slice());
    const extra = shuffle(BUILTIN.slice());
    return mine.concat(extra).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, n);
  }

  function showBest() {
    const best = read(BEST_KEY, {})[level];
    bestEl.textContent = best ? best.moves + ' 步・' + fmt(best.time) : '—';
  }

  function newGame() {
    clearInterval(timer);
    timer = null;
    const lv = LEVELS[level];
    const imgs = pickImages(lv.pairs);
    cards = shuffle(imgs.concat(imgs).map(function (src, i) { return { src: src, id: i }; }));
    open = []; matched = 0; moves = 0; startAt = 0; locked = false; pausedAt = 0;
    movesEl.textContent = '0';
    timeEl.textContent = '0:00';
    overlay.hidden = true;
    board.style.gridTemplateColumns = 'repeat(' + lv.cols + ', 1fr)';
    board.textContent = '';
    cards.forEach(function (c) {
      const btn = document.createElement('button');
      btn.className = 'mem-card';
      btn.setAttribute('aria-label', '翻開卡片');
      btn.innerHTML = '<span class="mem-inner"><span class="mem-back">🐾</span><span class="mem-front"></span></span>';
      const img = new Image();
      img.src = c.src;
      img.alt = '';
      img.draggable = false;
      btn.querySelector('.mem-front').appendChild(img);
      btn.addEventListener('click', function () { flip(c); });
      c.el = btn;
      board.appendChild(btn);
    });
    root.querySelectorAll('.mem-level').forEach(function (b) { b.classList.toggle('is-active', b.dataset.level === level); });
    showBest();
  }

  function flip(c) {
    if (locked || c.matched || open.indexOf(c) !== -1) return;
    if (!startAt) {
      startAt = Date.now();
      timer = setInterval(function () { timeEl.textContent = fmt(elapsed()); }, 500);
    }
    c.el.classList.add('is-open');
    c.el.setAttribute('aria-label', '已翻開');
    open.push(c);
    if (open.length < 2) return;
    moves++;
    movesEl.textContent = moves;
    const a = open[0], b = open[1];
    if (a.src === b.src) {
      a.matched = b.matched = true;
      open = [];
      setTimeout(function () {
        a.el.classList.add('is-matched');
        b.el.classList.add('is-matched');
      }, 250);
      matched++;
      if (matched === LEVELS[level].pairs) setTimeout(win, 700);
    } else {
      locked = true;
      setTimeout(function () {
        a.el.classList.remove('is-open');
        b.el.classList.remove('is-open');
        a.el.setAttribute('aria-label', '翻開卡片');
        b.el.setAttribute('aria-label', '翻開卡片');
        open = [];
        locked = false;
      }, 850);
    }
  }

  function win() {
    clearInterval(timer);
    const time = elapsed();
    const all = read(BEST_KEY, {});
    const prev = all[level];
    const record = !prev || moves < prev.moves || (moves === prev.moves && time < prev.time);
    if (record) { all[level] = { moves: moves, time: time }; write(BEST_KEY, all); }
    showBest();
    overlay.textContent = '';
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    ['#f4a261', '#f7a1b9', '#ffd166', '#7fc8a9', '#6cb4e4', '#a78bda'].forEach(function (col, i) {
      for (let k = 0; k < 4; k++) {
        const s = document.createElement('span');
        s.style.left = Math.random() * 100 + '%';
        s.style.background = col;
        s.style.animationDelay = Math.random() * 0.5 + 's';
        s.style.animationDuration = 1.4 + Math.random() + 's';
        confetti.appendChild(s);
      }
    });
    const title = document.createElement('p');
    title.className = 'game-title';
    title.textContent = record ? '🎉 新紀錄！' : '🎉 全部配對成功！';
    const text = document.createElement('p');
    text.className = 'game-text';
    text.textContent = moves + ' 步・' + fmt(time) + (record ? '' : '（最佳：' + prev.moves + ' 步・' + fmt(prev.time) + '）');
    const again = document.createElement('button');
    again.className = 'btn';
    again.textContent = '再玩一次';
    again.addEventListener('click', newGame);
    overlay.append(confetti, title, text, again);
    overlay.hidden = false;
  }

  function init(photoProvider) {
    if (photoProvider) getPhotos = photoProvider;
    if (root) return;
    root = document.getElementById('memory');
    board = document.getElementById('mem-board');
    movesEl = document.getElementById('mem-moves');
    timeEl = document.getElementById('mem-time');
    bestEl = document.getElementById('mem-best');
    overlay = document.getElementById('mem-overlay');
    level = read('cat-diary:memory-level', 'easy');
    if (!LEVELS[level]) level = 'easy';
    root.querySelectorAll('.mem-level').forEach(function (b) {
      b.addEventListener('click', function () {
        level = b.dataset.level;
        write('cat-diary:memory-level', level);
        newGame();
      });
    });
    document.getElementById('mem-restart').addEventListener('click', newGame);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else if (root.offsetParent) resume();
    });
    newGame();
  }

  function playing() { return startAt && matched < LEVELS[level].pairs; }

  // 切到別的畫面時暫停計時，回來時扣掉離開的時間
  function pause() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    pausedAt = Date.now();
  }
  function resume() {
    if (!playing() || timer) return;
    if (pausedAt) { startAt += Date.now() - pausedAt; pausedAt = 0; }
    timer = setInterval(function () { timeEl.textContent = fmt(elapsed()); }, 500);
  }

  return {
    show: function (provider) { const first = !root; init(provider); if (!first) resume(); },
    pause: pause
  };
})();
