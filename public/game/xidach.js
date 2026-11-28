// 🂡 XÌ DÁCH (luật miền Nam, nhà cái xoay vòng)
// - Chia 2 lá. Xì bàn (2 lá A) > Xì dách (A + 10/J/Q/K) > Ngũ linh (5 lá ≤ 21) > điểm thường. Quá 21 là quắc.
// - Lá A: 2 lá -> 10 hoặc 11; 3 lá -> 1 hoặc 10; từ 4 lá -> 1.
// - Người chơi phải đủ 16 mới được dằn; nhà cái phải đủ 15. Quắc là bí mật: vẫn được rút/dằn tới khi lật bài.
// - Thắng thường +1 phần; thắng bằng xì bàn / xì dách / ngũ linh +2 phần. Cùng quắc thì hoà.
import { BaseRoom, shuffle } from './base.js';
import { rankOf } from '../shared/rules.js';

// rankOf: 0='3' … 7='10', 8=J, 9=Q, 10=K, 11=A, 12='2'
export const isAce = (id) => rankOf(id) === 11;
export function cardValue(id) {
  const r = rankOf(id);
  if (r === 12) return 2;
  if (r <= 7) return r + 3;
  if (r <= 10) return 10;
  return 0; // A tính riêng
}

export function scoreHand(hand) {
  const n = hand.length;
  const aces = hand.filter(isAce).length;
  const base = hand.reduce((s, c) => s + cardValue(c), 0);
  const opts = n <= 2 ? [10, 11] : n === 3 ? [1, 10] : [1];
  let best = null, min = Infinity;
  const rec = (i, sum) => {
    if (i === aces) {
      min = Math.min(min, sum);
      if (sum <= 21 && (best === null || sum > best)) best = sum;
      return;
    }
    for (const o of opts) rec(i + 1, sum + o);
  };
  rec(0, base);
  return best === null ? min : best;
}

/** Phân loại bài: {kind, score, power, label} */
export function judge(hand) {
  const n = hand.length;
  if (n === 2 && hand.every(isAce)) return { kind: 'xiban', score: 21, power: 100, label: 'Xì bàn!' };
  if (n === 2 && hand.some(isAce) && hand.some((c) => cardValue(c) === 10)) return { kind: 'xidach', score: 21, power: 90, label: 'Xì dách!' };
  const score = scoreHand(hand);
  if (score > 21) return { kind: 'quac', score, power: -1, label: `Quắc (${score})` };
  if (n === 5) return { kind: 'ngulinh', score, power: 80, label: 'Ngũ linh!' };
  return { kind: 'normal', score, power: score, label: `${score} nút` };
}
const isNatural = (j) => j.kind === 'xiban' || j.kind === 'xidach';

export class XiDachRoom extends BaseRoom {
  static GAME = 'xidach';

  begin() {
    const inGame = this.seats.map((p) => !!p);
    const present = [0, 1, 2, 3].filter((s) => inGame[s]);
    // Nhà cái: ván đầu là chủ phòng, sau đó xoay vòng
    let dealer;
    if (this.meta.dealer == null || !inGame[this.meta.dealer]) {
      const hs = this.seatOf(this.hostId);
      dealer = this.meta.dealer == null && hs >= 0 ? hs : present[0];
      if (this.meta.dealer != null) {
        for (let i = 1; i <= 4; i++) { const s = (this.meta.dealer + i) % 4; if (inGame[s]) { dealer = s; break; } }
      }
    } else {
      for (let i = 1; i <= 4; i++) { const s = (this.meta.dealer + i) % 4; if (inGame[s]) { dealer = s; break; } }
    }
    this.meta.dealer = dealer;
    const deck = shuffle([...Array(52).keys()]);
    const hands = [[], [], [], []];
    for (let k = 0; k < 2; k++) present.forEach((s) => hands[s].push(deck.pop()));
    const order = [];
    for (let i = 1; i <= 4; i++) { const s = (dealer + i) % 4; if (inGame[s] && s !== dealer) order.push(s); }
    this.g = { inGame, deck, hands, dealer, order, idx: 0, phase: 'players', turn: null, deadline: 0, revealed: [false, false, false, false], stood: [false, false, false, false] };
    this.hooks.emitEvent(this, { kind: 'deal' });

    // Nhà cái có xì bàn / xì dách -> lật bài, chốt luôn
    const dj = judge(hands[dealer]);
    if (isNatural(dj)) {
      this.hooks.emitEvent(this, { kind: 'xd', what: dj.kind, seat: dealer });
      return this.showdown();
    }
    // Người chơi có xì bàn / xì dách: lật bài, không phải rút
    order.forEach((s) => {
      const j = judge(hands[s]);
      if (isNatural(j)) { this.g.revealed[s] = true; this.g.stood[s] = true; this.hooks.emitEvent(this, { kind: 'xd', what: j.kind, seat: s }); }
    });
    this.g.order = order.filter((s) => !this.g.stood[s]);
    this.nextTurn(true);
  }

  resume() { if (this.g && this.g.turn != null) this.beginTurn(); }

  nextTurn(first = false) {
    const g = this.g;
    if (!first) g.idx++;
    if (g.phase === 'players' && g.idx < g.order.length) { g.turn = g.order[g.idx]; return this.beginTurn(); }
    if (g.phase === 'players') { g.phase = 'dealer'; g.turn = g.dealer; this.hooks.emitEvent(this, { kind: 'xd', what: 'dealerTurn', seat: g.dealer }); return this.beginTurn(); }
    this.showdown();
  }

  beginTurn() {
    const g = this.g;
    g.deadline = Date.now() + this.turnMs;
    this.setTimer('turn', this.turnMs + 300, () => this.autoMove(g.turn, true));
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing' || !this.g || this.g.turn == null) return;
    if (this.isAuto(this.g.turn)) this.setTimer('bot', 900 + Math.random() * 700, () => this.autoMove(this.g.turn));
  }

  autoMove(seat) {
    if (this.state !== 'playing' || this.g.turn !== seat) return;
    const hand = this.g.hands[seat];
    const sc = scoreHand(hand);
    const isDealer = seat === this.g.dealer;
    const need = isDealer ? 15 : 16;
    let hit = hand.length < 5 && sc <= 21 && (sc < need || (sc < 17 && Math.random() < (isDealer ? 0.6 : 0.4)));
    if (this.action(seat, { a: hit ? 'hit' : 'stand' })) this.action(seat, { a: 'stand', force: true });
  }

  action(seat, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu ván';
    if (g.turn !== seat) return 'Chưa tới lượt bạn';
    const hand = g.hands[seat];
    const isDealer = seat === g.dealer;
    if (p.a === 'hit') {
      if (hand.length >= 5) return 'Đủ 5 lá rồi';
      // Quắc rồi vẫn được rút / dằn như thường để người khác không đoán ra (giữ bí mật tới lúc lật bài)
      hand.push(g.deck.pop());
      const j = judge(hand);
      this.hooks.emitEvent(this, { kind: 'xd', what: 'hit', seat, n: hand.length });
      if (hand.length === 5) {
        if (j.kind === 'ngulinh') this.hooks.emitEvent(this, { kind: 'xd', what: 'ngulinh', seat });
        g.stood[seat] = true;
        this.clearTimer('bot');
        return this.nextTurn();
      }
      this.beginTurn();
      return null;
    }
    if (p.a === 'stand') {
      const sc = scoreHand(hand);
      const need = isDealer ? 15 : 16;
      if (!p.force && sc < need && sc <= 21 && hand.length < 5) return isDealer ? 'Nhà cái phải đủ 15 nút mới được dằn' : 'Chưa đủ tuổi (16 nút) nha, rút thêm đi';
      g.stood[seat] = true;
      this.hooks.emitEvent(this, { kind: 'xd', what: 'stand', seat });
      this.clearTimer('bot');
      return this.nextTurn();
    }
    return 'Không hiểu thao tác';
  }

  showdown() {
    const g = this.g;
    g.turn = null;
    g.revealed = [true, true, true, true];
    const dj = judge(g.hands[g.dealer]);
    const rows = [];
    let dealerParts = 0;
    for (const s of [0, 1, 2, 3]) {
      if (!g.inGame[s] || s === g.dealer) continue;
      const pj = judge(g.hands[s]);
      let parts = 0;
      if (pj.kind === 'quac' && dj.kind === 'quac') parts = 0;
      else if (pj.kind === 'quac') parts = -1;
      else if (dj.kind === 'quac') parts = pj.power >= 80 ? 2 : 1;
      else if (pj.power > dj.power) parts = pj.power >= 80 ? 2 : 1;
      else if (pj.power < dj.power) parts = dj.power >= 80 ? -2 : -1;
      dealerParts -= parts;
      rows.push({ seat: s, parts, note: pj.label + (parts > 0 ? ' · thắng cái' : parts < 0 ? ' · thua cái' : ' · hoà'), cardsLeft: g.hands[s], badge: parts > 0 ? '🎉' : parts < 0 ? '😢' : '🤝' });
    }
    rows.push({ seat: g.dealer, parts: dealerParts, note: '🎩 Nhà cái · ' + dj.label, cardsLeft: g.hands[g.dealer], badge: '🎩' });
    rows.sort((a, b) => b.parts - a.parts);
    rows.forEach((r, i) => { r.rank = i + 1; });
    this.hooks.emitEvent(this, { kind: 'xd', what: 'showdown', hands: g.hands, dealer: g.dealer });
    this.finish(rows);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    const me = v.mySeat;
    const open = this.state === 'ended';
    v.xd = { dealer: g.dealer, phase: g.phase };
    v.turn = this.state === 'playing' ? g.turn : null;
    v.deadline = this.state === 'playing' ? g.deadline : 0;
    v.hand = me >= 0 && g.inGame[me] ? g.hands[me] : [];
    if (v.hand.length) { const j = judge(v.hand); v.xd.my = { label: j.label, kind: j.kind, score: j.score, need: me === g.dealer ? 15 : 16 }; }
    v.seats.forEach((p, s) => {
      if (!p || !g.inGame[s]) return;
      const show = open || g.revealed[s] ? g.hands[s] : g.hands[s].map(() => -1);
      p.show = s === me ? null : show;
      p.cardCount = null;
      if (s === g.dealer) p.status = { cls: 'r1', text: '🎩 Nhà cái' };
      else if (open || g.revealed[s]) { const j = judge(g.hands[s]); p.status = { cls: j.power >= 80 ? 'r1' : j.kind === 'quac' ? 'bad' : 'wait', text: j.label }; }
      else if (g.stood[s]) p.status = { cls: 'pass', text: '✋ Dằn' };
    });
    return v;
  }
}
