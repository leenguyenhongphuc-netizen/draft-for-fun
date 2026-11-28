// Giao diện 🎡 Vòng Quay Thử Thách: vòng quay 8 ô, thẻ thử thách, bảng sao.
import { avaHTML } from '../ava.js';
import { SEGMENTS } from '../game/spin.js';

const SEG = 360 / SEGMENTS.length;
let ui = null;
let rot = 0;
let lastSpin = -1;

export function reset() { ui = null; lastSpin = -1; rot = 0; }

function build(board) {
  const grad = SEGMENTS.map((g, i) => `${g.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(',');
  board.innerHTML = `
    <div class="db-players sp-players"></div>
    <div class="sp-wrap">
      <div class="sp-pointer">▼</div>
      <div class="sp-wheel" style="background:conic-gradient(${grad})">
        ${SEGMENTS.map((g, i) => `<div class="sp-lbl" style="transform:rotate(${i * SEG + SEG / 2}deg)"><span>${g.icon}<small>${g.name}</small></span></div>`).join('')}
      </div>
      <div class="sp-hub">🎡</div>
    </div>
    <div class="sp-card hidden"></div>
    <div class="sp-hist"></div>`;
  return { board, players: board.querySelector('.sp-players'), wheel: board.querySelector('.sp-wheel'), card: board.querySelector('.sp-card'), hist: board.querySelector('.sp-hist') };
}

function aim(k, animate) {
  const c = k * SEG + SEG / 2;
  const want = (((360 - c) % 360) + 360) % 360;
  const cur = ((rot % 360) + 360) % 360;
  rot += (animate ? 360 * 6 : 0) + ((want - cur + 360) % 360);
  ui.wheel.style.transition = animate ? 'transform 4.2s cubic-bezier(.15,.75,.2,1)' : 'none';
  ui.wheel.style.transform = `rotate(${rot}deg)`;
}

export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const sp = s.sp;
  if (!sp) { board.className = 'hidden'; board.innerHTML = ''; ui = null; ctx.banner('', false); return; }
  board.className = 'dicebet spin';
  if (!ui || !board.contains(ui.wheel)) { ui = build(board); lastSpin = -1; }
  const me = s.mySeat;
  const isHost = s.hostId === ctx.playerId();

  // Người chơi + sao
  ui.players.innerHTML = '';
  s.seats.forEach((p, k) => {
    if (!p) return;
    const d = document.createElement('div');
    d.className = 'db-p' + (k === s.turn ? ' dealer' : '') + (k === me ? ' me' : '');
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span><span class="bt">⭐${sp.stars[p.id] || 0}</span>`;
    d.querySelector('.nm').textContent = p.name;
    ui.players.appendChild(d);
  });

  // Vòng quay
  if (sp.seg != null && sp.spinId !== lastSpin) {
    const animate = sp.phase === 'spinning' && lastSpin !== -1 || (sp.phase === 'spinning' && prev && prev.sp);
    lastSpin = sp.spinId;
    aim(sp.seg, !!animate);
    if (animate) ctx.sfx.deal();
  }
  ui.wheel.parentElement.classList.toggle('spinning', sp.phase === 'spinning');

  // Thẻ thử thách
  const who = s.seats[s.turn];
  const seg = sp.seg != null ? SEGMENTS[sp.seg] : null;
  const showCard = seg && (sp.phase === 'task' || sp.phase === 'penalty');
  ui.card.classList.toggle('hidden', !showCard);
  board.classList.toggle('has-card', !!showCard);
  if (showCard) {
    const key = sp.spinId + sp.phase;
    if (ui.card.dataset.key !== key) {
      ui.card.dataset.key = key;
      ui.card.style.setProperty('--c', seg.color);
      ui.card.innerHTML = `<div class="sp-tag">${seg.icon} ${seg.name}</div><div class="sp-who"></div><div class="sp-text"></div>${sp.phase === 'penalty' ? '<div class="sp-pen"></div>' : ''}`;
      ui.card.querySelector('.sp-who').textContent = who ? `${who.avatar} ${who.name}` : '';
      ui.card.querySelector('.sp-text').textContent = sp.text;
      if (sp.phase === 'penalty') ui.card.querySelector('.sp-pen').textContent = '🙈 Phạt nhẹ: ' + sp.penalty;
      ui.card.classList.remove('pop'); void ui.card.offsetWidth; ui.card.classList.add('pop');
    }
  }

  // Lịch sử
  ui.hist.innerHTML = '';
  sp.history.slice(0, 5).forEach((h) => {
    const p = s.seats[h.seat];
    const g = SEGMENTS[h.seg];
    const r = document.createElement('div');
    r.className = 'sp-h' + (h.ok ? ' ok' : ' no');
    r.textContent = `${h.ok ? '⭐' : '🙈'} ${p ? p.name : '?'} · ${g.icon} ${h.text}`;
    ui.hist.appendChild(r);
  });

  // Nút
  const box = ctx.$('#stageMine');
  box.innerHTML = '';
  if (s.state !== 'playing') return ctx.banner('', false);
  const row = document.createElement('div');
  row.className = 'db-chips';
  const btn = (cls, text, a) => {
    const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = text;
    b.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a }); };
    row.appendChild(b); return b;
  };
  const mine = s.turn === me;
  if (mine && sp.phase === 'spin') { btn('big pink sp-go', '🎡 Quay!', 'spin'); ctx.banner('✨ Tới lượt bạn quay!', true); }
  else if (mine && sp.phase === 'task') {
    btn('big mint', '✅ Làm xong', 'done');
    if (seg && seg.id !== 'mayman') btn('grey', '🙈 Chịu thua', 'skip');
    ctx.banner('💪 Làm thử thách đi nào! Cả bàn làm chứng nha', true);
  } else if (sp.phase === 'spinning') ctx.banner(`🎡 ${who ? who.name : ''} đang quay…`, false);
  else if (sp.phase === 'penalty') ctx.banner(`🙈 ${who ? who.name : ''} chịu phạt nhẹ nè!`, false);
  else ctx.banner(who ? `⏳ Chờ ${who.avatar} ${who.name} ${sp.phase === 'spin' ? 'quay' : 'làm thử thách'}…` : '', false);
  if (isHost && !mine && who && !who.isBot && sp.phase !== 'spinning') btn('soft', '⏭ Qua lượt', 'next');
  if (isHost) btn('soft sp-stop', row.children.length >= 2 ? '⏹' : '⏹ Dừng', 'stop');
  box.appendChild(row);
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'sp') return;
  if (ev.what === 'task') ctx.sfx.bigCombo();
  if (ev.what === 'done') { ctx.sfx.win(); ctx.bubble(ev.seat, 'Xong! ⭐'); ctx.burst(['⭐', '✨', '🎉'], 14, 1); }
  if (ev.what === 'skip') { ctx.sfx.pass(); ctx.bubble(ev.seat, 'Chịu thua 🙈'); }
}
