// Giao diện 🧩 Đuổi Hình Bắt Chữ: thẻ emoji to, ô chữ gợi ý, ô gõ đáp án.
import { avaHTML } from '../ava.js';

let ui = null;

export function reset() { ui = null; }

function build(board, ctx) {
  board.innerHTML = `
    <div class="db-players dh-players"></div>
    <div class="dh-head"><span class="dh-q"></span><span class="dh-cat"></span><span class="dh-time"><span class="dh-left"></span>s</span></div>
    <div class="dh-card"><div class="dh-emoji"></div></div>
    <div class="dh-mask"></div>
    <div class="dh-feed"></div>`;
  const box = ctx.$('#stageMine');
  box.innerHTML = '';
  const form = document.createElement('form');
  form.className = 'dh-form';
  form.innerHTML = '<input type="text" autocomplete="off" autocapitalize="off" enterkeyhint="send" maxlength="40" placeholder="Gõ đáp án… (không dấu cũng được)"><button class="btn pink" type="submit">Đoán</button>';
  const input = form.querySelector('input');
  form.onsubmit = (e) => {
    e.preventDefault();
    const t = input.value.trim();
    if (!t) return;
    ctx.socket.emit('act', { a: 'guess', text: t });
    input.value = '';
    ctx.sfx.pop();
  };
  const host = document.createElement('div');
  host.className = 'db-chips dh-host';
  host.innerHTML = '<button class="btn soft" data-a="skip">⏭ Qua câu</button><button class="btn soft" data-a="stop">⏹ Kết thúc</button>';
  host.querySelectorAll('button').forEach((b) => { b.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: b.dataset.a }); }; });
  box.append(form, host);
  return {
    board, box, form, input, host,
    players: board.querySelector('.dh-players'), q: board.querySelector('.dh-q'), cat: board.querySelector('.dh-cat'),
    card: board.querySelector('.dh-card'), emoji: board.querySelector('.dh-emoji'), mask: board.querySelector('.dh-mask'), feed: board.querySelector('.dh-feed'), time: board.querySelector('.dh-time'),
  };
}

export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const dh = s.dh;
  if (!dh || s.state === 'waiting') { board.className = 'hidden'; board.innerHTML = ''; if (ui) ui.box.innerHTML = ''; ui = null; ctx.banner('', false); return; }
  board.className = 'dicebet duoihinh';
  if (!ui || !board.contains(ui.emoji) || !ui.box.contains(ui.form)) ui = build(board, ctx);
  const me = s.mySeat;
  const isHost = s.hostId === ctx.playerId();

  // Người chơi + điểm
  ui.players.innerHTML = '';
  s.seats.map((p, k) => [p, k]).filter(([p]) => p).sort((a, b) => (dh.score[b[0].id] || 0) - (dh.score[a[0].id] || 0)).forEach(([p, k]) => {
    const d = document.createElement('div');
    d.className = 'db-p' + (k === me ? ' me' : '') + (dh.got[k] ? ' win' : '');
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span><span class="bt">${dh.got[k] ? '✓ ' : ''}${dh.score[p.id] || 0}đ</span>`;
    d.querySelector('.nm').textContent = p.name;
    ui.players.appendChild(d);
  });

  ui.q.textContent = `Câu ${dh.q + 1}/${dh.total}`;
  ui.cat.textContent = '🏷️ ' + dh.cat;
  ui.time.classList.toggle('hidden', dh.phase !== 'q');
  if (ui.emoji.dataset.q !== String(dh.q)) {
    ui.emoji.dataset.q = dh.q;
    ui.emoji.textContent = dh.emoji;
    ui.card.classList.remove('pop'); void ui.card.offsetWidth; ui.card.classList.add('pop');
  }
  ui.card.classList.toggle('solved', dh.phase === 'reveal' || dh.myPts > 0);

  // Ô chữ: mỗi từ 1 nhóm, không bị xuống dòng giữa từ
  const key = dh.mask;
  if (ui.mask.dataset.key !== key) {
    ui.mask.dataset.key = key;
    ui.mask.innerHTML = '';
    dh.mask.split(' ').forEach((w) => {
      const g = document.createElement('span'); g.className = 'dh-word';
      [...w].forEach((c) => { const t = document.createElement('i'); t.textContent = c === '_' ? '' : c.toUpperCase(); if (c !== '_') t.className = 'on'; g.appendChild(t); });
      ui.mask.appendChild(g);
    });
  }

  // Lượt đoán gần đây
  ui.feed.innerHTML = '';
  dh.feed.slice(0, 5).forEach((f) => {
    const p = s.seats[f.seat];
    if (!p) return;
    const r = document.createElement('div');
    r.className = 'dh-f' + (f.ok ? ' ok' : f.close ? ' close' : '');
    r.textContent = f.ok ? `✅ ${p.name} đoán đúng! +${f.pts}` : `${p.avatar} ${p.name}: ${f.text}${f.close ? ' · gần đúng rồi!' : ''}`;
    ui.feed.appendChild(r);
  });

  const canGuess = s.state === 'playing' && dh.phase === 'q' && me >= 0 && !dh.myPts;
  ui.form.classList.toggle('hidden', !canGuess);
  ui.host.classList.toggle('hidden', !isHost || s.state !== 'playing');
  if (s.state !== 'playing') return ctx.banner('', false);
  if (dh.phase === 'reveal') ctx.banner(`💡 Đáp án: <b>${dh.answer.toUpperCase()}</b>`, true, true);
  else if (dh.myPts) ctx.banner(`🎉 Bạn đoán đúng, +${dh.myPts} điểm! Chờ mọi người…`, true);
  else ctx.banner('🧩 Nhìn hình đoán chữ, gõ đáp án bên dưới!', false);
}

export function tick(s, ctx) {
  const el = document.querySelector('.dh-left');
  if (el && s.dh && s.dh.phase === 'q') {
    const left = Math.max(0, Math.ceil((s.deadline - ctx.now()) / 1000));
    el.textContent = left;
    el.parentElement.classList.toggle('hurry', left <= 5);
  }
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'dh') return;
  if (ev.what === 'q') ctx.sfx.deal();
  if (ev.what === 'hint') { ctx.sfx.select(); ctx.toast('💡 Lộ thêm vài chữ cái!'); }
  if (ev.what === 'right') {
    ctx.sfx.coin();
    if (ev.seat === ctx.mySeat()) { ctx.bigText(`Chính xác! +${ev.pts} 🎉`, true); ctx.confetti(); }
    else if (ev.first) ctx.toast(`⚡ ${ctx.nameOf(ev.seat)} đoán đúng đầu tiên!`);
  }
  if (ev.what === 'reveal') { if (!ev.n) ctx.sfx.pass(); }
}
