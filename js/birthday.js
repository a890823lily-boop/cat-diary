/* 貓咪生日：倒數、生日當天的慶祝動畫（運勢籤與養成小貓也會用到） */
const Birthday = (function () {
  'use strict';

  let cats = [];

  function pad(n) { return String(n).padStart(2, '0'); }
  function startOfToday() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  // 某一年的生日日期；2/29 出生的貓，在不是閏年時於 2/28 過生日
  function birthdayIn(year, m, d) {
    if (m === 2 && d === 29 && new Date(year, 1, 29).getMonth() !== 1) return new Date(year, 1, 28);
    return new Date(year, m - 1, d);
  }

  /* 下一次生日：還有幾天、會滿幾歲 */
  function info(cat) {
    if (!cat || !/^\d{4}-\d{2}-\d{2}$/.test(cat.birthday || '')) return null;
    const p = cat.birthday.split('-').map(Number);
    const today = startOfToday();
    let next = birthdayIn(today.getFullYear(), p[1], p[2]);
    if (next < today) next = birthdayIn(today.getFullYear() + 1, p[1], p[2]);
    const days = Math.round((next - today) / 864e5);
    const age = next.getFullYear() - p[0];
    if (age < 1) return null; // 還沒出生
    return { cat: cat, days: days, age: age, next: next };
  }

  function setCats(list) { cats = list || []; }
  function upcoming() {
    return cats.map(info).filter(Boolean).sort(function (a, b) { return a.days - b.days; });
  }
  function todayCats() {
    return upcoming().filter(function (b) { return b.days === 0; }).map(function (b) { return b.cat; });
  }

  /* ---------- 慶祝動畫 ---------- */
  function celebrate(names) {
    const old = document.querySelector('.bday-party');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'bday-party';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '生日快樂');
    const colors = ['#f4a261', '#f7a1b9', '#ffd166', '#7fc8a9', '#6cb4e4', '#a78bda'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('span');
      c.className = 'bday-confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 1.2 + 's';
      c.style.animationDuration = 2 + Math.random() * 1.6 + 's';
      box.appendChild(c);
    }
    ['🎈', '🎈', '🎈', '🎉', '🎁'].forEach(function (e, i) {
      const b = document.createElement('span');
      b.className = 'bday-balloon';
      b.textContent = e;
      b.style.left = (10 + i * 19) + '%';
      b.style.animationDelay = i * 0.25 + 's';
      box.appendChild(b);
    });
    const card = document.createElement('div');
    card.className = 'bday-card';
    card.innerHTML = '<div class="bday-cake">🎂</div><p class="bday-title"></p><p class="bday-sub">今天是特別的日子，記得給牠一個大大的擁抱 💕</p><img class="bday-cat" src="images/deco-love.png" alt=""><p class="hint">點一下關閉</p>';
    card.querySelector('.bday-title').textContent = '生日快樂，' + names.join('、') + '！';
    box.appendChild(card);
    box.addEventListener('click', function () { box.classList.add('is-out'); setTimeout(function () { box.remove(); }, 400); });
    document.body.appendChild(box);
    if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
  }

  /* 生日當天第一次打開 App 時自動慶祝（每天一次） */
  function autoCelebrate() {
    const list = todayCats();
    if (!list.length) return;
    const d = startOfToday();
    const key = 'cat-diary:bday-seen';
    const stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    try { if (localStorage.getItem(key) === stamp) return; localStorage.setItem(key, stamp); } catch (e) { /* 忽略 */ }
    setTimeout(function () { celebrate(list.map(function (c) { return c.name; })); }, 600);
  }

  return { setCats: setCats, upcoming: upcoming, todayCats: todayCats, celebrate: celebrate, autoCelebrate: autoCelebrate };
})();
