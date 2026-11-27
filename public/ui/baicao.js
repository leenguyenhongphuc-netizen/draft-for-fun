// Giao diện 🎴 Bài Cào: chạm từng lá để "nặn" bài
export function render(s, prev, ctx) {
  const { $, cardEl } = ctx;
  const bc = s.bc || {};
  const playing = s.state === 'playing';

  const center = $('#stageCenter');
  center.innerHTML = '';
  if (s.state !== 'waiting') {
    const d = document.createElement('div');
    d.className = 'stage-chip';
    d.textContent = playing ? '🎴 Ai nhiều nút nhất ăn hết!' : '🎴 Hết ván';
    center.appendChild(d);
    if (playing) {
      const t = document.createElement('div');
      t.className = 'stage-sub countdown';
      center.appendChild(t);
    }
  }

  const box = $('#stageMine');
  box.innerHTML = '';
  if (!s.hand.length) return ctx.banner(playing ? '👀 Bạn sẽ vào chơi ở ván sau' : '', false);
  const flipped = s.state === 'ended' ? [true, true, true] : bc.flipped || [false, false, false];
  const row = document.createElement('div');
  row.className = 'my-cards cao';
  s.hand.forEach((id, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'flip-card' + (flipped[i] ? ' open' : '');
    const back = cardEl(-1); back.classList.add('big-card', 'face-back');
    const front = cardEl(id); front.classList.add('big-card', 'face-front');
    wrap.append(back, front);
    if (!flipped[i] && playing) wrap.onclick = () => { wrap.classList.add('open'); ctx.sfx.select(); ctx.socket.emit('act', { a: 'flip', i }); };
    row.appendChild(wrap);
  });
  box.appendChild(row);
  if (bc.my) {
    const chip = document.createElement('div');
    chip.className = 'score-chip ' + (bc.my.kind === 'batay' ? 'gold' : '');
    chip.textContent = bc.my.label;
    box.appendChild(chip);
  }
  if (playing && !flipped.every(Boolean)) {
    const acts = document.createElement('div');
    acts.className = 'stage-actions';
    acts.innerHTML = '<button class="btn big pink">🫣 Lật hết</button>';
    acts.querySelector('button').onclick = () => { ctx.socket.emit('act', { a: 'flipAll' }); ctx.sfx.play(3); };
    box.appendChild(acts);
    ctx.banner('🤞 Chạm từng lá để nặn bài', true);
  } else ctx.banner(playing ? '⏳ Chờ mọi người lật bài…' : '', false);
}

export function tick(s, ctx) {
  const el = document.querySelector('#stageCenter .countdown');
  if (!el || !s.deadline) return;
  const left = Math.max(0, Math.ceil((s.deadline - ctx.now()) / 1000));
  el.textContent = `⏳ Lật bài trong ${left}s`;
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'bc') return;
  if (ev.what === 'flip' && ev.seat !== ctx.mySeat()) { ctx.sfx.select(); if (ev.n === 3) ctx.hopSeat(ev.seat, 0.6); }
  if (ev.what === 'showdown') {
    ctx.sfx.deal();
    if (ev.best === 'batay') { ctx.bigText('BA TÂY! 👑', true); ctx.sfx.win(); ctx.confetti(); ctx.scene3d.burst(['👑', '🤴', '👸', '⭐'], 22, 1.2); }
    else ctx.bigText(`${ev.best} nút ăn hết! 🎉`, true);
    ev.winners.forEach((s) => ctx.hopSeat(s, 1.3));
  }
}
