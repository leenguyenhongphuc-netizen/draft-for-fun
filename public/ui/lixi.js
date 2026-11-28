// Giao diện 🧧 Bao Lì Xì May Mắn: chủ phòng chọn tổng tiền + số bao, mọi người chạm giành bao.
import { avaHTML } from '../ava.js';
import { fmtK, XAM } from '../game/lixi.js';

let draft = null; // {total, count} chủ phòng đang chỉnh
const fmt = (v, lx) => (lx.mode === 'tien' ? fmtK(v) : `${v} xu`);

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
  const deltaOf = (k) => (lx.rows ? (lx.rows.find((r) => r.seat === k) || {}).delta : null);

  let html = '<div class="db-players lx-players"></div>';
  if (lx.phase === 'setup') {
    if (!isHost) html += `<div class="lx-hero"><div class="lx-big">🧧</div><div class="lx-cap"></div></div>`;
  } else {
    html += `<div class="lx-info"></div><div class="lx-grid${lx.envs.length > 8 ? ' many' : ''}"></div>`;
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
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span><span class="bt">${k === lx.giver ? '🧧 Phát' : k === lx.king ? '👑' : env >= 0 ? '✓' : ''}${dl ? ` ${dl > 0 ? '+' : '−'}${lx.mode === 'tien' ? fmtK(Math.abs(dl)) : Math.abs(dl)}` : ''}</span>`;
    d.querySelector('.nm').textContent = p.name;
    pl.appendChild(d);
  });

  // 🎋 Xin xăm: ai cũng xin được, mỗi vòng 1 quẻ
  if (me >= 0) {
    const xb = document.createElement('button');
    const mineX = lx.xam && lx.xam[me];
    xb.className = 'lx-xam-btn' + (mineX != null ? ' done' : '');
    xb.innerHTML = mineX != null ? `🎋 Quẻ của bạn: <b>${XAM[mineX][0]}</b>` : '🎋 Xin xăm đầu năm';
    xb.onclick = () => { ctx.sfx.pop(); if (mineX != null) showXam(mineX, ctx); else ctx.socket.emit('act', { a: 'xam' }); };
    pl.after(xb);
  }

  if (lx.phase === 'setup') {
    if (!isHost) board.querySelector('.lx-cap').textContent = `${giver ? giver.name : 'Chủ phòng'} đang chuẩn bị lì xì…`;
    if (!isHost) return ctx.banner('🧧 Chờ chủ phòng phát lì xì nha, chuẩn bị tay giành bao!', false);
    const key = [lx.round, lx.mode, lx.step, lx.total, lx.count].join('|');
    if (!draft || draft.key !== key) draft = { key, total: lx.total, count: lx.count };
    const tien = lx.mode === 'tien';
    const F = (v) => fmt(v, lx);
    const panel = document.createElement('div');
    panel.className = 'lx-setup';
    const over = !tien && lx.hostCoins != null && draft.total > lx.hostCoins;
    const tooSmall = tien && draft.total < lx.step * draft.count;
    panel.innerHTML = `
      <div class="lx-row"><b>Lì xì bằng</b><div class="seg lx-mode"><button data-m="xu">🪙 Xu game</button><button data-m="tien">💵 Tiền thật</button></div></div>
      ${tien ? '<div class="lx-row"><b>Mệnh giá</b><div class="seg lx-stepk"></div></div>' : ''}
      <div class="lx-row"><b>Tổng tiền</b><div class="seg lx-tot"></div></div>
      <div class="lx-row"><b>Tự nhập</b><div class="lx-custom"><input type="number" inputmode="numeric" min="1" value="${draft.total}"><span>${tien ? 'k' : 'xu'}</span></div></div>
      <div class="lx-row"><b>Số bao</b><div class="lx-step"><button class="mini" data-d="-1">−</button><span class="lx-n">${draft.count}</span><button class="mini" data-d="1">+</button></div></div>
      <div class="lx-sum">${draft.count} bao · tổng <b>${F(draft.total)}</b>${tien ? ` · mỗi bao chẵn ${lx.step}k` : lx.hostCoins != null ? ` · bạn có ${lx.hostCoins} xu` : ''}${over ? ' · <span class="warn">không đủ xu</span>' : ''}${tooSmall ? ` · <span class="warn">cần ít nhất ${F(lx.step * draft.count)}</span>` : ''}</div>
      ${tien ? '<div class="lx-note">💵 Chế độ tiền thật: không trừ xu, ghi vào 📒 sổ để lì xì thật bên ngoài.</div>' : ''}
      <div class="db-chips"><button class="btn soft lx-auto">🎲 Máy tự chọn</button><button class="btn big pink lx-deal">Phát lì xì 🧧</button></div>`;
    panel.querySelectorAll('.lx-mode button').forEach((b) => {
      b.classList.toggle('sel', b.dataset.m === lx.mode);
      b.onclick = () => { ctx.sfx.select(); ctx.socket.emit('act', { a: 'setup', mode: b.dataset.m, count: draft.count }); };
    });
    if (tien) {
      const sk = panel.querySelector('.lx-stepk');
      lx.steps.forEach((v) => {
        const b = document.createElement('button'); b.textContent = v + 'k'; b.className = v === lx.step ? 'sel' : '';
        b.onclick = () => { ctx.sfx.select(); ctx.socket.emit('act', { a: 'setup', step: v, count: draft.count }); };
        sk.appendChild(b);
      });
    }
    const seg = panel.querySelector('.lx-tot');
    lx.presets.forEach((v) => {
      const b = document.createElement('button'); b.textContent = tien ? F(v) : v; b.className = v === draft.total ? 'sel' : '';
      if (!tien && lx.hostCoins != null && v > lx.hostCoins) { b.classList.add('off'); b.disabled = true; }
      b.onclick = () => { draft.total = v; ctx.sfx.select(); render(s, prev, ctx); };
      seg.appendChild(b);
    });
    const inp = panel.querySelector('.lx-custom input');
    inp.onchange = () => { const v = Math.round(+inp.value); if (v > 0) { draft.total = v; render(s, prev, ctx); } };
    panel.querySelectorAll('.lx-step button').forEach((b) => {
      b.onclick = () => { draft.count = Math.max(1, Math.min(20, draft.count + +b.dataset.d)); ctx.sfx.select(); render(s, prev, ctx); };
    });
    panel.querySelector('.lx-auto').onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'auto' }); };
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
  info.innerHTML = `<span>🧧 ${lx.envs.length} bao · tổng ${fmt(lx.total, lx)}</span><span>${lx.phase === 'open' ? `Đã giành ${taken}/${lx.envs.length} · <span class="lx-left"></span>s` : 'Mở hết bao rồi!'}</span>`;
  const grid = board.querySelector('.lx-grid');
  const canGrab = lx.phase === 'open' && me >= 0 && me !== lx.giver && lx.mine < 0;
  lx.envs.forEach((e, i) => {
    const b = document.createElement('button');
    const p = e.seat != null ? s.seats[e.seat] : null;
    b.className = 'lx-env' + (e.seat != null ? ' taken' : lx.phase === 'done' ? ' left' : '') + (e.seat === me && me >= 0 ? ' mine' : '') + (e.seat != null && e.seat === lx.king ? ' king' : '');
    b.innerHTML = `<span class="lx-seal">福</span><span class="lx-amt">${e.amt != null ? (lx.mode === 'tien' ? fmtK(e.amt) : e.amt) : ''}</span><span class="lx-who">${p ? avaHTML(p.avatar, p.acc) : lx.phase === 'done' ? '↩️' : ''}</span>`;
    b.disabled = !canGrab || e.seat != null;
    if (prev && prev.lx && prev.lx.envs[i] && prev.lx.envs[i].seat == null && e.seat != null) b.classList.add('pop');
    b.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'grab', i }); };
    grid.appendChild(b);
  });

  if (lx.phase === 'open') {
    if (me === lx.giver) ctx.banner('🧧 Bạn đang phát lì xì, xem mọi người giành bao nè', false);
    else if (lx.mine >= 0) ctx.banner(`🎉 Bạn trúng ${fmt(lx.envs[lx.mine].amt, lx)}! Chờ mọi người mở bao…`, true);
    else ctx.banner('👉 Chạm nhanh 1 bao lì xì đi nào!', true);
    if (isHost) { const r = document.createElement('div'); r.className = 'db-chips'; r.innerHTML = '<button class="btn soft">⏹ Dừng</button>'; r.firstChild.onclick = () => ctx.socket.emit('act', { a: 'stop' }); box.appendChild(r); }
    return;
  }
  // Mở hết
  const king = s.seats[lx.king];
  ctx.banner(king ? `👑 Vua may mắn: ${king.avatar} ${king.name} · ${fmt(lx.envs.find((e) => e.seat === lx.king).amt, lx)}` : '🥲 Không ai giành bao nào', true);
  if (isHost) {
    const r = document.createElement('div'); r.className = 'db-chips';
    r.innerHTML = '<button class="btn big pink">🧧 Phát vòng mới</button><button class="btn soft">⏹ Dừng</button>';
    r.children[0].onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'again' }); };
    r.children[1].onclick = () => ctx.socket.emit('act', { a: 'stop' });
    box.appendChild(r);
  }
}

function showXam(n, ctx, shake = false) {
  document.querySelector('.xam-ov')?.remove();
  const [rank, topic, text] = XAM[n];
  const ov = document.createElement('div');
  ov.className = 'xam-ov' + (shake ? ' shaking' : '');
  ov.innerHTML = `<div class="xam-tube"><i></i><i></i><i></i><i></i><i></i><span class="xam-stick"></span></div>
    <div class="xam-card"><div class="xam-no">Quẻ số ${n + 1}</div><div class="xam-rank">${rank}</div><div class="xam-topic">${topic}</div><div class="xam-text"></div><div class="xam-close">Chạm để đóng</div></div>`;
  ov.querySelector('.xam-text').textContent = text;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
  if (shake) {
    [0, 250, 500, 750].forEach((t) => setTimeout(() => ctx.sfx.diceShake(), t));
    setTimeout(() => { ov.classList.remove('shaking'); ov.classList.add('open'); ctx.sfx.bigCombo(); ctx.confetti(); }, 1300);
  } else ov.classList.add('open');
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
    if (ev.seat === ctx.mySeat()) { ctx.bigText(`+${ev.txt || ev.amt} 🧧`, true); ctx.confetti(); }
    else ctx.sysChat(`${ctx.nameOf(ev.seat)} giành được 1 bao 🧧`);
  }
  if (ev.what === 'xam') {
    if (ev.seat === ctx.mySeat()) showXam(ev.n, ctx, true);
    else ctx.sysChat(`🎋 ${ctx.nameOf(ev.seat)} xin được quẻ ${XAM[ev.n][0]} · ${XAM[ev.n][1]}`);
  }
  if (ev.what === 'reveal' && ev.king != null) {
    setTimeout(() => { ctx.bigText(`👑 ${ctx.nameOf(ev.king)}`, true); ctx.toast("Trúng bao to nhất! 🧧"); ctx.sfx.win(); ctx.confetti(); }, 300);
  }
}
