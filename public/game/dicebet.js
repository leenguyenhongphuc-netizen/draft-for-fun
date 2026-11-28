// 🦀 BẦU CUA TÔM CÁ & 🎲 TÀI XỈU — chung khung "nhà cái lắc bát, mọi người đặt cược"
// - Nhà cái xoay vòng mỗi ván. Người chơi có 15 giây đặt cược (chip 1 / 2 / 5 phần, tối đa 20 phần/ván).
// - Nhà cái lắc bát 3 hột rồi bấm "Mở bát" (bot / hết giờ thì tự mở).
// - Bầu cua: mỗi hột ra đúng con mình đặt thì ăn 1 lần tiền cược (ra 2 hột ăn 2, 3 hột ăn 3); không ra thì mất.
// - Tài xỉu: tổng 3 hột 11–17 là Tài, 4–10 là Xỉu, ăn 1:1. Ra bộ ba (3 hột giống nhau) nhà cái ăn hết.
import { BaseRoom } from './base.js';

export const BET_MS = 15000;
export const MAX_BET = 20;
export const BC_FACES = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'];
export const BC_ICON = { nai: '🦌', bau: '🍐', ga: '🐓', ca: '🐟', cua: '🦀', tom: '🦐' };
export const BC_NAME = { nai: 'Nai', bau: 'Bầu', ga: 'Gà', ca: 'Cá', cua: 'Cua', tom: 'Tôm' };

/** Tính lời/lỗ một người: bets {mục: số phần}, dice [1..6]x3 */
export function settle(kind, bets, dice) {
  let net = 0;
  if (kind === 'baucua') {
    for (const [f, b] of Object.entries(bets)) {
      const k = dice.filter((d) => BC_FACES[d - 1] === f).length;
      net += k ? b * k : -b;
    }
  } else {
    const sum = dice[0] + dice[1] + dice[2];
    const triple = dice[0] === dice[1] && dice[1] === dice[2];
    const win = sum >= 11 ? 'tai' : 'xiu';
    for (const [f, b] of Object.entries(bets)) net += !triple && f === win ? b : -b;
  }
  return net;
}

class DiceBetRoom extends BaseRoom {
  static MAX = 6;
  inGame(s) { return !!(this.g && this.g.inGame && this.g.inGame[s]); }

  begin() {
    const inGame = this.seats.map((p) => !!p);
    const n = this.seats.length;
    let dealer = this.meta.dealer;
    if (dealer == null) { const hs = this.seatOf(this.hostId); dealer = hs >= 0 ? hs : inGame.indexOf(true); }
    else { for (let i = 1; i <= n; i++) { const s = (dealer + i) % n; if (inGame[s]) { dealer = s; break; } } }
    this.meta.dealer = dealer;
    this.g = { inGame, dealer, phase: 'bet', deadline: Date.now() + BET_MS, bets: {}, done: {}, dice: null };
    this.hooks.emitEvent(this, { kind: 'db', what: 'bet', dealer });
    this.resume();
    this.hooks.emitState(this);
  }

  resume() {
    const g = this.g;
    if (g.phase === 'bet') {
      this.setTimer('phase', Math.max(1000, g.deadline - Date.now()), () => this.shake());
      this.seats.forEach((p, s) => {
        if (!p || !p.isBot || s === g.dealer) return;
        this.setTimer('bot' + s, 1500 + Math.random() * 7000, () => this.botBet(s));
      });
    } else if (g.phase === 'shake') this.setTimer('phase', 1800, () => this.ready());
    else if (g.phase === 'ready') this.setTimer('phase', this.isAuto(g.dealer) ? 1500 : 8000, () => this.open());
  }

  botBet(s) {
    const opts = this.constructor.OPTIONS;
    const k = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < k; i++) this.action(s, { a: 'bet', on: opts[Math.floor(Math.random() * opts.length)], amt: [1, 1, 2, 5][Math.floor(Math.random() * 4)] });
    this.action(s, { a: 'done' });
  }

  // Giới hạn cược: theo số xu đang có (1 phần = 10 xu). Chế độ ghi sổ không trừ xu nên cho tối đa 50 phần.
  betCap(s) {
    const p = this.seats[s];
    if (!p) return 0;
    if (this.settings.debt) return 50;
    const coins = p.isBot ? (p.botCoins ?? 1000) : this.hooks.getCoins(p.id);
    return Math.max(0, Math.floor(coins / this.unitInfo().mult));
  }

  myTotal(s) { return Object.values(this.g.bets[s] || {}).reduce((a, b) => a + b, 0); }

  action(s, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu ván';
    if (p.a === 'bet') {
      if (g.phase !== 'bet') return 'Hết giờ đặt cược rồi, chờ ván sau nha';
      if (s === g.dealer) return 'Bạn đang làm nhà cái 🎩';
      if (!this.constructor.OPTIONS.includes(p.on)) return 'Ô cược không hợp lệ';
      const amt = [1, 2, 5].includes(+p.amt) ? +p.amt : 1;
      const cap = this.betCap(s);
      if (cap <= 0) return 'Hết xu rồi 🥲 Ra sảnh bấm 🧧 Nhận lì xì nha';
      if (this.myTotal(s) + amt > cap) {
        const left = cap - this.myTotal(s);
        return left > 0 ? `Bạn chỉ còn đủ xu cược thêm ${left} phần thôi` : `Bạn đã cược hết số xu đang có (${cap} phần)`;
      }
      const b = (g.bets[s] ||= {});
      b[p.on] = (b[p.on] || 0) + amt;
      g.done[s] = false;
      this.hooks.emitEvent(this, { kind: 'db', what: 'chip', seat: s, on: p.on, amt });
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'clear') {
      if (g.phase !== 'bet') return null;
      delete g.bets[s]; g.done[s] = false;
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'done') {
      if (g.phase !== 'bet') return null;
      g.done[s] = true;
      // Mọi người (trừ nhà cái) đã xong và có ít nhất 1 cược -> lắc luôn
      const players = this.seats.map((x, k) => k).filter((k) => g.inGame[k] && k !== g.dealer);
      if (players.every((k) => g.done[k]) && Object.keys(g.bets).length) { this.clearTimer('phase'); this.shake(); }
      else this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'shake') {
      if (s !== g.dealer || g.phase !== 'bet') return null;
      if (!Object.keys(g.bets).length) return 'Chưa ai đặt cược, chờ chút nha';
      this.clearTimer('phase'); this.shake();
      return null;
    }
    if (p.a === 'open') {
      if (s !== g.dealer || g.phase !== 'ready') return s !== g.dealer ? 'Chỉ nhà cái mới được mở bát' : null;
      this.open();
      return null;
    }
    return 'Không hiểu thao tác';
  }

  shake() {
    const g = this.g;
    if (this.state !== 'playing' || g.phase !== 'bet') return;
    if (!Object.keys(g.bets).length) {
      this.hooks.emitEvent(this, { kind: 'db', what: 'nobet' });
      g.deadline = Date.now() + BET_MS;
      return this.resume(), this.hooks.emitState(this);
    }
    g.phase = 'shake';
    g.dice = [1, 2, 3].map(() => 1 + Math.floor(Math.random() * 6));
    this.hooks.emitEvent(this, { kind: 'db', what: 'shake' });
    this.hooks.emitState(this);
    this.setTimer('phase', 1800, () => this.ready());
  }

  ready() {
    const g = this.g;
    if (g.phase !== 'shake') return;
    g.phase = 'ready';
    this.hooks.emitState(this);
    this.setTimer('phase', this.isAuto(g.dealer) ? 1500 : 8000, () => this.open());
  }

  open() {
    const g = this.g;
    if (this.state !== 'playing' || g.phase !== 'ready') return;
    this.destroy();
    g.phase = 'open';
    const kind = this.constructor.GAME;
    const rows = [];
    let dealerNet = 0;
    this.seats.forEach((p, s) => {
      if (!p || !g.inGame[s] || s === g.dealer) return;
      const bets = g.bets[s] || {};
      const net = settle(kind, bets, g.dice);
      dealerNet -= net;
      const desc = Object.entries(bets).map(([f, b]) => `${this.constructor.LABEL[f]} ${b}`).join(', ');
      rows.push({ seat: s, parts: net, note: desc ? `Cược ${desc}` : 'Không cược', badge: net > 0 ? '🤑' : net < 0 ? '😢' : '🤝' });
    });
    rows.push({ seat: g.dealer, parts: dealerNet, note: '🎩 Nhà cái', badge: '🎩' });
    rows.sort((a, b) => b.parts - a.parts).forEach((r, i) => { r.rank = i + 1; });
    this.hooks.emitEvent(this, { kind: 'db', what: 'open', dice: g.dice });
    // Chờ hoạt ảnh mở bát rồi mới hiện kết quả
    this.pendingRows = rows;
    this.setTimer('fin', 1600, () => this.finish(rows));
    this.hooks.emitState(this);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    const me = v.mySeat;
    const totals = {};
    const by = {}; // ô cược -> [{seat, amt}]
    Object.entries(g.bets).forEach(([seat, b]) => Object.entries(b).forEach(([f, x]) => {
      totals[f] = (totals[f] || 0) + x;
      (by[f] ||= []).push({ seat: +seat, amt: x });
    }));
    v.deadline = g.phase === 'bet' ? g.deadline : 0;
    v.turnMs = BET_MS;
    v.db = {
      phase: g.phase, dealer: g.dealer, dice: g.phase === 'open' || this.state === 'ended' ? g.dice : null,
      myBets: (me >= 0 && g.bets[me]) || {}, totals, by, myCap: me >= 0 ? this.betCap(me) : 0, myTotal: me >= 0 ? this.myTotal(me) : 0, done: !!g.done[me],
      players: this.seats.map((p, s) => (p && g.inGame[s] ? { bet: this.myTotal(s), done: !!g.done[s] } : null)),
    };
    v.seats.forEach((p, s) => { if (p) p.status = s === g.dealer ? { cls: 'r1', text: '🎩 Nhà cái' } : null; });
    return v;
  }
}

export class BauCuaRoom extends DiceBetRoom {
  static GAME = 'baucua';
  static OPTIONS = BC_FACES;
  static LABEL = BC_NAME;
}
export class TaiXiuRoom extends DiceBetRoom {
  static GAME = 'taixiu';
  static OPTIONS = ['tai', 'xiu'];
  static LABEL = { tai: 'Tài', xiu: 'Xỉu' };
}
