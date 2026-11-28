// 🏙️ CỜ TỶ PHÚ VIỆT NAM
// - Gieo 2 xúc xắc, đi quanh 28 ô. Qua Xuất phát nhận lương 200.
// - Đến thành phố / sân bay chưa ai mua: được mua. Đến đất của người khác: trả tiền thuê.
// - Đến đất của mình: được xây thêm nhà (tối đa khách sạn). Có đủ cặp tỉnh cùng màu thì tiền thuê đất trống gấp đôi.
// - Gieo đôi được gieo thêm 1 lần. Vào tù thì mất 1 lượt.
// - Hết tiền là phá sản. Hết 15 vòng (hoặc chỉ còn 1 người) thì ai nhiều tài sản nhất thắng.
import { BaseRoom, POINTS, shuffle } from './base.js';
import { CELLS, JAIL, START_MONEY, SALARY, MAX_LEVEL, MAX_ROUNDS, CARDS, rentOf, buildCost } from './typhu-map.js';

const N = CELLS.length;

export class TyPhuRoom extends BaseRoom {
  static GAME = 'typhu';

  begin() {
    const inGame = this.seats.map((p) => !!p);
    const present = [0, 1, 2, 3].filter((s) => inGame[s]);
    const hs = this.seatOf(this.hostId);
    this.g = {
      inGame, pos: [0, 0, 0, 0], money: [0, 1, 2, 3].map((s) => (inGame[s] ? START_MONEY : 0)),
      owner: new Array(N).fill(-1), level: new Array(N).fill(0), bankrupt: [false, false, false, false],
      jail: [0, 0, 0, 0], turns: [0, 0, 0, 0], turn: hs >= 0 ? hs : present[0], phase: 'roll', dice: null, doubles: 0,
      pending: null, card: null, deck: shuffle([...CARDS.keys()]), deadline: 0, log: [],
    };
    this.hooks.emitEvent(this, { kind: 'tp', what: 'start' });
    this.beginTurn();
  }


  alive() { return [0, 1, 2, 3].filter((s) => this.g.inGame[s] && !this.g.bankrupt[s]); }

  beginTurn() {
    const g = this.g;
    g.deadline = Date.now() + this.turnMs;
    this.setTimer('turn', this.turnMs + 300, () => this.autoMove(g.turn, true));
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing' || !this.g) return;
    if (this.isAuto(this.g.turn)) this.setTimer('bot', 500 + Math.random() * 400, () => this.autoMove(this.g.turn));
  }

  autoMove(seat, timeout = false) {
    const g = this.g;
    if (this.state !== 'playing' || g.turn !== seat) return;
    if (g.phase === 'roll') return this.action(seat, { a: 'roll' });
    const p = g.pending;
    if (g.phase === 'buy') {
      const want = !timeout && g.money[seat] - CELLS[p].price >= 200;
      return this.action(seat, { a: want ? 'buy' : 'skip' });
    }
    if (g.phase === 'build') {
      const want = !timeout && g.money[seat] - buildCost(CELLS[p]) >= 350;
      return this.action(seat, { a: want ? 'build' : 'skip' });
    }
  }

  log(text) { this.g.log.unshift(text); this.g.log = this.g.log.slice(0, 6); }
  nm(s) { const p = this.seats[s]; return p ? p.name : '?'; }

  pay(from, to, amount, why) {
    const g = this.g;
    g.money[from] -= amount;
    if (to >= 0) g.money[to] += amount;
    this.hooks.emitEvent(this, { kind: 'tp', what: 'pay', from, to, amount, why });
    if (g.money[from] < 0) this.raise(from);
  }

  // Thiếu tiền: tự bán nhà rồi bán đất (được nửa giá); vẫn thiếu thì phá sản
  raise(s) {
    const g = this.g;
    const mine = CELLS.map((c, i) => i).filter((i) => g.owner[i] === s).sort((a, b) => (CELLS[a].price || 0) - (CELLS[b].price || 0));
    for (const i of mine) {
      while (g.money[s] < 0 && g.level[i] > 0) { g.level[i]--; g.money[s] += buildCost(CELLS[i]) / 2; }
    }
    for (const i of mine) {
      if (g.money[s] >= 0) break;
      g.owner[i] = -1; g.money[s] += CELLS[i].price / 2;
      this.log(`${this.nm(s)} bán ${CELLS[i].name}`);
    }
    if (g.money[s] < 0) {
      g.bankrupt[s] = true;
      g.money[s] = 0;
      g.owner = g.owner.map((o) => (o === s ? -1 : o));
      this.log(`💥 ${this.nm(s)} phá sản!`);
      this.hooks.emitEvent(this, { kind: 'tp', what: 'bankrupt', seat: s });
    }
  }

  moveTo(s, to, passStart = true) {
    const g = this.g;
    const from = g.pos[s];
    if (passStart && to < from) { g.money[s] += SALARY; this.hooks.emitEvent(this, { kind: 'tp', what: 'salary', seat: s }); }
    g.pos[s] = to;
  }

  action(seat, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu ván';
    if (g.turn !== seat) return 'Chưa tới lượt bạn';
    if (p.a === 'roll') {
      if (g.phase !== 'roll') return 'Đang chờ bạn chọn';
      const d = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      g.dice = d;
      const dbl = d[0] === d[1];
      g.doubles = dbl ? g.doubles + 1 : 0;
      const from = g.pos[seat];
      const to = (from + d[0] + d[1]) % N;
      this.hooks.emitEvent(this, { kind: 'tp', what: 'roll', seat, d, from, to });
      g.phase = 'moving';
      this.hooks.emitState(this);
      // Chờ xúc xắc lăn xong rồi mới đi từng ô, đi xong mới xét ô đứng
      g.moveTarget = to;
      this.setTimer('turn', 1250, () => this.completeMove(seat));
      return null;
    }
    if (p.a === 'buy' && g.phase === 'buy') {
      const c = CELLS[g.pending];
      if (g.money[seat] < c.price) return 'Không đủ tiền 🥲';
      g.money[seat] -= c.price;
      g.owner[g.pending] = seat;
      this.log(`${this.nm(seat)} mua ${c.name}`);
      this.hooks.emitEvent(this, { kind: 'tp', what: 'buy', seat, cell: g.pending });
      return this.endTurn();
    }
    if (p.a === 'build' && g.phase === 'build') {
      const c = CELLS[g.pending];
      const cost = buildCost(c);
      if (g.money[seat] < cost) return 'Không đủ tiền xây 🥲';
      g.money[seat] -= cost;
      g.level[g.pending]++;
      this.log(`${this.nm(seat)} xây ${g.level[g.pending] === MAX_LEVEL ? 'khách sạn' : 'nhà'} ở ${c.name}`);
      this.hooks.emitEvent(this, { kind: 'tp', what: 'build', seat, cell: g.pending, level: g.level[g.pending] });
      return this.endTurn();
    }
    if (p.a === 'skip' && (g.phase === 'buy' || g.phase === 'build')) return this.endTurn();
    return 'Không hiểu thao tác';
  }

  completeMove(seat) {
    const g = this.g;
    if (g.moveTarget == null) return;
    const steps = (g.moveTarget - g.pos[seat] + N) % N;
    this.moveTo(seat, g.moveTarget);
    g.moveTarget = null;
    this.hooks.emitState(this);
    this.setTimer('turn', 250 + steps * 120, () => this.land(seat));
  }

  resume() {
    const g = this.g;
    if (g.phase === 'moving') { if (g.moveTarget != null) this.completeMove(g.turn); else this.setTimer('turn', 800, () => this.land(g.turn)); }
    else this.beginTurn();
  }

  land(s) {
    const g = this.g;
    if (this.state !== 'playing') return;
    const i = g.pos[s];
    const c = CELLS[i];
    g.card = null;
    if (c.type === 'city' || c.type === 'air') {
      const o = g.owner[i];
      if (o === -1) {
        if (g.money[s] >= c.price) { g.phase = 'buy'; g.pending = i; return this.beginTurn(); }
      } else if (o === s) {
        if (c.type === 'city' && g.level[i] < MAX_LEVEL && g.money[s] >= buildCost(c)) { g.phase = 'build'; g.pending = i; return this.beginTurn(); }
      } else if (!g.bankrupt[o]) {
        const groupFull = c.group && CELLS.every((x, k) => x.group !== c.group || g.owner[k] === o);
        const airports = CELLS.filter((x, k) => x.type === 'air' && g.owner[k] === o).length;
        const rent = rentOf(c, g.level[i], groupFull, airports);
        this.log(`${this.nm(s)} trả ${rent} cho ${this.nm(o)} (${c.name})`);
        this.pay(s, o, rent, c.name);
      }
    } else if (c.type === 'tax') {
      this.log(`${this.nm(s)} ${c.name.toLowerCase()} ${c.amount}`);
      this.pay(s, -1, c.amount, c.name);
    } else if (c.type === 'gojail') {
      this.sendJail(s);
    } else if (c.type === 'chance') {
      if (!g.deck.length) g.deck = shuffle([...CARDS.keys()]);
      const card = CARDS[g.deck.pop()];
      g.card = { seat: s, text: card.text, from: c.name };
      this.hooks.emitEvent(this, { kind: 'tp', what: 'card', seat: s, text: card.text });
      this.log(`${this.nm(s)}: ${card.text}`);
      if (card.money) { if (card.money > 0) g.money[s] += card.money; else this.pay(s, -1, -card.money, 'Thẻ'); }
      if (card.each) this.alive().forEach((o) => { if (o !== s) this.pay(o, s, card.each, 'Sinh nhật'); });
      if (card.perHouse) { const n = g.level.reduce((a, l, k) => a + (g.owner[k] === s ? l : 0), 0); if (n) this.pay(s, -1, n * card.perHouse, 'Sửa nhà'); }
      if (card.jail) { this.sendJail(s); }
      else if (card.moveTo != null || card.back) {
        const to = card.back ? (g.pos[s] - card.back + N) % N : card.moveTo;
        this.moveTo(s, to, !card.back);
        this.hooks.emitState(this);
        if (card.moveTo !== 0) { g.phase = 'moving'; this.setTimer('turn', 1400, () => this.land(s)); return; }
      }
    }
    this.endTurn();
  }

  sendJail(s) {
    const g = this.g;
    g.pos[s] = JAIL; g.jail[s] = 1; g.doubles = 0;
    this.log(`🚓 ${this.nm(s)} vào tù`);
    this.hooks.emitEvent(this, { kind: 'tp', what: 'jail', seat: s });
  }

  endTurn() {
    const g = this.g;
    if (this.state !== 'playing') return null;
    g.pending = null;
    const alive = this.alive();
    if (alive.length <= 1) return this.endGame();
    // Gieo đôi được gieo thêm (tối đa 1 lần), trừ khi vừa vào tù / phá sản
    if (g.doubles === 1 && !g.jail[g.turn] && !g.bankrupt[g.turn]) {
      g.phase = 'roll';
      this.hooks.emitEvent(this, { kind: 'tp', what: 'again', seat: g.turn });
      this.beginTurn();
      return null;
    }
    g.doubles = 0;
    g.turns[g.turn]++;
    if (alive.every((s) => g.turns[s] >= MAX_ROUNDS)) return this.endGame();
    let next = g.turn;
    for (let k = 1; k <= 4; k++) {
      const s = (g.turn + k) % 4;
      if (!g.inGame[s] || g.bankrupt[s]) continue;
      if (g.jail[s]) { g.jail[s] = 0; g.turns[s]++; this.log(`🔒 ${this.nm(s)} ngồi tù 1 lượt`); continue; }
      next = s; break;
    }
    g.turn = next;
    g.phase = 'roll';
    g.dice = null;
    this.beginTurn();
    return null;
  }

  assets(s) {
    const g = this.g;
    return g.money[s] + CELLS.reduce((a, c, i) => a + (g.owner[i] === s ? c.price + g.level[i] * buildCost(c) : 0), 0);
  }

  endGame() {
    const g = this.g;
    const players = [0, 1, 2, 3].filter((s) => g.inGame[s]);
    const order = [...players].sort((a, b) => (g.bankrupt[a] - g.bankrupt[b]) || this.assets(b) - this.assets(a));
    const pts = POINTS[players.length];
    const rows = order.map((s, i) => ({
      seat: s, rank: i + 1, parts: pts[i],
      note: g.bankrupt[s] ? '💥 Phá sản' : `Tài sản 💰${this.assets(s)}`,
    }));
    this.hooks.emitEvent(this, { kind: 'tp', what: 'win', seat: order[0] });
    this.finish(rows);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    v.turn = this.state === 'playing' ? g.turn : null;
    v.deadline = this.state === 'playing' ? g.deadline : 0;
    v.tp = {
      pos: g.pos, money: g.money, owner: g.owner, level: g.level, bankrupt: g.bankrupt, jail: g.jail, inGame: g.inGame,
      phase: g.phase, dice: g.dice, pending: g.pending, card: g.card, log: g.log,
      round: Math.min(MAX_ROUNDS, Math.max(...[0, 1, 2, 3].filter((s) => g.inGame[s]).map((s) => g.turns[s])) + 1), maxRounds: MAX_ROUNDS,
    };
    v.seats.forEach((p, s) => {
      if (!p || !g.inGame[s]) return;
      p.status = g.bankrupt[s] ? { cls: 'bad', text: '💥 Phá sản' } : { cls: 'wait', text: `💰${g.money[s]}` };
    });
    return v;
  }
}
