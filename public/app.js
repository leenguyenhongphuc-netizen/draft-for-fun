import { createScene, THEMES } from './scene3d.js';
import {
  RANKS, SUITS, rankOf, suitOf, getCombo, canBeat, allPlays, sortHand, TWO, cardLabel,
  finishViolation, settleDebts, smartGroups, GROUP_LABEL, SMART_VARIANT, TURN_CHOICES, UNIT_CHOICES, UNIT_LABELS, PTS3_CHOICES, STAKE_CHOICES,
} from './shared/rules.js';
import { createNet } from './net.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import { avaHTML } from './ava.js';
import * as uiXiDach from './ui/xidach.js';
import * as uiBaiCao from './ui/baicao.js';
import * as uiCaNgua from './ui/cangua.js';
import * as uiTyPhu from './ui/typhu.js';
import * as uiLoTo from './ui/loto.js';
import * as uiPoker from './ui/poker.js';
import * as uiCaro from './ui/caro.js';
import * as uiDiceBet from './ui/dicebet.js';
import * as uiSpin from './ui/spin.js';
import * as uiDuoiHinh from './ui/duoihinh.js';
import * as uiDuaThu from './ui/duathu.js';

const GAMES = {
  tienlen: { icon: '🃏', name: 'Tiến Lên', desc: 'Miền Nam · 2–4 người', ui: null },
  xidach: { icon: '🂡', name: 'Xì Dách', desc: 'Nhà cái xoay vòng · 2–4 người', ui: uiXiDach },
  baicao: { icon: '🎴', name: 'Bài Cào', desc: '3 cây · nặn bài · 2–4 người', ui: uiBaiCao },
  cangua: { icon: '🐴', name: 'Cá Ngựa', desc: 'Gieo xúc xắc · 2–4 người', ui: uiCaNgua },
  typhu: { icon: '🏙️', name: 'Tỷ Phú', desc: 'Bản đồ Việt Nam · 2–4 người', ui: uiTyPhu },
  loto: { icon: '🎪', name: 'Lô Tô', desc: 'Sân khấu hội chợ · tới 10 người', ui: uiLoTo },
  poker: { icon: '♠️', name: 'Poker', desc: "Texas Hold'em · 2–4 người", ui: uiPoker },
  caro: { icon: '⭕', name: 'Cờ Caro', desc: '5 quân liền · 2 người', ui: uiCaro },
  baucua: { icon: '🦀', name: 'Bầu Cua', desc: 'Tôm cá nai gà · tới 6 người', ui: uiDiceBet },
  taixiu: { icon: '🎲', name: 'Tài Xỉu', desc: 'Lắc 3 hột · tới 6 người', ui: uiDiceBet },
  spin: { icon: '🎡', name: 'Vòng Quay', desc: 'Thử thách vui · tới 10 người', ui: uiSpin },
  duoihinh: { icon: '🧩', name: 'Đuổi Hình Bắt Chữ', desc: 'Nhìn emoji đoán chữ · tới 10 người', ui: uiDuoiHinh },
  duathu: { icon: '🏇', name: 'Đua Thú', desc: 'Chọn thú chạy đua · tới 8 người', ui: uiDuaThu },
};

const $ = (s) => document.querySelector(s);
const AVATARS = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐷', '🐹', '🐨', '🐯', '🐻', '🐧', '💕', '🌷'];
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
let pickedGame = store.get('game', 'tienlen');
let sortMode = store.get('sortMode', 'smart');

// ---------- 3D ----------
const scene3d = createScene($('#bg3d'));

// ---------- Âm thanh ----------
let musicOn = store.get('music', true);
audio.setSfx(!muted);
audio.setMusic(musicOn);
// iPhone chỉ cho phát tiếng sau lần chạm đầu tiên
// iPhone chỉ mở khoá âm thanh khi nhấc tay (touchend / click) -> nghe ở nhiều sự kiện cho chắc
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, () => audio.unlock(), { passive: true, capture: true }));
// Nếu âm thanh vẫn bị khoá (vd quay lại từ app khác) thì nhắc chạm màn hình
setInterval(() => {
  const want = musicOn || !muted;
  $('#soundHint').classList.toggle('hidden', !want || audio.isRunning() || document.hidden);
}, 1500);
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
let reviewing = false; // đang xem lại bàn sau ván
const urlRoom = new URLSearchParams(location.search).get('room');
const LOCAL = new URLSearchParams(location.search).has('local');
const pageUrl = (code) => location.pathname + (code || LOCAL ? '?' : '') + (code ? 'room=' + code : '') + (code && LOCAL ? '&' : '') + (LOCAL ? 'local=1' : '');

let lixiPrompted = false;
function syncCoins(coins) {
  $('#myCoins').textContent = coins;
  $('#lixiBtn').classList.toggle('hidden', coins >= 500);
  // Dưới 500 xu: vòng quay lì xì tự bật lên (một lần mỗi lần mở game)
  if (coins < 500 && !lixiPrompted && !state) { lixiPrompted = true; setTimeout(() => openLixi(), 700); }
}
socket.on('lixi', ({ amount, coins }) => spinLixi(amount, coins));
socket.on('welcome', ({ coins }) => {
  syncCoins(coins);
  if (urlRoom && !state) socket.emit('joinRoom', { code: urlRoom });
});
socket.on('rooms', renderRooms);
socket.on('toast', toast);
socket.on('left', () => { setTimeout(() => socket.emit('coins'), 300); state = null; curGame = null; resetStage(); showLobby(); history.replaceState(null, '', pageUrl()); });
socket.on('state', (s) => {
  const prev = state;
  state = s; window.__tlc = s;
  clockOffset = s.now - Date.now();
  if (!prev) showGame();
  onState(prev, s);
});
socket.on("event", onEvent);
window.__tlcEvent = (ev) => onEvent(ev); // dùng để thử hiệu ứng

function randomName() {
  const n = ['Mochi', 'Bánh Bao', 'Kẹo Dẻo', 'Trà Sữa', 'Bông Gòn', 'Su Kem', 'Bắp Rang'][Math.floor(Math.random() * 7)];
  myName = n; store.set('name', n); $('#nameInput').value = n;
  return n;
}

// ---------- Sảnh 3 bước ----------
const ACCS = ['', '🎀', '🎩', '👑', '🕶️', '🌸', '🧢', '🎧', '🧣', '⭐'];
let myAcc = store.get('acc', '');
const profile = () => ({ name: myName, avatar: myAvatar, acc: myAcc });
const syncProfile = () => socket.emit('profile', profile());

const HOWTO = {
  tienlen: ['Bài từ nhỏ tới lớn: 3 → … → A → 2. Chất ♠ < ♣ < ♦ < ♥.', 'Đánh cùng loại, cùng số lá và lớn hơn. Bỏ lượt thì chờ vòng mới.', 'Chặt heo bằng 3 đôi thông / tứ quý; tới trắng; cóng; thối heo.', 'Chủ phòng chỉnh thêm luật (cấm về heo…) trong ⚙️ Luật.'],
  xidach: ['Xì bàn > Xì dách > Ngũ linh > điểm. Quá 21 là quắc (bí mật, không ai biết).', 'Người chơi đủ 16 nút, nhà cái đủ 15 nút mới được dằn.', 'Nhà cái xoay vòng mỗi ván.'],
  baicao: ['Mỗi người 3 lá, chạm từng lá để nặn.', 'Điểm = hàng đơn vị của tổng (10/J/Q/K = 0). Ba tây lớn nhất.', 'Người cao nhất ăn hết.'],
  cangua: ['Gieo 1 hoặc 6 thì ra quân, ra 1 hoặc 6 được gieo thêm.', 'Đi trúng ngựa đối thủ thì đá về chuồng.', 'Vào đích phải đúng số. Ai về đủ 4 ngựa trước thắng.'],
  typhu: ['Gieo 2 xúc xắc, mua tỉnh thành, xây nhà, thu tiền thuê.', 'Đủ cặp tỉnh cùng màu thì tiền thuê gấp đôi. Gieo đôi đi thêm.', 'Hết 15 vòng ai giàu nhất thắng, hết tiền là phá sản.'],
  poker: ['Mỗi ván mỗi người cầm 100 chip, mù 1/2. Nhận 2 lá tẩy + 5 lá chung.', 'Bỏ bài, Xem, Theo, Tố hoặc All-in. Ai còn bài mạnh nhất (5 lá tốt nhất) ăn pot.', 'Mạnh dần: mậu thầu < đôi < thú < sám < sảnh < thùng < cù lũ < tứ quý < thùng phá sảnh. 10 chip = 1 phần.'],
  baucua: ['Nhà cái xoay vòng mỗi ván. Chọn chip 1/2/5 rồi chạm con muốn đặt (cược tối đa bằng số xu đang có; 1 phần = 10 xu).', 'Nhà cái lắc 3 hột rồi mở bát. Mỗi hột ra đúng con mình đặt thì ăn 1 lần tiền cược, không ra thì mất.'],
  taixiu: ['Nhà cái xoay vòng mỗi ván. Đặt TÀI (tổng 11–17) hoặc XỈU (tổng 4–10), ăn 1:1.', 'Ra bộ ba (3 hột giống nhau) thì nhà cái ăn hết.'],
  caro: ['2 người, ✕ đi trước (đổi lượt mỗi ván).', 'Ai có 5 quân liên tiếp ngang, dọc hoặc chéo là thắng.', 'Luật Việt Nam: bị chặn cả 2 đầu thì không tính (chủ phòng tắt được trong ⚙️ Luật).'],
  spin: ['Lần lượt từng người bấm quay. Trúng ô nào làm thử thách ô đó: hát, nhảy, gây cười, bắt chước, chúc Tết, đố vui, nâng ly…', 'Làm xong được 1 ⭐, chịu thua thì bị phạt nhẹ cho vui. Ô 🍀 May mắn luôn được sao.', 'Thử thách vui vẻ cho cả nhà, không tính xu. Chủ phòng dừng lúc nào cũng được.'],
  duoihinh: ['Mỗi ván 10 câu, nhìn emoji đoán ra chữ (thành ngữ, món ăn, ngày Tết, địa danh…).', 'Gõ đáp án, không dấu cũng được. Cứ 10 giây lộ thêm vài chữ cái gợi ý.', 'Đoán đúng càng sớm càng nhiều điểm (5 · 4 · 3 · 2 · 1), đoán trước khi có gợi ý +1. Chỉ tính điểm cho vui.'],
  duathu: ['Mỗi người chọn 1 con thú (mỗi con 1 người), rồi cả đàn chạy 2 vòng quanh trường đua.', 'Chia thưởng đều: nửa số người có thú về trước mỗi người +1 phần, nửa về sau mỗi người −1 phần (lẻ người thì người ở giữa hoà).', 'Có tăng tốc 💨, thỏ ngủ quên 💤, rùa nước rút… nhưng ai cũng có cơ hội như nhau.'],
  loto: ['Sân khấu xổ liên tục: mở bán vé → xổ số → có người KINH.', 'Mỗi vòng mua tối đa 3 vé. Hàng nào đủ 5 số là KINH!', 'Vào phòng lúc nào cũng được, chờ vòng sau mua vé.'],
};

// ---------- Cảnh riêng từng game ----------
// Game bài dùng phòng 3D (tự đổi phòng ngẫu nhiên mỗi ván); Cá Ngựa, Tỷ Phú, Lô Tô có cảnh riêng.
const SCENE_OF = { tienlen: 'room', xidach: 'room', baicao: 'room', cangua: 'ludo', typhu: 'typhu', loto: 'loto', poker: 'room', caro: 'caro', baucua: 'dicebet', taixiu: 'dicebet', spin: 'dicebet', duoihinh: 'dicebet', duathu: 'dicebet' };
let curScene = null, curGame = null;
const d = (e, l, t, size = 38, cls = 'float', delay = 0) => `<span class="decor ${cls}" style="left:${l};top:${t};font-size:${size}px;animation-delay:${delay}s">${e}</span>`;
const lights = (n, colors) => `<div class="lights">${Array.from({ length: n }, (_, i) => `<i style="--c:${colors[i % colors.length]};--d:${(i % 3) * 0.4}s"></i>`).join('')}</div>`;
const SCENE_DECOR = {
  // Bàn gỗ ngày Tết: ấm trà, mứt, lì xì, hoa mai
  ludo: d('🍵', '3%', '78%', 44) + d('🍬', '86%', '80%', 40, 'float', 1) + d('🧧', '6%', '17%', 36, 'float', 2) + d('🌼', '88%', '16%', 40, 'float', .5)
    + d('🍊', '82%', '64%', 34, 'bob', 1.2) + d('🥮', '10%', '62%', 34, 'bob', .3) + d('🌸', '48%', '93%', 30, 'float', 1.6),
  // Biển xanh quanh bản đồ
  typhu: d('☁️', '0', '9%', 56, 'drift') + d('☁️', '0', '24%', 40, 'drift', -12) + d('⛵', '4%', '82%', 40, 'bob') + d('🛳️', '80%', '86%', 46, 'bob', 1)
    + d('🐋', '84%', '70%', 40, 'bob', .6) + d('🏝️', '2%', '66%', 42, 'float', 1.4) + d('🐬', '44%', '92%', 32, 'bob', .2),
  // Hội chợ đêm: dây đèn, đèn lồng, đu quay
  // Chiếu Tết: lì xì, mai, pháo
  dicebet: d('🧧', '3%', '11%', 40, 'bob') + d('🌼', '86%', '10%', 42, 'float') + d('🏮', '90%', '45%', 38, 'bob', .7) + d('🧨', '2%', '48%', 36, 'float', 1.2) + d('🍊', '4%', '88%', 38, 'bob', .4) + d('💰', '86%', '88%', 38, 'float', .9),
  // Bàn học: giấy ô li, bút chì, thước
  caro: d('✏️', '4%', '86%', 46, 'float') + d('📏', '80%', '88%', 46, 'float', 1) + d('🧃', '4%', '10%', 36, 'bob') + d('🍬', '88%', '11%', 34, 'bob', .6) + d('⭐', '90%', '62%', 28, 'float', .3) + d('🖍️', '2%', '62%', 34, 'float', 1.4),
  loto: lights(18, ['#ffd54f', '#ff8a80', '#80d8ff', '#b9f6ca']) + d('🏮', '2%', '10%', 40, 'bob') + d('🏮', '89%', '10%', 40, 'bob', 1)
    + d('🎡', '-2%', '86%', 70, 'float') + d('🎠', '84%', '87%', 56, 'float', 1) + d('🎈', '92%', '50%', 34, 'float', .4) + d('🎈', '1%', '46%', 30, 'float', 1.3),
};
function setScene(sc) {
  if (sc === curScene) return;
  curScene = sc;
  document.body.dataset.scene = sc;
  scene3d.setActive(sc === 'room' || sc === 'lobby');
  const bg = $('#sceneBg');
  bg.className = 'scene-' + sc;
  bg.innerHTML = SCENE_DECOR[sc] || '';
}
function resetStage() {
  const b = $('#board'); b.innerHTML = ''; b.className = 'hidden';
  $('#stageMine').innerHTML = ''; $('#stageCenter').innerHTML = ''; $('#diceTray').innerHTML = '';
  $('#pileCards').innerHTML = ''; $('#pileCards').dataset.key = ''; $('#pileLabel').textContent = '';
  $('#hand').innerHTML = '';
  Object.values(GAMES).forEach((g) => g.ui && g.ui.reset && g.ui.reset());
}

function showStep(id) {
  ['stepProfile', 'stepHub', 'stepGame'].forEach((x) => $('#' + x).classList.toggle('hidden', x !== id));
  $('#lobby').scrollTop = 0;
  if (id === 'stepHub') renderMeChip();
  if (id === 'stepGame') { renderGameHero(); socket.emit('listRooms'); }
}

function renderHero() {
  $('#heroEmoji').textContent = myAvatar;
  $('#heroAcc').textContent = myAcc;
}
function renderMeChip() {
  const c = $('#meChip');
  c.querySelector('.e').textContent = myAvatar;
  c.querySelector('.a').textContent = myAcc;
  c.querySelector('.n').textContent = myName || 'Bạn';
}
function renderGameHero() {
  const g = GAMES[pickedGame];
  $('#gameHero').innerHTML = `<span class="gh-icon">${g.icon}</span><div><div class="gh-name">${g.name}</div><div class="gh-desc">${g.desc}</div></div>`;
  $('#gameHero').dataset.game = pickedGame;
  $('#createBtn').textContent = pickedGame === 'loto' ? 'Mở sân khấu Lô Tô 🎪' : `Tạo phòng ${g.name} 🎉`;
  $('#botsLabel').textContent = pickedGame === 'loto' ? 'Mời sẵn vài bot làm khán giả' : 'Thêm sẵn 3 bot để chơi ngay';
  $('#howtoBody').innerHTML = '<ul>' + HOWTO[pickedGame].map((t) => `<li>${t.replace(/</g, '&lt;')}</li>`).join('') + '</ul>';
  renderRooms(lastRooms);
}

let lastRooms = [];
function initLobby() {
  $('#nameInput').value = myName;
  renderHero();
  const grid = $('#avatarGrid');
  AVATARS.forEach((a) => {
    const b = document.createElement('button');
    b.textContent = a;
    b.className = a === myAvatar ? 'sel' : '';
    b.onclick = () => {
      myAvatar = a; store.set('avatar', a);
      grid.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
      renderHero(); sfx.pop();
    };
    grid.appendChild(b);
  });
  const ag = $('#accGrid');
  ACCS.forEach((a) => {
    const b = document.createElement('button');
    b.textContent = a || '🚫';
    b.title = a ? 'Phụ kiện' : 'Không đeo gì';
    b.className = a === myAcc ? 'sel' : '';
    b.onclick = () => {
      myAcc = a; store.set('acc', a);
      ag.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
      renderHero(); sfx.pop();
    };
    ag.appendChild(b);
  });
  $('#toHubBtn').onclick = () => {
    myName = $('#nameInput').value.trim().slice(0, 16) || randomName();
    store.set('name', myName); store.set('profileDone', true);
    syncProfile(); sfx.pop();
    showStep('stepHub');
  };
  $('#nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#toHubBtn').click(); });
  $('#lixiBtn').onclick = () => openLixi();
  $('#editProfile').onclick = () => { showStep('stepProfile'); sfx.pop(); };

  const gp = $('#gamePick');
  Object.entries(GAMES).forEach(([k, g]) => {
    const b = document.createElement('button');
    b.className = 'game-card';
    b.dataset.game = k;
    b.innerHTML = `<span class="g-icon">${g.icon}</span><span class="g-name">${g.name}</span><span class="g-desc">${g.desc}</span>`;
    b.onclick = () => { pickedGame = k; store.set('game', k); sfx.pop(); showStep('stepGame'); };
    gp.appendChild(b);
  });
  $('#backHub').onclick = () => { showStep('stepHub'); sfx.pop(); };
  $('#createBtn').onclick = () => {
    syncProfile();
    socket.emit('createRoom', { game: pickedGame, name: $('#roomName').value, isPublic: $('#roomPublic').checked, bots: $('#roomBots').checked ? 3 : 0 });
  };
  $('#joinBtn').onclick = () => { syncProfile(); socket.emit('joinRoom', { code: $('#codeInput').value }); };
  $('#codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#joinBtn').click(); });
  $('#refreshRooms').onclick = () => { socket.emit('listRooms'); sfx.pop(); };
}

function renderRooms(list) {
  lastRooms = list || [];
  // Số phòng đang mở trên từng thẻ game ở sảnh
  document.querySelectorAll('.game-card').forEach((c) => {
    const n = lastRooms.filter((r) => (r.game || 'tienlen') === c.dataset.game).length;
    let b = c.querySelector('.g-rooms');
    if (!b) { b = document.createElement('span'); b.className = 'g-rooms'; c.appendChild(b); }
    b.textContent = n ? `🟢 ${n} phòng` : '';
  });
  const el = $('#roomList');
  if (!el) return;
  el.innerHTML = '';
  const mine = lastRooms.filter((r) => (r.game || 'tienlen') === pickedGame);
  if (!mine.length) { el.innerHTML = `<div class="empty">Chưa có phòng ${GAMES[pickedGame].name} nào… tạo một phòng đi! 🌷</div>`; return; }
  mine.forEach((r) => {
    const b = document.createElement('button');
    b.className = 'room-item';
    b.innerHTML = `<span class="ri-theme">${GAMES[pickedGame].icon}</span><span class="ri-name"></span><span class="ri-meta">${r.players} người<br>${r.state === 'playing' ? 'đang chơi' : 'đang chờ'}</span>`;
    b.querySelector('.ri-name').textContent = r.name;
    b.onclick = () => { syncProfile(); socket.emit('joinRoom', { code: r.code }); };
    el.appendChild(b);
  });
}

function showLobby() {
  $('#lobby').classList.remove('hidden');
  $('#game').classList.add('hidden');
  $('#resultModal').classList.add('hidden');
  document.body.dataset.scene = 'lobby';
  setScene('lobby');
  scene3d.setMode('lobby');
  const themes = Object.keys(THEMES);
  const t = themes[Math.floor(Math.random() * themes.length)];
  scene3d.setTheme(t); audio.setTheme(t);
  showStep(store.get('profileDone', false) && myName ? (store.get('game', null) && document.body.dataset.wasInGame ? 'stepGame' : 'stepHub') : 'stepProfile');
  socket.emit('listRooms');
}

function showGame() {
  $('#lobby').classList.add('hidden');
  $('#game').classList.remove('hidden');
  document.body.dataset.wasInGame = '1';
  scene3d.setMode('game');
  $('#chatLog').innerHTML = '';
  sysChat('Chào mừng tới phòng! Chúc bạn may mắn 🍀');
}

// ---------- Hiển thị lá bài ----------
function cardEl(id) {
  if (id == null || id < 0) { const b = document.createElement('div'); b.className = 'card back'; return b; }
  const r = rankOf(id), s = suitOf(id);
  const d = document.createElement('div');
  d.className = 'card ' + (s >= 2 ? 'red' : 'black') + (r === TWO ? ' two' : '') + (r >= 8 && r <= 10 ? ' face' : '');
  const mid = SUITS[s];
  d.innerHTML = `<div class="tl">${RANKS[r]}<small>${SUITS[s]}</small></div><div class="mid">${mid}</div>`;
  d.dataset.id = id;
  return d;
}

// ---------- Trạng thái phòng ----------
const relPos = (seat) => (state.mySeat < 0 ? seat % 4 : (((seat - state.mySeat) % 4) + 4) % 4);

function onState(prev, s) {
  $('#roomTitle').textContent = s.name;
  $('#roomCode').textContent = s.code;
  const gameKey = s.game || 'tienlen';
  if (gameKey !== curGame) { curGame = gameKey; resetStage(); }
  setScene(SCENE_OF[gameKey]);
  if (SCENE_OF[gameKey] === 'room') { scene3d.setTheme(s.theme); audio.setTheme(s.theme); }
  else audio.setTheme({ cangua: 'garden', typhu: 'rainbow', loto: 'tet', caro: 'cafe', dicebet: 'tet' }[SCENE_OF[gameKey]] || { cangua: 'garden', typhu: 'rainbow', loto: 'tet', caro: 'cafe' }[gameKey]);
  if (new URLSearchParams(location.search).get('room') !== s.code) history.replaceState(null, '', pageUrl(s.code));

  const me = s.seats[s.mySeat];
  if (me && !s.settings?.debt) $('#myCoins').textContent = me.coins;

  // Bài trên tay: giữ thứ tự người chơi tự xếp
  const hand = s.hand || [];
  const set = new Set(hand);
  const kept = handOrder.filter((c) => set.has(c));
  const added = hand.filter((c) => !kept.includes(c));
  handOrder = SMART_VARIANT[sortMode] || added.length > 3 ? sortHand(hand, sortMode) : [...kept, ...sortHand(added, sortMode)];
  selected = new Set([...selected].filter((c) => set.has(c)));
  if (!prev || prev.state !== 'playing' || (prev.lastPlay && !s.lastPlay)) hintIdx = -1;

  const G = GAMES[s.game || 'tienlen'] || GAMES.tienlen;
  $('#gameChip').textContent = `${G.icon} ${G.name}`;
  document.body.dataset.game = s.game || 'tienlen';
  renderSeats();
  if (SCENE_OF[gameKey] === 'room') { const b = $('#board'); if (b.className !== 'hidden') { b.innerHTML = ''; b.className = 'hidden'; } }
  if (G.ui) {
    $('#hand').innerHTML = '';
    $('#pileCards').innerHTML = ''; $('#pileCards').dataset.key = ''; $('#pileLabel').textContent = '';
    renderControls();
    G.ui.render(s, prev && prev.game === s.game ? prev : null, uiCtx);
  } else {
    $('#stageMine').innerHTML = ''; $('#stageCenter').innerHTML = ''; $('#board').classList.add('hidden');
    renderHand(prev && prev.state !== 'playing' && s.state === 'playing');
    renderPile();
    renderControls();
  }

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
    if (seat >= 4 && seat !== s.mySeat) return; // Lô tô có thể tới 10 người: chỉ hiện trong dãy khán giả
    const pos = seat === s.mySeat ? 0 : relPos(seat);
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
      ${pos === 0 ? `<div class="ava">${avaHTML(p.avatar, p.acc)}</div>` : ''}
      <div><div class="nm"></div>${s.settings && s.settings.debt
        ? `<div class="cn ${p.debt > 0 ? 'debt-pos' : p.debt < 0 ? 'debt-neg' : ''}">📒 ${fmtAmt(p.debt)}</div>`
        : `<div class="cn">🪙 ${p.coins}</div>`}
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
    // Hết ván: lật bài còn lại của đối thủ
    const row = s.state === 'ended' && s.results && pos !== 0 && !p.show ? s.results.find((r) => r.seat === seat) : null;
    if (p.show && p.show.length && pos !== 0) {
      const rv = miniCards(p.show, false);
      rv.classList.add('reveal');
      el.appendChild(rv);
    } else if (row && row.cardsLeft.length) {
      const rv = miniCards(row.cardsLeft);
      rv.classList.add('reveal');
      const t = document.createElement('div'); t.className = 'reveal-title'; t.textContent = `Còn ${row.cardsLeft.length} lá`;
      rv.prepend(t);
      el.appendChild(rv);
    }
    (pos === 0 ? $('#meTag') : wrap).appendChild(el);
    scenePlayers[pos] = { avatar: p.avatar, acc: p.acc, active, passed: p.passed, rank: p.rank };
  });
  scene3d.setSeats(s.game === 'loto' ? [null, null, null, null] : scenePlayers.slice(0, 4));
}

function statusOf(p) {
  if (p.status) return p.status;
  if (p.cong) return { cls: 'bad', text: '🥶 Cóng · bét' };
  if (p.bad) return { cls: 'bad', text: '🐷 về heo · bét' };
  if (p.rank) return { cls: 'r' + Math.min(4, p.rank), text: MEDALS[p.rank - 1] + ' ' + RANK_TXT[p.rank - 1] + (p.outWith ? ' · ' + p.outWith.name : '') };
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
    place(el, Math.max(60, Math.min(window.innerWidth - 60, p.x)), Math.max(window.innerWidth < 560 ? 136 : 84, Math.min(window.innerHeight - 220, p.y)));
  }
  const c = scene3d.tableScreen();
  place($('#centerPile'), c.x, c.y);
  place($('#stageCenter'), c.x, c.y);
  const G = GAMES[state.game || 'tienlen'];
  if (G && G.ui && G.ui.tick) G.ui.tick(state, uiCtx);
  // Thanh thời gian + tiếng tích tắc khi sắp hết giờ
  if (state.state === 'playing' && state.deadline) {
    const left = Math.max(0, state.deadline - (Date.now() + clockOffset));
    const t = document.querySelector('.seat.active .timer');
    if (t) t.style.transform = `scaleX(${left / (state.turnMs || 25000)})`;
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

  // Xếp theo bộ: đánh dấu lá đầu mỗi bộ để chừa khoảng trống + ghi nhãn
  const groupStart = new Map();
  handGroups = SMART_VARIANT[sortMode] ? smartGroups(handOrder, SMART_VARIANT[sortMode]) : [];
  handGroups.forEach((g, gi) => groupStart.set(g.cards[0], { label: GROUP_LABEL[g.type] + (g.type === 'straight' ? ' ' + g.cards.length : ''), gi }));
  let rows = twoRows ? [handOrder.slice(0, perRow), handOrder.slice(perRow)] : [handOrder];
  // 2 hàng: chia theo ranh giới bộ, không cắt một bộ ra 2 hàng
  if (twoRows && handGroups.length > 1) {
    let best = null;
    for (let cut = 1; cut < handGroups.length; cut++) {
      const top = handGroups.slice(0, cut).reduce((a, g) => a + g.cards.length, 0);
      if (Math.max(top, n - top) > 9) continue; // mỗi hàng tối đa 9 lá
      const diff = Math.abs(top - (n - top));
      if (!best || diff < best.diff) best = { cut, diff };
    }
    if (best) rows = [handGroups.slice(0, best.cut).flatMap((g) => g.cards), handGroups.slice(best.cut).flatMap((g) => g.cards)];
    else if (n <= 9) rows = [handOrder]; // ít bài: để 1 hàng còn hơn cắt ngang một bộ
  }
  const multi = rows.length > 1;
  const longest = Math.max(...rows.map((r) => r.length));
  const cw = Math.max(40, Math.min(multi ? 64 : 76, W / (multi ? Math.max(4, longest * 0.72) : Math.max(5, n * 0.58))));
  el.style.setProperty('--hcw', cw + 'px');
  el.classList.toggle('two-rows', multi);
  let k = 0;
  rows.forEach((row) => {
    const r = document.createElement('div');
    r.className = 'hand-row';
    const m = row.length;
    // Khoảng trống giữa các bộ cũng tính vào chiều rộng để không tràn màn hình
    const gap = cw * 0.22;
    const gaps = row.filter((id, i) => i > 0 && groupStart.has(id)).length * gap;
    const overlap = m > 1 ? Math.max(0, Math.min(cw * 0.45, (m * cw + gaps - W) / (m - 1))) : 0;
    row.forEach((id, i) => {
      const c = cardEl(id);
      if (selected.has(id)) c.classList.add('sel');
      if (deal) {
        c.classList.add('deal'); c.style.animationDelay = (k++) * 0.035 + 's';
        c.addEventListener('animationend', () => { c.classList.remove('deal'); c.style.animationDelay = ''; }, { once: true });
      }
      const gs = groupStart.get(id);
      if (i > 0) c.style.marginLeft = (gs ? -overlap + gap : -overlap) + 'px';
      if (gs) {
        c.classList.add('gs');
        const tag = document.createElement('span');
        tag.className = 'grp-tag t-' + handGroups[gs.gi].type; tag.textContent = gs.label; tag.dataset.gi = gs.gi;
        tag.title = 'Chạm để chọn cả bộ';
        c.appendChild(tag);
      }
      r.appendChild(c);
    });
    el.appendChild(r);
  });
}

// Chạm / kéo để chọn bài: một bộ xử lý cho cả tay bài (không giật, không cuộn trang)
let drag = null;
let handGroups = [];
const cardAt = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest('#hand .card'); };
$('#hand').addEventListener('pointerdown', (e) => {
  // Chạm nhãn bộ (Sảnh, Đôi thông…) -> chọn / bỏ chọn cả bộ
  const tag = e.target.closest('.grp-tag');
  if (tag) {
    e.preventDefault();
    const g = handGroups[+tag.dataset.gi];
    if (!g) return;
    const allSel = g.cards.every((id) => selected.has(id));
    if (!allSel) selected.clear();
    g.cards.forEach((id) => (allSel ? selected.delete(id) : selected.add(id)));
    document.querySelectorAll('#hand .card').forEach((el) => el.classList.toggle('sel', selected.has(+el.dataset.id)));
    (allSel ? sfx.deselect : sfx.select)();
    renderControls();
    return;
  }
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

  const isTL = (s.game || 'tienlen') === 'tienlen';
  $('#actions').classList.toggle('hidden', !isTL || !playing || !inGame || !handOrder.length);
  const prev = s.lastPlay ? getCombo(s.lastPlay.cards) : null;
  const combo = getCombo([...selected]);
  const rule = mine && combo && canBeat(prev, combo) ? ruleProblem(combo) : null;
  $('#playBtn').disabled = !mine || !combo || !canBeat(prev, combo) || (rule && !rule.forced);
  $('#passBtn').disabled = !mine || !s.lastPlay;
  $('#hintBtn').disabled = !mine;
  // Đã chọn bài thì nút "Xếp" đổi thành "Bỏ chọn"
  $('#sortBtn').classList.toggle('hidden', selected.size > 0);
  $('#clearSelBtn').classList.toggle('hidden', selected.size === 0);

  $('#handArea').classList.toggle('turn-on', mine && isTL);
  const banner = $('#turnBanner');
  if (isTL) banner.classList.toggle('mine', mine);
  if (!isTL) { /* banner do giao diện từng game tự đặt */ }
  else if (!playing) banner.textContent = '';
  else if (!inGame) banner.textContent = '👀 Bạn sẽ vào chơi ở ván sau';
  else if (s.seats[s.mySeat].rank) banner.textContent = `🎉 Bạn về ${RANK_TXT[s.seats[s.mySeat].rank - 1]}! Ngồi xem nha`;
  else if (mine && rule) banner.textContent = rule.forced ? '😱 Hết đường, đành về heo → bị xếp bét' : '🚫 ' + rule.msg;
  else if (mine) banner.textContent = s.lastPlay ? (selected.size && combo && !canBeat(prev, combo) ? '😅 Bộ này chưa đè được' : '✨ Tới lượt bạn!') : (s.startCard != null && s.settings?.mustStart3 && handOrder.includes(s.startCard) ? `✨ Ván đầu: đánh kèm ${cardLabel(s.startCard)} nha` : '✨ Bạn được đánh tự do!');
  else {
    const t = s.seats[s.turn];
    banner.textContent = t ? `⏳ Chờ ${t.avatar} ${t.name}…` : '';
  }

  $('#ledgerBtn').classList.toggle('hidden', !s.ledger);
  if (!$('#rulesModal').classList.contains('hidden')) renderRules();
  if (!$('#ledgerModal').classList.contains('hidden')) renderLedger();
  if (s.state !== 'ended') reviewing = false;
  const showReview = s.state === 'ended' && reviewing && $('#resultModal').classList.contains('hidden');
  $('#reviewBar').classList.toggle('hidden', !showReview);
  if (showReview) {
    $('#reviewAgain').classList.toggle('hidden', !isHost);
    $('#reviewWait').classList.toggle('hidden', isHost);
  }
  const waiting = s.state === 'waiting' || (s.state === 'ended' && !reviewing && $('#resultModal').classList.contains('hidden'));
  $('#waitPanel').classList.toggle('hidden', !waiting);
  if (waiting) {
    const count = s.seats.filter(Boolean).length;
    const max = s.maxSeats || 4;
    const isLoto = s.game === 'loto';
    const solo = { loto: 1, spin: 1, duoihinh: 1, duathu: 1 }[s.game] || 2;
    $('#waitTitle').textContent = s.state === 'ended' ? 'Làm thêm ván nữa không? 🃏' : isLoto ? `🎪 Sân khấu lô tô (${count}/${max} khán giả)` : count < 2 ? 'Đang chờ người chơi…' : `Đã có ${count}/${max} người 🎈`;
    $('#waitSub').textContent = isLoto ? (isHost ? 'Bấm mở sân khấu là xổ liên tục, ai vào cũng mua vé được!' : 'Chờ chủ phòng 👑 mở sân khấu nha…') : isHost ? (count < max ? 'Gửi mã phòng cho bạn bè hoặc thêm bot nhé!' : 'Đủ người rồi, bắt đầu thôi!') : 'Chờ chủ phòng 👑 bắt đầu nha…';
    renderRuleChips();
    $('#startBtn').classList.toggle('hidden', !isHost);
    $('#addBotBtn').classList.toggle('hidden', !isHost || count >= max);
    $('#startBtn').disabled = count < solo;
    $('#startBtn').textContent = isLoto ? 'Mở sân khấu 🎪' : s.game === 'spin' ? 'Bắt đầu quay 🎡' : s.game === 'duathu' ? 'Vào trường đua 🏇' : s.game === 'duoihinh' ? 'Bắt đầu đoán 🧩' : 'Bắt đầu 🃏';
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
$('#clearSelBtn').onclick = () => {
  selected.clear(); hintIdx = -1;
  document.querySelectorAll('#hand .card.sel').forEach((c) => c.classList.remove('sel'));
  sfx.deselect(); renderControls();
};
$('#sortBtn').onclick = () => {
  // Đổi vòng các kiểu xếp, bỏ qua kiểu cho ra y hệt cách đang xếp
  const ORDER = ['smart', 'smart-straight', 'smart-pair', 'rank', 'suit'];
  const sig = (m) => sortHand(handOrder, m).join(',') + '|' + (SMART_VARIANT[m] ? smartGroups(handOrder, SMART_VARIANT[m]).map((g) => g.cards.length).join('-') : m);
  const cur = sig(sortMode);
  let i = ORDER.indexOf(sortMode);
  for (let k = 0; k < ORDER.length; k++) {
    i = (i + 1) % ORDER.length;
    if (sig(ORDER[i]) !== cur) break;
  }
  sortMode = ORDER[i];
  store.set('sortMode', sortMode);
  handOrder = sortHand(handOrder, sortMode);
  renderHand(); sfx.deal();
  toast({ smart: '🧩 Gom bộ: ít rác nhất', 'smart-straight': '🧩 Gom bộ: ưu tiên sảnh', 'smart-pair': '🧩 Gom bộ: ưu tiên đôi, sám', rank: '🔢 Xếp theo số', suit: '♠️ Xếp theo chất' }[sortMode]);
};
$('#hintBtn').onclick = () => {
  const prev = state.lastPlay ? getCombo(state.lastPlay.cards) : null;
  const plays = allPlays(handOrder, prev).filter((c) => !ruleProblem(c)).sort((a, b) => (a.cards.length === b.cards.length ? a.top - b.top : prev ? a.top - b.top : b.cards.length - a.cards.length));
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
    const prev = state.lastPlay ? getCombo(state.lastPlay.cards) : null;
    const rule = combo && canBeat(prev, combo) ? ruleProblem(combo) : null;
    const picked = [...selected].sort((a, b) => a - b).map(cardLabel).join(' ');
    why = !selected.size ? 'Chạm vào lá bài để chọn trước nha 👆' : !combo ? `${picked} chưa thành bộ 🤔 Chạm nhãn bộ để chọn nhanh` : rule ? rule.msg : `${picked} chưa đè được 😅`;
  } else if (b.id === 'passBtn') why = 'Bạn đang được đánh tự do, phải đánh 1 bộ nha';
  if (why) { toast(why); sfx.error(); }
});
$('#startBtn').onclick = () => socket.emit('start');
$('#againBtn').onclick = () => { reviewing = false; $('#resultModal').classList.add('hidden'); if (state.hostId === playerId) socket.emit('start'); else renderControls(); };
$('#closeResult').onclick = () => { reviewing = true; $('#resultModal').classList.add('hidden'); renderControls(); };
$('#reopenResult').onclick = () => { $('#resultModal').classList.remove('hidden'); renderControls(); };
$('#reviewAgain').onclick = () => { reviewing = false; socket.emit('start'); };
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
  const G = GAMES[state.game || 'tienlen'];
  if (G && G.ui && G.ui.onEvent) G.ui.onEvent(ev, uiCtx);
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
      const prevPig = ev.prev === 'Heo' || ev.prev === 'Đôi heo';
      const isSeq = ev.type === 'pairseq';
      const isQuad = ev.type === 'quad';
      const bigStraight = ev.type === 'straight' && ev.len >= 6;
      const table = scene3d.tableScreen();
      if (ev.chop) {
        // ⚡ Chặt: trời tối, sét đánh vào người bị chặt, heo quay
        const vpos = relPos(ev.victim);
        const target = vpos === 0 ? { x: window.innerWidth / 2, y: window.innerHeight - 260 } : scene3d.seatScreen(vpos);
        const chain = ev.chain || 1;
        if (isQuad) fx.quadSlam(table, ev.cards.map(cardEl));
        else if (isSeq) fx.train(ev.len);
        setTimeout(() => {
          fx.lightning(target, 1 + chain);
          sfx.thunder(Math.min(1.5, 0.8 + chain * 0.3));
          scene3d.flashLights(0xfff3a0, 0.8);
          scene3d.zap(vpos);
          shake();
          if (prevPig) { setTimeout(() => sfx.pig(), 300); fx.roastPig(target); }
          if (chain >= 2) { fx.chainText(chain); scene3d.burst(['🔥', '💥', '⚡'], 26, 1.5); }
          else scene3d.burst(['⚡', '💥', '⭐', '🐷'], 22, 1.3);
        }, isQuad ? 650 : isSeq ? 500 : 0);
        sysChat(`${nameOf(ev.seat)} chặt ${nameOf(ev.victim)} bằng ${ev.name} 🔪` + (chain >= 2 ? ` (chặt chồng ×${chain}!)` : '') + (ev.chopParts ? ` (+${fmtAmt(ev.chopParts * ev.unit.mult, ev.unit.label, false)})` : ''));
        bubble(ev.victim, '😱');
        if (ev.chopParts) {
          const amt = ev.chopParts * ev.unit.mult;
          setTimeout(() => { floatAmt(ev.seat, '+' + fmtAmt(amt, ev.unit.label, false), true); floatAmt(ev.victim, '−' + fmtAmt(amt, ev.unit.label, false), false); sfx.coin(); }, 1300);
        }
      } else if (isPig && prevPig) {
        // 🐷💥🐷 Đè heo lên heo
        sfx.play(n); fx.pigBump(table); sfx.pigRun(2); setTimeout(() => sfx.bump(), 480);
        setTimeout(() => shake(), 480);
        bubble(ev.seat, 'Đè heo! 🐷');
      } else if (isPig) {
        // 🐷 Heo chạy ngang màn hình
        sfx.play(n); fx.pigRun(n, table.y - 40); sfx.pigRun(n);
        bubble(ev.seat, ev.name + '! 🐷');
        scene3d.burst(['🐷', '💗'], 10, 0.9);
      } else if (isQuad) {
        // 💣 Tứ quý: 4 lá đập xuống + con dấu
        fx.quadSlam(table, ev.cards.map(cardEl)); sfx.stamp();
        setTimeout(() => { shake(); scene3d.flashLights(0xffd45e, 0.5); scene3d.burst(['💥', '⭐', '🌟'], 20, 1.2); }, 560);
      } else if (isSeq) {
        // 🚂 Đôi thông: đoàn tàu chở bài
        sfx.play(n); fx.train(ev.len); sfx.train();
        scene3d.burst(['🃏', '✨'], 14, 1);
      } else {
        sfx.play(n);
        if (bigStraight) { sfx.bigCombo(); comboText(ev.name); scene3d.burst(['✨', '⭐', '🌟'], 16, 1); }
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
      if (ev.bad) {
        sysChat(`${nameOf(ev.seat)} về bằng heo 🐷 → bị xếp bét!`);
        bigText('Về heo chót! Bét 😭');
        sfx.lose(); scene3d.burst(['🐷', '💦'], 12, 0.8);
        break;
      }
      { const ow = ev.outWith; sysChat(`${nameOf(ev.seat)} về ${RANK_TXT[ev.rank - 1]} ${MEDALS[ev.rank - 1]}${ow ? ' bằng ' + ow.name + ' (' + ow.cards.map(cardLabel).join(' ') + ')' : ''}`); }
      if (ev.seat !== state.mySeat && ev.outWith) toast(`${nameOf(ev.seat)} về ${RANK_TXT[ev.rank - 1]} bằng ${ev.outWith.name} ${ev.outWith.cards.map(cardLabel).join(' ')}`);
      if (ev.seat === state.mySeat) { sfx.win(); bigText(`Về ${RANK_TXT[ev.rank - 1]}! ${MEDALS[ev.rank - 1]}`, true); if (ev.rank === 1) confetti(); }
      if (ev.rank === 1) scene3d.burst(['🏆', '⭐', '🎉', '💖'], 20, 1.1);
      scene3d.hop(pos, 1.4);
      break;
    case 'cong':
      ev.seats.forEach((s) => { bubble(s, '🥶 Cóng!'); scene3d.hop(relPos(s), 0.8); });
      sysChat(`${ev.seats.map(nameOf).join(', ')} bị cóng (chưa đánh lá nào) 🥶`);
      bigText(ev.seats.includes(state.mySeat) ? 'Bạn bị CÓNG! 🥶' : `${ev.seats.map(nameOf).join(', ')} bị CÓNG! 🥶`, true);
      sfx.lose(); shake();
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
    d.innerHTML = `<span class="medal">${r.badge || (r.bad ? '🐷' : MEDALS[r.rank - 1])}</span><span class="who"><span class="nmx"></span><span class="note"></span></span><span class="delta ${r.delta >= 0 ? 'plus' : 'minus'}">${r.delta >= 0 ? '+' : ''}${r.delta} 🪙</span>`;
    d.querySelector('.nmx').textContent = p ? `${p.avatar} ${p.name}${r.seat === state.mySeat ? ' (bạn)' : ''}` : 'Người chơi';
    d.querySelector('.note').textContent = r.note || (r.cardsLeft.length ? `còn ${r.cardsLeft.length} lá` : '');
    if (r.outWith) {
      const o = document.createElement('div');
      o.className = 'out-with';
      o.innerHTML = `<span>🏁 Về bằng ${r.outWith.name}:</span>`;
      o.appendChild(miniCards(r.outWith.cards));
      d.querySelector('.who').appendChild(o);
    }
    if (r.cardsLeft.length && r.seat !== state.mySeat) d.querySelector('.who').appendChild(miniCards(r.cardsLeft));
    box.appendChild(d);
    countUp(d.querySelector('.delta'), r.delta, 300 + i * 120, unitLabel());
  });
  $('#debtNote').classList.toggle('hidden', !state.settings?.debt);
  $('#againBtn').textContent = state.hostId === playerId ? 'Ván mới 🔁' : 'Đóng';
  $('#resultModal').classList.remove('hidden');
  if (meRow && meRow.rank === 1) confetti();
  renderControls();
}

// ---------- Luật phòng ----------
function unitLabel() { return state && state.settings && state.settings.debt ? state.settings.unitLabel : 'xu'; }
function fmtAmt(v, label = state?.settings?.unitLabel || 'điểm', sign = true) {
  const n = Math.round(v * 100) / 100;
  const sg = sign && n > 0 ? '+' : '';
  return label === 'k' ? `${sg}${n}k` : `${sg}${n} ${label}`;
}
// Bộ bài có phạm luật phòng không? {msg, forced}
function ruleProblem(combo) {
  const s = state;
  if (!s || !s.settings) return null;
  if (s.settings.mustStart3 && s.startCard != null && handOrder.includes(s.startCard) && !combo.cards.includes(s.startCard)) {
    return { msg: `Ván đầu phải đánh kèm ${cardLabel(s.startCard)} nha` };
  }
  const v = finishViolation(handOrder.length, combo, s.settings);
  if (!v) return null;
  // Được đánh tự do mà không còn nước nào hợp luật -> buộc phải về (bị xếp bét)
  const forced = !s.lastPlay && !allPlays(handOrder, null).some((c) => !finishViolation(handOrder.length, c, s.settings));
  return { msg: v, forced };
}

const GAME_RULE_TEXT = {
  xidach: 'Xì bàn > Xì dách > Ngũ linh > điểm. Quá 21 là quắc. Người chơi đủ 16, nhà cái đủ 15 mới được dằn. Thắng thường +1 phần, thắng bằng xì bàn / xì dách / ngũ linh +2 phần. Nhà cái xoay vòng mỗi ván.',
  baicao: 'Mỗi người 3 lá, điểm = hàng đơn vị của tổng (10/J/Q/K = 0). Ba tây (3 lá J/Q/K) lớn nhất. Ai cao nhất ăn: mỗi người thua trả 1 phần.',
  poker: "Texas Hold'em: 2 lá tẩy + 5 lá chung, mỗi ván 100 chip, mù 1/2, chia pot phụ khi all-in. Lời/lỗ: 10 chip = 1 phần.",
  baucua: 'Nhà cái xoay vòng. Mỗi hột ra đúng con đã đặt ăn 1 lần tiền cược (ra 2 hột ăn gấp 2…), không ra thì mất. Cược tối đa bằng số xu đang có.',
  taixiu: 'Nhà cái xoay vòng. Tài 11–17, Xỉu 4–10, ăn 1:1. Bộ ba thì nhà cái ăn hết. Cược tối đa bằng số xu đang có.',
  duoihinh: 'Nhìn emoji đoán chữ, 10 câu mỗi ván. Đúng càng sớm càng nhiều điểm. Chỉ tính điểm cho vui, không tính xu.',
  duathu: 'Mỗi người chọn 1 thú. Xếp hạng theo thứ tự về đích: nửa trên mỗi người +1 phần, nửa dưới mỗi người −1 phần (vd 8 người: 4 người đầu ăn của 4 người sau). Lẻ người thì người ở giữa hoà.',
  spin: 'Lần lượt quay, làm thử thách được ⭐. Chỉ để vui, không tính xu.',
  caro: 'Bàn 15×15, 5 quân liên tiếp thắng (+1 phần), thua −1 phần, hoà 0.',
  cangua: 'Gieo 1 hoặc 6 thì ra quân, ra 1 hoặc 6 được gieo thêm. Đi trúng ngựa đối thủ thì đá về chuồng. Vào đích phải đúng số. Ai về đủ 4 ngựa trước thắng.',
};
const RULES = [
  { key: 'noTwoLast', name: '🐷 Cấm về heo chót', desc: 'Lá cuối cùng không được là heo (2). Hết đường mà phải về heo thì bị xếp bét.' },
  { key: 'noBombLast', name: '💣 Cấm về bằng hàng', desc: 'Không được về bằng tứ quý hoặc đôi thông.' },
  { key: 'mustStart3', name: '♠️ Ván đầu đánh 3♠', desc: 'Nước đầu tiên của ván đầu phải có lá nhỏ nhất (thường là 3♠).' },
  { key: 'chopPay', name: '🔪 Chặt tính tiền', desc: 'Bị chặt phải trả: heo đen 1 phần, heo đỏ 2, 3 đôi thông 3, tứ quý 4. Chặt chồng cộng dồn.' },
  { key: 'penalty', name: '😵 Thối heo, thối hàng', desc: 'Người về bét còn heo / hàng trong tay phải trả thêm cho người nhất.' },
  { key: 'cong', name: '🥶 Cóng', desc: 'Về bét mà chưa đánh được lá nào thì thua gấp đôi.' },
  { key: 'instantWin', name: '🎆 Tới trắng', desc: 'Tứ quý heo, sảnh rồng, 6 đôi, 5 đôi thông là thắng luôn.' },
];

function renderRuleChips() {
  const st = state.settings;
  if (!st) return;
  const chips = [];
  if (st.debt) chips.push(['📒 Ghi sổ · 1 phần = ' + fmtAmt(st.unit, st.unitLabel, false), true]);
  RULES.forEach((r) => { if (st[r.key]) chips.push([r.name, false]); });
  if ((st.stake || 1) > 1) chips.push(['💰 Cược ×' + st.stake, true]);
  chips.push(['⏱ ' + st.turnSec + 's', false]);
  const el = $('#rulesChips');
  el.innerHTML = '';
  chips.forEach(([t, hot]) => { const sp = document.createElement('span'); sp.textContent = t; if (hot) sp.className = 'hot'; el.appendChild(sp); });
}

function setRule(patch) { socket.emit('setSettings', { settings: patch }); sfx.pop(); }

function renderRules() {
  const st = state.settings;
  const canEdit = state.hostId === playerId && state.state !== 'playing';
  $('#rulesNote').textContent = state.hostId !== playerId ? 'Chỉ chủ phòng 👑 mới chỉnh được luật' : state.state === 'playing' ? 'Hết ván này rồi chỉnh luật nha' : 'Chạm để bật / tắt';
  const list = $('#rulesList');
  list.innerHTML = '';
  const sw = (key, checked) => {
    const l = document.createElement('label'); l.className = 'switch';
    l.innerHTML = '<input type="checkbox"><span></span>';
    const i = l.querySelector('input'); i.checked = checked; i.disabled = !canEdit;
    i.onchange = () => setRule({ [key]: i.checked });
    return l;
  };
  const seg = (vals, cur, fmt, onPick) => {
    const d = document.createElement('div'); d.className = 'seg';
    vals.forEach((v) => { const b = document.createElement('button'); b.textContent = fmt(v); b.className = v === cur ? 'sel' : ''; b.disabled = !canEdit; b.onclick = () => onPick(v); d.appendChild(b); });
    return d;
  };
  const row = (name, desc, control, cls = '') => {
    const r = document.createElement('div'); r.className = 'rule ' + cls;
    r.innerHTML = '<div class="r-text"><div class="r-name"></div><div class="r-desc"></div></div>';
    r.querySelector('.r-name').textContent = name; r.querySelector('.r-desc').textContent = desc;
    r.appendChild(control); list.appendChild(r);
    return r;
  };
  if (!['spin', 'duoihinh'].includes(state.game)) row('📒 Chế độ ghi sổ', 'Chơi cho vui: không trừ xu, ghi lại điểm thắng thua qua các ván, cuối buổi xem tổng kết.', sw('debt', st.debt), 'debt');
  if (st.debt && !['spin', 'duoihinh'].includes(state.game)) {
    row('Mỗi phần =', 'Tiến Lên 4 người: nhất +3 phần, nhì +1, ba −1, bét −3.', seg(UNIT_CHOICES, st.unit, (v) => v, (v) => setRule({ unit: v })));
    row('Đơn vị', '"k" = nghìn đồng, hoặc chỉ tính điểm.', seg(UNIT_LABELS, st.unitLabel, (v) => v, (v) => setRule({ unitLabel: v })));
  }
  if (!['spin', 'duoihinh'].includes(state.game)) row('💰 Mức cược', `Nhân tiền thắng thua: 1 phần = ${(st.debt ? st.unit : 10) * (st.stake || 1)} ${st.debt ? st.unitLabel : 'xu'}.`, seg(STAKE_CHOICES, st.stake || 1, (v) => '×' + v, (v) => setRule({ stake: v })));
  if ((state.game || 'tienlen') === 'tienlen') RULES.forEach((r) => row(r.name, r.desc, sw(r.key, st[r.key])));
  else row(`${GAMES[state.game].icon} Luật ${GAMES[state.game].name}`, GAME_RULE_TEXT[state.game], document.createElement('span'));
  if (state.game === 'caro') row('🚧 Chặn 2 đầu không tính', 'Hàng 5 quân bị quân đối thủ chặn cả 2 đầu thì không thắng (luật Việt Nam).', sw('caroBlock', st.caroBlock));
  if ((state.game || 'tienlen') === 'tienlen') {
    const lbl = (v) => v.split(',').map((x, i) => ['Nhất ', 'Nhì ', 'Bét '][i] + (+x > 0 ? '+' : '') + x).join(' · ');
    const r3 = row('👥 Chơi 3 người tính sao?', 'Bàn 3 người: về nhì có được phần không. Bàn 4 người luôn là +3 / +1 / −1 / −3.', seg(PTS3_CHOICES, st.pts3, lbl, (v) => setRule({ pts3: v })));
    r3.classList.add('rule-stack');
  }
  row('⏱ Thời gian mỗi lượt', 'Hết giờ sẽ tự bỏ lượt (hoặc đánh lá nhỏ nhất).', seg(TURN_CHOICES, st.turnSec, (v) => v + 's', (v) => setRule({ turnSec: v })));
}

function renderLedger() {
  const L = state.ledger || { players: {}, games: [] };
  const label = state.settings?.unitLabel || 'điểm';
  const players = Object.entries(L.players).map(([id, p]) => ({ id, ...p })).sort((a, b) => b.total - a.total);
  $('#ledgerSub').textContent = L.games.length ? `${L.games.length} ván đã ghi${state.settings?.debt ? '' : ' (đang tắt ghi sổ)'}` : 'Chưa có ván nào được ghi. Bật "Chế độ ghi sổ" trong ⚙️ Luật nha!';
  const tot = $('#ledgerTotals'); tot.innerHTML = '';
  players.forEach((p, i) => {
    const r = document.createElement('div');
    r.className = 'lrow' + (p.id === playerId ? ' me' : '');
    r.innerHTML = `<span>${i === 0 && p.total > 0 ? '👑' : p.avatar}</span><span class="l-name"></span><span class="l-amt ${p.total > 0 ? 'delta plus' : p.total < 0 ? 'delta minus' : ''}">${fmtAmt(p.total, label)}</span>`;
    r.querySelector('.l-name').innerHTML = '<span></span><div class="l-sub"></div>';
    r.querySelector('.l-name span').textContent = (p.isBot ? '🤖 ' : '') + p.name + (p.id === playerId ? ' (bạn)' : '');
    r.querySelector('.l-sub').textContent = `${p.games} ván · nhất ${p.wins}`;
    tot.appendChild(r);
  });
  const plan = settleDebts(Object.fromEntries(players.map((p) => [p.id, p.total])));
  const st = $('#ledgerSettle'); st.innerHTML = '';
  if (!plan.length) st.innerHTML = '<div class="settle">Huề cả làng, không ai phải đưa ai 🥳</div>';
  plan.forEach((x) => {
    const d = document.createElement('div'); d.className = 'settle';
    const a = L.players[x.from], b = L.players[x.to];
    d.innerHTML = '<span class="f"></span> đưa <span class="t"></span> <b></b>';
    d.querySelector('.f').textContent = `${a.avatar} ${a.name}`;
    d.querySelector('.t').textContent = `${b.avatar} ${b.name}`;
    d.querySelector('b').textContent = fmtAmt(x.amount, label, false);
    st.appendChild(d);
  });
  const gl = $('#ledgerGames'); gl.innerHTML = '';
  L.games.slice(0, 15).forEach((g, i) => {
    const d = document.createElement('div'); d.className = 'lgame';
    const t = document.createElement('span'); t.className = 't';
    t.textContent = `Ván ${L.games.length - i} · ${new Date(g.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    d.appendChild(t);
    g.rows.forEach((r) => {
      const p = L.players[r.id]; const sp = document.createElement('span');
      sp.textContent = `${p ? p.avatar : ''} ${r.delta > 0 ? '+' : ''}${r.delta}`;
      sp.className = r.delta > 0 ? 'delta plus' : r.delta < 0 ? 'delta minus' : '';
      d.appendChild(sp);
    });
    gl.appendChild(d);
  });
  $('#clearLedger').classList.toggle('hidden', state.hostId !== playerId || !L.games.length);
}

function ledgerText() {
  const L = state.ledger; const label = state.settings?.unitLabel || 'điểm';
  const players = Object.entries(L.players).map(([id, p]) => ({ id, ...p })).sort((a, b) => b.total - a.total);
  const lines = [`📒 Sổ ghi Game nhà Pum — phòng ${state.code} (${L.games.length} ván)`, ''];
  players.forEach((p) => lines.push(`${p.avatar} ${p.name}: ${fmtAmt(p.total, label)}`));
  const plan = settleDebts(Object.fromEntries(players.map((p) => [p.id, p.total])));
  if (plan.length) { lines.push('', '💸 Tổng kết:'); plan.forEach((x) => lines.push(`• ${L.players[x.from].name} → ${L.players[x.to].name}: ${fmtAmt(x.amount, label, false)}`)); }
  return lines.join('\n');
}

function openModal(id) { $(id).classList.remove('hidden'); sfx.pop(); }
$('#rulesBtn').onclick = () => { renderRules(); openModal('#rulesModal'); };
$('#rulesChips').onclick = () => { renderRules(); openModal('#rulesModal'); };
$('#closeRules').onclick = () => $('#rulesModal').classList.add('hidden');
$('#ledgerBtn').onclick = () => { renderLedger(); openModal('#ledgerModal'); };
$('#openLedgerFromResult').onclick = () => { renderLedger(); openModal('#ledgerModal'); };
$('#closeLedger').onclick = () => $('#ledgerModal').classList.add('hidden');
$('#clearLedger').onclick = () => { if (confirm('Xoá hết sổ ghi của phòng này? (Không lấy lại được)')) socket.emit('clearLedger'); };
$('#copyLedger').onclick = async () => {
  const t = ledgerText();
  try { await navigator.clipboard.writeText(t); toast('Đã sao chép sổ ghi 📋 dán vào Zalo/Messenger nha'); } catch { prompt('Sao chép sổ ghi:', t); }
};
document.querySelectorAll('.modal').forEach((m) => m.addEventListener('pointerdown', (e) => { if (e.target === m && m.id !== 'resultModal') m.classList.add('hidden'); }));

function miniCards(ids, sort = true) {
  const d = document.createElement('div');
  d.className = 'mini-cards';
  (sort ? [...ids].sort((a, b) => a - b) : ids).forEach((id) => d.appendChild(cardEl(id)));
  return d;
}

function floatAmt(seat, text, plus) {
  const pos = relPos(seat);
  const p = pos === 0 ? { x: window.innerWidth / 2, y: window.innerHeight - 200 } : scene3d.seatScreen(pos);
  const d = document.createElement('div');
  d.className = 'float-amt ' + (plus ? 'plus' : 'minus');
  d.textContent = text;
  d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
  $('#fx').appendChild(d);
  setTimeout(() => d.remove(), 1700);
}

// ---------- Ngữ cảnh cho giao diện từng game ----------
const uiCtx = {
  $, cardEl, sfx, fx, scene3d, toast, bigText: (t, g) => bigText(t, g), confetti: () => confetti(), shake: () => shake(),
  sysChat: (t) => sysChat(t), bubble: (s, t) => bubble(s, t),
  get socket() { return socket; },
  nameOf: (seat) => nameOf(seat),
  mySeat: () => (state ? state.mySeat : -1),
  hopSeat: (seat, p) => { if (state) scene3d.hop(relPos(seat), p); },
  now: () => Date.now() + clockOffset,
  burst: (pt, emojis, n) => fx.burstAt(pt, emojis, n),
  center: () => { const r = $('#board').getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }; },
  rerender: () => { if (!state) return; const G2 = GAMES[state.game || 'tienlen']; if (G2 && G2.ui) G2.ui.render(state, null, uiCtx); },
  banner(text, mine, html = false) { const b = $('#turnBanner'); if (html) b.innerHTML = text; else b.textContent = text; b.classList.toggle('mine', !!mine); },
  playerId: () => playerId,
};

// ---------- 🧧 Vòng quay lì xì ----------
const LIXI_SEGS = [100, 200, 300, 400, 500, 1000];
let lixiBusy = false;
function openLixi() {
  let m = $('#lixiModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'lixiModal';
    m.className = 'modal lixi-modal';
    const segs = LIXI_SEGS.map((v, i) => `<div class="lx-seg" style="--i:${i}"><span>${v}</span></div>`).join('');
    m.innerHTML = `<div class="modal-card lixi-card">
      <div class="lx-title">🧧 Lì xì may mắn 🧧</div>
      <div class="lx-sub">Hết xu rồi nè, quay một vòng lấy hên nha!</div>
      <div class="lx-wheel-wrap"><div class="lx-pointer">▼</div><div class="lx-wheel">${segs}</div><button class="lx-hub">QUAY</button></div>
      <div class="lx-result"></div>
      <div class="modal-actions"><button class="btn big pink lx-go">🎡 Quay ngay</button><button class="btn soft lx-close hidden">Nhận xu 💰</button></div>
    </div>`;
    document.body.appendChild(m);
    const go = () => { if (lixiBusy) return; lixiBusy = true; m.querySelector('.lx-go').disabled = true; audio.unlock(); sfx.diceShake(); socket.emit('lixi'); };
    m.querySelector('.lx-go').onclick = go;
    m.querySelector('.lx-hub').onclick = go;
    m.querySelector('.lx-close').onclick = () => { m.classList.add('hidden'); };
  }
  lixiBusy = false;
  const w = m.querySelector('.lx-wheel');
  w.style.transition = 'none'; w.style.transform = 'rotate(0deg)';
  m.querySelector('.lx-result').textContent = '';
  m.querySelector('.lx-go').disabled = false;
  m.querySelector('.lx-go').classList.remove('hidden');
  m.querySelector('.lx-close').classList.add('hidden');
  m.classList.remove('hidden');
}
function spinLixi(amount, coins) {
  const m = $('#lixiModal');
  if (!m) return;
  const w = m.querySelector('.lx-wheel');
  const idx = LIXI_SEGS.indexOf(amount);
  const seg = 360 / LIXI_SEGS.length;
  // Ô idx nằm ở góc idx*seg (tính từ đỉnh, theo chiều kim đồng hồ) -> quay ngược lại để đưa lên dưới mũi tên
  const target = 360 * 6 - idx * seg - seg / 2 + (Math.random() - 0.5) * seg * 0.6;
  void w.offsetWidth;
  w.style.transition = 'transform 4.2s cubic-bezier(.12,.6,.15,1)';
  w.style.transform = `rotate(${target}deg)`;
  let ticks = 0;
  const tick = setInterval(() => { sfx.tick(); if (++ticks > 22) clearInterval(tick); }, 170);
  setTimeout(() => {
    clearInterval(tick);
    m.querySelector('.lx-result').textContent = `+${amount} xu! ${amount >= 1000 ? 'Trúng lớn rồi 🎉🎉' : 'Năm mới phát tài 🧧'}`;
    m.querySelector('.lx-go').classList.add('hidden');
    m.querySelector('.lx-close').classList.remove('hidden');
    sfx.win(); confetti();
    syncCoins(coins);
    lixiBusy = false;
  }, 4300);
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
function countUp(el, target, delay, label = 'xu') {
  const sign = target >= 0 ? '+' : '';
  const suffix = label === 'xu' ? ' 🪙' : label === 'k' ? 'k' : ' ' + label;
  el.textContent = sign + '0' + suffix;
  setTimeout(() => {
    const t0 = performance.now(), dur = 600;
    const stepFn = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = sign + Math.round(target * k) + suffix;
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
  // Không hiện chồng nhiều thông báo giống nhau
  if ([...$('#toast').children].some((x) => x.textContent === msg)) return;
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

// ---------- Báo có bản mới ----------
const APP_VERSION = '20261128-1214';
document.querySelectorAll('.lobby-card').forEach((c) => { const v = document.createElement('div'); v.className = 'app-ver'; v.textContent = 'Phiên bản ' + APP_VERSION; c.appendChild(v); });
async function checkUpdate() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    const { v } = await r.json();
    if (v && v !== APP_VERSION && !document.querySelector('.update-bar')) {
      const b = document.createElement('button');
      b.className = 'update-bar';
      b.textContent = state && state.hostId === playerId ? '🆕 Có bản mới · hết ván rồi chạm để tải lại (phòng vẫn giữ nguyên)' : '🆕 Có bản mới · chạm để tải lại';
      b.onclick = () => location.reload();
      document.body.appendChild(b);
    }
  } catch { /* không có mạng thì thôi */ }
}
setInterval(checkUpdate, 90000);
setTimeout(checkUpdate, 5000);
socket.emit('hello', { name: myName || randomName(), avatar: myAvatar, acc: myAcc });
