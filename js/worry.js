/* 內耗球：把煩惱打出來變成一顆顆的球；可以跟貓咪聊聊，或戳破放下 */
const Worry = (function () {
  'use strict';

  const KEY = 'cat-diary:worries';
  const POP_KEY = 'cat-diary:worries-popped';
  const SIZES = { s: 40, m: 52, l: 66 };

  let jar, input, countEl, sheet;
  let balls = [];
  let W = 0, H = 0;
  let frame = null, lastT = 0, active = false;
  let drag = null;
  let current = null; // 正在看的那顆球

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
  }
  function save() {
    write(KEY, balls.map(function (b) { return { id: b.id, text: b.text, size: b.size, mood: b.mood, date: b.date }; }));
  }

  /* ---------- 心情偵測 ---------- */
  function moodById(id) {
    return WORRY_MOODS.find(function (m) { return m.id === id; }) || WORRY_MOOD_NONE;
  }

  // 依關鍵字計分：越長的詞越可信；同分時，比較早出現的優先
  function detectMood(text) {
    let best = WORRY_MOOD_NONE, bestScore = 0, bestPos = Infinity;
    WORRY_MOODS.forEach(function (m) {
      let score = 0, pos = Infinity;
      m.words.forEach(function (w) {
        let i = text.indexOf(w);
        while (i !== -1) {
          score += w.length >= 2 ? 1 : 0.6;
          pos = Math.min(pos, i);
          i = text.indexOf(w, i + w.length);
        }
      });
      if (score > bestScore || (score === bestScore && score > 0 && pos < bestPos)) {
        best = m; bestScore = score; bestPos = pos;
      }
    });
    return best;
  }

  function moodChips(box, selected, detected, onPick) {
    box.textContent = '';
    WORRY_MOODS.concat([WORRY_MOOD_NONE]).forEach(function (m) {
      const b = el('button', 'mood-chip' + (m.id === selected ? ' is-active' : ''), m.icon + ' ' + m.label);
      b.type = 'button';
      b.style.setProperty('--mood', m.color);
      b.setAttribute('aria-pressed', m.id === selected ? 'true' : 'false');
      if (detected && m.id === detected) b.appendChild(el('small', 'mood-auto', '偵測'));
      b.addEventListener('click', function () { onPick(m.id); });
      box.appendChild(b);
    });
  }

  function applyMood(b) {
    const m = moodById(b.mood);
    b.el.style.background = m.color;
    b.el.querySelector('.worry-mood').textContent = m.icon;
    b.el.setAttribute('aria-label', m.label + '的煩惱：' + b.text);
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function scale() { return Math.max(0.75, Math.min(1.15, W / 360)); }

  function makeBall(data, x, y) {
    const r = SIZES[data.size] * scale();
    const node = el('button', 'worry-ball');
    node.style.width = node.style.height = (r * 2) + 'px';
    node.style.fontSize = Math.max(11, r * 0.27) + 'px';
    // 內距依球的大小計算（上面留位置給心情表情）
    node.style.padding = (r * 0.42) + 'px ' + (r * 0.2) + 'px ' + (r * 0.18) + 'px';
    node.appendChild(el('i', 'worry-mood'));
    node.appendChild(el('span', null, data.text));
    jar.appendChild(node);
    // 舊資料沒有心情，就自動偵測
    if (!data.mood) data.mood = detectMood(data.text).id;
    const b = Object.assign({}, data, { r: r, x: x, y: y, vx: (Math.random() - 0.5) * 60, vy: 0, el: node });
    applyMood(b);
    node.addEventListener('pointerdown', function (e) { startDrag(e, b); });
    return b;
  }

  function measure() {
    W = jar.clientWidth;
    H = jar.clientHeight;
  }

  function updateCount() {
    const popped = read(POP_KEY, 0);
    // 罐子裡最多的心情
    const tally = {};
    balls.forEach(function (b) { if (b.mood !== 'unknown') tally[b.mood] = (tally[b.mood] || 0) + 1; });
    let top = null;
    Object.keys(tally).forEach(function (k) { if (!top || tally[k] > tally[top]) top = k; });
    const topText = top && balls.length > 1 ? '・最多的是 ' + moodById(top).icon + ' ' + moodById(top).label + '（' + tally[top] + ' 顆）' : '';
    countEl.textContent = balls.length
      ? '罐子裡有 ' + balls.length + ' 顆球' + topText + (popped ? '・已經放下 ' + popped + ' 件事 🌈' : '')
      : (popped ? '罐子空空的，已經放下 ' + popped + ' 件事 🌈' : '罐子空空的，心裡也輕輕的。');
    jar.classList.toggle('is-empty', !balls.length);
  }

  /* ---------- 物理：重力、牆壁、球和球碰撞 ---------- */
  function step(dt) {
    const g = 1300;
    balls.forEach(function (b) {
      if (b === (drag && drag.ball)) return;
      b.vy += g * dt;
      b.vx *= 0.995;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * 0.4; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx * 0.4; }
      if (b.y > H - b.r) { b.y = H - b.r; b.vy = -b.vy * 0.3; b.vx *= 0.9; }
    });
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], c = balls[j];
          const dx = c.x - a.x, dy = c.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const min = a.r + c.r;
          if (dist >= min) continue;
          const nx = dx / dist, ny = dy / dist;
          const overlap = min - dist;
          const ma = a.r * a.r, mc = c.r * c.r;
          const aFixed = drag && drag.ball === a, cFixed = drag && drag.ball === c;
          const ta = aFixed ? 0 : cFixed ? 1 : mc / (ma + mc);
          const tc = cFixed ? 0 : aFixed ? 1 : ma / (ma + mc);
          a.x -= nx * overlap * ta; a.y -= ny * overlap * ta;
          c.x += nx * overlap * tc; c.y += ny * overlap * tc;
          const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rel < 0) {
            const imp = -(1.3) * rel / (1 / ma + 1 / mc);
            if (!aFixed) { a.vx -= imp / ma * nx; a.vy -= imp / ma * ny; }
            if (!cFixed) { c.vx += imp / mc * nx; c.vy += imp / mc * ny; }
          }
        }
      }
      balls.forEach(function (b) {
        b.x = Math.max(b.r, Math.min(W - b.r, b.x));
        b.y = Math.min(H - b.r, b.y);
      });
    }
  }

  function paint() {
    balls.forEach(function (b) {
      b.el.style.transform = 'translate(' + (b.x - b.r) + 'px,' + (b.y - b.r) + 'px)';
    });
  }

  function loop(t) {
    if (!active) return;
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;
    // 分成小步，讓堆疊比較穩
    for (let i = 0; i < 3; i++) step(dt / 3);
    paint();
    frame = requestAnimationFrame(loop);
  }

  /* ---------- 拖曳與點擊 ---------- */
  function startDrag(e, b) {
    e.preventDefault();
    const rect = jar.getBoundingClientRect();
    drag = { ball: b, id: e.pointerId, sx: e.clientX, sy: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false, ox: e.clientX - rect.left - b.x, oy: e.clientY - rect.top - b.y };
    b.el.setPointerCapture && b.el.setPointerCapture(e.pointerId);
    b.el.classList.add('is-grabbed');
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const b = drag.ball;
    const rect = jar.getBoundingClientRect();
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 8) drag.moved = true;
    const now = performance.now();
    const dt = Math.max(0.008, (now - drag.lt) / 1000);
    b.vx = (e.clientX - drag.lx) / dt;
    b.vy = (e.clientY - drag.ly) / dt;
    drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
    b.x = Math.max(b.r, Math.min(W - b.r, e.clientX - rect.left - drag.ox));
    b.y = Math.max(b.r, Math.min(H - b.r, e.clientY - rect.top - drag.oy));
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const b = drag.ball;
    b.el.classList.remove('is-grabbed');
    const tap = !drag.moved && performance.now() - drag.t < 400;
    // 甩出去的速度不要太誇張
    b.vx = Math.max(-1600, Math.min(1600, b.vx));
    b.vy = Math.max(-1600, Math.min(1600, b.vy));
    drag = null;
    if (tap) { b.vx = 0; b.vy = 0; openSheet(b); }
  }

  /* ---------- 新增、戳破 ---------- */
  function add(text, size, mood) {
    text = text.trim().slice(0, 120);
    if (!text) return;
    const data = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text,
      size: size,
      mood: mood || detectMood(text).id,
      date: new Date().toISOString().slice(0, 10)
    };
    measure();
    const r = SIZES[size] * scale();
    const b = makeBall(data, r + Math.random() * Math.max(1, W - 2 * r), -r);
    b.el.classList.add('is-new');
    balls.push(b);
    save();
    updateCount();
    Kitty.gain('worryAdd');
  }

  function pop(b) {
    balls = balls.filter(function (x) { return x !== b; });
    save();
    write(POP_KEY, read(POP_KEY, 0) + 1);
    Kitty.gain('worryPop');
    // 依日期記錄戳破了幾顆，小日曆會顯示
    const log = read(POP_KEY + '-log', {});
    const d = new Date();
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    log[key] = (log[key] || 0) + 1;
    write(POP_KEY + '-log', log);
    // 爆開的小泡泡
    for (let i = 0; i < 10; i++) {
      const p = el('span', 'worry-bit');
      const a = Math.PI * 2 * i / 10;
      p.style.left = b.x + 'px';
      p.style.top = b.y + 'px';
      p.style.background = moodById(b.mood).color;
      p.style.setProperty('--dx', Math.cos(a) * (b.r + 30) + 'px');
      p.style.setProperty('--dy', Math.sin(a) * (b.r + 30) + 'px');
      jar.appendChild(p);
      setTimeout(function () { p.remove(); }, 700);
    }
    b.el.classList.add('is-popping');
    setTimeout(function () { b.el.remove(); }, 350);
    if (navigator.vibrate) navigator.vibrate(30);
    updateCount();
  }

  /* ---------- 點球後的選單 ---------- */
  function openSheet(b) {
    current = b;
    document.getElementById('worry-sheet-text').textContent = b.text;
    document.getElementById('worry-sheet-date').textContent = '放進罐子：' + b.date.replace(/-/g, '/');
    renderSheetMood();
    sheet.showModal();
  }

  function renderSheetMood() {
    const b = current;
    moodChips(document.getElementById('worry-sheet-moods'), b.mood, null, function (id) {
      b.mood = id;
      applyMood(b);
      save();
      updateCount();
      renderSheetMood();
    });
  }

  /* 表單：邊打字邊偵測心情，也可以自己改 */
  let override = null;
  function renderFormMood() {
    const detected = detectMood(input.value);
    const selected = override || (input.value.trim() ? detected.id : null);
    moodChips(document.getElementById('worry-moods'), selected, input.value.trim() ? detected.id : null, function (id) {
      override = override === id ? null : id;
      renderFormMood();
    });
  }

  function init() {
    if (jar) { start(); return; }
    jar = document.getElementById('worry-jar');
    input = document.getElementById('worry-input');
    countEl = document.getElementById('worry-count');
    sheet = document.getElementById('worry-sheet');

    document.getElementById('worry-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const size = (document.querySelector('input[name="worry-size"]:checked') || {}).value || 'm';
      if (!input.value.trim()) { input.focus(); return; }
      add(input.value, size, override || detectMood(input.value).id);
      input.value = '';
      override = null;
      renderFormMood();
      input.blur();
    });
    let typingTimer = null;
    input.addEventListener('input', function () {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(renderFormMood, 200);
    });
    renderFormMood();
    jar.addEventListener('pointermove', onMove);
    jar.addEventListener('pointerup', onUp);
    jar.addEventListener('pointercancel', onUp);
    jar.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, { passive: false });

    document.getElementById('worry-talk').addEventListener('click', function () {
      sheet.close();
      CatTalk.open(current ? current.text : '', current ? current.mood : null);
    });
    document.getElementById('worry-pop').addEventListener('click', function () {
      sheet.close();
      if (current) pop(current);
    });
    document.addEventListener('worry:pop-current', function () {
      if (current && balls.indexOf(current) !== -1) pop(current);
    });
    window.addEventListener('resize', function () { if (active) { measure(); clampAll(); } });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

    measure();
    // 把存好的球從上面重新倒進罐子
    read(KEY, []).forEach(function (d, i) {
      const r = SIZES[d.size] * scale();
      balls.push(makeBall(d, r + Math.random() * Math.max(1, W - 2 * r), -r - i * 40));
    });
    updateCount();
    start();
  }

  function clampAll() {
    balls.forEach(function (b) { b.x = Math.max(b.r, Math.min(W - b.r, b.x)); b.y = Math.min(H - b.r, b.y); });
  }

  function start() {
    measure();
    clampAll();
    active = true;
    cancelAnimationFrame(frame);
    lastT = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    active = false;
    cancelAnimationFrame(frame);
  }

  return { show: init, pause: pause, detect: detectMood, popCurrent: function () { document.dispatchEvent(new CustomEvent('worry:pop-current')); } };
})();

/* ---------- 喵喵聊天室：內建回覆 ---------- */
const CatTalk = (function () {
  'use strict';

  let dlg, list, quick, form, field;
  let stage = 0, topic = null, listenIdx = 0, typing = false;
  let said = [];
  // AI 模式：有填 API 金鑰時，用 Claude 回覆；history 是送給 AI 的對話紀錄
  let ai = false, history = [], aiMood = null, currentWorry = '';
  let gen = 0; // 每次打開聊天室加一，讓上一次還沒說完的話不會跑進新的對話
  let settings, keyField, keyStatus, modeNote;

  // 隨機挑一句，盡量不重複已經說過的
  function pick(arr) {
    const fresh = arr.filter(function (x) { return said.indexOf(x) === -1; });
    const x = (fresh.length ? fresh : arr)[Math.floor(Math.random() * (fresh.length || arr.length))];
    said.push(x);
    return x;
  }

  function findTopic(text) {
    let best = null, bestHits = 0;
    WORRY_TALK.topics.forEach(function (t) {
      const hits = t.words.filter(function (w) { return text.indexOf(w) !== -1; }).length;
      if (hits > bestHits) { best = t; bestHits = hits; }
    });
    return best;
  }

  function isCrisis(text) {
    return WORRY_TALK.crisis.some(function (w) { return text.indexOf(w) !== -1; });
  }

  function aiOn() { return typeof CatAI !== 'undefined' && CatAI.enabled(); }

  function bubble(who, text) {
    const row = document.createElement('div');
    row.className = 'talk-row ' + who;
    if (who === 'cat') {
      const av = document.createElement('img');
      av.className = 'talk-avatar';
      av.src = 'icons/icon-192.png';
      av.alt = '';
      row.appendChild(av);
    }
    const b = document.createElement('p');
    b.className = 'talk-bubble';
    b.textContent = text;
    row.appendChild(b);
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
    return row;
  }

  /* 貓咪「打字中」後再說話，比較像在聊天 */
  function catSay(lines, then, fast) {
    lines = [].concat(lines).filter(Boolean);
    typing = true;
    setQuick([]);
    let i = 0;
    const g = gen;
    (function nextLine() {
      if (g !== gen) return;
      if (i >= lines.length) { typing = false; if (then) then(); return; }
      const dots = bubble('cat', '…');
      dots.classList.add('is-typing');
      const text = lines[i++];
      setTimeout(function () {
        if (g !== gen) return;
        dots.remove();
        bubble('cat', text);
        nextLine();
      }, fast ? 350 : Math.min(1600, 500 + text.length * 25));
    })();
  }

  function setQuick(options) {
    quick.textContent = '';
    options.forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'talk-chip' + (o.primary ? ' is-primary' : '');
      b.type = 'button';
      b.textContent = o.label;
      b.addEventListener('click', function () { if (!typing) o.onClick ? o.onClick() : userSay(o.label, o); });
      quick.appendChild(b);
    });
    // 選項出現後訊息區變矮，捲到最下面
    requestAnimationFrame(function () { list.scrollTop = list.scrollHeight; });
  }

  function crisis(text) {
    // 危機字詞一律先在手機上偵測，馬上給求助資訊，不等 AI
    if (ai) {
      history.push({ role: 'user', content: text || '' });
      history.push({ role: 'assistant', content: [].concat(WORRY_TALK.crisisReply).join('\n') });
    }
    catSay(WORRY_TALK.crisisReply, function () {
      setQuick([{ label: '📞 撥打 1925 安心專線', primary: true, onClick: function () { location.href = 'tel:1925'; } },
        { label: '我想再聊聊', onClick: function () { userSay('我想再聊聊'); } }]);
    });
  }

  function userSay(text, option) {
    bubble('me', text);
    if (isCrisis(text)) { crisis(text); return; }
    if (ai) { aiTurn(text, function () { builtinReply(text); }); return; }
    builtinReply(text, option);
  }

  function builtinReply(text, option) {
    if (option && option.reply) {
      stage++;
      catSay(option.reply, nextStage);
      return;
    }
    // 自己打字：依內容回應
    const t = findTopic(text) || topic;
    const lines = [WORRY_TALK.listen[listenIdx++ % WORRY_TALK.listen.length]];
    const found = findTopic(text);
    if (found) lines.push(pick(found.reflect));
    if (stage <= 2 && t) lines.push(pick(t.tip));
    stage++;
    catSay(lines, nextStage);
  }

  function nextStage() {
    if (stage === 1) {
      catSay(WORRY_TALK.friendQuestion, function () { setQuick(WORRY_TALK.friendReplies); });
    } else if (stage === 2) {
      catSay(WORRY_TALK.stepQuestion, function () { setQuick(WORRY_TALK.stepReplies); });
    } else if (stage === 3) {
      catSay(WORRY_TALK.closing, endOptions);
    } else {
      endOptions();
    }
  }

  function endOptions() {
    setQuick([
      { label: '🫧 戳破這顆球', primary: true, onClick: function () { close(); Worry.popCurrent(); } },
      { label: '🫁 跟貓咪呼吸', onClick: function () { close(); document.dispatchEvent(new CustomEvent('play:go', { detail: 'breathe' })); } },
      { label: '🐈 摸摸貓咪', onClick: function () { close(); document.dispatchEvent(new CustomEvent('play:go', { detail: 'pet' })); } },
      { label: '💬 再聊聊', onClick: function () { stage = 3; catSay('好呀，想說什麼都可以，我一直都在。', function () { setQuick([]); field.focus(); }); } }
    ]);
  }

  /* ---------- AI 回覆 ---------- */
  function aiChips() {
    return [
      { label: '🫧 戳破這顆球', primary: true, onClick: function () { close(); Worry.popCurrent(); } },
      { label: '給我一個小建議' },
      { label: '我只想被陪著' },
      { label: '🐈 摸摸貓咪', onClick: function () { close(); document.dispatchEvent(new CustomEvent('play:go', { detail: 'pet' })); } }
    ];
  }

  // 送出一句話給 AI；失敗時 fallback() 改用內建回覆
  function aiTurn(text, fallback) {
    history.push({ role: 'user', content: text });
    typing = true;
    setQuick([]);
    const dots = bubble('cat', '…');
    dots.classList.add('is-typing');
    const session = history;
    CatAI.reply(history.slice()).then(function (reply) {
      if (session !== history) return; // 聊天室已經關掉重開
      dots.remove();
      history.push({ role: 'assistant', content: reply });
      typing = false;
      catSay(reply.split(/\n+/).map(function (x) { return x.trim(); }), function () { setQuick(aiChips()); }, true);
    }, function (err) {
      if (session !== history) return;
      dots.remove();
      history.pop(); // 沒有回覆就把這句拿掉，保持一問一答
      typing = false;
      if (err && err.text) {
        const row = bubble('cat', '（' + err.text + '）');
        row.querySelector('.talk-bubble').classList.add('is-error');
      }
      if (err && err.code === 'key') { ai = false; updateMode(); }
      fallback();
    });
  }

  function updateMode() {
    if (!modeNote) return;
    const on = aiOn();
    modeNote.textContent = on && ai ? '喵喵正在用 AI（Claude）回覆你，AI 也可能說錯話。' : '這是 App 內建的貓咪回覆，不是真人或 AI。';
    keyStatus.textContent = on ? '✅ 已開啟 AI 回覆' : '目前使用內建回覆';
    keyStatus.className = 'ts-status' + (on ? ' is-on' : '');
  }

  function close() { if (dlg.open) dlg.close(); }

  function init() {
    if (dlg) return;
    dlg = document.getElementById('talk-dialog');
    list = document.getElementById('talk-list');
    quick = document.getElementById('talk-quick');
    form = document.getElementById('talk-form');
    field = document.getElementById('talk-input');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = field.value.trim();
      if (!text || typing) return;
      field.value = '';
      userSay(text);
    });
    dlg.querySelector('[data-close]').addEventListener('click', close);

    settings = document.getElementById('talk-settings');
    keyField = document.getElementById('ts-key');
    keyStatus = document.getElementById('ts-status');
    modeNote = document.getElementById('talk-mode');
    document.getElementById('talk-gear').addEventListener('click', function () {
      settings.hidden = !settings.hidden;
      keyField.value = '';
      keyField.placeholder = aiOn() ? '已儲存（輸入新的金鑰可替換）' : 'sk-ant-…';
    });
    document.getElementById('ts-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const k = keyField.value.trim();
      if (!/^sk-ant-\S{10,}$/.test(k)) { keyStatus.textContent = '金鑰格式不對，應該是 sk-ant- 開頭喔'; keyStatus.className = 'ts-status'; return; }
      CatAI.setKey(k);
      keyField.value = '';
      settings.hidden = true;
      const was = ai;
      ai = true;
      updateMode();
      if (!was && !typing) catSay('喵！接下來我會用 AI 認真讀你說的話再回覆你 ✨', function () { setQuick(aiChips()); field.focus(); });
    });
    document.getElementById('ts-clear').addEventListener('click', function () {
      CatAI.setKey('');
      ai = false;
      updateMode();
      keyField.placeholder = 'sk-ant-…';
    });
  }

  function open(worry, moodId) {
    init();
    gen++;
    typing = false;
    list.textContent = '';
    stage = 0;
    listenIdx = 0;
    said = [];
    topic = findTopic(worry || '');
    ai = aiOn();
    history = [];
    currentWorry = worry || '';
    aiMood = WORRY_MOODS.find(function (m) { return m.id === moodId; }) || null;
    settings.hidden = true;
    updateMode();
    dlg.showModal();
    if (worry && isCrisis(worry)) { bubble('me', worry); crisis(worry); return; }
    if (ai) {
      if (worry) bubble('cat', '喵～我看到你放進罐子裡的這件事了：\n「' + worry + '」');
      const first = worry
        ? '這是我放進「內耗罐」的事：「' + worry + '」' + (aiMood ? '（我的心情：' + aiMood.label + '）' : '') + '\n可以陪我聊聊嗎？'
        : '我想跟你聊聊。';
      aiTurn(first, function () { builtinOpen(worry, moodId, true); });
      return;
    }
    builtinOpen(worry, moodId);
  }

  function builtinOpen(worry, moodId, quoted) {
    const t = topic || WORRY_TALK.general;
    const mood = WORRY_MOODS.find(function (m) { return m.id === moodId; });
    const lines = [];
    if (worry && !quoted) lines.push('喵～我看到你放進罐子裡的這件事了：\n「' + worry + '」');
    // 依這顆球的心情先接住感受
    lines.push(mood ? mood.open : pick(t.reflect));
    lines.push(pick(t.tip));
    lines.push('想多說一點嗎？可以點下面的選項，或直接打字告訴我。');
    catSay(lines, function () { setQuick(WORRY_TALK.firstReplies); });
  }

  return { open: open };
})();
