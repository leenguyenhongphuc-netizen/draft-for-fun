// Hiệu ứng lớn trên màn hình: sét đánh, heo chạy, heo tông nhau, tàu đôi thông, con dấu tứ quý.
// Tất cả là DOM + CSS animation để nhẹ cho điện thoại.

const layer = () => document.getElementById('fx');
const W = () => window.innerWidth;
const H = () => window.innerHeight;

function el(cls, html = '', style = {}) {
  const d = document.createElement('div');
  d.className = cls;
  if (html) d.innerHTML = html;
  Object.assign(d.style, style);
  layer().appendChild(d);
  return d;
}
const later = (ms, fn) => setTimeout(fn, ms);
const kill = (d, ms) => later(ms, () => d.remove());

// ---------- Sét đánh ----------
function boltPath(x0, y0, x1, y1, jag) {
  const pts = [[x0, y0]];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    pts.push([x0 + (x1 - x0) * k + (Math.random() - 0.5) * jag, y0 + (y1 - y0) * k + (Math.random() - 0.5) * jag * 0.3]);
  }
  pts.push([x1, y1]);
  return pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
}

export function lightning(target, bolts = 1) {
  const dark = el('fx-dark');
  kill(dark, 1100);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'fx-bolts');
  svg.setAttribute('viewBox', `0 0 ${W()} ${H()}`);
  for (let b = 0; b < bolts; b++) {
    const x0 = target.x + (Math.random() - 0.5) * W() * 0.7;
    const pts = boltPath(x0, -20, target.x + (Math.random() - 0.5) * 30, target.y, 70);
    for (const [w, c] of [[14, 'rgba(255,230,120,.45)'], [6, '#fff59d'], [2.5, '#ffffff']]) {
      const pl = document.createElementNS(NS, 'polyline');
      pl.setAttribute('points', pts);
      pl.setAttribute('fill', 'none');
      pl.setAttribute('stroke', c);
      pl.setAttribute('stroke-width', w);
      pl.setAttribute('stroke-linejoin', 'round');
      pl.style.animationDelay = b * 0.12 + 's';
      svg.appendChild(pl);
    }
    // nhánh phụ
    const mid = pts.split(' ')[4].split(',').map(Number);
    const br = document.createElementNS(NS, 'polyline');
    br.setAttribute('points', boltPath(mid[0], mid[1], mid[0] + (Math.random() - 0.5) * 160, mid[1] + 80 + Math.random() * 80, 40));
    br.setAttribute('fill', 'none'); br.setAttribute('stroke', '#fff59d'); br.setAttribute('stroke-width', 2);
    br.style.animationDelay = b * 0.12 + 's';
    svg.appendChild(br);
  }
  layer().appendChild(svg);
  kill(svg, 900);
  // Tia lửa tại chỗ bị đánh
  later(120, () => {
    const boom = el('fx-boom', '', { left: target.x + 'px', top: target.y + 'px' });
    kill(boom, 700);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const sp = el('fx-spark', ['⚡', '✨', '💥'][i % 3], { left: target.x + 'px', top: target.y + 'px' });
      sp.style.setProperty('--dx', Math.cos(a) * (60 + Math.random() * 50) + 'px');
      sp.style.setProperty('--dy', Math.sin(a) * (60 + Math.random() * 50) + 'px');
      kill(sp, 900);
    }
  });
}

// Heo bị sét đánh hoá heo quay 🍖
export function roastPig(target) {
  const pig = el('fx-roast', '<span>🐷</span>', { left: target.x + 'px', top: target.y + 'px' });
  later(450, () => { pig.innerHTML = '<span>🍖</span><b>Heo quay!</b>'; pig.classList.add('done'); });
  kill(pig, 2000);
  for (let i = 0; i < 3; i++) {
    const smoke = el('fx-smoke', '💨', { left: target.x + (i - 1) * 22 + 'px', top: target.y + 'px', animationDelay: 0.45 + i * 0.1 + 's' });
    kill(smoke, 1800);
  }
}

// ---------- Heo chạy ngang màn hình ----------
export function pigRun(count = 1, y = H() * 0.42) {
  for (let i = 0; i < count; i++) {
    const rtl = i % 2 === 1;
    const run = el('fx-run' + (rtl ? ' rtl' : ''), '<span class="bob">🐷</span>', { top: y + i * 46 + 'px', animationDelay: i * 0.18 + 's' });
    kill(run, 2200);
    for (let k = 0; k < 6; k++) {
      later(i * 180 + k * 220, () => {
        const r = run.getBoundingClientRect();
        if (!r.width) return;
        const d = el('fx-dust', '💨', { left: (rtl ? r.right : r.left) + 'px', top: r.top + r.height * 0.6 + 'px' });
        if (rtl) d.style.transform = 'scaleX(-1)';
        kill(d, 700);
      });
    }
  }
  const t = el('fx-label pig', 'Ụt ịt! 🐽', { top: y - 60 + 'px' });
  kill(t, 1500);
}

// ---------- Heo đè heo: hai con tông nhau ----------
export function pigBump(center) {
  const y = center.y - 20;
  const a = el('fx-bump left', '<span>🐷</span>', { top: y + 'px' });
  const b = el('fx-bump right', '<span>🐷</span>', { top: y + 'px' });
  kill(a, 1600); kill(b, 1600);
  later(480, () => {
    const pow = el('fx-pow', 'BỐP!', { left: center.x + 'px', top: y + 'px' });
    kill(pow, 1100);
    for (let i = 0; i < 8; i++) {
      const s = el('fx-spark', ['⭐', '💫', '✨'][i % 3], { left: center.x + 'px', top: y + 'px' });
      const ang = (i / 8) * Math.PI * 2;
      s.style.setProperty('--dx', Math.cos(ang) * 80 + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * 60 + 'px');
      kill(s, 900);
    }
  });
}

// ---------- Đôi thông: đoàn tàu chở bài ----------
export function train(pairs = 3) {
  const cars = Array.from({ length: pairs }, () => '<i>🃏🃏</i>').join('');
  const tr = el('fx-train', `<span class="engine">🚂</span>${cars}<span class="puff">💨</span>`, { top: H() * 0.36 + 'px' });
  kill(tr, 2600);
  const t = el('fx-label train', `${pairs} ĐÔI THÔNG! 🚂`, { top: H() * 0.28 + 'px' });
  kill(t, 1800);
}

// ---------- Tứ quý: 4 lá đập xuống + con dấu ----------
export function quadSlam(center, cardEls = []) {
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  corners.forEach(([sx, sy], i) => {
    const c = el('fx-slam-card', cardEls[i] ? '' : '🂠', { left: center.x + 'px', top: center.y + 'px' });
    if (cardEls[i]) c.appendChild(cardEls[i]);
    c.style.setProperty('--sx', sx * W() * 0.6 + 'px');
    c.style.setProperty('--sy', sy * H() * 0.5 + 'px');
    c.style.setProperty('--r', (sx * sy * 25) + 'deg');
    c.style.animationDelay = i * 0.12 + 's';
    kill(c, 1500);
  });
  later(560, () => {
    const ring = el('fx-ring', '', { left: center.x + 'px', top: center.y + 'px' });
    const ring2 = el('fx-ring', '', { left: center.x + 'px', top: center.y + 'px', animationDelay: '0.12s' });
    kill(ring, 900); kill(ring2, 1000);
    const st = el('fx-stamp', 'TỨ QUÝ!', { left: center.x + 'px', top: center.y - 90 + 'px' });
    kill(st, 1700);
  });
}

// ---------- Chặt chồng: chữ lửa ----------
export function chainText(n) {
  const t = el('fx-chain', `CHẶT CHỒNG ×${n}! 🔥`);
  kill(t, 1900);
  for (let i = 0; i < 14; i++) {
    const f = el('fx-fire', '🔥', { left: Math.random() * W() + 'px', animationDelay: Math.random() * 0.4 + 's' });
    kill(f, 1800);
  }
}

// ---------- Hạt bung ra tại một điểm (dùng cho cảnh không có 3D) ----------
export function burstAt(pt, emojis = ['✨', '⭐'], n = 12) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const r = 70 + Math.random() * 90;
    const sp = el('fx-spark big', emojis[i % emojis.length], { left: pt.x + 'px', top: pt.y + 'px' });
    sp.style.setProperty('--dx', Math.cos(a) * r + 'px');
    sp.style.setProperty('--dy', Math.sin(a) * r - 40 + 'px');
    kill(sp, 950);
  }
}
