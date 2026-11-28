// Giao diện 🃏 Poker: bài chung + pot giữa bàn, 2 lá tẩy + nút Bỏ / Xem / Theo / Tố ở dưới.
const STREET = { pre: 'Trước flop', flop: 'Flop', turn: 'Turn', river: 'River' };
let raiseOpen = false;
let raiseTo = 0;

export function reset() { raiseOpen = false; document.querySelectorAll('.pk-seatbet').forEach((e) => e.remove()); }

// ---------- Phỉnh (sèn) ----------
const CHIP_COLORS = [[50, '#ffb300'], [25, '#7e57c2'], [10, '#3f8cff'], [5, '#ff4f6d'], [1, '#ffffff']];
/** Chồng phỉnh cho số chip v (tối đa ~10 đồng xu cho gọn) */
export function chipStack(v, big = false) {
  const d = document.createElement('div');
  d.className = 'chip-stack' + (big ? ' big' : '');
  // Số đồng theo độ lớn (nhiều tiền thì chồng cao), màu theo mệnh giá
  const n = Math.max(1, Math.min(12, Math.round(Math.log2(v + 1) * 2)));
  const coins = [];
  for (let k = 0; k < n; k++) coins.push(CHIP_COLORS[(k + (v >= 50 ? 0 : v >= 10 ? 2 : 3)) % CHIP_COLORS.length][1]);
  coins.forEach((c, i) => { const x = document.createElement('i'); x.style.setProperty('--c', c); x.style.setProperty('--k', i); d.appendChild(x); });
  const t = document.createElement('b'); t.textContent = v; d.appendChild(t);
  return d;
}
// Phỉnh bay từ điểm a -> điểm b
function flyChips(a, b, n = 4) {
  if (!a || !b) return;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'chip-fly';
    c.style.setProperty('--c', CHIP_COLORS[i % CHIP_COLORS.length][1]);
    c.style.left = a.x + 'px'; c.style.top = a.y + 'px';
    document.getElementById('fx').appendChild(c);
    c.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(.8)` }],
      { duration: 520, delay: i * 70, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
    setTimeout(() => c.remove(), 700 + i * 70);
  }
}
function seatPoint(seat) {
  const el = document.querySelector(`.seat[data-seat="${seat}"] .tag`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function potPoint() {
  const el = document.querySelector('.pk-pot');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function render(s, prev, ctx) {
  const { $, cardEl } = ctx;
  const pk = s.pk;
  const center = $('#stageCenter');
  const box = $('#stageMine');
  center.innerHTML = ''; box.innerHTML = '';
  if (!pk) return ctx.banner('', false);

  // Giữa bàn: chồng phỉnh pot + 5 lá chung
  const pot = document.createElement('div');
  pot.className = 'pk-pot';
  const potChips = pk.pot - pk.bet.reduce((a, b) => a + b, 0); // phỉnh đã gom vào giữa
  pot.appendChild(chipStack(Math.max(potChips, 0) || pk.pot, true));
  const lbl = document.createElement('span'); lbl.className = 'stage-chip'; lbl.textContent = `💰 Pot ${pk.pot} · ${STREET[pk.street]}`;
  pot.appendChild(lbl);
  const board = document.createElement('div');
  board.className = 'pk-board';
  for (let i = 0; i < 5; i++) {
    const c = pk.board[i] != null ? cardEl(pk.board[i]) : cardEl(-1);
    if (pk.board[i] == null) c.classList.add('empty');
    if (prev && prev.pk && pk.board[i] != null && prev.pk.board[i] == null) c.classList.add('flip-in');
    board.appendChild(c);
  }
  center.append(board, pot);
  // Phỉnh đang cược trước mặt từng người
  document.querySelectorAll('.pk-seatbet').forEach((e) => e.remove());
  pk.bet.forEach((b, seat) => {
    if (!b || seat === s.mySeat) return;
    const host = document.querySelector(`.seat[data-seat="${seat}"]`);
    if (!host) return;
    const w = document.createElement('div'); w.className = 'pk-seatbet';
    w.appendChild(chipStack(b));
    host.appendChild(w);
  });

  if (!s.hand.length) return ctx.banner(s.state === 'playing' ? '👀 Bạn sẽ vào chơi ở ván sau' : '', false);
  const me = s.mySeat;
  const row = document.createElement('div');
  row.className = 'my-cards';
  s.hand.forEach((id) => { const c = cardEl(id); c.classList.add('big-card'); if (pk.folded[me]) c.classList.add('folded'); row.appendChild(c); });
  if (!raiseOpen) box.appendChild(row);
  const info = document.createElement('div');
  info.className = 'score-chip';
  info.textContent = `🪙 ${pk.stack[me]} chip${pk.myBest ? ` · ${pk.myBest}` : ''}`;
  if (pk.bet[me]) { const mb = chipStack(pk.bet[me]); mb.classList.add('mine'); info.prepend(mb); }
  box.appendChild(info);

  const mine = s.state === 'playing' && s.turn === me;
  if (!mine) {
    raiseOpen = false;
    const t = s.seats[s.turn];
    return ctx.banner(s.state !== 'playing' ? '' : pk.folded[me] ? '🙈 Bạn đã bỏ bài, ngồi xem nha' : t ? `⏳ Chờ ${t.avatar} ${t.name}…` : '', false);
  }
  const toCall = pk.toCall;
  const maxTo = pk.bet[me] + pk.stack[me];
  const minTo = Math.min(maxTo, pk.currentBet + pk.minRaise);
  if (!raiseTo || raiseTo < minTo || raiseTo > maxTo) raiseTo = minTo;
  ctx.banner(toCall ? `✨ Theo ${Math.min(toCall, pk.stack[me])} chip hay bỏ?` : '✨ Tới lượt bạn!', true);

  const acts = document.createElement('div');
  acts.className = 'pk-actions';
  const btn = (cls, text, onClick, disabled = false) => {
    const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = text; b.disabled = disabled;
    b.onclick = () => { ctx.sfx.pop(); onClick(); }; acts.appendChild(b); return b;
  };
  btn('grey', '🙈 Bỏ', () => ctx.socket.emit('act', { a: 'fold' }));
  if (toCall === 0) btn('mint', '👀 Xem', () => ctx.socket.emit('act', { a: 'check' }));
  else btn('mint', toCall >= pk.stack[me] ? `🔥 All-in ${pk.stack[me]}` : `✅ Theo ${toCall}`, () => ctx.socket.emit('act', { a: 'call' }));
  if (maxTo > pk.currentBet && pk.stack[me] > toCall) btn('big pink', raiseOpen ? '✕ Đóng' : '⬆️ Tố', () => { raiseOpen = !raiseOpen; render(s, prev, ctx); });
  box.appendChild(acts);

  if (raiseOpen) {
    const panel = document.createElement('div');
    panel.className = 'pk-raise';
    const potNow = pk.pot;
    const presets = [
      ['Tối thiểu', minTo], ['½ pot', pk.currentBet + Math.round(potNow / 2)], ['1 pot', pk.currentBet + potNow], ['All-in', maxTo],
    ].map(([l, v]) => [l, Math.max(minTo, Math.min(maxTo, v))]);
    panel.innerHTML = `<div class="pk-presets"></div><input type="range" min="${minTo}" max="${maxTo}" value="${raiseTo}"><button class="btn big pink pk-go"></button>`;
    const go = panel.querySelector('.pk-go');
    const setTo = (v) => { raiseTo = v; panel.querySelector('input').value = v; go.textContent = v >= maxTo ? `🔥 All-in ${maxTo}` : `⬆️ Tố lên ${v}`; };
    presets.forEach(([l, v]) => { const b = document.createElement('button'); b.className = 'mini'; b.textContent = l; b.onclick = () => { setTo(v); ctx.sfx.select(); }; panel.querySelector('.pk-presets').appendChild(b); });
    panel.querySelector('input').oninput = (e) => setTo(+e.target.value);
    go.onclick = () => { raiseOpen = false; ctx.socket.emit('act', { a: raiseTo >= maxTo ? 'allin' : 'raise', to: raiseTo }); ctx.sfx.coin(); };
    setTo(raiseTo);
    box.appendChild(panel);
  }
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'pk') return;
  const { sfx } = ctx;
  const name = ctx.nameOf(ev.seat);
  if (ev.what === 'fold') { sfx.pass(); ctx.bubble(ev.seat, 'Bỏ bài 🙈'); }
  if (ev.what === 'check') { sfx.select(); ctx.bubble(ev.seat, 'Xem 👀'); }
  if (['call', 'raise', 'allin'].includes(ev.what)) {
    const from = ev.seat === ctx.mySeat() ? { x: innerWidth / 2, y: innerHeight - 200 } : seatPoint(ev.seat);
    flyChips(from, potPoint(), ev.what === 'call' ? 3 : 6);
  }
  if (ev.what === 'call') { sfx.coin(); ctx.bubble(ev.seat, ev.allin ? 'All-in! 🔥' : `Theo ${ev.amount}`); }
  if (ev.what === 'raise' || ev.what === 'allin') {
    sfx.bigCombo(); ctx.bubble(ev.seat, ev.allin ? 'ALL-IN! 🔥' : `Tố ${ev.amount}! ⬆️`);
    if (ev.allin) { ctx.bigText(`${name} ALL-IN! 🔥`, true); ctx.shake(); }
  }
  if (ev.what === 'street') { sfx.deal(); ctx.toast({ flop: '🃏 Lật 3 lá flop', turn: '🃏 Lá turn', river: '🃏 Lá river cuối cùng' }[ev.street]); }
  if (ev.what === 'runout') { sfx.deal(); ctx.toast('🔥 Mọi người all-in, lật hết bài!'); }
  if (ev.what === 'showdown') {
    if (ev.winners && ev.winners.length) {
      ev.winners.forEach((w) => setTimeout(() => flyChips(potPoint(), w === ctx.mySeat() ? { x: innerWidth / 2, y: innerHeight - 200 } : seatPoint(w), 8), 200));
      const w = ev.winners.map((s) => ctx.nameOf(s)).join(', ');
      const hand = ev.names && ev.names[ev.winners[0]];
      ctx.bigText(`${w} ăn pot! ${hand ? '· ' + hand : ''} 🤑`, true);
      ctx.confetti(); sfx.win();
    }
  }
}
