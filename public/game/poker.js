// 🃏 POKER (Texas Hold'em, không giới hạn mức tố)
// - Mỗi ván mỗi người cầm 100 chip, mù nhỏ 1 / mù lớn 2, nút chia bài (dealer) xoay vòng.
// - 2 lá tẩy + 5 lá chung (flop 3, turn 1, river 1). Bỏ bài / Xem / Theo / Tố / All-in.
// - Hết ván: chip lời/lỗ được quy ra phần (10 chip = 1 phần). Có chia pot phụ khi all-in.
import { BaseRoom, shuffle } from './base.js';
import { rankOf, suitOf } from '../shared/rules.js';

export const BUY_IN = 100, SB = 1, BB = 2;
export const pv = (id) => (rankOf(id) === 12 ? 2 : rankOf(id) + 3); // giá trị poker: 2..14 (A = 14)
const RANK_NAME = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10' };
const rn = (v) => RANK_NAME[v] || String(v);
export const HAND_NAMES = ['Mậu thầu', 'Đôi', 'Thú (2 đôi)', 'Sám cô', 'Sảnh', 'Thùng', 'Cù lũ', 'Tứ quý', 'Thùng phá sảnh'];

/** Đánh giá 5 lá: mảng [hạng, ...so sánh phụ] */
function eval5(cards) {
  const vs = cards.map(pv).sort((a, b) => b - a);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const uniq = [...new Set(vs)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (vs[0] - vs[4] === 4) straightHigh = vs[0];
    else if (vs.join() === '14,5,4,3,2') straightHigh = 5; // A-2-3-4-5
  }
  const cnt = {};
  vs.forEach((v) => (cnt[v] = (cnt[v] || 0) + 1));
  const groups = Object.entries(cnt).map(([v, n]) => [n, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const byGroups = groups.map((g) => g[1]);
  if (straightHigh && flush) return [8, straightHigh];
  if (groups[0][0] === 4) return [7, ...byGroups];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [6, ...byGroups];
  if (flush) return [5, ...vs];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][0] === 3) return [3, ...byGroups];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [2, ...byGroups];
  if (groups[0][0] === 2) return [1, ...byGroups];
  return [0, ...vs];
}
export const cmpHand = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };

/** Bài tốt nhất từ 5–7 lá: {score, cards, name} */
export function bestHand(cards) {
  let best = null;
  const n = cards.length;
  const pick = (start, cur) => {
    if (cur.length === 5) {
      const sc = eval5(cur);
      if (!best || cmpHand(sc, best.score) > 0) best = { score: sc, cards: [...cur] };
      return;
    }
    for (let i = start; i < n; i++) { cur.push(cards[i]); pick(i + 1, cur); cur.pop(); }
  };
  if (n < 5) return { score: [-1], cards, name: '' };
  pick(0, []);
  const s = best.score;
  let name = HAND_NAMES[s[0]];
  if (s[0] === 1) name = `Đôi ${rn(s[1])}`;
  if (s[0] === 2) name = `Thú ${rn(s[1])} & ${rn(s[2])}`;
  if (s[0] === 3) name = `Sám cô ${rn(s[1])}`;
  if (s[0] === 0) name = `Mậu thầu ${rn(s[1])}`;
  if (s[0] === 8 && s[1] === 14) name = 'Thùng phá sảnh lớn 👑';
  return { ...best, name };
}

export class PokerRoom extends BaseRoom {
  static GAME = 'poker';

  begin() {
    const inGame = this.seats.map((p) => !!p);
    const players = [0, 1, 2, 3].filter((s) => inGame[s]);
    const next = (s) => { for (let i = 1; i <= 4; i++) { const t = (s + i) % 4; if (inGame[t]) return t; } return s; };
    const dealer = this.meta.dealer != null && inGame[this.meta.dealer] ? next(this.meta.dealer) : players[0];
    this.meta.dealer = dealer;
    const deck = shuffle([...Array(52).keys()]);
    const hands = [[], [], [], []];
    for (let k = 0; k < 2; k++) players.forEach((s) => hands[s].push(deck.pop()));
    const sb = players.length === 2 ? dealer : next(dealer);
    const bb = next(sb);
    this.g = {
      inGame, dealer, sb, bb, deck, hands, board: [], street: 'pre',
      stack: [0, 1, 2, 3].map((s) => (inGame[s] ? BUY_IN : 0)), bet: [0, 0, 0, 0], contrib: [0, 0, 0, 0],
      folded: [false, false, false, false], allin: [false, false, false, false], acted: [false, false, false, false],
      currentBet: 0, minRaise: BB, turn: null, deadline: 0, last: null, showdown: null,
    };
    this.post(sb, SB); this.post(bb, BB);
    this.g.currentBet = BB;
    this.g.turn = next(bb);
    this.hooks.emitEvent(this, { kind: 'deal' });
    this.beginTurn();
  }

  post(s, amt) {
    const g = this.g;
    const a = Math.min(amt, g.stack[s]);
    g.stack[s] -= a; g.bet[s] += a; g.contrib[s] += a;
    if (g.stack[s] === 0) g.allin[s] = true;
  }

  live() { return [0, 1, 2, 3].filter((s) => this.g.inGame[s] && !this.g.folded[s]); }
  canAct(s) { const g = this.g; return g.inGame[s] && !g.folded[s] && !g.allin[s]; }
  nextActor(from) { for (let i = 1; i <= 4; i++) { const s = (from + i) % 4; if (this.canAct(s)) return s; } return null; }

  resume() { this.beginTurn(); }

  beginTurn() {
    const g = this.g;
    g.deadline = Date.now() + this.turnMs;
    this.setTimer('turn', this.turnMs + 300, () => this.timeout());
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  timeout() {
    const g = this.g;
    if (this.state !== 'playing') return;
    this.action(g.turn, { a: g.bet[g.turn] >= g.currentBet ? 'check' : 'fold' });
  }

  scheduleAuto() {
    if (this.state !== 'playing' || !this.g || this.g.turn == null) return;
    if (this.isAuto(this.g.turn)) this.setTimer('bot', 700 + Math.random() * 700, () => this.botMove(this.g.turn));
  }

  // Bot: đánh theo độ mạnh bài
  botMove(s) {
    const g = this.g;
    if (this.state !== 'playing' || g.turn !== s) return;
    const toCall = g.currentBet - g.bet[s];
    const vals = g.hands[s].map(pv).sort((a, b) => b - a);
    let strength;
    if (g.board.length === 0) {
      strength = (vals[0] === vals[1] ? 0.55 + vals[0] / 40 : (vals[0] + vals[1]) / 32) + (suitOf(g.hands[s][0]) === suitOf(g.hands[s][1]) ? 0.05 : 0);
    } else {
      const h = bestHand([...g.hands[s], ...g.board]);
      const boardOnly = g.board.length >= 5 ? bestHand(g.board).score[0] : -1;
      strength = [0.2, 0.5, 0.7, 0.8, 0.87, 0.9, 0.95, 0.99, 1][h.score[0]] - (h.score[0] === boardOnly ? 0.25 : 0);
    }
    strength += (Math.random() - 0.5) * 0.15;
    const pot = g.contrib.reduce((a, b) => a + b, 0);
    if (strength > 0.78 && g.stack[s] > toCall) return this.action(s, { a: 'raise', to: g.currentBet + Math.max(g.minRaise, Math.round(pot * (0.4 + Math.random() * 0.4))) });
    if (toCall === 0) return this.action(s, { a: 'check' });
    const price = toCall / (g.stack[s] + toCall);
    if (strength > 0.45 + price * 0.6 || (price < 0.06 && Math.random() < 0.6)) return this.action(s, { a: 'call' });
    return this.action(s, { a: 'fold' });
  }

  action(s, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu ván';
    if (g.turn !== s) return 'Chưa tới lượt bạn';
    const toCall = g.currentBet - g.bet[s];
    const a = p.a;
    if (a === 'fold') { g.folded[s] = true; }
    else if (a === 'check') { if (toCall > 0) return 'Đang có người tố, phải Theo hoặc Bỏ'; }
    else if (a === 'call') { this.post(s, toCall); }
    else if (a === 'raise' || a === 'allin') {
      const maxTo = g.bet[s] + g.stack[s];
      let to = a === 'allin' ? maxTo : Math.round(Number(p.to) || 0);
      if (to > maxTo) to = maxTo;
      const minTo = g.currentBet + g.minRaise;
      if (to < minTo && to < maxTo) return `Tố ít nhất tới ${minTo} chip`;
      if (to <= g.currentBet) { this.post(s, Math.min(toCall, g.stack[s])); }
      else {
        const raiseBy = to - g.currentBet;
        if (raiseBy >= g.minRaise) { g.minRaise = raiseBy; g.acted = g.acted.map(() => false); }
        g.currentBet = to;
        this.post(s, to - g.bet[s]);
      }
    } else return 'Không hiểu thao tác';
    g.acted[s] = true;
    g.last = { seat: s, a, amount: g.bet[s] };
    this.hooks.emitEvent(this, { kind: 'pk', what: a, seat: s, amount: g.bet[s], allin: g.allin[s] });
    this.clearTimer('bot');
    this.advance(s);
    return null;
  }

  advance(from) {
    const g = this.g;
    if (this.live().length === 1) return this.finishHand();
    const roundDone = [0, 1, 2, 3].every((s) => !this.canAct(s) || (g.acted[s] && g.bet[s] === g.currentBet));
    if (!roundDone) { g.turn = this.nextActor(from); return this.beginTurn(); }
    // Sang vòng mới
    const actors = [0, 1, 2, 3].filter((s) => this.canAct(s));
    if (g.street === 'river' || (actors.length <= 1 && g.street !== 'river')) {
      if (g.street === 'river') return this.finishHand();
      // Mọi người all-in: lật hết bài chung
      while (g.board.length < 5) g.board.push(g.deck.pop());
      g.street = 'river';
      this.hooks.emitEvent(this, { kind: 'pk', what: 'runout' });
      this.hooks.emitState(this);
      return this.setTimer('turn', 1800, () => this.finishHand());
    }
    g.street = { pre: 'flop', flop: 'turn', turn: 'river' }[g.street];
    g.board.push(...g.deck.splice(-(g.street === 'flop' ? 3 : 1)));
    g.bet = [0, 0, 0, 0]; g.currentBet = 0; g.minRaise = BB; g.acted = [false, false, false, false];
    g.turn = this.nextActor(g.dealer);
    this.hooks.emitEvent(this, { kind: 'pk', what: 'street', street: g.street });
    this.beginTurn();
  }

  finishHand() {
    const g = this.g;
    if (this.state !== 'playing') return;
    g.turn = null;
    const live = this.live();
    const win = [0, 0, 0, 0];
    const best = {};
    if (live.length === 1) {
      win[live[0]] = g.contrib.reduce((a, b) => a + b, 0);
    } else {
      while (g.board.length < 5) g.board.push(g.deck.pop());
      live.forEach((s) => { best[s] = bestHand([...g.hands[s], ...g.board]); });
      // Chia pot theo mức đóng góp (pot phụ khi có người all-in)
      const levels = [...new Set(g.contrib.filter((x) => x > 0))].sort((a, b) => a - b);
      let prev = 0;
      for (const lv of levels) {
        const pot = [0, 1, 2, 3].reduce((a, s) => a + Math.max(0, Math.min(g.contrib[s], lv) - prev), 0);
        const elig = live.filter((s) => g.contrib[s] >= lv);
        if (elig.length) {
          let top = [elig[0]];
          elig.slice(1).forEach((s) => { const c = cmpHand(best[s].score, best[top[0]].score); if (c > 0) top = [s]; else if (c === 0) top.push(s); });
          const share = Math.floor(pot / top.length);
          top.forEach((s, i) => { win[s] += share + (i === 0 ? pot - share * top.length : 0); });
        }
        prev = lv;
      }
    }
    const players = [0, 1, 2, 3].filter((s) => g.inGame[s]);
    g.showdown = live.length > 1 ? Object.fromEntries(live.map((s) => [s, best[s].name])) : null;
    const rows = players.map((s) => {
      const net = win[s] - g.contrib[s];
      const note = g.folded[s] ? 'Bỏ bài' : best[s] ? best[s].name : 'Mọi người bỏ bài';
      return { seat: s, parts: net / 10, note: `${note} · ${net >= 0 ? '+' : ''}${net} chip`, cardsLeft: g.folded[s] ? [] : g.hands[s], badge: net > 0 ? '🤑' : g.folded[s] ? '🙈' : net < 0 ? '😢' : '🤝' };
    }).sort((a, b) => b.parts - a.parts);
    rows.forEach((r, i) => { r.rank = i + 1; });
    this.hooks.emitEvent(this, { kind: 'pk', what: 'showdown', winners: players.filter((s) => win[s] > g.contrib[s]), names: g.showdown });
    this.finish(rows);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    const me = v.mySeat;
    const open = this.state === 'ended';
    v.turn = this.state === 'playing' ? g.turn : null;
    v.deadline = this.state === 'playing' ? g.deadline : 0;
    v.hand = me >= 0 && g.inGame[me] ? g.hands[me] : [];
    v.pk = {
      board: g.board, street: g.street, pot: g.contrib.reduce((a, b) => a + b, 0), bet: g.bet, stack: g.stack,
      currentBet: g.currentBet, minRaise: g.minRaise, dealer: g.dealer, folded: g.folded, allin: g.allin,
      toCall: me >= 0 ? Math.max(0, g.currentBet - g.bet[me]) : 0, myBest: v.hand.length && g.board.length ? bestHand([...v.hand, ...g.board]).name : '',
      last: g.last, showdown: open ? g.showdown : null,
    };
    v.seats.forEach((p, s) => {
      if (!p || !g.inGame[s]) return;
      const reveal = open && !g.folded[s] && g.showdown;
      p.show = s === me ? null : g.folded[s] ? [] : reveal ? g.hands[s] : [-1, -1];
      p.status = g.folded[s] ? { cls: 'pass', text: '🙈 Bỏ' } : g.allin[s] ? { cls: 'r1', text: `🔥 All-in` } : { cls: 'wait', text: `🪙${g.stack[s]}${g.bet[s] ? ` · cược ${g.bet[s]}` : ''}${s === g.dealer ? ' · D' : ''}` };
    });
    return v;
  }
}
