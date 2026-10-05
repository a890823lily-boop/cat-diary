/* 陪讀貓：專心計時，小貓在旁邊睡覺；中途離開 App，小貓就會醒來 */
const Focus = (function () {
  'use strict';

  const KEY = 'cat-diary:focus';
  const COINS = { 15: 5, 25: 10, 45: 20 };
  const GRACE = 5000; // 離開 5 秒內回來（例如不小心滑到）不算
  const SLEEP_LINES = ['呼…呼…（小貓在你旁邊睡著了）', '（小貓縮成一團，尾巴輕輕晃）', '呼嚕…呼嚕…你專心，我睡覺。', '（小貓翻了個身，繼續睡）'];
  const DONE_LINES = ['完成了！你好棒！（小貓伸了個大懶腰）', '喵～睡得好飽！你也好認真！', '這一輪你超專心的，給你小魚乾！'];

  let box, cat, timeEl, msg, task, startBtn, quitBtn, stats, ring;
  let st = null, minutes = 25, tick = null, lineTimer = null, wakeLock = null;

  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function read() {
    try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { st = {}; }
    st.total = st.total || 0;
    st.minutes = st.minutes || 0;
    if (st.day !== today()) { st.day = today(); st.todayRounds = 0; st.todayMin = 0; }
    return st;
  }
  function write() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 忽略 */ } }

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function catArt(state) {
    if (typeof Kitty !== 'undefined' && Kitty.adopted()) return Kitty.artState(state);
    const img = { sleep: 'deco-laptop.png', awake: 'deco-surprise.png', happy: 'deco-love.png', idle: 'deco-laptop.png' }[state] || 'deco-laptop.png';
    return '<img src="images/' + img + '" alt="">' + (state === 'sleep' ? '<span class="focus-z">z z</span>' : '');
  }

  function setState(name, catState) {
    box.className = 'focus is-' + name;
    cat.innerHTML = catArt(catState);
    const running = name === 'running';
    startBtn.hidden = running;
    quitBtn.hidden = !running;
    task.disabled = running;
    box.querySelectorAll('.focus-len').forEach(function (b) { b.disabled = running; });
  }

  function renderStats() {
    read();
    stats.textContent = '今天完成 ' + st.todayRounds + ' 輪・' + st.todayMin + ' 分鐘　｜　總共 ' + st.total + ' 輪・' + st.minutes + ' 分鐘';
  }

  function setRing(frac) {
    frac = Math.max(0, Math.min(1, frac));
    ring.style.strokeDashoffset = String(100 - frac * 100);
    ring.style.opacity = frac > 0.005 ? '1' : '0'; // 還沒開始時不要露出圓點
  }

  /* 讓螢幕不要自動變暗鎖住（支援的瀏覽器才會有用） */
  function keepAwake(on) {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
    } else if (!on && wakeLock) {
      wakeLock.release().catch(function () {});
      wakeLock = null;
    }
  }

  function update() {
    const s = read().session;
    if (!s) return;
    const left = s.end - Date.now();
    timeEl.textContent = fmt(left);
    setRing(1 - left / (s.min * 60000));
    if (left <= 0) finish();
  }

  function start() {
    read();
    st.session = { min: minutes, end: Date.now() + minutes * 60000, task: task.value.trim() };
    write();
    if (typeof Music !== 'undefined' && Music.unlock) Music.unlock();
    run();
  }

  // 開始或接續一輪
  function run() {
    const s = st.session;
    setState('running', 'sleep');
    msg.textContent = (s.task ? '📝 ' + s.task + '　' : '') + SLEEP_LINES[0];
    keepAwake(true);
    clearInterval(tick);
    tick = setInterval(update, 500);
    clearInterval(lineTimer);
    let i = 0;
    lineTimer = setInterval(function () { i = (i + 1) % SLEEP_LINES.length; msg.textContent = (s.task ? '📝 ' + s.task + '　' : '') + SLEEP_LINES[i]; }, 15000);
    update();
  }

  function stopTimers() {
    clearInterval(tick); clearInterval(lineTimer); tick = lineTimer = null;
    keepAwake(false);
  }

  function finish() {
    const s = st.session;
    stopTimers();
    st.session = null;
    st.total++; st.minutes += s.min; st.todayRounds++; st.todayMin += s.min;
    write();
    const coins = COINS[s.min] || Math.round(s.min / 2.5);
    if (typeof Kitty !== 'undefined') { Kitty.addCoins(coins); Kitty.gain('focus'); }
    chime();
    if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
    setState('done', 'happy');
    timeEl.textContent = '00:00';
    setRing(1);
    msg.textContent = DONE_LINES[Math.floor(Math.random() * DONE_LINES.length)] + '　得到 🐟×' + coins + (st.todayRounds > 1 ? '（今天第 ' + st.todayRounds + ' 輪）' : '');
    startBtn.textContent = '▶ 再來一輪';
    renderStats();
  }

  function wake(text) {
    stopTimers();
    st.session = null;
    write();
    setState('woke', 'normal');
    setRing(0);
    timeEl.textContent = fmt(minutes * 60000);
    msg.textContent = text;
    startBtn.textContent = '▶ 重新開始';
    if (navigator.vibrate) navigator.vibrate(60);
  }

  function quit() {
    if (!confirm('要放棄這一輪嗎？小貓會醒來喔。')) return;
    wake('喵？不專心了嗎？沒關係，休息一下再開始吧。');
  }

  /* 完成時的小鈴聲 */
  function chime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ac = new Ctx();
      [784, 988, 1319].forEach(function (f, i) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const t = ac.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + 1);
      });
      setTimeout(function () { ac.close(); }, 2000);
    } catch (e) { /* 沒有聲音也沒關係 */ }
  }

  /* 離開 App：記下時間；回來時離開太久，小貓就醒了 */
  function onHide() {
    read();
    if (!st.session) return;
    st.session.hiddenAt = Date.now();
    write();
  }
  function onShow() {
    read();
    const s = st.session;
    if (!s) return;
    if (s.hiddenAt && Date.now() - s.hiddenAt > GRACE && s.hiddenAt < s.end) {
      wake('喵！？你剛剛跑去哪裡了？我被吵醒了…（這輪不算，再試一次吧）');
      return;
    }
    delete s.hiddenAt;
    write();
    if (Date.now() >= s.end) { finish(); return; }
    if (!tick) run(); else keepAwake(true);
  }

  function init() {
    if (box) return;
    box = document.getElementById('focus');
    cat = box.querySelector('.focus-cat');
    timeEl = document.getElementById('focus-time');
    msg = document.getElementById('focus-msg');
    task = document.getElementById('focus-task');
    startBtn = document.getElementById('focus-start');
    quitBtn = document.getElementById('focus-quit');
    stats = document.getElementById('focus-stats');
    ring = box.querySelector('.fr-fg');
    try { minutes = Number(localStorage.getItem(KEY + '-len')) || 25; } catch (e) { /* 忽略 */ }
    box.querySelectorAll('.focus-len').forEach(function (b) {
      b.classList.toggle('is-active', Number(b.dataset.min) === minutes);
      b.addEventListener('click', function () {
        minutes = Number(b.dataset.min);
        try { localStorage.setItem(KEY + '-len', String(minutes)); } catch (e) { /* 忽略 */ }
        box.querySelectorAll('.focus-len').forEach(function (x) { x.classList.toggle('is-active', x === b); });
        if (!st.session) { timeEl.textContent = fmt(minutes * 60000); setRing(0); }
      });
    });
    startBtn.addEventListener('click', start);
    quitBtn.addEventListener('click', quit);
    document.addEventListener('visibilitychange', function () { document.hidden ? onHide() : onShow(); });
    window.addEventListener('pagehide', onHide);
    read();
    if (st.session) onShow(); // App 重新載入時接續（或發現已經離開太久）
    else idle();
  }

  function idle() {
    setState('idle', typeof Kitty !== 'undefined' && Kitty.adopted() ? 'normal' : 'idle');
    timeEl.textContent = fmt(minutes * 60000);
    setRing(0);
  }

  function show() {
    init();
    renderStats();
    if (st.session) update();
  }

  // 一打開 App 就檢查有沒有進行中的一輪（例如 App 更新後自動重新載入），有的話直接回到陪讀畫面
  document.addEventListener('DOMContentLoaded', function () {
    let active = false;
    try { active = !!(JSON.parse(localStorage.getItem(KEY) || '{}').session); } catch (e) { /* 忽略 */ }
    if (!active) return;
    init();
    if (st.session) document.dispatchEvent(new CustomEvent('play:go', { detail: 'focus' }));
  });

  return { show: show };
})();
