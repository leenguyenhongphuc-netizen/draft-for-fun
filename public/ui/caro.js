// Giao diện ⭕ Cờ Caro: bàn giấy ô li, X hồng – O xanh, chạm ô để đánh.
import { avaHTML } from '../ava.js';
const N = 15;
let ui = null;

export function reset() { ui = null; }

function build(board, ctx) {
  board.innerHTML = `<div class="cr-players"></div><div class="cr-paper"><div class="cr-grid"></div></div>`;
  const grid = board.querySelector('.cr-grid');
  const cells = [];
  for (let i = 0; i < N * N; i++) {
    const c = document.createElement('button');
    c.className = 'cr-cell';
    c.dataset.i = i;
    grid.appendChild(c);
    cells.push(c);
  }
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.cr-cell');
    if (!c || !cur) return;
    const s = cur;
    if (s.state !== 'playing' || s.turn !== s.mySeat) { ctx.toast('Chưa tới lượt bạn nha ⏳'); return; }
    if (s.cr.board[+c.dataset.i]) return;
    c.classList.add('pending', s.cr.mark[s.mySeat] === 1 ? 'x' : 'o');
    ctx.sfx.select();
    ctx.socket.emit('act', { a: 'move', i: +c.dataset.i });
  });
  return { board, cells, players: board.querySelector('.cr-players') };
}

let cur = null;
export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const cr = s.cr;
  cur = s;
  if (!cr) { board.className = 'hidden'; board.innerHTML = ''; ui = null; ctx.banner('', false); return; }
  board.className = 'caro';
  if (!ui || !board.contains(ui.cells[0])) ui = build(board, ctx);
  const win = new Set((cr.win || []).map(([x, y]) => y * N + x));
  cr.board.forEach((v, i) => {
    const c = ui.cells[i];
    const cls = 'cr-cell' + (v === 1 ? ' x' : v === 2 ? ' o' : '') + (i === cr.last ? ' last' : '') + (win.has(i) ? ' win' : '');
    if (c.className !== cls) c.className = cls;
  });
  // Hai người chơi
  ui.players.innerHTML = '';
  [0, 1].forEach((k) => {
    const p = s.seats[k];
    const d = document.createElement('div');
    d.className = 'cr-p' + (s.turn === k ? ' active' : '') + (k === s.mySeat ? ' me' : '');
    const mark = cr.mark[k] === 1 ? '<b class="mk x">✕</b>' : '<b class="mk o">◯</b>';
    d.innerHTML = p ? `${mark}<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span>` : `${mark}<span class="nm">Chờ người…</span>`;
    if (p) d.querySelector('.nm').textContent = p.name + (k === s.mySeat ? ' (bạn)' : '');
    ui.players.appendChild(d);
  });
  ctx.$('#stageMine').innerHTML = '';
  if (s.state === 'playing') {
    const t = s.seats[s.turn];
    if (s.turn === s.mySeat) ctx.banner(`✨ Tới lượt bạn (${cr.mark[s.mySeat] === 1 ? '✕' : '◯'}) · chạm ô để đánh`, true);
    else ctx.banner(t ? `⏳ ${t.avatar} ${t.name} đang nghĩ…` : '', false);
  } else ctx.banner('', false);
  if (prev && prev.cr && prev.cr.last !== cr.last && cr.last != null) {
    const c = ui.cells[cr.last]; c.classList.remove('drop'); void c.offsetWidth; c.classList.add('drop');
  }
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'cr') return;
  if (ev.what === 'move' && ev.seat !== ctx.mySeat()) ctx.sfx.select();
  if (ev.what === 'start') ctx.toast(`${ctx.nameOf(ev.first)} đi trước ✕`);
  if (ev.what === 'win') {
    if (ev.seat == null) { ctx.bigText('Hoà rồi! 🤝', true); return; }
    const me = ev.seat === ctx.mySeat();
    ctx.bigText(me ? 'Bạn thắng! 5 quân liền 🎉' : `${ctx.nameOf(ev.seat)} thắng! 🏆`, true);
    (me ? ctx.sfx.win : ctx.sfx.lose)();
    if (me) ctx.confetti();
  }
}
