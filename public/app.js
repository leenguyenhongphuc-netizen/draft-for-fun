import { createScene, THEMES } from './scene3d.js';
import { RANKS, SUITS, rankOf, suitOf, getCombo, canBeat, allPlays, sortHand, TWO } from '/shared/rules.js';

const $ = (s) => document.querySelector(s);
const AVATARS = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐷', '🐹', '🐨', '🐯', '🐻', '🐧'];
const EMOTES = ['😂', '😭', '😡', '🥰', '👍', '🔥', '🐷'];
const MEDALS = ['🥇', '🥈', '🥉', '🥔'];
const RANK_TXT = ['Nhất', 'Nhì', 'Ba', 'Bét'];

// ---------- Lưu tạm trên máy ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('tlc:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tlc:' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
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

// ---------- Âm thanh nhỏ xinh ----------
let actx = null;
function beep(notes, type = 'sine', dur = 0.09, vol = 0.12) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    let t = actx.currentTime;
    for (const f of notes) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.8);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + dur * 2);
      t += dur;
    }
  } catch { /* không có âm thanh */ }
}
const sfx = {
  play: () => beep([660, 880], 'triangle', 0.06),
  pass: () => beep([330, 260], 'sine', 0.08, 0.08),
  turn: () => beep([784, 988, 1175], 'sine', 0.07, 0.1),
  chop: () => beep([200, 150, 900, 1200], 'square', 0.07, 0.07),
  win: () => beep([523, 659, 784, 1046, 1318], 'triangle', 0.1),
  lose: () => beep([392, 330, 262], 'sine', 0.14),
  pop: () => beep([1200], 'sine', 0.04, 0.06),
  deal: () => beep([500, 600, 700, 800], 'triangle', 0.04, 0.05),
};

// ---------- Socket ----------
const socket = io({ transports: ['websocket', 'polling'] });
let state = null;
let clockOffset = 0;
let selected = new Set();
let handOrder = [];
let hintIdx = -1;
let lastTurnWasMine = false;
let resultShownFor = null;
const urlRoom = new URLSearchParams(location.search).get('room');

socket.on('connect', () => socket.emit('hello', { playerId, name: myName || randomName(), avatar: myAvatar }));
socket.on('welcome', ({ coins }) => {
  $('#myCoins').textContent = coins;
  if (urlRoom && !state) socket.emit('joinRoom', { code: urlRoom });
});
socket.on('rooms', renderRooms);
socket.on('toast', toast);
socket.on('left', () => { state = null; showLobby(); history.replaceState(null, '', location.pathname); });
socket.on('state', (s) => {
  const prev = state;
  state = s;
  clockOffset = s.now - Date.now();
  if (!prev) showGame();
  onState(prev, s);
});
socket.on('event', onEvent);
socket.on('disconnect', () => toast('Mất kết nối… đang thử lại 🛜'));

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
    b.onclick = () => { pickedTheme = k; tp.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); scene3d.setTheme(k); sfx.pop(); };
    tp.appendChild(b);
  });
  const ts = $('#themeSelect');
  Object.entries(THEMES).forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = t.label; ts.appendChild(o); });
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
  if (history.replaceState && new URLSearchParams(location.search).get('room') !== s.code) history.replaceState(null, '', '?room=' + s.code);

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
scene3d.onFrame = () => {
  if (!state) return;
  document.querySelectorAll('#seats .seat').forEach((el) => {
    const pos = +el.dataset.pos;
    const p = scene3d.seatScreen(pos);
    const margin = 60;
    el.style.left = Math.max(margin, Math.min(window.innerWidth - margin, p.x)) + 'px';
    el.style.top = Math.max(80, Math.min(window.innerHeight - 200, p.y)) + 'px';
  });
  const c = scene3d.tableScreen();
  const pile = $('#centerPile');
  pile.style.left = c.x + 'px';
  pile.style.top = c.y + 'px';
  // Thanh thời gian
  if (state.state === 'playing' && state.deadline) {
    const left = Math.max(0, state.deadline - (Date.now() + clockOffset));
    const pct = (left / 25000) * 100;
    document.querySelectorAll('.seat.active .timer').forEach((t) => (t.style.width = pct + '%'));
  }
};

let dragSel = null;
function renderHand(deal) {
  const el = $('#hand');
  el.innerHTML = '';
  const n = handOrder.length;
  // Co bài lại cho vừa màn hình điện thoại
  const cw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 60;
  const avail = Math.min(window.innerWidth - 24, 900);
  const overlap = n > 1 ? Math.min(cw * 0.42, Math.max(cw * 0.15, cw - (avail - cw) / (n - 1))) : 0;
  handOrder.forEach((id, i) => {
    const c = cardEl(id);
    if (selected.has(id)) c.classList.add('sel');
    if (deal) { c.classList.add('deal'); c.style.animationDelay = i * 0.04 + 's'; }
    if (i > 0) c.style.marginLeft = -overlap + 'px';
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const on = !selected.has(id);
      dragSel = on;
      toggle(id, on, c);
    });
    c.addEventListener('pointerenter', () => { if (dragSel != null) toggle(id, dragSel, c); });
    el.appendChild(c);
  });
}
window.addEventListener('pointerup', () => (dragSel = null));
function toggle(id, on, el) {
  if (on) selected.add(id); else selected.delete(id);
  el.classList.toggle('sel', on);
  sfx.pop();
  renderControls();
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
  s.lastPlay.cards.forEach((id, i) => {
    const c = cardEl(id);
    c.style.animationDelay = i * 0.03 + 's';
    c.style.rotate = ((i - (s.lastPlay.cards.length - 1) / 2) * 4) + 'deg';
    pile.appendChild(c);
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
$('#startBtn').onclick = () => socket.emit('start');
$('#againBtn').onclick = () => { $('#resultModal').classList.add('hidden'); if (state.hostId === playerId) socket.emit('start'); else renderControls(); };
$('#closeResult').onclick = () => { $('#resultModal').classList.add('hidden'); renderControls(); };
$('#addBotBtn').onclick = () => socket.emit('addBot', {});
$('#leaveBtn').onclick = () => {
  if (state && state.state === 'playing' && state.seats[state.mySeat]?.inGame && !confirm('Đang chơi dở, rời phòng thì bot sẽ đánh thay bạn. Rời nhé?')) return;
  socket.emit('leaveRoom');
};
$('#copyCode').onclick = async () => {
  const link = location.origin + '/?room=' + state.code;
  try { await navigator.clipboard.writeText(link); toast('Đã sao chép link mời 💌'); }
  catch { prompt('Gửi link này cho bạn bè:', link); }
};
$('#muteBtn').onclick = () => { muted = !muted; store.set('muted', muted); $('#muteBtn').textContent = muted ? '🔇' : '🔊'; };
$('#muteBtn').textContent = muted ? '🔇' : '🔊';
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
window.addEventListener('resize', () => state && renderHand());

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
      break;
    case 'play':
      if (ev.chop) {
        sfx.chop();
        bigText(`CHẶT! ${ev.name} 🔪`, true);
        sysChat(`${nameOf(ev.seat)} chặt ${nameOf(ev.victim)} bằng ${ev.name} 🔪`);
      } else sfx.play();
      if (ev.name === 'Heo' || ev.name === 'Đôi heo') bubble(ev.seat, ev.name + '! 🐷');
      scene3d.hop(pos, 1);
      break;
    case 'pass':
      sfx.pass(); bubble(ev.seat, 'Bỏ lượt 🙅');
      break;
    case 'newRound':
      if (ev.seat === state.mySeat) toast('Vòng mới — bạn được đánh tự do ✨');
      break;
    case 'out':
      sysChat(`${nameOf(ev.seat)} về ${RANK_TXT[ev.rank - 1]} ${MEDALS[ev.rank - 1]}`);
      if (ev.seat === state.mySeat) { sfx.win(); bigText(`Về ${RANK_TXT[ev.rank - 1]}! ${MEDALS[ev.rank - 1]}`, true); if (ev.rank === 1) confetti(); }
      scene3d.hop(pos, 1.4);
      break;
    case 'instant':
      bigText(`TỚI TRẮNG! ${ev.label} 🎆`, true);
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
