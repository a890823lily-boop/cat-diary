/* 塗色貓咪：點一下區塊就塗上顏色，進度存在這台裝置 */
const Coloring = (function () {
  'use strict';

  /* 線稿：class="r" 是可以塗色的區塊（依出現順序編號），其餘是固定的線條 */
  const LINE = 'stroke="#4a3b33" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const R = 'class="r" fill="#ffffff" ' + LINE;
  const INK = 'fill="none" ' + LINE + ' pointer-events="none"';
  const DARK = 'fill="#4a3b33" pointer-events="none"';

  function star(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push((cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1));
    }
    return '<path ' + R + ' d="M' + pts.join(' L') + ' Z"/>';
  }

  function flower(cx, cy) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      s += '<circle ' + R + ' cx="' + (cx + Math.cos(a) * 11).toFixed(1) + '" cy="' + (cy + Math.sin(a) * 11).toFixed(1) + '" r="8"/>';
    }
    return s + '<circle ' + R + ' cx="' + cx + '" cy="' + cy + '" r="6"/>';
  }

  function whiskers(x, y, dir) {
    return '<path ' + INK + ' d="M' + x + ' ' + y + ' l' + (34 * dir) + ' -6 M' + x + ' ' + (y + 8) + ' l' + (34 * dir) + ' 4"/>';
  }

  const PICTURES = [
    {
      id: 'sit',
      name: '坐坐貓',
      svg:
        '<rect ' + R + ' x="2" y="2" width="296" height="296" rx="18"/>' +
        '<path ' + R + ' d="M2 232 H298 V280 Q298 298 280 298 H20 Q2 298 2 280 Z"/>' +
        '<path ' + R + ' d="M58 84 C48 66 20 74 28 96 C33 108 58 122 58 122 C58 122 83 108 88 96 C96 74 68 66 58 84 Z"/>' +
        star(245, 60, 18) +
        '<path ' + R + ' d="M196 236 C252 238 266 182 244 160 C232 148 220 158 230 170 C244 188 234 214 194 214 Z"/>' +
        '<ellipse ' + R + ' cx="150" cy="200" rx="58" ry="48"/>' +
        '<ellipse ' + R + ' cx="150" cy="212" rx="30" ry="30"/>' +
        '<ellipse ' + R + ' cx="126" cy="246" rx="16" ry="10"/>' +
        '<ellipse ' + R + ' cx="174" cy="246" rx="16" ry="10"/>' +
        '<path ' + R + ' d="M98 100 L94 40 L142 76 Z"/>' +
        '<path ' + R + ' d="M202 100 L206 40 L158 76 Z"/>' +
        '<path ' + R + ' d="M104 86 L102 56 L128 75 Z"/>' +
        '<path ' + R + ' d="M196 86 L198 56 L172 75 Z"/>' +
        '<ellipse ' + R + ' cx="150" cy="115" rx="60" ry="50"/>' +
        '<path ' + R + ' d="M150 67 Q157 79 150 92 Q143 79 150 67 Z"/>' +
        '<path ' + R + ' d="M132 70 Q138 80 133 90 Q126 80 132 70 Z"/>' +
        '<path ' + R + ' d="M168 70 Q174 80 167 90 Q162 80 168 70 Z"/>' +
        '<circle ' + R + ' cx="112" cy="130" r="9"/>' +
        '<circle ' + R + ' cx="188" cy="130" r="9"/>' +
        '<path ' + R + ' d="M143 123 H157 L150 131 Z"/>' +
        '<path ' + R + ' d="M110 158 Q150 176 190 158 L190 170 Q150 188 110 170 Z"/>' +
        '<circle ' + R + ' cx="150" cy="182" r="8"/>' +
        '<path ' + INK + ' d="M118 113 Q128 102 138 113 M162 113 Q172 102 182 113"/>' +
        '<path ' + INK + ' d="M150 131 Q144 140 137 135 M150 131 Q156 140 163 135"/>' +
        whiskers(100, 120, -1) + whiskers(200, 120, 1)
    },
    {
      id: 'box',
      name: '紙箱貓',
      svg:
        '<rect ' + R + ' x="2" y="2" width="296" height="296" rx="18"/>' +
        '<path ' + R + ' d="M2 250 H298 V280 Q298 298 280 298 H20 Q2 298 2 280 Z"/>' +
        star(48, 52, 16) + star(252, 48, 20) + star(220, 96, 10) +
        '<path ' + R + ' d="M106 124 L98 64 L144 100 Z"/>' +
        '<path ' + R + ' d="M194 124 L202 64 L156 100 Z"/>' +
        '<path ' + R + ' d="M110 108 L106 78 L132 98 Z"/>' +
        '<path ' + R + ' d="M190 108 L194 78 L168 98 Z"/>' +
        '<ellipse ' + R + ' cx="150" cy="140" rx="58" ry="46"/>' +
        '<ellipse ' + R + ' cx="128" cy="134" rx="11" ry="13"/>' +
        '<ellipse ' + R + ' cx="172" cy="134" rx="11" ry="13"/>' +
        '<ellipse ' + DARK + ' cx="128" cy="136" rx="5" ry="8"/>' +
        '<ellipse ' + DARK + ' cx="172" cy="136" rx="5" ry="8"/>' +
        '<circle fill="#ffffff" pointer-events="none" cx="131" cy="131" r="2.5"/>' +
        '<circle fill="#ffffff" pointer-events="none" cx="175" cy="131" r="2.5"/>' +
        '<path ' + R + ' d="M144 150 H156 L150 157 Z"/>' +
        '<path ' + INK + ' d="M150 157 Q145 164 139 160 M150 157 Q155 164 161 160"/>' +
        whiskers(104, 150, -1) + whiskers(196, 150, 1) +
        '<path ' + R + ' d="M64 172 L36 136 L104 150 L112 172 Z"/>' +
        '<path ' + R + ' d="M236 172 L264 136 L196 150 L188 172 Z"/>' +
        '<path ' + R + ' d="M64 172 H236 V266 H64 Z"/>' +
        '<path ' + R + ' d="M135 172 H165 V212 H135 Z"/>' +
        '<path ' + R + ' d="M98 236 Q120 216 146 236 L160 224 V248 L146 236 Q120 256 98 236 Z"/>' +
        '<path ' + R + ' d="M186 226 C180 216 166 220 170 232 C172 238 186 246 186 246 C186 246 200 238 202 232 C206 220 192 216 186 226 Z"/>' +
        '<ellipse ' + R + ' cx="118" cy="174" rx="16" ry="10"/>' +
        '<ellipse ' + R + ' cx="182" cy="174" rx="16" ry="10"/>'
    },
    {
      id: 'sleep',
      name: '睡覺貓',
      svg:
        '<rect ' + R + ' x="2" y="2" width="296" height="296" rx="18"/>' +
        '<path ' + R + ' d="M240 34 A34 34 0 1 0 266 92 A27 27 0 1 1 240 34 Z"/>' +
        star(60, 50, 13) + star(150, 36, 10) + star(196, 80, 8) +
        '<ellipse ' + R + ' cx="150" cy="240" rx="128" ry="38"/>' +
        '<ellipse ' + R + ' cx="150" cy="232" rx="104" ry="24"/>' +
        '<ellipse ' + R + ' cx="168" cy="190" rx="82" ry="46"/>' +
        '<path ' + R + ' d="M178 150 Q188 166 180 184 Q170 166 178 150 Z"/>' +
        '<path ' + R + ' d="M204 152 Q216 168 206 186 Q196 168 204 152 Z"/>' +
        '<path ' + R + ' d="M228 160 Q238 174 230 190 Q220 174 228 160 Z"/>' +
        '<path ' + R + ' d="M246 196 C262 226 200 248 126 236 C116 234 116 222 128 224 C190 232 236 222 236 200 Z"/>' +
        '<path ' + R + ' d="M76 158 L70 118 L104 140 Z"/>' +
        '<path ' + R + ' d="M112 140 L142 118 L140 160 Z"/>' +
        '<path ' + R + ' d="M80 148 L77 128 L95 140 Z"/>' +
        '<path ' + R + ' d="M118 140 L134 128 L134 148 Z"/>' +
        '<ellipse ' + R + ' cx="104" cy="182" rx="44" ry="38"/>' +
        '<circle ' + R + ' cx="80" cy="194" r="7"/>' +
        '<circle ' + R + ' cx="128" cy="194" r="7"/>' +
        '<path ' + R + ' d="M98 192 H110 L104 198 Z"/>' +
        '<path ' + INK + ' d="M80 182 Q88 188 96 182 M112 182 Q120 188 128 182"/>' +
        '<path ' + INK + ' d="M104 198 Q100 204 95 201 M104 198 Q108 204 113 201"/>' +
        '<ellipse ' + R + ' cx="132" cy="220" rx="18" ry="10"/>' +
        '<text x="150" y="128" font-size="22" font-weight="700" fill="#4a3b33" pointer-events="none" font-family="sans-serif">Z z z</text>'
    },
    {
      id: 'face',
      name: '貓咪大臉',
      svg:
        '<rect ' + R + ' x="2" y="2" width="296" height="296" rx="18"/>' +
        flower(36, 40) + flower(264, 260) + flower(40, 262) +
        '<path ' + R + ' d="M64 150 L60 50 L132 92 Z"/>' +
        '<path ' + R + ' d="M236 150 L240 50 L168 92 Z"/>' +
        '<path ' + R + ' d="M74 126 L72 72 L114 98 Z"/>' +
        '<path ' + R + ' d="M226 126 L228 72 L186 98 Z"/>' +
        '<ellipse ' + R + ' cx="150" cy="166" rx="104" ry="86"/>' +
        '<path ' + R + ' d="M150 84 Q160 100 150 118 Q140 100 150 84 Z"/>' +
        '<path ' + R + ' d="M126 88 Q134 102 126 116 Q118 102 126 88 Z"/>' +
        '<path ' + R + ' d="M174 88 Q182 102 174 116 Q166 102 174 88 Z"/>' +
        '<path ' + R + ' d="M226 66 L202 50 L204 82 Z"/>' +
        '<path ' + R + ' d="M226 66 L250 52 L248 84 Z"/>' +
        '<circle ' + R + ' cx="226" cy="67" r="8"/>' +
        '<ellipse ' + R + ' cx="110" cy="158" rx="19" ry="23"/>' +
        '<ellipse ' + R + ' cx="190" cy="158" rx="19" ry="23"/>' +
        '<ellipse ' + DARK + ' cx="110" cy="161" rx="9" ry="14"/>' +
        '<ellipse ' + DARK + ' cx="190" cy="161" rx="9" ry="14"/>' +
        '<circle fill="#ffffff" pointer-events="none" cx="115" cy="153" r="4"/>' +
        '<circle fill="#ffffff" pointer-events="none" cx="195" cy="153" r="4"/>' +
        '<circle ' + R + ' cx="80" cy="196" r="13"/>' +
        '<circle ' + R + ' cx="220" cy="196" r="13"/>' +
        '<circle ' + R + ' cx="136" cy="204" r="18"/>' +
        '<circle ' + R + ' cx="164" cy="204" r="18"/>' +
        '<path ' + R + ' d="M141 186 H159 L150 196 Z"/>' +
        '<path ' + INK + ' d="M150 196 V204"/>' +
        whiskers(66, 176, -1) + whiskers(234, 176, 1)
    },
    {
      // 隱藏圖：貓咪圖鑑集滿才會出現
      id: 'crown',
      name: '皇冠貓',
      secret: true,
      svg:
        '<rect ' + R + ' x="2" y="2" width="296" height="296" rx="18"/>' +
        star(40, 44, 16) + star(262, 46, 16) + star(34, 150, 10) + star(268, 156, 10) +
        '<path ' + R + ' d="M64 232 Q150 272 236 232 L250 298 H50 Z"/>' +
        '<circle ' + R + ' cx="150" cy="276" r="11"/>' +
        '<path ' + R + ' d="M70 150 L62 76 L122 108 Z"/>' +
        '<path ' + R + ' d="M230 150 L238 76 L178 108 Z"/>' +
        '<path ' + R + ' d="M78 134 L74 94 L108 112 Z"/>' +
        '<path ' + R + ' d="M222 134 L226 94 L192 112 Z"/>' +
        '<ellipse ' + R + ' cx="150" cy="168" rx="92" ry="74"/>' +
        '<circle ' + R + ' cx="96" cy="190" r="12"/>' +
        '<circle ' + R + ' cx="204" cy="190" r="12"/>' +
        '<circle ' + R + ' cx="136" cy="204" r="17"/>' +
        '<circle ' + R + ' cx="164" cy="204" r="17"/>' +
        '<path ' + R + ' d="M141 186 H159 L150 196 Z"/>' +
        '<path ' + INK + ' d="M104 166 Q118 152 132 166 M168 166 Q182 152 196 166"/>' +
        '<path ' + INK + ' d="M150 196 V204"/>' +
        whiskers(78, 186, -1) + whiskers(222, 186, 1) +
        '<path ' + R + ' d="M100 100 L110 46 L132 80 L150 36 L168 80 L190 46 L200 100 Z"/>' +
        '<path ' + R + ' d="M98 98 H202 V116 H98 Z"/>' +
        '<circle ' + R + ' cx="150" cy="107" r="6"/>' +
        '<circle ' + R + ' cx="124" cy="107" r="5"/>' +
        '<circle ' + R + ' cx="176" cy="107" r="5"/>' +
        '<circle ' + R + ' cx="110" cy="44" r="6"/>' +
        '<circle ' + R + ' cx="150" cy="34" r="7"/>' +
        '<circle ' + R + ' cx="190" cy="44" r="6"/>'
    }
  ];

  function unlockedSecret() {
    try { return localStorage.getItem('cat-diary:stickers-complete') === '1'; } catch (e) { return false; }
  }
  function visiblePictures() {
    return PICTURES.filter(function (p) { return !p.secret || unlockedSecret(); });
  }

  const PALETTE = [
    '#ffffff', '#fbe3d0', '#f6c6a8', '#f4a261', '#e07a3f', '#c8553d', '#8d5a3b', '#4a3b33',
    '#9e9e9e', '#ffd6e0', '#f7a1b9', '#e76f96', '#fff3b0', '#ffd166', '#c7e9b0', '#7fc8a9',
    '#b8e0f6', '#6cb4e4', '#3d5a98', '#d7c4f2', '#a78bda', '#2b2b2b'
  ];
  const KEY = 'cat-diary:color:';

  let board, picker, paletteBox, customInput, undoBtn;
  let current = null;   // 目前的圖
  let color = '#f4a261';
  let fills = [];
  let history = [];

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 忽略 */ }
  }

  function svgMarkup(pic, savedFills) {
    let i = -1;
    // 依順序把存好的顏色套到每個區塊
    const body = pic.svg.replace(/class="r" fill="#ffffff"/g, function () {
      i++;
      const f = savedFills && savedFills[i];
      return 'class="r" data-i="' + i + '" fill="' + (f || '#ffffff') + '"';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">' + body + '</svg>';
  }

  function init() {
    if (board) return;
    board = document.getElementById('color-board');
    picker = document.getElementById('color-pictures');
    paletteBox = document.getElementById('color-palette');
    customInput = document.getElementById('color-custom');
    undoBtn = document.getElementById('color-undo');

    PALETTE.forEach(function (c) {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = c;
      b.dataset.color = c;
      b.setAttribute('aria-label', '顏色 ' + c);
      b.addEventListener('click', function () { pickColor(c); });
      paletteBox.appendChild(b);
    });
    customInput.addEventListener('input', function () { pickColor(customInput.value); });

    board.addEventListener('click', function (e) {
      const region = e.target.closest && e.target.closest('.r');
      if (!region) return;
      const i = Number(region.dataset.i);
      const prev = fills[i] || '#ffffff';
      if (prev === color) return;
      history.push({ i: i, color: prev });
      fills[i] = color;
      region.setAttribute('fill', color);
      save();
      if (window.Stickers) Stickers.bump('paint', 10, 'painter');
    });

    undoBtn.addEventListener('click', function () {
      const last = history.pop();
      if (!last) return;
      fills[last.i] = last.color;
      const region = board.querySelector('[data-i="' + last.i + '"]');
      if (region) region.setAttribute('fill', last.color);
      save();
    });

    document.getElementById('color-clear').addEventListener('click', function () {
      if (!confirm('要把「' + current.name + '」全部擦掉重來嗎？')) return;
      fills = [];
      history = [];
      save();
      renderBoard();
    });

    document.getElementById('color-save').addEventListener('click', saveImage);
    document.getElementById('color-diary').addEventListener('click', function () {
      toPng(function (blob) {
        document.dispatchEvent(new CustomEvent('coloring:to-diary', { detail: { blob: blob, name: current.name } }));
      });
    });

    pickColor(read(KEY + 'pen', color));
    open(read(KEY + 'last', PICTURES[0].id));
  }

  function pickColor(c) {
    color = c;
    write(KEY + 'pen', c);
    paletteBox.querySelectorAll('.swatch').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.color === c);
    });
    customInput.value = /^#[0-9a-f]{6}$/i.test(c) ? c : '#f4a261';
    document.getElementById('color-current').style.background = c;
  }

  function save() {
    write(KEY + current.id, fills);
    undoBtn.disabled = !history.length;
    renderPicker();
  }

  function open(id) {
    current = visiblePictures().find(function (p) { return p.id === id; }) || PICTURES[0];
    write(KEY + 'last', current.id);
    fills = read(KEY + current.id, []);
    history = [];
    undoBtn.disabled = true;
    renderBoard();
    renderPicker();
  }

  function renderBoard() {
    board.innerHTML = svgMarkup(current, fills);
    board.setAttribute('aria-label', '塗色畫布：' + current.name);
  }

  function renderPicker() {
    picker.textContent = '';
    const list = visiblePictures();
    picker.style.gridTemplateColumns = 'repeat(' + list.length + ', 1fr)';
    list.forEach(function (p) {
      const b = document.createElement('button');
      b.className = 'pic-thumb' + (p === current ? ' is-active' : '');
      b.setAttribute('aria-pressed', p === current ? 'true' : 'false');
      b.innerHTML = svgMarkup(p, p === current ? fills : read(KEY + p.id, []));
      const label = document.createElement('span');
      label.textContent = p.name;
      b.appendChild(label);
      b.addEventListener('click', function () { if (p !== current) open(p.id); });
      picker.appendChild(b);
    });
  }

  /* 把目前的圖轉成 PNG */
  function toPng(done) {
    const img = new Image();
    img.onload = function () {
      const size = 1200;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(function (blob) { if (blob) done(blob); }, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup(current, fills).replace('<svg ', '<svg width="1200" height="1200" '));
  }

  function saveImage() {
    toPng(function (blob) {
      const name = '貓咪塗色-' + current.name + '.png';
      const file = new File([blob], name, { type: 'image/png' });
      // iPhone：用分享選單，可以選「儲存影像」存進相簿
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).catch(function () {});
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cat-coloring-' + current.id + '.png'; // 下載用英文檔名，各瀏覽器都能正確存檔
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
  }

  return {
    show: init,
    pictures: PICTURES,
    // 圖鑑集滿後重新整理圖案清單，並直接打開皇冠貓
    refresh: function (openId) { if (board) { if (openId) open(openId); else renderPicker(); } else if (openId) write(KEY + 'last', openId); }
  };
})();
