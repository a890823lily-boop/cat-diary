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
    if (state.view === 'weight') renderWeight();
    if (state.view === 'cats') renderCats();
    $('#fab').hidden = state.view === 'cats';
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

  function renderDiary() {
    const list = $('#diary-list');
    list.textContent = '';
    if (!state.cats.length) {
      list.appendChild(emptyState('images/cat-window.jpg', '歡迎使用貓咪日記', '先新增你的貓咪，再開始記錄每天的照片與生活。', '新增第一隻貓咪', function () { openCatDialog(); }));
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
      grid.appendChild(emptyState('images/cat-window.jpg', '相簿是空的', '在日記裡加入照片，就會出現在這裡。', state.cats.length ? '新增照片日記' : null, function () { openEntryDialog(); }));
      return;
    }
    const photos = list.map(function (x) { return x.photo; });
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

  function renderWeight() {
    const box = $('#weight-charts');
    box.textContent = '';
    const cats = state.filter === 'all' ? state.cats : state.cats.filter(function (c) { return c.id === state.filter; });
    if (!cats.length) {
      box.appendChild(emptyState('images/deco-fish.png', '還沒有貓咪', '先新增貓咪，才能記錄體重。', '新增貓咪', function () { openCatDialog(); }));
      return;
    }
    cats.forEach(function (cat) {
      const points = state.entries
        .filter(function (e) { return e.catId === cat.id && e.weight; })
        .sort(function (a, b) { return (a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1; });
      const card = el('section', { class: 'weight-card' }, [
        el('div', { class: 'entry-head' }, [avatarNode(cat, 'sm'), el('span', { class: 'entry-cat', text: cat.name })])
      ]);
      if (!points.length) {
        card.appendChild(el('p', { class: 'hint', text: '還沒有體重紀錄。新增日記時填入體重，就會畫出曲線。' }));
      } else {
        const last = points[points.length - 1];
        const stats = [el('div', { class: 'stat' }, [el('span', { class: 'stat-num', text: last.weight + ' kg' }), el('span', { class: 'hint', text: '最新（' + shortDate(last.date) + '）' })])];
        if (points.length > 1) {
          const prev = points[points.length - 2];
          const diff = Math.round((last.weight - prev.weight) * 100) / 100;
          stats.push(el('div', { class: 'stat' }, [
            el('span', { class: 'stat-num ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : ''), text: (diff > 0 ? '+' : '') + diff + ' kg' }),
            el('span', { class: 'hint', text: '比上次' })
          ]));
        }
        card.appendChild(el('div', { class: 'stats' }, stats));
        if (points.length > 1) card.appendChild(weightChart(points));
        const recent = points.slice(-5).reverse();
        card.appendChild(el('ul', { class: 'weight-list' }, recent.map(function (p) {
          return el('li', {}, [el('span', { text: formatDate(p.date) }), el('strong', { text: p.weight + ' kg' })]);
        })));
      }
      box.appendChild(card);
    });
    box.appendChild(listEnd('images/deco-fish.png', 'deco-float', '健康長大，記得定期量體重喔'));
  }

  function weightChart(points) {
    const NS = 'http://www.w3.org/2000/svg';
    const W = 320, H = 160, L = 40, R = 12, T = 14, B = 26;
    const ws = points.map(function (p) { return p.weight; });
    let min = Math.min.apply(null, ws), max = Math.max.apply(null, ws);
    const padding = Math.max(0.1, (max - min) * 0.15);
    min -= padding; max += padding;
    const x = function (i) { return L + (W - L - R) * (points.length === 1 ? 0.5 : i / (points.length - 1)); };
    const y = function (w) { return T + (H - T - B) * (1 - (w - min) / (max - min)); };

    function s(tag, attrs, text) {
      const n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (text != null) n.textContent = text;
      return n;
    }
    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': '體重變化曲線' });
    [max - padding, (max + min) / 2, min + padding].forEach(function (v) {
      svg.appendChild(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }));
      svg.appendChild(s('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, v.toFixed(2)));
    });
    const d = points.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.weight).toFixed(1); }).join(' ');
    svg.appendChild(s('path', { d: d, class: 'line' }));
    points.forEach(function (p, i) {
      const c = s('circle', { cx: x(i), cy: y(p.weight), r: 3.5, class: 'dot' });
      c.appendChild(s('title', {}, p.date + '：' + p.weight + ' kg'));
      svg.appendChild(c);
    });
    svg.appendChild(s('text', { x: L, y: H - 6, class: 'axis' }, shortDate(points[0].date)));
    svg.appendChild(s('text', { x: W - R, y: H - 6, 'text-anchor': 'end', class: 'axis' }, shortDate(points[points.length - 1].date)));
    return svg;
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
  }

  /* ---------- 日記表單 ---------- */
  const entryForm = { editing: null, photos: [], removed: [] };

  function openEntryDialog(entry) {
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
    $('#entry-date').value = entry ? entry.date : today();
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

  loadAll().then(render).catch(function () {
    $('#diary-list').appendChild(emptyState('⚠️', '無法開啟資料庫', '可能是無痕模式或瀏覽器不支援，請改用一般模式開啟。'));
  });
})();
