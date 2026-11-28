// 🐴 CỜ CÁ NGỰA
// - Mỗi người 4 ngựa trong chuồng. Gieo được 1 hoặc 6 thì ra quân. Gieo 1 hoặc 6 được gieo thêm lượt nữa.
// - Đường đua 52 ô, mỗi màu xuất phát cách nhau 13 ô. Đi hết 50 ô thì rẽ vào 6 ô về đích (phải đúng số mới vào đích).
// - Đi trúng ô có ngựa đối thủ thì "đá" ngựa đó về chuồng (trừ khi nó đang đứng ở cửa nhà của chính nó).
// - Không được đứng chồng lên ngựa của mình. Ai đưa đủ 4 ngựa về đích trước thì thắng.
import { BaseRoom, POINTS } from './base.js';

export const TRACK = 52;
export const LAST_TRACK = 50;  // bước cuối trên đường đua
export const FINISH = 56;      // 51..56 là đường về đích, 56 = đã về
export const startOf = (s) => s * 13;
export const cellOf = (s, step) => (startOf(s) + step) % TRACK;

export class CaNguaRoom extends BaseRoom {
  static GAME = 'cangua';

  begin() {
    const inGame = this.seats.map((p) => !!p);
    const present = [0, 1, 2, 3].filter((s) => inGame[s]);
    const hs = this.seatOf(this.hostId);
    const first = this.meta.lastWinner != null && inGame[this.meta.lastWinner] ? this.meta.lastWinner : hs >= 0 ? hs : present[0];
    this.g = {
      inGame, horses: [0, 1, 2, 3].map(() => [-1, -1, -1, -1]),
      turn: first, phase: 'roll', dice: null, movable: [], sixes: 0, deadline: 0, lastMove: null,
    };
    this.hooks.emitEvent(this, { kind: 'cn', what: 'start' });
    this.beginTurn();
  }

  resume() { this.beginTurn(); }

  beginTurn() {
    const g = this.g;
    g.deadline = Date.now() + this.turnMs;
    this.setTimer('turn', this.turnMs + 300, () => this.autoMove(g.turn));
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing' || !this.g) return;
    // Sau khi gieo: chờ xúc xắc lăn xong (~1.2s) rồi mới đi
    const wait = this.g.phase === 'move' ? 1300 + Math.random() * 250 : 350 + Math.random() * 300;
    if (this.isAuto(this.g.turn)) this.setTimer('bot', wait, () => this.autoMove(this.g.turn));
  }

  // Các ngựa đi được với số d
  movesFor(seat, d) {
    const hs = this.g.horses[seat];
    const out = [];
    hs.forEach((step, h) => {
      let to;
      if (step === -1) { if (d !== 6 && d !== 1) return; to = 0; }
      else if (step === FINISH) return;
      else { to = step + d; if (to > FINISH) return; }
      // không chồng lên ngựa nhà
      if (to !== FINISH && hs.some((o, k) => k !== h && o === to)) return;
      out.push(h);
    });
    return out;
  }

  // Ngựa đối thủ ở ô track (nếu có): [[seat, h]]
  occupants(cell, except) {
    const res = [];
    this.g.horses.forEach((hs, s) => {
      if (s === except || !this.g.inGame[s]) return;
      hs.forEach((step, h) => { if (step >= 0 && step <= LAST_TRACK && cellOf(s, step) === cell) res.push([s, h]); });
    });
    return res;
  }

  autoMove(seat) {
    const g = this.g;
    if (this.state !== 'playing' || g.turn !== seat) return;
    if (g.phase === 'roll') return this.action(seat, { a: 'roll' });
    // chọn nước đi
    let best = g.movable[0], bestScore = -Infinity;
    for (const h of g.movable) {
      const step = g.horses[seat][h];
      const to = step === -1 ? 0 : step + g.dice;
      let sc = to;
      if (to === FINISH) sc += 100;
      if (step === -1) sc += 60;
      if (to > LAST_TRACK && step <= LAST_TRACK) sc += 40;
      if (to <= LAST_TRACK) {
        const victims = this.occupants(cellOf(seat, to), seat).filter(([s, k]) => !(this.g.horses[s][k] === 0));
        if (victims.length) sc += 80 + victims.length * 10;
      }
      sc += Math.random() * 3;
      if (sc > bestScore) { bestScore = sc; best = h; }
    }
    this.action(seat, { a: 'move', h: best });
  }

  action(seat, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu ván';
    if (g.turn !== seat) return 'Chưa tới lượt bạn';
    if (p.a === 'roll') {
      if (g.phase !== 'roll') return 'Chọn ngựa để đi nha';
      const d = 1 + Math.floor(Math.random() * 6);
      g.dice = d;
      g.sixes = d === 6 || d === 1 ? g.sixes + 1 : 0;
      g.movable = this.movesFor(seat, d);
      this.hooks.emitEvent(this, { kind: 'cn', what: 'roll', seat, d });
      if (!g.movable.length) {
        g.phase = 'wait';
        this.hooks.emitState(this);
        this.setTimer('turn', 1450, () => this.endTurn(d === 6 || d === 1));
        return null;
      }
      g.phase = 'move';
      // Chỉ có 1 nước: tự đi cho nhanh
      if (g.movable.length === 1) {
        this.hooks.emitState(this);
        this.setTimer('turn', 1250, () => this.action(seat, { a: 'move', h: g.movable[0] }));
        return null;
      }
      this.beginTurn();
      return null;
    }
    if (p.a === 'move') {
      if (g.phase !== 'move') return 'Gieo xúc xắc trước nha 🎲';
      const h = Number(p.h);
      if (!g.movable.includes(h)) return 'Con ngựa này không đi được';
      const from = g.horses[seat][h];
      const to = from === -1 ? 0 : from + g.dice;
      g.horses[seat][h] = to;
      const kicks = [];
      if (to <= LAST_TRACK) {
        for (const [s, k] of this.occupants(cellOf(seat, to), seat)) {
          if (g.horses[s][k] === 0) continue; // đứng ở cửa nhà mình thì an toàn
          g.horses[s][k] = -1;
          kicks.push([s, k]);
        }
      }
      g.lastMove = { seat, h, from, to, kicks };
      this.hooks.emitEvent(this, { kind: 'cn', what: 'move', seat, h, from, to, kicks, home: to === FINISH });
      if (g.horses[seat].every((x) => x === FINISH)) return this.win(seat);
      g.phase = 'wait';
      this.hooks.emitState(this);
      // Chờ ngựa đi từng ô xong rồi mới qua lượt
      const steps = from === -1 ? 1 : to - from;
      this.setTimer('turn', 200 + steps * 130 + (kicks.length ? 400 : 0), () => this.endTurn(g.dice === 6 || g.dice === 1));
      return null;
    }
    return 'Không hiểu thao tác';
  }

  endTurn(again) {
    const g = this.g;
    if (this.state !== 'playing') return;
    g.phase = 'roll'; g.movable = []; g.dice = again ? g.dice : null;
    if (!again) {
      g.sixes = 0;
      for (let i = 1; i <= 4; i++) { const s = (g.turn + i) % 4; if (g.inGame[s]) { g.turn = s; break; } }
    } else this.hooks.emitEvent(this, { kind: 'cn', what: 'again', seat: g.turn });
    this.beginTurn();
  }

  progress(s) { return this.g.horses[s].reduce((a, x) => a + x + 1, 0); }

  win(seat) {
    const g = this.g;
    this.meta.lastWinner = seat;
    const players = [0, 1, 2, 3].filter((s) => g.inGame[s]);
    const order = [seat, ...players.filter((s) => s !== seat).sort((a, b) => this.progress(b) - this.progress(a))];
    const pts = POINTS[players.length];
    const rows = order.map((s, i) => ({
      seat: s, rank: i + 1, parts: pts[i],
      note: s === seat ? '🏆 Về đích đủ 4 ngựa' : `${g.horses[s].filter((x) => x === FINISH).length}/4 ngựa về đích`,
    }));
    this.hooks.emitEvent(this, { kind: 'cn', what: 'win', seat });
    this.finish(rows);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    v.turn = this.state === 'playing' ? g.turn : null;
    v.deadline = this.state === 'playing' ? g.deadline : 0;
    v.cn = { horses: g.horses, dice: g.dice, phase: g.phase, movable: g.movable, lastMove: g.lastMove, inGame: g.inGame };
    v.seats.forEach((p, s) => {
      if (!p || !g.inGame[s]) return;
      const home = g.horses[s].filter((x) => x === FINISH).length;
      p.status = { cls: home ? 'r1' : 'wait', text: `🏁 ${home}/4` };
    });
    return v;
  }
}
