/* 養成小貓：寫日記、做呼吸練習等會得到經驗值，小貓會長大、解鎖造型 */
const Kitty = (function () {
  'use strict';

  const KEY = 'cat-diary:kitty';

  // 每種活動的經驗值，以及每天最多算幾次
  const GAINS = {
    diary: { exp: 20, daily: 3, label: '寫日記' },
    photo: { exp: 5, daily: 6, label: '加照片' },
    quote: { exp: 3, daily: 3, label: '抽鼓勵' },
    breathe: { exp: 15, daily: 2, label: '呼吸練習' },
    pet: { exp: 10, daily: 2, label: '擼貓' },
    fortune: { exp: 5, daily: 1, label: '抽運勢' },
    paint: { exp: 1, daily: 20, label: '塗色' },
    game: { exp: 8, daily: 3, label: '玩遊戲' },
    worryAdd: { exp: 3, daily: 3, label: '放下煩惱' },
    worryPop: { exp: 5, daily: 3, label: '戳破煩惱' },
    gratitude: { exp: 5, daily: 3, label: '存好事' },
    feed: { exp: 2, daily: 3, label: '餵食' },
    play: { exp: 2, daily: 5, label: '陪小貓玩' },
    pat: { exp: 1, daily: 5, label: '摸摸小貓' }
  };

  const FURS = {
    orange: { label: '橘貓', fur: '#f4a261', dark: '#d9773a', inner: '#f7b6a8' },
    tabby: { label: '虎斑', fur: '#a88462', dark: '#6e5236', inner: '#f4b6b0' },
    gray: { label: '灰貓', fur: '#b3b5ba', dark: '#7a7d83', inner: '#f4b6b0' },
    black: { label: '黑貓', fur: '#4a4a52', dark: '#2c2c33', inner: '#d98c9a' },
    white: { label: '白貓', fur: '#fbf8f3', dark: '#e3dbd0', inner: '#f7b6b8' }
  };

  const OUTFITS = [
    { id: 'none', label: '不穿', icon: '🐱', level: 1 },
    { id: 'bow', label: '蝴蝶結', icon: '🎀', level: 2 },
    { id: 'scarf', label: '圍巾', icon: '🧣', level: 3 },
    { id: 'bowtie', label: '領結', icon: '🤵', level: 4 },
    { id: 'hat', label: '魔法帽', icon: '🧙', level: 5 },
    { id: 'flowers', label: '花圈', icon: '🌸', level: 6 },
    { id: 'shades', label: '墨鏡', icon: '🕶️', level: 7 },
    { id: 'crown', label: '皇冠', icon: '👑', level: 10 }
  ];

  const DECOR = [
    { icon: '🧶', level: 1, x: 12, y: 78 },
    { icon: '🥣', level: 1, x: 80, y: 80 },
    { icon: '🪴', level: 3, x: 88, y: 40 },
    { icon: '📦', level: 4, x: 8, y: 52 },
    { icon: '🖼️', level: 6, x: 10, y: 26 },
    { icon: '🪟', level: 8, x: 90, y: 24 },
    { icon: '🏰', level: 10, x: 86, y: 62 }
  ];

  const STAGES = [
    { level: 1, label: '小奶貓', scale: 0.62 },
    { level: 3, label: '小小貓', scale: 0.74 },
    { level: 6, label: '青春貓', scale: 0.86 },
    { level: 10, label: '大貓咪', scale: 0.95 },
    { level: 15, label: '貓咪大人', scale: 1.02 }
  ];

  let data = null;
  let root = null;
  let bubbleTimer = null;
  let sayTimer = null;

  function load() {
    if (data) return data;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { data = null; }
    data = Object.assign({ adopted: false, name: '', fur: 'tabby', outfit: 'none', exp: 0, lastFed: Date.now(), lastPat: Date.now(), daily: { date: '', counts: {} } }, data || {});
    return data;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 忽略 */ }
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function today() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  /* ---------- 等級 ---------- */
  function need(level) { return 40 + (level - 1) * 25; }
  function levelInfo(exp) {
    let level = 1, rest = exp;
    while (rest >= need(level)) { rest -= need(level); level++; }
    return { level: level, cur: rest, need: need(level) };
  }
  function stageOf(level) {
    let s = STAGES[0];
    STAGES.forEach(function (x) { if (level >= x.level) s = x; });
    return s;
  }

  /* 飽足、心情：隨時間慢慢下降（不會歸零到讓小貓離開） */
  function fullness() { return Math.max(5, Math.round(100 - (Date.now() - data.lastFed) / 36e5 * 8)); }
  function happiness() { return Math.max(5, Math.round(100 - (Date.now() - data.lastPat) / 36e5 * 10)); }
  function sleeping() { const h = new Date().getHours(); return h >= 23 || h < 7; }

  /* ---------- 經驗值 ---------- */
  function gain(kind, times) {
    load();
    const g = GAINS[kind];
    if (!g) return;
    if (data.daily.date !== today()) data.daily = { date: today(), counts: {} };
    let n = times || 1, got = 0;
    while (n-- > 0 && (data.daily.counts[kind] || 0) < g.daily) {
      data.daily.counts[kind] = (data.daily.counts[kind] || 0) + 1;
      got += g.exp;
    }
    if (!got) return;
    const before = levelInfo(data.exp).level;
    data.exp += got;
    save();
    const after = levelInfo(data.exp).level;
    if (data.adopted) {
      document.dispatchEvent(new CustomEvent('kitty:gain', { detail: { text: '🐾 ' + data.name + ' +' + got + ' 經驗（' + g.label + '）' } }));
      if (after > before) levelUp(after);
    }
    render();
  }

  /* ---------- 畫小貓 ---------- */
  function catSvg(state) {
    const f = FURS[data.fur] || FURS.tabby;
    const B = 'stroke="#4a3b33" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
    const line = data.fur === 'black' ? '#1f1f24' : '#4a3b33';
    const Bk = B.replace('#4a3b33', line);
    const eyes = {
      sleep: '<path d="M70 92 Q80 98 90 92 M110 92 Q120 98 130 92" fill="none" ' + Bk + '/>',
      happy: '<path d="M70 96 Q80 84 90 96 M110 96 Q120 84 130 96" fill="none" ' + Bk + '/>',
      sad: '<ellipse cx="80" cy="94" rx="9" ry="11" fill="#2b2b2b"/><ellipse cx="120" cy="94" rx="9" ry="11" fill="#2b2b2b"/><circle cx="83" cy="89" r="3.5" fill="#fff"/><circle cx="123" cy="89" r="3.5" fill="#fff"/><path d="M68 80 l14 4 M132 80 l-14 4" ' + Bk + '/>',
      normal: '<ellipse cx="80" cy="93" rx="9" ry="11" fill="#2b2b2b"/><ellipse cx="120" cy="93" rx="9" ry="11" fill="#2b2b2b"/><circle cx="83" cy="88" r="3.5" fill="#fff"/><circle cx="123" cy="88" r="3.5" fill="#fff"/>'
    }[state];
    const mouth = state === 'sad'
      ? '<path d="M93 116 Q100 110 107 116" fill="none" ' + Bk + '/>'
      : '<path d="M100 110 Q95 118 89 114 M100 110 Q105 118 111 114" fill="none" ' + Bk + '/>';
    const stripes = data.fur === 'tabby' || data.fur === 'orange'
      ? '<path d="M100 46 Q106 56 100 66 Q94 56 100 46 Z M84 50 Q89 58 85 66 Q79 58 84 50 Z M116 50 Q121 58 115 66 Q111 58 116 50 Z" fill="' + f.dark + '"/>'
      : '';
    const acc = {
      bow: '<g transform="translate(138 52) rotate(20)"><path d="M0 0 L-16 -10 L-16 10 Z M0 0 L16 -10 L16 10 Z" fill="#f7a1b9" ' + B + '/><circle r="5" fill="#e76f96" ' + B + '/></g>',
      scarf: '<path d="M58 126 Q100 146 142 126 L144 138 Q100 160 56 138 Z" fill="#3d7bd9" ' + B + '/><path d="M120 140 L128 172 L112 170 Z" fill="#3d7bd9" ' + B + '/>',
      bowtie: '<g transform="translate(100 136)"><path d="M0 0 L-18 -10 L-18 10 Z M0 0 L18 -10 L18 10 Z" fill="#c8553d" ' + B + '/><circle r="5" fill="#a83c2a" ' + B + '/></g>',
      hat: '<path d="M54 54 Q100 64 146 54 L128 46 Q118 10 88 2 Q104 30 76 46 Z" fill="#3d5a98" ' + B + '/><path d="M60 54 Q100 66 140 54" fill="none" stroke="#ffd166" stroke-width="5"/><path d="M96 20 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1 Z" fill="#ffd166"/>',
      flowers: '<g fill="#f7a1b9" ' + B.replace('3"', '2"') + '><circle cx="62" cy="58" r="8"/><circle cx="80" cy="46" r="8" fill="#ffd166"/><circle cx="100" cy="42" r="8" fill="#a78bda"/><circle cx="120" cy="46" r="8" fill="#7fc8a9"/><circle cx="138" cy="58" r="8"/></g>',
      shades: '<g ' + B + '><rect x="64" y="84" width="30" height="20" rx="8" fill="#2b2b2b"/><rect x="106" y="84" width="30" height="20" rx="8" fill="#2b2b2b"/><path d="M94 92 H106" fill="none"/></g><path d="M70 88 l8 0" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
      crown: '<path d="M68 48 L74 16 L90 34 L100 8 L110 34 L126 16 L132 48 Z" fill="#ffd166" ' + B + '/><circle cx="100" cy="40" r="5" fill="#e76f96"/><circle cx="82" cy="42" r="4" fill="#6cb4e4"/><circle cx="118" cy="42" r="4" fill="#7fc8a9"/>'
    }[data.outfit] || '';
    const behindHead = data.outfit === 'scarf' || data.outfit === 'bowtie' ? acc : '';
    const onTop = behindHead ? '' : acc;
    return '<svg viewBox="0 0 200 200" class="kitty-svg" aria-hidden="true">' +
      '<ellipse cx="100" cy="190" rx="60" ry="8" fill="rgba(0,0,0,0.1)"/>' +
      '<path class="k-tail" d="M140 176 C186 178 192 128 170 112 C160 106 152 116 160 124 C172 134 166 160 136 158 Z" fill="' + f.fur + '" ' + Bk + '/>' +
      '<ellipse cx="100" cy="150" rx="50" ry="42" fill="' + f.fur + '" ' + Bk + '/>' +
      '<ellipse cx="100" cy="158" rx="26" ry="28" fill="#fffaf2" opacity="' + (data.fur === 'white' ? 0.6 : 1) + '"/>' +
      '<ellipse cx="80" cy="186" rx="15" ry="9" fill="#fffaf2" ' + Bk + '/><ellipse cx="120" cy="186" rx="15" ry="9" fill="#fffaf2" ' + Bk + '/>' +
      behindHead +
      '<g class="k-head">' +
      '<path d="M50 80 L46 22 L92 52 Z M150 80 L154 22 L108 52 Z" fill="' + f.fur + '" ' + Bk + '/>' +
      '<path d="M56 68 L54 36 L80 54 Z M144 68 L146 36 L120 54 Z" fill="' + f.inner + '"/>' +
      '<ellipse cx="100" cy="92" rx="58" ry="48" fill="' + f.fur + '" ' + Bk + '/>' + stripes +
      '<ellipse cx="100" cy="114" rx="22" ry="14" fill="#fffaf2" opacity="' + (data.fur === 'white' ? 0 : 1) + '"/>' +
      '<g class="k-blink">' + eyes + '</g>' +
      '<ellipse cx="66" cy="110" rx="9" ry="6" fill="#f7a1b9" opacity="' + (state === 'happy' ? 0.8 : 0.45) + '"/><ellipse cx="134" cy="110" rx="9" ry="6" fill="#f7a1b9" opacity="' + (state === 'happy' ? 0.8 : 0.45) + '"/>' +
      '<path d="M95 104 H105 L100 110 Z" fill="#e88a8a"/>' + mouth +
      '<path d="M60 104 l-24 -4 M60 112 l-24 4 M140 104 l24 -4 M140 112 l24 4" stroke="' + (data.fur === 'black' ? '#ccc' : '#4a3b33') + '" stroke-width="2" stroke-linecap="round"/>' +
      onTop + '</g>' +
      (state === 'sleep' ? '<text class="k-z" x="150" y="40" font-size="22" font-weight="700" fill="#8a7b70" font-family="sans-serif">z z</text>' : '') +
      '</svg>';
  }

  function moodState() {
    if (sleeping()) return 'sleep';
    if (fullness() < 35 || happiness() < 30) return 'sad';
    if (happiness() > 75 && fullness() > 60) return 'happy';
    return 'normal';
  }

  function idleLine() {
    const st = moodState();
    if (st === 'sleep') return '呼…呼…（小貓在睡覺）';
    if (fullness() < 35) return '肚子好餓喔…可以給我小魚乾嗎？🐟';
    if (happiness() < 30) return '想要被摸摸…';
    const counts = data.daily.date === today() ? data.daily.counts : {};
    const lines = ['喵～今天也要好好照顧自己喔！', '我最喜歡你了 💕', '陪我玩一下好不好？🧶'];
    if (!counts.diary) lines.push('今天寫日記了嗎？寫日記我會長大喔！📔');
    if (!counts.breathe) lines.push('一起做呼吸練習嗎？我也想變得更放鬆～');
    if (!counts.fortune) lines.push('今天的運勢抽了嗎？🔮');
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function say(text, ms) {
    const b = root && root.querySelector('.kitty-bubble');
    if (!b) return;
    b.textContent = text;
    b.classList.remove('is-pop');
    void b.offsetWidth;
    b.classList.add('is-pop');
    clearTimeout(sayTimer);
    if (ms) sayTimer = setTimeout(function () { say(idleLine()); }, ms);
  }

  function hearts(ch, n) {
    const room = root.querySelector('.kitty-room');
    for (let i = 0; i < (n || 5); i++) {
      const h = document.createElement('span');
      h.className = 'kitty-fx';
      h.textContent = ch;
      h.style.left = (38 + Math.random() * 24) + '%';
      h.style.animationDelay = (i * 0.12) + 's';
      room.appendChild(h);
      setTimeout(function () { h.remove(); }, 1600);
    }
  }

  /* ---------- 互動 ---------- */
  function feed() {
    if (Date.now() - data.lastFed < 40 * 6e4 && fullness() > 90) { say('我還很飽喔～等一下再吃 😸', 2500); return; }
    data.lastFed = Date.now();
    save();
    hearts('🐟', 4);
    say(['好吃！謝謝你 😋', '吃飽飽，好幸福～', '小魚乾最棒了！🐟'][Math.floor(Math.random() * 3)], 2800);
    gain('feed');
    render(true);
    // 廚師貓端著平底鍋出來
    const chef = new Image();
    chef.className = 'kitty-chef';
    chef.src = 'images/deco-chef.png';
    chef.alt = '';
    root.querySelector('.kitty-room').appendChild(chef);
    setTimeout(function () { chef.remove(); }, 2400);
  }
  function pat() {
    data.lastPat = Date.now();
    save();
    hearts('💕', 4);
    say(['呼嚕呼嚕～', '再摸一下下嘛 😽', '好舒服喔～'][Math.floor(Math.random() * 3)], 2500);
    gain('pat');
    render(true);
  }
  function play() {
    data.lastPat = Math.max(data.lastPat, Date.now() - 36e5);
    save();
    const cat = root.querySelector('.kitty-cat');
    cat.classList.remove('is-jump');
    void cat.offsetWidth;
    cat.classList.add('is-jump');
    hearts('🧶', 3);
    say(['抓到了！喵！', '再丟一次再丟一次！', '好好玩～ 😺'][Math.floor(Math.random() * 3)], 2500);
    gain('play');
    render(true);
  }

  /* ---------- 升級與換造型 ---------- */
  function levelUp(level) {
    const dlg = document.getElementById('kitty-dialog');
    if (!dlg) return;
    const stage = stageOf(level);
    const newOutfits = OUTFITS.filter(function (o) { return o.level === level; });
    const newDecor = DECOR.filter(function (d) { return d.level === level; });
    dlg.textContent = '';
    dlg.className = 'sticker-pop';
    const preview = document.createElement('div');
    preview.className = 'kitty-pop-cat';
    preview.innerHTML = catSvg('happy');
    const p = function (cls, t) { const n = document.createElement('p'); n.className = cls; n.textContent = t; return n; };
    dlg.append(p('pop-kicker', '🎉 ' + data.name + ' 升級了！'), preview, p('pop-name', 'Lv ' + level + '・' + stage.label));
    if (stageOf(level - 1) !== stage) dlg.append(p('hint', '長大了！變成「' + stage.label + '」'));
    newOutfits.forEach(function (o) { dlg.append(p('pop-unlock', '解鎖新造型：' + o.icon + ' ' + o.label)); });
    newDecor.forEach(function (d) { dlg.append(p('pop-unlock', '房間多了新擺設：' + d.icon)); });
    const row = document.createElement('div');
    row.className = 'pop-actions';
    const ok = document.createElement('button');
    ok.className = 'btn';
    ok.textContent = '好棒！';
    ok.addEventListener('click', function () { dlg.close(); });
    row.appendChild(ok);
    if (newOutfits.length) {
      const wear = document.createElement('button');
      wear.className = 'btn btn-outline';
      wear.textContent = '馬上穿上';
      wear.addEventListener('click', function () { data.outfit = newOutfits[0].id; save(); render(); dlg.close(); });
      row.prepend(wear);
    }
    dlg.appendChild(row);
    // 如果有其他彈出視窗開著，就等它關掉
    const show = function () { if (document.querySelector('dialog[open]')) setTimeout(show, 600); else dlg.showModal(); };
    setTimeout(show, 900);
  }

  function openWardrobe() {
    const dlg = document.getElementById('kitty-dialog');
    const lv = levelInfo(data.exp).level;
    dlg.textContent = '';
    dlg.className = 'sticker-pop kitty-wardrobe';
    const title = document.createElement('p');
    title.className = 'pop-kicker';
    title.textContent = '👗 換造型';
    const preview = document.createElement('div');
    preview.className = 'kitty-pop-cat';
    const draw = function () { preview.innerHTML = catSvg('happy'); };
    draw();
    const grid = document.createElement('div');
    grid.className = 'wardrobe-grid';
    const furRow = document.createElement('div');
    furRow.className = 'wardrobe-furs';
    function renderOptions() {
      grid.textContent = '';
      OUTFITS.forEach(function (o) {
        const b = document.createElement('button');
        const locked = lv < o.level;
        b.className = 'wardrobe-item' + (data.outfit === o.id ? ' is-active' : '') + (locked ? ' is-locked' : '');
        b.innerHTML = '<span class="w-icon"></span><span class="w-label"></span>';
        b.querySelector('.w-icon').textContent = locked ? '🔒' : o.icon;
        b.querySelector('.w-label').textContent = locked ? 'Lv' + o.level : o.label;
        b.disabled = locked;
        b.addEventListener('click', function () { data.outfit = o.id; save(); draw(); renderOptions(); render(); });
        grid.appendChild(b);
      });
      furRow.textContent = '';
      Object.keys(FURS).forEach(function (k) {
        const b = document.createElement('button');
        b.className = 'fur-dot' + (data.fur === k ? ' is-active' : '');
        b.style.background = FURS[k].fur;
        b.setAttribute('aria-label', FURS[k].label);
        b.title = FURS[k].label;
        b.addEventListener('click', function () { data.fur = k; save(); draw(); renderOptions(); render(); });
        furRow.appendChild(b);
      });
    }
    renderOptions();
    const furLabel = document.createElement('p');
    furLabel.className = 'hint';
    furLabel.textContent = '毛色';
    const row = document.createElement('div');
    row.className = 'pop-actions';
    const ok = document.createElement('button');
    ok.className = 'btn';
    ok.textContent = '好了';
    ok.addEventListener('click', function () { dlg.close(); });
    row.appendChild(ok);
    dlg.append(title, preview, grid, furLabel, furRow, row);
    dlg.showModal();
  }

  /* ---------- 畫面 ---------- */
  function adoptView() {
    root.textContent = '';
    const box = document.createElement('div');
    box.className = 'kitty-adopt';
    const furKeys = Object.keys(FURS);
    let pick = data.fur;
    box.innerHTML = '<p class="kitty-title">🏠 領養一隻小貓</p><p class="hint">寫日記、做呼吸練習、玩遊戲…都會讓牠長大，還能換造型喔！</p><div class="kitty-adopt-cat"></div><div class="wardrobe-furs"></div><input class="kitty-name" maxlength="12" placeholder="幫小貓取個名字"><button class="btn btn-block">領養 🐾</button>';
    const preview = box.querySelector('.kitty-adopt-cat');
    const furs = box.querySelector('.wardrobe-furs');
    function draw() {
      data.fur = pick;
      preview.innerHTML = catSvg('happy');
      furs.textContent = '';
      furKeys.forEach(function (k) {
        const b = document.createElement('button');
        b.className = 'fur-dot' + (pick === k ? ' is-active' : '');
        b.style.background = FURS[k].fur;
        b.title = FURS[k].label;
        b.setAttribute('aria-label', FURS[k].label);
        b.addEventListener('click', function () { pick = k; draw(); });
        furs.appendChild(b);
      });
    }
    draw();
    box.querySelector('.btn').addEventListener('click', function () {
      const name = box.querySelector('.kitty-name').value.trim() || '小咪';
      data.adopted = true;
      data.name = name;
      data.fur = pick;
      data.lastFed = data.lastPat = Date.now();
      save();
      render();
      say('你好！我是' + name + '，以後請多多照顧 😺', 4000);
      hearts('💕', 6);
    });
    root.appendChild(box);
  }

  function bar(label, value, cls) {
    return '<div class="kitty-stat"><span>' + label + '</span><div class="kitty-bar"><div class="' + cls + '" style="width:' + value + '%"></div></div></div>';
  }

  function render(keepBubble) {
    if (!root) return;
    load();
    if (!data.adopted) { adoptView(); return; }
    const info = levelInfo(data.exp);
    const stage = stageOf(info.level);
    const st = moodState();
    const oldBubble = root.querySelector('.kitty-bubble');
    const bubbleText = keepBubble && oldBubble ? oldBubble.textContent : idleLine();
    root.innerHTML =
      '<div class="kitty-head"><p class="kitty-title"></p><span class="kitty-lv"></span></div>' +
      '<div class="kitty-exp"><div class="kitty-exp-fill" style="width:' + Math.round(info.cur / info.need * 100) + '%"></div></div>' +
      '<p class="kitty-exp-text hint">經驗 ' + info.cur + ' / ' + info.need + '・再 ' + (info.need - info.cur) + ' 就升級</p>' +
      '<div class="kitty-room' + (sleeping() ? ' is-night' : '') + '">' +
      DECOR.filter(function (d) { return info.level >= d.level; }).map(function (d) {
        return '<span class="kitty-decor" style="left:' + d.x + '%;top:' + d.y + '%">' + d.icon + '</span>';
      }).join('') +
      '<p class="kitty-bubble"></p>' +
      '<div class="kitty-cat" style="--s:' + stage.scale + '">' + catSvg(st) + '</div>' +
      '</div>' +
      '<div class="kitty-stats">' + bar('🐟 飽足', fullness(), 'fill-food') + bar('💗 心情', happiness(), 'fill-love') + '</div>' +
      '<div class="kitty-actions"><button data-act="feed">🐟<span>餵食</span></button><button data-act="pat">✋<span>摸摸</span></button><button data-act="play">🧶<span>玩耍</span></button><button data-act="wear">👗<span>換造型</span></button></div>' +
      '<details class="kitty-how"><summary>怎麼讓小貓長大？</summary><ul>' +
      Object.keys(GAINS).filter(function (k) { return ['feed', 'play', 'pat'].indexOf(k) === -1; }).map(function (k) {
        const g = GAINS[k];
        return '<li><span>' + g.label + '</span><strong>+' + g.exp + '</strong><small>每天最多 ' + g.daily + ' 次</small></li>';
      }).join('') + '</ul></details>';
    root.querySelector('.kitty-title').textContent = '🏠 ' + data.name + ' 的房間';
    root.querySelector('.kitty-lv').textContent = 'Lv ' + info.level + '・' + stage.label;
    root.querySelector('.kitty-bubble').textContent = bubbleText;
    root.querySelector('.kitty-cat').addEventListener('click', pat);
    root.querySelectorAll('.kitty-actions button').forEach(function (b) {
      b.addEventListener('click', function () {
        ({ feed: feed, pat: pat, play: play, wear: openWardrobe })[b.dataset.act]();
      });
    });
  }

  function init() {
    root = document.getElementById('kitty');
    if (!root) return;
    load();
    render();
    // 每分鐘更新飽足與心情，偶爾換一句話
    clearInterval(bubbleTimer);
    bubbleTimer = setInterval(function () { if (root.offsetParent) render(); }, 60000);
  }

  return { init: init, gain: gain, render: render, levelInfo: function () { load(); return levelInfo(data.exp); } };
})();
