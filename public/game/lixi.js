// 🧧 BAO LÌ XÌ MAY MẮN — chủ phòng phát lì xì, mọi người giành bao
// - Chủ phòng đặt tổng tiền + số bao (hoặc bấm "Máy tự chọn").
// - Phát ra: tiền chia ngẫu nhiên vào từng bao. Mỗi người (trừ chủ phòng) giành 1 bao.
// - Hết bao hoặc hết 30 giây thì mở hết: ai trúng bao to nhất là 👑 Vua may mắn.
// - Tiền: chủ phòng trả đúng số đã được giành, bao không ai lấy thì trả lại chủ phòng.
// - 2 chế độ: 🪙 Xu trong game, hoặc 💵 Tiền thật (ghi sổ theo nghìn: mệnh giá 1k / 5k / 10k / 20k / 50k) để lì xì thật bên ngoài.
import { BaseRoom } from './base.js';
import { normalizeSettings } from '../shared/rules.js';

export const GRAB_MS = 30000;
export const TOTAL_XU = [100, 200, 500, 1000, 2000];
export const STEPS_K = [1, 5, 10, 20, 50];
export const TOTAL_MUL = [10, 20, 50, 100]; // tổng gợi ý = mệnh giá × …

// 🎋 Xin xăm đầu năm: quẻ nào cũng tốt lành, chỉ để vui
export const XAM = [
  ['Đại cát', 'Tài lộc', 'Năm nay tiền vào như nước, nhớ mở ví cho rộng 💰'],
  ['Đại cát', 'Sức khoẻ', 'Ăn ngon ngủ kỹ, khoẻ như voi con 🐘'],
  ['Đại cát', 'Gia đạo', 'Nhà cửa êm ấm, cả nhà cười nhiều hơn năm ngoái 🏡'],
  ['Đại cát', 'Học hành', 'Học đâu nhớ đó, thi đâu trúng đó 📚'],
  ['Đại cát', 'Công việc', 'Việc thuận buồm xuôi gió, sếp khen liên tục 🚀'],
  ['Thượng cát', 'May mắn', 'Ra đường gặp toàn người tốt, đèn xanh suốt đường 🚦'],
  ['Thượng cát', 'Tài lộc', 'Có lộc bất ngờ giữa năm, nhớ khao cả nhà 🧧'],
  ['Thượng cát', 'Bạn bè', 'Bạn bè quý mến, đi đâu cũng có người rủ ăn 🍜'],
  ['Thượng cát', 'Sức khoẻ', 'Năm nay chăm vận động, dáng đẹp da hồng ✨'],
  ['Thượng cát', 'Du lịch', 'Có chuyến đi chơi xa thật vui cùng người thương 🧳'],
  ['Trung cát', 'Học hành', 'Chịu khó một chút là tiến bộ vượt bậc 📈'],
  ['Trung cát', 'Tài lộc', 'Tiêu ít lại một chút, cuối năm sẽ dư dả 🐷'],
  ['Trung cát', 'Công việc', 'Đầu năm hơi bận, cuối năm hái quả ngọt 🍊'],
  ['Trung cát', 'Gia đạo', 'Gọi điện cho ông bà nhiều hơn, phúc đức đầy nhà 📞'],
  ['Trung cát', 'May mắn', 'Thử món mới, đi đường mới, gặp điều hay mới 🌱'],
  ['Tiểu cát', 'Sức khoẻ', 'Bớt thức khuya là năm nay hoàn hảo 😴'],
  ['Tiểu cát', 'Tài lộc', 'Lộc nhỏ mà đều, như mưa xuân thấm đất 🌧️'],
  ['Tiểu cát', 'Bạn bè', 'Một người bạn cũ sẽ hẹn gặp lại, nhớ đi nha 🤝'],
  ['Tiểu cát', 'Niềm vui', 'Cười nhiều lên, vận may tự tìm tới 😆'],
  ['Tiểu cát', 'Gia đạo', 'Phụ việc nhà nhiều hơn, được cả nhà thương thêm 🧹'],
];

/** 1500 -> "1,5tr", 200 -> "200k" */
export function fmtK(v) { return v >= 1000 ? `${(v / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}tr` : `${v}k`; }

/** Chia total thành count phần ngẫu nhiên (bội số của step, mỗi bao ít nhất 1 step nếu đủ) */
export function splitLixi(total, count, step = 1) {
  count = Math.max(1, Math.floor(count));
  if (total < step * count) step = 1;
  const units = Math.floor(total / step);
  const base = Math.min(1, Math.floor(units / count)); // mỗi bao ít nhất 1 đơn vị
  const w = Array.from({ length: count }, () => 0.3 + Math.random() ** 1.6 * 2);
  const free = units - base * count;
  const sw = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => base + Math.floor((free * x) / sw));
  let left = units - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; left > 0; i = (i + 1) % count, left--) parts[Math.floor(Math.random() * count)]++;
  const out = parts.map((p) => p * step);
  out[0] += total - out.reduce((a, b) => a + b, 0); // phần lẻ không chia hết cho step
  return out.sort(() => Math.random() - 0.5);
}

export class LiXiRoom extends BaseRoom {
  static GAME = 'lixi';
  static MAX = 10;
  inGame(s) { return !!this.seats[s]; }

  giver() { return this.seatOf(this.hostId); }
  isTien() { return this.g && this.g.mode === 'tien'; }
  label() { return this.isTien() ? 'k' : 'xu'; }
  fmt(v) { return this.isTien() ? fmtK(v) : `${v} xu`; }
  step() { return this.isTien() ? this.g.step : 10; }
  presets() { return this.isTien() ? TOTAL_MUL.map((m) => m * this.g.step) : TOTAL_XU; }
  hostCoins() { const p = this.seats[this.giver()]; return p ? this.hooks.getCoins(p.id) : 0; }
  takers() { const h = this.giver(); return this.seats.map((p, s) => (p && s !== h ? s : -1)).filter((s) => s >= 0); }
  /** Tổng gợi ý vừa túi: xu thì không quá số xu chủ phòng có */
  fitTotal() {
    const pre = this.presets();
    if (this.isTien()) return pre[1];
    const ok = pre.filter((v) => v <= this.hostCoins());
    return ok.length ? ok[Math.min(ok.length - 1, 2)] : Math.max(10, Math.floor(this.hostCoins() / 10) * 10);
  }

  begin() {
    this.g = { phase: 'setup', round: 0, mode: this.settings.debt ? 'tien' : 'xu', step: 10, total: 0, count: Math.max(1, this.takers().length), envs: [], deadline: 0, king: null, rows: null };
    this.g.total = this.fitTotal();
    this.hooks.emitState(this);
  }
  resume() {
    const g = this.g;
    if (g.phase === 'open') { this.setTimer('phase', Math.max(1000, g.deadline - Date.now()), () => this.reveal()); this.scheduleBots(); }
  }

  scheduleBots() {
    this.seats.forEach((p, s) => {
      if (!p || !p.isBot || s === this.giver()) return;
      this.setTimer('bot' + s, 1000 + Math.random() * 3500, () => {
        const free = this.g.envs.map((e, i) => (e.seat == null ? i : -1)).filter((i) => i >= 0);
        if (free.length) this.action(s, { a: 'grab', i: free[Math.floor(Math.random() * free.length)] });
      });
    });
  }

  action(s, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu';
    const isHost = this.seats[s]?.id === this.hostId;
    if (p.a === 'stop') {
      if (!isHost) return 'Chỉ chủ phòng mới dừng được';
      if (g.phase === 'open') this.reveal();
      this.destroy(); this.state = 'waiting'; this.g = null; this.hooks.emitState(this); return null;
    }
    if (p.a === 'setup' || p.a === 'auto') {
      if (!isHost) return 'Chủ phòng mới được chuẩn bị lì xì nha 🧧';
      if (g.phase === 'open') return null;
      if (p.a === 'auto') {
        const pre = this.presets();
        const cap = this.isTien() ? Infinity : this.hostCoins();
        const ok = pre.filter((v) => v <= cap);
        g.total = ok.length ? ok[Math.floor(Math.random() * ok.length)] : this.fitTotal();
        g.count = Math.min(20, Math.max(1, this.takers().length + Math.floor(Math.random() * 2)));
      } else {
        const modeChanged = (p.mode === 'xu' || p.mode === 'tien') && p.mode !== g.mode;
        const stepChanged = STEPS_K.includes(+p.step) && +p.step !== g.step;
        if (modeChanged) g.mode = p.mode;
        if (stepChanged) g.step = +p.step;
        if (p.total != null) g.total = Math.max(1, Math.min(100000000, Math.round(+p.total) || 1));
        else if (modeChanged || stepChanged) g.total = this.fitTotal();
        if (p.count != null) g.count = Math.max(1, Math.min(20, Math.round(+p.count) || 1));
      }
      g.phase = 'setup';
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'deal') {
      if (!isHost) return 'Chủ phòng mới được phát lì xì nha 🧧';
      if (g.phase === 'open') return null;
      if (!this.takers().length) return 'Cần thêm người (hoặc bot) để giành lì xì nha';
      if (!this.isTien() && g.total > this.hostCoins()) return `Bạn chỉ còn ${this.hostCoins()} xu, giảm tổng tiền xuống nha`;
      if (this.isTien() && g.total % g.step) return `Tổng tiền phải chia hết cho mệnh giá ${g.step}k nha`;
      if (this.isTien() && g.total < g.step * g.count) return `Mỗi bao ít nhất ${g.step}k: ${g.count} bao cần tối thiểu ${g.step * g.count}k`;
      if (g.total < g.count) return 'Tổng tiền phải lớn hơn số bao nha';
      // Chế độ tiền thật: ghi sổ theo nghìn; chế độ xu: trừ / cộng xu thật trong game
      this.settings = normalizeSettings({ ...this.settings, debt: this.isTien(), ...(this.isTien() ? { unitLabel: 'k' } : {}) });
      const step = this.isTien() ? g.step : g.total >= g.count * 10 ? 10 : 1;
      g.envs = splitLixi(g.total, g.count, step).map((amt) => ({ amt, seat: null }));
      g.phase = 'open'; g.round++; g.king = null; g.rows = null;
      g.deadline = Date.now() + GRAB_MS;
      this.hooks.emitEvent(this, { kind: 'lx', what: 'deal', count: g.count, total: g.total });
      this.setTimer('phase', GRAB_MS, () => this.reveal());
      this.scheduleBots();
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'grab') {
      if (g.phase !== 'open') return null;
      if (s === this.giver()) return 'Bạn là người phát lì xì mà 😆';
      if (g.envs.some((e) => e.seat === s)) return 'Mỗi người 1 bao thôi nha 🧧';
      const e = g.envs[p.i];
      if (!e) return null;
      if (e.seat != null) return 'Bao này có người lấy rồi, chọn bao khác nha';
      e.seat = s;
      this.hooks.emitEvent(this, { kind: 'lx', what: 'grab', seat: s, i: p.i, amt: e.amt, txt: this.fmt(e.amt) });
      const left = g.envs.some((x) => x.seat == null);
      const waiting = this.takers().some((t) => !g.envs.some((x) => x.seat === t));
      if (!left || !waiting) this.setTimer('phase', 900, () => this.reveal());
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'xam') {
      const xam = (g.xam ||= {});
      if (xam[s] && xam[s].round === g.round) return 'Mỗi vòng xin 1 quẻ thôi nha 🎋';
      const n = Math.floor(Math.random() * XAM.length);
      xam[s] = { n, round: g.round };
      this.hooks.emitEvent(this, { kind: 'lx', what: 'xam', seat: s, n });
      this.hooks.emitState(this);
      return null;
    }
    if (p.a === 'again') {
      if (!isHost || g.phase !== 'done') return null;
      g.phase = 'setup'; g.envs = []; g.king = null; g.rows = null;
      g.count = Math.max(g.count, this.takers().length);
      this.hooks.emitState(this);
      return null;
    }
    return 'Không hiểu thao tác';
  }

  reveal() {
    const g = this.g;
    if (!g || g.phase !== 'open') return;
    this.destroy();
    g.phase = 'done';
    const mult = this.unitInfo().mult;
    const h = this.giver();
    const got = g.envs.filter((e) => e.seat != null);
    let paid = 0;
    const rows = got.map((e) => { paid += e.amt; return { seat: e.seat, parts: e.amt / mult, note: `Trúng ${this.fmt(e.amt)}`, badge: '🧧' }; });
    const best = got.reduce((m, e) => (!m || e.amt > m.amt ? e : m), null);
    if (best) { g.king = best.seat; const r = rows.find((x) => x.seat === best.seat); r.badge = '👑'; r.note += ' · Vua may mắn'; }
    if (h >= 0 && paid) rows.push({ seat: h, parts: -paid / mult, note: `Phát ${this.fmt(paid)}`, badge: '🧧' });
    rows.sort((a, b) => b.parts - a.parts).forEach((r, i) => { r.rank = i + 1; });
    if (rows.length) this.payout(rows);
    g.rows = rows.map((r) => ({ seat: r.seat, delta: r.delta, badge: r.badge }));
    this.hooks.emitEvent(this, { kind: 'lx', what: 'reveal', king: g.king, amt: best ? best.amt : 0, paid });
    this.hooks.emitState(this);
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    const me = v.mySeat;
    v.deadline = g.phase === 'open' ? g.deadline : 0;
    v.turnMs = GRAB_MS;
    const showAll = g.phase === 'done';
    v.lx = {
      phase: g.phase, round: g.round, total: g.total, count: g.count, giver: this.giver(), label: this.label(),
      mode: g.mode, step: g.step, steps: STEPS_K, presets: this.presets(), hostCoins: this.isTien() ? null : this.hostCoins(), king: g.king, rows: g.rows,
      envs: g.envs.map((e) => ({ seat: e.seat, amt: showAll || e.seat != null ? e.amt : null })),
      mine: g.envs.findIndex((e) => e.seat === me && me >= 0),
      xam: Object.fromEntries(Object.entries(g.xam || {}).filter(([, x]) => x.round === g.round).map(([k, x]) => [k, x.n])),
    };
    v.seats.forEach((p, s) => { if (p) p.status = s === v.lx.giver ? { cls: 'r1', text: '🧧 Người phát' } : null; });
    return v;
  }
}
