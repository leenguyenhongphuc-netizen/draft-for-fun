// Khung chung cho các game mới (Xì Dách, Bài Cào, Cá Ngựa):
// ghế ngồi, bot, chủ phòng, luật phòng (ghi nợ, thời gian), sổ nợ, hẹn giờ, lưu/khôi phục.
import { normalizeSettings } from '../shared/rules.js';

export const BOT_NAMES = [
  ['Bé Mèo', '🐱'], ['Cún Con', '🐶'], ['Thỏ Bông', '🐰'], ['Gấu Trúc', '🐼'],
  ['Cáo Nhỏ', '🦊'], ['Ếch Xanh', '🐸'], ['Heo Hồng', '🐷'], ['Hamster', '🐹'],
];
export const POINTS = { 2: [1, -1], 3: [2, 0, -2], 4: [3, 1, -1, -3] };
export const COIN_UNIT = 10;

export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export class BaseRoom {
  constructor({ code, name, theme, isPublic, hooks }) {
    this.code = code;
    this.name = name;
    this.theme = theme;
    this.isPublic = isPublic;
    this.hostId = null;
    this.seats = [null, null, null, null];
    this.state = 'waiting'; // waiting | playing | ended
    this.g = null;          // dữ liệu ván hiện tại (tuỳ game)
    this.results = null;
    this.hooks = hooks;
    this.timers = {};
    this.createdAt = Date.now();
    this.settings = normalizeSettings();
    this.ledger = { players: {}, games: [] };
    this.meta = {};         // dữ liệu giữa các ván (vd: nhà cái)
  }

  get gameType() { return this.constructor.GAME; }
  get turnMs() { return this.settings.turnSec * 1000; }
  minPlayers() { return 2; }

  // ---------- Ghế ----------
  humans() { return this.seats.filter((p) => p && !p.isBot); }
  seatOf(id) { return this.seats.findIndex((p) => p && p.id === id); }
  playerCount() { return this.seats.filter(Boolean).length; }
  inGame(s) { return !!(this.g && this.g.inGame && this.g.inGame[s]); }

  join(player) {
    let seat = this.seatOf(player.id);
    if (seat >= 0) {
      Object.assign(this.seats[seat], { connected: true, leftMidGame: false, name: player.name, avatar: player.avatar });
      return seat;
    }
    seat = this.seats.findIndex((p) => !p);
    if (seat < 0) {
      if (this.state === 'playing') return -1;
      seat = this.seats.findIndex((p) => p && p.isBot);
      if (seat < 0) return -1;
    }
    this.seats[seat] = { ...player, isBot: false, connected: true };
    if (!this.hostId || this.seatOf(this.hostId) < 0) this.hostId = player.id;
    return seat;
  }

  leave(id) {
    const seat = this.seatOf(id);
    if (seat < 0) return;
    if (this.state === 'playing' && this.inGame(seat)) {
      Object.assign(this.seats[seat], { connected: false, leftMidGame: true });
      this.scheduleAuto();
    } else this.seats[seat] = null;
    this.fixHost();
  }

  fixHost() {
    if (this.hostId && this.humans().some((p) => p.id === this.hostId && p.connected)) return;
    const h = this.humans().find((p) => p.connected);
    this.hostId = h ? h.id : null;
  }

  addBot(seat) {
    if (this.state === 'playing') return 'Đang chơi, chưa thêm bot được';
    if (seat == null) seat = this.seats.findIndex((p) => !p);
    if (seat < 0 || seat > 3 || this.seats[seat]) return 'Ghế này có người rồi';
    const used = new Set(this.seats.filter(Boolean).map((p) => p.name));
    const pick = BOT_NAMES.find(([n]) => !used.has(n)) || BOT_NAMES[0];
    this.seats[seat] = { id: 'bot-' + Math.random().toString(36).slice(2, 8), name: pick[0], avatar: pick[1], isBot: true, connected: true, botCoins: 1000 };
    return null;
  }

  removeSeat(seat) {
    if (this.state === 'playing') return 'Đang chơi';
    const p = this.seats[seat];
    if (!p) return null;
    if (p.id === this.hostId) return 'Không thể mời chủ phòng ra';
    this.seats[seat] = null;
    return { kicked: p };
  }

  isEmpty() { return !this.humans().some((p) => p.connected); }

  setSettings(s) {
    if (this.state === 'playing') return 'Đang chơi, hết ván rồi đổi luật nha';
    this.settings = normalizeSettings({ ...this.settings, ...s });
    return null;
  }
  clearLedger() { this.ledger = { players: {}, games: [] }; }

  // ---------- Hẹn giờ ----------
  setTimer(name, ms, fn) {
    clearTimeout(this.timers[name]);
    this.timers[name] = setTimeout(() => { delete this.timers[name]; fn(); }, ms);
  }
  clearTimer(name) { clearTimeout(this.timers[name]); delete this.timers[name]; }
  destroy() { Object.values(this.timers).forEach(clearTimeout); this.timers = {}; }

  isAuto(seat) { const p = this.seats[seat]; return !!p && (p.isBot || !p.connected); }

  // Bắt đầu ván: dọn người đã rời, kiểm tra số người, gọi subclass
  start() {
    if (this.state === 'playing') return 'Ván đang diễn ra';
    this.seats.forEach((p, i) => { if (p && p.leftMidGame) this.seats[i] = null; });
    if (this.playerCount() < this.minPlayers()) return `Cần ít nhất ${this.minPlayers()} người (có thể thêm bot)`;
    this.destroy();
    this.state = 'playing';
    this.results = null;
    this.begin();
    return null;
  }

  // ---------- Tính tiền ----------
  unitInfo() {
    const st = this.settings;
    return st.debt ? { mult: st.unit, label: st.unitLabel } : { mult: COIN_UNIT, label: 'xu' };
  }

  /** rows: [{seat, parts, rank?, badge?, note, show?}] -> chốt ván */
  finish(rows) {
    this.destroy();
    const unit = this.unitInfo();
    rows.forEach((r) => { r.delta = Math.round(r.parts * unit.mult * 100) / 100; });
    // Làm tròn khi chia đều có thể lệch vài xu: dồn phần lẻ cho người thắng đầu tiên để tổng luôn bằng 0
    const residual = Math.round(rows.reduce((a, r) => a + r.delta, 0) * 100) / 100;
    if (residual) { const w = rows.find((r) => r.delta > 0) || rows[0]; w.delta = Math.round((w.delta - residual) * 100) / 100; }
    rows.forEach((r) => {
      r.cardsLeft = r.cardsLeft || [];
      const p = this.seats[r.seat];
      if (p && !this.settings.debt) {
        if (p.isBot) p.botCoins = (p.botCoins || 1000) + r.delta;
        else this.hooks.addCoins(p.id, r.delta);
      }
    });
    if (this.settings.debt) this.recordDebt(rows, unit);
    this.results = rows;
    this.state = 'ended';
    this.hooks.emitEvent(this, { kind: 'end', results: rows, unit, debt: this.settings.debt });
    this.hooks.emitState(this);
  }

  recordDebt(rows, unit) {
    const L = this.ledger;
    const game = { at: Date.now(), label: unit.label, rows: [] };
    rows.forEach((r) => {
      const p = this.seats[r.seat];
      if (!p) return;
      const e = (L.players[p.id] ||= { name: p.name, avatar: p.avatar, isBot: p.isBot, total: 0, games: 0, wins: 0 });
      Object.assign(e, { name: p.name, avatar: p.avatar });
      e.total = Math.round((e.total + r.delta) * 100) / 100; e.games++; if (r.delta > 0) e.wins++;
      game.rows.push({ id: p.id, delta: r.delta, rank: r.rank, note: r.note });
    });
    L.games.unshift(game);
    L.games = L.games.slice(0, 30);
  }

  // ---------- Dữ liệu cho client ----------
  summary() {
    return { code: this.code, name: this.name, theme: this.theme, game: this.gameType, players: this.playerCount(), humans: this.humans().length, state: this.state };
  }

  baseView(id) {
    const mySeat = this.seatOf(id);
    return {
      game: this.gameType, code: this.code, name: this.name, theme: this.theme, isPublic: this.isPublic,
      hostId: this.hostId, state: this.state, mySeat,
      seats: this.seats.map((p, s) => p && {
        id: p.id, name: p.name, avatar: p.avatar, isBot: p.isBot, connected: p.connected,
        coins: p.isBot ? p.botCoins : this.hooks.getCoins(p.id),
        debt: this.ledger.players[p.id] ? this.ledger.players[p.id].total : 0,
        inGame: this.state !== 'waiting' && this.inGame(s),
        cardCount: null, passed: false, rank: null, bad: false,
        rank2: this.state === 'ended' && this.results ? ((this.results.find((r) => r.seat === s) || {}).rank ?? null) : null,
      }),
      hand: [], turn: null, deadline: 0, lastPlay: null, startCard: null,
      results: this.results, settings: this.settings,
      ledger: this.settings.debt || this.ledger.games.length ? this.ledger : null,
      turnMs: this.turnMs, now: Date.now(),
    };
  }

  serialize() {
    return {
      game: this.gameType, code: this.code, name: this.name, theme: this.theme, isPublic: this.isPublic, hostId: this.hostId,
      seats: this.seats, state: this.state, results: this.results, createdAt: this.createdAt,
      settings: this.settings, ledger: this.ledger, meta: this.meta, g: this.g,
    };
  }

  static restore(data, hooks) {
    const r = new this({ code: data.code, name: data.name, theme: data.theme, isPublic: data.isPublic, hooks });
    Object.assign(r, {
      hostId: data.hostId, seats: data.seats, state: data.state, results: data.results, createdAt: data.createdAt,
      settings: normalizeSettings(data.settings), ledger: data.ledger || { players: {}, games: [] }, meta: data.meta || {}, g: data.g,
    });
    if (r.state === 'playing') r.resume();
    return r;
  }
}
