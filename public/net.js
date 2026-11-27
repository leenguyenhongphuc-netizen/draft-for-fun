// Lớp mạng không cần server riêng:
// - Chủ phòng (host) chạy toàn bộ ván chơi (Room) ngay trong trình duyệt của mình.
// - Mọi người nói chuyện với nhau qua Supabase Realtime (broadcast + presence).
// - Có thêm kênh "local" (BroadcastChannel) để thử nhiều tab trên cùng máy: thêm ?local=1 vào link.
// Giao diện giống socket.io (on / emit) để app.js không phải đổi nhiều.

import { Room } from './game/room.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const THEMES = ['candy', 'garden', 'night'];
const AVATARS = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐷', '🐹', '🐨', '🐯', '🐻', '🐧'];
const PREFIX = 'tlc-v1';
const clean = (s, max) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);

const LS = (() => { try { return new URLSearchParams(location.search).has('local') ? sessionStorage : localStorage; } catch { return null; } })();
const store = {
  get(k, d) { try { const v = LS.getItem('tlc:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { if (v == null) LS.removeItem('tlc:' + k); else LS.setItem('tlc:' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
};

// ---------- Kênh truyền: Supabase ----------
async function supabaseTransport(myId) {
  const { createClient } = await import('./vendor/supabase.js');
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 30 } },
  });
  return {
    channel(name) {
      const ch = client.channel(`${PREFIX}:${name}`, { config: { broadcast: { self: false }, presence: { key: myId } } });
      let onMsg = () => {}, onPres = () => {};
      let meta = null;
      ch.on('broadcast', { event: 'm' }, ({ payload }) => onMsg(payload));
      ch.on('presence', { event: 'sync' }, () => onPres());
      const ready = new Promise((resolve, reject) => {
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') { if (meta) ch.track(meta); resolve(); }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status));
        });
      });
      return {
        ready,
        send: (payload) => ch.send({ type: 'broadcast', event: 'm', payload }),
        onMessage: (fn) => { onMsg = fn; },
        onPresence: (fn) => { onPres = fn; },
        track: (m) => { meta = m; ready.then(() => ch.track(m)).catch(() => {}); },
        untrack: () => { meta = null; ready.then(() => ch.untrack()).catch(() => {}); },
        members: () => Object.entries(ch.presenceState()).map(([key, arr]) => ({ key, ...(arr[arr.length - 1] || {}) })),
        close: () => client.removeChannel(ch),
      };
    },
  };
}

// ---------- Kênh truyền: thử trên cùng máy (nhiều tab) ----------
function localTransport(myId) {
  return {
    channel(name) {
      const bc = new BroadcastChannel(`${PREFIX}:${name}`);
      let onMsg = () => {}, onPres = () => {};
      let meta = null;
      const peers = new Map(); // key -> {meta, seen}
      const beat = () => { if (meta) bc.postMessage({ __pres: myId, meta }); };
      const hb = setInterval(() => {
        beat();
        let changed = false;
        for (const [k, v] of peers) if (Date.now() - v.seen > 4500) { peers.delete(k); changed = true; }
        if (changed) onPres();
      }, 1500);
      bc.onmessage = ({ data }) => {
        if (data.__pres) {
          const isNew = !peers.has(data.__pres) || JSON.stringify(peers.get(data.__pres).meta) !== JSON.stringify(data.meta);
          peers.set(data.__pres, { meta: data.meta, seen: Date.now() });
          if (isNew) onPres();
          return;
        }
        if (data.__leave) { peers.delete(data.__leave); onPres(); return; }
        onMsg(data);
      };
      return {
        ready: Promise.resolve(),
        send: (p) => bc.postMessage(p),
        onMessage: (fn) => { onMsg = fn; },
        onPresence: (fn) => { onPres = fn; },
        track: (m) => { meta = m; beat(); onPres(); },
        untrack: () => { meta = null; bc.postMessage({ __leave: myId }); onPres(); },
        members: () => {
          const list = [...peers].map(([key, v]) => ({ key, ...v.meta }));
          if (meta) list.push({ key: myId, ...meta });
          return list;
        },
        close: () => { clearInterval(hb); if (meta) bc.postMessage({ __leave: myId }); bc.close(); },
      };
    },
  };
}

// ---------- "Socket" giả ----------
export function createNet(playerId) {
  const handlers = {};
  const fire = (ev, data) => (handlers[ev] || []).forEach((fn) => fn(data));
  const useLocal = new URLSearchParams(location.search).has('local') || !SUPABASE_URL;
  let transport = null;
  let lobby = null;
  let profile = { name: 'Bạn Nhỏ', avatar: AVATARS[0] };
  let coins = store.get('coins', 1000);

  // Trạng thái phòng hiện tại
  let roomCh = null;        // kênh của phòng
  let roomCode = null;
  let host = null;          // { room, members: Map(id -> {coins}), dropTimers }
  let joinTimer = null;
  let hostGoneTimer = null;
  let lastHostSeen = 0;

  const toast = (msg) => fire('toast', msg);

  // ----- Sảnh: danh sách phòng = presence của các chủ phòng -----
  const roomList = () => {
    if (!lobby) return [];
    const now = Date.now();
    return lobby.members()
      .filter((m) => m.room && m.room.isPublic)
      .map((m) => m.room)
      .filter((r) => now - (r.at || 0) < 6 * 3600e3)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30);
  };
  let lobbyTrackTimer = null;
  const updateLobbyPresence = () => {
    clearTimeout(lobbyTrackTimer);
    lobbyTrackTimer = setTimeout(() => {
      if (!lobby) return;
      if (host && host.room.isPublic) lobby.track({ room: { ...host.room.summary(), isPublic: true, createdAt: host.room.createdAt, at: Date.now() } });
      else lobby.untrack();
    }, 300);
  };

  // ----- Phía chủ phòng -----
  const hostHooks = {
    emitState(room) {
      if (!host || host.room !== room) return;
      const views = {};
      room.humans().forEach((p) => { views[p.id] = room.viewFor(p.id); });
      if (views[playerId]) fire('state', views[playerId]);
      roomCh && roomCh.send({ t: 'state', views });
      store.set('host', { code: room.code, at: Date.now(), room: room.serialize(), members: [...host.members] });
      updateLobbyPresence();
    },
    emitEvent(room, ev) {
      if (!host || host.room !== room) return;
      fire('event', ev);
      roomCh && roomCh.send({ t: 'event', ev });
      if (ev.kind === 'end') applyMyCoins(room, ev);
    },
    getCoins: (id) => (host && host.members.get(id)?.coins) ?? 1000,
    addCoins: (id, n) => { if (!host) return; const m = host.members.get(id) || { coins: 1000 }; m.coins += n; host.members.set(id, m); },
  };

  function applyMyCoins(room, ev) {
    const seat = room ? room.seatOf(playerId) : ev.mySeat;
    const row = ev.results.find((r) => r.seat === seat);
    if (row) { coins += row.delta; store.set('coins', coins); }
  }

  function hostAction(from, type, p = {}) {
    const room = host.room;
    const reply = (err) => {
      if (!err || typeof err !== 'string') return;
      if (from === playerId) toast(err); else roomCh.send({ t: 'toast', to: from, msg: err });
    };
    const isHost = from === room.hostId;
    const hostOnly = () => { if (!isHost) { reply('Chỉ chủ phòng mới làm được nha'); return false; } return true; };
    const seat = room.seatOf(from);
    switch (type) {
      case 'join': {
        clearTimeout(host.dropTimers.get(from));
        host.members.set(from, { coins: Number(p.coins) || 1000 });
        const s = room.join({ id: from, name: clean(p.name, 16) || 'Bạn Nhỏ', avatar: AVATARS.includes(p.avatar) ? p.avatar : AVATARS[0] });
        if (s < 0) { roomCh.send({ t: 'full', to: from }); return; }
        if (room.state === 'playing' && room.seats[s] && !room.seats[s].isBot) room.scheduleAuto();
        hostHooks.emitState(room);
        return;
      }
      case 'leave':
        room.leave(from);
        host.members.delete(from);
        hostHooks.emitState(room);
        return;
      case 'profile':
        if (seat >= 0) {
          room.seats[seat].name = clean(p.name, 16) || room.seats[seat].name;
          if (AVATARS.includes(p.avatar)) room.seats[seat].avatar = p.avatar;
          hostHooks.emitState(room);
        }
        return;
      case 'addBot': if (hostOnly()) { reply(room.addBot(p.seat)); hostHooks.emitState(room); } return;
      case 'removeSeat': {
        if (!hostOnly()) return;
        const r = room.removeSeat(p.seat | 0);
        if (typeof r === 'string') return reply(r);
        if (r && r.kicked && !r.kicked.isBot) roomCh.send({ t: 'kicked', to: r.kicked.id });
        hostHooks.emitState(room);
        return;
      }
      case 'setTheme': if (hostOnly() && THEMES.includes(p.theme)) { room.theme = p.theme; hostHooks.emitState(room); } return;
      case 'start': if (hostOnly()) reply(room.start()); return;
      case 'play': reply(room.play(seat, Array.isArray(p.cards) ? p.cards.map(Number) : [])); return;
      case 'pass': reply(room.pass(seat)); return;
      case 'chat': {
        const t = clean(p.text, 120);
        if (t && seat >= 0) hostHooks.emitEvent(room, { kind: 'chat', seat, name: room.seats[seat].name, text: t });
        return;
      }
      case 'emote': if (seat >= 0) hostHooks.emitEvent(room, { kind: 'emote', seat, emoji: clean(p.emoji, 8) }); return;
    }
  }

  // Theo dõi ai còn trong phòng (presence)
  function hostPresence() {
    if (!host) return;
    const room = host.room;
    const here = new Set(roomCh.members().map((m) => m.key));
    let changed = false;
    room.humans().forEach((p) => {
      if (p.id === playerId) return;
      if (here.has(p.id) && !p.connected && !p.leftMidGame) {
        p.connected = true; changed = true;
        clearTimeout(host.dropTimers.get(p.id));
      }
      if (!here.has(p.id) && p.connected) {
        p.connected = false; changed = true;
        room.fixHost();
        if (room.state === 'playing') room.scheduleAuto();
        clearTimeout(host.dropTimers.get(p.id));
        host.dropTimers.set(p.id, setTimeout(() => {
          if (!host || host.room !== room) return;
          const s = room.seatOf(p.id);
          if (s < 0 || room.seats[s].connected) return;
          room.leave(p.id);
          hostHooks.emitState(room);
        }, 45000));
      }
    });
    if (changed) hostHooks.emitState(room);
  }

  async function openRoomChannel(code) {
    closeRoom(false);
    roomCode = code;
    roomCh = transport.channel('room:' + code);
    roomCh.onMessage(onRoomMessage);
    roomCh.onPresence(() => { if (host) hostPresence(); else clientPresence(); });
    roomCh.track({ name: profile.name });
    await roomCh.ready;
  }

  function becomeHost(room, members = []) {
    host = { room, members: new Map(members), dropTimers: new Map() };
    host.members.set(playerId, { coins });
    room.hooks = hostHooks;
    store.set('lastRoom', room.code);
  }

  async function createRoom({ name, theme, isPublic = true, bots = 0 } = {}) {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const code = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
    try { await openRoomChannel(code); } catch { return toast('Không kết nối được máy chủ 🥲 Thử lại nha'); }
    const room = new Room({
      code, name: clean(name, 24) || `Phòng của ${profile.name}`,
      theme: THEMES.includes(theme) ? theme : 'candy', isPublic: !!isPublic, hooks: hostHooks,
    });
    becomeHost(room);
    room.join({ id: playerId, name: profile.name, avatar: profile.avatar });
    for (let i = 0; i < Math.min(3, bots | 0); i++) room.addBot();
    hostHooks.emitState(room);
  }

  async function restoreHost(snap) {
    try { await openRoomChannel(snap.code); } catch { return toast('Không kết nối được máy chủ 🥲'); }
    const room = Room.restore(snap.room, hostHooks);
    becomeHost(room, snap.members);
    room.join({ id: playerId, name: profile.name, avatar: profile.avatar });
    hostHooks.emitState(room);
    setTimeout(hostPresence, 6000); // cho mọi người kịp vào lại
    toast('Đã khôi phục phòng của bạn 🏠');
  }

  async function joinRoom(code) {
    code = clean(code, 6).toUpperCase();
    if (!code) return toast('Nhập mã phòng nha');
    const snap = store.get('host', null);
    if (snap && snap.code === code && Date.now() - snap.at < 3 * 3600e3) return restoreHost(snap);
    try { await openRoomChannel(code); } catch { return toast('Không kết nối được máy chủ 🥲'); }
    lastHostSeen = Date.now();
    const ask = () => roomCh && roomCh.send({ t: 'act', from: playerId, type: 'join', p: { ...profile, coins } });
    ask();
    // Hỏi lại vài lần phòng khi kênh chưa sẵn sàng
    let tries = 0;
    clearInterval(joinTimer);
    joinTimer = setInterval(() => {
      if (++tries > 4) {
        clearInterval(joinTimer);
        closeRoom(false);
        store.set('lastRoom', null);
        toast('Không tìm thấy phòng này (hoặc chủ phòng đã thoát) 🔍');
        fire('left');
        return;
      }
      ask();
    }, 1500);
  }

  function onRoomMessage(m) {
    if (!m || typeof m !== 'object') return;
    if (host) {
      if (m.t === 'act' && typeof m.from === 'string') hostAction(m.from, m.type, m.p);
      return;
    }
    if (m.to && m.to !== playerId) return;
    lastHostSeen = Date.now();
    switch (m.t) {
      case 'state': {
        const v = m.views && m.views[playerId];
        if (!v) return;
        clearInterval(joinTimer);
        store.set('lastRoom', roomCode);
        fire('state', v);
        break;
      }
      case 'event':
        fire('event', m.ev);
        if (m.ev.kind === 'end' && lastView) applyMyCoins(null, { ...m.ev, mySeat: lastView.mySeat });
        break;
      case 'toast': toast(m.msg); break;
      case 'full': clearInterval(joinTimer); toast('Phòng đã đầy mất rồi 🥲'); leave(); break;
      case 'kicked': toast('Bạn đã được mời ra khỏi phòng'); leave(); break;
      case 'closed': toast('Chủ phòng đã đóng phòng 🏠'); leave(); break;
    }
  }

  let lastView = null;
  on('state', (v) => { lastView = v; });

  function clientPresence() {
    if (!lastView) return;
    const here = new Set(roomCh.members().map((m) => m.key));
    const hostThere = here.has(lastView.hostId) || here.size === 0;
    clearTimeout(hostGoneTimer);
    if (!hostThere) {
      toast('Chủ phòng mất kết nối… chờ chút nha ⏳');
      hostGoneTimer = setTimeout(() => {
        if (!roomCh) return;
        const still = new Set(roomCh.members().map((m) => m.key));
        if (!still.has(lastView.hostId)) { toast('Chủ phòng đã rời, phòng đóng lại 🥲'); leave(); }
      }, 60000);
    }
  }

  function closeRoom(notify = true) {
    clearInterval(joinTimer);
    clearTimeout(hostGoneTimer);
    if (roomCh) {
      if (notify && host) roomCh.send({ t: 'closed' });
      if (notify && !host) roomCh.send({ t: 'act', from: playerId, type: 'leave' });
      const ch = roomCh;
      setTimeout(() => ch.close(), 300);
    }
    if (host) { host.room.destroy(); host.dropTimers.forEach(clearTimeout); }
    roomCh = null; roomCode = null; host = null; lastView = null;
    updateLobbyPresence();
  }

  function leave() {
    if (host) store.set('host', null);
    store.set('lastRoom', null);
    closeRoom(true);
    fire('left');
  }

  function on(ev, fn) { (handlers[ev] ||= []).push(fn); }

  function emit(type, p = {}) {
    switch (type) {
      case 'hello':
        profile = { name: clean(p.name, 16) || 'Bạn Nhỏ', avatar: AVATARS.includes(p.avatar) ? p.avatar : AVATARS[0] };
        start().then(() => {
          fire('welcome', { coins });
          // Tự vào lại phòng cũ khi tải lại trang
          const urlRoom = new URLSearchParams(location.search).get('room');
          const snap = store.get('host', null);
          const last = store.get('lastRoom', null);
          if (!urlRoom && snap && Date.now() - snap.at < 3 * 3600e3) restoreHost(snap);
          else if (!urlRoom && last) joinRoom(last);
        });
        return;
      case 'listRooms': fire('rooms', roomList()); return;
      case 'createRoom': createRoom(p); return;
      case 'joinRoom': joinRoom(p.code); return;
      case 'leaveRoom': leave(); return;
      case 'profile':
        profile = { name: clean(p.name, 16) || profile.name, avatar: AVATARS.includes(p.avatar) ? p.avatar : profile.avatar };
        break;
    }
    if (!roomCh) return;
    if (host) hostAction(playerId, type, p);
    else roomCh.send({ t: 'act', from: playerId, type, p });
  }

  let started = null;
  function start() {
    if (started) return started;
    started = (async () => {
      try {
        transport = useLocal ? localTransport(playerId) : await supabaseTransport(playerId);
      } catch (e) {
        console.error(e);
        toast('Không tải được kết nối online, đang dùng chế độ chơi trên máy này');
        transport = localTransport(playerId);
      }
      lobby = transport.channel('lobby');
      lobby.onPresence(() => fire('rooms', roomList()));
      lobby.ready.then(() => fire('rooms', roomList())).catch(() => toast('Không kết nối được sảnh 🥲'));
      fire('connect');
    })();
    return started;
  }

  // Chủ phòng đóng tab: báo mọi người (vẫn giữ bản lưu để mở lại tiếp tục)
  window.addEventListener('pagehide', () => { if (host && roomCh) roomCh.send({ t: 'event', ev: { kind: 'chat', seat: host.room.seatOf(playerId), name: '📢', text: 'Chủ phòng vừa rời trang, chờ xíu nha…' } }); });

  return { on, emit, get mode() { return useLocal ? 'local' : 'online'; } };
}
