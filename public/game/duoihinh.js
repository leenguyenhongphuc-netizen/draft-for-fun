// 🧩 ĐUỔI HÌNH BẮT CHỮ — nhìn emoji đoán chữ
// - Mỗi ván 10 câu. Mỗi câu 30 giây, cứ 10 giây lộ thêm vài chữ cái gợi ý.
// - Gõ đáp án (có dấu hay không dấu đều được). Đúng càng sớm càng nhiều điểm: 5 · 4 · 3 · 2 · 1.
// - Chỉ tính điểm cho vui, không tính xu.
import { BaseRoom } from './base.js';

export const Q_MS = 30000;
export const REVEAL_MS = 4500;
export const ROUNDS = 10;

// [emoji, đáp án chính, gợi ý chủ đề, ...đáp án chấp nhận thêm]
export const PUZZLES = [
  ['🐟 ➡️ 🐉', 'cá chép hoá rồng', 'Thành ngữ'],
  ['🐸 🕳️', 'ếch ngồi đáy giếng', 'Thành ngữ'],
  ['🎻 🐃', 'đàn gảy tai trâu', 'Thành ngữ'],
  ['🖌️ 🐍 ➕ 🦶', 'vẽ rắn thêm chân', 'Thành ngữ'],
  ['🐱 🐭', 'mèo vờn chuột', 'Thành ngữ'],
  ['🌧️ 🍄 🍄 🍄', 'mọc như nấm sau mưa', 'Thành ngữ', 'nấm sau mưa'],
  ['🏹 🎯 🎯', 'một mũi tên trúng hai đích', 'Thành ngữ', 'một mũi tên hai đích'],
  ['🐌 🐢', 'chậm như rùa', 'Thành ngữ', 'chậm như sên', 'rùa bò'],
  ['🍯 💬', 'ngọt như mật', 'Thành ngữ', 'miệng ngọt như mật'],
  ['🐯 👶 🐯', 'hổ phụ sinh hổ tử', 'Thành ngữ'],
  ['🐉 ⬇️ 🌊', 'hạ long', 'Địa danh', 'vịnh hạ long'],
  ['🗡️ 🌊 🐢', 'hồ gươm', 'Địa danh', 'hồ hoàn kiếm'],
  ['🌉 🐉 🔥', 'cầu rồng', 'Địa danh'],
  ['🌸 🍑', 'hoa đào', 'Ngày Tết'],
  ['🌼 🌳 💛', 'hoa mai', 'Ngày Tết', 'cây mai'],
  ['🎆 🌃', 'pháo hoa', 'Ngày Tết', 'bắn pháo hoa'],
  ['🦁 💃 🥁', 'múa lân', 'Ngày Tết'],
  ['🍉 🔴', 'dưa hấu', 'Ngày Tết'],
  ['🍊 🌳', 'cây quất', 'Ngày Tết', 'cây tắc'],
  ['🟩 🍃 🍚', 'bánh chưng', 'Ngày Tết'],
  ['🧧 💰', 'lì xì', 'Ngày Tết', 'mừng tuổi', 'li xi'],
  ['🏮 ✨', 'đèn lồng', 'Ngày Tết'],
  ['🦀 🐟 🦐 🎲', 'bầu cua', 'Ngày Tết', 'bầu cua cá cọp', 'bầu cua tôm cá'],
  ['🙏 🛕', 'đi chùa', 'Ngày Tết', 'lễ chùa'],
  ['🏡 🛣️ 🚌', 'về quê', 'Ngày Tết', 'về quê ăn tết'],
  ['🧹 🏠 ✨', 'dọn nhà', 'Ngày Tết', 'dọn dẹp nhà cửa'],
  ['🍜 🐄', 'phở bò', 'Món ăn'],
  ['🍞 🥩', 'bánh mì thịt', 'Món ăn', 'bánh mì'],
  ['🍚 🐔', 'cơm gà', 'Món ăn'],
  ['☕ 🥛', 'cà phê sữa', 'Món ăn', 'cafe sữa', 'cà phê sữa đá'],
  ['🧊 🍵', 'trà đá', 'Món ăn'],
  ['🥥 💧', 'nước dừa', 'Món ăn'],
  ['🍌 🔥', 'chuối nướng', 'Món ăn'],
  ['🐌 🍜', 'bún ốc', 'Món ăn'],
  ['🦀 🍜', 'bún riêu', 'Món ăn', 'bún riêu cua'],
  ['🍲 🔥', 'lẩu', 'Món ăn', 'nồi lẩu'],
  ['🌙 🍰', 'bánh trung thu', 'Món ăn'],
  ['🐝 🍯', 'mật ong', 'Đồ vật'],
  ['🌞 🌻', 'hoa hướng dương', 'Đồ vật'],
  ['⭐ 🐟', 'sao biển', 'Con vật'],
  ['🐴 🌊', 'cá ngựa', 'Con vật'],
  ['🐻 🧸', 'gấu bông', 'Đồ vật'],
  ['🦷 🪥', 'bàn chải đánh răng', 'Đồ vật', 'bàn chải'],
  ['🎤 🎶 📺', 'karaoke', 'Giải trí', 'hát karaoke'],
  ['⚽ 🥅', 'bóng đá', 'Giải trí', 'đá banh'],
  ['🍿 🎬', 'xem phim', 'Giải trí', 'rạp phim'],
  ['📱 🤳', 'tự sướng', 'Giải trí', 'selfie', 'chụp hình'],
  ['✈️ 🛫 🏢', 'sân bay', 'Địa điểm'],
  ['🏫 📚 🎒', 'đi học', 'Đời sống', 'trường học'],
  ['🌧️ ☂️', 'trời mưa', 'Thời tiết', 'mưa'],
  ['❄️ ⛄', 'người tuyết', 'Đồ vật'],
  ['🌈 🌧️ ☀️', 'cầu vồng', 'Thời tiết'],
  ['🐓 🌅', 'gà gáy', 'Đời sống', 'gà gáy sáng'],
  ['💤 🛏️', 'đi ngủ', 'Đời sống', 'ngủ'],
  ['👵 👴 💕', 'ông bà', 'Gia đình'],
  ['👨‍👩‍👧 📸', 'ảnh gia đình', 'Gia đình', 'chụp ảnh gia đình', 'hình gia đình'],
];

/** Bỏ dấu, chữ thường, bỏ ký tự lạ để so đáp án */
export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}
export function isRight(guess, p) { const g = norm(guess); return !!g && [p[1], ...p.slice(3)].some((a) => norm(a) === g); }
/** Gợi ý: hiện k chữ cái (theo thứ tự cố định) */
export function maskAnswer(ans, k, order) {
  const chars = [...ans];
  const show = new Set(order.slice(0, k));
  return chars.map((c, i) => (c === ' ' ? ' ' : show.has(i) ? c : '_')).join('');
}

export class DuoiHinhRoom extends BaseRoom {
  static GAME = 'duoihinh';
  static MAX = 10;
  minPlayers() { return 1; }
  inGame(s) { return !!this.seats[s]; }

  begin() {
    const pool = PUZZLES.map((_, i) => i).sort(() => Math.random() - 0.5);
    const used = (this.meta.used || []).slice(-40);
    const fresh = pool.filter((i) => !used.includes(i));
    const list = [...fresh, ...pool.filter((i) => used.includes(i))].slice(0, ROUNDS);
    this.meta.used = [...used, ...list];
    this.g = { list, q: -1, phase: 'q', score: {}, got: {}, order: [], feed: [], hint: 0, deadline: 0, letters: [] };
    this.next();
  }
  resume() {
    const g = this.g;
    if (g.phase === 'q') this.armQ(); else this.setTimer('phase', 1500, () => this.next());
  }

  puzzle() { return PUZZLES[this.g.list[this.g.q]]; }

  next() {
    const g = this.g;
    g.q++;
    if (g.q >= g.list.length) return this.end();
    const ans = this.puzzle()[1];
    g.phase = 'q'; g.got = {}; g.order = []; g.feed = []; g.hint = 0;
    g.letters = [...ans].map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0).sort(() => Math.random() - 0.5);
    g.deadline = Date.now() + Q_MS;
    this.hooks.emitEvent(this, { kind: 'dh', what: 'q', q: g.q });
    this.armQ();
    this.hooks.emitState(this);
  }

  armQ() {
    const g = this.g;
    const left = g.deadline - Date.now();
    this.setTimer('phase', Math.max(500, left), () => this.reveal());
    // Gợi ý chữ cái ở giây 10 và 20
    [1, 2].forEach((h) => {
      const at = g.deadline - Q_MS + h * 10000 - Date.now();
      if (g.hint < h && at > 0) this.setTimer('hint' + h, at, () => { g.hint = h; this.hooks.emitEvent(this, { kind: 'dh', what: 'hint' }); this.hooks.emitState(this); });
    });
    // Bot đoán
    this.seats.forEach((p, s) => {
      if (!p || !p.isBot || g.got[s]) return;
      if (Math.random() < 0.65) this.setTimer('bot' + s, 6000 + Math.random() * 20000, () => this.answer(s, this.puzzle()[1]));
      else if (Math.random() < 0.5) this.setTimer('botw' + s, 4000 + Math.random() * 12000, () => this.answer(s, ['hoa sen', 'con mèo', 'bánh tét', 'chịu luôn'][Math.floor(Math.random() * 4)]));
    });
  }

  answer(s, text) {
    const g = this.g;
    if (!g || g.phase !== 'q' || g.got[s] || !this.seats[s]) return null;
    const p = this.puzzle();
    text = String(text || '').slice(0, 60).trim();
    if (!text) return null;
    if (isRight(text, p)) {
      const pts = Math.max(1, 5 - g.order.length) + (g.hint === 0 ? 1 : 0); // chưa có gợi ý thì +1
      g.got[s] = pts;
      g.order.push(s);
      const id = this.seats[s].id;
      g.score[id] = (g.score[id] || 0) + pts;
      g.feed.unshift({ seat: s, ok: true, pts });
      this.hooks.emitEvent(this, { kind: 'dh', what: 'right', seat: s, pts, first: g.order.length === 1 });
      const all = this.seats.every((x, k) => !x || g.got[k] || !x.connected);
      if (all) { this.clearTimer('phase'); this.setTimer('phase', 600, () => this.reveal()); }
    } else {
      const close = norm(text).replace(/ /g, '').length >= 3 && norm(p[1]).replace(/ /g, '').includes(norm(text).replace(/ /g, ''));
      g.feed.unshift({ seat: s, ok: false, text, close });
    }
    g.feed = g.feed.slice(0, 8);
    this.hooks.emitState(this);
    return null;
  }

  reveal() {
    const g = this.g;
    if (g.phase !== 'q') return;
    ['hint1', 'hint2'].forEach((t) => this.clearTimer(t));
    this.seats.forEach((_, s) => { this.clearTimer('bot' + s); this.clearTimer('botw' + s); });
    g.phase = 'reveal';
    this.hooks.emitEvent(this, { kind: 'dh', what: 'reveal', answer: this.puzzle()[1], n: g.order.length });
    this.hooks.emitState(this);
    this.setTimer('phase', REVEAL_MS, () => this.next());
  }

  end() {
    const g = this.g;
    const rows = this.seats.map((p, s) => (p ? { seat: s, sc: g.score[p.id] || 0 } : null)).filter(Boolean)
      .sort((a, b) => b.sc - a.sc);
    let rank = 0, last = null;
    const out = rows.map((r, i) => {
      if (r.sc !== last) { rank = i + 1; last = r.sc; }
      return { seat: r.seat, parts: 0, rank, note: `${r.sc} điểm`, badge: rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🧩' };
    });
    this.finish(out);
  }

  action(s, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu';
    if (p.a === 'guess') return this.answer(s, p.text);
    if (p.a === 'skip') { // chủ phòng qua câu
      if (this.seats[s]?.id !== this.hostId) return 'Chỉ chủ phòng mới qua câu được';
      if (g.phase === 'q') { this.clearTimer('phase'); this.reveal(); }
      return null;
    }
    if (p.a === 'stop') {
      if (this.seats[s]?.id !== this.hostId) return 'Chỉ chủ phòng mới dừng được';
      this.destroy(); this.end(); return null;
    }
    return 'Không hiểu thao tác';
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    const me = v.mySeat;
    const pz = g.q >= 0 && g.q < g.list.length ? this.puzzle() : null;
    v.deadline = g.phase === 'q' ? g.deadline : 0;
    v.turnMs = Q_MS;
    if (pz) {
      const nShow = g.hint === 0 ? 0 : Math.ceil(g.letters.length * (g.hint === 1 ? 0.25 : 0.5));
      v.dh = {
        phase: g.phase, q: g.q, total: g.list.length, emoji: pz[0], cat: pz[2],
        mask: g.phase === 'reveal' || (me >= 0 && g.got[me]) ? pz[1] : maskAnswer(pz[1], nShow, g.letters),
        answer: g.phase === 'reveal' ? pz[1] : null, myPts: me >= 0 ? g.got[me] || 0 : 0,
        score: g.score, got: g.got, feed: g.feed,
      };
    }
    v.seats.forEach((p) => { if (p) p.status = null; });
    return v;
  }
}
