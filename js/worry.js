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
  let gen = 0;          // 每次打開聊天室加一，讓上一次還沒說完的話不會跑進新的對話
  let seen = [];        // 這次聊天提過的主題
  let freeTurns = 0;    // 自己打字聊了幾次
  let echoed = 0;       // 用「你說的話」回應過幾次
  let lateSaid = false, ended = false, awaiting = false;

  // 隨機挑一句，盡量不重複已經說過的
  function pick(arr) {
    if (!arr || !arr.length) return '';
    const fresh = arr.filter(function (x) { return said.indexOf(x) === -1; });
    const x = (fresh.length ? fresh : arr)[Math.floor(Math.random() * (fresh.length || arr.length))];
    said.push(x);
    return x;
  }
  function fresh(arr) { return (arr || []).some(function (x) { return said.indexOf(x) === -1; }); }

  // 長的關鍵字優先：「男朋友」裡的「朋友」不會被算成朋友的事
  let allWords = null;
  function findTopic(text) {
    if (!allWords) {
      allWords = [];
      WORRY_TALK.topics.forEach(function (t) { t.words.forEach(function (w) { allWords.push({ w: w, t: t }); }); });
      allWords.sort(function (a, b) { return b.w.length - a.w.length; });
    }
    const used = new Array(text.length).fill(false);
    const hits = new Map();
    allWords.forEach(function (k) {
      let i = text.indexOf(k.w);
      while (i !== -1) {
        if (!used.slice(i, i + k.w.length).some(Boolean)) {
          // 同一個字串可能同時是兩個主題的關鍵字，所以先算分，整段再標記
          hits.set(k.t, (hits.get(k.t) || 0) + 1);
          k.mark = k.mark || [];
          k.mark.push(i);
        }
        i = text.indexOf(k.w, i + 1);
      }
      (k.mark || []).forEach(function (j) { for (let x = j; x < j + k.w.length; x++) used[x] = true; });
      k.mark = null;
    });
    let best = null, bestHits = 0;
    WORRY_TALK.topics.forEach(function (t) {
      const h = hits.get(t) || 0;
      if (h > bestHits) { best = t; bestHits = h; }
    });
    return best;
  }

  function findIntent(text) {
    const plain = text.replace(/[\s，。！？!?,.～~…]+/g, '');
    return WORRY_TALK.intents.find(function (it) {
      if (it.short && plain.length > it.short) return false;
      return it.words.some(function (w) { return text.indexOf(w) !== -1; });
    }) || null;
  }

  function moodOf(text) {
    const m = typeof Worry !== 'undefined' ? Worry.detect(text) : null;
    return m && WORRY_TALK.moodFeel[m.id] ? m : null;
  }

  // 從你打的字裡，挑一小段帶有感受的話，回應時引用
  function clauseOf(text, t) {
    const parts = text.split(/[，。！？!?,.、\n～~…；;]+/).map(function (x) { return x.trim().replace(/^(而且|可是|但是|但|然後|所以|因為|就是|其實|反正)/, ''); })
      .filter(function (x) { return x.length >= 4 && x.length <= 18; });
    if (!parts.length) return '';
    const words = [].concat.apply(t ? t.words.slice() : [], WORRY_MOODS.map(function (m) { return m.words; }));
    const hit = parts.find(function (p) { return words.some(function (w) { return p.indexOf(w) !== -1; }); });
    return hit || '';
  }

  function isCrisis(text) {
    return WORRY_TALK.crisis.some(function (w) { return text.indexOf(w) !== -1; });
  }

  function isLate() { const h = new Date().getHours(); return h >= 0 && h < 5; }

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
  function catSay(lines, then) {
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
      }, Math.min(1600, 500 + text.length * 25));
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

  function crisis() {
    catSay(WORRY_TALK.crisisReply, function () {
      setQuick([{ label: '📞 撥打 1925 安心專線', primary: true, onClick: function () { location.href = 'tel:1925'; } },
        { label: '我想再聊聊', onClick: function () { userSay('我想再聊聊'); } }]);
    });
  }

  function userSay(text, option) {
    bubble('me', text);
    if (isCrisis(text)) { crisis(); return; }
    if (option && option.reply) {
      stage++;
      catSay(option.reply, nextStage);
      return;
    }
    // 回答「如果是好朋友…」或「有沒有一小步…」時，先接住再往下聊
    if (awaiting) {
      awaiting = false;
      const q = clauseOf(text, topic);
      stage++;
      catSay([q ? pick(WORRY_TALK.echo).replace('{q}', q) : WORRY_TALK.listen[listenIdx++ % WORRY_TALK.listen.length],
        stage === 2 ? '你對別人好溫柔。那這份溫柔，也請你分一點給自己。' : '一步一步來就好，我會幫你加油的。'], nextStage);
      return;
    }
    freeTurns++;
    respond(text);
  }

  /* 自己打字：看你說了什麼、心情如何，組合出回應 */
  function respond(text) {
    const lines = [];
    const intent = findIntent(text);
    const t = findTopic(text);
    const cur = t || topic || WORRY_TALK.general;

    if (intent) {
      if (intent.all) intent.reply.forEach(function (x) { lines.push(x); });
      else lines.push(pick(intent.reply));
      if (intent.tips) {
        lines.push(pick(cur.tip));
        if (fresh(cur.tip)) lines.push('還有，' + pick(cur.tip));
      }
      if (intent.id === 'greet' || intent.id === 'askCat' || intent.id === 'yes') lines.push(pick(fresh(cur.ask) ? cur.ask : WORRY_TALK.general.ask));
      if (t) topic = t;
      if (intent.end) { catSay(ended ? lines : lines.concat(WORRY_TALK.closing), endOptions); ended = true; return; }
      catSay(lines, afterChat);
      return;
    }

    if (isLate() && !lateSaid) { lateSaid = true; lines.push(pick(WORRY_TALK.lateNight)); }
    const mood = moodOf(text);
    const q = clauseOf(text, t);
    if (q && echoed < 2 && Math.random() < 0.7) {
      echoed++;
      lines.push(pick(WORRY_TALK.echo).replace('{q}', q));
    } else if (mood && fresh(WORRY_TALK.moodFeel[mood.id])) {
      lines.push(pick(WORRY_TALK.moodFeel[mood.id]));
    } else {
      lines.push(WORRY_TALK.listen[listenIdx++ % WORRY_TALK.listen.length]);
    }

    if (t && seen.indexOf(t.id) === -1) {
      // 聊到新的主題：如果前面聊過別的，把兩件事連起來
      if (topic && topic !== t) lines.push(pick(WORRY_TALK.link).replace('{a}', topic.about).replace('{b}', t.about));
      else lines.push(pick(t.reflect));
      seen.push(t.id);
      topic = t;
    }
    // 輪流：問一個問題讓你多說，或給一個小建議
    if (freeTurns % 2 === 1 && fresh(cur.ask)) lines.push(pick(cur.ask));
    else if (fresh(cur.tip)) lines.push(pick(cur.tip));
    else lines.push(pick(WORRY_TALK.general.ask));

    catSay(lines.slice(0, 4), afterChat);
  }

  function afterChat() {
    // 聊了幾輪之後，溫柔地提議可以收尾，但還是可以繼續聊
    if (freeTurns >= 4 && !ended) { ended = true; catSay(WORRY_TALK.closing, endOptions); return; }
    setQuick([{ label: '🫧 戳破這顆球', primary: true, onClick: function () { close(); Worry.popCurrent(); } }].concat(WORRY_TALK.chatReplies));
  }

  function nextStage() {
    if (stage === 1) {
      catSay(WORRY_TALK.friendQuestion, function () { awaiting = true; setQuick(WORRY_TALK.friendReplies); });
    } else if (stage === 2) {
      catSay(WORRY_TALK.stepQuestion, function () { awaiting = true; setQuick(WORRY_TALK.stepReplies); });
    } else if (stage === 3) {
      ended = true;
      catSay(WORRY_TALK.closing, endOptions);
    } else {
      endOptions();
    }
  }

  function endOptions() {
    awaiting = false;
    setQuick([
      { label: '🫧 戳破這顆球', primary: true, onClick: function () { close(); Worry.popCurrent(); } },
      { label: '🫁 跟貓咪呼吸', onClick: function () { close(); document.dispatchEvent(new CustomEvent('play:go', { detail: 'breathe' })); } },
      { label: '🐈 摸摸貓咪', onClick: function () { close(); document.dispatchEvent(new CustomEvent('play:go', { detail: 'pet' })); } },
      { label: '💬 再聊聊', onClick: function () { stage = 3; catSay('好呀，想說什麼都可以，我一直都在。', function () { setQuick([]); field.focus(); }); } }
    ]);
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
  }

  function open(worry, moodId) {
    init();
    gen++;
    typing = false;
    list.textContent = '';
    stage = 0;
    listenIdx = Math.floor(Math.random() * WORRY_TALK.listen.length);
    said = [];
    seen = [];
    freeTurns = 0;
    echoed = 0;
    lateSaid = false;
    ended = false;
    awaiting = false;
    topic = findTopic(worry || '');
    if (topic) seen.push(topic.id);
    dlg.showModal();
    if (worry && isCrisis(worry)) { bubble('me', worry); crisis(); return; }
    const t = topic || WORRY_TALK.general;
    const mood = WORRY_MOODS.find(function (m) { return m.id === moodId; });
    const lines = [];
    if (worry) lines.push('喵～我看到你放進罐子裡的這件事了：\n「' + worry + '」');
    if (isLate()) { lateSaid = true; lines.push(pick(WORRY_TALK.lateNight)); }
    // 依這顆球的心情先接住感受，再依主題說一句
    lines.push(mood ? (Math.random() < 0.5 ? mood.open : pick(WORRY_TALK.moodFeel[mood.id]) || mood.open) : pick(t.reflect));
    if (mood && topic) lines.push(pick(t.reflect));
    else lines.push(pick(t.tip));
    lines.push('想多說一點嗎？可以點下面的選項，或直接打字告訴我。');
    catSay(lines, function () { setQuick(WORRY_TALK.firstReplies); });
  }

  return { open: open };
})();
