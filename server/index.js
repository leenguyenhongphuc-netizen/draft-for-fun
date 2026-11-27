import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { Room } from './room.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const THEMES = ['candy', 'garden', 'night'];
const AVATARS = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐷', '🐹', '🐨', '🐯', '🐻', '🐧'];

const app = express();
app.use(express.static(path.join(ROOT, 'public')));
app.use('/shared', express.static(path.join(ROOT, 'shared')));
app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules/three/build')));
app.get('/healthz', (_req, res) => res.send('ok'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---------- Xu của người chơi (lưu file đơn giản) ----------
const COINS_FILE = path.join(ROOT, 'data', 'coins.json');
let coins = {};
try { coins = JSON.parse(fs.readFileSync(COINS_FILE, 'utf8')); } catch { coins = {}; }
let saveTimer = null;
const saveCoins = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(COINS_FILE), { recursive: true });
    fs.writeFile(COINS_FILE, JSON.stringify(coins), () => {});
  }, 1000);
};
const getCoins = (id) => (coins[id] ??= 1000);
const addCoins = (id, n) => { coins[id] = getCoins(id) + n; saveCoins(); };

// ---------- Phòng ----------
const rooms = new Map();
const users = new Map(); // socket.id -> { id, name, avatar, room }

const hooks = {
  emitState(room) {
    for (const [sid, u] of users) {
      if (u.room === room.code) io.to(sid).emit('state', room.viewFor(u.id));
    }
  },
  emitEvent(room, ev) { io.to('room:' + room.code).emit('event', ev); },
  getCoins,
  addCoins,
};

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do c = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
  while (rooms.has(c));
  return c;
}

const roomList = () => [...rooms.values()]
  .filter((r) => r.isPublic)
  .sort((a, b) => b.createdAt - a.createdAt)
  .slice(0, 30)
  .map((r) => r.summary());

const broadcastRooms = () => io.to('lobby').emit('rooms', roomList());

const clean = (s, max) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);

function leaveCurrent(socket) {
  const u = users.get(socket.id);
  if (!u || !u.room) return;
  const room = rooms.get(u.room);
  socket.leave('room:' + u.room);
  u.room = null;
  if (!room) return;
  room.leave(u.id);
  if (room.isEmpty()) {
    room.destroy();
    rooms.delete(room.code);
  } else {
    hooks.emitState(room);
  }
  broadcastRooms();
}

function enterRoom(socket, room) {
  const u = users.get(socket.id);
  if (u.room && u.room !== room.code) leaveCurrent(socket);
  const seat = room.join({ id: u.id, name: u.name, avatar: u.avatar });
  if (seat < 0) return socket.emit('toast', 'Phòng đã đầy mất rồi 🥲');
  u.room = room.code;
  socket.join('room:' + room.code);
  socket.leave('lobby');
  hooks.emitState(room);
  broadcastRooms();
}

io.on('connection', (socket) => {
  socket.on('hello', ({ playerId, name, avatar } = {}) => {
    const id = clean(playerId, 40) || 'p-' + Math.random().toString(36).slice(2, 10);
    const u = {
      id,
      name: clean(name, 16) || 'Bạn Nhỏ',
      avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
      room: null,
    };
    users.set(socket.id, u);
    socket.emit('welcome', { id, coins: getCoins(id) });
    // Tự vào lại phòng cũ nếu đang ngồi ở đó (mất mạng / tải lại trang)
    const back = [...rooms.values()].find((r) => r.seatOf(id) >= 0);
    if (back) enterRoom(socket, back);
    else { socket.join('lobby'); socket.emit('rooms', roomList()); }
  });

  const me = () => users.get(socket.id);
  const myRoom = () => { const u = me(); return u && u.room ? rooms.get(u.room) : null; };
  const reply = (err) => { if (err && typeof err === 'string') socket.emit('toast', err); };

  socket.on('listRooms', () => socket.emit('rooms', roomList()));

  socket.on('createRoom', ({ name, theme, isPublic = true, bots = 0 } = {}) => {
    const u = me(); if (!u) return;
    const room = new Room({
      code: newCode(),
      name: clean(name, 24) || `Phòng của ${u.name}`,
      theme: THEMES.includes(theme) ? theme : 'candy',
      isPublic: !!isPublic,
      hooks,
    });
    rooms.set(room.code, room);
    enterRoom(socket, room);
    for (let i = 0; i < Math.min(3, bots | 0); i++) room.addBot();
    hooks.emitState(room);
    broadcastRooms();
  });

  socket.on('joinRoom', ({ code } = {}) => {
    if (!me()) return;
    const room = rooms.get(clean(code, 6).toUpperCase());
    if (!room) return socket.emit('toast', 'Không tìm thấy phòng này 🔍');
    enterRoom(socket, room);
  });

  socket.on('leaveRoom', () => {
    leaveCurrent(socket);
    socket.join('lobby');
    socket.emit('left');
    socket.emit('rooms', roomList());
  });

  const hostOnly = (fn) => (...args) => {
    const room = myRoom(); const u = me();
    if (!room) return;
    if (room.hostId !== u.id) return socket.emit('toast', 'Chỉ chủ phòng mới làm được nha');
    fn(room, ...args);
  };

  socket.on('addBot', hostOnly((room, { seat } = {}) => {
    reply(room.addBot(seat));
    hooks.emitState(room); broadcastRooms();
  }));

  socket.on('removeSeat', hostOnly((room, { seat } = {}) => {
    const r = room.removeSeat(seat | 0);
    if (typeof r === 'string') return reply(r);
    if (r && r.kicked && !r.kicked.isBot) {
      for (const [sid, u] of users) {
        if (u.id === r.kicked.id && u.room === room.code) {
          const s = io.sockets.sockets.get(sid);
          u.room = null;
          if (s) { s.leave('room:' + room.code); s.join('lobby'); s.emit('left'); s.emit('toast', 'Bạn đã được mời ra khỏi phòng'); }
        }
      }
    }
    hooks.emitState(room); broadcastRooms();
  }));

  socket.on('setTheme', hostOnly((room, { theme } = {}) => {
    if (!THEMES.includes(theme)) return;
    room.theme = theme;
    hooks.emitState(room); broadcastRooms();
  }));

  socket.on('start', hostOnly((room) => { reply(room.start()); broadcastRooms(); }));

  socket.on('play', ({ cards } = {}) => {
    const room = myRoom(); if (!room) return;
    reply(room.play(room.seatOf(me().id), Array.isArray(cards) ? cards.map(Number) : []));
  });

  socket.on('pass', () => {
    const room = myRoom(); if (!room) return;
    reply(room.pass(room.seatOf(me().id)));
  });

  socket.on('chat', ({ text } = {}) => {
    const room = myRoom(); if (!room) return;
    const t = clean(text, 120);
    if (t) hooks.emitEvent(room, { kind: 'chat', seat: room.seatOf(me().id), name: me().name, text: t });
  });

  socket.on('emote', ({ emoji } = {}) => {
    const room = myRoom(); if (!room) return;
    hooks.emitEvent(room, { kind: 'emote', seat: room.seatOf(me().id), emoji: clean(emoji, 8) });
  });

  socket.on('profile', ({ name, avatar } = {}) => {
    const u = me(); if (!u) return;
    u.name = clean(name, 16) || u.name;
    if (AVATARS.includes(avatar)) u.avatar = avatar;
    const room = myRoom();
    if (room) { const s = room.seatOf(u.id); if (s >= 0) Object.assign(room.seats[s], { name: u.name, avatar: u.avatar }); hooks.emitState(room); }
  });

  socket.on('disconnect', () => {
    const u = me();
    users.delete(socket.id);
    if (!u || !u.room) return;
    const room = rooms.get(u.room);
    if (!room) return;
    // Còn tab khác của cùng người chơi thì thôi
    if ([...users.values()].some((x) => x.id === u.id && x.room === room.code)) return;
    const seat = room.seatOf(u.id);
    if (seat < 0) return;
    room.seats[seat].connected = false;
    room.fixHost();
    if (room.state === 'playing') room.scheduleAuto();
    hooks.emitState(room);
    // Cho 45 giây để vào lại
    setTimeout(() => {
      const r = rooms.get(room.code);
      if (!r) return;
      const s = r.seatOf(u.id);
      if (s < 0 || r.seats[s].connected) return;
      r.leave(u.id);
      if (r.isEmpty()) { r.destroy(); rooms.delete(r.code); }
      else hooks.emitState(r);
      broadcastRooms();
    }, 45000);
  });
});

server.listen(PORT, () => console.log(`🐷 Tiến Lên Cute đang chạy tại http://localhost:${PORT}`));
