// Giao diện 🎪 Lô Tô hội chợ (toàn màn hình):
// sân khấu (màn nhung, MC, lồng cầu) ở trên, khán giả ngồi ghế ở giữa, vé của mình ở khay dưới cùng.
// Chỉ dựng DOM một lần rồi cập nhật từng phần -> không giật khi đang vuốt xem vé.
import { avaHTML } from '../ava.js';

const BALL_COLORS = ['#ff6b81', '#ffbf3c', '#3fc97f', '#4f9dff', '#b388ff', '#ff8a65'];
const ballColor = (n) => BALL_COLORS[n % BALL_COLORS.length];
let ui = null;          // các phần tử đã dựng
let autoMark = true;
const marked = new Set();
let ticketsKey = '';
let calledCount = -1;
let audienceKey = '';
let lastPhase = '';

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

export function reset() {
  ui = null; ticketsKey = ''; calledCount = -1; audienceKey = ''; lastPhase = ''; actionsKey = ''; marked.clear();
}

function build(board, ctx) {
  board.innerHTML = `
    <div class="lt-stage">
      <div class="lt-curtain left"></div><div class="lt-curtain right"></div><div class="lt-valance"></div>
      <div class="lt-bulbs">${Array.from({ length: 16 }, (_, i) => `<i style="--d:${(i % 4) * 0.25}s"></i>`).join('')}</div>
      <div class="lt-banner">🎪 LÔ TÔ NHÀ PUM 🎪</div>
      <div class="lt-floor"></div>
      <div class="lt-mc"><span class="mc-body">🐷</span><span class="mc-hat">🎩</span><span class="mc-mic">🎤</span></div>
      <div class="lt-bubble"></div>
      <div class="lt-cage-wrap"><div class="lt-cage"><div class="spokes"></div><div class="balls">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 26}deg;--r:${16 + (i % 3) * 9}%;background:${BALL_COLORS[i % 6]}"></i>`).join('')}</div><div class="hub"></div></div><div class="lt-stand"></div></div>
      <div class="lt-ball"><span></span></div>
      <button class="lt-stop hidden">⏹ Dừng</button>
      <div class="lt-phase"></div>
    </div>
    <button class="lt-recent"></button>
    <div class="lt-full hidden"></div>
    <div class="lt-hall"><div class="lt-hall-title">🪑 Khán giả</div><div class="lt-audience"></div></div>
    <div class="lt-sheet">
      <div class="lt-sheet-head"><span class="lt-sheet-title">🎫 Vé của bạn</span><button class="mini lt-auto"></button></div>
      <div class="lt-sheet-body"></div>
      <div class="lt-sheet-actions"></div>
    </div>`;
  const q = (s) => board.querySelector(s);
  const u = {
    board, stage: q('.lt-stage'), bubble: q('.lt-bubble'), ball: q('.lt-ball'), cage: q('.lt-cage'), mc: q('.lt-mc'),
    stop: q('.lt-stop'), phase: q('.lt-phase'), recent: q('.lt-recent'), full: q('.lt-full'), audience: q('.lt-audience'),
    sheetTitle: q('.lt-sheet-title'), auto: q('.lt-auto'), body: q('.lt-sheet-body'), actions: q('.lt-sheet-actions'), cells: new Map(),
  };
  u.recent.onclick = () => { u.full.classList.toggle('hidden'); ctx.sfx.pop(); };
  u.full.onclick = () => u.full.classList.add('hidden');
  u.full.innerHTML = Array.from({ length: 90 }, (_, i) => `<i data-n="${i + 1}">${i + 1}</i>`).join('');
  u.auto.onclick = () => { autoMark = !autoMark; ctx.sfx.pop(); paintTickets(ctx); };
  u.stop.onclick = () => { if (confirm('Dừng sân khấu lô tô?')) ctx.socket.emit('act', { a: 'stop' }); };
  return u;
}

let cur = null; // state hiện tại
export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const lt = s.lt;
  cur = s;
  if (!lt) {
    if (s.state === 'waiting') { board.className = 'hidden'; board.innerHTML = ''; ui = null; }
    ctx.banner('', false); return;
  }
  board.className = 'loto';
  if (!ui || !board.contains(ui.stage)) { ui = build(board, ctx); ticketsKey = ''; calledCount = -1; audienceKey = ''; actionsKey = ''; }
  const calling = lt.phase === 'call';

  // Sân khấu
  ui.cage.classList.toggle('spin', calling);
  ui.mc.classList.toggle('talk', calling);
  ui.ball.classList.toggle('show', !!lt.last && lt.phase !== 'sell');
  ui.ball.querySelector('span').textContent = lt.last || '';
  ui.ball.style.setProperty('--bc', ballColor(lt.last || 0));
  const bubble = lt.phase === 'sell' ? `🎫 Mở bán vé vòng ${lt.round}! Mua lẹ bà con ơi!` : lt.phase === 'win' ? '🎉 Có người KINH rồi bà con ơi!' : lt.rhyme || 'Chuẩn bị xổ nè…';
  if (ui.bubble.textContent !== bubble) ui.bubble.textContent = bubble;
  ui.stop.classList.toggle('hidden', s.hostId !== ctx.playerId());
  if (lt.phase !== lastPhase) { lastPhase = lt.phase; ui.phase.textContent = { sell: '🎫 Đang bán vé', call: '🎡 Đang xổ', win: '🎉 Kinh!' }[lt.phase] || ''; }

  // Dải số đã xổ (chỉ cập nhật khi có số mới)
  if (lt.called.length !== calledCount) {
    calledCount = lt.called.length;
    ui.recent.innerHTML = `<span class="lbl">Đã xổ ${calledCount}/90 · xem bảng ›</span>` + lt.called.slice(-12).reverse().map((n, i) => `<b class="${i === 0 ? 'new' : ''}" style="--bc:${ballColor(n)}">${n}</b>`).join('');
    const set = new Set(lt.called);
    ui.full.querySelectorAll('i').forEach((el) => el.classList.toggle('on', set.has(+el.dataset.n)));
  }

  // Khán giả ngồi ghế
  const winners = new Set(lt.phase === 'win' && lt.winners ? lt.winners.seats : []);
  const aKey = s.seats.map((p, k) => (p ? `${p.id}${p.avatar}${p.acc}${p.name}${lt.counts[k] || 0}${winners.has(k) ? 'w' : ''}` : '-')).join('|');
  if (aKey !== audienceKey) {
    audienceKey = aKey;
    ui.audience.innerHTML = '';
    s.seats.forEach((p, k) => {
      if (!p) return;
      const d = document.createElement('div');
      d.className = 'lt-fan' + (winners.has(k) ? ' win' : '') + (k === s.mySeat ? ' me' : '');
      const n = lt.counts[k] || 0;
      d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="chair"></span><span class="nm"></span>${n ? `<span class="tk">🎫${n}</span>` : ''}`;
      d.querySelector('.nm').textContent = (p.isBot ? '🤖' : '') + p.name;
      ui.audience.appendChild(d);
    });
  }

  // Khay vé của mình
  const tKey = lt.round + ':' + lt.myTickets.length;
  if (tKey !== ticketsKey) { ticketsKey = tKey; buildTickets(lt, ctx); }
  paintTickets(ctx);
  renderActions(s, ctx);
}

function buildTickets(lt, ctx) {
  ui.body.innerHTML = '';
  ui.cells = new Map();
  if (!lt.myTickets.length) {
    ui.body.innerHTML = `<div class="lt-empty">${lt.phase === 'sell' ? 'Bấm “Mua vé” bên dưới để có vé dò nha 🎫' : 'Bạn chưa có vé vòng này, chờ vòng sau mua nha 👀'}</div>`;
    return;
  }
  lt.myTickets.forEach((t, ti) => {
    const el = document.createElement('div');
    el.className = 'lt-ticket';
    el.style.setProperty('--tc', ['#ff9ec7', '#7fd3ff', '#ffd36e'][ti % 3]);
    el.innerHTML = `<div class="lt-tno">Vé số ${ti + 1}</div>`;
    const grid = document.createElement('div');
    grid.className = 'lt-grid';
    t.forEach((row, r) => row.forEach((n) => {
      const c = document.createElement('i');
      if (n == null) c.className = 'blank';
      else {
        c.textContent = n;
        c.dataset.row = ti + ':' + r;
        c.onclick = () => {
          const called = new Set(cur.lt.called);
          if (autoMark || !called.has(n)) return;
          marked.has(n) ? marked.delete(n) : marked.add(n);
          ctx.sfx.select(); paintTickets(ctx);
        };
        if (!ui.cells.has(n)) ui.cells.set(n, []);
        ui.cells.get(n).push(c);
      }
      grid.appendChild(c);
    }));
    el.appendChild(grid);
    ui.body.appendChild(el);
  });
}

let canKinh = false;
function paintTickets(ctx) {
  if (!ui || !cur || !cur.lt) return;
  const lt = cur.lt;
  ui.auto.textContent = autoMark ? '🤖 Tự dò: bật' : '✋ Tự dò: tắt';
  ui.sheetTitle.textContent = lt.myTickets.length ? `🎫 Vé của bạn (${lt.myTickets.length}) · thưởng ${lt.pot} vé` : `🎫 Vé của bạn · thưởng ${lt.pot} vé`;
  const called = new Set(lt.called);
  const isMarked = (n) => called.has(n) && (autoMark || marked.has(n));
  canKinh = false;
  lt.myTickets.forEach((t, ti) => t.forEach((row, r) => {
    const nums = row.filter((n) => n != null);
    const done = nums.every(isMarked);
    const missing = nums.filter((n) => !called.has(n));
    if (done) canKinh = true;
    nums.forEach((n) => (ui.cells.get(n) || []).forEach((c) => {
      if (c.dataset.row !== ti + ':' + r) return;
      c.classList.toggle('hit', isMarked(n));
      c.classList.toggle('done', done);
      c.classList.toggle('wait', missing.length === 1 && missing[0] === n);
    }));
  }));
  const k = ui.actions.querySelector('.lt-kinh');
  if (k) k.classList.toggle('ready', canKinh);
}

let actionsKey = '';
function renderActions(s, ctx) {
  const lt = s.lt;
  const key = lt.phase + ':' + lt.myTickets.length + ':' + (s.state);
  if (key === actionsKey && ui.actions.children.length) return;
  actionsKey = key;
  ui.actions.innerHTML = '';
  if (s.state !== 'playing') { ctx.banner('', false); return; }
  if (lt.phase === 'sell') {
    const n = lt.myTickets.length;
    const b = document.createElement('button');
    b.className = 'btn big pink';
    b.disabled = n >= lt.maxTickets;
    b.textContent = n >= lt.maxTickets ? `Đã đủ ${n} vé ✅` : `🎫 Mua vé (${n}/${lt.maxTickets})`;
    b.onclick = () => { ctx.socket.emit('act', { a: 'buy' }); ctx.sfx.coin(); };
    const t = document.createElement('span');
    t.className = 'lt-count';
    t.innerHTML = 'Xổ sau <b class="sell-left"></b>s';
    ui.actions.append(b, t);
  } else if (lt.phase === 'call' && lt.myTickets.length) {
    const k = document.createElement('button');
    k.className = 'btn big lt-kinh' + (canKinh ? ' ready' : '');
    k.textContent = 'KINH! 🙌';
    k.onclick = () => {
      if (!canKinh) { ctx.toast('Chưa đủ 5 số một hàng đâu nha 😆'); ctx.sfx.error(); return; }
      ctx.socket.emit('act', { a: 'kinh' });
    };
    ui.actions.appendChild(k);
  } else {
    const t = document.createElement('span');
    t.className = 'lt-count';
    t.textContent = lt.phase === 'win' ? '🎉 Chờ mở bán vé vòng mới…' : '👀 Đang xổ, chờ vòng sau mua vé nha';
    ui.actions.appendChild(t);
  }
}

export function tick(s, ctx) {
  const el = document.querySelector('.sell-left');
  if (el && s.lt) el.textContent = Math.max(0, Math.ceil((s.lt.sellEnd - ctx.now()) / 1000));
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'lt') return;
  const { sfx } = ctx;
  if (ev.what === 'sell') { sfx.newRound(); ctx.bigText(`🎫 Mở bán vé vòng ${ev.round}!`, true); marked.clear(); }
  if (ev.what === 'calling') { sfx.train(); ctx.toast('🎡 Lồng cầu bắt đầu quay!'); speak('Bắt đầu xổ lô tô! Bà con chuẩn bị dò nha!'); }
  if (ev.what === 'call') {
    sfx.coin();
    speak(ev.rhyme);
    if (ui) { ui.ball.classList.remove('pop'); void ui.ball.offsetWidth; ui.ball.classList.add('pop'); }
  }
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
