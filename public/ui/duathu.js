// Giao diện 🏇 Đua Thú: đường đua giả 3D nhìn từ sau lưng (kiểu game đua xe),
// 4 chặng đổi cảnh, có cua, có dốc, camera bám theo con của mình, bình luận viên, bảng xếp hạng trực tiếp.
import { avaHTML } from '../ava.js';
import { ANIMALS, ZONES, SAMPLES, progressAt, rng } from '../game/duathu.js';

const SEG = 200;          // độ dài 1 đoạn đường
const N = 900;            // số đoạn tới vạch đích
const EXTRA = 160;        // đường sau vạch đích
const ROAD = 2000;        // nửa bề rộng mặt đường
const CAM_H = 1000;
const DEPTH = 0.84;
const DRAW = 150;
const START = 12 * SEG;   // vạch xuất phát
const BACK = 1500;        // camera đứng sau con đang xem
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const PAL = {
  lua: { sky: ['#7cc8ff', '#dff4ff'], grass: ['#7acb5f', '#6cbd52'], road: ['#8c9099', '#868a93'], rumble: ['#ffffff', '#e53935'], far: '#4f9e45', far2: '#6cbf5c', sun: '☀️',
    deco: ['🌾', '🌾', '🌳', '🐃', '🏡', '🌻', '🌾', '🐓', '🎋', '🌳'] },
  pho: { sky: ['#24164f', '#ff9466'], grass: ['#a87f55', '#9b734b'], road: ['#5f5a68', '#595462'], rumble: ['#ffd54f', '#e53935'], far: '#2d1f5e', far2: '#47307a', sun: '🌙',
    deco: ['🏮', '🏮', '🏠', '🏯', '🎏', '🍜', '🛵', '🏮', '🏪', '🎆'] },
  bien: { sky: ['#2ea9f5', '#c6f0ff'], grass: ['#f2dca2', '#e9d091'], road: ['#9ca2aa', '#959ba3'], rumble: ['#ffffff', '#29b6f6'], far: '#1f86d6', far2: '#45a6ee', sun: '☀️',
    deco: ['🌴', '🌴', '⛱️', '🐚', '🦀', '⛵', '🏖️', '🌴', '🐬', '🦩'] },
  mai: { sky: ['#ff9fbd', '#fff0c2'], grass: ['#a2d870', '#94cc62'], road: ['#938d96', '#8c8690'], rumble: ['#ffffff', '#ffb300'], far: '#f06292', far2: '#f8a5c2', sun: '🌅',
    deco: ['🌼', '🌸', '🌼', '🧧', '🎈', '🌼', '🏮', '🌸', '🎉', '👏'] },
};
const ZONE_IDS = ZONES.map((z) => z.id);
const zoneOf = (i) => ZONE_IDS[Math.max(0, Math.min(3, Math.floor((i / N) * 4)))];

let ui = null;
let raf = 0;
let st = null;
let course = null;
let follow = -1;          // -1 = tự động (con của mình, không có thì con dẫn đầu)
let fx = null;            // trạng thái bình luận / hiệu ứng của cuộc đua hiện tại

export function reset() { cancelAnimationFrame(raf); raf = 0; ui = null; st = null; course = null; follow = -1; fx = null; }

// ---------- Đường đua ----------
function buildCourse(seed) {
  const R = rng(seed || 1);
  const total = N + EXTRA;
  const segs = [];
  while (segs.length < total) {
    const len = 25 + Math.floor(R() * 55);
    const i0 = segs.length;
    const straight = i0 < 25 || i0 > N - 60 || R() < 0.25;
    const c = straight ? 0 : (R() * 2 - 1) * 4.2;
    for (let k = 0; k < len; k++) segs.push({ curve: c * Math.sin((Math.PI * k) / len) });
  }
  segs.length = total;
  const p1 = R() * 6, p2 = R() * 6;
  segs.forEach((s, i) => {
    const amp = Math.min(1, i / 60, Math.max(0, (N - 30 - i) / 80));
    s.y = amp * (Math.sin(i * 0.035 + p1) * 0.65 + Math.sin(i * 0.013 + p2) * 0.35) * 2600;
    s.zone = zoneOf(i);
    s.deco = [];
  });
  // Cảnh hai bên đường
  for (let i = 8; i < total; i += 3 + Math.floor(R() * 3)) {
    const list = PAL[segs[i].zone].deco;
    const side = R() < 0.5 ? -1 : 1;
    segs[i].deco.push({ e: list[Math.floor(R() * list.length)], x: side * (1.35 + R() * 1.9), k: 0.55 + R() * 0.6 });
    if (R() < 0.5) segs[i].deco.push({ e: list[Math.floor(R() * list.length)], x: -side * (1.4 + R() * 2.2), k: 0.5 + R() * 0.6 });
  }
  // Cổng chào mỗi chặng + đám đông ở vạch đích
  ZONES.forEach((z, k) => { const i = Math.floor((N * k) / 4) + (k ? 0 : START / SEG + 1); segs[i].gate = k ? z.name : '🏁 XUẤT PHÁT'; });
  segs[N].gate = '🏁 VỀ ĐÍCH 🏁';
  for (let i = N - 40; i < N + 40; i += 2) { segs[i].deco.push({ e: ['🙌', '🎉', '👏', '📣', '🥳'][i % 5], x: -1.4 - (i % 3) * 0.5, k: 0.6 }, { e: ['🎊', '👏', '🙌', '🎈', '🥳'][i % 5], x: 1.4 + (i % 3) * 0.5, k: 0.6 }); }
  return segs;
}

const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  const p = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
  const a = p(c1), b = p(c2);
  return '#' + a.map((v, k) => Math.round(lerp(v, b[k], t)).toString(16).padStart(2, '0')).join('');
}

// ---------- Vị trí từng con ----------
function laneX(i, t) { return -0.8 + (i * 1.6) / (ANIMALS.length - 1) + Math.sin(t / 900 + i * 1.7) * 0.05; }
function zPos(r, t) {
  let p = progressAt(r, t);
  if (t > r.T) p = 1 + 0.035 * (1 - Math.exp(-(t - r.T) / 1400)); // chạy chậm lại sau vạch đích
  return START + p * (N * SEG - START);
}
function evNow(r, t, type) { return r.ev.some((e) => e.type === type && t >= (e.k / SAMPLES) * r.T && t < ((e.k + 4) / SAMPLES) * r.T); }

// ---------- Vẽ ----------
function poly(c, x1, y1, w1, x2, y2, w2, color) {
  c.fillStyle = color;
  y1 += 1; // chồng mép 1px cho khỏi hở vạch
  c.beginPath(); c.moveTo(x1 - w1, y1); c.lineTo(x2 - w2, y2); c.lineTo(x2 + w2, y2); c.lineTo(x1 + w1, y1); c.closePath(); c.fill();
}
function emoji(c, e, x, y, size, flip = false, rot = 0) {
  if (size < 3) return;
  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  if (flip) c.scale(-1, 1);
  c.fillStyle = '#000';
  c.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText(e, 0, 0);
  c.restore();
}

function draw(t, race, pick) {
  const cv = ui.cv, c = ui.c2;
  const W = cv.width, H = cv.height;
  const segs = course;
  // Camera bám theo con được xem
  const fi = followIdx(t, race);
  const fz = race ? zPos(race[fi], t) : 0;
  const camZ = Math.max(0, fz - BACK);
  const base = Math.floor(camZ / SEG);
  const frac = (camZ % SEG) / SEG;
  const camX = laneX(fi, t) * ROAD * 0.8;
  const s0 = segs[Math.min(base, segs.length - 2)], s1 = segs[Math.min(base + 1, segs.length - 1)];
  const camY = lerp(s0.y, s1.y, frac) + CAM_H;
  const HZ = H * 0.44;
  const proj = (x, y, z) => { const k = DEPTH / z; return { x: W / 2 + k * x * W / 2, y: HZ - k * y * H / 2, w: k * ROAD * W / 2 }; };

  // Bầu trời: chuyển màu êm giữa các chặng
  const zf = Math.min(3.999, (base / N) * 4);
  const zi = Math.floor(zf), zt = Math.max(0, (zf - zi - 0.9) * 10);
  const A = PAL[ZONE_IDS[zi]], B = PAL[ZONE_IDS[Math.min(3, zi + 1)]];
  const g = c.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, mix(A.sky[0], B.sky[0], zt)); g.addColorStop(1, mix(A.sky[1], B.sky[1], zt));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // Mặt trời / trăng
  emoji(c, zt > 0.5 ? B.sun : A.sun, W * 0.8 - ui.bgX * 0.2 % W, HZ * 0.42, H * 0.09);
  // Đồi xa (trôi theo khúc cua)
  [[A.far2, B.far2, 0.35, 0.16, 0.006], [A.far, B.far, 0.6, 0.11, 0.011]].forEach(([c1, c2, par, amp, fq]) => {
    c.fillStyle = mix(c1, c2, zt);
    c.beginPath(); c.moveTo(0, HZ + 2);
    for (let x = 0; x <= W; x += 8) {
      const u = (x + ui.bgX * par) * fq / (W / 400);
      c.lineTo(x, HZ - (Math.sin(u) * 0.6 + Math.sin(u * 2.3 + 1) * 0.4 + 1) * H * amp * 0.5);
    }
    c.lineTo(W, HZ + 2); c.closePath(); c.fill();
  });
  // Nền đất phía dưới
  c.fillStyle = PAL[segs[base].zone].grass[0]; c.fillRect(0, HZ, W, H - HZ);

  // Mặt đường: gần -> xa, nhớ đường chân trời để cắt hình
  let x = 0, dx = -s0.curve * frac;
  let maxy = H;
  const P = [];
  for (let n = 0; n < DRAW; n++) {
    const i = base + n;
    if (i >= segs.length - 1) break;
    const s = segs[i], sn = segs[i + 1];
    const z1 = i * SEG - camZ, z2 = (i + 1) * SEG - camZ;
    const pr = { i, clip: maxy };
    P.push(pr);
    const ox = x, odx = dx;
    x += dx; dx += s.curve;
    if (z1 <= 40) { pr.skip = true; continue; }
    const a = proj(ox - camX, s.y - camY, z1), b = proj(ox + odx - camX, sn.y - camY, z2);
    pr.a = a; pr.b = b;
    if (b.y >= maxy || b.y >= a.y) continue;
    const pal = PAL[s.zone], alt = Math.floor(i / 3) % 2;
    c.fillStyle = pal.grass[alt]; c.fillRect(0, b.y, W, a.y - b.y + 1);
    poly(c, a.x, a.y, a.w * 1.14, b.x, b.y, b.w * 1.14, pal.rumble[alt]);
    poly(c, a.x, a.y, a.w, b.x, b.y, b.w, pal.road[alt]);
    if (i >= N && i < N + 3) { // vạch đích ca-rô
      const cols = 10;
      for (let k = 0; k < cols; k++) {
        const u1 = -1 + (2 * k) / cols, u2 = u1 + 2 / cols;
        c.fillStyle = (k + i) % 2 ? '#111' : '#fff';
        c.beginPath(); c.moveTo(a.x + a.w * u1, a.y); c.lineTo(b.x + b.w * u1, b.y); c.lineTo(b.x + b.w * u2, b.y); c.lineTo(a.x + a.w * u2, a.y); c.closePath(); c.fill();
      }
    } else if (i >= START / SEG && i < START / SEG + 2) poly(c, a.x, a.y, a.w, b.x, b.y, b.w, '#fff');
    else if (alt) [-0.5, 0, 0.5].forEach((u) => poly(c, a.x + a.w * u, a.y, a.w * 0.012, b.x + b.w * u, b.y, b.w * 0.012, 'rgba(255,255,255,.75)'));
    maxy = b.y;
  }

  // Thú + cảnh vật: xa -> gần
  const owner = {}; Object.entries(pick || {}).forEach(([s, i]) => { owner[i] = +s; });
  const runners = ANIMALS.map((a, i) => ({ i, z: race ? zPos(race[i], t) : 0 }));
  for (let n = P.length - 1; n >= 0; n--) {
    const pr = P[n];
    if (pr.skip || !pr.a) continue;
    const s = segs[pr.i];
    c.save(); c.beginPath(); c.rect(0, 0, W, pr.clip); c.clip();
    s.deco.forEach((d) => emoji(c, d.e, pr.a.x + pr.a.w * d.x, pr.a.y, pr.a.w * 0.5 * d.k));
    if (s.gate) drawGate(c, pr.a, s.gate);
    runners.filter((r) => Math.floor(r.z / SEG) === pr.i && r.z > camZ + 60).forEach((r) => {
      const f = (r.z % SEG) / SEG;
      const b = pr.b || pr.a;
      const sx = lerp(pr.a.x, b.x, f) + lerp(pr.a.w, b.w, f) * laneX(r.i, t);
      const sy = lerp(pr.a.y, b.y, f);
      const w = lerp(pr.a.w, b.w, f);
      const size = w * 0.34;
      const R = race && race[r.i];
      const running = R && t > 0 && t < R.T + 1500;
      const slip = R && evNow(R, t, 'slip');
      const boost = R && evNow(R, t, 'boost');
      const nap = R && evNow(R, t, 'nap');
      const hop = running && !nap ? Math.abs(Math.sin(t / 110 + r.i)) * size * 0.12 : 0;
      // bóng
      c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(sx, sy, size * 0.4, size * 0.09, 0, 0, Math.PI * 2); c.fill();
      if (boost) emoji(c, '💨', sx + size * 0.55, sy - size * 0.1, size * 0.55);
      emoji(c, ANIMALS[r.i].icon, sx, sy - hop, size, true, slip ? Math.sin(t / 60) * 0.5 : 0);
      if (nap) emoji(c, '💤', sx + size * 0.4, sy - size * 0.9, size * 0.45);
      if (slip) emoji(c, '🌀', sx, sy - size * 1.05, size * 0.45);
      // nhãn chủ nhân
      const o = owner[r.i];
      if (size > 14 && o != null && st.seats[o]) {
        const mine = o === st.mySeat;
        const label = mine ? 'BẠN' : st.seats[o].name;
        const fs = Math.max(10, Math.min(26, size * 0.22));
        c.font = `800 ${fs}px Baloo, system-ui, sans-serif`;
        const tw = c.measureText(label).width + fs;
        const ly = sy - size - hop - fs * 0.6;
        c.fillStyle = mine ? '#ff4f6d' : 'rgba(255,255,255,.92)';
        c.beginPath(); c.roundRect ? c.roundRect(sx - tw / 2, ly - fs * 1.1, tw, fs * 1.5, fs * 0.7) : c.rect(sx - tw / 2, ly - fs * 1.1, tw, fs * 1.5); c.fill();
        c.fillStyle = mine ? '#fff' : '#5b3030'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(label, sx, ly - fs * 0.35);
      }
    });
    c.restore();
  }
  // Vệt gió khi con đang xem tăng tốc
  if (race && evNow(race[fi], t, 'boost')) {
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(2, W / 300);
    for (let k = 0; k < 14; k++) {
      const ang = (k / 14) * Math.PI * 2 + t / 200;
      const r1 = W * 0.38 + ((t / 3 + k * 50) % (W * 0.2)), r2 = r1 + W * 0.12;
      c.beginPath(); c.moveTo(W / 2 + Math.cos(ang) * r1, H * 0.55 + Math.sin(ang) * r1 * 0.6); c.lineTo(W / 2 + Math.cos(ang) * r2, H * 0.55 + Math.sin(ang) * r2 * 0.6); c.stroke();
    }
  }
  ui.bgX += (s0.curve || 0) * 6;
  return { fi, base };
}

function drawGate(c, a, text) {
  const w = a.w * 2.5, h = a.w * 0.32;
  if (w < 20) return;
  const top = a.y - a.w * 1.25;
  c.fillStyle = '#c4122a';
  c.fillRect(a.x - w / 2, top, a.w * 0.06, a.w * 1.25);
  c.fillRect(a.x + w / 2 - a.w * 0.06, top, a.w * 0.06, a.w * 1.25);
  c.fillStyle = '#ffd54f';
  c.fillRect(a.x - w / 2, top - h * 0.1, w, h);
  c.strokeStyle = '#c4122a'; c.lineWidth = Math.max(1, h * 0.08); c.strokeRect(a.x - w / 2, top - h * 0.1, w, h);
  c.fillStyle = '#7d0f1d';
  c.font = `800 ${Math.max(8, h * 0.55)}px Baloo, system-ui, ${EMOJI_FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, a.x, top + h * 0.4);
}

function followIdx(t, race) {
  if (follow >= 0) return follow;
  const mine = st && st.dt && st.dt.pick[st.mySeat];
  if (mine != null) return mine;
  if (!race) return 0;
  let best = 0;
  race.forEach((r, i) => { if (zPos(r, t) > zPos(race[best], t)) best = i; });
  return best;
}

// ---------- Bình luận viên ----------
function say(text, cls = '') {
  if (!ui) return;
  const el = ui.ticker;
  el.textContent = text; el.className = 'dt-ticker show ' + cls;
  clearTimeout(say.t); say.t = setTimeout(() => { el.className = 'dt-ticker'; }, 2200);
}
function commentary(t, race, fi) {
  const ctx = ui.ctx;
  if (!fx) fx = { leader: -1, rank: -1, seen: new Set(), zone: -1, final: false, close: false, fin: new Set(), last: 0, go: false };
  if (t >= 0 && !fx.go) { fx.go = true; ctx.bigText('XUẤT PHÁT! 🏁', true); ctx.sfx.bigCombo(); }
  if (t < 0) return;
  const z = race.map((r) => zPos(r, t));
  const order = z.map((v, i) => i).sort((a, b) => z[b] - z[a]);
  const now = performance.now();
  const can = (gap = 1300) => now - fx.last > gap && (fx.last = now);
  // Chặng mới
  const zone = Math.min(3, Math.floor((z[fi] / (N * SEG)) * 4));
  if (zone !== fx.zone) { if (fx.zone >= 0) { ctx.bigText(ZONES[zone].name, true); ctx.sfx.deal(); } fx.zone = zone; }
  // Sự kiện của từng con
  race.forEach((r, i) => r.ev.forEach((e, k) => {
    const key = i + ':' + k;
    if (fx.seen.has(key) || t < (e.k / SAMPLES) * r.T) return;
    fx.seen.add(key);
    const a = ANIMALS[i];
    const mine = i === fi;
    if (e.type === 'boost' && (mine || can())) { say(`💨 ${a.icon} ${a.name} tăng tốc!`, mine ? 'hot' : ''); if (mine) ctx.sfx.bigCombo(); }
    if (e.type === 'slip' && (mine || can())) { say(`🌀 ${a.icon} ${a.name} trượt vũng bùn!`, mine ? 'bad' : ''); if (mine) { ctx.sfx.pass(); ui.wrap.classList.remove('shake'); void ui.wrap.offsetWidth; ui.wrap.classList.add('shake'); } }
    if (e.type === 'nap') { say(`💤 ${a.icon} ${a.name} ngủ quên giữa đường!`, 'bad'); fx.last = now; }
  }));
  // Đổi người dẫn đầu
  if (t > 2500 && order[0] !== fx.leader) {
    if (fx.leader >= 0 && can(900)) { say(`👑 ${ANIMALS[order[0]].icon} ${ANIMALS[order[0]].name} vượt lên dẫn đầu!`); ctx.sfx.pop(); }
    fx.leader = order[0];
  }
  // Thứ hạng con đang xem
  const rk = order.indexOf(fi);
  if (fx.rank >= 0 && rk !== fx.rank && t > 2500 && z[fi] < N * SEG) {
    const other = ANIMALS[order[rk < fx.rank ? rk + 1 : rk - 1]];
    if (rk < fx.rank && can(700)) { say(`🔥 Vượt mặt ${other.icon} ${other.name}!`, 'hot'); ctx.sfx.select(); }
    else if (rk > fx.rank && can(700)) say(`😱 Bị ${other.icon} ${other.name} vượt rồi!`, 'bad');
  }
  fx.rank = rk;
  // Nước rút
  const lead = z[order[0]] / (N * SEG);
  if (!fx.final && lead > 0.86) { fx.final = true; say('🔥 Nước rút cuối cùng!!', 'hot'); ctx.sfx.bigCombo(); }
  if (!fx.close && lead > 0.94 && lead < 1 && (z[order[0]] - z[order[1]]) / (N * SEG) < 0.012) { fx.close = true; ctx.bigText('😮 SÁT NÚT!!', true); }
  // Về đích
  race.forEach((r, i) => {
    if (t < r.T || fx.fin.has(i)) return;
    fx.fin.add(i);
    const pl = fx.fin.size;
    if (i === fi) { ctx.bigText(pl === 1 ? `🏆 VỀ NHẤT!` : `🏁 Về thứ ${pl}!`, pl <= 3); if (pl === 1) { ctx.confetti(); ctx.sfx.win(); } }
    else if (pl === 1) say(`🏆 ${ANIMALS[i].icon} ${ANIMALS[i].name} về nhất!`, 'hot');
  });
}

// ---------- Khung hình ----------
function frame() {
  raf = 0;
  if (!ui || !st || !st.dt || !document.body.contains(ui.cv)) return;
  fit();
  const dt = st.dt;
  const race = dt.race;
  const t = race ? ui.ctx.now() - dt.startAt : -1;
  const { fi } = draw(t, race, dt.pick);
  if (race) {
    commentary(t, race, fi);
    hud(t, race, fi);
  }
  const done = race && race.every((r) => t > r.T + 2600);
  if (!done) raf = requestAnimationFrame(frame);
}

function fit() {
  const r = ui.wrap.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (ui.cv.width !== w || ui.cv.height !== h) { ui.cv.width = w; ui.cv.height = h; }
}

function hud(t, race, fi) {
  const z = race.map((r) => zPos(r, t));
  const order = z.map((v, i) => i).sort((a, b) => (t >= race[a].T && t >= race[b].T ? race[a].T - race[b].T : z[b] - z[a]));
  const rk = order.indexOf(fi) + 1;
  ui.rank.innerHTML = `<b>${rk}</b><small>/${ANIMALS.length}</small>`;
  ui.rank.className = 'dt-rank r' + Math.min(4, rk);
  ui.who.textContent = `🎥 ${ANIMALS[fi].icon} ${ANIMALS[fi].name}${follow < 0 ? '' : ' · chạm để đổi'}`;
  ui.zone.textContent = t < 0 ? 'Chuẩn bị…' : ZONES[Math.min(3, Math.floor((z[fi] / (N * SEG)) * 4))].name;
  ui.bar.forEach((el, i) => {
    const p = Math.min(1, z[i] / (N * SEG));
    el.style.left = (p * 100).toFixed(2) + '%';
    el.classList.toggle('me', i === fi);
  });
  // Đếm ngược
  const cd = t < 0 ? Math.ceil(-t / 1000) : 0;
  ui.count.textContent = cd > 0 && cd <= 3 ? cd : '';
  if (cd !== ui.lastCd) { ui.lastCd = cd; if (cd > 0 && cd <= 3) { ui.ctx.sfx.select(); ui.count.classList.remove('pop'); void ui.count.offsetWidth; ui.count.classList.add('pop'); } }
  // Bục trao giải
  const allIn = race.every((r) => t >= r.T);
  ui.podium.classList.toggle('hidden', !allIn);
  if (allIn && !ui.podium.dataset.done) {
    ui.podium.dataset.done = 1;
    const owner = {}; Object.entries(st.dt.pick).forEach(([s, i]) => { owner[i] = +s; });
    const fin = race.map((r, i) => i).sort((a, b) => race[a].T - race[b].T);
    ui.podium.innerHTML = '<div class="dt-pod-title">🏆 Kết quả</div>' + fin.slice(0, 3).map((i, k) => {
      const o = owner[i] != null ? st.seats[owner[i]] : null;
      return `<div class="dt-pod p${k + 1}"><span class="m">${['🥇', '🥈', '🥉'][k]}</span><span class="a">${ANIMALS[i].icon}</span><span class="n">${ANIMALS[i].name}</span><span class="o">${o ? avaHTML(o.avatar, o.acc) : ''}</span></div>`;
    }).join('');
  }
}

function build(board, ctx) {
  board.innerHTML = `
    <div class="dt-stage">
      <canvas class="dt-cv"></canvas>
      <div class="dt-top"><div class="dt-rank"></div><div class="dt-info"><div class="dt-zone"></div><button class="dt-who"></button></div></div>
      <div class="dt-bar"><i class="flag">🏁</i>${ANIMALS.map((a) => `<span>${a.icon}</span>`).join('')}</div>
      <div class="dt-ticker"></div>
      <div class="dt-count"></div>
      <div class="dt-podium hidden"></div>
    </div>
    <div class="db-players dt-players"></div>
    <div class="dt-pick"></div>`;
  const u = {
    board, ctx, wrap: board.querySelector('.dt-stage'), cv: board.querySelector('.dt-cv'), rank: board.querySelector('.dt-rank'), zone: board.querySelector('.dt-zone'),
    who: board.querySelector('.dt-who'), bar: [...board.querySelectorAll('.dt-bar span')], ticker: board.querySelector('.dt-ticker'), count: board.querySelector('.dt-count'),
    podium: board.querySelector('.dt-podium'), players: board.querySelector('.dt-players'), pick: board.querySelector('.dt-pick'), bgX: 0, lastCd: -1,
  };
  u.c2 = u.cv.getContext('2d');
  // Chạm màn hình để đổi camera sang con khác
  const cycle = () => {
    const t = st && st.dt && st.dt.race ? ctx.now() - st.dt.startAt : 0;
    const cur = followIdx(t, st && st.dt && st.dt.race);
    follow = (cur + 1) % ANIMALS.length;
    if (fx) fx.rank = -1;
    ctx.sfx.select();
  };
  u.cv.onclick = cycle; u.who.onclick = cycle;
  return u;
}

export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const dt = s.dt;
  st = s;
  if (!dt || s.state === 'waiting') { reset(); board.className = 'hidden'; board.innerHTML = ''; ctx.banner('', false); return; }
  board.className = 'dicebet duathu' + (dt.phase === 'pick' ? ' picking' : '');
  if (!ui || !board.contains(ui.cv)) ui = build(board, ctx);
  ui.ctx = ctx;
  const seed = dt.seed || 7;
  if (!course || course.seed !== seed) { course = buildCourse(seed); course.seed = seed; fx = null; ui.podium.dataset.done = ''; ui.podium.classList.add('hidden'); }
  const me = s.mySeat;
  const isHost = s.hostId === ctx.playerId();
  const owner = {}; Object.entries(dt.pick).forEach(([k, i]) => { owner[i] = +k; });

  // Người chơi + thú đã chọn
  ui.players.innerHTML = '';
  s.seats.forEach((p, k) => {
    if (!p) return;
    const a = dt.pick[k] != null ? ANIMALS[dt.pick[k]] : null;
    const res = s.state === 'ended' && s.results ? s.results.find((r) => r.seat === k) : null;
    const d = document.createElement('div');
    d.className = 'db-p' + (k === me ? ' me' : '') + (res ? (res.delta > 0 ? ' win' : res.delta < 0 ? ' lose' : '') : '');
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span><span class="bt">${a ? a.icon : '…'}${res && res.delta ? ` ${res.delta > 0 ? '+' : ''}${res.delta}` : ''}</span>`;
    d.querySelector('.nm').textContent = p.name;
    ui.players.appendChild(d);
  });

  // Chọn thú
  ui.pick.innerHTML = '';
  if (dt.phase === 'pick') {
    ANIMALS.forEach((a, i) => {
      const b = document.createElement('button');
      const o = owner[i] != null ? s.seats[owner[i]] : null;
      b.className = 'dt-opt' + (owner[i] === me && me >= 0 ? ' mine' : o ? ' taken' : '');
      b.style.setProperty('--c', a.color);
      b.innerHTML = `<span class="ic">${a.icon}</span><b>${a.name}</b><span class="who">${o ? avaHTML(o.avatar, o.acc) : ''}</span>`;
      b.disabled = !!o && owner[i] !== me;
      b.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'pick', i }); };
      ui.pick.appendChild(b);
    });
  }
  if (!raf) raf = requestAnimationFrame(frame);

  const box = ctx.$('#stageMine');
  box.innerHTML = '';
  if (s.state !== 'playing') return ctx.banner('', false);
  if (dt.phase === 'pick') {
    if (isHost) {
      const r = document.createElement('div'); r.className = 'db-chips';
      r.innerHTML = '<button class="btn big pink">🏁 Xuất phát luôn</button>';
      r.firstChild.onclick = () => { ctx.sfx.pop(); ctx.socket.emit('act', { a: 'go' }); };
      box.appendChild(r);
    }
    const mine = dt.pick[me];
    ctx.banner(mine != null ? `${ANIMALS[mine].icon} Bạn chọn ${ANIMALS[mine].name}! Xuất phát sau <span class="dt-left"></span>s` : '👇 Chọn 1 con thú để đua · còn <span class="dt-left"></span>s', mine == null, true);
  } else {
    const mine = dt.pick[me];
    ctx.banner(mine != null ? `📣 Cố lên ${ANIMALS[mine].icon} ${ANIMALS[mine].name}! · chạm màn hình để đổi góc quay` : '👀 Chạm màn hình để đổi góc quay', false);
  }
}

export function tick(s, ctx) {
  const el = document.querySelector('.dt-left');
  if (el && s.dt && s.dt.phase === 'pick') el.textContent = Math.max(0, Math.ceil((s.deadline - ctx.now()) / 1000));
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'dt') return;
  if (ev.what === 'pick') ctx.sfx.select();
  if (ev.what === 'go') { follow = -1; fx = null; ctx.toast('🏁 Các tay đua vào vạch xuất phát!'); }
  if (ev.what === 'finish') {
    const a = ANIMALS[ev.winner];
    ctx.sysChat(`🏆 ${a.icon} ${a.name} về nhất${ev.seat != null ? ` · chủ nhân ${ctx.nameOf(ev.seat)}` : ' (chưa có chủ)'}`);
  }
}
