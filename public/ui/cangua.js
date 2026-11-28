import { avaHTML } from '../ava.js';
import { rollDice, showDice } from '../dice.js';
// Giao diện 🐴 Cờ Cá Ngựa: bàn cờ 15×15, xoay để chuồng của mình luôn ở góc dưới trái.
const COLORS = ['#ff6b81', '#3fc97f', '#ffbf3c', '#4f9dff'];
const LIGHT = ['#ffd3da', '#c9f3d9', '#ffe9b8', '#cfe3ff'];
const NAMES = ['Đỏ', 'Xanh lá', 'Vàng', 'Xanh dương'];

// Đường đua 52 ô (toạ độ ô x,y) cho màu số 0, bắt đầu ở (1,6)
const TRACK = (() => {
  const t = [];
  for (let x = 1; x <= 5; x++) t.push([x, 6]);
  for (let y = 5; y >= 0; y--) t.push([6, y]);
  t.push([7, 0]);
  for (let y = 0; y <= 5; y++) t.push([8, y]);
  for (let x = 9; x <= 14; x++) t.push([x, 6]);
  t.push([14, 7]);
  for (let x = 14; x >= 9; x--) t.push([x, 8]);
  for (let y = 9; y <= 14; y++) t.push([8, y]);
  t.push([7, 14]);
  for (let y = 14; y >= 9; y--) t.push([6, y]);
  for (let x = 5; x >= 0; x--) t.push([x, 8]);
  t.push([0, 7]);
  t.push([0, 6]);
  return t;
})();
const HOME0 = [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]];
const BASE0 = [[1.75, 1.75], [4.25, 1.75], [1.75, 4.25], [4.25, 4.25]];
const FINISH0 = [6.2, 7.5];

// Quay điểm (toạ độ liên tục, tâm 7.5) theo chiều kim đồng hồ k lần
const rotP = ([x, y], k) => { for (let i = 0; i < k; i++) [x, y] = [15 - y, x]; return [x, y]; };
const cellC = ([x, y]) => [x + 0.5, y + 0.5];

// Vị trí ngựa (toạ độ gốc, chưa xoay theo người xem)
function horsePoint(seat, step, h) {
  if (step === -1) return rotP(BASE0[h], seat);
  if (step <= 50) return cellC(TRACK[(seat * 13 + step) % 52]);
  if (step <= 55) return rotP(cellC(HOME0[step - 51]), seat);
  return rotP([FINISH0[0] + (h % 2) * 0.5, FINISH0[1] + (h < 2 ? -0.35 : 0.35)], seat);
}

let built = null;   // { key, svg, layer }
let lastDice = null;

function view(mySeat) {
  const r = ((2 - Math.max(0, mySeat)) % 4 + 4) % 4;
  return (p) => { const [x, y] = rotP(p, r); return [15 - x, y]; }; // xoay rồi lật gương: chuồng mình ở dưới trái
}

function buildBoard(s, ctx) {
  const T = view(s.mySeat);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 15 15');
  svg.setAttribute('class', 'ludo-svg');
  const rect = (x, y, w, h, fill, extra = {}) => {
    // xoay góc hình chữ nhật: biến đổi 2 góc rồi lấy min/max
    const [a, b] = [T([x, y]), T([x + w, y + h])];
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', Math.min(a[0], b[0])); r.setAttribute('y', Math.min(a[1], b[1]));
    r.setAttribute('width', Math.abs(a[0] - b[0])); r.setAttribute('height', Math.abs(a[1] - b[1]));
    r.setAttribute('fill', fill);
    Object.entries(extra).forEach(([k, v]) => r.setAttribute(k, v));
    svg.appendChild(r);
    return r;
  };
  const circle = (p, rr, fill, stroke) => {
    const [cx, cy] = T(p);
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', rr); c.setAttribute('fill', fill);
    if (stroke) { c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', 0.08); }
    svg.appendChild(c);
  };
  const text = (p, str, size, fill = '#4a3456') => {
    const [x, y] = T(p);
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('font-size', size); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central'); t.setAttribute('fill', fill); t.setAttribute('font-weight', '800');
    t.textContent = str; svg.appendChild(t);
  };
  rect(0, 0, 15, 15, '#fffaf5', { rx: 0.6 });
  // Chuồng 4 góc
  for (let k = 0; k < 4; k++) {
    const [ox, oy] = rotP([0, 0], k), [ex, ey] = rotP([6, 6], k);
    rect(Math.min(ox, ex), Math.min(oy, ey), 6, 6, COLORS[k], { rx: 0.5, opacity: s.cn && !s.cn.inGame[k] ? 0.35 : 1 });
    const [ix, iy] = rotP([0.6, 0.6], k), [jx, jy] = rotP([5.4, 5.4], k);
    rect(Math.min(ix, jx), Math.min(iy, jy), 4.8, 4.8, '#fff', { rx: 0.5, opacity: 0.92 });
    BASE0.forEach((b) => circle(rotP(b, k), 0.62, LIGHT[k], COLORS[k]));
  }
  // Đường đua
  TRACK.forEach(([x, y], i) => {
    const owner = i % 13 === 0 ? i / 13 : -1;
    rect(x + 0.04, y + 0.04, 0.92, 0.92, owner >= 0 ? COLORS[owner] : '#ffffff', { rx: 0.18, stroke: '#f0dde8', 'stroke-width': 0.05 });
    if (owner >= 0) text(cellC([x, y]), '⭐', 0.5);
  });
  // Đường về đích
  for (let k = 0; k < 4; k++) HOME0.forEach((c, i) => {
    const p = rotP(c, k);
    // ô (x,y) sau khi xoay: dùng điểm góc
    const q = rotP([c[0] + 1, c[1] + 1], k);
    rect(Math.min(p[0], q[0]) + 0.04, Math.min(p[1], q[1]) + 0.04, 0.92, 0.92, LIGHT[k], { rx: 0.18, stroke: COLORS[k], 'stroke-width': 0.06 });
    text(rotP(cellC(c), k), String(i + 1), 0.45, COLORS[k]);
  });
  // Đích ở giữa
  rect(6, 6, 3, 3, '#fff3c4', { rx: 0.4 });
  text([7.5, 7.5], '🏁', 1.3);
  return svg;
}

export function render(s, prev, ctx) {
  const { $ } = ctx;
  const board = $('#board');
  const cn = s.cn;
  if (!cn) { board.className = 'hidden'; $('#stageMine').innerHTML = ''; ctx.banner('', false); return; }
  board.classList.remove('hidden');
  board.className = 'ludo tilt-board';
  const key = s.mySeat + ':' + cn.inGame.join('');
  if (!built || built.key !== key || !board.contains(built.svg)) {
    board.innerHTML = '';
    // Mặt bàn nghiêng ra sau (nhìn xéo kiểu 3D), quân cờ đứng thẳng trên mặt bàn
    const plane = document.createElement('div');
    plane.className = 'tilt-plane';
    const svg = buildBoard(s, ctx);
    const layer = document.createElement('div');
    layer.className = 'ludo-layer';
    plane.append(svg, layer);
    board.append(plane);
    built = { key, svg, layer, plane, pieces: {} };
  }
  const T = view(s.mySeat);
  // Tên người chơi ở góc chuồng
  built.plane.querySelectorAll('.ludo-name').forEach((e) => e.remove());
  s.seats.forEach((p, k) => {
    if (!p || !cn.inGame[k]) return;
    const [x, y] = T(rotP([3, 3], k));
    const n = document.createElement('div');
    n.className = 'ludo-name' + (s.turn === k ? ' active' : '');
    n.style.left = (x / 15) * 100 + '%'; n.style.top = (y / 15) * 100 + '%';
    n.innerHTML = `<span class="ava">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span>`;
    n.querySelector('.nm').textContent = p.name + (k === s.mySeat ? ' (bạn)' : '');
    built.plane.appendChild(n);
  });
  // Ngựa: đi từng ô một
  const ready = Date.now() > rollingUntil;
  const mineTurn = s.state === 'playing' && s.turn === s.mySeat && cn.phase === 'move' && ready;
  const seen = new Set();
  cn.horses.forEach((hs, seat) => {
    if (!cn.inGame[seat]) return;
    hs.forEach((step, h) => {
      const id = seat + '-' + h;
      seen.add(id);
      let el = built.pieces[id];
      if (!el) {
        el = document.createElement('button');
        el.className = 'horse';
        el.style.setProperty('--c', COLORS[seat]);
        el.innerHTML = '<i class="shadow"></i><span class="fig">🐴</span>';
        built.layer.appendChild(el);
        built.pieces[id] = el;
      }
      walkTo(id, el, seat, h, step, T, ctx);
      const can = mineTurn && seat === s.mySeat && cn.movable.includes(h);
      el.classList.toggle('can', can);
      el.classList.toggle('home', step === 56);
      el.onclick = can ? () => { ctx.socket.emit('act', { a: 'move', h }); ctx.sfx.pop(); } : null;
    });
  });
  Object.keys(built.pieces).forEach((id) => { if (!seen.has(id)) { built.pieces[id].remove(); delete built.pieces[id]; delete shown[id]; } });

  // Xúc xắc 3D trên bàn
  const tray = $('#diceTray');
  tray.className = 'tray-ludo';
  const myRoll = s.state === 'playing' && s.turn === s.mySeat && cn.phase === 'roll';
  showDice(tray, [cn.dice || lastDice || 6]);
  tray.classList.toggle('ready', myRoll);
  tray.onclick = myRoll ? () => doRoll(ctx) : null;
  const box = $('#stageMine');
  box.innerHTML = '';
  if (myRoll) {
    const b = document.createElement('button');
    b.className = 'btn big pink roll-btn';
    b.textContent = '🎲 Gieo xúc xắc';
    b.onclick = () => doRoll(ctx);
    box.appendChild(b);
  }
  if (s.state === 'playing') {
    const t = s.seats[s.turn];
    if (s.turn === s.mySeat) ctx.banner(cn.phase === 'move' ? (ready ? `🐴 Ra ${cn.dice}! Chạm con ngựa đang nhún để đi` : '🎲 Xúc xắc đang lăn…') : cn.phase === 'roll' ? '🎲 Tới lượt bạn! Chạm xúc xắc để gieo' : '🐴 Đang đi…', true);
    else ctx.banner(t ? `${cn.dice && cn.phase !== 'roll' && ready ? `🎲 ${t.avatar} ${t.name} ra ${cn.dice}` : `⏳ ${t.avatar} ${t.name} (${NAMES[s.turn]}) đang gieo…`}` : '', false);
  } else ctx.banner('', false);
}

let rolledByMe = 0;
function doRoll(ctx) {
  if (Date.now() - rolledByMe < 1500) return;
  rolledByMe = Date.now();
  ctx.sfx.diceShake();
  ctx.socket.emit('act', { a: 'roll' });
}

// ---------- Ngựa đi từng ô ----------
const shown = {};
const walking = {};
let rollingUntil = 0;
function place(el, seat, step, h, T) {
  const [px, py] = T(horsePoint(seat, step, h));
  el.style.left = (px / 15) * 100 + '%';
  el.style.top = (py / 15) * 100 + '%';
}
function walkTo(id, el, seat, h, target, T, ctx) {
  let cur = shown[id];
  if (cur === target && !walking[id]) return;
  clearTimeout(walking[id]); walking[id] = null;
  // Chờ xúc xắc lăn xong rồi mới đi
  const wait = Math.max(0, rollingUntil - Date.now());
  if (wait > 0 && cur !== undefined && cur !== target) { walking[id] = setTimeout(() => { walking[id] = null; walkTo(id, el, seat, h, target, T, ctx); }, wait); return; }
  if (cur === undefined || target === -1 || cur === -1 || target < cur || target - cur > 12) {
    if (cur >= 0 && target === -1) { el.classList.add('kicked'); setTimeout(() => el.classList.remove('kicked'), 700); }
    shown[id] = target; place(el, seat, target, h, T);
    if (cur === -1 && target === 0) hop(el);
    return;
  }
  const step = () => {
    if (cur >= target) { walking[id] = null; return; }
    cur++; shown[id] = cur;
    place(el, seat, cur, h, T); hop(el);
    ctx.sfx.select();
    walking[id] = setTimeout(step, 165);
  };
  step();
}
function hop(el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }

export function reset() {
  built = null; lastDice = null; rollingUntil = 0;
  Object.keys(shown).forEach((k) => delete shown[k]);
  Object.values(walking).forEach(clearTimeout);
  Object.keys(walking).forEach((k) => delete walking[k]);
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'cn') return;
  const { sfx } = ctx;
  if (ev.what === 'roll') {
    lastDice = ev.d;
    rollingUntil = Date.now() + 5000; // khoá tới khi xúc xắc dừng hẳn (mở ở .then)
    rollDice(document.querySelector('#diceTray'), [ev.d], { onBounce: (i) => sfx.diceHit(i) }).then(() => {
      rollingUntil = 0;
      if (ev.d === 6) { sfx.bigCombo(); ctx.burst(ctx.center(), ['✨', '6️⃣', '⭐'], 10); }
      ctx.rerender();
    });
  }
  if (ev.what === 'move') {
    const steps = ev.from === -1 ? 1 : ev.to - ev.from;
    if (ev.kicks && ev.kicks.length) {
      setTimeout(() => { ctx.bigText('ĐÁ! 🦵💥', true); sfx.bump(); ctx.shake(); ctx.burst(ctx.center(), ['🐴', '💥', '⭐'], 14); }, 200 + steps * 165);
      ctx.sysChat(`${ctx.nameOf(ev.seat)} đá ngựa của ${ev.kicks.map(([s]) => ctx.nameOf(s)).join(', ')} về chuồng!`);
    }
    if (ev.home) setTimeout(() => { sfx.coin(); ctx.burst(ctx.center(), ['🏁', '⭐', '🐴'], 12); }, 200 + steps * 165);
    if (ev.from === -1) { sfx.pop(); ctx.toast(`${ctx.nameOf(ev.seat)} ra quân! 🐴`); }
  }
  if (ev.what === 'again' && ev.seat === ctx.mySeat()) ctx.toast('Được gieo thêm 1 lượt nữa 🎲');
  if (ev.what === 'win') { ctx.bigText(`${ctx.nameOf(ev.seat)} về đích! 🏆`, true); sfx.win(); ctx.confetti(); }
}
