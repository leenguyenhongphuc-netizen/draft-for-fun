// 🎴 BÀI CÀO (3 cây)
// - Mỗi người 3 lá, tự chạm để lật từng lá cho hồi hộp.
// - Điểm = tổng nút lấy hàng đơn vị (A = 1, 2–9 giữ nguyên, 10/J/Q/K = 0).
// - Ba tây (3 lá J/Q/K) là lớn nhất. Ai cao nhất thì ăn: mỗi người thua trả 1 phần, chia đều cho người thắng.
import { BaseRoom, shuffle } from './base.js';
import { rankOf } from '../shared/rules.js';

export function caoValue(id) {
  const r = rankOf(id); // 0='3' … 7='10', 8=J, 9=Q, 10=K, 11=A, 12='2'
  if (r === 11) return 1;
  if (r === 12) return 2;
  if (r <= 6) return r + 3;
  return 0;
}
export const isFace = (id) => { const r = rankOf(id); return r >= 8 && r <= 10; };

export function judgeCao(hand) {
  if (hand.length === 3 && hand.every(isFace)) return { kind: 'batay', power: 100, label: 'Ba tây! 👑' };
  const p = hand.reduce((s, c) => s + caoValue(c), 0) % 10;
  return { kind: 'normal', power: p, label: p === 0 ? 'Bù (0 nút)' : `${p} nút` };
}

const FLIP_MS = 25000;

export class BaiCaoRoom extends BaseRoom {
  static GAME = 'baicao';

  begin() {
    const inGame = this.seats.map((p) => !!p);
    const deck = shuffle([...Array(52).keys()]);
    const hands = [[], [], [], []];
    for (let k = 0; k < 3; k++) [0, 1, 2, 3].forEach((s) => { if (inGame[s]) hands[s].push(deck.pop()); });
    this.g = { inGame, hands, flipped: [[false, false, false], [false, false, false], [false, false, false], [false, false, false]], deadline: Date.now() + FLIP_MS };
    this.hooks.emitEvent(this, { kind: 'deal' });
    this.resume();
    this.hooks.emitState(this);
  }

  resume() {
    this.g.deadline = Math.max(this.g.deadline, Date.now() + 3000);
    this.setTimer('flip', this.g.deadline - Date.now(), () => this.showdown());
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing' || !this.g) return;
    [0, 1, 2, 3].forEach((s) => {
      if (!this.g.inGame[s] || !this.isAuto(s)) return;
      // Bot lật từng lá một cách hồi hộp
      [0, 1, 2].forEach((i) => this.setTimer(`bot${s}${i}`, 1500 + i * (900 + Math.random() * 900) + Math.random() * 2500, () => this.action(s, { a: 'flip', i })));
    });
  }

  action(seat, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g || !g.inGame[seat]) return 'Chưa bắt đầu ván';
    if (p.a === 'flip' || p.a === 'flipAll') {
      const idx = p.a === 'flipAll' ? [0, 1, 2] : [Number(p.i)];
      let changed = false;
      idx.forEach((i) => { if (i >= 0 && i < 3 && !g.flipped[seat][i]) { g.flipped[seat][i] = true; changed = true; } });
      if (!changed) return null;
      this.hooks.emitEvent(this, { kind: 'bc', what: 'flip', seat, n: g.flipped[seat].filter(Boolean).length });
      if ([0, 1, 2, 3].every((s) => !g.inGame[s] || g.flipped[s].every(Boolean))) {
        this.clearTimer('flip');
        this.setTimer('flip', 900, () => this.showdown());
      }
      this.hooks.emitState(this);
      return null;
    }
    return 'Không hiểu thao tác';
  }

  showdown() {
    if (this.state !== 'playing') return;
    const g = this.g;
    const players = [0, 1, 2, 3].filter((s) => g.inGame[s]);
    players.forEach((s) => { g.flipped[s] = [true, true, true]; });
    const js = Object.fromEntries(players.map((s) => [s, judgeCao(g.hands[s])]));
    const best = Math.max(...players.map((s) => js[s].power));
    const winners = players.filter((s) => js[s].power === best);
    const losers = players.length - winners.length;
    const rows = players.map((s) => {
      const win = winners.includes(s);
      const parts = winners.length === players.length ? 0 : win ? Math.round((losers / winners.length) * 100) / 100 : -1;
      return { seat: s, parts, note: js[s].label + (win && winners.length < players.length ? ' · ăn hết' : ''), cardsLeft: g.hands[s], badge: win ? '👑' : '😢' };
    }).sort((a, b) => b.parts - a.parts);
    rows.forEach((r, i) => { r.rank = i + 1; });
    this.hooks.emitEvent(this, { kind: 'bc', what: 'showdown', winners, best: js[winners[0]].kind === 'batay' ? 'batay' : best });
    this.finish(rows);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    const me = v.mySeat;
    const open = this.state === 'ended';
    v.deadline = this.state === 'playing' ? g.deadline : 0;
    v.turnMs = FLIP_MS;
    v.hand = me >= 0 && g.inGame[me] ? g.hands[me] : [];
    v.bc = { flipped: me >= 0 ? g.flipped[me] : null };
    if (v.hand.length && (open || g.flipped[me].every(Boolean))) v.bc.my = judgeCao(v.hand);
    v.seats.forEach((p, s) => {
      if (!p || !g.inGame[s]) return;
      p.show = s === me ? null : g.hands[s].map((c, i) => (open || g.flipped[s][i] ? c : -1));
      const n = g.flipped[s].filter(Boolean).length;
      if (open || n === 3) { const j = judgeCao(g.hands[s]); p.status = { cls: j.kind === 'batay' ? 'r1' : 'wait', text: j.label }; }
      else p.status = { cls: 'pass', text: `🫣 ${n}/3` };
    });
    return v;
  }
}
