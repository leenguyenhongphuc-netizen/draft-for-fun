// 🎡 VÒNG QUAY THỬ THÁCH — trò chơi vui cho gia đình, bạn bè (không có thử thách tình cảm)
// - Lần lượt từng người quay. Ô trúng ra một thử thách. Làm xong +1 ⭐, chịu thua thì bị "phạt nhẹ".
// - Không tính xu, chỉ đếm sao cho vui. Chủ phòng dừng lúc nào cũng được.
import { BaseRoom } from './base.js';

export const SEGMENTS = [
  { id: 'hat', icon: '🎤', name: 'Hát', color: '#ff6b81', list: [
    'Hát 1 đoạn bài hát Tết bất kỳ 🎶', 'Hát 1 bài thiếu nhi thật dễ thương', 'Hát 1 câu với giọng thật trầm như ca sĩ nhạc vàng',
    'Hát 1 đoạn mà nhép miệng không ra tiếng, cả bàn đoán bài', 'Hát “Happy New Year” bằng giọng mèo 🐱', 'Song ca 1 câu với người bên phải',
  ] },
  { id: 'nhay', icon: '💃', name: 'Nhảy', color: '#ffbf3c', list: [
    'Nhảy 10 giây theo nhạc nền đang phát', 'Làm điệu nhảy con vịt 🦆 cho cả nhà xem', 'Nhảy kiểu robot 10 giây 🤖',
    'Múa lân 5 giây 🦁 (có tiếng trống càng tốt)', 'Cả bàn cùng vỗ tay theo nhịp bạn nhảy 10 giây',
  ] },
  { id: 'cuoi', icon: '😂', name: 'Gây cười', color: '#3fc97f', list: [
    'Kể 1 câu chuyện cười', 'Làm mặt hề cho tới khi có người cười', 'Nói 1 câu nhanh không vấp: “Nồi đồng nấu ốc, nồi đất nấu ếch” 3 lần',
    'Nói tên 5 loại trái cây trong 10 giây', 'Kể 1 chuyện “quê” nhất năm qua của bạn 😆',
  ] },
  { id: 'batchuoc', icon: '🐒', name: 'Bắt chước', color: '#4f9dff', list: [
    'Bắt chước tiếng 3 con vật cho cả bàn đoán', 'Diễn 1 nghề nghiệp không lời cho mọi người đoán', 'Bắt chước MC lô tô hô 1 câu',
    'Đi “catwalk” 1 vòng quanh bàn 🕺', 'Nói giọng 1 vùng miền khác chúc Tết cả nhà',
  ] },
  { id: 'chuc', icon: '🧧', name: 'Chúc Tết', color: '#e53935', list: [
    'Chúc Tết người bên trái 1 câu thật hay', 'Chúc cả bàn bằng 4 chữ vần nhau', 'Kể 1 điều bạn biết ơn nhất năm qua',
    'Nói 1 mong ước cho năm mới', 'Khen thật lòng 1 người trong bàn 💖',
  ] },
  { id: 'do', icon: '🧠', name: 'Đố vui', color: '#b388ff', list: [
    'Ra 1 câu đố mẹo cho cả bàn đoán', 'Đố: Con gì đầu dê, mình ốc? (Con dốc) — đọc to rồi cho cả bàn đoán',
    'Đố: Cái gì càng kéo càng ngắn? (Điếu thuốc / cây bút chì gọt) — cho cả bàn đoán', 'Kể tên 5 nước bắt đầu bằng chữ “C” trong 15 giây',
    'Đọc ngược tên mình nhanh 3 lần',
  ] },
  { id: 'nangly', icon: '🥤', name: 'Nâng ly', color: '#ff8a65', list: [
    'Uống 1 ngụm đồ uống đang có (nước, trà, nước ngọt…) 🥤', 'Cả bàn cùng nâng ly: 1, 2, 3 dô! 🥂', 'Mời người đối diện uống cùng 1 ngụm',
    'Người bên phải uống cùng bạn 1 ngụm', 'Hô khẩu hiệu “Năm mới phát tài!” rồi uống 1 ngụm',
  ] },
  { id: 'mayman', icon: '🍀', name: 'May mắn', color: '#26c6da', list: [
    'Được miễn lượt này, nhận luôn 1 ⭐ 🎉', 'Được chỉ định 1 người làm 1 thử thách bất kỳ 👉', 'Được người bên trái bóp vai 10 giây 💆',
    'Được chọn bài nhạc nền tiếp theo 🎵',
  ] },
];
export const PENALTIES = ['Hát 1 câu “Mừng tuổi mẹ” 🎶', 'Vỗ tay 10 cái thật to 👏', 'Làm 5 cái nhún đứng lên ngồi xuống', 'Nói “Tui chịu thua!” với giọng cute nhất 🥺', 'Uống 1 ngụm nước 🥤'];

export class SpinRoom extends BaseRoom {
  static GAME = 'spin';
  static MAX = 10;
  minPlayers() { return 1; }
  inGame(s) { return !!this.seats[s]; }

  begin() {
    const first = this.seatOf(this.hostId);
    this.g = { turn: first >= 0 ? first : this.seats.findIndex(Boolean), phase: 'spin', spinId: 0, seg: null, text: '', stars: {}, history: [], penalty: '' };
    this.beginTurn();
  }
  resume() { this.beginTurn(); }

  beginTurn() {
    const g = this.g;
    g.deadline = Date.now() + 60000;
    this.hooks.emitState(this);
    this.scheduleAuto();
  }

  scheduleAuto() {
    if (this.state !== 'playing' || !this.g) return;
    const s = this.g.turn;
    if (!this.isAuto(s)) return;
    if (this.g.phase === 'spin') this.setTimer('bot', 1500, () => this.action(s, { a: 'spin' }));
    else if (this.g.phase === 'task') this.setTimer('bot', 4500, () => this.action(s, { a: Math.random() < 0.8 ? 'done' : 'skip' }));
  }

  nextTurn() {
    const g = this.g;
    const n = this.seats.length;
    for (let i = 1; i <= n; i++) { const s = (g.turn + i) % n; if (this.seats[s]) { g.turn = s; break; } }
    g.phase = 'spin'; g.seg = null; g.text = ''; g.penalty = '';
    this.beginTurn();
  }

  action(s, p = {}) {
    const g = this.g;
    if (this.state !== 'playing' || !g) return 'Chưa bắt đầu';
    if (p.a === 'stop') {
      if (this.seats[s]?.id !== this.hostId) return 'Chỉ chủ phòng mới dừng được';
      this.destroy(); this.state = 'waiting'; this.g = null; this.hooks.emitState(this); return null;
    }
    const isHost = this.seats[s]?.id === this.hostId;
    if (g.turn !== s && !(isHost && this.isAuto(g.turn) === false && p.a === 'next')) {
      if (p.a !== 'next') return 'Chưa tới lượt bạn quay nha 🎡';
    }
    if (p.a === 'spin') {
      if (g.phase !== 'spin') return null;
      const k = Math.floor(Math.random() * SEGMENTS.length);
      const seg = SEGMENTS[k];
      g.seg = k; g.spinId++;
      g.text = seg.list[Math.floor(Math.random() * seg.list.length)];
      g.phase = 'spinning';
      this.hooks.emitEvent(this, { kind: 'sp', what: 'spin', seat: s, seg: k, spinId: g.spinId });
      this.hooks.emitState(this);
      this.setTimer('phase', 4400, () => { g.phase = 'task'; this.hooks.emitEvent(this, { kind: 'sp', what: 'task', seat: s, text: g.text, seg: k }); this.beginTurn(); });
      return null;
    }
    if (p.a === 'done' || p.a === 'skip') {
      if (g.phase !== 'task') return null;
      const id = this.seats[s].id;
      const ok = p.a === 'done' || SEGMENTS[g.seg].id === 'mayman';
      if (ok) g.stars[id] = (g.stars[id] || 0) + 1;
      else g.penalty = PENALTIES[Math.floor(Math.random() * PENALTIES.length)];
      g.history.unshift({ seat: s, seg: g.seg, text: g.text, ok });
      g.history = g.history.slice(0, 8);
      this.hooks.emitEvent(this, { kind: 'sp', what: ok ? 'done' : 'skip', seat: s, penalty: g.penalty });
      this.clearTimer('bot');
      if (ok) this.nextTurn();
      else { g.phase = 'penalty'; this.hooks.emitState(this); this.setTimer('phase', 4500, () => this.nextTurn()); }
      return null;
    }
    if (p.a === 'next') { // chủ phòng cho qua lượt khi người kia vắng
      if (!isHost) return null;
      this.clearTimer('phase'); this.clearTimer('bot'); this.nextTurn(); return null;
    }
    return 'Không hiểu thao tác';
  }

  viewFor(id) {
    const v = this.baseView(id);
    const g = this.g;
    if (!g || this.state === 'waiting') return v;
    v.turn = g.turn;
    v.sp = { phase: g.phase, seg: g.seg, spinId: g.spinId, text: g.phase === 'spinning' ? '' : g.text, stars: g.stars, history: g.history, penalty: g.penalty };
    v.seats.forEach((p) => { if (p) p.status = null; });
    return v;
  }
}
