import { avaHTML } from '../ava.js';
import { rollDice, showDice } from '../dice.js';
// Giao diện 🏙️ Cờ Tỷ Phú Việt Nam: bàn 8×8 nghiêng kiểu 3D, giữa bàn là bản đồ chữ S.
import { CELLS, GROUP_COLORS, MAP_XY, cellXY, rentOf, buildCost, MAX_LEVEL } from '../game/typhu-map.js';

const P_COLORS = ['#ff6b81', '#3fc97f', '#ffbf3c', '#4f9dff'];
// Bản đồ Việt Nam giản lược (khung 100×150)
const VN_PATH = 'M30,4 L44,2 L58,6 L66,14 L60,22 L50,27 L46,34 L50,44 L58,54 L64,62 L70,72 L76,84 L80,96 L78,106 L70,114 L62,120 L52,126 L44,132 L38,140 L30,146 L26,138 L30,128 L40,122 L50,116 L56,108 L58,98 L54,86 L46,74 L40,64 L34,52 L30,42 L22,34 L14,24 L16,14 L24,8 Z';
let built = null;
let lastDice = null;

function build(board) {
  board.innerHTML = '';
  const plane = document.createElement('div');
  plane.className = 'tilt-plane tp-plane';
  const grid = document.createElement('div');
  grid.className = 'tp-grid';
  const cells = CELLS.map((c, i) => {
    const [x, y] = cellXY(i);
    const d = document.createElement('div');
    d.className = 'tp-cell tp-' + c.type + (x === 0 || x === 7 ? ' side' : '') + ([0, 7, 14, 21].includes(i) ? ' corner' : '');
    d.style.gridColumn = x + 1; d.style.gridRow = y + 1;
    if (c.group) d.style.setProperty('--g', GROUP_COLORS[c.group]);
    d.innerHTML = `<i class="band"></i><span class="ic">${c.icon}</span><span class="nm">${c.name}</span><span class="pr">${c.price ? c.price : c.amount ? '-' + c.amount : ''}</span><span class="own"></span>`;
    grid.appendChild(d);
    return d;
  });
  const center = document.createElement('div');
  center.className = 'tp-center';
  center.innerHTML = `
    <svg viewBox="0 0 100 150" class="tp-map">
      <path d="${VN_PATH}" fill="#a5e3b4" stroke="#5bb878" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="86" cy="58" r="1.6" fill="#5bb878"/><text x="84" y="54" font-size="5" text-anchor="middle" fill="#3d8b58">Hoàng Sa</text>
      <circle cx="88" cy="118" r="1.6" fill="#5bb878"/><text x="84" y="114" font-size="5" text-anchor="middle" fill="#3d8b58">Trường Sa</text>
      <g class="dots"></g>
    </svg>
    <div class="tp-title">Tỷ Phú<br><b>Việt Nam</b></div>
    <div class="tp-card"></div>`;
  grid.appendChild(center);
  const tokens = document.createElement('div');
  tokens.className = 'tp-tokens';
  plane.append(grid, tokens);
  board.appendChild(plane);
  const strip = document.createElement('div');
  strip.className = 'tp-players';
  board.appendChild(strip);
  const dots = center.querySelector('.dots');
  const dotEls = {};
  Object.entries(MAP_XY).forEach(([name, [x, y]]) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3);
    c.setAttribute('fill', '#fff'); c.setAttribute('stroke', '#4a3456'); c.setAttribute('stroke-width', 0.8);
    dots.appendChild(c);
    dotEls[name] = c;
  });
  return { board, cells, tokens, strip, center, dotEls, tokenEls: {} };
}

export function render(s, prev, ctx) {
  const { $ } = ctx;
  const board = $('#board');
  const tp = s.tp;
  if (!tp) { board.className = 'hidden'; $('#stageMine').innerHTML = ''; ctx.banner('', false); return; }
  board.className = 'typhu tilt-board';
  if (!built || !board.contains(built.cells[0])) built = build(board);

  // Ô đất: chủ sở hữu + nhà
  CELLS.forEach((c, i) => {
    const el = built.cells[i];
    const o = tp.owner[i];
    el.classList.toggle('owned', o >= 0);
    el.style.setProperty('--o', o >= 0 ? P_COLORS[o] : 'transparent');
    el.querySelector('.own').textContent = o >= 0 ? (tp.level[i] === MAX_LEVEL ? '🏨' : '🏠'.repeat(tp.level[i]) || '🚩') : '';
    el.classList.toggle('here', tp.pending === i);
    if (MAP_XY[c.name]) built.dotEls[c.name].setAttribute('fill', o >= 0 ? P_COLORS[o] : '#fff');
    el.onclick = () => showInfo(i, s, ctx);
  });
  built.center.querySelector('.tp-card').textContent = tp.card ? `${tp.card.from}: ${tp.card.text}` : (tp.log[0] || `Vòng ${tp.round}/${tp.maxRounds}`);

  // Quân cờ: avatar đứng trên ô, đi từng ô một
  tp.pos.forEach((pos, seat) => {
    const p = s.seats[seat];
    let el = built.tokenEls[seat];
    if (!p || !tp.inGame[seat] || tp.bankrupt[seat]) { if (el) { el.remove(); delete built.tokenEls[seat]; delete shownPos[seat]; } return; }
    if (!el) {
      el = document.createElement('div');
      el.className = 'tp-token';
      el.innerHTML = `<i class="shadow"></i><span class="fig">${avaHTML(p.avatar, p.acc)}</span>`;
      el.style.setProperty('--c', P_COLORS[seat]);
      built.tokens.appendChild(el);
      built.tokenEls[seat] = el;
    }
    walkTo(seat, el, pos, ctx);
    el.classList.toggle('active', s.turn === seat);
  });

  // Dải người chơi + tiền
  built.strip.innerHTML = '';
  s.seats.forEach((p, k) => {
    if (!p || !tp.inGame[k]) return;
    const d = document.createElement('div');
    d.className = 'tp-p' + (s.turn === k ? ' active' : '') + (tp.bankrupt[k] ? ' out' : '');
    d.style.setProperty('--c', P_COLORS[k]);
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="mn">${tp.bankrupt[k] ? '💥' : '💰' + tp.money[k]}</span>`;
    d.title = p.name;
    built.strip.appendChild(d);
  });

  // Xúc xắc 3D giữa bàn
  const tray = $('#diceTray');
  tray.className = 'tray-typhu';
  const mine = s.state === 'playing' && s.turn === s.mySeat;
  const myRoll = mine && tp.phase === 'roll';
  showDice(tray, tp.dice || lastDice || [3, 4]);
  tray.classList.toggle('ready', myRoll);
  tray.onclick = myRoll ? () => doRoll(ctx) : null;

  // Nút + thẻ mua đất
  const box = $('#stageMine');
  box.innerHTML = '';
  if (myRoll) {
    const b = document.createElement('button');
    b.className = 'btn big pink roll-btn';
    b.textContent = '🎲 Gieo xúc xắc';
    b.onclick = () => doRoll(ctx);
    box.appendChild(b);
  }
  if (mine && (tp.phase === 'buy' || tp.phase === 'build')) {
    const c = CELLS[tp.pending];
    const cost = tp.phase === 'buy' ? c.price : buildCost(c);
    const deed = document.createElement('div');
    deed.className = 'tp-deed';
    deed.style.setProperty('--g', c.group ? GROUP_COLORS[c.group] : '#90a4ae');
    const lv = tp.level[tp.pending];
    const rents = c.type === 'air' ? ['1 sân bay: 50', '2 sân bay: 100'] : [0, 1, 2, 3].map((l) => `${['Đất trống', '1 nhà', '2 nhà', 'Khách sạn'][l]}: ${rentOf(c, l, false, 0)}`);
    deed.innerHTML = `<div class="dh"><span class="di">${c.icon}</span><b>${c.name}</b></div><div class="dr">${rents.map((r, i) => `<span class="${tp.phase === 'build' && i === lv + 1 ? 'next' : ''}">${r}</span>`).join('')}</div>`;
    const acts = document.createElement('div');
    acts.className = 'stage-actions';
    const label = tp.phase === 'buy' ? `🏷️ Mua · 💰${cost}` : `🔨 Xây ${lv === MAX_LEVEL - 1 ? 'khách sạn' : 'nhà'} · 💰${cost}`;
    acts.innerHTML = `<button class="btn big mint" data-a="${tp.phase}"></button><button class="btn soft" data-a="skip">Bỏ qua</button>`;
    acts.querySelector('[data-a=' + tp.phase + ']').textContent = label;
    acts.querySelectorAll('button').forEach((b) => (b.onclick = () => { ctx.socket.emit('act', { a: b.dataset.a }); ctx.sfx.pop(); }));
    box.append(deed, acts);
  }
  if (s.state === 'playing') {
    const t = s.seats[s.turn];
    if (mine) ctx.banner(tp.phase === 'roll' ? '🎲 Tới lượt bạn! Chạm xúc xắc để gieo' : tp.phase === 'buy' ? `🏷️ Mua ${CELLS[tp.pending].name} không?` : tp.phase === 'build' ? '🔨 Xây thêm nhà không?' : '🚶 Đang đi…', true);
    else ctx.banner(t ? (tp.dice && tp.phase !== 'roll' ? `🎲 ${t.avatar} ${t.name} ra ${tp.dice[0]} + ${tp.dice[1]} = ${tp.dice[0] + tp.dice[1]}` : `⏳ ${t.avatar} ${t.name} đang gieo… (vòng ${tp.round}/${tp.maxRounds})`) : '', false);
  } else ctx.banner('', false);
}

// ---------- Quân đi từng ô ----------
const shownPos = {};
const walkT = {};
let rollingUntil = 0;
let rolledAt = 0;
function doRoll(ctx) {
  if (Date.now() - rolledAt < 1500) return;
  rolledAt = Date.now();
  ctx.sfx.diceShake();
  ctx.socket.emit('act', { a: 'roll' });
}
function placeTok(el, seat, pos) {
  const [x, y] = cellXY(pos);
  const off = [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.2], [0.22, 0.2]][seat];
  el.style.left = ((x + 0.5 + off[0]) / 8) * 100 + '%';
  el.style.top = ((y + 0.5 + off[1]) / 8) * 100 + '%';
}
function walkTo(seat, el, target, ctx) {
  let cur = shownPos[seat];
  if (cur === target && !walkT[seat]) return;
  clearTimeout(walkT[seat]); walkT[seat] = null;
  const ahead = cur === undefined ? 99 : (target - cur + CELLS.length) % CELLS.length;
  if (cur === undefined || ahead > 12 || target === 7 && ahead > 0 && cur === 21) { shownPos[seat] = target; placeTok(el, seat, target); return; }
  const step = () => {
    if (cur === target) { walkT[seat] = null; return; }
    cur = (cur + 1) % CELLS.length; shownPos[seat] = cur;
    placeTok(el, seat, cur);
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    ctx.sfx.select();
    walkT[seat] = setTimeout(step, 160);
  };
  step();
}

export function reset() {
  built = null; lastDice = null; rollingUntil = 0;
  Object.keys(shownPos).forEach((k) => delete shownPos[k]);
  Object.values(walkT).forEach(clearTimeout);
}

function showInfo(i, s, ctx) {
  const c = CELLS[i];
  const tp = s.tp;
  if (c.type !== 'city' && c.type !== 'air') return ctx.toast(`${c.icon} ${c.name}`);
  const o = tp.owner[i];
  const owner = o >= 0 ? s.seats[o]?.name : 'chưa ai mua';
  const rent = c.type === 'air' ? 'thuê 50 / sân bay' : `thuê ${rentOf(c, tp.level[i], false, 0)}`;
  ctx.toast(`${c.icon} ${c.name} · giá ${c.price} · ${rent} · ${owner}`);
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'tp') return;
  const { sfx } = ctx;
  if (ev.what === 'roll') {
    lastDice = ev.d;
    rollingUntil = Date.now() + 5000; // khoá tới khi xúc xắc dừng hẳn (mở ở .then)
    rollDice(document.querySelector('#diceTray'), ev.d, { onBounce: (i) => sfx.diceHit(i) }).then(() => {
      rollingUntil = 0;
      ctx.rerender();
      if (ev.d[0] === ev.d[1]) { ctx.toast('Gieo đôi! Được gieo thêm 🎲'); sfx.bigCombo(); }
    });
  }
  if (ev.what === 'buy') { sfx.coin(); ctx.toast(`${ctx.nameOf(ev.seat)} mua ${CELLS[ev.cell].name}! 🏷️`); ctx.burst(ctx.center(), ['🏠', '💰', '✨'], 10); }
  if (ev.what === 'build') { sfx.stamp(); ctx.bigText(ev.level === MAX_LEVEL ? `🏨 Khách sạn ${CELLS[ev.cell].name}!` : `🏠 Xây nhà ${CELLS[ev.cell].name}`, true); }
  if (ev.what === 'pay' && ev.to >= 0 && ev.amount >= 100) { sfx.coin(); ctx.sysChat(`${ctx.nameOf(ev.from)} trả ${ev.amount} cho ${ctx.nameOf(ev.to)} (${ev.why})`); }
  if (ev.what === 'salary' && ev.seat === ctx.mySeat()) { sfx.coin(); ctx.toast('Qua Xuất phát +200 💰'); }
  if (ev.what === 'card') { sfx.newRound(); ctx.bigText(ev.text, true); }
  if (ev.what === 'jail') { sfx.lose(); ctx.bigText('🚓 Vào tù!'); ctx.shake(); }
  if (ev.what === 'bankrupt') { sfx.thunder(1); ctx.bigText(`💥 ${ctx.nameOf(ev.seat)} phá sản!`, true); ctx.shake(); }
  if (ev.what === 'win') { sfx.win(); ctx.confetti(); }
}
