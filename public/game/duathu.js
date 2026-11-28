// 🏇 ĐUA THÚ — mỗi người chọn 1 con thú, đua qua 4 chặng: Đồng lúa → Phố đèn lồng → Đường biển → Đồi hoa mai
// - Chọn thú (mỗi con chỉ 1 người). Hết 20 giây hoặc chủ phòng bấm chạy thì xuất phát.
// - Mỗi người góp 1 phần vào hũ. Thú của ai về trước nhất (trong các con có chủ) thì người đó ăn cả hũ.
// - Con không ai chọn vẫn chạy cho vui.
// - Thứ tự về đích được bốc thăm công bằng trước, rồi mới "vẽ" đường chạy cho kịch tính:
//   có con xuất phát nhanh rồi đuối, con bứt tốc cuối, tăng tốc 💨, trượt vũng bùn 🌀, nước rút sát nút…
import { BaseRoom } from './base.js';

export const PICK_MS = 20000;
export const COUNT_MS = 3500;
export const SAMPLES = 60;
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
export const ZONES = [
  { id: 'lua', name: '🌾 Đồng lúa quê nhà' },
  { id: 'pho', name: '🏮 Phố đèn lồng' },
  { id: 'bien', name: '🌊 Đường ven biển' },
  { id: 'mai', name: '🌼 Đồi hoa mai · về đích' },
];

/** Số ngẫu nhiên có hạt giống (để mọi máy vẽ cùng 1 đường đua) */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STYLES = ['early', 'late', 'steady', 'wild'];
/** Tạo cuộc đua: mỗi con có thời gian về đích T, đường tiến độ pts (0..1) và các sự kiện */
export function makeRace(n, rand = Math.random) {
  const base = 24000 + rand() * 2000;
  // Khoảng cách về đích sát nhau cho hồi hộp
  const finish = Array.from({ length: n }, () => base + rand() * 1900);
  return ANIMALS.slice(0, n).map((a, i) => {
    const style = a.id === 'tho' ? 'nap' : a.id === 'rua' ? 'late' : STYLES[Math.floor(rand() * STYLES.length)];
    const sp = [];
    const ev = [];
    for (let k = 0; k < SAMPLES; k++) {
      const f = k / SAMPLES;
      let v = 0.9 + rand() * 0.2;
      if (style === 'early') v *= 1.2 - f * 0.4;
      if (style === 'late') v *= 0.82 + f * 0.4;
      if (style === 'wild') v *= 0.85 + 0.3 * Math.abs(Math.sin(f * 9 + i));
      if (style === 'nap') v *= f < 0.25 ? 1.3 : f < 0.36 ? 0.4 : 1.12;
      sp.push(v);
    }
    // 1–2 lần tăng tốc, 0–1 lần trượt bùn
    const nb = 1 + Math.floor(rand() * 2);
    for (let b = 0; b < nb; b++) ev.push({ k: 6 + Math.floor(rand() * (SAMPLES - 12)), type: 'boost' });
    if (rand() < 0.55) ev.push({ k: 8 + Math.floor(rand() * (SAMPLES - 16)), type: 'slip' });
    if (style === 'nap') ev.push({ k: Math.floor(SAMPLES * 0.26), type: 'nap' });
    ev.forEach((e) => {
      for (let d = 0; d < 4; d++) if (sp[e.k + d] != null) sp[e.k + d] *= e.type === 'boost' ? 1.9 : e.type === 'slip' ? (d < 2 ? 0.2 : 0.7) : 1;
    });
    const tot = sp.reduce((x, y) => x + y, 0);
    const pts = [0];
    let acc = 0;
    sp.forEach((v) => { acc += v; pts.push(Math.round((acc / tot) * 100000) / 100000); });
    return { T: Math.round(finish[i]), pts, ev: ev.sort((x, y) => x.k - y.k), style };
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
    this.g = { inGame: this.seats.map(Boolean), phase: 'pick', pick: {}, deadline: Date.now() + PICK_MS, race: null, seed: 0, startAt: 0, order: null };
    this.botPick();
    this.resume();
    this.hooks.emitState(this);
  }
  resume() {
    const g = this.g;
    if (g.phase === 'pick') this.setTimer('phase', Math.max(1000, g.deadline - Date.now()), () => this.go());
    else if (g.phase === 'race') this.setTimer('phase', Math.max(500, g.startAt + Math.max(...g.race.map((r) => r.T)) + 2500 - Date.now()), () => this.settle());
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
    this.seats.forEach((p, s) => {
      if (!p || !g.inGame[s] || g.pick[s] != null) return;
      const free = ANIMALS.map((_, i) => i).filter((i) => !this.taken().has(i));
      if (free.length) g.pick[s] = free[Math.floor(Math.random() * free.length)];
    });
    g.seed = Math.floor(Math.random() * 2 ** 31);
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
    v.dt = { phase: this.state === 'ended' ? 'done' : g.phase, pick: g.pick, race: g.race, seed: g.seed, startAt: g.startAt, order: g.phase === 'done' || this.state === 'ended' ? g.order : null };
    v.seats.forEach((p) => { if (p) p.status = null; });
    return v;
  }
}
