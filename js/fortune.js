/* 今日貓咪運勢：每天抽一支貓咪籤 */
const Fortune = (function () {
  'use strict';

  const LEVELS = [
    { id: 'bday', name: '壽星吉', weight: 0, img: 'images/deco-love.png',
      msgs: ['全世界最可愛的壽星，今天什麼都會很順利 🎂', '今天的好運加倍再加倍，記得給壽星一個大擁抱！🎉', '生日快樂！今天的小魚乾要多給一份喔 🐟'] },
    { id: 'meow', name: '喵吉', weight: 3, img: 'icons/icon-512.png', photo: true,
      msgs: ['超稀有！今天被貓咪選中了，什麼事都會很順利。', '傳說中的喵吉！今天的你被全世界的貓咪祝福著。'] },
    { id: 'great', name: '大吉', weight: 17, img: 'images/deco-sax.png',
      msgs: ['好運滿滿！今天適合挑戰一件想做很久的事。', '運氣像剛曬好的棉被一樣蓬鬆溫暖。', '今天的好運，連貓咪都忍不住幫你吹奏一曲。'] },
    { id: 'good', name: '中吉', weight: 22, img: 'images/deco-skate.png',
      msgs: ['順順的一天，像在冰上滑行一樣輕快。', '小小的好事會一件接一件發生喔。', '保持笑容，好運會自己滑過來。'] },
    { id: 'small', name: '小吉', weight: 22, img: 'images/deco-fish.png',
      msgs: ['平平安安就是福，今天會有小確幸。', '留意身邊的小事，幸運就藏在裡面。', '慢慢來，今天會比想像中更好。'] },
    { id: 'ok', name: '吉', weight: 18, img: 'images/deco-wizard.png',
      msgs: ['揮揮魔杖，普通的一天也能變得閃閃發亮。', '今天適合照自己的步調走。', '好運正在路上，耐心等等牠。'] },
    { id: 'late', name: '末吉', weight: 12, img: 'images/deco-suit.png',
      msgs: ['先苦後甜，晚上會有好事等著你。', '今天認真一點點，明天的運氣會更好。', '好運比較害羞，下午才會出來。'] },
    { id: 'meh', name: '小凶', weight: 6, img: 'images/deco-suit.png',
      msgs: ['別擔心，小凶只是提醒你今天要對自己好一點。', '運氣在午睡，不如你也一起休息吧。', '抱抱貓咪就能轉運，效果立即見效！'] }
  ];

  const YI = ['躺平', '曬太陽', '吃罐罐', '摸摸貓咪', '早點睡', '喝溫水', '吃甜點', '整理房間', '散步', '拍貓咪照片',
    '寫日記', '伸懶腰', '聽音樂', '傳訊息給朋友', '買小禮物給自己', '午睡', '大笑', '泡澡', '看喜歡的劇', '塗色放鬆',
    '跟貓咪說早安', '吃好吃的', '換新貓砂', '抱抱自己', '準時下班'];
  const JI = ['熬夜', '踩到貓尾巴', '想太多', '空腹喝咖啡', '跟貓咪搶位子', '滑手機太久', '生悶氣', '忘記喝水',
    '跟別人比較', '勉強自己', '吃太撐', '把貓砂打翻', '對自己太嚴格', '拖延', '在貓咪睡覺時吵牠', '亂花錢'];
  const ITEMS = ['逗貓棒', '紙箱', '小魚乾', '毛線球', '貓抓板', '罐罐', '貓薄荷', '溫暖的毯子', '鈴鐺', '肉球貼紙',
    '一杯熱可可', '窗邊的陽光', '軟軟的抱枕', '新的筆記本', '貓咪馬克杯', '星星吊飾'];
  const COLORS = [
    { name: '橘貓橘', hex: '#f4a261' }, { name: '櫻花粉', hex: '#f7a1b9' }, { name: '天空藍', hex: '#6cb4e4' },
    { name: '薄荷綠', hex: '#7fc8a9' }, { name: '奶油黃', hex: '#ffd166' }, { name: '薰衣草紫', hex: '#a78bda' },
    { name: '可可棕', hex: '#8d5a3b' }, { name: '雲朵白', hex: '#f5f1ea' }, { name: '虎斑灰', hex: '#9e9e9e' },
    { name: '蜜桃橘', hex: '#f6c6a8' }, { name: '深海藍', hex: '#3d5a98' }, { name: '玫瑰紅', hex: '#e76f96' }
  ];

  const KEY = 'cat-diary:fortune';
  let box = null;
  let drawing = false;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dateKey(new Date()); }
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); }

  function rand(n) { return Math.floor(Math.random() * n); }
  function pickTwo(n) { const a = rand(n); let b; do { b = rand(n); } while (b === a); return [a, b]; }

  function pickLevel() {
    const total = LEVELS.reduce(function (s, l) { return s + l.weight; }, 0);
    let r = Math.random() * total;
    for (const l of LEVELS) { r -= l.weight; if (r < 0) return l; }
    return LEVELS[LEVELS.length - 1];
  }

  function draw() {
    // 貓咪生日當天一定抽到「壽星吉」
    const bdayCats = Birthday.todayCats();
    const level = bdayCats.length ? LEVELS.find(function (l) { return l.id === 'bday'; }) : pickLevel();
    const result = {
      date: today(),
      level: level.id,
      msg: rand(level.msgs.length),
      yi: pickTwo(YI.length),
      ji: rand(JI.length),
      item: rand(ITEMS.length),
      color: rand(COLORS.length),
      bday: bdayCats.map(function (c) { return c.name; }).join('、')
    };
    write(KEY, result);
    Stickers.award('fortune');
    Kitty.gain('fortune');
    // 連續抽籤天數
    const streak = read(KEY + '-streak') || { last: null, count: 0 };
    streak.count = streak.last === yesterday() ? streak.count + 1 : streak.last === today() ? streak.count : 1;
    streak.last = today();
    write(KEY + '-streak', streak);
    return result;
  }

  function todayResult() {
    const r = read(KEY);
    return r && r.date === today() && LEVELS.some(function (l) { return l.id === r.level; }) ? r : null;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* 籤筒（SVG） */
  const TUBE = '<svg viewBox="0 0 120 170" class="tube-svg" aria-hidden="true">' +
    '<rect class="tube-stick" x="54" y="8" width="12" height="70" rx="3" fill="#e9c48a" stroke="#8d5a3b" stroke-width="2"/>' +
    '<text class="tube-stick" x="60" y="40" font-size="9" text-anchor="middle" fill="#c8553d" font-weight="700" writing-mode="tb">籤</text>' +
    '<path d="M22 50 H98 L92 160 Q60 168 28 160 Z" fill="#d94f3d" stroke="#8a2e22" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="50" rx="38" ry="9" fill="#a93a2c" stroke="#8a2e22" stroke-width="3"/>' +
    '<rect x="26" y="70" width="68" height="8" fill="#f2c14e"/>' +
    '<rect x="29" y="138" width="62" height="8" fill="#f2c14e"/>' +
    '<circle cx="60" cy="108" r="20" fill="#fff8ef" stroke="#f2c14e" stroke-width="3"/>' +
    '<text x="60" y="115" font-size="19" text-anchor="middle" fill="#c8553d" font-weight="700">貓</text>' +
    '</svg>';

  function render(justDrawn) {
    box.textContent = '';
    const r = todayResult();
    const streak = read(KEY + '-streak');
    if (!r) {
      const wrap = el('div', 'fortune-start');
      const tube = el('div', 'tube');
      tube.innerHTML = TUBE;
      const btn = el('button', 'btn fortune-btn', '🔮 搖一搖，抽今日貓咪籤');
      btn.addEventListener('click', function () {
        if (drawing) return;
        drawing = true;
        btn.disabled = true;
        tube.classList.add('is-shaking');
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(function () {
          tube.classList.remove('is-shaking');
          tube.classList.add('is-out');
          setTimeout(function () {
            draw();
            drawing = false;
            render(true);
          }, reduce ? 0 : 700);
        }, reduce ? 0 : 1100);
      });
      wrap.append(tube, el('p', 'fortune-ask', '今天的運氣如何呢？'), btn,
        el('p', 'hint', '每天可以抽一次，隔天再來看看新的運勢。'));
      box.appendChild(wrap);
      return;
    }

    const level = LEVELS.find(function (l) { return l.id === r.level; });
    const color = COLORS[r.color];
    const card = el('article', 'fortune-card level-' + level.id + (justDrawn ? ' reveal' : ''));
    const head = el('div', 'fortune-head');
    head.append(el('span', 'fortune-label', '今日貓咪運勢'), el('span', 'fortune-date', r.date.replace(/-/g, '/')));
    const main = el('div', 'fortune-main');
    const img = el('img', 'fortune-img' + (level.photo ? ' is-photo' : ''));
    img.src = level.img;
    img.alt = '';
    main.append(img, el('p', 'fortune-level', level.name));
    const msg = el('p', 'fortune-msg', (level.id === 'bday' && r.bday ? '今天是' + r.bday + '的生日！' : '') + (level.msgs[r.msg] || level.msgs[0]));

    const rows = el('dl', 'fortune-rows');
    function row(label, value, extra) {
      const dt = el('dt', null, label);
      const dd = el('dd', null, value);
      if (extra) dd.prepend(extra);
      rows.append(dt, dd);
    }
    row('宜', YI[r.yi[0]] + '、' + YI[r.yi[1]]);
    row('忌', JI[r.ji]);
    const sw = el('span', 'fortune-swatch');
    sw.style.background = color.hex;
    row('幸運色', color.name, sw);
    row('幸運物', ITEMS[r.item]);

    card.append(head, main, msg, rows);
    box.appendChild(card);
    const foot = el('p', 'hint fortune-foot',
      (streak && streak.count > 1 ? '🔥 已經連續抽籤 ' + streak.count + ' 天！' : '') + '明天再來抽新的運勢喔 🐾');
    box.appendChild(foot);
  }

  function show() {
    if (!box) box = document.getElementById('fortune-box');
    render(false);
  }

  return { show: show, levels: LEVELS, art: TUBE };
})();
