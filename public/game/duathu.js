// 🏇 ĐUA THÚ — mỗi người chọn 1 con thú, chạy 2 vòng quanh trường đua
// - Chọn thú (mỗi con chỉ 1 người). Hết 20 giây hoặc chủ phòng bấm chạy thì xuất phát.
// - Mỗi người góp 1 phần vào hũ. Thú của ai về nhất (trong các con có chủ) thì người đó ăn cả hũ.
// - Con không ai chọn vẫn chạy cho vui (thú hoang), về nhất thì tính con có chủ về sớm nhất.
// - Kết quả quyết định ngẫu nhiên công bằng; đường chạy có lúc tăng tốc, thỏ ngủ quên, rùa nước rút…
import { BaseRoom } from './base.js';

export const PICK_MS = 20000;
export const COUNT_MS = 3000;
export const LAPS = 2;
export const SAMPLES = 48;
export const ANIMALS = [
  { id: 'ngua', icon: '🐎', name: 'Ngựa', color: '#ff8a65' },
  { id: 'cho', icon: '🐕', name: 'Cún', color: '#ffd54f' },
  { id: 'meo', icon: '🐈', name: 'Mèo', color: '#b388ff' },
  { id: 'tho', icon: '🐇', name: 'Thỏ', color: '#f48fb1' },
  { id: 'rua', icon: '🐢', name: 'Rùa', color: '#81c784' },
  { id: 'heo', icon: '🐖', name: 'Heo', color: '#ff80ab' },
  { id: 'huou', icon: '🦒', name: 'Hươu', color: '#ffb74d' },
  { id: 'voi', icon: '🐘', name: 'Voi', color: '#90caf9' },
];

/** Tạo đường chạy: thời gian về đích T và độ tiến (0..1) tại SAMPLES+1 mốc đều nhau trong T */
export function makeRace(n) {
  const finish = Array.from({ length: n }, () => 11500 + Math.random() * 2200);
  return ANIMALS.slice(0, n).map((a, i) => {
    const sp = [];
    let burst = -1;
    for (let k = 0; k < SAMPLES; k++) {
      let v = 0.7 + Math.random() * 0.6;
      if (a.id === 'tho' && k > 14 && k < 22) v *= 0.15;             // thỏ ngủ quên 😴
      if (a.id === 'rua') v *= k < 20 ? 0.75 : 1.25;                   // rùa chậm mà chắc
      if (a.id === 'ngua' && k < 8) v *= 1.3;                          // ngựa xuất phát nhanh
      if (burst < 0 && Math.random() < 0.04) burst = k;
      if (burst >= 0 && k - burst < 4) v *= 1.8;                       // tăng tốc 💨
      sp.push(v);
    }
    const tot = sp.reduce((x, y) => x + y, 0);
    const pts = [0];
    let acc = 0;
    sp.forEach((v) => { acc += v; pts.push(Math.round((acc / tot) * 10000) / 10000); });
    return { T: Math.round(finish[i]), pts, burst };
  });
}
/** Tiến độ (0..1) của 1 con ở thời điểm t (ms) kể từ lúc xuất phát */
export function progressAt(r, t) {
  if (t <= 0) return 0;
  if (t >= r.T) return 1;
  const x = (t / r.T) * SAMPLES;
  const k = Math.floor(x);
  return r.pts[k] + (r.pts[k + 1] - r.pts[k]) * (x - k);
}

export class DuaThuRoom extends BaseRoom {
  static GAME = 'duathu';
  static MAX = 8;
  minPlayers() { return 1; }
  inGame(s) { return !!(this.g && this.g.inGame && this.g.inGame[s]); }

  begin() {
    this.g = { inGame: this.seats.map(Boolean), phase: 'pick', pick: {}, deadline: Date.now() + PICK_MS, race: null, startAt: 0, order: null };
    this.botPick();
    this.resume();
    this.hooks.emitState(this);
  }
  resume() {
    const g = this.g;
    if (g.phase === 'pick') this.setTimer('phase', Math.max(1000, g.deadline - Date.now()), () => this.go());
    else if (g.phase === 'race') this.setTimer('phase', Math.max(500, g.startAt + Math.max(...g.race.map((r) => r.T)) + 800 - Date.now()), () => this.settle());
  }

  taken() { return new Set(Object.values(this.g.pick)); }
  botPick() {
    this.seats.forEach((p, s) => {
      if (!p || !p.isBot || this.g.pick[s] != null) return;
      this.setTimer('bot' + s, 800 + Math.random() * 3000, () => {
        const free = ANIMALS.map((_, i) => i).filter((i) => !this.taken().has(i));
        if (free.length && this.g.phase === 'pick') this.action(s, { a: 'pick', i: free[Math.floor(Math.random() * free.length)] });
      });
    });
  }

  go() {
    const g = this.g;
    if (g.phase !== 'pick') return;
    this.destroy();
    // Ai chưa chọn thì máy chọn giúp
    this.seats.forEach((p, s) => {
      if (!p || !g.inGame[s] || g.pick[s] != null) return;
      const free = ANIMALS.map((_, i) => i).filter((i) => !this.taken().has(i));
      if (free.length) g.pick[s] = free[Math.floor(Math.random() * free.length)];
    });
    g.race = makeRace(ANIMALS.length);
    g.order = g.race.map((r, i) => i).sort((a, b) => g.race[a].T - g.race[b].T);
    g.phase = 'race';
    g.startAt = Date.now() + COUNT_MS;
    this.hooks.emitEvent(this, { kind: 'dt', what: 'go' });
    this.resume();
    this.hooks.emitState(this);
  }

  settle() {
    const g = this.g;
    if (g.phase !== 'race') return;
    g.phase = 'done';
    const owner = {}; Object.entries(g.pick).forEach(([s, i]) => { owner[i] = +s; });
    const players = Object.keys(g.pick).map(Number).filter((s) => this.seats[s]);
    const placeOf = (s) => g.order.indexOf(g.pick[s]) + 1;
    players.sort((a, b) => placeOf(a) - placeOf(b));
    const n = players.length;
    const rows = players.map((s, k) => {
      const a = ANIMALS[g.pick[s]];
      return { seat: s, parts: n < 2 ? 0 : k === 0 ? n - 1 : -1, rank: k + 1, note: `${a.icon} ${a.name} về thứ ${placeOf(s)}`, badge: k === 0 ? '🏆' : ['🥈', '🥉'][k - 1] || '🏁' };
    });
    this.hooks.emitEvent(this, { kind: 'dt', what: 'finish', winner: g.order[0], seat: owner[g.order[0]] ?? null });
    this.finish(rows);
  }

  action(s, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu';
    if (p.a === 'pick') {
      if (g.phase !== 'pick') return 'Đã xuất phát rồi!';
      if (!g.inGame[s]) return 'Ván sau mới vào đua được nha';
      const i = +p.i;
      if (!ANIMALS[i]) return null;
      const who = Object.entries(g.pick).find(([k, v]) => v === i && +k !== s);
      if (who) return `${ANIMALS[i].name} có người chọn rồi, chọn con khác nha`;
      g.pick[s] = i;
      this.hooks.emitEvent(this, { kind: 'dt', what: 'pick', seat: s, i });
      const all = this.seats.every((x, k) => !x || !g.inGame[k] || g.pick[k] != null);
      if (all) { this.clearTimer('phase'); this.setTimer('phase', 1200, () => this.go()); }
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'go') {
      if (this.seats[s]?.id !== this.hostId) return 'Chủ phòng mới bấm xuất phát được';
      this.go(); return null;
    }
    return 'Không hiểu thao tác';
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    v.deadline = g.phase === 'pick' ? g.deadline : 0;
    v.turnMs = PICK_MS;
    v.dt = { phase: this.state === 'ended' ? 'done' : g.phase, pick: g.pick, race: g.race, startAt: g.startAt, order: g.phase === 'done' || this.state === 'ended' ? g.order : null };
    v.seats.forEach((p, s) => { if (p) p.status = null; });
    return v;
  }
}
