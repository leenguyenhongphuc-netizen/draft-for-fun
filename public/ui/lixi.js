// Giao diện 🧧 Bao Lì Xì May Mắn: chủ phòng chọn tổng tiền + số bao, mọi người chạm giành bao.
import { avaHTML } from '../ava.js';

let draft = null; // {total, count} chủ phòng đang chỉnh

export function reset() { draft = null; }

export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const lx = s.lx;
  const box = ctx.$('#stageMine');
  box.innerHTML = '';
  if (!lx) { board.className = 'hidden'; board.innerHTML = ''; ctx.banner('', false); return; }
  board.className = 'dicebet lixi';
  const me = s.mySeat;
  const isHost = s.hostId === ctx.playerId();
  const giver = s.seats[lx.giver];
  const L = lx.label;
  const deltaOf = (k) => (lx.rows ? (lx.rows.find((r) => r.seat === k) || {}).delta : null);

  let html = '<div class="db-players lx-players"></div>';
  if (lx.phase === 'setup') {
    html += `<div class="lx-hero"><div class="lx-big">🧧</div><div class="lx-cap"></div></div>`;
  } else {
    html += `<div class="lx-info"></div><div class="lx-grid${lx.envs.length > 12 ? ' many' : ''}"></div>`;
  }
  board.innerHTML = html;

  // Người chơi
  const pl = board.querySelector('.lx-players');
  s.seats.forEach((p, k) => {
    if (!p) return;
    const d = document.createElement('div');
    const dl = deltaOf(k);
    d.className = 'db-p' + (k === lx.giver ? ' dealer' : '') + (k === me ? ' me' : '') + (dl > 0 ? ' win' : dl < 0 ? ' lose' : '');
    const env = lx.envs.findIndex((e) => e.seat === k);
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span><span class="bt">${k === lx.giver ? '🧧 Phát' : k === lx.king ? '👑' : env >= 0 ? '✓' : ''}${dl ? ` ${dl > 0 ? '+' : ''}${dl}` : ''}</span>`;
    d.querySelector('.nm').textContent = p.name;
    pl.appendChild(d);
  });

  if (lx.phase === 'setup') {
    board.querySelector('.lx-cap').textContent = isHost ? 'Chuẩn bị lì xì cho cả nhà nào!' : `${giver ? giver.name : 'Chủ phòng'} đang chuẩn bị lì xì…`;
    if (!isHost) return ctx.banner('🧧 Chờ chủ phòng phát lì xì nha, chuẩn bị tay giành bao!', false);
    if (!draft || draft.round !== lx.round) draft = { total: lx.total, count: lx.count, round: lx.round };
    const panel = document.createElement('div');
    panel.className = 'lx-setup';
    const over = lx.hostCoins != null && draft.total > lx.hostCoins;
    panel.innerHTML = `
      <div class="lx-row"><b>Tổng tiền</b><div class="seg lx-tot"></div></div>
      <div class="lx-row"><b>Số bao</b><div class="lx-step"><button class="mini" data-d="-1">−</button><span class="lx-n">${draft.count}</span><button class="mini" data-d="1">+</button></div></div>
      <div class="lx-sum">${draft.count} bao · tổng <b>${draft.total} ${L}</b>${lx.hostCoins != null ? ` · bạn có ${lx.hostCoins} xu` : ''}${over ? ' · <span class="warn">không đủ xu</span>' : ''}</div>
      <div class="db-chips"><button class="btn soft lx-auto">🎲 Máy tự chọn</button><button class="btn big pink lx-deal">Phát lì xì 🧧</button></div>`;
    const seg = panel.querySelector('.lx-tot');
    lx.presets.forEach((v) => {
      const b = document.createElement('button'); b.textContent = v; b.className = v === draft.total ? 'sel' : '';
      if (lx.hostCoins != null && v > lx.hostCoins) b.classList.add('off');
      b.onclick = () => { draft.total = v; ctx.sfx.select(); render(s, prev, ctx); };
      seg.appendChild(b);
    });
    panel.querySelectorAll('.lx-step button').forEach((b) => {
      b.onclick = () => { draft.count = Math.max(1, Math.min(20, draft.count + +b.dataset.d)); ctx.sfx.select(); render(s, prev, ctx); };
    });
    panel.querySelector('.lx-auto').onclick = () => { draft = null; ctx.sfx.pop(); ctx.socket.emit('act', { a: 'auto' }); };
    panel.querySelector('.lx-deal').onclick = () => {
      ctx.sfx.coin();
      ctx.socket.emit('act', { a: 'setup', total: draft.total, count: draft.count });
      ctx.socket.emit('act', { a: 'deal' });
    };
    box.appendChild(panel);
    return ctx.banner('🧧 Chọn tổng tiền và số bao, hoặc để máy tự chọn', true);
  }

  // Bao lì xì
  const info = board.querySelector('.lx-info');
  const taken = lx.envs.filter((e) => e.seat != null).length;
  info.innerHTML = `<span>🧧 ${lx.envs.length} bao · tổng ${lx.total} ${L}</span><span>${lx.phase === 'open' ? `Đã giành ${taken}/${lx.envs.length} · <span class="lx-left"></span>s` : 'Mở hết bao rồi!'}</span>`;
  const grid = board.querySelector('.lx-grid');
  const canGrab = lx.phase === 'open' && me >= 0 && me !== lx.giver && lx.mine < 0;
  lx.envs.forEach((e, i) => {
    const b = document.createElement('button');
    const p = e.seat != null ? s.seats[e.seat] : null;
    b.className = 'lx-env' + (e.seat != null ? ' taken' : lx.phase === 'done' ? ' left' : '') + (e.seat === me && me >= 0 ? ' mine' : '') + (e.seat != null && e.seat === lx.king ? ' king' : '');
    b.innerHTML = `<span class="lx-seal">福</span><span class="lx-amt">${e.amt != null ? e.amt : ''}</span><span class="lx-who">${p ? avaHTML(p.avatar, p.acc) : lx.phase === 'done' ? '↩️' : ''}</span>`;
    b.disabled = !canGrab || e.seat != null;
    if (prev && prev.lx && prev.lx.envs[i] && prev.lx.envs[i].seat == null && e.seat != null) b.classList.add('pop');
    b.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'grab', i }); };
    grid.appendChild(b);
  });

  if (lx.phase === 'open') {
    if (me === lx.giver) ctx.banner('🧧 Bạn đang phát lì xì, xem mọi người giành bao nè', false);
    else if (lx.mine >= 0) ctx.banner(`🎉 Bạn trúng ${lx.envs[lx.mine].amt} ${L}! Chờ mọi người mở bao…`, true);
    else ctx.banner('👉 Chạm nhanh 1 bao lì xì đi nào!', true);
    if (isHost) { const r = document.createElement('div'); r.className = 'db-chips'; r.innerHTML = '<button class="btn soft">⏹ Dừng</button>'; r.firstChild.onclick = () => ctx.socket.emit('act', { a: 'stop' }); box.appendChild(r); }
    return;
  }
  // Mở hết
  const king = s.seats[lx.king];
  ctx.banner(king ? `👑 Vua may mắn: ${king.avatar} ${king.name} · ${lx.envs.find((e) => e.seat === lx.king).amt} ${L}` : '🥲 Không ai giành bao nào', true);
  if (isHost) {
    const r = document.createElement('div'); r.className = 'db-chips';
    r.innerHTML = '<button class="btn big pink">🧧 Phát vòng mới</button><button class="btn soft">⏹ Dừng</button>';
    r.children[0].onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'again' }); };
    r.children[1].onclick = () => ctx.socket.emit('act', { a: 'stop' });
    box.appendChild(r);
  }
}

export function tick(s, ctx) {
  const el = document.querySelector('.lx-left');
  if (el && s.lx && s.lx.phase === 'open') el.textContent = Math.max(0, Math.ceil((s.deadline - ctx.now()) / 1000));
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'lx') return;
  if (ev.what === 'deal') { ctx.sfx.deal(); ctx.bigText('Phát lì xì! 🧧', true); ctx.burst(['🧧', '💰', '✨'], 18, 1.2); }
  if (ev.what === 'grab') {
    ctx.sfx.coin();
    if (ev.seat === ctx.mySeat()) { ctx.bigText(`+${ev.amt} 🧧`, true); ctx.confetti(); }
    else ctx.toast(`${ctx.nameOf(ev.seat)} giành được 1 bao 🧧`);
  }
  if (ev.what === 'reveal' && ev.king != null) {
    setTimeout(() => { ctx.bigText(`👑 ${ctx.nameOf(ev.king)} trúng to nhất!`, true); ctx.sfx.win(); ctx.confetti(); }, 300);
  }
}
