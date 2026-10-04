/* 小貓釣魚：按住拋竿等魚，看到「！」時放開收線 */
const Fishing = (function () {
  'use strict';

  const KEY = 'cat-diary:fishing';
  // weight 是出現機率的權重；full／love 是餵小貓時增加的飽足、心情
  const CATCHES = [
    { id: 'small', icon: '🐟', name: '小魚', rank: '普通', weight: 34, size: [8, 18], full: 15, love: 5, line: '小魚好新鮮！喀滋喀滋～' },
    { id: 'shrimp', icon: '🦐', name: '小蝦', rank: '普通', weight: 18, size: [4, 9], full: 10, love: 10, line: '蝦蝦彈彈的好好吃！' },
    { id: 'tropical', icon: '🐠', name: '熱帶魚', rank: '少見', weight: 14, size: [10, 22], full: 25, love: 10, line: '好漂亮的魚，吃起來也好香 😋' },
    { id: 'crab', icon: '🦀', name: '螃蟹', rank: '少見', weight: 9, size: [6, 15], full: 20, love: 15, line: '螃蟹夾我鼻子！但是好好吃 😹' },
    { id: 'puffer', icon: '🐡', name: '河豚', rank: '稀有', weight: 6, size: [12, 25], full: 30, love: 20, line: '圓滾滾的河豚！（小心地咬了一口）' },
    { id: 'squid', icon: '🦑', name: '小魷魚', rank: '稀有', weight: 5, size: [15, 30], full: 35, love: 20, line: '魷魚絲最棒了！' },
    { id: 'gold', icon: '🐟', name: '傳說金魚', rank: '傳說', weight: 2, size: [20, 40], full: 60, love: 60, line: '金、金魚！！我是全世界最幸福的貓 ✨', gold: true },
    { id: 'boot', icon: '👢', name: '舊靴子', rank: '垃圾', weight: 7, size: [24, 30], trash: true },
    { id: 'can', icon: '🥫', name: '空罐子', rank: '垃圾', weight: 5, size: [8, 12], trash: true }
  ];
  const RANK_CLASS = { 普通: 'r-common', 少見: 'r-uncommon', 稀有: 'r-rare', 傳說: 'r-legend', 垃圾: 'r-trash' };

  let dlg, scene, btn, msg, result, dexBox;
  let phase = 'idle'; // idle → waiting → bite → result
  let biteTimer = null, missTimer = null, biteAt = 0, current = null;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { dex: {}, total: 0 }; } catch (e) { return { dex: {}, total: 0 }; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
  }

  function pick() {
    const total = CATCHES.reduce(function (s, c) { return s + c.weight; }, 0);
    let r = Math.random() * total;
    for (const c of CATCHES) { r -= c.weight; if (r < 0) return c; }
    return CATCHES[0];
  }

  function setMsg(t) { msg.textContent = t; }
  function setPhase(p) {
    phase = p;
    scene.className = 'pond-scene is-' + p;
    btn.className = 'btn fish-btn is-' + p;
    btn.textContent = { idle: '🎣 按住拋竿', waiting: '⏳ 按住不要放…', bite: '❗ 快放開收線！', result: '🎣 再釣一次' }[p];
  }

  function clearTimers() { clearTimeout(biteTimer); clearTimeout(missTimer); }

  /* 按住：拋竿，等魚上鉤 */
  function press(e) {
    e.preventDefault();
    if (phase === 'result') { reset(); return; }
    if (phase !== 'idle') return;
    result.hidden = true;
    current = pick();
    setPhase('waiting');
    setMsg('浮標在水面上晃呀晃…魚上鉤（出現「！」）時放開手指');
    biteTimer = setTimeout(function () {
      setPhase('bite');
      biteAt = Date.now();
      if (navigator.vibrate) navigator.vibrate(80);
      // 太久沒放開，魚就跑掉了
      missTimer = setTimeout(function () { fail('太慢了…魚把餌吃掉就溜走了 🫧'); }, 1100);
    }, 1400 + Math.random() * 3200);
  }

  /* 放開：收線 */
  function release(e) {
    if (e) e.preventDefault();
    if (phase === 'waiting') { fail('太早收線了，魚被嚇跑了 💦（要等到「！」出現喔）'); return; }
    if (phase !== 'bite') return;
    clearTimers();
    const reaction = Date.now() - biteAt;
    land(current, reaction);
  }

  function fail(text) {
    clearTimers();
    setPhase('result');
    btn.textContent = '🎣 再試一次';
    setMsg(text);
  }

  function land(c, reaction) {
    const size = Math.round(c.size[0] + Math.random() * (c.size[1] - c.size[0]));
    const st = read();
    const rec = st.dex[c.id] || { count: 0, best: 0 };
    const isNew = !rec.count;
    const record = size > rec.best;
    rec.count++;
    rec.best = Math.max(rec.best, size);
    st.dex[c.id] = rec;
    st.total = (st.total || 0) + 1;
    write(st);
    if (typeof Kitty !== 'undefined') Kitty.gain('fishing');

    setPhase('result');
    setMsg(reaction < 350 ? '好快的反應！⚡' : '釣到了！');
    result.textContent = '';
    result.className = 'fish-result ' + RANK_CLASS[c.rank] + (c.gold ? ' is-gold' : '');
    const p = function (cls, t) { const n = document.createElement('p'); n.className = cls; n.textContent = t; return n; };
    const icon = p('fish-icon', c.icon);
    result.append(icon,
      p('fish-name', c.name + (isNew ? '　🆕 新發現！' : '')),
      p('fish-meta', c.rank + '・' + size + ' 公分' + (record && !isNew ? '　🏆 最大紀錄！' : '')));
    const row = document.createElement('div');
    row.className = 'fish-actions';
    const mk = function (label, cls, fn) { const b = document.createElement('button'); b.className = cls; b.textContent = label; b.addEventListener('click', fn); row.appendChild(b); };
    const done = function (text) { row.remove(); result.appendChild(p('fish-done', text)); };
    if (c.trash) {
      mk('🗑️ 丟進垃圾桶（+2 🐟幣）', 'btn', function () {
        if (typeof Kitty !== 'undefined') Kitty.addCoins(2);
        done('池塘變乾淨了！小貓給你 2 枚小魚乾幣 ✨');
      });
    } else {
      mk('😋 餵小貓', 'btn', function () {
        if (typeof Kitty !== 'undefined' && Kitty.adopted()) {
          Kitty.treat(c.full, c.love, c.line, c.icon);
          done((Kitty.name() || '小貓') + '：「' + c.line + '」');
        } else {
          done('還沒有領養小貓喔，先到上面領養一隻吧！');
        }
      });
      mk('🌊 放回池塘', 'btn btn-outline', function () { done('掰掰～' + c.name + '游走了 🫧（已經記在圖鑑裡）'); });
    }
    result.appendChild(row);
    result.hidden = false;
    renderDex();
  }

  function reset() {
    clearTimers();
    result.hidden = true;
    setPhase('idle');
    setMsg('按住按鈕拋竿，看到浮標上出現「！」就放開收線');
  }

  /* ---------- 魚圖鑑 ---------- */
  function renderDex() {
    const st = read();
    const found = CATCHES.filter(function (c) { return st.dex[c.id]; }).length;
    dexBox.textContent = '';
    const head = document.createElement('p');
    head.className = 'fish-dex-head';
    head.textContent = '📖 釣魚圖鑑 ' + found + ' / ' + CATCHES.length + '・總共釣了 ' + (st.total || 0) + ' 次';
    const grid = document.createElement('div');
    grid.className = 'fish-dex';
    CATCHES.forEach(function (c) {
      const rec = st.dex[c.id];
      const cell = document.createElement('div');
      cell.className = 'fish-cell ' + RANK_CLASS[c.rank] + (rec ? '' : ' is-locked') + (c.gold ? ' is-gold' : '');
      cell.innerHTML = '<span class="fc-icon"></span><span class="fc-name"></span><span class="fc-info"></span>';
      cell.querySelector('.fc-icon').textContent = c.icon;
      cell.querySelector('.fc-name').textContent = rec ? c.name : '？？？';
      cell.querySelector('.fc-info').textContent = rec ? '×' + rec.count + '・最大 ' + rec.best + 'cm' : c.rank;
      grid.appendChild(cell);
    });
    dexBox.append(head, grid);
  }

  function init() {
    if (dlg) return;
    dlg = document.getElementById('fish-dialog');
    scene = dlg.querySelector('.pond-scene');
    btn = dlg.querySelector('.fish-btn');
    msg = dlg.querySelector('.fish-msg');
    result = dlg.querySelector('.fish-result');
    dexBox = dlg.querySelector('.fish-dex-box');
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', function (e) { if (phase === 'waiting' || phase === 'bite') release(e); });
    btn.addEventListener('pointercancel', function (e) { if (phase === 'waiting' || phase === 'bite') release(e); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () { clearTimers(); reset(); });
  }

  function open() {
    init();
    const cat = scene.querySelector('.pond-cat');
    cat.innerHTML = typeof Kitty !== 'undefined' && Kitty.adopted() ? Kitty.art() : '<img src="images/deco-fishmonger.png" alt="">';
    reset();
    renderDex();
    dlg.showModal();
  }

  return { open: open };
})();
