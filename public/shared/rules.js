// Luật Tiến Lên Miền Nam — dùng chung cho server và client.
// Mã lá bài: id 0..51. rank = floor(id/4) (0 = "3" ... 11 = "A", 12 = "2"),
// suit = id % 4 (0 ♠ bích, 1 ♣ chuồn, 2 ♦ rô, 3 ♥ cơ). So sánh lá bài = so sánh id.

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const SUITS = ['♠', '♣', '♦', '♥'];
export const TWO = 12;

export const rankOf = (id) => Math.floor(id / 4);
export const suitOf = (id) => id % 4;
export const cardLabel = (id) => RANKS[rankOf(id)] + SUITS[suitOf(id)];

export const COMBO_NAMES = {
  single: 'Rác',
  pair: 'Đôi',
  triple: 'Sám cô',
  quad: 'Tứ quý',
  straight: 'Sảnh',
  pairseq: 'Đôi thông',
};

export function comboName(c) {
  if (!c) return '';
  if (c.type === 'single' && rankOf(c.top) === TWO) return 'Heo';
  if (c.type === 'pair' && rankOf(c.top) === TWO) return 'Đôi heo';
  if (c.type === 'straight') return `Sảnh ${c.len}`;
  if (c.type === 'pairseq') return `${c.len} đôi thông`;
  return COMBO_NAMES[c.type];
}

/** Nhận diện bộ bài. Trả về {type, len, top, cards} hoặc null nếu không hợp lệ. */
export function getCombo(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return null;
  const ids = [...cards].sort((a, b) => a - b);
  if (new Set(ids).size !== ids.length) return null;
  if (ids.some((x) => !Number.isInteger(x) || x < 0 || x > 51)) return null;
  const n = ids.length;
  const top = ids[n - 1];
  const ranks = ids.map(rankOf);

  if (n === 1) return { type: 'single', len: 1, top, cards: ids };

  if (ranks.every((r) => r === ranks[0])) {
    const type = { 2: 'pair', 3: 'triple', 4: 'quad' }[n];
    return type ? { type, len: 1, top, cards: ids } : null;
  }

  // Sảnh: >= 3 lá liên tiếp, không có heo
  if (n >= 3 && !ranks.includes(TWO)) {
    let ok = true;
    for (let i = 1; i < n; i++) if (ranks[i] !== ranks[i - 1] + 1) { ok = false; break; }
    if (ok) return { type: 'straight', len: n, top, cards: ids };
  }

  // Đôi thông: >= 3 đôi liên tiếp, không có heo
  if (n >= 6 && n % 2 === 0 && !ranks.includes(TWO)) {
    let ok = true;
    for (let i = 0; i < n; i += 2) {
      if (ranks[i] !== ranks[i + 1]) { ok = false; break; }
      if (i > 0 && ranks[i] !== ranks[i - 2] + 1) { ok = false; break; }
    }
    if (ok) return { type: 'pairseq', len: n / 2, top, cards: ids };
  }
  return null;
}

/** Có phải là "chặt" (bộ đặc biệt đè heo / hàng) không. */
const isBomb = (c) => c.type === 'quad' || c.type === 'pairseq';
/** Có phải "chặt" không: đè heo bằng hàng, hoặc đè hàng bằng hàng (kể cả hàng cùng loại lớn hơn). */
export function isChop(prev, cur) {
  if (!prev || !cur || !canBeat(prev, cur)) return false;
  if (isBomb(prev)) return isBomb(cur);
  return rankOf(prev.top) === TWO && isBomb(cur);
}

/** cur có đè được prev không. prev null = được đánh tự do. */
export function canBeat(prev, cur) {
  if (!cur) return false;
  if (!prev) return true;
  if (prev.type === cur.type && prev.len === cur.len) return cur.top > prev.top;

  const prevIsTwo = rankOf(prev.top) === TWO;
  // Chặt 1 heo: tứ quý hoặc 3+ đôi thông
  if (prev.type === 'single' && prevIsTwo) {
    return cur.type === 'quad' || (cur.type === 'pairseq' && cur.len >= 3);
  }
  // Chặt đôi heo: tứ quý hoặc 4+ đôi thông
  if (prev.type === 'pair' && prevIsTwo) {
    return cur.type === 'quad' || (cur.type === 'pairseq' && cur.len >= 4);
  }
  // 3 đôi thông bị chặt bởi tứ quý hoặc 4 đôi thông
  if (prev.type === 'pairseq' && prev.len === 3) {
    return cur.type === 'quad' || (cur.type === 'pairseq' && cur.len >= 4);
  }
  // Tứ quý bị chặt bởi 4 đôi thông
  if (prev.type === 'quad') {
    return cur.type === 'pairseq' && cur.len >= 4;
  }
  return false;
}

/** Kiểm tra tới trắng (thắng ngay khi chia bài). Trả về tên hoặc null. */
export function checkInstantWin(hand) {
  const count = new Array(13).fill(0);
  hand.forEach((id) => count[rankOf(id)]++);
  if (count[TWO] === 4) return 'Tứ quý heo';
  if (count.slice(0, 12).every((c) => c >= 1)) return 'Sảnh rồng';
  const pairs = count.reduce((s, c) => s + Math.floor(c / 2), 0);
  if (pairs >= 6) return 'Sáu đôi';
  let run = 0;
  for (let r = 0; r < 12; r++) {
    run = count[r] >= 2 ? run + 1 : 0;
    if (run >= 5) return 'Năm đôi thông';
  }
  return null;
}

export function sortHand(hand, mode = 'rank') {
  if (SMART_VARIANT[mode]) return smartGroups(hand, SMART_VARIANT[mode]).flatMap((g) => g.cards);
  const h = [...hand];
  if (mode === 'suit') return h.sort((a, b) => suitOf(a) - suitOf(b) || a - b);
  return h.sort((a, b) => a - b);
}

// ---------- Sinh các bộ có thể đánh (dùng cho bot và nút "Gợi ý") ----------

function groupByRank(hand) {
  const g = Array.from({ length: 13 }, () => []);
  [...hand].sort((a, b) => a - b).forEach((id) => g[rankOf(id)].push(id));
  return g;
}

function kCombos(arr, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

/** Tất cả các bộ cùng loại (type, len) trong bài. Với sảnh/đôi thông, chọn lá rẻ nhất mỗi bậc,
 *  nhưng bậc cao nhất thử mọi lựa chọn để có thể đè. */
export function combosOfShape(hand, type, len) {
  const g = groupByRank(hand);
  const out = [];
  if (type === 'single') hand.forEach((id) => out.push([id]));
  if (type === 'pair' || type === 'triple' || type === 'quad') {
    const k = { pair: 2, triple: 3, quad: 4 }[type];
    g.forEach((cards) => { if (cards.length >= k) out.push(...kCombos(cards, k)); });
  }
  if (type === 'straight') {
    for (let s = 0; s + len - 1 < 12; s++) {
      let ok = true;
      for (let r = s; r < s + len; r++) if (!g[r].length) { ok = false; break; }
      if (!ok) continue;
      const base = [];
      for (let r = s; r < s + len - 1; r++) base.push(g[r][0]);
      g[s + len - 1].forEach((t) => out.push([...base, t]));
    }
  }
  if (type === 'pairseq') {
    for (let s = 0; s + len - 1 < 12; s++) {
      let ok = true;
      for (let r = s; r < s + len; r++) if (g[r].length < 2) { ok = false; break; }
      if (!ok) continue;
      const base = [];
      for (let r = s; r < s + len - 1; r++) base.push(g[r][0], g[r][1]);
      kCombos(g[s + len - 1], 2).forEach((p) => out.push([...base, ...p]));
    }
  }
  return out.map(getCombo).filter(Boolean);
}

/** Tất cả bộ đè được prev (prev null => mọi bộ có thể đánh). */
export function allPlays(hand, prev) {
  const shapes = [];
  if (!prev) {
    shapes.push(['single', 1], ['pair', 1], ['triple', 1], ['quad', 1]);
    for (let l = 3; l <= 12; l++) shapes.push(['straight', l]);
    for (let l = 3; l <= 6; l++) shapes.push(['pairseq', l]);
  } else {
    shapes.push([prev.type, prev.len]);
    shapes.push(['quad', 1]);
    for (let l = 3; l <= 6; l++) shapes.push(['pairseq', l]);
  }
  const seen = new Set();
  const res = [];
  for (const [t, l] of shapes) {
    for (const c of combosOfShape(hand, t, l)) {
      const key = c.cards.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      if (canBeat(prev, c)) res.push(c);
    }
  }
  return res;
}

// ---------- Luật tuỳ chọn của phòng ----------
export const DEFAULT_SETTINGS = {
  noTwoLast: true,    // Cấm về bằng heo (lá cuối có 2)
  noBombLast: false,  // Cấm về bằng hàng (tứ quý / đôi thông)
  mustStart3: false,  // Ván đầu phải đánh kèm lá nhỏ nhất (3♠)
  chopPay: true,      // Chặt heo / chặt hàng tính tiền (chặt chồng cộng dồn)
  penalty: true,      // Thối heo, thối hàng cho người về bét
  cong: true,         // Cóng (bét còn nguyên 13 lá) thua gấp đôi
  instantWin: true,   // Tới trắng
  turnSec: 25,        // Thời gian mỗi lượt
  stake: 1,           // Mức cược: nhân tiền thắng thua mọi game
  pts3: '2,1,-3',     // Cách tính khi chơi 3 người: nhất, nhì, bét
  caroBlock: true,    // Caro: bị chặn 2 đầu thì không thắng
  debt: false,        // Chế độ ghi nợ
  unit: 1,            // 1 phần = bao nhiêu (điểm / nghìn)
  unitLabel: 'điểm',
};
export const TURN_CHOICES = [15, 25, 40, 60];
export const PTS3_CHOICES = ['2,1,-3', '3,1,-4', '2,0,-2'];
export const UNIT_CHOICES = [1, 2, 5, 10];
export const STAKE_CHOICES = [1, 2, 5, 10, 20, 50, 100];
export const UNIT_LABELS = ['điểm', 'k'];

export function normalizeSettings(s = {}) {
  const d = DEFAULT_SETTINGS;
  const out = { ...d };
  for (const k of Object.keys(d)) if (typeof d[k] === 'boolean' && typeof s[k] === 'boolean') out[k] = s[k];
  if (TURN_CHOICES.includes(s.turnSec)) out.turnSec = s.turnSec;
  if (PTS3_CHOICES.includes(s.pts3)) out.pts3 = s.pts3;
  if (UNIT_CHOICES.includes(s.unit)) out.unit = s.unit;
  if (STAKE_CHOICES.includes(s.stake)) out.stake = s.stake;
  if (UNIT_LABELS.includes(s.unitLabel)) out.unitLabel = s.unitLabel;
  return out;
}

/** Lý do bộ bài vi phạm luật "về" (đánh lá cuối). null = hợp lệ. */
export function finishViolation(handLen, combo, settings) {
  if (!combo || combo.cards.length !== handLen) return null;
  if (settings.noTwoLast && combo.cards.some((c) => rankOf(c) === TWO)) return 'Không được về bằng heo 🐷';
  if (settings.noBombLast && (combo.type === 'quad' || combo.type === 'pairseq')) return 'Không được về bằng hàng 💣';
  return null;
}

/** Giá trị (số phần) khi bị chặt: heo đen 1, heo đỏ 2, 3 đôi thông 3, tứ quý 4, 4 đôi thông 6. */
export function chopValue(combo) {
  if (!combo) return 0;
  if ((combo.type === 'single' || combo.type === 'pair') && rankOf(combo.top) === TWO) {
    return combo.cards.reduce((s, c) => s + (suitOf(c) >= 2 ? 2 : 1), 0);
  }
  if (combo.type === 'pairseq') return combo.len >= 4 ? 6 : 3;
  if (combo.type === 'quad') return 4;
  return 0;
}

/** Hàng còn trong tay (để tính thối): số tứ quý và số bộ 3 đôi thông rời nhau. */
export function bombsInHand(hand) {
  const count = new Array(13).fill(0);
  hand.forEach((id) => count[rankOf(id)]++);
  let quads = 0, pairSeqs = 0;
  for (let r = 0; r < 13; r++) if (count[r] === 4) { quads++; count[r] = 0; }
  let run = 0;
  for (let r = 0; r < 12; r++) {
    run = count[r] >= 2 ? run + 1 : 0;
    if (run === 3) { pairSeqs++; run = 0; }
  }
  return { quads, pairSeqs };
}

/** Gợi ý cách trả nợ ít lần chuyển nhất. totals: {id: số dư} → [{from, to, amount}] */
export function settleDebts(totals) {
  const pos = [], neg = [];
  Object.entries(totals).forEach(([id, v]) => { if (v > 0) pos.push([id, v]); else if (v < 0) neg.push([id, -v]); });
  pos.sort((a, b) => b[1] - a[1]); neg.sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < neg.length && j < pos.length) {
    const amt = Math.min(neg[i][1], pos[j][1]);
    if (amt > 0) out.push({ from: neg[i][0], to: pos[j][0], amount: Math.round(amt * 100) / 100 });
    neg[i][1] -= amt; pos[j][1] -= amt;
    if (neg[i][1] <= 1e-9) i++;
    if (pos[j][1] <= 1e-9) j++;
  }
  return out;
}

// ---------- Xếp bài thông minh: gom thành từng bộ đánh được ----------
const takeRun = (byRank, need, minLen, out, type) => {
  // tìm dãy bậc liên tiếp dài nhất (không có heo) mà mỗi bậc còn >= need lá
  let best = null;
  for (let s = 0; s < 12; s++) {
    let e = s;
    while (e < 12 && byRank[e].length >= need) e++;
    if (e - s >= minLen && (!best || e - s > best[1] - best[0])) best = [s, e];
  }
  if (!best) return false;
  const cards = [];
  for (let r = best[0]; r < best[1]; r++) cards.push(...byRank[r].splice(0, need));
  out.push({ type, cards });
  return true;
};

function groupWith(hand, straightsFirst) {
  const byRank = Array.from({ length: 13 }, () => []);
  [...hand].sort((a, b) => a - b).forEach((id) => byRank[rankOf(id)].push(id));
  const bombs = [], normal = [];
  // Heo để riêng
  const twos = byRank[TWO].splice(0);
  // Tứ quý
  for (let r = 0; r < 12; r++) if (byRank[r].length === 4) bombs.push({ type: 'quad', cards: byRank[r].splice(0) });
  // Đôi thông
  while (takeRun(byRank, 2, 3, bombs, 'pairseq'));
  const sets = () => {
    for (let r = 0; r < 12; r++) {
      if (byRank[r].length === 3) normal.push({ type: 'triple', cards: byRank[r].splice(0) });
      else if (byRank[r].length === 2) normal.push({ type: 'pair', cards: byRank[r].splice(0) });
    }
  };
  if (straightsFirst) { while (takeRun(byRank, 1, 3, normal, 'straight')); sets(); }
  else { sets(); while (takeRun(byRank, 1, 3, normal, 'straight')); }
  for (let r = 0; r < 12; r++) byRank[r].forEach((c) => normal.push({ type: 'single', cards: [c] }));
  normal.sort((a, b) => a.cards[0] - b.cards[0]);
  // Gộp các lá rác liền nhau thành một nhóm "rác" cho gọn
  const merged = [];
  normal.forEach((g) => {
    const last = merged[merged.length - 1];
    if (g.type === 'single' && last && last.type === 'single') last.cards.push(...g.cards);
    else merged.push({ ...g, cards: [...g.cards] });
  });
  const groups = [...merged, ...bombs];
  if (twos.length) groups.push({ type: 'two', cards: twos });
  return { groups, singles: normal.filter((g) => g.type === 'single').length };
}

/** Chia bài thành các bộ: [{type, cards}] (type: straight, pair, triple, single, quad, pairseq, two) */
export function smartGroups(hand, variant = 'best') {
  const a = groupWith(hand, true), b = groupWith(hand, false);
  if (variant === 'straight') return a.groups; // ưu tiên sảnh
  if (variant === 'pair') return b.groups;     // ưu tiên đôi / sám
  return (b.singles < a.singles ? b : a).groups;
}
export const SMART_VARIANT = { smart: 'best', 'smart-straight': 'straight', 'smart-pair': 'pair' };
export const GROUP_LABEL = { straight: 'Sảnh', pair: 'Đôi', triple: 'Sám', single: 'Rác', quad: 'Tứ quý', pairseq: 'Đôi thông', two: 'Heo' };
