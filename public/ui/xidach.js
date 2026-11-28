// Giao diện 🂡 Xì Dách
let lastKind = null;

export function reset() { lastKind = null; }

export function render(s, prev, ctx) {
  const { $, cardEl, nameOf } = ctx;
  const xd = s.xd || {};
  const me = s.mySeat;
  const playing = s.state === 'playing';
  const mine = playing && s.turn === me;
  const isDealer = xd.dealer === me;

  // Giữa bàn
  const center = $('#stageCenter');
  center.innerHTML = '';
  if (xd.dealer != null && s.state !== 'waiting') {
    const d = document.createElement('div');
    d.className = 'stage-chip';
    d.textContent = `🎩 Nhà cái: ${nameOf(xd.dealer)}`;
    center.appendChild(d);
    if (playing) {
      const t = document.createElement('div');
      t.className = 'stage-sub';
      t.textContent = xd.phase === 'dealer' ? 'Nhà cái đang rút bài… 🤞' : 'Người chơi rút bài';
      center.appendChild(t);
    }
  }

  // Bài của mình
  const box = $('#stageMine');
  box.innerHTML = '';
  if (!s.hand.length) { lastKind = null; return ctx.banner(playing ? '👀 Bạn sẽ vào chơi ở ván sau' : '', false); }
  const row = document.createElement('div');
  row.className = 'my-cards';
  s.hand.forEach((id, i) => {
    const c = cardEl(id);
    c.classList.add('big-card');
    if (prev && prev.hand && i >= prev.hand.length) c.classList.add('drawn');
    row.appendChild(c);
  });
  box.appendChild(row);
  const my = xd.my || {};
  const chip = document.createElement('div');
  chip.className = 'score-chip ' + (my.kind === 'quac' ? 'bad' : my.kind && my.kind !== 'normal' ? 'gold' : '');
  chip.textContent = (isDealer ? '🎩 ' : '') + (my.label || '');
  box.appendChild(chip);

  // Quắc: chỉ mình mình biết, nhắc nhỏ để giữ bí mật
  if (my.kind === 'quac' && lastKind !== 'quac' && prev) ctx.toast('🤫 Quắc rồi… bình tĩnh, cứ dằn hoặc rút tiếp cho người khác không đoán ra');
  lastKind = my.kind;

  if (mine) {
    const acts = document.createElement('div');
    acts.className = 'stage-actions';
    const canStand = my.score >= my.need || my.kind === 'quac' || s.hand.length >= 5;
    acts.innerHTML = `<button class="btn big mint" data-a="hit">🃏 Rút</button><button class="btn big pink" data-a="stand">✋ Dằn</button>`;
    const standBtn = acts.querySelector('[data-a=stand]');
    if (!canStand) standBtn.classList.add('soft-disabled');
    if (s.hand.length >= 5) acts.querySelector('[data-a=hit]').disabled = true;
    acts.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      if (b.classList.contains('soft-disabled')) { ctx.toast(isDealer ? 'Nhà cái phải đủ 15 nút mới được dằn' : 'Chưa đủ tuổi (16 nút), rút thêm nha'); ctx.sfx.error(); return; }
      ctx.socket.emit('act', { a: b.dataset.a }); ctx.sfx.pop();
    }));
    box.appendChild(acts);
    ctx.banner(isDealer ? '🎩 Nhà cái: rút hay dằn?' : '✨ Tới lượt bạn: rút hay dằn?', true);
  } else if (playing) {
    const t = s.seats[s.turn];
    ctx.banner(t ? `⏳ Chờ ${t.avatar} ${t.name}…` : '', false);
  } else ctx.banner('', false);
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'xd') return;
  const { sfx } = ctx;
  if (ev.what === 'xiban' || ev.what === 'xidach') {
    ctx.bigText(ev.what === 'xiban' ? 'XÌ BÀN!! 🂡🂡' : 'XÌ DÁCH! 🂡', true);
    sfx.win(); ctx.confetti(); ctx.scene3d.burst(['🂡', '⭐', '💰'], 20, 1.2);
    ctx.sysChat(`${ctx.nameOf(ev.seat)} có ${ev.what === 'xiban' ? 'xì bàn' : 'xì dách'}!`);
  }
  if (ev.what === 'ngulinh') { ctx.bigText('NGŨ LINH! 🐉', true); sfx.bigCombo(); ctx.scene3d.burst(['🐉', '✨', '⭐'], 18, 1.1); }
  if (ev.what === 'hit') { sfx.play(1); ctx.hopSeat(ev.seat, 0.5); }
  if (ev.what === 'stand') { sfx.pass(); ctx.bubble(ev.seat, 'Dằn ✋'); }
  if (ev.what === 'dealerTurn') { ctx.toast('🎩 Tới lượt nhà cái'); sfx.newRound(); }
  if (ev.what === 'showdown') { sfx.deal(); ctx.bigText('Lật bài! 🃏'); }
}
