// 🎪 LÔ TÔ HỘI CHỢ
// - Chủ phòng bấm bắt đầu là sân khấu chạy liên tục: BÁN VÉ -> XỔ SỐ -> CÓ NGƯỜI KINH -> BÁN VÉ…
// - Ai vào phòng lúc nào cũng được, chờ vòng mới thì mua vé (tối đa 3 vé, mỗi vé 1 phần).
// - Vé 3 hàng × 9 cột, mỗi hàng 5 số (cột 1: 1–9, cột 2: 10–19 … cột 9: 80–90).
// - Hàng nào đủ 5 số đã xổ là KINH! Người kinh ăn hết tiền vé (nhiều người kinh cùng lúc thì chia đều).
import { BaseRoom, shuffle } from './base.js';

const SELL_MS = 15000;
const CALL_MS = 3600;
const WIN_MS = 6500;
export const MAX_TICKETS = 3;

export function makeTicket() {
  const rows = [];
  for (let r = 0; r < 3; r++) rows.push(shuffle([...Array(9).keys()]).slice(0, 5).sort((a, b) => a - b));
  const grid = [[], [], []].map(() => new Array(9).fill(null));
  for (let c = 0; c < 9; c++) {
    const rowsInCol = [0, 1, 2].filter((r) => rows[r].includes(c));
    if (!rowsInCol.length) continue;
    const lo = c === 0 ? 1 : c * 10, hi = c === 8 ? 90 : c * 10 + 9;
    const pool = shuffle(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)).slice(0, rowsInCol.length).sort((a, b) => a - b);
    rowsInCol.forEach((r, k) => { grid[r][c] = pool[k]; });
  }
  return grid;
}
export const rowDone = (row, called) => row.filter((n) => n != null).every((n) => called.has(n));
export const ticketKinh = (t, called) => t.some((row) => rowDone(row, called));

// Câu hò của MC
const RHYMES = [
  (n) => `Cờ ra con mấy, con mấy gì ra… con số ${n}!`,
  (n) => `Lô tô đây, ai chờ thì dò… số ${n} nè bà con ơi!`,
  (n) => `Lồng cầu quay quay, số may bay ra… ${n}!`,
  (n) => `Tết này phát tài, ai trúng con ${n}?`,
  (n) => `Bà con dò kỹ, đừng để lỡ… con số ${n}!`,
  (n) => `Ra rồi ra rồi, con ${n} đây!`,
  (n) => `Hồi hộp chưa nè, số ${n} xuất hiện!`,
  (n) => `Ai chờ ${n} thì la lên coi!`,
];
const SPECIAL = {
  1: 'Một mình một ngựa, con số 1!', 9: 'Chín bỏ làm mười, con số 9!', 10: 'Mười phân vẹn mười, số 10!',
  22: 'Hai con vịt bầu, số 22!', 33: 'Ba mươi ba con ba ba, số 33!', 39: 'Thần tài nhỏ tới, số 39!',
  49: 'Bốn chín chưa qua năm ba đã tới, số 49!', 68: 'Lộc phát lộc phát, số 68!', 79: 'Thần tài lớn tới, số 79!',
  86: 'Phát lộc đầy nhà, số 86!', 88: 'Hai con lật đật, số 88!', 90: 'Ông già chín chục, số 90!',
};
export const rhymeFor = (n) => SPECIAL[n] || RHYMES[Math.floor(Math.random() * RHYMES.length)](n);

export class LoToRoom extends BaseRoom {
  static GAME = 'loto';
  static MAX = 10;
  minPlayers() { return 1; }
  inGame(s) { return !!this.seats[s]; }

  // Người rời phòng: bỏ luôn ghế (vé của họ bỏ đi)
  leave(id) {
    const seat = this.seatOf(id);
    if (seat < 0) return;
    this.seats[seat] = null;
    if (this.g) delete this.g.tickets[seat];
    this.fixHost();
  }

  begin() {
    this.g = { phase: 'sell', deadline: 0, tickets: {}, called: [], last: null, rhyme: '', winners: null, round: 0, claimAt: 0 };
    this.newRound();
  }

  resume() {
    const g = this.g;
    if (g.phase === 'sell') this.setTimer('phase', Math.max(1500, g.deadline - Date.now()), () => this.startCalling());
    else if (g.phase === 'call') this.setTimer('phase', CALL_MS, () => this.callNext());
    else this.setTimer('phase', 2500, () => this.newRound());
  }

  newRound() {
    const g = this.g;
    if (this.state !== 'playing') return;
    Object.assign(g, { phase: 'sell', deadline: Date.now() + SELL_MS, tickets: {}, called: [], last: null, rhyme: '', winners: null, claimAt: 0 });
    g.round++;
    this.hooks.emitEvent(this, { kind: 'lt', what: 'sell', round: g.round });
    this.setTimer('phase', SELL_MS, () => this.startCalling());
    // Bot mua vé
    this.seats.forEach((p, s) => {
      if (p && p.isBot) this.setTimer('bot' + s, 1500 + Math.random() * 9000, () => {
        const n = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) this.action(s, { a: 'buy' });
      });
    });
    this.hooks.emitState(this);
  }

  startCalling() {
    const g = this.g;
    if (this.state !== 'playing') return;
    if (!Object.values(g.tickets).some((t) => t.length)) {
      this.hooks.emitEvent(this, { kind: 'lt', what: 'noTickets' });
      return this.newRound();
    }
    g.phase = 'call';
    g.deck = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
    this.hooks.emitEvent(this, { kind: 'lt', what: 'calling' });
    this.hooks.emitState(this);
    this.setTimer('phase', 2200, () => this.callNext());
  }

  callNext() {
    const g = this.g;
    if (this.state !== 'playing' || g.phase !== 'call') return;
    const n = g.deck.pop();
    if (n == null) return this.settle([]);
    g.called.push(n);
    g.last = n;
    g.rhyme = rhymeFor(n);
    this.hooks.emitEvent(this, { kind: 'lt', what: 'call', n, rhyme: g.rhyme });
    // Có ai kinh chưa? Cho 2.5 giây để tự hô "KINH!", hết giờ máy tự công nhận
    const called = new Set(g.called);
    const done = Object.entries(g.tickets).some(([, ts]) => ts.some((t) => ticketKinh(t, called)));
    if (done) {
      g.claimAt = Date.now() + 2500;
      this.hooks.emitEvent(this, { kind: 'lt', what: 'almost' });
      this.setTimer('phase', 2500, () => this.settle());
    } else this.setTimer('phase', CALL_MS, () => this.callNext());
    this.hooks.emitState(this);
  }

  settle() {
    const g = this.g;
    if (g.phase !== 'call') return;
    this.clearTimer('phase');
    const called = new Set(g.called);
    const seats = Object.keys(g.tickets).map(Number).filter((s) => this.seats[s]);
    const win = {}; // seat -> số vé kinh
    let winTickets = 0, pot = 0;
    seats.forEach((s) => {
      pot += g.tickets[s].length;
      const k = g.tickets[s].filter((t) => ticketKinh(t, called)).length;
      if (k) { win[s] = k; winTickets += k; }
    });
    const rows = seats.map((s) => {
      const cost = g.tickets[s].length;
      const gain = winTickets ? (pot * (win[s] || 0)) / winTickets : cost; // không ai kinh: trả lại tiền vé
      const parts = Math.round((gain - cost) * 100) / 100;
      return { seat: s, parts, rank: win[s] ? 1 : 2, note: win[s] ? `KINH! ${win[s]} vé` : `${cost} vé`, badge: win[s] ? '🎉' : '🎫' };
    });
    const unit = this.payout(rows);
    g.phase = 'win';
    g.winners = { seats: Object.keys(win).map(Number), rows, unit, pot };
    this.hooks.emitEvent(this, { kind: 'lt', what: 'kinh', seats: g.winners.seats, pot, unit });
    this.hooks.emitState(this);
    this.setTimer('phase', WIN_MS, () => this.newRound());
  }

  action(seat, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Sân khấu chưa mở';
    if (p.a === 'buy') {
      if (g.phase !== 'sell') return 'Đang xổ số, chờ vòng sau mua vé nha 🎫';
      const mine = (g.tickets[seat] ||= []);
      if (mine.length >= MAX_TICKETS) return `Mỗi vòng tối đa ${MAX_TICKETS} vé thôi nha`;
      mine.push(makeTicket());
      this.hooks.emitEvent(this, { kind: 'lt', what: 'buy', seat, n: mine.length });
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'kinh') {
      if (g.phase !== 'call') return null;
      const called = new Set(g.called);
      if (!(g.tickets[seat] || []).some((t) => ticketKinh(t, called))) return 'Chưa kinh đâu, dò kỹ lại nha 😆';
      this.hooks.emitEvent(this, { kind: 'lt', what: 'shout', seat });
      this.settle();
      return null;
    }
    if (p.a === 'stop') {
      if (this.seats[seat]?.id !== this.hostId) return 'Chỉ chủ phòng mới dừng được';
      this.destroy();
      this.state = 'waiting';
      this.g = null;
      this.hooks.emitState(this);
      return null;
    }
    return 'Không hiểu thao tác';
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    const me = v.mySeat;
    v.deadline = g.phase === 'sell' ? g.deadline : 0;
    v.turnMs = SELL_MS;
    v.lt = {
      phase: g.phase, round: g.round, called: g.called, last: g.last, rhyme: g.rhyme, sellEnd: g.deadline,
      myTickets: me >= 0 ? g.tickets[me] || [] : [], counts: Object.fromEntries(Object.entries(g.tickets).map(([s, t]) => [s, t.length])),
      pot: Object.values(g.tickets).reduce((a, t) => a + t.length, 0), winners: g.winners, maxTickets: MAX_TICKETS,
    };
    v.seats.forEach((p, s) => { if (p) p.status = null; });
    return v;
  }
}
