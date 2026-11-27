// Giao diện 🎪 Lô Tô hội chợ: sân khấu màn đỏ, MC, lồng cầu quay, khán giả ngồi dò vé.
let built = null;
let autoMark = true;
const marked = new Set(); // số người chơi tự đánh dấu (khi tắt tự dò)
let lastRound = -1;

const BALL_COLORS = ['#ff6b81', '#ffbf3c', '#3fc97f', '#4f9dff', '#b388ff', '#ff8a65'];
const ballColor = (n) => BALL_COLORS[n % BALL_COLORS.length];

function speak(text) {
  try {
    if (!window.speechSynthesis || localStorage.getItem('tlc:muted') === 'true') return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN'; u.rate = 1.05; u.pitch = 1.15;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('vi'));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* máy không hỗ trợ đọc */ }
}

function build(board) {
  board.innerHTML = `
    <div class="lt-stage">
      <div class="lt-curtain left"></div><div class="lt-curtain right"></div>
      <div class="lt-bulbs">${Array.from({ length: 14 }, (_, i) => `<i style="--d:${(i % 4) * 0.25}s"></i>`).join('')}</div>
      <div class="lt-banner">🎪 LÔ TÔ NHÀ PUM 🎪</div>
      <div class="lt-mc"><span class="mc-body">🐷</span><span class="mc-mic">🎤</span></div>
      <div class="lt-bubble"></div>
      <div class="lt-cage"><div class="spokes"></div><div class="balls">${Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg;--r:${18 + (i % 3) * 8}%;background:${BALL_COLORS[i % 6]}"></i>`).join('')}</div><div class="hub"></div></div>
      <div class="lt-stand"></div>
      <div class="lt-ball"><span></span></div>
      <button class="lt-stop hidden">⏹ Dừng</button>
    </div>
    <div class="lt-recent"></div>
    <div class="lt-audience"></div>
    <div class="lt-full hidden"></div>`;
  board.querySelector('.lt-recent').onclick = () => board.querySelector('.lt-full').classList.toggle('hidden');
  board.querySelector('.lt-full').onclick = (e) => e.currentTarget.classList.add('hidden');
  return { board };
}

export function render(s, prev, ctx) {
  const { $ } = ctx;
  const board = $('#board');
  const lt = s.lt;
  if (!lt) { board.className = 'hidden'; $('#stageMine').innerHTML = ''; ctx.banner('', false); return; }
  board.className = 'loto';
  if (!built || !board.contains(built.board.firstElementChild)) built = build(board);
  if (lt.round !== lastRound) { lastRound = lt.round; marked.clear(); }
  const calling = lt.phase === 'call';
  board.querySelector('.lt-cage').classList.toggle('spin', calling);
  board.querySelector('.lt-mc').classList.toggle('talk', calling);
  const ball = board.querySelector('.lt-ball');
  ball.classList.toggle('show', !!lt.last && lt.phase !== 'sell');
  ball.querySelector('span').textContent = lt.last || '';
  ball.style.setProperty('--bc', ballColor(lt.last || 0));
  const bubble = board.querySelector('.lt-bubble');
  bubble.textContent = lt.phase === 'sell' ? `🎫 Mở bán vé vòng ${lt.round}! Mua lẹ bà con ơi!` : lt.phase === 'win' ? '🎉 Có người KINH rồi bà con ơi!' : lt.rhyme || 'Chuẩn bị xổ nè…';
  const stop = board.querySelector('.lt-stop');
  stop.classList.toggle('hidden', s.hostId !== ctx.playerId());
  stop.onclick = () => { if (confirm('Dừng sân khấu lô tô?')) ctx.socket.emit('act', { a: 'stop' }); };

  // Số đã xổ gần đây + bảng đầy đủ
  const recent = board.querySelector('.lt-recent');
  recent.innerHTML = `<span class="lbl">Đã xổ ${lt.called.length}/90 ›</span>` + lt.called.slice(-10).reverse().map((n, i) => `<b class="${i === 0 ? 'new' : ''}" style="--bc:${ballColor(n)}">${n}</b>`).join('');
  const full = board.querySelector('.lt-full');
  const calledSet = new Set(lt.called);
  full.innerHTML = Array.from({ length: 90 }, (_, i) => `<i class="${calledSet.has(i + 1) ? 'on' : ''}">${i + 1}</i>`).join('');

  // Khán giả
  const aud = board.querySelector('.lt-audience');
  aud.innerHTML = '';
  const winners = new Set(lt.phase === 'win' && lt.winners ? lt.winners.seats : []);
  s.seats.forEach((p, k) => {
    if (!p) return;
    const d = document.createElement('div');
    d.className = 'lt-fan' + (winners.has(k) ? ' win' : '') + (k === s.mySeat ? ' me' : '');
    const n = lt.counts[k] || 0;
    d.innerHTML = `<span class="av">${p.avatar}</span><span class="nm"></span>${n ? `<span class="tk">🎫${n}</span>` : ''}`;
    d.querySelector('.nm').textContent = p.name;
    aud.appendChild(d);
  });

  // Phần của mình
  const box = $('#stageMine');
  box.innerHTML = '';
  if (s.state !== 'playing') { ctx.banner('', false); return; }
  if (lt.phase === 'sell') {
    const left = Math.max(0, Math.ceil((lt.sellEnd - ctx.now()) / 1000));
    const mineN = lt.myTickets.length;
    const acts = document.createElement('div');
    acts.className = 'stage-actions';
    acts.innerHTML = `<button class="btn big pink" ${mineN >= lt.maxTickets ? 'disabled' : ''}>🎫 Mua vé (${mineN}/${lt.maxTickets})</button>`;
    acts.querySelector('button').onclick = () => { ctx.socket.emit('act', { a: 'buy' }); ctx.sfx.coin(); };
    box.appendChild(acts);
    ctx.banner(`🎫 Mua vé đi! Xổ sau <span class="sell-left">${left}</span>s · tiền thưởng ${lt.pot} vé`, mineN > 0, true);
  } else {
    ctx.banner(lt.myTickets.length ? (lt.phase === 'win' ? '🎉 Hết vòng! Chờ mở bán vé mới…' : `🔢 Dò vé đi! Tiền thưởng ${lt.pot} vé`) : '👀 Bạn chưa có vé, chờ vòng sau mua nha', false);
  }
  if (lt.myTickets.length) {
    const wrap = document.createElement('div');
    wrap.className = 'lt-tickets';
    let canKinh = false;
    lt.myTickets.forEach((t, ti) => {
      const el = document.createElement('div');
      el.className = 'lt-ticket';
      el.style.setProperty('--tc', ['#ff9ec7', '#7fd3ff', '#ffd36e'][ti % 3]);
      t.forEach((row) => {
        const isMarked = (n) => (autoMark ? calledSet.has(n) : marked.has(n));
        const done = row.filter((n) => n != null).every((n) => calledSet.has(n) && isMarked(n));
        const missing = row.filter((n) => n != null && !calledSet.has(n));
        if (done) canKinh = true;
        row.forEach((n) => {
          const c = document.createElement('i');
          if (n == null) c.className = 'blank';
          else {
            c.textContent = n;
            if (isMarked(n)) c.className = 'hit';
            if (done) c.classList.add('done');
            if (missing.length === 1 && missing[0] === n) c.classList.add('wait');
            c.onclick = () => { if (!autoMark && calledSet.has(n)) { marked.has(n) ? marked.delete(n) : marked.add(n); ctx.sfx.select(); render(s, prev, ctx); } };
          }
          el.appendChild(c);
        });
      });
      wrap.appendChild(el);
    });
    box.appendChild(wrap);
    const tools = document.createElement('div');
    tools.className = 'stage-actions';
    tools.innerHTML = `<button class="btn soft lt-auto">${autoMark ? '🤖 Tự dò: bật' : '✋ Tự dò: tắt'}</button>` + (calling ? `<button class="btn big lt-kinh ${canKinh ? 'ready' : ''}">KINH! 🙌</button>` : '');
    tools.querySelector('.lt-auto').onclick = () => { autoMark = !autoMark; ctx.sfx.pop(); render(s, prev, ctx); };
    const k = tools.querySelector('.lt-kinh');
    if (k) k.onclick = () => { if (!canKinh) { ctx.toast('Chưa đủ 5 số một hàng đâu nha 😆'); ctx.sfx.error(); return; } ctx.socket.emit('act', { a: 'kinh' }); };
    box.appendChild(tools);
  }
}

export function tick(s, ctx) {
  const el = document.querySelector('.sell-left');
  if (el && s.lt) el.textContent = Math.max(0, Math.ceil((s.lt.sellEnd - ctx.now()) / 1000));
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'lt') return;
  const { sfx } = ctx;
  if (ev.what === 'sell') { sfx.newRound(); ctx.bigText(`🎫 Mở bán vé vòng ${ev.round}!`, true); }
  if (ev.what === 'calling') { sfx.train(); ctx.toast('🎡 Lồng cầu bắt đầu quay!'); speak('Bắt đầu xổ lô tô! Bà con chuẩn bị dò nha!'); }
  if (ev.what === 'call') {
    sfx.coin();
    speak(ev.rhyme);
    if (navigator.vibrate) navigator.vibrate(15);
  }
  if (ev.what === 'buy') { if (ev.seat !== ctx.mySeat()) ctx.hopSeat(ev.seat, 0.3); }
  if (ev.what === 'almost') { sfx.tick(); ctx.toast('😱 Có người kinh rồi kìa!'); }
  if (ev.what === 'shout') { ctx.bigText(`${ctx.nameOf(ev.seat)}: KINH!!! 🙌`, true); sfx.stamp(); }
  if (ev.what === 'noTickets') ctx.toast('Chưa ai mua vé, mở bán lại nha 🎫');
  if (ev.what === 'kinh') {
    const me = ev.seats.includes(ctx.mySeat());
    ctx.bigText(me ? 'BẠN KINH RỒI!!! 🎉💰' : `${ev.seats.map((s) => ctx.nameOf(s)).join(', ')} KINH! 🎉`, true);
    (me ? sfx.win : sfx.bigCombo)();
    ctx.confetti();
    speak(me ? 'Chúc mừng! Bạn kinh rồi!' : 'Có người kinh rồi! Chúc mừng!');
  }
}
