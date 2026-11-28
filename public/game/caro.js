// ⭕ CỜ CARO (2 người)
// - Bàn 15×15, X đi trước (đổi lượt đi trước mỗi ván). Ai có 5 quân liên tiếp (ngang, dọc, chéo) thắng.
// - Luật Việt Nam (tuỳ chọn, mặc định bật): bị chặn cả 2 đầu thì không tính thắng.
// - Thắng +1 phần, thua −1 phần, hoà 0.
import { BaseRoom } from './base.js';

export const N = 15;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

/** Kiểm tra nước vừa đi ở (x,y) có thắng không. Trả về mảng ô thắng hoặc null. */
export function winLine(board, x, y, block2 = true) {
  const me = board[y * N + x];
  if (!me) return null;
  const at = (cx, cy) => (cx < 0 || cy < 0 || cx >= N || cy >= N ? 'edge' : board[cy * N + cx]);
  for (const [dx, dy] of DIRS) {
    const line = [[x, y]];
    let cx = x + dx, cy = y + dy;
    while (at(cx, cy) === me) { line.push([cx, cy]); cx += dx; cy += dy; }
    const endA = at(cx, cy);
    cx = x - dx; cy = y - dy;
    while (at(cx, cy) === me) { line.unshift([cx, cy]); cx -= dx; cy -= dy; }
    const endB = at(cx, cy);
    if (line.length >= 5) {
      const blocked = (e) => e !== 0 && e !== 'edge' && e !== me; // bị quân đối thủ chặn
      if (block2 && line.length === 5 && blocked(endA) && blocked(endB)) continue;
      return line;
    }
  }
  return null;
}

// Bot: chấm điểm từng ô theo thế công + thủ
const SCORE = { 5: 1e7, '4o': 1e5, '4c': 1e4, '3o': 5e3, '3c': 400, '2o': 300, '2c': 40, '1o': 12, '1c': 2 };
function cellScore(board, x, y, who) {
  let total = 0;
  for (const [dx, dy] of DIRS) {
    let count = 1, open = 0;
    for (const sgn of [1, -1]) {
      let cx = x + dx * sgn, cy = y + dy * sgn;
      while (cx >= 0 && cy >= 0 && cx < N && cy < N && board[cy * N + cx] === who) { count++; cx += dx * sgn; cy += dy * sgn; }
      if (cx >= 0 && cy >= 0 && cx < N && cy < N && board[cy * N + cx] === 0) open++;
    }
    if (count >= 5) total += SCORE[5];
    else if (open > 0) total += SCORE[count + (open === 2 ? 'o' : 'c')] || 0;
  }
  return total;
}
export function botPick(board, me) {
  const opp = me === 1 ? 2 : 1;
  if (board.every((v) => v === 0)) return (N >> 1) * N + (N >> 1);
  let best = -1, bestScore = -1;
  for (let i = 0; i < N * N; i++) {
    if (board[i]) continue;
    const x = i % N, y = (i / N) | 0;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && board[ny * N + nx]) { near = true; break; }
    }
    if (!near) continue;
    const sc = cellScore(board, x, y, me) * 1.1 + cellScore(board, x, y, opp) + Math.random();
    if (sc > bestScore) { bestScore = sc; best = i; }
  }
  return best;
}

export class CaroRoom extends BaseRoom {
  static GAME = 'caro';
  static MAX = 2;

  begin() {
    const inGame = this.seats.map((p) => !!p);
    // Đổi người đi trước mỗi ván
    const first = this.meta.first == null ? 0 : 1 - this.meta.first;
    this.meta.first = first;
    this.g = { inGame, board: new Array(N * N).fill(0), mark: [first === 0 ? 1 : 2, first === 0 ? 2 : 1], turn: first, last: null, win: null, moves: 0, deadline: 0 };
    this.hooks.emitEvent(this, { kind: 'cr', what: 'start', first });
    this.beginTurn();
  }

  resume() { this.beginTurn(); }

  beginTurn() {
    const g = this.g;
    g.deadline = Date.now() + this.turnMs;
    this.setTimer('turn', this.turnMs + 300, () => this.botMove(g.turn)); // hết giờ: máy đi hộ
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing' || !this.g) return;
    if (this.isAuto(this.g.turn)) this.setTimer('bot', 500 + Math.random() * 600, () => this.botMove(this.g.turn));
  }

  botMove(s) {
    const g = this.g;
    if (this.state !== 'playing' || g.turn !== s) return;
    this.action(s, { a: 'move', i: botPick(g.board, g.mark[s]) });
  }

  action(s, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu ván';
    if (g.turn !== s) return 'Chưa tới lượt bạn';
    const i = Number(p.i);
    if (!(i >= 0 && i < N * N) || g.board[i]) return 'Ô này có quân rồi';
    g.board[i] = g.mark[s];
    g.last = i; g.moves++;
    this.clearTimer('bot');
    const line = winLine(g.board, i % N, (i / N) | 0, this.settings.caroBlock);
    this.hooks.emitEvent(this, { kind: 'cr', what: 'move', seat: s, i });
    if (line) { g.win = line; return this.end(s); }
    if (g.moves >= N * N) return this.end(null);
    g.turn = 1 - s;
    this.beginTurn();
    return null;
  }

  end(winner) {
    const rows = [0, 1].filter((s) => this.seats[s]).map((s) => ({
      seat: s, parts: winner == null ? 0 : s === winner ? 1 : -1, rank: winner == null || s === winner ? 1 : 2,
      note: winner == null ? 'Hoà' : s === winner ? '5 quân liên tiếp! 🎉' : 'Thua ván này', badge: winner == null ? '🤝' : s === winner ? '🏆' : '😢',
    }));
    this.hooks.emitEvent(this, { kind: 'cr', what: 'win', seat: winner });
    this.finish(rows);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    v.turn = this.state === 'playing' ? g.turn : null;
    v.deadline = this.state === 'playing' ? g.deadline : 0;
    v.cr = { board: g.board, mark: g.mark, last: g.last, win: g.win, block: this.settings.caroBlock };
    return v;
  }
}
