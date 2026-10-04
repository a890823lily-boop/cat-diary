/* 貓咪圖鑑：做各種事情收集貓咪貼紙，集滿有驚喜 */
const Stickers = (function () {
  'use strict';

  const LIST = [
    { id: 'skate', name: '溜冰貓', img: 'images/deco-skate.png', how: '寫下第一篇日記' },
    { id: 'wizard', name: '魔法師貓', img: 'images/deco-wizard.png', how: '抽一句鼓勵' },
    { id: 'suit', name: '西裝貓', img: 'images/deco-suit.png', how: '匯出一次備份' },
    { id: 'sax', name: '薩克斯風貓', img: 'images/deco-sax.png', how: '播放背景音樂' },
    { id: 'fish', name: '坐魚貓', img: 'images/deco-fish.png', how: '在日記記錄體重' },
    { id: 'painter', name: '畫家貓', img: 'images/stickers/painter.png', how: '塗色累積塗滿 10 塊' },
    { id: 'sleep', name: '好眠貓', img: 'images/stickers/sleep.png', how: '完成一次呼吸練習' },
    { id: 'happy', name: '幸福貓', img: 'images/stickers/happy.png', how: '擼貓開心度到 100%' },
    { id: 'fortune', name: '籤筒貓', img: 'images/stickers/fortune.png', how: '抽今日貓咪運勢' },
    { id: 'game', name: '接魚乾高手', img: 'images/stickers/game.png', how: '接魚乾拿到 20 分' },
    { id: 'photo', name: '小小攝影師', img: 'images/stickers/photo.png', how: '日記累積 10 張照片' },
    { id: 'diary', name: '日記達人', img: 'images/stickers/diary.png', how: '寫滿 7 篇日記' }
  ];
  const KEY = 'cat-diary:stickers';
  const DONE_KEY = 'cat-diary:stickers-complete';

  let queue = [];
  let showing = false;

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
  }
  function owned() { return read(KEY, {}); }
  function count() { const o = owned(); return LIST.filter(function (s) { return o[s.id]; }).length; }
  function complete() { try { return localStorage.getItem(DONE_KEY) === '1'; } catch (e) { return false; } }

  function today() {
    const d = new Date();
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* 取得貼紙 */
  function award(id) {
    const s = LIST.find(function (x) { return x.id === id; });
    if (!s) return;
    const o = owned();
    if (o[id]) return;
    o[id] = today();
    write(KEY, o);
    queue.push({ type: 'sticker', sticker: s });
    if (count() === LIST.length && !complete()) {
      try { localStorage.setItem(DONE_KEY, '1'); } catch (e) { /* 忽略 */ }
      write(KEY + '-master', today());
      queue.push({ type: 'master' });
    }
    render();
    next();
  }

  /* 累積次數達到門檻就給貼紙 */
  function bump(counter, threshold, id) {
    if (owned()[id]) return;
    const k = KEY + '-count-' + counter;
    const n = (read(k, 0) || 0) + 1;
    write(k, n);
    if (n >= threshold) award(id);
  }

  /* ---------- 彈出視窗 ---------- */
  function next() {
    if (showing || !queue.length) return;
    const dlg = document.getElementById('sticker-dialog');
    if (!dlg) return;
    const item = queue.shift();
    showing = true;
    dlg.textContent = '';
    dlg.className = 'sticker-pop' + (item.type === 'master' ? ' is-master' : '');
    if (item.type === 'sticker') fillSticker(dlg, item.sticker);
    else fillMaster(dlg);
    dlg.showModal();
  }

  function closeBtn(dlg, label, primary) {
    const b = el('button', primary ? 'btn' : 'btn btn-outline', label);
    b.addEventListener('click', function () { dlg.close(); });
    return b;
  }

  function fillSticker(dlg, s) {
    const img = el('img', 'pop-img');
    img.src = s.img;
    img.alt = '';
    dlg.append(
      confetti(14),
      el('p', 'pop-kicker', '🎉 獲得新貼紙！'),
      img,
      el('p', 'pop-name', s.name),
      el('p', 'hint', '達成：' + s.how),
      el('p', 'pop-count', '圖鑑 ' + count() + ' / ' + LIST.length)
    );
    const row = el('div', 'pop-actions');
    const look = el('button', 'btn btn-outline', '📖 看圖鑑');
    look.addEventListener('click', function () {
      dlg.close();
      document.dispatchEvent(new CustomEvent('stickers:open'));
    });
    row.append(look, closeBtn(dlg, '好耶！', true));
    dlg.appendChild(row);
  }

  function certificate() {
    const card = el('div', 'certificate');
    const img = el('img', 'cert-img');
    img.src = 'images/stickers/master.png';
    img.alt = '';
    card.append(
      el('p', 'cert-title', '🏆 貓咪圖鑑大師'),
      img,
      el('p', 'cert-text', '恭喜你收集了全部 ' + LIST.length + ' 張貓咪貼紙！謝謝你每天好好照顧貓咪，也好好照顧自己。'),
      el('p', 'cert-date', '頒發日期：' + (read(KEY + '-master', null) || today()))
    );
    return card;
  }

  function fillMaster(dlg) {
    dlg.append(confetti(40), el('p', 'pop-kicker', '✨ 集滿驚喜 ✨'), certificate(),
      el('p', 'pop-unlock', '🎁 解鎖隱藏塗色圖「👑 皇冠貓」！'));
    const row = el('div', 'pop-actions');
    const go = el('button', 'btn', '👑 去塗皇冠貓');
    go.addEventListener('click', function () {
      dlg.close();
      document.dispatchEvent(new CustomEvent('stickers:go-crown'));
    });
    row.append(closeBtn(dlg, '收下證書', false), go);
    dlg.appendChild(row);
  }

  function confetti(n) {
    const wrap = el('div', 'confetti');
    const colors = ['#f4a261', '#f7a1b9', '#ffd166', '#7fc8a9', '#6cb4e4', '#a78bda'];
    for (let i = 0; i < n; i++) {
      const c = el('span');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      c.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
      c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      wrap.appendChild(c);
    }
    return wrap;
  }

  /* ---------- 圖鑑畫面 ---------- */
  function render() {
    const grid = document.getElementById('sticker-grid');
    if (!grid) return;
    const o = owned();
    document.getElementById('sticker-count').textContent = count() + ' / ' + LIST.length;
    document.getElementById('sticker-bar').style.width = (count() / LIST.length * 100) + '%';
    grid.textContent = '';
    LIST.forEach(function (s) {
      const got = !!o[s.id];
      const card = el('div', 'sticker' + (got ? '' : ' is-locked'));
      const img = el('img');
      img.src = s.img;
      img.alt = got ? s.name : '';
      img.loading = 'lazy';
      card.append(img, el('span', 'sticker-name', got ? s.name : '？？？'),
        el('span', 'sticker-how', got ? '🗓 ' + o[s.id] : s.how));
      grid.appendChild(card);
    });
    const cert = document.getElementById('sticker-cert');
    cert.hidden = !complete();
  }

  function showCertificate() {
    const dlg = document.getElementById('sticker-dialog');
    dlg.textContent = '';
    dlg.className = 'sticker-pop is-master';
    dlg.append(certificate());
    const row = el('div', 'pop-actions');
    row.append(closeBtn(dlg, '關閉', true));
    dlg.appendChild(row);
    showing = true;
    dlg.showModal();
  }

  function init() {
    const dlg = document.getElementById('sticker-dialog');
    dlg.addEventListener('close', function () {
      showing = false;
      setTimeout(next, 250);
    });
    document.getElementById('sticker-cert').addEventListener('click', showCertificate);
    render();
  }

  return { list: LIST, award: award, bump: bump, init: init, render: render };
})();
