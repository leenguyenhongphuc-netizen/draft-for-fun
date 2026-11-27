import { createScene, THEMES } from './scene3d.js';
import { RANKS, SUITS, rankOf, suitOf, getCombo, canBeat, allPlays, sortHand, TWO } from './shared/rules.js';
import { createNet } from './net.js';
import * as audio from './audio.js';

const $ = (s) => document.querySelector(s);
const AVATARS = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐷', '🐹', '🐨', '🐯', '🐻', '🐧'];
const EMOTES = ['😂', '😭', '😡', '🥰', '👍', '🔥', '🐷'];
const MEDALS = ['🥇', '🥈', '🥉', '🥔'];
const RANK_TXT = ['Nhất', 'Nhì', 'Ba', 'Bét'];

// ---------- Lưu tạm trên máy ----------
const LS = (() => { try { return new URLSearchParams(location.search).has('local') ? sessionStorage : localStorage; } catch { return null; } })();
const store = {
  get(k, d) { try { const v = LS.getItem('tlc:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { LS.setItem('tlc:' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
};
let playerId = store.get('id', null);
if (!playerId) { playerId = 'p-' + Math.random().toString(36).slice(2, 12); store.set('id', playerId); }
let myName = store.get('name', '');
let myAvatar = store.get('avatar', AVATARS[Math.floor(Math.random() * AVATARS.length)]);
let muted = store.get('muted', false);
let pickedTheme = 'candy';
let sortMode = 'rank';

// ---------- 3D ----------
const scene3d = createScene($('#bg3d'));

// ---------- Âm thanh ----------
let musicOn = store.get('music', true);
audio.setSfx(!muted);
audio.setMusic(musicOn);
// iPhone chỉ cho phát tiếng sau lần chạm đầu tiên
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => audio.unlock(), { passive: true }));
const sfx = audio.sfx;

// ---------- Socket ----------
const socket = createNet(playerId);
let state = null;
let clockOffset = 0;
let selected = new Set();
let handOrder = [];
let hintIdx = -1;
let lastTurnWasMine = false;
let resultShownFor = null;
const urlRoom = new URLSearchParams(location.search).get('room');
const LOCAL = new URLSearchParams(location.search).has('local');
const pageUrl = (code) => location.pathname + (code || LOCAL ? '?' : '') + (code ? 'room=' + code : '') + (code && LOCAL ? '&' : '') + (LOCAL ? 'local=1' : '');

socket.on('welcome', ({ coins }) => {
  $('#myCoins').textContent = coins;
  if (urlRoom && !state) socket.emit('joinRoom', { code: urlRoom });
});
socket.on('rooms', renderRooms);
socket.on('toast', toast);
socket.on('left', () => { state = null; showLobby(); history.replaceState(null, '', pageUrl()); });
socket.on('state', (s) => {
  const prev = state;
  state = s; window.__tlc = s;
  clockOffset = s.now - Date.now();
  if (!prev) showGame();
  onState(prev, s);
});
socket.on('event', onEvent);

function randomName() {
  const n = ['Mochi', 'Bánh Bao', 'Kẹo Dẻo', 'Trà Sữa', 'Bông Gòn', 'Su Kem', 'Bắp Rang'][Math.floor(Math.random() * 7)];
  myName = n; store.set('name', n); $('#nameInput').value = n;
  return n;
}

// ---------- Sảnh ----------
function initLobby() {
  $('#nameInput').value = myName;
  $('#myAvatarBig').textContent = myAvatar;
  const grid = $('#avatarGrid');
  AVATARS.forEach((a) => {
    const b = document.createElement('button');
    b.textContent = a;
    b.className = a === myAvatar ? 'sel' : '';
    b.onclick = () => {
      myAvatar = a; store.set('avatar', a);
      grid.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x.textContent === a));
      $('#myAvatarBig').textContent = a;
      sfx.pop();
      socket.emit('profile', { name: myName, avatar: a });
    };
    grid.appendChild(b);
  });
  $('#nameInput').addEventListener('change', (e) => {
    myName = e.target.value.trim().slice(0, 16); store.set('name', myName);
    socket.emit('profile', { name: myName, avatar: myAvatar });
  });

  const tp = $('#themePick');
  Object.entries(THEMES).forEach(([k, t]) => {
    const b = document.createElement('button');
    b.className = 't-' + k + (k === pickedTheme ? ' sel' : '');
    b.textContent = t.label;
    b.onclick = () => { pickedTheme = k; tp.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); scene3d.setTheme(k); audio.setTheme(k); sfx.pop(); };
    tp.appendChild(b);
  });
  const ts = $('#themeSelect');
  Object.entries(THEMES).forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = window.innerWidth < 560 ? t.label.split(' ')[0] : t.label; ts.appendChild(o); });
  ts.onchange = () => socket.emit('setTheme', { theme: ts.value });

  document.querySelectorAll('.tab').forEach((t) => (t.onclick = () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $('#tab-create').classList.toggle('hidden', t.dataset.tab !== 'create');
    $('#tab-join').classList.toggle('hidden', t.dataset.tab !== 'join');
    if (t.dataset.tab === 'join') socket.emit('listRooms');
  }));
  const ensureName = () => {
    myName = $('#nameInput').value.trim().slice(0, 16) || randomName();
    store.set('name', myName);
    socket.emit('profile', { name: myName, avatar: myAvatar });
  };
  $('#createBtn').onclick = () => {
    ensureName();
    socket.emit('createRoom', { name: $('#roomName').value, theme: pickedTheme, isPublic: $('#roomPublic').checked, bots: $('#roomBots').checked ? 3 : 0 });
  };
  $('#joinBtn').onclick = () => { ensureName(); socket.emit('joinRoom', { code: $('#codeInput').value }); };
  $('#codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#joinBtn').click(); });
  $('#refreshRooms').onclick = () => socket.emit('listRooms');
}

function renderRooms(list) {
  const el = $('#roomList');
  el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div class="empty">Chưa có phòng nào… tạo một phòng đi! 🌷</div>'; return; }
  list.forEach((r) => {
    const b = document.createElement('button');
    b.className = 'room-item';
    const icon = { candy: '🍬', garden: '🌿', night: '🌙' }[r.theme] || '🃏';
    b.innerHTML = `<span class="ri-theme">${icon}</span><span class="ri-name"></span><span class="ri-meta">${r.players}/4 người<br>${r.state === 'playing' ? 'đang chơi' : 'đang chờ'}</span>`;
    b.querySelector('.ri-name').textContent = r.name;
    b.onclick = () => { myName = $('#nameInput').value.trim() || myName || randomName(); socket.emit('profile', { name: myName, avatar: myAvatar }); socket.emit('joinRoom', { code: r.code }); };
    el.appendChild(b);
  });
}

function showLobby() {
  $('#lobby').classList.remove('hidden');
  $('#game').classList.add('hidden');
  $('#resultModal').classList.add('hidden');
  scene3d.setMode('lobby');
  scene3d.setTheme(pickedTheme);
  audio.setTheme(pickedTheme);
  socket.emit('listRooms');
}

function showGame() {
  $('#lobby').classList.add('hidden');
  $('#game').classList.remove('hidden');
  scene3d.setMode('game');
  $('#chatLog').innerHTML = '';
  sysChat('Chào mừng tới phòng! Chúc bạn may mắn 🍀');
}

// ---------- Hiển thị lá bài ----------
function cardEl(id) {
  const r = rankOf(id), s = suitOf(id);
  const d = document.createElement('div');
  d.className = 'card ' + (s >= 2 ? 'red' : 'black') + (r === TWO ? ' two' : '') + (r >= 8 && r <= 10 ? ' face' : '');
  const mid = SUITS[s];
  d.innerHTML = `<div class="tl">${RANKS[r]}<small>${SUITS[s]}</small></div><div class="mid">${mid}</div>`;
  d.dataset.id = id;
  return d;
}

// ---------- Trạng thái phòng ----------
const relPos = (seat) => (state.mySeat < 0 ? seat : (seat - state.mySeat + 4) % 4);

function onState(prev, s) {
  $('#roomTitle').textContent = s.name;
  $('#roomCode').textContent = s.code;
  $('#themeSelect').value = s.theme;
  $('#themeSelect').disabled = s.hostId !== playerId;
  scene3d.setTheme(s.theme);
  audio.setTheme(s.theme);
  if (new URLSearchParams(location.search).get('room') !== s.code) history.replaceState(null, '', pageUrl(s.code));

  const me = s.seats[s.mySeat];
  if (me) $('#myCoins').textContent = me.coins;

  // Bài trên tay: giữ thứ tự người chơi tự xếp
  const hand = s.hand || [];
  const set = new Set(hand);
  const kept = handOrder.filter((c) => set.has(c));
  const added = hand.filter((c) => !kept.includes(c));
  handOrder = added.length > 3 ? sortHand(hand, sortMode) : [...kept, ...sortHand(added, sortMode)];
  selected = new Set([...selected].filter((c) => set.has(c)));
  if (!prev || prev.state !== 'playing' || (prev.lastPlay && !s.lastPlay)) hintIdx = -1;

  renderSeats();
  renderHand(prev && prev.state !== 'playing' && s.state === 'playing');
  renderPile();
  renderControls();

  const mine = s.state === 'playing' && s.turn === s.mySeat;
  if (mine && !lastTurnWasMine) sfx.turn();
  lastTurnWasMine = mine;

  if (s.state === 'ended' && s.results && resultShownFor !== s.results) {
    resultShownFor = s.results;
    setTimeout(() => showResults(s.results), 900);
  }
  if (s.state !== 'ended') { $('#resultModal').classList.add('hidden'); resultShownFor = null; }
}

function renderSeats() {
  const s = state;
  const wrap = $('#seats');
  wrap.innerHTML = '';
  $('#meTag').innerHTML = '';
  const isHost = s.hostId === playerId;
  const scenePlayers = [null, null, null, null];
  s.seats.forEach((p, seat) => {
    const pos = relPos(seat);
    const el = document.createElement('div');
    el.className = 'seat';
    el.dataset.pos = pos;
    el.dataset.seat = seat;
    if (!p) {
      if (s.state === 'playing') return;
      const b = document.createElement('button');
      b.className = 'seat-empty' + (isHost ? '' : ' noclick');
      b.textContent = isHost ? '＋ Thêm bot' : 'Ghế trống';
      if (isHost) b.onclick = () => socket.emit('addBot', { seat });
      el.appendChild(b);
      wrap.appendChild(el);
      return;
    }
    const active = s.state === 'playing' && s.turn === seat;
    el.classList.toggle('active', active);
    el.classList.toggle('off', !p.connected);
    el.classList.toggle('me', pos === 0);
    const tag = document.createElement('div');
    tag.className = 'tag';
    const status = statusOf(p);
    tag.innerHTML = `
      ${pos === 0 ? `<div class="ava">${p.avatar}</div>` : ''}
      <div><div class="nm"></div><div class="cn">🪙 ${p.coins}</div>
      ${status ? `<div class="status ${status.cls}">${status.text}</div>` : ''}</div>
      ${p.cardCount != null && pos !== 0 && p.cardCount > 0 ? `<div class="count">${p.cardCount}</div>` : ''}
      ${p.id === s.hostId ? '<div class="host" title="Chủ phòng">👑</div>' : ''}
      ${active ? '<div class="timer"></div>' : ''}`;
    tag.querySelector('.nm').textContent = (p.isBot ? '🤖 ' : '') + p.name + (pos === 0 ? ' (bạn)' : '');
    if (isHost && pos !== 0 && s.state !== 'playing') {
      const k = document.createElement('button');
      k.className = 'kick'; k.textContent = '✕'; k.title = 'Mời ra';
      k.onclick = () => socket.emit('removeSeat', { seat });
      tag.appendChild(k);
    }
    el.appendChild(tag);
    (pos === 0 ? $('#meTag') : wrap).appendChild(el);
    scenePlayers[pos] = { avatar: p.avatar, active, passed: p.passed, rank: p.rank };
  });
  scene3d.setSeats(scenePlayers);
}

function statusOf(p) {
  if (p.rank) return { cls: 'r' + Math.min(4, p.rank), text: MEDALS[p.rank - 1] + ' ' + RANK_TXT[p.rank - 1] };
  if (!p.connected) return { cls: 'pass', text: '💤 mất mạng' };
  if (p.passed) return { cls: 'pass', text: '🙅 bỏ lượt' };
  if (state.state === 'playing' && !p.inGame) return { cls: 'wait', text: 'chờ ván sau' };
  return null;
}

// Đặt nhãn người chơi theo vị trí nhân vật 3D
const placeCache = new WeakMap();
function place(el, x, y) {
  const prev = placeCache.get(el);
  if (prev && Math.abs(prev[0] - x) < 0.5 && Math.abs(prev[1] - y) < 0.5) return;
  placeCache.set(el, [x, y]);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}
let lastTick = 0;
scene3d.onFrame = () => {
  if (!state) return;
  const seats = $('#seats').children;
  for (const el of seats) {
    const p = scene3d.seatScreen(+el.dataset.pos);
    place(el, Math.max(60, Math.min(window.innerWidth - 60, p.x)), Math.max(84, Math.min(window.innerHeight - 220, p.y)));
  }
  const c = scene3d.tableScreen();
  place($('#centerPile'), c.x, c.y);
  // Thanh thời gian + tiếng tích tắc khi sắp hết giờ
  if (state.state === 'playing' && state.deadline) {
    const left = Math.max(0, state.deadline - (Date.now() + clockOffset));
    const t = document.querySelector('.seat.active .timer');
    if (t) t.style.transform = `scaleX(${left / 25000})`;
    const mine = state.turn === state.mySeat;
    const sec = Math.ceil(left / 1000);
    document.body.classList.toggle('hurry', mine && sec <= 6 && left > 0);
    if (mine && sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; sfx.tick(); }
  } else document.body.classList.remove('hurry');
};

// Bài trên tay. Điện thoại dọc: xếp 2 hàng để lá bài to, dễ chạm.
function renderHand(deal) {
  const el = $('#hand');
  el.innerHTML = '';
  const n = handOrder.length;
  const W = Math.min(window.innerWidth - 16, 980);
  const twoRows = n > 7 && window.innerWidth < 640;
  const perRow = twoRows ? Math.ceil(n / 2) : n;
  // Lá bài to nhất có thể mà vẫn vừa
  const cw = Math.max(40, Math.min(twoRows ? 64 : 76, W / (twoRows ? Math.max(4, perRow * 0.72) : Math.max(5, n * 0.58))));
  el.style.setProperty('--hcw', cw + 'px');
  el.classList.toggle('two-rows', twoRows);
  const rows = twoRows ? [handOrder.slice(0, perRow), handOrder.slice(perRow)] : [handOrder];
  let k = 0;
  rows.forEach((row) => {
    const r = document.createElement('div');
    r.className = 'hand-row';
    const m = row.length;
    const overlap = m > 1 ? Math.max(0, Math.min(cw * 0.45, cw - (W - cw) / (m - 1))) : 0;
    row.forEach((id, i) => {
      const c = cardEl(id);
      if (selected.has(id)) c.classList.add('sel');
      if (deal) { c.classList.add('deal'); c.style.animationDelay = (k++) * 0.035 + 's'; }
      if (i > 0) c.style.marginLeft = -overlap + 'px';
      r.appendChild(c);
    });
    el.appendChild(r);
  });
}

// Chạm / kéo để chọn bài: một bộ xử lý cho cả tay bài (không giật, không cuộn trang)
let drag = null;
const cardAt = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest('#hand .card'); };
$('#hand').addEventListener('pointerdown', (e) => {
  const c = e.target.closest('.card');
  if (!c) return;
  e.preventDefault();
  const id = +c.dataset.id;
  const on = !selected.has(id);
  drag = { on, seen: new Set([id]), id: e.pointerId };
  toggle(id, on, c);
});
$('#hand').addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const c = cardAt(e.clientX, e.clientY);
  if (!c) return;
  const id = +c.dataset.id;
  if (drag.seen.has(id)) return;
  drag.seen.add(id);
  toggle(id, drag.on, c);
});
['pointerup', 'pointercancel'].forEach((ev) => window.addEventListener(ev, () => (drag = null)));
$('#hand').addEventListener('contextmenu', (e) => e.preventDefault());

let controlsQueued = false;
function toggle(id, on, el) {
  if (on) selected.add(id); else selected.delete(id);
  el.classList.toggle('sel', on);
  (on ? sfx.select : sfx.deselect)();
  if (navigator.vibrate) navigator.vibrate(8);
  if (!controlsQueued) { controlsQueued = true; requestAnimationFrame(() => { controlsQueued = false; renderControls(); }); }
}

function renderPile() {
  const s = state;
  const pile = $('#pileCards');
  const key = s.lastPlay ? s.lastPlay.cards.join(',') + '@' + s.lastPlay.seat : '';
  if (pile.dataset.key === key) return;
  pile.dataset.key = key;
  pile.innerHTML = '';
  $('#pileLabel').textContent = '';
  if (!s.lastPlay) return;
  const who = s.seats[s.lastPlay.seat];
  $('#pileLabel').textContent = `${who ? who.avatar + ' ' + who.name : ''} · ${s.lastPlay.name}`;
  // Bay từ chỗ người đánh vào giữa bàn
  const pos = relPos(s.lastPlay.seat);
  const from = pos === 0 ? { x: window.innerWidth / 2, y: window.innerHeight - 120 } : scene3d.seatScreen(pos);
  const to = scene3d.tableScreen();
  s.lastPlay.cards.forEach((id, i) => {
    const c = cardEl(id);
    const rot = (i - (s.lastPlay.cards.length - 1) / 2) * 4;
    pile.appendChild(c);
    if (c.animate) {
      c.animate([
        { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(0.5) rotate(${rot - 90}deg)`, opacity: 0.3 },
        { transform: `translate(0, -14px) scale(1.12) rotate(${rot}deg)`, opacity: 1, offset: 0.75 },
        { transform: `rotate(${rot}deg)`, opacity: 1 },
      ], { duration: 380, delay: i * 35, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    }
    c.style.transform = `rotate(${rot}deg)`;
  });
}

function renderControls() {
  const s = state;
  if (!s) return;
  const playing = s.state === 'playing';
  const inGame = s.mySeat >= 0 && s.seats[s.mySeat] && s.seats[s.mySeat].inGame;
  const mine = playing && s.turn === s.mySeat;
  const isHost = s.hostId === playerId;

  $('#actions').classList.toggle('hidden', !playing || !inGame || !handOrder.length);
  const prev = s.lastPlay ? getCombo(s.lastPlay.cards) : null;
  const combo = getCombo([...selected]);
  $('#playBtn').disabled = !mine || !combo || !canBeat(prev, combo);
  $('#passBtn').disabled = !mine || !s.lastPlay;
  $('#hintBtn').disabled = !mine;

  $('#handArea').classList.toggle('turn-on', mine);
  const banner = $('#turnBanner');
  banner.classList.toggle('mine', mine);
  if (!playing) banner.textContent = '';
  else if (!inGame) banner.textContent = '👀 Bạn sẽ vào chơi ở ván sau';
  else if (s.seats[s.mySeat].rank) banner.textContent = `🎉 Bạn về ${RANK_TXT[s.seats[s.mySeat].rank - 1]}! Ngồi xem nha`;
  else if (mine) banner.textContent = s.lastPlay ? (selected.size && combo && !canBeat(prev, combo) ? '😅 Bộ này chưa đè được' : '✨ Tới lượt bạn!') : '✨ Bạn được đánh tự do!';
  else {
    const t = s.seats[s.turn];
    banner.textContent = t ? `⏳ Chờ ${t.avatar} ${t.name}…` : '';
  }

  const waiting = s.state === 'waiting' || (s.state === 'ended' && $('#resultModal').classList.contains('hidden'));
  $('#waitPanel').classList.toggle('hidden', !waiting);
  if (waiting) {
    const count = s.seats.filter(Boolean).length;
    $('#waitTitle').textContent = s.state === 'ended' ? 'Làm thêm ván nữa không? 🃏' : count < 2 ? 'Đang chờ người chơi…' : `Đã có ${count}/4 người 🎈`;
    $('#waitSub').textContent = isHost ? (count < 4 ? 'Gửi mã phòng cho bạn bè hoặc thêm bot nhé!' : 'Đủ người rồi, bắt đầu thôi!') : 'Chờ chủ phòng 👑 bắt đầu nha…';
    $('#startBtn').classList.toggle('hidden', !isHost);
    $('#addBotBtn').classList.toggle('hidden', !isHost || count >= 4);
    $('#startBtn').disabled = count < 2;
  }
}

// ---------- Hành động ----------
$('#playBtn').onclick = () => {
  if (!selected.size) return;
  sfx.pop();
  socket.emit('play', { cards: [...selected] });
  selected.clear();
  hintIdx = -1;
};
$('#passBtn').onclick = () => { socket.emit('pass'); selected.clear(); renderHand(); renderControls(); };
$('#sortBtn').onclick = () => {
  sortMode = sortMode === 'rank' ? 'suit' : 'rank';
  handOrder = sortHand(handOrder, sortMode);
  renderHand(); sfx.deal();
  toast(sortMode === 'rank' ? 'Xếp theo số' : 'Xếp theo chất');
};
$('#hintBtn').onclick = () => {
  const prev = state.lastPlay ? getCombo(state.lastPlay.cards) : null;
  const plays = allPlays(handOrder, prev).sort((a, b) => (a.cards.length === b.cards.length ? a.top - b.top : prev ? a.top - b.top : b.cards.length - a.cards.length));
  if (!plays.length) { toast('Không có bộ nào đè được, bỏ lượt thôi 🥲'); return; }
  hintIdx = (hintIdx + 1) % plays.length;
  selected = new Set(plays[hintIdx].cards);
  renderHand(); renderControls();
};
// Bấm vào nút đang mờ thì giải thích lý do (đỡ bối rối)
$('#actions').addEventListener('pointerdown', (e) => {
  // nút bị tắt không nhận chạm (pointer-events: none) nên tự tìm nút dưới ngón tay
  const b = [...$('#actions').querySelectorAll('button')].find((x) => { const r = x.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
  if (!b || !b.disabled || !state) return;
  const mine = state.turn === state.mySeat;
  let why = '';
  if (!mine) why = 'Chưa tới lượt bạn nha ⏳';
  else if (b.id === 'playBtn') {
    const combo = getCombo([...selected]);
    why = !selected.size ? 'Chạm vào lá bài để chọn trước nha 👆' : !combo ? 'Bộ bài này không hợp lệ 🤔' : 'Bộ này chưa đè được 😅';
  } else if (b.id === 'passBtn') why = 'Bạn đang được đánh tự do, phải đánh 1 bộ nha';
  if (why) { toast(why); sfx.error(); }
});
$('#startBtn').onclick = () => socket.emit('start');
$('#againBtn').onclick = () => { $('#resultModal').classList.add('hidden'); if (state.hostId === playerId) socket.emit('start'); else renderControls(); };
$('#closeResult').onclick = () => { $('#resultModal').classList.add('hidden'); renderControls(); };
$('#addBotBtn').onclick = () => socket.emit('addBot', {});
$('#leaveBtn').onclick = () => {
  if (state && state.state === 'playing' && state.seats[state.mySeat]?.inGame && !confirm('Đang chơi dở, rời phòng thì bot sẽ đánh thay bạn. Rời nhé?')) return;
  socket.emit('leaveRoom');
};
$('#copyCode').onclick = async () => {
  const link = location.origin + pageUrl(state.code);
  try { await navigator.clipboard.writeText(link); toast('Đã sao chép link mời 💌'); }
  catch { prompt('Gửi link này cho bạn bè:', link); }
};
function syncSoundBtns() {
  document.querySelectorAll('.music-btn').forEach((b) => { b.classList.toggle('off', !musicOn); b.title = musicOn ? 'Tắt nhạc' : 'Bật nhạc'; });
  document.querySelectorAll('.sfx-btn').forEach((b) => { b.textContent = muted ? '🔇' : '🔊'; b.title = muted ? 'Bật tiếng' : 'Tắt tiếng'; });
}
document.querySelectorAll('.music-btn').forEach((b) => (b.onclick = () => { musicOn = !musicOn; store.set('music', musicOn); audio.unlock(); audio.setMusic(musicOn); syncSoundBtns(); toast(musicOn ? 'Bật nhạc 🎵' : 'Tắt nhạc'); }));
document.querySelectorAll('.sfx-btn').forEach((b) => (b.onclick = () => { muted = !muted; store.set('muted', muted); audio.setSfx(!muted); syncSoundBtns(); sfx.pop(); }));
syncSoundBtns();
$('#chatToggle').onclick = () => { $('#chatBox').classList.toggle('hidden'); if (!$('#chatBox').classList.contains('hidden')) $('#chatInput').focus(); };
$('#chatForm').onsubmit = (e) => {
  e.preventDefault();
  const t = $('#chatInput').value.trim();
  if (t) socket.emit('chat', { text: t });
  $('#chatInput').value = '';
};
EMOTES.forEach((e) => {
  const b = document.createElement('button');
  b.textContent = e;
  b.onclick = () => socket.emit('emote', { emoji: e });
  $('#emoteBar').appendChild(b);
});
document.addEventListener('keydown', (e) => {
  if (!state || document.activeElement.tagName === 'INPUT') return;
  if (e.key === 'Enter' && !$('#playBtn').disabled) $('#playBtn').click();
  if (e.key === ' ' && !$('#passBtn').disabled) { e.preventDefault(); $('#passBtn').click(); }
  if (e.key === 'h') $('#hintBtn').click();
});
let resizeT = null;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => state && renderHand(), 150); });

// ---------- Sự kiện ----------
function seatEl(seat) {
  return document.querySelector(`.seat[data-seat="${seat}"] .tag`);
}
function bubble(seat, text, emo = false) {
  const tag = seatEl(seat);
  if (!tag) return;
  const b = document.createElement('div');
  b.className = 'bubble' + (emo ? ' emo' : '');
  b.textContent = text;
  tag.parentElement.appendChild(b);
  setTimeout(() => b.remove(), emo ? 1800 : 2600);
}
function nameOf(seat) { const p = state && state.seats[seat]; return p ? p.avatar + ' ' + p.name : 'Ai đó'; }

function onEvent(ev) {
  if (!state) return;
  const pos = relPos(ev.seat ?? 0);
  switch (ev.kind) {
    case 'deal':
      sfx.deal(); handOrder = []; selected.clear();
      bigText('Chia bài! 🃏');
      scene3d.burst(['🃏', '✨'], 10, 0.7);
      break;
    case 'play': {
      const n = ev.cards.length;
      const isPig = ev.name === 'Heo' || ev.name === 'Đôi heo';
      const big = /Sảnh ([6-9]|1\d)|đôi thông|Tứ quý/.test(ev.name) || (ev.name.startsWith('Sảnh') && n >= 6);
      if (ev.chop) {
        sfx.chop();
        setTimeout(() => sfx.pig(), 350);
        bigText(`CHẶT! ${ev.name} 🔪`, true);
        shake(); flash();
        scene3d.burst(['🐷', '💥', '⭐', '🔪'], 22, 1.3);
        sysChat(`${nameOf(ev.seat)} chặt ${nameOf(ev.victim)} bằng ${ev.name} 🔪`);
        bubble(ev.victim, '😱');
      } else {
        sfx.play(n);
        if (isPig) { setTimeout(() => sfx.pig(), 120); bubble(ev.seat, ev.name + '! 🐷'); scene3d.burst(['🐷', '💗'], 10, 0.9); }
        else if (big) { sfx.bigCombo(); comboText(ev.name); scene3d.burst(['✨', '⭐', '🌟'], 16, 1); }
      }
      scene3d.hop(pos, 1);
      break;
    }
    case 'pass':
      sfx.pass(); bubble(ev.seat, 'Bỏ lượt 🙅');
      break;
    case 'newRound':
      sfx.newRound();
      if (ev.seat === state.mySeat) toast('Vòng mới — bạn được đánh tự do ✨');
      break;
    case 'out':
      sysChat(`${nameOf(ev.seat)} về ${RANK_TXT[ev.rank - 1]} ${MEDALS[ev.rank - 1]}`);
      if (ev.seat === state.mySeat) { sfx.win(); bigText(`Về ${RANK_TXT[ev.rank - 1]}! ${MEDALS[ev.rank - 1]}`, true); if (ev.rank === 1) confetti(); }
      if (ev.rank === 1) scene3d.burst(['🏆', '⭐', '🎉', '💖'], 20, 1.1);
      scene3d.hop(pos, 1.4);
      break;
    case 'instant':
      bigText(`TỚI TRẮNG! ${ev.label} 🎆`, true);
      sfx.win(); shake(); scene3d.burst(['🎆', '🌟', '💰', '🎉'], 30, 1.4);
      sysChat(`${nameOf(ev.seat)} tới trắng với ${ev.label}!`);
      confetti();
      break;
    case 'end': {
      const meRow = ev.results.find((r) => r.seat === state.mySeat);
      if (meRow) (meRow.rank === 1 ? sfx.win : meRow.delta < 0 ? sfx.lose : sfx.play)();
      break;
    }
    case 'chat': {
      const line = document.createElement('div');
      line.innerHTML = '<b></b> <span></span>';
      line.querySelector('b').textContent = ev.name + ':';
      line.querySelector('span').textContent = ev.text;
      $('#chatLog').appendChild(line);
      $('#chatLog').scrollTop = 1e9;
      bubble(ev.seat, ev.text);
      sfx.pop();
      break;
    }
    case 'emote':
      bubble(ev.seat, ev.emoji, true);
      sfx.pop();
      scene3d.hop(pos, 0.6);
      break;
  }
}

function showResults(rows) {
  const box = $('#resultRows');
  box.innerHTML = '';
  const meRow = rows.find((r) => r.seat === state.mySeat);
  $('#resultTitle').textContent = meRow ? (meRow.rank === 1 ? 'Bạn thắng rồi! 🎉' : meRow.delta >= 0 ? 'Cũng không tệ nha 😊' : 'Ván sau gỡ nha 🥺') : 'Kết thúc ván!';
  rows.forEach((r, i) => {
    const p = state.seats[r.seat];
    const d = document.createElement('div');
    d.className = 'rrow';
    d.style.animationDelay = i * 0.1 + 's';
    d.innerHTML = `<span class="medal">${MEDALS[r.rank - 1]}</span><span class="who"><span class="nmx"></span><span class="note"></span></span><span class="delta ${r.delta >= 0 ? 'plus' : 'minus'}">${r.delta >= 0 ? '+' : ''}${r.delta} 🪙</span>`;
    d.querySelector('.nmx').textContent = p ? `${p.avatar} ${p.name}${r.seat === state.mySeat ? ' (bạn)' : ''}` : 'Người chơi';
    d.querySelector('.note').textContent = r.note || (r.cardsLeft.length ? `còn ${r.cardsLeft.length} lá` : '');
    box.appendChild(d);
    countUp(d.querySelector('.delta'), r.delta, 300 + i * 120);
  });
  $('#againBtn').textContent = state.hostId === playerId ? 'Ván mới 🔁' : 'Đóng';
  $('#resultModal').classList.remove('hidden');
  if (meRow && meRow.rank === 1) confetti();
  renderControls();
}

// ---------- Hiệu ứng ----------
function bigText(text, gold = false) {
  const d = document.createElement('div');
  d.className = 'big-text' + (gold ? ' gold' : '');
  d.textContent = text;
  $('#fx').appendChild(d);
  setTimeout(() => d.remove(), 1700);
}
function comboText(name) {
  const d = document.createElement('div');
  d.className = 'combo-text';
  d.textContent = name + '! ✨';
  $('#fx').appendChild(d);
  setTimeout(() => d.remove(), 1300);
}
function shake() {
  const g = $('#game');
  g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
}
function flash() {
  const d = document.createElement('div');
  d.className = 'flash';
  $('#fx').appendChild(d);
  setTimeout(() => d.remove(), 500);
}
function countUp(el, target, delay) {
  const sign = target >= 0 ? '+' : '';
  el.textContent = sign + '0 🪙';
  setTimeout(() => {
    const t0 = performance.now(), dur = 600;
    const stepFn = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = sign + Math.round(target * k) + ' 🪙';
      if (k < 1) requestAnimationFrame(stepFn); else if (target > 0) sfx.coin();
    };
    requestAnimationFrame(stepFn);
  }, delay);
}
function confetti() {
  const pieces = ['🎉', '🎊', '💖', '⭐', '🌸', '🍬', '🐷'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.textContent = pieces[i % pieces.length];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDuration = 2 + Math.random() * 2 + 's';
    c.style.animationDelay = Math.random() * 0.8 + 's';
    $('#fx').appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}
function toast(msg) {
  const d = document.createElement('div');
  d.textContent = msg;
  $('#toast').appendChild(d);
  setTimeout(() => d.remove(), 2700);
}
function sysChat(text) {
  const d = document.createElement('div');
  d.className = 'sys';
  d.textContent = text;
  $('#chatLog').appendChild(d);
  $('#chatLog').scrollTop = 1e9;
}

initLobby();
showLobby();
socket.emit('hello', { name: myName || randomName(), avatar: myAvatar });
