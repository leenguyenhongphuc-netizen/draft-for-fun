// Giao diện 🏇 Đua Thú: chọn thú, trường đua hình bầu dục, chạy 2 vòng.
import { avaHTML } from '../ava.js';
import { ANIMALS, LAPS, progressAt } from '../game/duathu.js';

let ui = null;
let raf = 0;
let st = null; // trạng thái mới nhất
let lastLeader = -1;
let lastCount = -1;

export function reset() { cancelAnimationFrame(raf); raf = 0; ui = null; st = null; lastLeader = -1; lastCount = -1; }

function build(board) {
  board.innerHTML = `
    <div class="db-players dt-players"></div>
    <div class="dt-track">
      <div class="dt-ring"></div>
      <div class="dt-field"><div class="dt-center"><div class="dt-big"></div><div class="dt-sub"></div></div></div>
      <div class="dt-start"></div>
      <div class="dt-runners">${ANIMALS.map((a, i) => `<div class="dt-runner" data-i="${i}"><span class="dt-ico">${a.icon}</span><span class="dt-tag"></span></div>`).join('')}</div>
    </div>
    <div class="dt-pick"></div>`;
  return {
    board, players: board.querySelector('.dt-players'), track: board.querySelector('.dt-track'), big: board.querySelector('.dt-big'), sub: board.querySelector('.dt-sub'),
    runners: [...board.querySelectorAll('.dt-runner')], pick: board.querySelector('.dt-pick'),
  };
}

/** Vị trí trên đường bầu dục: làn i, tiến độ p (0..1 cho cả LAPS vòng) */
function place(i, p, W, H) {
  const lane = Math.min(W, H) * 0.045;
  const rx = W / 2 - lane * (i + 0.8), ry = H / 2 - lane * (i + 0.8);
  const th = Math.PI / 2 + p * LAPS * Math.PI * 2;
  return { x: W / 2 + rx * Math.cos(th), y: H / 2 + ry * Math.sin(th), dx: -Math.sin(th) };
}

function frame() {
  raf = 0;
  if (!ui || !st || !st.dt || !st.dt.race) return;
  const dt = st.dt;
  const W = ui.track.clientWidth, H = ui.track.clientHeight;
  ui.track.style.setProperty('--lane', Math.min(W, H) * 0.045 + 'px');
  const t = ui.ctx.now() - dt.startAt;
  const prog = dt.race.map((r) => progressAt(r, t));
  const owner = {}; Object.entries(dt.pick).forEach(([s, i]) => { owner[i] = +s; });
  // Thứ tự về đích (con nào về rồi)
  const finished = dt.race.map((r, i) => [i, r.T]).filter(([, T]) => t >= T).sort((a, b) => a[1] - b[1]).map(([i]) => i);
  ui.runners.forEach((el, i) => {
    const q = place(i, prog[i], W, H);
    const r = dt.race[i];
    const k = Math.floor((t / r.T) * 48);
    const zoom = r.burst >= 0 && k - r.burst >= 0 && k - r.burst < 4 && t < r.T;
    const nap = ANIMALS[i].id === 'tho' && k > 14 && k < 22 && t < r.T;
    el.style.transform = `translate(${q.x}px, ${q.y}px)`;
    el.querySelector('.dt-ico').style.transform = `scaleX(${q.dx > 0 ? -1 : 1})`;
    const pl = finished.indexOf(i);
    el.querySelector('.dt-tag').textContent = pl >= 0 ? ['🥇', '🥈', '🥉'][pl] || `${pl + 1}` : nap ? '💤' : zoom ? '💨' : '';
    el.classList.toggle('mine', owner[i] === st.mySeat && st.mySeat >= 0);
    el.classList.toggle('owned', owner[i] != null);
    el.classList.toggle('run', t > 0 && t < r.T);
  });
  // Bình luận giữa sân
  if (t < 0) {
    const c = Math.ceil(-t / 1000);
    ui.big.textContent = c > 0 ? c : '';
    ui.sub.textContent = 'Chuẩn bị…';
    if (c !== lastCount) { lastCount = c; ui.ctx.sfx.select(); }
  } else if (finished.length < ANIMALS.length) {
    if (lastCount !== 0) { lastCount = 0; ui.ctx.sfx.bigCombo(); ui.ctx.bigText('XUẤT PHÁT! 🏁', true); }
    const lead = prog.indexOf(Math.max(...prog));
    const a = ANIMALS[finished.length ? finished[0] : lead];
    const lap = Math.min(LAPS, Math.floor(Math.max(...prog) * LAPS) + 1);
    ui.big.textContent = a.icon;
    ui.sub.textContent = finished.length ? `${a.name} về nhất!` : `${a.name} dẫn đầu · vòng ${lap}/${LAPS}`;
    if (!finished.length && lead !== lastLeader && t > 1500) { lastLeader = lead; ui.ctx.sfx.pop(); }
  } else {
    const a = ANIMALS[finished[0]];
    ui.big.textContent = '🏆' + a.icon;
    ui.sub.textContent = `${a.name} vô địch!`;
  }
  if (finished.length < ANIMALS.length || t < 0) raf = requestAnimationFrame(frame);
}

export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const dt = s.dt;
  st = s;
  if (!dt || s.state === 'waiting') { reset(); board.className = 'hidden'; board.innerHTML = ''; ctx.banner('', false); return; }
  board.className = 'dicebet duathu';
  if (!ui || !board.contains(ui.track)) ui = build(board);
  ui.ctx = ctx;
  ui.track.style.setProperty('--lane', (Math.min(ui.track.clientWidth || 300, ui.track.clientHeight || 400) * 0.045) + 'px');
  const me = s.mySeat;
  const isHost = s.hostId === ctx.playerId();
  const owner = {}; Object.entries(dt.pick).forEach(([k, i]) => { owner[i] = +k; });

  // Người chơi + thú đã chọn
  ui.players.innerHTML = '';
  s.seats.forEach((p, k) => {
    if (!p) return;
    const a = dt.pick[k] != null ? ANIMALS[dt.pick[k]] : null;
    const res = s.state === 'ended' && s.results ? s.results.find((r) => r.seat === k) : null;
    const d = document.createElement('div');
    d.className = 'db-p' + (k === me ? ' me' : '') + (res ? (res.delta > 0 ? ' win' : res.delta < 0 ? ' lose' : '') : '');
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span><span class="bt">${a ? a.icon : '…'}${res && res.delta ? ` ${res.delta > 0 ? '+' : ''}${res.delta}` : ''}</span>`;
    d.querySelector('.nm').textContent = p.name;
    ui.players.appendChild(d);
  });

  // Chọn thú
  ui.pick.innerHTML = '';
  ui.pick.classList.toggle('hidden', dt.phase !== 'pick');
  ui.track.classList.toggle('picking', dt.phase === 'pick');
  void ui.track.offsetWidth;
  if (dt.phase === 'pick') {
    ANIMALS.forEach((a, i) => {
      const b = document.createElement('button');
      const o = owner[i] != null ? s.seats[owner[i]] : null;
      b.className = 'dt-opt' + (owner[i] === me && me >= 0 ? ' mine' : o ? ' taken' : '');
      b.style.setProperty('--c', a.color);
      b.innerHTML = `<span class="ic">${a.icon}</span><b>${a.name}</b><span class="who">${o ? avaHTML(o.avatar, o.acc) : ''}</span>`;
      b.disabled = !!o && owner[i] !== me;
      b.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'pick', i }); };
      ui.pick.appendChild(b);
    });
    const W0 = ui.track.clientWidth || 300, H0 = ui.track.clientHeight || 400;
    ui.track.style.setProperty('--lane', Math.min(W0, H0) * 0.045 + 'px');
    ui.runners.forEach((el, i) => { const q = place(i, 0, W0, H0); el.style.transform = `translate(${q.x}px, ${q.y}px)`; el.classList.toggle('mine', owner[i] === me && me >= 0); el.classList.toggle('owned', owner[i] != null); el.querySelector('.dt-tag').textContent = ''; });
    ui.big.textContent = '🏁';
    ui.sub.innerHTML = 'Chọn thú · còn <span class="dt-left"></span>s';
  } else if (!raf) raf = requestAnimationFrame(frame);

  const box = ctx.$('#stageMine');
  box.innerHTML = '';
  if (s.state !== 'playing') return ctx.banner('', false);
  if (dt.phase === 'pick') {
    if (isHost) {
      const r = document.createElement('div'); r.className = 'db-chips';
      r.innerHTML = '<button class="btn big pink">🏁 Xuất phát luôn</button>';
      r.firstChild.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'go' }); };
      box.appendChild(r);
    }
    const mine = dt.pick[me];
    ctx.banner(mine != null ? `${ANIMALS[mine].icon} Bạn chọn ${ANIMALS[mine].name}! Chờ mọi người chọn…` : '👇 Chọn 1 con thú để đua nha!', mine == null);
  } else {
    const mine = dt.pick[me];
    ctx.banner(mine != null ? `📣 Cố lên ${ANIMALS[mine].icon} ${ANIMALS[mine].name}!` : '👀 Xem đua nè', true);
  }
}

export function tick(s, ctx) {
  const el = document.querySelector('.dt-left');
  if (el && s.dt && s.dt.phase === 'pick') el.textContent = Math.max(0, Math.ceil((s.deadline - ctx.now()) / 1000));
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'dt') return;
  if (ev.what === 'pick') ctx.sfx.select();
  if (ev.what === 'go') { lastLeader = -1; lastCount = -1; ctx.toast('🏁 Các tay đua vào vạch xuất phát!'); }
  if (ev.what === 'finish') {
    const a = ANIMALS[ev.winner];
    if (ev.seat != null && ev.seat === ctx.mySeat()) { ctx.confetti(); ctx.sfx.win(); }
    ctx.sysChat(`🏆 ${a.icon} ${a.name} về nhất${ev.seat != null ? ` · chủ nhân ${ctx.nameOf(ev.seat)}` : ' (thú hoang)'}`);
  }
}
