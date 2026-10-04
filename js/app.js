/* 貓咪日記主程式 */
(function () {
  'use strict';

  const TAGS = [
    { id: 'daily', label: '日常', icon: '🐈' },
    { id: 'food', label: '飲食', icon: '🍽️' },
    { id: 'poop', label: '便便', icon: '💩' },
    { id: 'play', label: '玩耍', icon: '🧶' },
    { id: 'sleep', label: '睡覺', icon: '💤' },
    { id: 'health', label: '健康', icon: '🩺' },
    { id: 'vet', label: '看醫生', icon: '🏥' },
    { id: 'groom', label: '洗澡美容', icon: '🛁' },
    { id: 'other', label: '其他', icon: '📌' }
  ];
  const TAG_MAP = Object.fromEntries(TAGS.map(function (t) { return [t.id, t]; }));
  const PHOTO_MAX = 1600;
  const THUMB_MAX = 480;

  const state = {
    cats: [],
    entries: [],
    photos: new Map(),  // id -> photo 紀錄
    filter: readPref('filter', 'all'),
    view: 'diary'
  };
  const urls = new Map(); // key -> object URL

  const $ = function (sel) { return document.querySelector(sel); };

  /* ---------- 小工具 ---------- */
  function readPref(key, fallback) {
    try { return localStorage.getItem('cat-diary:' + key) || fallback; } catch (e) { return fallback; }
  }
  function writePref(key, value) {
    try { localStorage.setItem('cat-diary:' + key, value); } catch (e) { /* 忽略 */ }
  }

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function nowTime() {
    const d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function formatDate(s) {
    const p = s.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    const week = '日一二三四五六'[d.getDay()];
    return p[0] + ' 年 ' + p[1] + ' 月 ' + p[2] + ' 日（' + week + '）';
  }
  function shortDate(s) {
    const p = s.split('-').map(Number);
    return p[1] + '/' + p[2];
  }
  function ageText(birthday) {
    if (!birthday) return '';
    const b = birthday.split('-').map(Number);
    const n = new Date();
    let months = (n.getFullYear() - b[0]) * 12 + (n.getMonth() + 1 - b[1]);
    if (n.getDate() < b[2]) months--;
    if (months < 0) return '';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return m + ' 個月';
    return y + ' 歲' + (m ? ' ' + m + ' 個月' : '');
  }

  /* 建立 DOM 元素；使用者輸入一律走 textContent，避免 XSS */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function blobUrl(key, blob) {
    if (!blob) return '';
    if (!urls.has(key)) urls.set(key, URL.createObjectURL(blob));
    return urls.get(key);
  }
  function dropUrl(key) {
    if (urls.has(key)) { URL.revokeObjectURL(urls.get(key)); urls.delete(key); }
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    // 對話框開著時，提示要放進對話框裡才看得到（對話框位於最上層）
    const host = document.querySelector('dialog[open]') || document.body;
    if (t.parentNode !== host) host.appendChild(t);
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ---------- 圖片處理 ---------- */
  function loadImage(blob) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('無法讀取圖片')); };
      img.src = url;
    });
  }

  function resizeTo(img, max, quality) {
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('圖片轉換失敗')); }, 'image/jpeg', quality);
    });
  }

  async function processImage(file) {
    const img = await loadImage(file);
    const blob = await resizeTo(img, PHOTO_MAX, 0.85);
    const thumb = await resizeTo(img, THUMB_MAX, 0.8);
    return { blob: blob, thumb: thumb };
  }

  /* ---------- 讀取資料 ---------- */
  async function loadAll() {
    const results = await Promise.all([DB.getAll('cats'), DB.getAll('entries'), DB.getAll('photos')]);
    state.cats = results[0].sort(function (a, b) { return a.createdAt - b.createdAt; });
    state.entries = results[1];
    state.photos = new Map(results[2].map(function (p) { return [p.id, p]; }));
    if (state.filter !== 'all' && !catById(state.filter)) state.filter = 'all';
    Birthday.setCats(state.cats);
    Kitty.render(true);
  }

  function catById(id) {
    return state.cats.find(function (c) { return c.id === id; });
  }

  function sortedEntries() {
    return state.entries
      .filter(function (e) { return state.filter === 'all' || e.catId === state.filter; })
      .sort(function (a, b) {
        const ka = a.date + (a.time || '') + a.createdAt;
        const kb = b.date + (b.time || '') + b.createdAt;
        return ka < kb ? 1 : ka > kb ? -1 : 0;
      });
  }

  function avatarNode(cat, size) {
    const cls = 'avatar' + (size ? ' avatar-' + size : '');
    if (cat && cat.avatar) {
      return el('span', { class: cls }, [el('img', { src: blobUrl('avatar:' + cat.id + ':' + cat.updatedAt, cat.avatar), alt: '' })]);
    }
    return el('span', { class: cls }, [el('span', { text: '🐱' })]);
  }

  /* ---------- 畫面 ---------- */
  function render() {
    renderFilter();
    if (state.view === 'diary') renderDiary();
    if (state.view === 'album') renderAlbum();
    if (state.view === 'cats') renderCats();
    $('#fab').hidden = state.view === 'cats' || state.view === 'play' || state.view === 'jar';
  }

  function renderFilter() {
    const box = $('#cat-filter');
    box.textContent = '';
    if (state.cats.length < 2) { box.hidden = true; return; }
    box.hidden = false;
    const items = [{ id: 'all', name: '全部' }].concat(state.cats);
    items.forEach(function (c) {
      const active = state.filter === c.id;
      box.appendChild(el('button', {
        class: 'filter-chip' + (active ? ' is-active' : ''),
        role: 'tab',
        'aria-selected': active ? 'true' : 'false',
        onclick: function () { state.filter = c.id; writePref('filter', c.id); render(); }
      }, [c.id === 'all' ? null : avatarNode(c, 'xs'), c.name]));
    });
  }

  function emptyState(icon, title, text, btnLabel, onClick) {
    return el('div', { class: 'empty' }, [
      /\.(jpg|png)$/.test(icon)
        ? el('img', { class: 'empty-photo', src: icon, alt: '我家的貓咪' })
        : el('div', { class: 'empty-icon', text: icon }),
      el('p', { class: 'empty-title', text: title }),
      el('p', { class: 'hint', text: text }),
      btnLabel ? el('button', { class: 'btn', text: btnLabel, onclick: onClick }) : null
    ]);
  }

  /* 列表最下方的裝飾插圖 */
  function listEnd(src, motion, text) {
    return el('div', { class: 'list-end' }, [
      el('img', { class: 'list-end-img ' + motion, src: src, alt: '' }),
      el('p', { class: 'hint', text: text })
    ]);
  }

  /* 抽一句鼓勵：可以選今天的心情，依心情抽句子；可以一直抽，
     每種心情的句子都會輪過一遍才重複，重新打開時顯示最後抽到的那句 */
  function readJson(key) {
    try { return JSON.parse(readPref(key, 'null')); } catch (e) { return null; }
  }

  function readQuote() {
    const q = readJson('quote');
    if (!q) return null;
    if (!q.pool) q.pool = 'general'; // 舊版資料只有一般句子
    if (!q.bags) q.bags = { general: Array.isArray(q.bag) ? q.bag : [] };
    return q;
  }

  /* 今天選的心情；隔天自動清空 */
  function todayMood() {
    const m = readJson('mood');
    return m && m.date === today() ? m.mood : null;
  }

  function quotePool(mood) {
    return mood && MOOD_QUOTES[mood] ? mood : 'general';
  }

  function poolList(pool) {
    return pool === 'general' ? QUOTES : MOOD_QUOTES[pool] || QUOTES;
  }

  function drawQuote(pool) {
    const saved = readQuote() || { bags: {} };
    const list = poolList(pool);
    const last = saved.pool === pool ? saved.index : -1;
    let bag = (saved.bags[pool] || []).filter(function (i) { return i < list.length; });
    if (!bag.length) {
      bag = list.map(function (_, i) { return i; });
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
      // 新的一輪第一句不要和上一句一樣
      if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop());
    }
    const index = bag.pop();
    saved.bags[pool] = bag;
    writePref('quote', JSON.stringify({ index: index, pool: pool, bags: saved.bags }));
    Stickers.award('wizard');
    Kitty.gain('quote');
  }

  function quoteCard() {
    const card = el('section', { class: 'quote-card', 'aria-live': 'polite' });
    fillQuoteCard(card, false);
    return card;
  }

  function fillQuoteCard(card, justDrawn) {
    const saved = readQuote();
    const quote = saved && poolList(saved.pool)[saved.index];
    const mood = todayMood();
    card.textContent = '';
    card.classList.toggle('reveal', !!justDrawn);
    // 依今天的心情換一隻表情不同的貓
    const moodCat = { happy: 'deco-love', normal: 'deco-blep', tired: 'deco-hmph', sad: 'deco-cry', anxious: 'deco-sweat', angry: 'deco-shock', lonely: 'deco-phone' }[mood];
    card.appendChild(el('img', { class: 'quote-cat' + (moodCat ? ' is-mood' : ' deco-wave'), src: 'images/' + (moodCat || 'deco-wizard') + '.png', alt: '' }));

    const chips = el('div', { class: 'mood-chips', role: 'group', 'aria-label': '今天的心情' },
      MOODS.map(function (m) {
        const on = mood === m.id;
        return el('button', {
          class: 'mood-chip' + (on ? ' is-active' : ''),
          'aria-pressed': on ? 'true' : 'false',
          onclick: function () {
            if (on) {
              // 再點一次取消心情
              writePref('mood', JSON.stringify({ date: today(), mood: null }));
              logMood(null);
              fillQuoteCard(card, false);
              return;
            }
            writePref('mood', JSON.stringify({ date: today(), mood: m.id }));
            logMood(m.id);
            drawQuote(quotePool(m.id));
            fillQuoteCard(card, true);
          }
        }, [m.icon + ' ' + m.label]);
      }));

    const body = el('div', { class: 'quote-body' }, [
      el('p', { class: 'quote-label', text: '抽一句鼓勵 ✨' }),
      el('p', { class: 'mood-ask', text: '今天心情如何？' }),
      chips
    ]);
    if (quote) body.appendChild(el('p', { class: 'quote-text', text: quote }));
    const actions = el('div', { class: 'quote-actions' }, [el('button', {
      class: quote ? 'btn btn-outline quote-btn quote-again' : 'btn quote-btn',
      text: quote ? '再抽一句' : '抽一句鼓勵的話',
      onclick: function () { drawQuote(quotePool(todayMood())); fillQuoteCard(card, true); }
    })]);
    // 心情不好時，建議去塗色放鬆
    // 心情不好時，推薦適合的放鬆方式
    const comfort = {
      anxious: ['breathe', '🫁 跟貓咪一起呼吸'],
      tired: ['breathe', '🫁 跟貓咪一起呼吸'],
      sad: ['thanks', '⭐ 搖一搖感恩罐'],
      lonely: ['pet', '🐈 去摸摸貓咪'],
      angry: ['color', '🎨 去塗色放鬆一下']
    }[mood];
    if (comfort) {
      actions.appendChild(el('button', {
        class: 'btn quote-btn quote-color',
        text: comfort[1],
        onclick: function () { document.dispatchEvent(new CustomEvent('play:go', { detail: comfort[0] })); }
      }));
    }
    body.appendChild(actions);
    card.appendChild(body);
  }

  /* ---------- 今日貓咪：每次打開隨機一張，點一下換一張 ---------- */
  const HOME_PHOTOS = ['images/cat-cuddle.jpg', 'images/cat-peek.jpg', 'images/cat-window.jpg', 'images/cat-floor.jpg'];
  const PIC_CAPTIONS = [
    '今天也要被我可愛到 ♡', '看什麼看，快來摸摸我', '本喵今日營業中 🐾', '你今天辛苦了，給你看我',
    '肚子餓了，罐罐呢？', '偷偷看你一眼 👀', '世界上最可愛的貓咪', '要抱抱嗎？只給你抱喔'
  ];
  let catPick = null;

  // 內建照片＋日記裡的照片都會被抽到
  function catPicPool() {
    const pool = HOME_PHOTOS.map(function (src) { return { key: src, url: function () { return src; } }; });
    state.photos.forEach(function (p) {
      if (p.blob) pool.push({ key: 'p:' + p.id, url: function () { return blobUrl('full:' + p.id, p.blob); } });
    });
    return pool;
  }

  function pickCatPic(avoid) {
    const pool = catPicPool();
    const choices = pool.length > 1 ? pool.filter(function (x) { return x.key !== avoid; }) : pool;
    const item = choices[Math.floor(Math.random() * choices.length)];
    catPick = { key: item.key, caption: PIC_CAPTIONS[Math.floor(Math.random() * PIC_CAPTIONS.length)] };
    writePref('catpic', item.key);
  }

  function catPicCard() {
    // 這次打開 App 第一次顯示時抽一張（和上次打開不同）；照片被刪掉也重抽
    if (!catPick || !catPicPool().some(function (x) { return x.key === catPick.key; })) {
      pickCatPic(readPref('catpic', ''));
    }
    const card = el('section', { class: 'catpic-card', 'aria-label': '今日貓咪' });
    function fill(animate) {
      const item = catPicPool().find(function (x) { return x.key === catPick.key; });
      card.textContent = '';
      const img = el('img', { class: 'catpic-img' + (animate ? ' pop' : ''), src: item.url(), alt: '我家的貓咪' });
      card.appendChild(el('button', { class: 'catpic-photo', 'aria-label': '換一張貓咪照片', onclick: next }, [img]));
      card.appendChild(el('div', { class: 'catpic-row' }, [
        el('p', { class: 'catpic-caption', text: catPick.caption }),
        el('button', { class: 'btn btn-outline catpic-btn', text: '🔀 換一張', onclick: next })
      ]));
    }
    function next() { pickCatPic(catPick.key); fill(true); }
    fill(false);
    return card;
  }

  /* ---------- 生日倒數 ---------- */
  function birthdayCard() {
    if (!state.cats.length) return null;
    const list = Birthday.upcoming().filter(function (b) { return state.filter === 'all' || b.cat.id === state.filter; });
    if (!list.length) {
      // 還沒填生日：提示一下
      return el('button', { class: 'bday-strip is-empty', onclick: function () { setView('cats'); } }, [
        el('span', { class: 'bday-icon', text: '🎂' }),
        el('span', { text: '到「貓咪」分頁填上生日，就能倒數貓咪的生日喔！' })
      ]);
    }
    const box = el('section', { class: 'bday-list', 'aria-label': '貓咪生日' });
    list.forEach(function (b) {
      const isToday = b.days === 0;
      box.appendChild(el('div', { class: 'bday-strip' + (isToday ? ' is-today' : '') }, [
        avatarNode(b.cat, 'sm'),
        el('span', { class: 'bday-text' }, isToday
          ? [el('strong', { text: '🎉 今天是' + b.cat.name + '的 ' + b.age + ' 歲生日！' }), el('span', { class: 'hint', text: '生日快樂！今天的運勢籤和小貓都有驚喜喔' })]
          : [el('strong', { text: '距離' + b.cat.name + '生日還有 ' + b.days + ' 天' }), el('span', { class: 'hint', text: (b.next.getMonth() + 1) + '/' + b.next.getDate() + ' 就要滿 ' + b.age + ' 歲囉 🎂' })]),
        isToday
          ? el('button', { class: 'btn bday-btn', text: '🎉 慶祝', onclick: function () { Birthday.celebrate([b.cat.name]); } })
          : el('span', { class: 'bday-days' }, [el('strong', { text: String(b.days) }), el('small', { text: '天' })])
      ]));
    });
    return box;
  }

  /* ---------- 小日曆 ---------- */
  const cal = { month: null, selected: null, el: null };

  // 每天選的心情都存起來，日曆才看得到過去的心情
  function moodLog() { return readJson('mood-log') || {}; }
  function logMood(id) {
    const log = moodLog();
    if (id) log[today()] = id; else delete log[today()];
    writePref('mood-log', JSON.stringify(log));
    refreshCal();
  }
  (function migrateMood() {
    const m = todayMood();
    const log = moodLog();
    if (m && !log[today()]) { log[today()] = m; writePref('mood-log', JSON.stringify(log)); }
  })();

  function worriesByDate() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('cat-diary:worries')) || []; } catch (e) { /* 忽略 */ }
    const map = {};
    list.forEach(function (w) { (map[w.date] = map[w.date] || []).push(w); });
    return map;
  }
  function poppedByDate() {
    try { return JSON.parse(localStorage.getItem('cat-diary:worries-popped-log')) || {}; } catch (e) { return {}; }
  }
  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function moodInfo(id) { return MOODS.find(function (m) { return m.id === id; }); }

  function refreshCal() {
    if (cal.el && cal.el.isConnected) renderCal(cal.el);
  }

  function calendarCard() {
    cal.el = el('section', { class: 'cal-card', 'aria-label': '小日曆' });
    renderCal(cal.el);
    return cal.el;
  }

  function renderCal(card) {
    card.textContent = '';
    const now = new Date();
    if (!cal.month) cal.month = new Date(now.getFullYear(), now.getMonth(), 1);
    const y = cal.month.getFullYear(), mo = cal.month.getMonth();
    const todayKey = today();
    const moods = moodLog();
    const worries = worriesByDate();
    const popped = poppedByDate();
    const thanks = Gratitude.byDate();
    const entriesByDate = {};
    state.entries.forEach(function (e) {
      if (state.filter !== 'all' && e.catId !== state.filter) return;
      (entriesByDate[e.date] = entriesByDate[e.date] || []).push(e);
    });

    function go(delta) { cal.month = new Date(y, mo + delta, 1); renderCal(card); }
    const isThisMonth = y === now.getFullYear() && mo === now.getMonth();
    card.appendChild(el('div', { class: 'cal-head' }, [
      el('button', { class: 'cal-nav', 'aria-label': '上個月', onclick: function () { go(-1); } }, ['‹']),
      el('strong', { class: 'cal-title', text: '🗓 ' + y + ' 年 ' + (mo + 1) + ' 月' }),
      el('button', { class: 'cal-nav', 'aria-label': '下個月', onclick: function () { go(1); } }, ['›']),
      isThisMonth ? null : el('button', { class: 'btn-small cal-today', text: '回到今天', onclick: function () { cal.month = null; cal.selected = todayKey; renderCal(card); } })
    ]));

    const grid = el('div', { class: 'cal-grid' });
    '日一二三四五六'.split('').forEach(function (w) { grid.appendChild(el('span', { class: 'cal-wd', text: w })); });
    const first = new Date(y, mo, 1).getDay();
    for (let i = 0; i < first; i++) grid.appendChild(el('span'));
    const days = new Date(y, mo + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const key = y + '-' + pad(mo + 1) + '-' + pad(d);
      const ents = entriesByDate[key] || [];
      let photo = null;
      ents.some(function (e) { return (e.photoIds || []).some(function (id) { photo = state.photos.get(id); return !!photo; }); });
      const mood = moodInfo(moods[key]);
      const hasWorry = (worries[key] || []).length || popped[key];
      const hasStar = (thanks[key] || []).length;
      const cell = el('button', {
        class: 'cal-day' + (key === todayKey ? ' is-today' : '') + (key === cal.selected ? ' is-selected' : '') + (photo ? ' has-photo' : '') + (key > todayKey ? ' is-future' : ''),
        'aria-label': (mo + 1) + ' 月 ' + d + ' 日' + (ents.length ? '，' + ents.length + ' 篇日記' : '') + (mood ? '，心情' + mood.label : ''),
        onclick: function () { cal.selected = cal.selected === key ? null : key; renderCal(card); }
      }, [
        el('span', { class: 'cal-num', text: String(d) }),
        mood ? el('span', { class: 'cal-mood', text: mood.icon }) : null,
        !photo && ents.length ? el('span', { class: 'cal-dot' }) : null,
        hasWorry ? el('span', { class: 'cal-worry', text: '🫧' }) : null,
        hasStar ? el('span', { class: 'cal-star', text: '⭐' }) : null
      ]);
      if (photo) cell.style.backgroundImage = 'url(' + blobUrl('thumb:' + photo.id, photo.thumb) + ')';
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    card.appendChild(el('p', { class: 'cal-legend hint', text: '📷／• 日記　😊 心情　🫧 內耗球　⭐ 好事' }));

    if (cal.selected && cal.selected.slice(0, 7) === y + '-' + pad(mo + 1)) card.appendChild(dayDetail(cal.selected, entriesByDate[cal.selected] || [], moods, worries, popped));
  }

  function dayDetail(key, ents, moods, worries, popped) {
    const box = el('div', { class: 'cal-detail' }, [el('p', { class: 'cal-detail-title', text: formatDate(key) })]);
    const mood = moodInfo(moods[key]);
    box.appendChild(el('p', { class: 'cal-line', text: mood ? '心情：' + mood.icon + ' ' + mood.label : '心情：沒有記錄' }));

    if (ents.length) {
      box.appendChild(el('p', { class: 'cal-sub', text: '📔 日記（' + ents.length + '）' }));
      ents.slice().sort(function (a, b) { return (a.time || '') < (b.time || '') ? -1 : 1; }).forEach(function (e) {
        const cat = catById(e.catId);
        const p = (e.photoIds || []).map(function (id) { return state.photos.get(id); }).filter(Boolean)[0];
        const tags = (e.tags || []).map(function (t) { return TAG_MAP[t] ? TAG_MAP[t].icon : ''; }).join('');
        box.appendChild(el('button', { class: 'cal-entry', onclick: function () { openEntryDialog(e); } }, [
          p ? el('img', { src: blobUrl('thumb:' + p.id, p.thumb), alt: '' }) : el('span', { class: 'cal-entry-icon', text: '📝' }),
          el('span', { class: 'cal-entry-text' }, [
            el('strong', { text: (e.time ? e.time + ' ' : '') + (cat ? cat.name : '') + ' ' + tags }),
            el('span', { text: e.note || (e.weight ? '體重 ' + e.weight + ' kg' : '（沒有文字）') })
          ])
        ]));
      });
    }

    const ws = worries[key] || [];
    if (ws.length || popped[key]) {
      box.appendChild(el('p', { class: 'cal-sub', text: '🫧 內耗球' + (popped[key] ? '（這天放下了 ' + popped[key] + ' 件事 🌈）' : '') }));
      ws.forEach(function (w) {
        const m = (typeof WORRY_MOODS !== 'undefined' && WORRY_MOODS.find(function (x) { return x.id === w.mood; })) || null;
        box.appendChild(el('p', { class: 'cal-worry-item', text: (m ? m.icon + ' ' : '🫧 ') + w.text }));
      });
    }

    const ts = Gratitude.byDate()[key] || [];
    if (ts.length) {
      box.appendChild(el('p', { class: 'cal-sub', text: '⭐ 感恩罐（' + ts.length + '）' }));
      ts.forEach(function (t) { box.appendChild(el('p', { class: 'cal-worry-item', text: '⭐ ' + t.text })); });
    }

    if (!ents.length && !ws.length && !popped[key] && !mood && !ts.length) {
      box.appendChild(el('div', { class: 'cal-empty' }, [el('img', { src: 'images/deco-question.png', alt: '' }), el('p', { class: 'hint', text: '這天沒有紀錄耶？' })]));
    }
    if (key <= today() && state.cats.length) {
      box.appendChild(el('button', { class: 'btn btn-outline btn-block cal-add', text: '＋ 寫這天的日記', onclick: function () { openEntryDialog(null, key); } }));
    }
    return box;
  }

  function renderDiary() {
    const list = $('#diary-list');
    list.textContent = '';
    list.appendChild(quoteCard());
    const bday = birthdayCard();
    if (bday) list.appendChild(bday);
    list.appendChild(calendarCard());
    list.appendChild(catPicCard());
    if (!state.cats.length) {
      list.appendChild(emptyState('images/cat-cuddle.jpg', '歡迎使用貓咪日記', '先新增你的貓咪，再開始記錄每天的照片與生活。', '新增第一隻貓咪', function () { openCatDialog(); }));
      return;
    }
    const entries = sortedEntries();
    if (!entries.length) {
      list.appendChild(emptyState('images/cat-floor.jpg', '還沒有日記', '點右下角的「＋」記錄今天的貓咪吧！', '寫第一篇日記', function () { openEntryDialog(); }));
      return;
    }
    let lastDate = null;
    entries.forEach(function (e) {
      if (e.date !== lastDate) {
        lastDate = e.date;
        list.appendChild(el('h2', { class: 'date-head', text: e.date === today() ? '今天・' + formatDate(e.date) : formatDate(e.date) }));
      }
      list.appendChild(entryCard(e));
    });
    list.appendChild(listEnd('images/deco-sax.png', 'deco-sway', '今天也是可愛的一天 🎵'));
  }

  function entryCard(e) {
    const cat = catById(e.catId);
    const photos = (e.photoIds || []).map(function (id) { return state.photos.get(id); }).filter(Boolean);
    const shown = photos.slice(0, 4);
    const strip = shown.length ? el('div', { class: 'photo-strip count-' + shown.length },
      shown.map(function (p, i) {
        const more = i === 3 && photos.length > 4 ? el('span', { class: 'more', text: '+' + (photos.length - 4) }) : null;
        return el('button', {
          class: 'thumb',
          'aria-label': '看大圖',
          onclick: function (ev) { ev.stopPropagation(); openViewer(photos, i); }
        }, [el('img', { src: blobUrl('thumb:' + p.id, p.thumb), alt: '', loading: 'lazy' }), more]);
      })) : null;

    const tags = (e.tags || []).map(function (t) {
      const tag = TAG_MAP[t];
      return tag ? el('span', { class: 'tag', text: tag.icon + ' ' + tag.label }) : null;
    });
    if (e.weight) tags.push(el('span', { class: 'tag tag-weight', text: '⚖️ ' + e.weight + ' kg' }));

    return el('article', {
      class: 'entry-card',
      tabindex: '0',
      onclick: function () { openEntryDialog(e); },
      onkeydown: function (ev) { if (ev.key === 'Enter') openEntryDialog(e); }
    }, [
      el('div', { class: 'entry-head' }, [
        avatarNode(cat, 'sm'),
        el('span', { class: 'entry-cat', text: cat ? cat.name : '未知貓咪' }),
        e.time ? el('span', { class: 'entry-time', text: e.time }) : null
      ]),
      strip,
      tags.length ? el('div', { class: 'tags' }, tags) : null,
      e.note ? el('p', { class: 'entry-note', text: e.note }) : null
    ]);
  }

  function renderAlbum() {
    const grid = $('#album-grid');
    grid.textContent = '';
    const list = [];
    sortedEntries().forEach(function (e) {
      (e.photoIds || []).forEach(function (id) {
        const p = state.photos.get(id);
        if (p) list.push({ photo: p, entry: e });
      });
    });
    if (!list.length) {
      grid.appendChild(emptyState('images/cat-peek.jpg', '相簿是空的', '在日記裡加入照片，就會出現在這裡。', state.cats.length ? '新增照片日記' : null, function () { openEntryDialog(); }));
      return;
    }
    const photos = list.map(function (x) { return x.photo; });
    grid.appendChild(el('div', { class: 'album-banner' }, [
      el('img', { src: 'images/deco-laptop.png', alt: '' }),
      el('div', {}, [el('strong', { text: '我的貓咪相簿' }), el('span', { class: 'hint', text: '一共 ' + list.length + ' 張照片 📷' })])
    ]));
    let lastMonth = null;
    let section = null;
    list.forEach(function (x, i) {
      const month = x.entry.date.slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        const p = month.split('-');
        grid.appendChild(el('h2', { class: 'date-head', text: p[0] + ' 年 ' + Number(p[1]) + ' 月' }));
        section = el('div', { class: 'album-grid' });
        grid.appendChild(section);
      }
      section.appendChild(el('button', {
        class: 'thumb',
        'aria-label': '看大圖 ' + x.entry.date,
        onclick: function () { openViewer(photos, i); }
      }, [el('img', { src: blobUrl('thumb:' + x.photo.id, x.photo.thumb), alt: '', loading: 'lazy' })]));
    });
  }

  function renderCats() {
    const box = $('#cat-cards');
    box.textContent = '';
    if (!state.cats.length) {
      box.appendChild(el('p', { class: 'hint', text: '還沒有貓咪，點下方按鈕新增。' }));
    }
    state.cats.forEach(function (cat) {
      const count = state.entries.filter(function (e) { return e.catId === cat.id; }).length;
      const info = [cat.gender, cat.breed, ageText(cat.birthday)].filter(Boolean).join('・');
      box.appendChild(el('button', { class: 'cat-card', onclick: function () { openCatDialog(cat); } }, [
        avatarNode(cat, 'md'),
        el('span', { class: 'cat-info' }, [
          el('strong', { text: cat.name }),
          info ? el('span', { class: 'hint', text: info }) : null,
          el('span', { class: 'hint', text: count + ' 篇日記' })
        ]),
        el('span', { class: 'chev', 'aria-hidden': 'true', text: '›' })
      ]));
    });
    updateStorageInfo();
  }

  async function updateStorageInfo() {
    const info = $('#storage-info');
    if (!navigator.storage || !navigator.storage.estimate) { info.textContent = ''; return; }
    try {
      const est = await navigator.storage.estimate();
      const mb = function (n) { return (n / 1024 / 1024).toFixed(1) + ' MB'; };
      info.textContent = '目前使用 ' + mb(est.usage || 0) + (est.quota ? '，可用約 ' + mb(est.quota) : '') + '。';
    } catch (e) { info.textContent = ''; }
  }

  /* ---------- 切換分頁 ---------- */
  function setView(view) {
    state.view = view;
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + view; });
    document.querySelectorAll('.tab').forEach(function (t) {
      const on = t.dataset.view === view;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-current', on ? 'page' : 'false');
    });
    window.scrollTo(0, 0);
    render();
    if (view === 'play') setPlayMode(playMode); else { CatGame.pause(); Memory.pause(); Runner.pause(); Breathe.pause(); Pet.pause(); }
    if (view === 'jar') setJar(jarSub); else { Worry.pause(); Gratitude.pause(); }
  }

  /* ---------- 玩樂：塗色／小遊戲 ---------- */
  let playMode = readPref('play', 'color');
  if (playMode === 'worry') playMode = 'color'; // 心情罐已經搬到自己的頁面

  function setPlayMode(mode) {
    playMode = ['color', 'breathe', 'pet', 'fortune', 'game'].indexOf(mode) !== -1 ? mode : 'color';
    writePref('play', playMode);
    document.querySelectorAll('.seg-btn').forEach(function (b) {
      const on = b.dataset.mode === playMode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#play-color').hidden = playMode !== 'color';
    $('#play-game').hidden = playMode !== 'game';
    $('#play-fortune').hidden = playMode !== 'fortune';
    $('#play-breathe').hidden = playMode !== 'breathe';
    $('#play-pet').hidden = playMode !== 'pet';
    if (playMode !== 'game') { CatGame.pause(); Memory.pause(); Runner.pause(); }
    if (playMode !== 'breathe') Breathe.pause();
    if (playMode !== 'pet') Pet.pause();
    if (playMode === 'game') setGame(gameSub);
    else if (playMode === 'color') Coloring.show();
    else if (playMode === 'breathe') Breathe.show();
    else if (playMode === 'pet') Pet.show();
    else Fortune.show();
  }

  /* 遊戲：接魚乾／翻翻樂 */
  let gameSub = readPref('game', 'catch');
  function setGame(sub) {
    gameSub = ['memory', 'run'].indexOf(sub) !== -1 ? sub : 'catch';
    writePref('game', gameSub);
    document.querySelectorAll('.game-pick').forEach(function (b) { b.classList.toggle('is-active', b.dataset.game === gameSub); });
    $('#game-catch').hidden = gameSub !== 'catch';
    $('#game-memory').hidden = gameSub !== 'memory';
    $('#game-run').hidden = gameSub !== 'run';
    if (gameSub !== 'run') Runner.pause();
    if (gameSub === 'catch') { Memory.pause(); CatGame.show(); }
    else if (gameSub === 'run') { Memory.pause(); CatGame.pause(); Runner.show(); }
    else {
      CatGame.pause();
      // 翻翻樂優先用日記裡的照片
      Memory.show(function () {
        return Array.from(state.photos.values()).map(function (p) { return blobUrl('thumb:' + p.id, p.thumb); });
      });
    }
  }
  document.querySelectorAll('.game-pick').forEach(function (b) {
    b.addEventListener('click', function () { setGame(b.dataset.game); });
  });

  // 其他地方要切換到某個玩樂項目（例如聊天室結束後去呼吸）
  document.addEventListener('play:go', function (e) {
    if (e.detail === 'thanks' || e.detail === 'worry') { jarSub = e.detail; setView('jar'); return; }
    playMode = e.detail;
    setView('play');
  });

  /* 心情罐：內耗球／感恩罐 */
  let jarSub = readPref('jar', 'worry');
  function setJar(sub) {
    jarSub = sub === 'thanks' ? 'thanks' : 'worry';
    writePref('jar', jarSub);
    document.querySelectorAll('.jar-pick').forEach(function (b) { b.classList.toggle('is-active', b.dataset.jar === jarSub); });
    $('#jar-worry').hidden = jarSub !== 'worry';
    $('#jar-thanks').hidden = jarSub !== 'thanks';
    if (jarSub === 'worry') { Gratitude.pause(); Worry.show(); } else { Worry.pause(); Gratitude.show(); }
  }
  document.querySelectorAll('.jar-pick').forEach(function (b) {
    b.addEventListener('click', function () { setJar(b.dataset.jar); });
  });

  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () { setPlayMode(b.dataset.mode); });
  });

  /* ---------- 背景音樂 ---------- */
  (function () {
    const btn = $('#music-btn');
    const panel = $('#music-panel');
    const list = $('#music-tracks');
    Music.tracks.forEach(function (t) {
      list.appendChild(el('button', {
        class: 'music-track',
        'data-id': t.id,
        onclick: function () { Music.select(t.id); }
      }, [el('span', { class: 'music-icon', text: t.icon }), t.name]));
    });
    $('#music-toggle').addEventListener('click', function () { Music.toggle(); });
    $('#music-volume').addEventListener('input', function (e) { Music.setVolume(Number(e.target.value)); });
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    });
    // 點面板外面就收起來
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target)) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    Music.onChange(function (st) {
      if (st.playing) Stickers.award('sax');
      btn.classList.toggle('is-playing', st.playing);
      $('#music-toggle').textContent = st.playing ? '⏸ 暫停' : '▶ 播放';
      $('#music-volume').value = st.volume;
      list.querySelectorAll('.music-track').forEach(function (b) {
        const on = b.dataset.id === st.track.id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  })();

  /* 塗色作品存到日記 */
  document.addEventListener('coloring:to-diary', async function (ev) {
    if (!state.cats.length) { toast('請先到「貓咪」分頁新增貓咪'); return; }
    try {
      const r = await processImage(ev.detail.blob);
      const entryId = uid();
      const photoId = uid();
      const catId = state.filter !== 'all' ? state.filter : state.cats[0].id;
      await DB.write([
        { store: 'entries', put: { id: entryId, catId: catId, date: today(), time: nowTime(), tags: ['other'], weight: null, note: '🎨 塗色作品「' + ev.detail.name + '」', photoIds: [photoId], createdAt: Date.now(), updatedAt: Date.now() } },
        { store: 'photos', put: { id: photoId, entryId: entryId, catId: catId, blob: r.blob, thumb: r.thumb, createdAt: Date.now() } }
      ]);
      await loadAll();
      toast('已存到日記 📔');
      checkDiaryStickers();
    } catch (e) {
      toast('存到日記失敗，請再試一次');
    }
  });

  /* ---------- 日記表單 ---------- */
  const entryForm = { editing: null, photos: [], removed: [] };

  function openEntryDialog(entry, presetDate) {
    if (!state.cats.length) { openCatDialog(); return; }
    entryForm.editing = entry || null;
    entryForm.removed = [];
    entryForm.photos = entry ? (entry.photoIds || []).map(function (id) {
      const p = state.photos.get(id);
      return p ? { id: id, existing: true, url: blobUrl('thumb:' + id, p.thumb) } : null;
    }).filter(Boolean) : [];

    $('#entry-title').textContent = entry ? '編輯日記' : '新增日記';
    const sel = $('#entry-cat');
    sel.textContent = '';
    state.cats.forEach(function (c) { sel.appendChild(el('option', { value: c.id, text: c.name })); });
    sel.value = entry ? entry.catId : (state.filter !== 'all' ? state.filter : state.cats[0].id);
    $('#entry-date').value = entry ? entry.date : (presetDate || today());
    $('#entry-time').value = entry ? (entry.time || '') : nowTime();
    $('#entry-weight').value = entry && entry.weight ? entry.weight : '';
    $('#entry-note').value = entry ? entry.note || '' : '';

    const tagBox = $('#entry-tags');
    tagBox.textContent = '';
    const selected = new Set(entry ? entry.tags || [] : []);
    TAGS.forEach(function (t) {
      tagBox.appendChild(el('label', { class: 'chip' }, [
        el('input', { type: 'checkbox', value: t.id, checked: selected.has(t.id) }),
        el('span', { text: t.icon + ' ' + t.label })
      ]));
    });

    $('#entry-delete').hidden = !entry;
    renderPickedPhotos();
    $('#entry-dialog').showModal();
  }

  function renderPickedPhotos() {
    const box = $('#entry-photos');
    box.querySelectorAll('.picked').forEach(function (n) { n.remove(); });
    const addBtn = box.querySelector('.photo-add');
    entryForm.photos.forEach(function (p, i) {
      box.insertBefore(el('div', { class: 'picked' }, [
        el('img', { src: p.url, alt: '' }),
        el('button', {
          type: 'button',
          class: 'remove',
          'aria-label': '移除照片',
          onclick: function () {
            if (p.existing) entryForm.removed.push(p.id); else URL.revokeObjectURL(p.url);
            entryForm.photos.splice(i, 1);
            renderPickedPhotos();
          }
        }, ['✕'])
      ]), addBtn);
    });
  }

  $('#entry-photo-input').addEventListener('change', async function (ev) {
    const files = Array.from(ev.target.files || []);
    ev.target.value = '';
    if (!files.length) return;
    toast('處理照片中…');
    for (const f of files) {
      try {
        const r = await processImage(f);
        entryForm.photos.push({ id: uid(), existing: false, blob: r.blob, thumb: r.thumb, url: URL.createObjectURL(r.thumb) });
        renderPickedPhotos();
      } catch (e) {
        toast('有一張照片無法讀取');
      }
    }
  });

  $('#entry-form').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const tags = Array.from(document.querySelectorAll('#entry-tags input:checked')).map(function (i) { return i.value; });
    const weightRaw = parseFloat($('#entry-weight').value);
    const note = $('#entry-note').value.trim();
    if (!note && !entryForm.photos.length && !tags.length && !weightRaw) {
      toast('請至少寫點記事、加張照片或選個類別');
      return;
    }
    const old = entryForm.editing;
    const entry = {
      id: old ? old.id : uid(),
      catId: $('#entry-cat').value,
      date: $('#entry-date').value || today(),
      time: $('#entry-time').value,
      tags: tags,
      weight: weightRaw > 0 ? Math.round(weightRaw * 100) / 100 : null,
      note: note,
      photoIds: entryForm.photos.map(function (p) { return p.id; }),
      createdAt: old ? old.createdAt : Date.now(),
      updatedAt: Date.now()
    };
    const ops = [{ store: 'entries', put: entry }];
    entryForm.photos.forEach(function (p) {
      if (!p.existing) {
        ops.push({ store: 'photos', put: { id: p.id, entryId: entry.id, catId: entry.catId, blob: p.blob, thumb: p.thumb, createdAt: Date.now() } });
      } else if (old && old.catId !== entry.catId) {
        const rec = state.photos.get(p.id);
        if (rec) ops.push({ store: 'photos', put: Object.assign({}, rec, { catId: entry.catId }) });
      }
    });
    entryForm.removed.forEach(function (id) { ops.push({ store: 'photos', del: id }); });
    try {
      await DB.write(ops);
    } catch (e) {
      toast('儲存失敗：' + (e && e.name === 'QuotaExceededError' ? '裝置空間不足' : '請再試一次'));
      return;
    }
    entryForm.photos.forEach(function (p) { if (!p.existing) URL.revokeObjectURL(p.url); });
    entryForm.removed.forEach(function (id) { dropUrl('thumb:' + id); dropUrl('full:' + id); });
    $('#entry-dialog').close();
    await loadAll();
    render();
    toast(old ? '已更新日記' : '已新增日記');
    checkDiaryStickers();
    // 養成小貓：新日記、新照片都有經驗值
    if (!old) Kitty.gain('diary');
    const newPhotos = ops.filter(function (o) {
      return o.store === 'photos' && o.put && !(old && (old.photoIds || []).indexOf(o.put.id) !== -1);
    }).length;
    if (newPhotos) Kitty.gain('photo', newPhotos);
  });

  $('#entry-delete').addEventListener('click', async function () {
    const e = entryForm.editing;
    if (!e || !confirm('確定要刪除這篇日記和裡面的照片嗎？')) return;
    const ops = [{ store: 'entries', del: e.id }];
    (e.photoIds || []).forEach(function (id) { ops.push({ store: 'photos', del: id }); dropUrl('thumb:' + id); dropUrl('full:' + id); });
    await DB.write(ops);
    $('#entry-dialog').close();
    await loadAll();
    render();
    toast('已刪除');
  });

  $('#entry-dialog').addEventListener('close', function () {
    entryForm.photos.forEach(function (p) { if (!p.existing) URL.revokeObjectURL(p.url); });
    entryForm.photos = [];
  });

  /* ---------- 貓咪表單 ---------- */
  const catForm = { editing: null, avatar: undefined, previewUrl: null };

  function setAvatarPreview(url) {
    const box = $('#cat-avatar-preview');
    const input = $('#cat-avatar-input');
    box.textContent = '';
    box.appendChild(url ? el('img', { src: url, alt: '' }) : el('span', { text: '🐱' }));
    box.appendChild(input);
  }

  function openCatDialog(cat) {
    catForm.editing = cat || null;
    catForm.avatar = undefined;
    $('#cat-title').textContent = cat ? '編輯貓咪' : '新增貓咪';
    $('#cat-name').value = cat ? cat.name : '';
    $('#cat-birthday').value = cat ? cat.birthday || '' : '';
    $('#cat-gender').value = cat ? cat.gender || '' : '';
    $('#cat-breed').value = cat ? cat.breed || '' : '';
    $('#cat-delete').hidden = !cat;
    setAvatarPreview(cat && cat.avatar ? blobUrl('avatar:' + cat.id + ':' + cat.updatedAt, cat.avatar) : null);
    $('#cat-dialog').showModal();
  }

  $('#cat-avatar-input').addEventListener('change', async function (ev) {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      const img = await loadImage(f);
      // 裁成正方形大頭照
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 400;
      canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 400, 400);
      const blob = await new Promise(function (r) { canvas.toBlob(r, 'image/jpeg', 0.85); });
      catForm.avatar = blob;
      if (catForm.previewUrl) URL.revokeObjectURL(catForm.previewUrl);
      catForm.previewUrl = URL.createObjectURL(blob);
      setAvatarPreview(catForm.previewUrl);
    } catch (e) {
      toast('無法讀取這張照片');
    }
  });

  $('#cat-form').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const name = $('#cat-name').value.trim();
    if (!name) { toast('請填寫名字'); return; }
    const old = catForm.editing;
    const cat = {
      id: old ? old.id : uid(),
      name: name,
      birthday: $('#cat-birthday').value,
      gender: $('#cat-gender').value,
      breed: $('#cat-breed').value.trim(),
      avatar: catForm.avatar !== undefined ? catForm.avatar : (old ? old.avatar : null),
      createdAt: old ? old.createdAt : Date.now(),
      updatedAt: Date.now()
    };
    await DB.write([{ store: 'cats', put: cat }]);
    $('#cat-dialog').close();
    await loadAll();
    render();
    toast(old ? '已更新 ' + name : '歡迎 ' + name + '！');
  });

  $('#cat-delete').addEventListener('click', async function () {
    const cat = catForm.editing;
    if (!cat) return;
    const entries = state.entries.filter(function (e) { return e.catId === cat.id; });
    if (!confirm('確定要刪除「' + cat.name + '」嗎？\n牠的 ' + entries.length + ' 篇日記和照片也會一起刪除，無法復原。')) return;
    const ops = [{ store: 'cats', del: cat.id }];
    entries.forEach(function (e) {
      ops.push({ store: 'entries', del: e.id });
      (e.photoIds || []).forEach(function (id) { ops.push({ store: 'photos', del: id }); });
    });
    await DB.write(ops);
    $('#cat-dialog').close();
    await loadAll();
    render();
    toast('已刪除');
  });

  $('#cat-dialog').addEventListener('close', function () {
    if (catForm.previewUrl) { URL.revokeObjectURL(catForm.previewUrl); catForm.previewUrl = null; }
  });

  /* ---------- 看大圖 ---------- */
  const viewer = { list: [], index: 0 };

  function openViewer(list, index) {
    viewer.list = list;
    viewer.index = index;
    showViewerPhoto();
    $('#viewer').showModal();
  }

  function showViewerPhoto() {
    const p = viewer.list[viewer.index];
    if (!p) return;
    $('#viewer-img').src = blobUrl('full:' + p.id, p.blob);
    const entry = state.entries.find(function (e) { return e.id === p.entryId; });
    const cat = entry && catById(entry.catId);
    $('#viewer-caption').textContent = [cat ? cat.name : '', entry ? formatDate(entry.date) : '', (viewer.index + 1) + ' / ' + viewer.list.length].filter(Boolean).join('　');
    document.querySelector('.viewer .prev').hidden = viewer.index === 0;
    document.querySelector('.viewer .next').hidden = viewer.index >= viewer.list.length - 1;
  }

  function moveViewer(step) {
    const next = viewer.index + step;
    if (next < 0 || next >= viewer.list.length) return;
    viewer.index = next;
    showViewerPhoto();
  }

  document.querySelector('.viewer .prev').addEventListener('click', function () { moveViewer(-1); });
  document.querySelector('.viewer .next').addEventListener('click', function () { moveViewer(1); });
  $('#viewer').addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') moveViewer(-1);
    if (ev.key === 'ArrowRight') moveViewer(1);
  });
  (function () {
    let startX = null;
    const v = $('#viewer');
    v.addEventListener('touchstart', function (ev) { startX = ev.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchend', function (ev) {
      if (startX == null) return;
      const dx = ev.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) moveViewer(dx < 0 ? 1 : -1);
    });
  })();

  /* 所有對話框的「取消／關閉」按鈕，以及點背景關閉看大圖 */
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('dialog').close(); });
  });
  $('#viewer').addEventListener('click', function (ev) {
    if (ev.target.id === 'viewer' || ev.target.id === 'viewer-img') $('#viewer').close();
  });

  /* ---------- 備份 ---------- */
  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      if (!blob) { resolve(null); return; }
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }
  async function dataUrlToBlob(url) {
    if (!url) return null;
    const res = await fetch(url);
    return res.blob();
  }

  $('#export-btn').addEventListener('click', async function () {
    toast('準備備份檔…');
    const cats = await Promise.all(state.cats.map(async function (c) {
      return Object.assign({}, c, { avatar: await blobToDataUrl(c.avatar) });
    }));
    const photos = await Promise.all(Array.from(state.photos.values()).map(async function (p) {
      return Object.assign({}, p, { blob: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) });
    }));
    const data = { app: 'cat-diary', version: 1, exportedAt: new Date().toISOString(), cats: cats, entries: state.entries, photos: photos };
    const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(file), download: '貓咪日記備份-' + today() + '.json' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('已匯出備份');
    Stickers.award('suit');
  });

  $('#import-input').addEventListener('change', async function (ev) {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    let data;
    try {
      data = JSON.parse(await f.text());
      if (data.app !== 'cat-diary') throw new Error('format');
    } catch (e) {
      toast('這不是貓咪日記的備份檔');
      return;
    }
    if (!confirm('要匯入 ' + (data.cats || []).length + ' 隻貓咪、' + (data.entries || []).length + ' 篇日記嗎？\n相同的資料會被備份檔覆蓋，其他資料會保留。')) return;
    toast('匯入中…');
    try {
      const ops = [];
      for (const c of data.cats || []) ops.push({ store: 'cats', put: Object.assign({}, c, { avatar: await dataUrlToBlob(c.avatar) }) });
      for (const e of data.entries || []) ops.push({ store: 'entries', put: e });
      for (const p of data.photos || []) ops.push({ store: 'photos', put: Object.assign({}, p, { blob: await dataUrlToBlob(p.blob), thumb: await dataUrlToBlob(p.thumb) }) });
      await DB.write(ops);
    } catch (e) {
      toast('匯入失敗，備份檔可能已損壞');
      return;
    }
    await loadAll();
    render();
    toast('匯入完成');
    checkDiaryStickers();
  });

  /* ---------- 其他 ---------- */
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { setView(t.dataset.view); });
  });
  $('#fab').addEventListener('click', function () { openEntryDialog(); });
  $('#add-cat-btn').addEventListener('click', function () { openCatDialog(); });

  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    deferredInstall = ev;
    $('#install-btn').hidden = false;
  });
  $('#install-btn').addEventListener('click', async function () {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    $('#install-btn').hidden = true;
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // 已經有舊版在控制頁面時，新版接手後自動重新載入一次
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
        // iPhone 主畫面 App 切回前景時不會重新開啟，所以回來時主動檢查更新
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });
      }).catch(function () {});
    });
  }
  // 請瀏覽器不要自動清掉資料（照片很重要）
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  /* ---------- 貓咪圖鑑 ---------- */
  function checkDiaryStickers() {
    const entries = state.entries;
    if (entries.length >= 1) Stickers.award('skate');
    if (entries.some(function (e) { return e.weight; })) Stickers.award('fish');
    if (state.photos.size >= 10) Stickers.award('photo');
    if (entries.length >= 7) Stickers.award('diary');
  }

  Stickers.init();
  Kitty.init();
  // 小貓得到經驗時，稍等一下再提示，避免蓋掉其他訊息
  const kittyToasts = [];
  let kittyToastBusy = false;
  function nextKittyToast() {
    if (kittyToastBusy || !kittyToasts.length) return;
    kittyToastBusy = true;
    toast(kittyToasts.shift());
    setTimeout(function () { kittyToastBusy = false; nextKittyToast(); }, 1800);
  }
  document.addEventListener('kitty:gain', function (e) {
    kittyToasts.push(e.detail.text);
    setTimeout(nextKittyToast, 1300);
  });
  document.addEventListener('stickers:open', function () {
    setView('cats');
    const sec = document.getElementById('sticker-section');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.addEventListener('stickers:go-crown', function () {
    Coloring.refresh('crown');
    playMode = 'color';
    setView('play');
  });

  loadAll().then(function () { render(); checkDiaryStickers(); Birthday.autoCelebrate(); }).catch(function () {
    $('#diary-list').appendChild(emptyState('⚠️', '無法開啟資料庫', '可能是無痕模式或瀏覽器不支援，請改用一般模式開啟。'));
  });
})();
