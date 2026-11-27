import { getCombo, canBeat, isChop, comboName, checkInstantWin, rankOf, TWO } from '../shared/rules.js';
import { botChoose } from './bot.js';

const TURN_MS = 25000;
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
  }

  // ---------- Ghế ngồi ----------
  humans() { return this.seats.filter((p) => p && !p.isBot); }
  seatOf(playerId) { return this.seats.findIndex((p) => p && p.id === playerId); }
  playerCount() { return this.seats.filter(Boolean).length; }

  join(player) {
    let seat = this.seatOf(player.id);
    if (seat >= 0) {
      Object.assign(this.seats[seat], { connected: true, leftMidGame: false, name: player.name, avatar: player.avatar });
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
    };
    this.state = 'playing';
    this.results = null;
    this.hooks.emitEvent(this, { kind: 'deal' });

    // Tới trắng
    for (let s = 0; s < 4; s++) {
      if (!inGame[s]) continue;
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
    g.deadline = Date.now() + TURN_MS;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onTimeout(), TURN_MS + 300);
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing') return;
    const p = this.seats[this.game.turn];
    clearTimeout(this.botTimer);
    if (p && (p.isBot || !p.connected)) {
      const delay = p.isBot ? 900 + Math.random() * 900 : 1500;
      const turnAtSchedule = this.game.turn;
      const roundAt = this.game.round;
      this.botTimer = setTimeout(() => {
        if (this.state !== 'playing' || this.game.turn !== turnAtSchedule || this.game.round !== roundAt) return;
        this.autoMove(turnAtSchedule);
      }, delay);
    }
  }

  autoMove(seat) {
    const g = this.game;
    const leading = !g.lastPlay;
    const oppMin = Math.min(...this.activeSeats().filter((s) => s !== seat).map((s) => g.hands[s].length), 13);
    let cards = botChoose(g.hands[seat], g.lastPlay && g.lastPlay.combo, oppMin);
    if (leading && !cards) cards = [Math.min(...g.hands[seat])];
    if (cards) this.play(seat, cards, true);
    else this.pass(seat, true);
  }

  onTimeout() {
    if (this.state !== 'playing') return;
    const seat = this.game.turn;
    if (!this.game.lastPlay) this.play(seat, [Math.min(...this.game.hands[seat])], true);
    else this.pass(seat, true);
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

    const chop = isChop(prev, combo);
    g.hands[seat] = hand.filter((c) => !cards.includes(c));
    g.lastPlay = { seat, combo, victim: chop ? g.lastPlay.seat : null };
    g.startCard = null;
    this.hooks.emitEvent(this, {
      kind: 'play', seat, cards: combo.cards, name: comboName(combo), chop,
      victim: chop ? g.lastPlay.victim : null, auto,
    });

    if (g.hands[seat].length === 0) {
      g.finished.push(seat);
      this.hooks.emitEvent(this, { kind: 'out', seat, rank: g.finished.length });
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

  finishGame(instantSeat = null, instantLabel = null) {
    const g = this.game;
    clearTimeout(this.timer);
    clearTimeout(this.botTimer);
    const players = [0, 1, 2, 3].filter((s) => g.inGame[s]);
    let order;
    if (instantSeat != null) {
      order = [instantSeat, ...players.filter((s) => s !== instantSeat)];
    } else {
      order = [...g.finished];
      // còn lại (nếu có) xếp theo số bài
      players.filter((s) => !order.includes(s))
        .sort((a, b) => g.hands[a].length - g.hands[b].length)
        .forEach((s) => order.push(s));
    }
    const pts = POINTS[players.length];
    const rows = order.map((s, i) => {
      let delta;
      let note = '';
      if (instantSeat != null) {
        delta = s === instantSeat ? (players.length - 1) * 2 * COIN_UNIT : -2 * COIN_UNIT;
        if (s === instantSeat) note = 'Tới trắng: ' + instantLabel;
      } else {
        delta = pts[i] * COIN_UNIT;
        const leftCards = g.hands[s].length;
        if (i === order.length - 1 && leftCards === 13) { delta *= 2; note = 'Cóng! ×2'; }
        const twos = g.hands[s].filter((c) => rankOf(c) === TWO).length;
        if (i === order.length - 1 && twos) { delta -= twos * COIN_UNIT; note += (note ? ' · ' : '') + `Thối ${twos} heo`; }
      }
      const p = this.seats[s];
      if (p) {
        if (p.isBot) p.botCoins = (p.botCoins || 1000) + delta;
        else this.hooks.addCoins(p.id, delta);
      }
      return { seat: s, rank: i + 1, delta, note, cardsLeft: g.hands[s] };
    });
    // Ai về chót có zero cũng không âm... lưu người thắng để ván sau đi trước
    const winner = this.seats[order[0]];
    this.lastWinnerId = winner ? winner.id : null;
    this.results = rows;
    this.state = 'ended';
    this.hooks.emitEvent(this, { kind: 'end', results: rows });
    this.hooks.emitState(this);
  }

  // ---------- Dữ liệu gửi xuống client ----------
  summary() {
    return {
      code: this.code, name: this.name, theme: this.theme,
      players: this.playerCount(), humans: this.humans().length, state: this.state,
    };
  }

  viewFor(playerId) {
    const mySeat = this.seatOf(playerId);
    const g = this.game;
    const playing = this.state === 'playing';
    return {
      code: this.code, name: this.name, theme: this.theme, isPublic: this.isPublic,
      hostId: this.hostId, state: this.state, mySeat,
      seats: this.seats.map((p, s) => p && {
        id: p.id, name: p.name, avatar: p.avatar, isBot: p.isBot, connected: p.connected,
        coins: p.isBot ? p.botCoins : this.hooks.getCoins(p.id),
        cardCount: g && g.inGame[s] && this.state !== 'waiting' ? g.hands[s].length : null,
        passed: playing ? g.passed.has(s) : false,
        rank: g && this.state !== 'waiting' && g.finished.includes(s) ? g.finished.indexOf(s) + 1 : null,
        inGame: g ? !!g.inGame[s] && this.state !== 'waiting' : false,
      }),
      hand: g && mySeat >= 0 && this.state !== 'waiting' ? g.hands[mySeat] : [],
      turn: playing ? g.turn : null,
      deadline: playing ? g.deadline : 0,
      lastPlay: playing && g.lastPlay ? { seat: g.lastPlay.seat, cards: g.lastPlay.combo.cards, name: comboName(g.lastPlay.combo) } : null,
      startCard: playing ? g.startCard : null,
      results: this.results,
      now: Date.now(),
    };
  }

  destroy() {
    clearTimeout(this.timer);
    clearTimeout(this.botTimer);
  }
}
