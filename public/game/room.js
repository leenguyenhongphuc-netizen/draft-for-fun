import {
  getCombo, canBeat, isChop, comboName, checkInstantWin, rankOf, suitOf, TWO, allPlays,
  normalizeSettings, finishViolation, chopValue, bombsInHand, cardLabel,
} from '../shared/rules.js';
import { botChoose } from './bot.js';

const BOT_NAMES = [
  ['Bé Mèo', '🐱'], ['Cún Con', '🐶'], ['Thỏ Bông', '🐰'], ['Gấu Trúc', '🐼'],
  ['Cáo Nhỏ', '🦊'], ['Ếch Xanh', '🐸'], ['Heo Hồng', '🐷'], ['Hamster', '🐹'],
];
const POINTS = { 2: [1, -1], 3: [2, 0, -2], 4: [3, 1, -1, -3] };
const COIN_UNIT = 10;

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export class Room {
  constructor({ code, name, theme, isPublic, hooks }) {
    this.code = code;
    this.name = name;
    this.theme = theme;
    this.isPublic = isPublic;
    this.hostId = null;
    this.seats = [null, null, null, null];
    this.state = 'waiting'; // waiting | playing | ended
    this.game = null;
    this.results = null;
    this.lastWinnerId = null;
    this.hooks = hooks; // { emitState(room), emitEvent(room, ev), getCoins(id), addCoins(id, n) }
    this.timer = null;
    this.botTimer = null;
    this.createdAt = Date.now();
    this.settings = normalizeSettings();
    this.ledger = { players: {}, games: [] }; // sổ ghi
  }

  get turnMs() { return this.settings.turnSec * 1000; }

  setSettings(s) {
    if (this.state === 'playing') return 'Đang chơi, hết ván rồi đổi luật nha';
    this.settings = normalizeSettings({ ...this.settings, ...s });
    return null;
  }

  clearLedger() { this.ledger = { players: {}, games: [] }; }

  // ---------- Ghế ngồi ----------
  humans() { return this.seats.filter((p) => p && !p.isBot); }
  seatOf(playerId) { return this.seats.findIndex((p) => p && p.id === playerId); }
  playerCount() { return this.seats.filter(Boolean).length; }

  join(player) {
    let seat = this.seatOf(player.id);
    if (seat >= 0) {
      Object.assign(this.seats[seat], { connected: true, leftMidGame: false, name: player.name, avatar: player.avatar, acc: player.acc || '' });
      return seat;
    }
    seat = this.seats.findIndex((p) => !p);
    if (seat < 0) {
      // Thay chỗ một bot nếu đang chờ
      if (this.state === 'playing') return -1;
      seat = this.seats.findIndex((p) => p && p.isBot);
      if (seat < 0) return -1;
    }
    this.seats[seat] = { ...player, isBot: false, connected: true };
    if (!this.hostId || this.seatOf(this.hostId) < 0) this.hostId = player.id;
    return seat;
  }

  leave(playerId) {
    const seat = this.seatOf(playerId);
    if (seat < 0) return;
    if (this.state === 'playing' && this.game.inGame[seat]) {
      // Đang chơi: bot đánh thay đến hết ván
      const p = this.seats[seat];
      p.connected = false;
      p.leftMidGame = true;
      this.scheduleAuto();
    } else {
      this.seats[seat] = null;
    }
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
    this.seats[seat] = {
      id: 'bot-' + Math.random().toString(36).slice(2, 8),
      name: pick[0], avatar: pick[1], isBot: true, connected: true, botCoins: 1000,
    };
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

  // ---------- Ván chơi ----------
  start() {
    if (this.state === 'playing') return 'Ván đang diễn ra';
    const seated = this.seats.map((p) => !!p);
    if (seated.filter(Boolean).length < 2) return 'Cần ít nhất 2 người (có thể thêm bot)';
    // Dọn người đã rời giữa ván trước
    this.seats.forEach((p, i) => { if (p && p.leftMidGame) this.seats[i] = null; });
    if (this.seats.filter(Boolean).length < 2) return 'Cần ít nhất 2 người';

    const deck = shuffle([...Array(52).keys()]);
    const hands = [[], [], [], []];
    const inGame = this.seats.map((p) => !!p);
    let k = 0;
    for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) if (inGame[s]) hands[s].push(deck[k++]);

    const firstGame = !this.lastWinnerId || this.seatOf(this.lastWinnerId) < 0;
    let turn;
    if (firstGame) {
      const lowest = Math.min(...hands.flat());
      turn = hands.findIndex((h) => h.includes(lowest));
    } else {
      turn = this.seatOf(this.lastWinnerId);
    }

    this.game = {
      hands, inGame, turn, lastPlay: null, passed: new Set(), finished: [],
      deadline: 0, firstGame, startCard: firstGame ? Math.min(...hands.flat()) : null, round: 1,
      chops: [], bad: [], cong: [],
    };
    this.state = 'playing';
    this.results = null;
    this.hooks.emitEvent(this, { kind: 'deal' });

    // Tới trắng
    for (let s = 0; s < 4; s++) {
      if (!inGame[s] || !this.settings.instantWin) continue;
      const win = checkInstantWin(hands[s]);
      if (win) {
        this.hooks.emitEvent(this, { kind: 'instant', seat: s, label: win, cards: hands[s] });
        this.finishGame(s, win);
        return null;
      }
    }
    this.beginTurn();
    return null;
  }

  activeSeats() {
    const g = this.game;
    return [0, 1, 2, 3].filter((s) => g.inGame[s] && !g.finished.includes(s));
  }

  beginTurn() {
    const g = this.game;
    g.deadline = Date.now() + this.turnMs;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onTimeout(), this.turnMs + 300);
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing') return;
    const p = this.seats[this.game.turn];
    clearTimeout(this.botTimer);
    if (p && (p.isBot || !p.connected)) {
      const delay = p.isBot ? 600 + Math.random() * 600 : 1200;
      const turnAtSchedule = this.game.turn;
      const roundAt = this.game.round;
      this.botTimer = setTimeout(() => {
        if (this.state !== 'playing' || this.game.turn !== turnAtSchedule || this.game.round !== roundAt) return;
        this.autoMove(turnAtSchedule);
      }, delay);
    }
  }

  // Lý do một bộ bài không được đánh theo luật phòng (ngoài chuyện đè bài)
  ruleViolation(seat, combo) {
    const g = this.game;
    if (this.settings.mustStart3 && g.startCard != null && g.hands[seat].includes(g.startCard) && !combo.cards.includes(g.startCard)) {
      return `Ván đầu phải đánh kèm lá ${cardLabel(g.startCard)} nha`;
    }
    return finishViolation(g.hands[seat].length, combo, this.settings);
  }

  legalPlays(seat) {
    const g = this.game;
    const prev = g.lastPlay && g.lastPlay.combo;
    return allPlays(g.hands[seat], prev).filter((c) => !this.ruleViolation(seat, c));
  }

  // Được đánh tự do mà không còn nước nào hợp luật (vd: chỉ còn heo) -> buộc đánh, bị xếp bét
  forcedMove(seat) {
    const g = this.game;
    const prev = g.lastPlay && g.lastPlay.combo;
    if (prev || this.legalPlays(seat).length) return null;
    return [Math.min(...g.hands[seat])];
  }

  autoMove(seat) {
    const g = this.game;
    const oppMin = Math.min(...this.activeSeats().filter((s) => s !== seat).map((s) => g.hands[s].length), 13);
    let cards = botChoose(g.hands[seat], g.lastPlay && g.lastPlay.combo, oppMin, (c) => !this.ruleViolation(seat, c));
    if (!cards && !g.lastPlay) cards = this.forcedMove(seat) || (this.legalPlays(seat)[0] || {}).cards;
    if (cards) this.play(seat, cards, true);
    else this.pass(seat, true);
  }

  onTimeout() {
    if (this.state !== 'playing') return;
    const seat = this.game.turn;
    if (!this.game.lastPlay) {
      const plays = this.legalPlays(seat).sort((a, b) => a.cards.length - b.cards.length || a.top - b.top);
      this.play(seat, plays.length ? plays[0].cards : this.forcedMove(seat), true);
    } else this.pass(seat, true);
  }

  play(seat, cards, auto = false) {
    const g = this.game;
    if (this.state !== 'playing') return 'Chưa bắt đầu ván';
    if (g.turn !== seat) return 'Chưa tới lượt bạn';
    const hand = g.hands[seat];
    if (!Array.isArray(cards) || !cards.every((c) => hand.includes(c))) return 'Bạn không có lá này';
    const combo = getCombo(cards);
    if (!combo) return 'Bộ bài không hợp lệ';
    const prev = g.lastPlay && g.lastPlay.combo;
    if (!canBeat(prev, combo)) return prev ? `Không đè được ${comboName(prev)}` : 'Không đánh được';
    const violation = this.ruleViolation(seat, combo);
    let forcedBad = false;
    if (violation) {
      const forced = this.forcedMove(seat);
      if (!forced) return violation;
      forcedBad = true; // hết đường: cho đánh nhưng xếp bét
    }

    const chop = isChop(prev, combo);
    let chopParts = 0;
    if (chop) {
      // Chặt chồng: cộng dồn giá trị lần chặt trước
      chopParts = chopValue(prev) + (g.lastPlay.chopParts || 0);
      if (this.settings.chopPay) {
        // Chặt chồng: huỷ khoản chặt trước, người bị chặt sau cùng trả hết phần cộng dồn
        if (g.lastPlay.chopParts) {
          const k = g.chops.map((c) => c.to).lastIndexOf(g.lastPlay.seat);
          if (k >= 0) g.chops.splice(k, 1);
        }
        g.chops.push({ from: g.lastPlay.seat, to: seat, parts: chopParts, label: comboName(prev) });
      }
    }
    g.hands[seat] = hand.filter((c) => !cards.includes(c));
    const victim = chop ? g.lastPlay.seat : null;
    const chain = chop ? (g.lastPlay.chain || 0) + 1 : 0; // chặt chồng: 2, 3…
    const prevName = prev ? comboName(prev) : null;
    g.lastPlay = { seat, combo, victim, chopParts, chain };
    g.startCard = null; // chỉ nước đầu tiên của ván đầu mới bị ràng buộc
    this.hooks.emitEvent(this, {
      kind: 'play', seat, cards: combo.cards, name: comboName(combo), type: combo.type, len: combo.len, prev: prevName, chain, chop, victim, auto,
      chopParts: chop && this.settings.chopPay ? chopParts : 0, unit: this.unitInfo(),
    });

    if (g.hands[seat].length === 0) {
      g.finished.push(seat);
      if (forcedBad) g.bad.push(seat);
      this.hooks.emitEvent(this, { kind: 'out', seat, rank: g.finished.length, bad: forcedBad });
      // Cóng: có người về nhất mà ai chưa đánh lá nào (còn nguyên 13 lá) thì bị cóng, dừng chơi luôn
      if (this.settings.cong && !forcedBad && g.finished.length - g.bad.length === 1) {
        const cong = this.activeSeats().filter((s) => g.hands[s].length === 13);
        if (cong.length) {
          cong.forEach((s) => { g.cong.push(s); g.finished.push(s); });
          this.hooks.emitEvent(this, { kind: 'cong', seats: cong, winner: seat });
        }
      }
      const remaining = this.activeSeats();
      if (remaining.length <= 1) {
        if (remaining.length === 1) g.finished.push(remaining[0]);
        this.finishGame();
        return null;
      }
    }
    this.advance(seat);
    return null;
  }

  pass(seat, auto = false) {
    const g = this.game;
    if (this.state !== 'playing') return 'Chưa bắt đầu ván';
    if (g.turn !== seat) return 'Chưa tới lượt bạn';
    if (!g.lastPlay) return 'Bạn đang được đánh tự do, không bỏ lượt được';
    g.passed.add(seat);
    this.hooks.emitEvent(this, { kind: 'pass', seat, auto });
    this.advance(seat);
    return null;
  }

  newRound(leader) {
    const g = this.game;
    g.lastPlay = null;
    g.passed = new Set();
    g.round++;
    g.turn = leader;
    this.hooks.emitEvent(this, { kind: 'newRound', seat: leader });
  }

  advance(from) {
    const g = this.game;
    for (let i = 1; i <= 4; i++) {
      const s = (from + i) % 4;
      if (g.lastPlay && s === g.lastPlay.seat && !g.finished.includes(s)) {
        this.newRound(s);
        return this.beginTurn();
      }
      if (!g.inGame[s] || g.finished.includes(s) || g.passed.has(s)) continue;
      g.turn = s;
      return this.beginTurn();
    }
    // Người đánh cuối đã về nhất/nhì, mọi người bỏ lượt -> người kế tiếp được đánh
    const start = g.lastPlay ? g.lastPlay.seat : from;
    for (let i = 1; i <= 4; i++) {
      const s = (start + i) % 4;
      if (g.inGame[s] && !g.finished.includes(s)) {
        this.newRound(s);
        return this.beginTurn();
      }
    }
  }

  unitInfo() {
    const st = this.settings;
    return st.debt ? { mult: st.unit, label: st.unitLabel } : { mult: COIN_UNIT, label: 'xu' };
  }

  finishGame(instantSeat = null, instantLabel = null) {
    const g = this.game;
    const st = this.settings;
    clearTimeout(this.timer);
    clearTimeout(this.botTimer);
    const players = [0, 1, 2, 3].filter((s) => g.inGame[s]);
    let order;
    if (instantSeat != null) {
      order = [instantSeat, ...players.filter((s) => s !== instantSeat)];
    } else {
      // Người về đàng hoàng -> người còn bài -> người bị phạt "về heo"
      order = g.finished.filter((s) => !g.bad.includes(s) && !g.cong.includes(s));
      players.filter((s) => !order.includes(s) && !g.bad.includes(s) && !g.cong.includes(s))
        .sort((a, b) => g.hands[a].length - g.hands[b].length)
        .forEach((s) => order.push(s));
      [...g.bad].reverse().forEach((s) => order.push(s));
      g.cong.forEach((s) => order.push(s)); // người bị cóng xếp cuối cùng
    }
    const parts = {};
    const notes = {};
    players.forEach((s) => { parts[s] = 0; notes[s] = []; });
    const winner = order[0];
    const last = order[order.length - 1];
    if (instantSeat != null) {
      players.forEach((s) => { if (s !== instantSeat) { parts[s] -= 2; parts[instantSeat] += 2; } });
      notes[instantSeat].push('Tới trắng: ' + instantLabel);
    } else {
      const pts = players.length === 3 ? st.pts3.split(',').map(Number) : POINTS[players.length];
      order.forEach((s, i) => { parts[s] += pts[i]; });
      if (g.bad.includes(last)) notes[last].push('Về heo chót → bét');
      // Cóng: mỗi người bị cóng thua gấp đôi mức bét, phần chênh trả cho người nhất
      const cong = g.cong.length ? g.cong : st.cong && g.hands[last].length === 13 ? [last] : [];
      cong.forEach((s) => {
        const target = 2 * pts[pts.length - 1];
        const diff = target - parts[s];
        parts[s] += diff; parts[winner] -= diff;
        notes[s].push('🥶 Cóng ×2');
      });
      // Thối heo / thối hàng
      if (st.penalty) {
        const left = g.hands[last];
        const twos = left.filter((c) => rankOf(c) === TWO);
        if (twos.length) {
          const v = twos.reduce((a, c) => a + (suitOf(c) >= 2 ? 2 : 1), 0);
          parts[last] -= v; parts[winner] += v;
          notes[last].push(`Thối ${twos.length} heo`);
        }
        const b = bombsInHand(left);
        const bv = b.quads * 4 + b.pairSeqs * 3;
        if (bv) {
          parts[last] -= bv; parts[winner] += bv;
          notes[last].push('Thối hàng');
        }
      }
    }
    // Tiền chặt
    g.chops.forEach((c) => {
      if (parts[c.from] == null || parts[c.to] == null) return;
      parts[c.from] -= c.parts; parts[c.to] += c.parts;
      notes[c.to].push(`Chặt +${c.parts}`);
      notes[c.from].push(`Bị chặt −${c.parts}`);
    });

    const unit = this.unitInfo();
    const rows = order.map((s, i) => {
      const delta = parts[s] * unit.mult;
      const p = this.seats[s];
      if (p && !st.debt) {
        if (p.isBot) p.botCoins = (p.botCoins || 1000) + delta;
        else this.hooks.addCoins(p.id, delta);
      }
      return { seat: s, rank: i + 1, parts: parts[s], delta, note: notes[s].join(' · '), cardsLeft: g.hands[s], bad: g.bad.includes(s) };
    });
    if (st.debt) this.recordDebt(rows, unit);

    const w = this.seats[order[0]];
    this.lastWinnerId = w ? w.id : null;
    this.results = rows;
    this.state = 'ended';
    this.hooks.emitEvent(this, { kind: 'end', results: rows, unit, debt: st.debt });
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
      e.total += r.delta; e.games++; if (r.rank === 1) e.wins++;
      game.rows.push({ id: p.id, delta: r.delta, rank: r.rank, note: r.note });
    });
    L.games.unshift(game);
    L.games = L.games.slice(0, 30);
  }

  // ---------- Dữ liệu gửi xuống client ----------
  summary() {
    return {
      code: this.code, name: this.name, game: 'tienlen',
      players: this.playerCount(), humans: this.humans().length, state: this.state,
    };
  }

  viewFor(playerId) {
    const mySeat = this.seatOf(playerId);
    const g = this.game;
    const playing = this.state === 'playing';
    return {
      game: 'tienlen', code: this.code, name: this.name, theme: this.theme, isPublic: this.isPublic,
      hostId: this.hostId, state: this.state, mySeat,
      seats: this.seats.map((p, s) => p && {
        id: p.id, name: p.name, avatar: p.avatar, acc: p.acc || '', isBot: p.isBot, connected: p.connected,
        coins: p.isBot ? p.botCoins : this.hooks.getCoins(p.id),
        cardCount: g && g.inGame[s] && this.state !== 'waiting' ? g.hands[s].length : null,
        passed: playing ? g.passed.has(s) : false,
        rank: this.state === 'ended' && this.results
          ? ((this.results.find((r) => r.seat === s) || {}).rank ?? null)
          : g && this.state !== 'waiting' && g.finished.includes(s) && !(g.bad || []).includes(s) && !(g.cong || []).includes(s) ? g.finished.filter((x) => !(g.cong || []).includes(x)).indexOf(s) + 1 : null,
        cong: !!(g && this.state === 'playing' && (g.cong || []).includes(s)),
        bad: !!(g && this.state !== 'waiting' && (g.bad || []).includes(s)),
        debt: this.ledger.players[p.id] ? this.ledger.players[p.id].total : 0,
        inGame: g ? !!g.inGame[s] && this.state !== 'waiting' : false,
      }),
      hand: g && mySeat >= 0 && this.state !== 'waiting' ? g.hands[mySeat] : [],
      turn: playing ? g.turn : null,
      deadline: playing ? g.deadline : 0,
      lastPlay: (playing || this.state === 'ended') && g && g.lastPlay ? { seat: g.lastPlay.seat, cards: g.lastPlay.combo.cards, name: comboName(g.lastPlay.combo) } : null,
      startCard: playing ? g.startCard : null,
      results: this.results,
      settings: this.settings,
      ledger: this.settings.debt || this.ledger.games.length ? this.ledger : null,
      turnMs: this.turnMs,
      now: Date.now(),
    };
  }

  destroy() {
    clearTimeout(this.timer);
    clearTimeout(this.botTimer);
  }

  // ---------- Lưu / khôi phục (chủ phòng tải lại trang) ----------
  serialize() {
    const g = this.game;
    return {
      game: 'tienlen', code: this.code, name: this.name, theme: this.theme, isPublic: this.isPublic, hostId: this.hostId,
      seats: this.seats, state: this.state, results: this.results, lastWinnerId: this.lastWinnerId, createdAt: this.createdAt,
      settings: this.settings, ledger: this.ledger,
      game: g && { ...g, passed: [...g.passed] },
    };
  }

  static restore(data, hooks) {
    const r = new Room({ code: data.code, name: data.name, theme: data.theme, isPublic: data.isPublic, hooks });
    Object.assign(r, {
      hostId: data.hostId, seats: data.seats, state: data.state, results: data.results,
      lastWinnerId: data.lastWinnerId, createdAt: data.createdAt,
      settings: normalizeSettings(data.settings), ledger: data.ledger || { players: {}, games: [] },
    });
    if (data.game) r.game = { ...data.game, passed: new Set(data.game.passed) };
    if (r.state === 'playing') r.beginTurn();
    return r;
  }
}
