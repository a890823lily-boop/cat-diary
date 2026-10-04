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
    fishing: { exp: 4, daily: 5, label: '釣魚' },
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
    { id: 'lv-yarn', icon: '🧶', level: 1, x: 12, y: 78 },
    { id: 'lv-bowl', icon: '🥣', level: 1, x: 80, y: 80 },
    { id: 'lv-plant', icon: '🪴', level: 3, x: 88, y: 40 },
    { id: 'lv-box', icon: '📦', level: 4, x: 8, y: 52 },
    { id: 'lv-frame', icon: '🖼️', level: 6, x: 10, y: 26 },
    { id: 'lv-window', icon: '🪟', level: 8, x: 90, y: 24 },
    { id: 'lv-castle', icon: '🏰', level: 10, x: 86, y: 62 }
  ];

  /* ---------- 商店：用小魚乾幣買 ---------- */
  const FURNITURE = [
    { id: 'ball', icon: '🎾', name: '小球', price: 15, x: 30, y: 86 },
    { id: 'yoyo', icon: '🪀', name: '溜溜球', price: 15, x: 70, y: 88 },
    { id: 'cactus', icon: '🌵', name: '仙人掌', price: 25, x: 20, y: 46 },
    { id: 'chair', icon: '🪑', name: '小椅子', price: 30, x: 24, y: 66 },
    { id: 'basket', icon: '🧺', name: '貓窩籃', price: 30, x: 64, y: 74 },
    { id: 'lamp', icon: '💡', name: '吊燈', price: 35, x: 16, y: 10 },
    { id: 'clock', icon: '🕰️', name: '時鐘', price: 40, x: 30, y: 18 },
    { id: 'bear', icon: '🧸', name: '熊熊', price: 40, x: 76, y: 60 },
    { id: 'lantern', icon: '🏮', name: '燈籠', price: 45, x: 70, y: 12 },
    { id: 'books', icon: '📚', name: '書堆', price: 50, x: 14, y: 64 },
    { id: 'cake', icon: '🎂', name: '蛋糕', price: 50, x: 40, y: 84 },
    { id: 'sofa', icon: '🛋️', name: '沙發', price: 60, x: 22, y: 76 },
    { id: 'rainbow', icon: '🌈', name: '彩虹掛飾', price: 70, x: 50, y: 30 },
    { id: 'bed', icon: '🛏️', name: '小床', price: 80, x: 78, y: 76 },
    { id: 'tree', icon: '🎄', name: '聖誕樹', price: 100, x: 92, y: 50 },
    { id: 'fishtank', icon: '🐠', name: '熱帶魚', price: 120, x: 74, y: 44 }
  ];
  // 零食：買了馬上餵；full／love 是增加的飽足、心情
  const SNACKS = [
    { id: 'dried', icon: '🐟', name: '小魚乾', price: 10, full: 25, love: 5, line: '喀滋喀滋～小魚乾好香！' },
    { id: 'grass', icon: '🌿', name: '貓草', price: 20, full: 0, love: 60, line: '喵嗚～好開心～（在地上打滾）' },
    { id: 'can', icon: '🥫', name: '罐罐', price: 25, full: 55, love: 20, line: '是罐罐！最喜歡你了！😻' },
    { id: 'pudding', icon: '🍮', name: '貓咪布丁', price: 30, full: 30, love: 35, line: '軟軟的布丁，好幸福～' },
    { id: 'sashimi', icon: '🍣', name: '鮪魚生魚片', price: 60, full: 90, love: 50, line: '這、這是傳說中的生魚片！！✨' }
  ];
  /* 稀有家具：只能從小貓的禮物拿到 */
  const RARE = [
    { id: 'r-unicorn', icon: '🦄', name: '獨角獸', x: 34, y: 70, rare: true },
    { id: 'r-planet', icon: '🪐', name: '小行星', x: 62, y: 14, rare: true },
    { id: 'r-carousel', icon: '🎠', name: '旋轉木馬', x: 12, y: 60, rare: true },
    { id: 'r-trophy', icon: '🏆', name: '金獎盃', x: 46, y: 46, rare: true },
    { id: 'r-crystal', icon: '🔮', name: '水晶球', x: 70, y: 66, rare: true },
    { id: 'r-cake', icon: '🍰', name: '草莓蛋糕', x: 56, y: 86, rare: true },
    { id: 'r-gem', icon: '💎', name: '大鑽石', x: 28, y: 36, rare: true },
    { id: 'r-cloud', icon: '☁️', name: '軟綿綿雲朵', x: 40, y: 12, rare: true }
  ];
  // 只有小貓會說的悄悄話
  const WHISPERS = [
    '其實…我每天都在等你回家喔。',
    '你睡著的時候，我有偷偷幫你守夜。🌙',
    '你不用很厲害，我也最喜歡你。',
    '今天你笑的時候，我尾巴偷偷搖了一下。',
    '我把最喜歡的毛線球藏在你看不到的地方，送給你。',
    '你的手是全世界最好摸的地方。',
    '下雨的時候，我會想你有沒有帶傘。',
    '如果你累了，就把頭靠過來，我借你呼嚕聲。',
    '我記得你寫過的每一篇日記喔。',
    '你今天很棒，比昨天還棒一點點。',
    '這是我的祕密：我其實很怕寂寞，所以謝謝你在。',
    '偷偷告訴你，你是我心中的第一名。🥇',
    '我們一起慢慢長大吧。',
    '你難過的時候，我也會跟著難過，所以要常常笑喔。',
    '這個禮物盒裡最珍貴的，其實是我想你的心情。💛'
  ];

  const WALLS = [
    { id: 'default', name: '奶茶木屋', price: 0, sw: 'linear-gradient(#fff3e3 60%, #e9c9a3 60%)' },
    { id: 'pink', name: '草莓牛奶', price: 60, sw: 'linear-gradient(#ffe4ec 60%, #f2b8c6 60%)' },
    { id: 'mint', name: '薄荷森林', price: 60, sw: 'linear-gradient(#e2f6ec 60%, #a9d8bd 60%)' },
    { id: 'sky', name: '藍天白雲', price: 60, sw: 'linear-gradient(#ddf0fb 60%, #b9d3e6 60%)' },
    { id: 'lavender', name: '薰衣草', price: 80, sw: 'linear-gradient(#eee6fb 60%, #c9b6e8 60%)' },
    { id: 'starry', name: '星空夜晚', price: 120, sw: 'linear-gradient(#2f3363 60%, #565b8f 60%)' }
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
    // 商店上線前累積的經驗，換一半當開店禮
    if (typeof data.coins !== 'number') data.coins = Math.floor((data.exp || 0) / 2);
    if (!Array.isArray(data.owned)) data.owned = [];
    if (!data.placed) data.placed = {};
    if (!Array.isArray(data.walls)) data.walls = ['default'];
    if (!data.wall) data.wall = 'default';
    if (!Array.isArray(data.whispers)) data.whispers = [];
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
    data.coins += got;
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
    // 貓咪生日當天戴上派對帽
    const party = partyDay() ? '<g transform="translate(118 6) rotate(18)"><path d="M0 50 L18 0 L36 50 Z" fill="#f7a1b9" ' + B + '/><path d="M6 34 L30 34 M11 20 L25 20" stroke="#ffd166" stroke-width="5"/><circle cx="18" cy="0" r="6" fill="#ffd166" ' + B + '/></g>' : '';
    const onTop = (behindHead ? '' : (party && (data.outfit === 'hat' || data.outfit === 'crown') ? '' : acc)) + party;
    // 天氣：下雨撐傘、冷天裹毯子、熱天冒汗
    const w = state === 'sleep' ? null : (typeof Weather !== 'undefined' ? Weather.current() : null);
    const blanket = w && w.cold
      ? '<path d="M44 138 Q100 112 156 138 L162 188 Q100 198 38 188 Z" fill="#e76f6f" ' + B + '/>' +
        '<path d="M60 128 L56 190 M80 120 L78 194 M100 118 L100 196 M120 120 L122 194 M140 128 L144 190 M44 156 Q100 140 158 156 M40 174 Q100 162 160 174" stroke="#fff3e3" stroke-width="3" fill="none" opacity="0.7"/>'
      : '';
    const umbrella = w && (w.kind === 'rain' || w.kind === 'storm')
      ? '<g class="k-umbrella"><path d="M104 18 L158 136" stroke="#4a3b33" stroke-width="4" stroke-linecap="round"/><path d="M158 136 q4 10 -6 12" fill="none" stroke="#4a3b33" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M24 34 Q100 -46 178 22 Q160 18 150 30 Q138 16 120 26 Q104 10 86 24 Q66 12 52 30 Q40 22 24 34 Z" fill="#6cb4e4" ' + B + '/>' +
        '<path d="M100 -16 Q90 6 86 24 M100 -16 Q118 4 120 26 M100 -16 Q64 0 52 30 M100 -16 Q140 -2 150 30" fill="none" stroke="#3d7bd9" stroke-width="2.5"/></g>'
      : '';
    const sweat = w && w.hot ? '<path d="M152 62 q-8 12 0 16 q8 -4 0 -16 Z" fill="#b8e0f6" ' + B.replace('3"', '2"') + '/>' : '';
    return '<svg viewBox="0 0 200 200" class="kitty-svg" aria-hidden="true">' +
      '<ellipse cx="100" cy="190" rx="60" ry="8" fill="rgba(0,0,0,0.1)"/>' +
      '<path class="k-tail" d="M140 176 C186 178 192 128 170 112 C160 106 152 116 160 124 C172 134 166 160 136 158 Z" fill="' + f.fur + '" ' + Bk + '/>' +
      '<ellipse cx="100" cy="150" rx="50" ry="42" fill="' + f.fur + '" ' + Bk + '/>' +
      '<ellipse cx="100" cy="158" rx="26" ry="28" fill="#fffaf2" opacity="' + (data.fur === 'white' ? 0.6 : 1) + '"/>' +
      '<ellipse cx="80" cy="186" rx="15" ry="9" fill="#fffaf2" ' + Bk + '/><ellipse cx="120" cy="186" rx="15" ry="9" fill="#fffaf2" ' + Bk + '/>' +
      blanket + behindHead +
      '<g class="k-head">' +
      '<path d="M50 80 L46 22 L92 52 Z M150 80 L154 22 L108 52 Z" fill="' + f.fur + '" ' + Bk + '/>' +
      '<path d="M56 68 L54 36 L80 54 Z M144 68 L146 36 L120 54 Z" fill="' + f.inner + '"/>' +
      '<ellipse cx="100" cy="92" rx="58" ry="48" fill="' + f.fur + '" ' + Bk + '/>' + stripes +
      '<ellipse cx="100" cy="114" rx="22" ry="14" fill="#fffaf2" opacity="' + (data.fur === 'white' ? 0 : 1) + '"/>' +
      '<g class="k-blink">' + eyes + '</g>' +
      '<ellipse cx="66" cy="110" rx="9" ry="6" fill="#f7a1b9" opacity="' + (state === 'happy' ? 0.8 : 0.45) + '"/><ellipse cx="134" cy="110" rx="9" ry="6" fill="#f7a1b9" opacity="' + (state === 'happy' ? 0.8 : 0.45) + '"/>' +
      '<path d="M95 104 H105 L100 110 Z" fill="#e88a8a"/>' + mouth +
      '<path d="M60 104 l-24 -4 M60 112 l-24 4 M140 104 l24 -4 M140 112 l24 4" stroke="' + (data.fur === 'black' ? '#ccc' : '#4a3b33') + '" stroke-width="2" stroke-linecap="round"/>' +
      onTop + sweat + '</g>' + umbrella +
      (state === 'sleep' ? '<text class="k-z" x="150" y="40" font-size="22" font-weight="700" fill="#8a7b70" font-family="sans-serif">z z</text>' : '') +
      '</svg>';
  }

  function moodState() {
    if (sleeping()) return 'sleep';
    if (fullness() < 35 || happiness() < 30) return 'sad';
    if (happiness() > 75 && fullness() > 60) return 'happy';
    return 'normal';
  }

  function partyDay() { return typeof Birthday !== 'undefined' && Birthday.todayCats().length > 0; }

  function weatherLine() {
    const w = typeof Weather !== 'undefined' ? Weather.current() : null;
    if (!w) return null;
    if (w.kind === 'storm') return '外面打雷了…我有點怕，可以待在你旁邊嗎？⛈️';
    if (w.kind === 'rain') return ['下雨了！我撐著傘陪你 ☔', '外面在下雨，出門記得帶傘喔！'][Math.floor(Math.random() * 2)];
    if (w.kind === 'snow') return '下雪了耶！好想去外面踩雪 ⛄';
    if (w.cold) return '今天只有 ' + w.temp + '°C，好冷…我要裹著毯子 🧣 你也要穿暖一點喔';
    if (w.hot) return '今天 ' + w.temp + '°C 好熱…記得多喝水 💧';
    if (w.kind === 'clear' && w.isDay) return '外面出太陽了，好想去窗邊曬太陽 ☀️';
    if (w.kind === 'fog') return '窗外霧霧的，像在雲裡面一樣～';
    return null;
  }

  function idleLine() {
    const st = moodState();
    const wl = st !== 'sleep' && Math.random() < 0.5 ? weatherLine() : null;
    if (wl && fullness() >= 35 && happiness() >= 30) return wl;
    if (st !== 'sleep' && partyDay()) {
      const names = Birthday.todayCats().map(function (c) { return c.name; }).join('、');
      return ['今天是' + names + '的生日！生日快樂 🎂', '我戴了派對帽！一起幫' + names + '慶生吧 🎉'][Math.floor(Math.random() * 2)];
    }
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
      '<div class="kitty-room wall-' + data.wall + (sleeping() ? ' is-night' : '') + (editing ? ' is-editing' : '') + (typeof Weather !== 'undefined' && Weather.enabled() ? ' has-window' : '') + '">' +
      roomItems(info.level).map(function (d) {
        const pos = data.placed[d.id] || d;
        return '<span class="kitty-decor" data-id="' + d.id + '" style="left:' + pos.x + '%;top:' + pos.y + '%">' + d.icon + '</span>';
      }).join('') +
      windowHtml() + giftHtml() +
      '<p class="kitty-bubble"></p>' +
      '<div class="kitty-cat" style="--s:' + stage.scale + '">' + catSvg(st) + '</div>' +
      '</div>' +
      '<div class="kitty-stats">' + bar('🐟 飽足', fullness(), 'fill-food') + bar('💗 心情', happiness(), 'fill-love') + '</div>' +
      weatherBar() +
      (editing
        ? '<div class="kitty-editbar"><span>🪄 用手指拖曳家具，擺到喜歡的位置</span><button class="btn" data-act="done">完成</button></div>'
        : '<div class="kitty-actions"><button data-act="feed">🐟<span>餵食</span></button><button data-act="pat">✋<span>摸摸</span></button><button data-act="play">🧶<span>玩耍</span></button><button data-act="wear">👗<span>換造型</span></button><button data-act="shop">🛒<span>商店</span></button><button data-act="arrange">🪄<span>布置</span></button></div>') +
      (editing ? '' : '<button class="btn btn-outline btn-block kitty-fish-btn">🎣 去窗邊池塘釣魚</button>') +
      (data.whispers.length ? '<button class="link-btn kitty-whisper-btn">💌 收藏的悄悄話（' + data.whispers.length + '）</button>' : '') +
      '<details class="kitty-how"><summary>怎麼讓小貓長大？</summary><ul>' +
      Object.keys(GAINS).filter(function (k) { return ['feed', 'play', 'pat'].indexOf(k) === -1; }).map(function (k) {
        const g = GAINS[k];
        return '<li><span>' + g.label + '</span><strong>+' + g.exp + '</strong><small>每天最多 ' + g.daily + ' 次</small></li>';
      }).join('') + '</ul></details>';
    root.querySelector('.kitty-title').textContent = '🏠 ' + data.name + ' 的房間';
    root.querySelector('.kitty-lv').textContent = 'Lv ' + info.level + '・' + stage.label;
    root.querySelector('.kitty-exp-text').appendChild(document.createTextNode('　🐟 小魚乾幣 ' + data.coins));
    root.querySelector('.kitty-bubble').textContent = bubbleText;
    root.querySelector('.kitty-cat').addEventListener('click', pat);
    const wb = root.querySelector('.kitty-weather');
    const fbtn = root.querySelector('.kitty-fish-btn');
    if (fbtn) fbtn.addEventListener('click', function () { Fishing.open(); });
    const wbtn = root.querySelector('.kitty-whisper-btn');
    if (wbtn) wbtn.addEventListener('click', showWhispers);
    const gb = root.querySelector('.kitty-gift');
    if (gb) gb.addEventListener('click', openGift);
    if (wb) wb.addEventListener('click', function (e) {
      const act = e.target.dataset.weather;
      if (act === 'on') Weather.enable();
      else if (act === 'off') Weather.disable();
      else if (act === 'refresh') Weather.refresh(true);
    });
    root.querySelectorAll('.kitty-actions button, .kitty-editbar button').forEach(function (b) {
      b.addEventListener('click', function () {
        ({ feed: feed, pat: pat, play: play, wear: openWardrobe, shop: openShop,
          arrange: function () { editing = true; render(true); },
          done: function () { editing = false; save(); render(true); say('房間變得好漂亮！謝謝你 😻', 3000); } })[b.dataset.act]();
      });
    });
    if (editing) enableDrag();
  }

  /* 房間裡的東西：升級送的擺設＋買來而且擺出來的家具 */
  function roomItems(level) {
    const lv = DECOR.filter(function (d) { return level >= d.level && !(d.id === 'lv-window' && typeof Weather !== 'undefined' && Weather.enabled()); });
    const bought = FURNITURE.concat(RARE).filter(function (f) { return data.owned.indexOf(f.id) !== -1 && !(data.placed[f.id] && data.placed[f.id].off); });
    return lv.concat(bought);
  }

  /* ---------- 布置：拖曳家具 ---------- */
  let editing = false;
  function enableDrag() {
    const room = root.querySelector('.kitty-room');
    room.querySelectorAll('.kitty-decor').forEach(function (node) {
      node.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        node.setPointerCapture && node.setPointerCapture(e.pointerId);
        node.classList.add('is-dragging');
        const move = function (ev) {
          const r = room.getBoundingClientRect();
          const x = Math.max(4, Math.min(96, (ev.clientX - r.left) / r.width * 100));
          const y = Math.max(6, Math.min(94, (ev.clientY - r.top) / r.height * 100));
          node.style.left = x + '%';
          node.style.top = y + '%';
          const prev = data.placed[node.dataset.id] || {};
          data.placed[node.dataset.id] = { x: Math.round(x), y: Math.round(y), off: prev.off };
        };
        const up = function () {
          node.classList.remove('is-dragging');
          node.removeEventListener('pointermove', move);
          node.removeEventListener('pointerup', up);
          node.removeEventListener('pointercancel', up);
          save();
        };
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerup', up);
        node.addEventListener('pointercancel', up);
      });
    });
  }

  /* ---------- 商店 ---------- */
  let shopTab = 'furniture';
  function openShop() {
    const dlg = document.getElementById('kitty-dialog');
    dlg.className = 'sticker-pop kitty-shop';
    drawShop();
    if (!dlg.open) dlg.showModal();
  }

  function drawShop(msg) {
    const dlg = document.getElementById('kitty-dialog');
    dlg.textContent = '';
    const head = document.createElement('div');
    head.className = 'shop-head';
    head.innerHTML = '<p class="pop-kicker">🛒 小貓商店</p><span class="shop-coins"></span>';
    head.querySelector('.shop-coins').textContent = '🐟 ' + data.coins;
    const tabs = document.createElement('div');
    tabs.className = 'shop-tabs';
    [['furniture', '🛋️ 家具'], ['snack', '🍮 零食'], ['wall', '🎨 壁紙']].forEach(function (t) {
      const b = document.createElement('button');
      b.className = 'shop-tab' + (shopTab === t[0] ? ' is-active' : '');
      b.textContent = t[1];
      b.addEventListener('click', function () { shopTab = t[0]; drawShop(); });
      tabs.appendChild(b);
    });
    const grid = document.createElement('div');
    grid.className = 'shop-grid' + (shopTab === 'wall' ? ' is-walls' : '');
    const note = document.createElement('p');
    note.className = 'shop-msg';
    note.textContent = msg || { furniture: '買來的家具可以按「布置」拖到喜歡的位置', snack: '零食買了會馬上餵給小貓吃', wall: '換一個房間的顏色吧' }[shopTab];

    function card(icon, name, price, state, onClick, swatch) {
      const b = document.createElement('button');
      b.className = 'shop-item' + (state === 'owned' || state === 'using' ? ' is-owned' : '') + (state === 'using' ? ' is-active' : '');
      const top = document.createElement('span');
      top.className = swatch ? 'shop-swatch' : 'shop-icon';
      if (swatch) top.style.background = swatch; else top.textContent = icon;
      const n = document.createElement('span');
      n.className = 'shop-name';
      n.textContent = name;
      const p = document.createElement('span');
      p.className = 'shop-price';
      p.textContent = state === 'using' ? '使用中' : state === 'owned' ? (shopTab === 'wall' ? '換上' : '已擁有') : price ? '🐟 ' + price : '免費';
      if (state === 'buy' && price > data.coins) b.classList.add('is-poor');
      b.append(top, n, p);
      b.addEventListener('click', onClick);
      return b;
    }

    if (shopTab === 'furniture') {
      // 從禮物拿到的稀有家具也列在這裡，可以擺出／收起
      FURNITURE.concat(RARE.filter(function (r) { return data.owned.indexOf(r.id) !== -1; })).forEach(function (f) {
        const own = data.owned.indexOf(f.id) !== -1;
        const off = own && data.placed[f.id] && data.placed[f.id].off;
        const c = card(f.icon, f.name, f.price, own ? 'owned' : 'buy', function () {
          if (own) {
            // 已擁有：切換擺出來／收起來
            const pos = data.placed[f.id] || { x: f.x, y: f.y };
            pos.off = !off;
            data.placed[f.id] = pos;
            save(); render(true);
            drawShop(pos.off ? f.name + ' 收起來了' : f.name + ' 擺出來了！');
            return;
          }
          if (data.coins < f.price) { drawShop('小魚乾幣不夠喔，再寫寫日記、陪小貓玩吧 🐾'); return; }
          data.coins -= f.price;
          data.owned.push(f.id);
          save(); render(true);
          say('哇！新的' + f.name + '！謝謝你 😺', 3000);
          drawShop('買到了 ' + f.icon + ' ' + f.name + '！按「布置」可以移動位置');
        });
        if (own) c.querySelector('.shop-price').textContent = off ? '擺出來' : '收起來';
        if (f.rare) c.classList.add('is-rare');
        grid.appendChild(c);
      });
    } else if (shopTab === 'snack') {
      SNACKS.forEach(function (sn) {
        grid.appendChild(card(sn.icon, sn.name, sn.price, 'buy', function () {
          if (data.coins < sn.price) { drawShop('小魚乾幣不夠喔，再寫寫日記、陪小貓玩吧 🐾'); return; }
          data.coins -= sn.price;
          const now = Date.now();
          // 把「上次吃飯／被摸的時間」往後推，等於提高飽足與心情
          data.lastFed = Math.min(now, Math.max(data.lastFed, now - 12.5 * 36e5) + sn.full / 8 * 36e5);
          data.lastPat = Math.min(now, Math.max(data.lastPat, now - 10 * 36e5) + sn.love / 10 * 36e5);
          save();
          document.getElementById('kitty-dialog').close();
          render(true);
          hearts(sn.icon, 5);
          say(sn.line, 3500);
        }));
      });
    } else {
      WALLS.forEach(function (w) {
        const own = data.walls.indexOf(w.id) !== -1;
        grid.appendChild(card('', w.name, w.price, data.wall === w.id ? 'using' : own ? 'owned' : 'buy', function () {
          if (!own) {
            if (data.coins < w.price) { drawShop('小魚乾幣不夠喔，再寫寫日記、陪小貓玩吧 🐾'); return; }
            data.coins -= w.price;
            data.walls.push(w.id);
          }
          data.wall = w.id;
          save(); render(true);
          drawShop('換成「' + w.name + '」了！');
        }, w.sw));
      });
    }
    const close = document.createElement('button');
    close.className = 'btn btn-block';
    close.textContent = '關閉';
    close.addEventListener('click', function () { dlg.close(); });
    dlg.append(head, tabs, note, grid, close);
  }

  /* ---------- 小貓的禮物 ---------- */
  const GIFT_GAP = 6 * 36e5; // 打開一個禮物後，至少 6 小時才會有下一個
  const GIFT_DAILY = 2;      // 每天最多 2 個

  // 該不該放一個新禮物盒
  function maybeGift() {
    if (data.gift || editing || sleeping()) return;
    if (data.giftDay && data.giftDay.date === today() && data.giftDay.count >= GIFT_DAILY) return;
    if (data.lastGift && Date.now() - data.lastGift < GIFT_GAP) return;
    data.gift = { x: 18 + Math.round(Math.random() * 64), y: 74 + Math.round(Math.random() * 12) };
    save();
  }

  function giftHtml() {
    maybeGift();
    if (!data.gift || editing) return '';
    return '<button class="kitty-gift" style="left:' + data.gift.x + '%;top:' + data.gift.y + '%" aria-label="小貓留下的禮物">🎁</button>';
  }

  function openGift() {
    if (!data.gift) return;
    // 抽獎：稀有家具 15%、悄悄話 30%、其餘是小魚乾幣
    const notOwned = RARE.filter(function (r) { return data.owned.indexOf(r.id) === -1; });
    const r = Math.random();
    let prize;
    if (r < 0.15 && notOwned.length) {
      const item = notOwned[Math.floor(Math.random() * notOwned.length)];
      data.owned.push(item.id);
      prize = { kind: 'rare', icon: item.icon, title: '稀有家具：' + item.name + '！', text: '這是只有禮物盒才拿得到的珍藏，已經擺進房間了 ✨' };
    } else if (r < 0.45) {
      const fresh = WHISPERS.filter(function (w) { return data.whispers.indexOf(w) === -1; });
      const w = (fresh.length ? fresh : WHISPERS)[Math.floor(Math.random() * (fresh.length || WHISPERS.length))];
      if (data.whispers.indexOf(w) === -1) data.whispers.push(w);
      prize = { kind: 'whisper', icon: '💌', title: data.name + '的悄悄話', text: '「' + w + '」' };
    } else {
      const n = 10 + Math.floor(Math.random() * 4) * 10;
      data.coins += n;
      prize = { kind: 'coins', icon: '🐟', title: '小魚乾幣 +' + n, text: data.name + '偷偷存下來的小魚乾，全部送給你！' };
    }
    const day = data.giftDay && data.giftDay.date === today() ? data.giftDay : { date: today(), count: 0 };
    day.count++;
    data.giftDay = day;
    data.lastGift = Date.now();
    data.gift = null;
    save();
    render(true);
    showGift(prize);
  }

  function showGift(prize) {
    const dlg = document.getElementById('kitty-dialog');
    dlg.textContent = '';
    dlg.className = 'sticker-pop kitty-giftpop is-' + prize.kind;
    const box = document.createElement('div');
    box.className = 'gift-box';
    box.innerHTML = '<span class="gift-lid">🎀</span><span class="gift-body">🎁</span>';
    const reveal = document.createElement('div');
    reveal.className = 'gift-reveal';
    const p = function (cls, t) { const n = document.createElement('p'); n.className = cls; n.textContent = t; return n; };
    reveal.append(p('gift-icon', prize.icon), p('pop-name', prize.title), p('gift-text', prize.text));
    const row = document.createElement('div');
    row.className = 'pop-actions';
    const ok = document.createElement('button');
    ok.className = 'btn';
    ok.textContent = prize.kind === 'whisper' ? '我也愛你 💕' : '謝謝你！';
    ok.addEventListener('click', function () { dlg.close(); });
    row.appendChild(ok);
    if (data.whispers.length > 1 && prize.kind === 'whisper') {
      const all = document.createElement('button');
      all.className = 'btn btn-outline';
      all.textContent = '收藏的悄悄話';
      all.addEventListener('click', showWhispers);
      row.prepend(all);
    }
    dlg.append(p('pop-kicker', '🎁 ' + data.name + '留下了一個禮物'), box, reveal, row);
    dlg.showModal();
    // 先晃一晃，再打開
    setTimeout(function () { dlg.classList.add('is-open'); hearts(prize.icon, 5); }, 900);
  }

  function showWhispers() {
    const dlg = document.getElementById('kitty-dialog');
    dlg.textContent = '';
    dlg.className = 'sticker-pop kitty-whispers';
    const title = document.createElement('p');
    title.className = 'pop-kicker';
    title.textContent = '💌 ' + data.name + '的悄悄話（' + data.whispers.length + ' / ' + WHISPERS.length + '）';
    const list = document.createElement('ul');
    list.className = 'whisper-list';
    data.whispers.forEach(function (w) { const li = document.createElement('li'); li.textContent = w; list.appendChild(li); });
    const ok = document.createElement('button');
    ok.className = 'btn btn-block';
    ok.textContent = '關閉';
    ok.addEventListener('click', function () { dlg.close(); });
    dlg.append(title, list, ok);
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- 窗外天氣 ---------- */
  function windowHtml() {
    if (typeof Weather === 'undefined' || !Weather.enabled()) return '';
    const w = Weather.current();
    if (!w) return '<div class="kitty-window sky-loading"><span class="kw-label">⏳</span></div>';
    let fx = '';
    const n = { rain: 14, storm: 16, snow: 12 }[w.kind] || 0;
    for (let i = 0; i < n; i++) {
      fx += '<i style="left:' + Math.round(Math.random() * 96) + '%;animation-delay:' + (Math.random() * 1.5).toFixed(2) + 's;animation-duration:' + (w.kind === 'snow' ? 2.5 + Math.random() * 2 : 0.6 + Math.random() * 0.4).toFixed(2) + 's"></i>';
    }
    if (w.kind === 'clear') fx = w.isDay ? '<b class="kw-sun"></b>' : '<b class="kw-moon"></b><b class="kw-star"></b>';
    if (w.kind === 'cloudy' || w.kind === 'fog' || w.kind === 'rain' || w.kind === 'storm') fx += '<b class="kw-cloud"></b><b class="kw-cloud c2"></b>';
    if (w.kind === 'cloudy' && w.isDay) fx = '<b class="kw-sun small"></b>' + fx;
    return '<div class="kitty-window sky-' + w.kind + (w.isDay ? '' : ' is-night') + '">' + fx +
      '<span class="kw-label">' + w.icon + ' ' + w.temp + '°</span></div>';
  }

  function weatherBar() {
    if (typeof Weather === 'undefined') return '';
    if (!Weather.enabled()) {
      return '<div class="kitty-weather"><span>🌦️ 讓窗外跟著你那邊的天氣變化</span><button class="btn-small" data-weather="on">開啟</button></div>';
    }
    const w = Weather.current();
    const err = Weather.error();
    const text = Weather.loading() ? '查詢天氣中…' : w
      ? w.icon + ' ' + (w.place || '') + '・' + w.text + ' ' + w.temp + '°C' + (err ? '（' + err + '）' : '')
      : (err || '查詢天氣中…');
    return '<div class="kitty-weather"><span class="kw-text"></span><button class="btn-small" data-weather="refresh">更新</button><button class="link-btn kw-off" data-weather="off">關閉</button></div>'
      .replace('<span class="kw-text"></span>', '<span class="kw-text">' + text.replace(/[<>&]/g, '') + '</span>');
  }

  function init() {
    root = document.getElementById('kitty');
    if (!root) return;
    load();
    render();
    if (typeof Weather !== 'undefined') {
      document.addEventListener('weather:update', function () { render(true); });
      Weather.refresh();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) Weather.refresh(); });
    }
    // 每分鐘更新飽足與心情，偶爾換一句話
    clearInterval(bubbleTimer);
    bubbleTimer = setInterval(function () { if (root.offsetParent) render(); }, 60000);
  }

  /* 給釣魚用：把魚餵小貓、加小魚乾幣、取得小貓圖案 */
  function treat(full, love, line, icon) {
    load();
    const now = Date.now();
    data.lastFed = Math.min(now, Math.max(data.lastFed, now - 12.5 * 36e5) + full / 8 * 36e5);
    data.lastPat = Math.min(now, Math.max(data.lastPat, now - 10 * 36e5) + love / 10 * 36e5);
    save();
    render(true);
    if (root && root.querySelector('.kitty-room')) { hearts(icon || '🐟', 4); say(line, 3500); }
  }
  function addCoins(n) { load(); data.coins += n; save(); render(true); }

  return {
    init: init, gain: gain, render: render, treat: treat, addCoins: addCoins,
    adopted: function () { load(); return data.adopted; },
    name: function () { load(); return data.name; },
    art: function () { load(); return catSvg('happy'); },
    levelInfo: function () { load(); return levelInfo(data.exp); }
  };
})();
