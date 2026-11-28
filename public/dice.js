// 🎲 Xúc xắc 3D (CSS 3D): tung lên, lộn vòng, nảy trên bàn rồi dừng đúng mặt số.
// Mặt 1 ở trước, 6 sau, 2 phải, 5 trái, 3 trên, 4 dưới -> góc xoay để đưa mặt v ra trước:
const FACE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

function faceHTML(n) {
  return `<div class="face f${n}">` + Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i + 1) ? 'on' : ''}"></i>`).join('') + '</div>';
}

export function dieEl(v = 1) {
  const w = document.createElement('div');
  w.className = 'die-wrap';
  w.innerHTML = `<div class="die-shadow"></div><div class="die-tilt"><div class="die">${[1, 2, 3, 4, 5, 6].map(faceHTML).join('')}</div></div>`;
  setFace(w, v);
  return w;
}

function rotFor(v, spins = 0) {
  const [rx, ry] = FACE_ROT[v] || [0, 0];
  return `rotateX(${rx + 360 * spins}deg) rotateY(${ry + 360 * spins}deg)`;
}
export function setFace(w, v) { w.querySelector('.die').style.transform = rotFor(v); }

/** Hiện xúc xắc đứng yên */
export function showDice(tray, values) {
  if (tray.dataset.rolling === '1') return;
  const key = values.join(',');
  if (tray.dataset.key === key && tray.children.length) return;
  tray.dataset.key = key;
  tray.innerHTML = '';
  values.forEach((v) => tray.appendChild(dieEl(v)));
}

/** Tung xúc xắc. Trả về Promise khi đã dừng hẳn. */
export function rollDice(tray, values, { onBounce } = {}) {
  tray.innerHTML = '';
  tray.dataset.rolling = '1';
  tray.dataset.key = values.join(',');
  const dur = 1150;
  values.forEach((v, i) => {
    const w = dieEl(v);
    tray.appendChild(w);
    const die = w.querySelector('.die');
    const shadow = w.querySelector('.die-shadow');
    if (!w.animate) return;
    const dir = i % 2 ? 1 : -1;
    const sx = dir * (90 + Math.random() * 60), sy = 160 + Math.random() * 60;
    // Đường bay: ném từ dưới lên, rơi xuống bàn, nảy 2 lần rồi lăn nhẹ vào chỗ
    w.animate([
      { transform: `translate(${sx}px, ${sy}px) scale(1.25)`, offset: 0 },
      { transform: `translate(${sx * 0.5}px, -70px) scale(1.15)`, offset: 0.3 },
      { transform: `translate(${sx * 0.2}px, 0px) scale(1)`, offset: 0.55 },
      { transform: `translate(${sx * 0.1}px, -28px) scale(1.04)`, offset: 0.7 },
      { transform: `translate(${sx * 0.04}px, 0px) scale(1)`, offset: 0.82 },
      { transform: `translate(0px, -7px) scale(1)`, offset: 0.9 },
      { transform: 'translate(0px, 0px) scale(1)', offset: 1 },
    ], { duration: dur, easing: 'linear', fill: 'backwards' });
    const r0 = `rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg) rotateZ(${Math.random() * 180}deg)`;
    die.animate([
      { transform: r0 },
      { transform: `${rotFor(v, 2)} rotateZ(${dir * 40}deg)`, offset: 0.72 },
      { transform: `${rotFor(v, 2)} rotateZ(${dir * 8}deg)`, offset: 0.9 },
      { transform: rotFor(v, 2) },
    ], { duration: dur, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'backwards' });
    shadow.animate([
      { transform: 'scale(.5)', opacity: 0.15 }, { transform: 'scale(.6)', opacity: 0.15, offset: 0.3 },
      { transform: 'scale(1)', opacity: 0.45, offset: 0.55 }, { transform: 'scale(.85)', opacity: 0.3, offset: 0.7 },
      { transform: 'scale(1)', opacity: 0.45 },
    ], { duration: dur, fill: 'backwards' });
  });
  if (onBounce) [0.55, 0.82, 0.95].forEach((k, i) => setTimeout(() => onBounce(i), dur * k));
  return new Promise((res) => setTimeout(() => { tray.dataset.rolling = ''; res(); }, dur + 40));
}
