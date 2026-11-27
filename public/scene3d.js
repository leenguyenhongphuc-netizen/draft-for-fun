// Phòng chơi 3D dễ thương — Three.js, low-poly, nhẹ cho điện thoại.
import * as THREE from 'three';

export const THEMES = {
  candy: {
    label: '🍬 Kẹo Hồng',
    wall: 0xffd9e8, wall2: 0xffe8f1, floor: 0xf3c9a8, rug: 0xfff3f8, rug2: 0xffb3cf,
    felt: 0x8fdcc2, rim: 0xffffff, wood: 0xe8a87c, sky: 0xbfe6ff, skyGlow: 0xfff4c2,
    ambient: 0xfff0f5, ambientI: 0.75, sunI: 1.0, bg: 0xffe1ee,
    particles: ['💗', '💕', '🍬', '⭐', '🎀'], balloons: [0xff8fb8, 0xffd36e, 0x8fd3ff, 0xc7a6ff],
    posters: ['🍓', '🧁', '🐰'], bulbs: [0xffb3d1, 0xfff1a6, 0xa6e3ff],
    win: 'day', logo: '💗', toy: '🐰', sleeper: '🐱', flower: '🌸', pot: 0xffffff, leaf: 0x7ccf86, lampI: 14,
  },
  garden: {
    label: '🌿 Vườn Xanh',
    wall: 0xd7f2d9, wall2: 0xeaf8e4, floor: 0xe6d3a3, rug: 0xfffbe8, rug2: 0xa9dba0,
    felt: 0x6cc59b, rim: 0xfff7e0, wood: 0xc99566, sky: 0x9fdcff, skyGlow: 0xffffff,
    ambient: 0xf3fff0, ambientI: 0.8, sunI: 1.1, bg: 0xd9f5e0,
    particles: ['🌸', '🍃', '🦋', '🌼', '🍀'], balloons: [0xa8e6a1, 0xfff07a, 0xffb5a7, 0x9ad8ff],
    posters: ['🌻', '🐝', '🍄'], bulbs: [0xfff3b0, 0xc8f7c5, 0xffd6a5],
    win: 'day', logo: '🌼', toy: '🐸', sleeper: '🐶', flower: '🌼', pot: 0xffffff, leaf: 0x7ccf86, lampI: 14,
  },
  night: {
    label: '🌙 Đêm Sao',
    wall: 0x40407a, wall2: 0x4b4a8a, floor: 0x5d4b82, rug: 0x6d63b0, rug2: 0xffd86b,
    felt: 0x5a7de8, rim: 0xffe9a8, wood: 0x8a6bb0, sky: 0x1c1f4a, skyGlow: 0xfff2b3,
    ambient: 0xb7b3ff, ambientI: 0.45, sunI: 0.35, bg: 0x2b2a55,
    particles: ['⭐', '✨', '🌙', '💫'], balloons: [0xffd86b, 0xff9ec7, 0x9fe8ff, 0xc9a7ff],
    posters: ['🪐', '🌙', '🦉'], bulbs: [0xffe27a, 0xff9ec7, 0x9fe8ff],
    win: 'night', logo: '⭐', toy: '🐧', sleeper: '🐱', flower: null, pot: 0xffd86b, leaf: 0x6fc9a3, lampI: 26, dark: true,
  },
  tet: {
    label: '🧧 Tết Sum Vầy',
    wall: 0xffd2c2, wall2: 0xffe6d6, floor: 0xd9a066, rug: 0xfff1d0, rug2: 0xe53935,
    felt: 0xd84343, rim: 0xffd54f, wood: 0xb5651d, sky: 0xbfe6ff, skyGlow: 0xfff4c2,
    ambient: 0xfff3e0, ambientI: 0.8, sunI: 1.0, bg: 0xffdcc8,
    particles: ['🧧', '🌼', '🏮', '✨', '💰'], balloons: [0xe53935, 0xffd54f, 0xff8a65, 0xffca28],
    posters: ['🧧', '🐉', '🍊'], bulbs: [0xff5252, 0xffd740, 0xffab40],
    win: 'day', logo: '🧧', toy: '🐯', sleeper: '🐱', flower: '🌼', pot: 0xe53935, leaf: 0x6aa84f, lampI: 16, extra: 'tet',
  },
  ocean: {
    label: '🐚 Biển Xanh',
    wall: 0xcdeffd, wall2: 0xe3f7ff, floor: 0xf2deb0, rug: 0xfffaf0, rug2: 0x4fc3f7,
    felt: 0x4db6ac, rim: 0xffffff, wood: 0xd7b98a, sky: 0x4fc3f7, skyGlow: 0xfff59d,
    ambient: 0xf0fbff, ambientI: 0.85, sunI: 1.05, bg: 0xcfefff,
    particles: ['🫧', '🐠', '🐚', '⭐', '🫧'], balloons: [0x4fc3f7, 0xfff176, 0xff8a80, 0x80deea],
    posters: ['🐳', '🐙', '🦀'], bulbs: [0x80deea, 0xfff59d, 0xffffff],
    win: 'sea', logo: '🐚', toy: '🐧', sleeper: '🐶', flower: null, pot: 0xffffff, leaf: 0x66bb6a, lampI: 14, extra: 'ocean',
  },
  winter: {
    label: '❄️ Mùa Đông',
    wall: 0xdde7f7, wall2: 0xeef3fb, floor: 0xc9a27e, rug: 0xffffff, rug2: 0xe57373,
    felt: 0x5c9ead, rim: 0xffffff, wood: 0xa1785c, sky: 0x9fb8d9, skyGlow: 0xffffff,
    ambient: 0xf5f9ff, ambientI: 0.8, sunI: 0.8, bg: 0xdfe8f5,
    particles: ['❄️', '⛄', '✨', '❄️', '🎁'], balloons: [0xe57373, 0xffffff, 0x81c784, 0x90caf9],
    posters: ['⛄', '🦌', '🎄'], bulbs: [0xff5252, 0x69f0ae, 0xffd740],
    win: 'snow', logo: '❄️', toy: '🐻', sleeper: '🐱', flower: null, pot: 0xe57373, leaf: 0x2e7d32, lampI: 20, extra: 'winter',
  },
  sakura: {
    label: '🌸 Anh Đào',
    wall: 0xf6e1f5, wall2: 0xfbeefa, floor: 0xe8c9a8, rug: 0xfff7fb, rug2: 0xf48fb1,
    felt: 0xb39ddb, rim: 0xffffff, wood: 0xc79a7a, sky: 0xd1c4e9, skyGlow: 0xfff9c4,
    ambient: 0xfff5fb, ambientI: 0.8, sunI: 1.0, bg: 0xf8e1f3,
    particles: ['🌸', '🌸', '💮', '🦋', '💕'], balloons: [0xf48fb1, 0xce93d8, 0xfff59d, 0xb2ebf2],
    posters: ['🍡', '🎐', '🐰'], bulbs: [0xf8bbd0, 0xe1bee7, 0xfff9c4],
    win: 'day', logo: '🌸', toy: '🐰', sleeper: '🐱', flower: '🌸', pot: 0xffffff, leaf: 0x81c784, lampI: 14, extra: 'sakura',
  },
};

// Hình dáng nhân vật theo avatar
const CHARS = {
  '🐱': { color: 0xffc38a, ears: 'cone', earColor: 0xffa860 },
  '🐶': { color: 0xe3b98f, ears: 'floppy', earColor: 0x9c6b47 },
  '🐰': { color: 0xffffff, ears: 'long', earColor: 0xffc7d9 },
  '🐼': { color: 0xffffff, ears: 'round', earColor: 0x333333, patches: 0x333333 },
  '🦊': { color: 0xff9a52, ears: 'cone', earColor: 0xff7a2e, belly: 0xffffff },
  '🐸': { color: 0x8fdc7a, ears: 'frog', earColor: 0x8fdc7a },
  '🐷': { color: 0xffb8cc, ears: 'cone', earColor: 0xff9bb8, snout: 0xff9bb8 },
  '🐹': { color: 0xf7d29b, ears: 'round', earColor: 0xf0b874, belly: 0xffffff },
  '🐨': { color: 0xbfc3cc, ears: 'big', earColor: 0xaab0bb, snout: 0x555555 },
  '🐯': { color: 0xffb347, ears: 'round', earColor: 0xff9a1f, belly: 0xffffff },
  '🐻': { color: 0xc79566, ears: 'round', earColor: 0xa87445, snout: 0xf2d2b0 },
  '🐧': { color: 0x4a5a8c, ears: 'none', earColor: 0x4a5a8c, belly: 0xffffff, beak: 0xffb347 },
  '💕': { color: 0xffa6c9, ears: 'hearts', earColor: 0xff6f9f, topper: '💕' },
  '🌷': { color: 0xff7eb0, ears: 'petals', earColor: 0xff5c93, leaves: 0x6cc56b },
};

const emojiTexCache = new Map();
function emojiTexture(emoji, size = 128) {
  const key = emoji + size;
  if (emojiTexCache.has(key)) return emojiTexCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.font = `${size * 0.8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  emojiTexCache.set(key, t);
  return t;
}

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });

function roundedBox(w, h, d, r = 0.08, color = 0xffffff) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r); shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d); shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelSize: r * 0.6, bevelThickness: r * 0.6, bevelSegments: 3 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(g, mat(color));
  m.castShadow = m.receiveShadow = true;
  return m;
}

function makeCharacter(emoji) {
  const def = CHARS[emoji] || CHARS['🐱'];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), mat(def.color, { roughness: 0.6 }));
  body.scale.set(1, 0.92, 0.95);
  body.castShadow = true;
  g.add(body);
  if (def.belly) {
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), mat(def.belly));
    belly.position.set(0, -0.12, 0.3); belly.scale.set(1, 0.9, 0.5);
    g.add(belly);
  }
  const black = mat(0x2b2233, { roughness: 0.3 });
  const white = mat(0xffffff, { roughness: 0.2 });
  for (const sx of [-1, 1]) {
    if (def.patches) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(def.patches));
      p.position.set(sx * 0.19, 0.12, 0.46); p.scale.set(1, 1.2, 0.5);
      g.add(p);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), black);
    eye.position.set(sx * 0.19, 0.12, 0.5);
    g.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), white);
    shine.position.set(sx * 0.19 + 0.025, 0.15, 0.565);
    g.add(shine);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0xff8fb0, transparent: true, opacity: 0.7 }));
    blush.position.set(sx * 0.31, -0.02, 0.45); blush.lookAt(sx * 1.2, -0.02, 2);
    g.add(blush);
    // Tai
    const em = mat(def.earColor);
    let ear;
    if (def.ears === 'cone') { ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 12), em); ear.position.set(sx * 0.3, 0.52, 0); ear.rotation.z = -sx * 0.35; }
    if (def.ears === 'long') { ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 6, 12), em); ear.position.set(sx * 0.18, 0.75, 0); ear.rotation.z = -sx * 0.15; }
    if (def.ears === 'round') { ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), em); ear.position.set(sx * 0.36, 0.42, 0); }
    if (def.ears === 'big') { ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), em); ear.position.set(sx * 0.45, 0.36, 0); ear.scale.z = 0.5; }
    if (def.ears === 'floppy') { ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25, 6, 12), em); ear.position.set(sx * 0.5, 0.15, 0); ear.rotation.z = sx * 0.3; }
    if (def.ears === 'hearts') { ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), em); ear.position.set(sx * 0.16, 0.58, 0); ear.scale.set(1, 0.9, 0.6); }
    if (def.ears === 'petals') { ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 3), em); ear.position.set(sx * 0.27, 0.5, 0); ear.rotation.z = -sx * 0.25; }
    if (def.ears === 'frog') { ear = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), em); ear.position.set(sx * 0.2, 0.42, 0.25); }
    if (ear) { ear.castShadow = true; g.add(ear); }
  }
  if (def.snout) {
    const sn = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat(def.snout));
    sn.position.set(0, -0.02, 0.52); sn.scale.set(1.2, 0.8, 0.6);
    g.add(sn);
  }
  if (def.beak) {
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), mat(def.beak));
    bk.position.set(0, 0.0, 0.58); bk.rotation.x = Math.PI / 2;
    g.add(bk);
  }
  if (def.ears === 'petals') { // cánh hoa giữa + lá
    const mid = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 3), mat(def.earColor));
    mid.position.set(0, 0.56, -0.08); g.add(mid);
    for (const sx of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat(def.leaves));
      leaf.position.set(sx * 0.58, -0.25, 0.05); leaf.scale.set(0.5, 1.2, 0.35); leaf.rotation.z = sx * 0.6;
      g.add(leaf);
    }
  }
  if (def.topper) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(def.topper), transparent: true }));
    sp.position.set(0, 0.85, 0); sp.scale.setScalar(0.42);
    g.add(sp);
  }
  // Miệng cười
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 16, Math.PI), black);
  smile.position.set(0, def.snout ? -0.13 : -0.02, 0.53); smile.rotation.z = Math.PI;
  g.add(smile);
  // Tay nhỏ
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(def.color));
    arm.position.set(sx * 0.5, -0.2, 0.25);
    g.add(arm);
  }
  return g;
}

export function createScene(canvas) {
  // Điện thoại: giảm độ phân giải, bóng đổ và chạy 30 khung/giây cho mượt, đỡ nóng máy
  const MOBILE = matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, alpha: false, powerPreference: MOBILE ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const clock = new THREE.Clock();

  let themeKey = 'candy';
  let mode = 'lobby';
  let room = null; // group chứa đồ trang trí, dựng lại khi đổi theme
  const animated = []; // {obj, fn(t)}
  const chars = [null, null, null, null];
  const charState = [{}, {}, {}, {}];
  let mouseX = 0, mouseY = 0;

  const ambient = new THREE.HemisphereLight(0xffffff, 0xffe0ee, 0.7);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(4, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(MOBILE ? 512 : 1024, MOBILE ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const lamp = new THREE.PointLight(0xfff1d6, 18, 12, 2);
  lamp.position.set(0, 4.2, 0);
  scene.add(lamp);

  // Vị trí ghế theo góc nhìn của mình: 0 = mình (gần camera), 1 = phải, 2 = đối diện, 3 = trái
  const SEAT_POS = [
    new THREE.Vector3(0, 0, 2.7), new THREE.Vector3(2.7, 0, 0),
    new THREE.Vector3(0, 0, -2.7), new THREE.Vector3(-2.7, 0, 0),
  ];

  function build() {
    if (room) {
      scene.remove(room);
      room.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    animated.length = 0;
    const T = THEMES[themeKey];
    room = new THREE.Group();
    scene.add(room);
    scene.background = new THREE.Color(T.bg);
    scene.fog = new THREE.Fog(T.bg, 16, 30);
    ambient.color.set(T.ambient); ambient.intensity = T.ambientI;
    sun.intensity = T.sunI;
    lamp.intensity = baseLamp = T.lampI || 14;

    // Sàn + tường
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), mat(T.floor));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    room.add(floor);
    // Vân gỗ sàn
    for (let i = -7; i <= 7; i += 1.2) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.05 }));
      line.rotation.x = -Math.PI / 2; line.position.set(i, 0.002, 0);
      room.add(line);
    }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), mat(T.wall));
    back.position.set(0, 4.5, -7); back.receiveShadow = true;
    room.add(back);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), mat(T.wall2));
      side.position.set(sx * 7, 4.5, 0); side.rotation.y = -sx * Math.PI / 2; side.receiveShadow = true;
      room.add(side);
      // Chân tường
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 16), mat(0xffffff));
      base.position.set(sx * 6.95, 0.17, 0);
      room.add(base);
    }
    const baseB = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 0.1), mat(0xffffff));
    baseB.position.set(0, 0.17, -6.95);
    room.add(baseB);
    // Họa tiết chấm bi trên tường sau
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: T.dark ? 0.12 : 0.45 });
    for (let x = -7; x <= 7; x += 1) for (let y = 1; y <= 8; y += 1) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), dotMat);
      d.position.set(x + (y % 2) * 0.5, y, -6.98);
      room.add(d);
    }

    // Cửa sổ
    const win = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ color: T.sky }));
    win.add(glass);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(T.win === 'night' ? 0.32 : 0.42, 32), new THREE.MeshBasicMaterial({ color: T.skyGlow }));
    glow.position.set(0.8, 0.5, 0.01);
    win.add(glow);
    if (T.win === 'sea') {
      // Biển: nước, sóng, cá bơi
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), new THREE.MeshBasicMaterial({ color: 0x1e88e5 }));
      sea.position.set(0, -0.65, 0.012); win.add(sea);
      for (let i = 0; i < 3; i++) {
        const wave = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.05), new THREE.MeshBasicMaterial({ color: 0xe3f2fd }));
        wave.position.set(0, -0.25 - i * 0.25, 0.014); win.add(wave);
        animated.push({ obj: wave, fn: (t) => { wave.position.x = Math.sin(t * 1.2 + i) * 0.08; } });
      }
      ['🐠', '🐟', '⛵'].forEach((e, i) => {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), new THREE.MeshBasicMaterial({ map: emojiTexture(e), transparent: true }));
        f.position.set(0, i === 2 ? -0.08 : -0.55 - i * 0.2, 0.02); win.add(f);
        animated.push({ obj: f, fn: (t) => { f.position.x = (((t * (0.15 + i * 0.05) + i) % 3) - 1.5); } });
      });
    } else if (T.win === 'snow') {
      for (let i = 0; i < 30; i++) {
        const fl = new THREE.Mesh(new THREE.CircleGeometry(0.02 + Math.random() * 0.025, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const x0 = (Math.random() - 0.5) * 3, sp = 0.2 + Math.random() * 0.3, ph = Math.random() * 2.2;
        win.add(fl);
        animated.push({ obj: fl, fn: (t) => { fl.position.set(x0 + Math.sin(t + i) * 0.08, 1.05 - ((t * sp + ph) % 2.15), 0.015); } });
      }
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      ground.position.set(0, -0.93, 0.012); win.add(ground);
    } else if (T.win === 'night') {
      const bite = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), new THREE.MeshBasicMaterial({ color: T.sky }));
      bite.position.set(0.95, 0.6, 0.02);
      win.add(bite);
      for (let i = 0; i < 25; i++) {
        const st = new THREE.Mesh(new THREE.CircleGeometry(0.02 + Math.random() * 0.025, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        st.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, 0.01);
        win.add(st);
        animated.push({ obj: st, fn: (t) => { st.material.opacity = 0.5 + 0.5 * Math.sin(t * 3 + i); st.material.transparent = true; } });
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const cloud = new THREE.Group();
        for (let j = 0; j < 3; j++) {
          const c = new THREE.Mesh(new THREE.CircleGeometry(0.18 + j * 0.03, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          c.position.set(j * 0.22, (j === 1 ? 0.08 : 0), 0.015);
          cloud.add(c);
        }
        cloud.position.set(-1.2 + i * 0.9, -0.4 + i * 0.3, 0);
        win.add(cloud);
        const sx = cloud.position.x;
        animated.push({ obj: cloud, fn: (t) => { cloud.position.x = ((sx + t * 0.08 + 1.6) % 3.0) - 1.6; } });
      }
    }
    const frameM = mat(0xffffff);
    const fh = new THREE.BoxGeometry(3.5, 0.15, 0.15), fv = new THREE.BoxGeometry(0.15, 2.5, 0.15);
    for (const y of [-1.15, 1.15, 0]) { const b = new THREE.Mesh(fh, frameM); b.position.y = y; win.add(b); }
    for (const x of [-1.68, 1.68, 0]) { const b = new THREE.Mesh(fv, frameM); b.position.x = x; win.add(b); }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.45), frameM);
    sill.position.set(0, -1.25, 0.2);
    win.add(sill);
    // Rèm cửa
    for (const sx of [-1, 1]) {
      const cur = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.8, 12, 1, true), mat(T.rug2, { side: THREE.DoubleSide }));
      cur.position.set(sx * 2.0, -0.1, 0.25);
      win.add(cur);
    }
    win.position.set(0, 4.4, -6.97);
    room.add(win);
    // Chậu cây nhỏ trên bệ cửa
    for (const x of [-1.2, 1.2]) room.add(plant(x, 3.15, -6.7, 0.35, T));

    // Thảm tròn
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.4, 48), mat(T.rug));
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01; rug.receiveShadow = true;
    room.add(rug);
    const rugRing = new THREE.Mesh(new THREE.RingGeometry(3.9, 4.15, 48), mat(T.rug2));
    rugRing.rotation.x = -Math.PI / 2; rugRing.position.y = 0.015;
    room.add(rugRing);

    // Bàn tròn
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.18, 48), mat(T.wood));
    top.position.y = 1.0; top.castShadow = top.receiveShadow = true;
    table.add(top);
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.02, 48), mat(T.felt, { roughness: 0.95 }));
    felt.position.y = 1.1; felt.receiveShadow = true;
    table.add(felt);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.09, 12, 48), mat(T.rim));
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.1; rim.castShadow = true;
    table.add(rim);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.95, 16), mat(T.wood));
    leg.position.y = 0.5; leg.castShadow = true;
    table.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.1, 24), mat(T.wood));
    foot.position.y = 0.05;
    table.add(foot);
    // Trái tim / ngôi sao in giữa bàn
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ map: emojiTexture(T.logo, 256), transparent: true, opacity: 0.35 }));
    logo.rotation.x = -Math.PI / 2; logo.position.y = 1.115;
    table.add(logo);
    room.add(table);

    // Ghế
    SEAT_POS.forEach((p, i) => {
      const chair = new THREE.Group();
      const seat = roundedBox(1.1, 0.18, 1.0, 0.1, T.wood);
      seat.position.y = 0.6;
      chair.add(seat);
      const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12), mat(T.balloons[i % T.balloons.length]));
      cushion.scale.set(1, 0.25, 0.9); cushion.position.y = 0.72; cushion.castShadow = true;
      chair.add(cushion);
      const backrest = roundedBox(1.1, 0.14, 0.9, 0.12, T.wood);
      backrest.rotation.x = Math.PI / 2; backrest.position.set(0, 1.15, 0.5);
      chair.add(backrest);
      for (const [lx, lz] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), mat(T.wood));
        l.position.set(lx, 0.27, lz);
        chair.add(l);
      }
      chair.position.copy(p).multiplyScalar(1.12);
      chair.lookAt(0, 0, 0);
      chair.rotateY(Math.PI);
      room.add(chair);
    });

    // Kệ sách bên tường trái
    const shelf = new THREE.Group();
    const bookColors = [0xff8fb8, 0x8fd3ff, 0xffd36e, 0xa8e6a1, 0xc7a6ff, 0xffb38a];
    for (let row = 0; row < 3; row++) {
      const board = roundedBox(2.4, 0.08, 0.5, 0.03, 0xffffff);
      board.position.y = 1.4 + row * 0.85;
      shelf.add(board);
      let x = -1.0;
      while (x < 1.0) {
        const w = 0.12 + Math.random() * 0.1, h = 0.45 + Math.random() * 0.25;
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.36), mat(bookColors[Math.floor(Math.random() * bookColors.length)]));
        b.position.set(x + w / 2, board.position.y + 0.05 + h / 2, 0);
        b.rotation.z = Math.random() < 0.15 ? 0.2 : 0;
        b.castShadow = true;
        shelf.add(b);
        x += w + 0.02;
        if (Math.random() < 0.12) x += 0.25;
      }
    }
    const shelfToy = makeCharacter(T.toy);
    shelfToy.scale.setScalar(0.35);
    shelfToy.position.set(0.85, 3.37, 0);
    shelf.add(shelfToy);
    shelf.position.set(-6.7, 0, -3.2);
    shelf.rotation.y = Math.PI / 2;
    room.add(shelf);

    // Tranh treo tường
    T.posters.forEach((e, i) => {
      const fr = roundedBox(1.0, 0.06, 1.2, 0.08, [0xffffff, T.rug2, 0xfff1a6][i]);
      fr.rotation.x = Math.PI / 2;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: emojiTexture(e, 256), transparent: true }));
      pic.position.set(0, 0, 0.12);
      const g = new THREE.Group();
      g.add(fr, pic);
      g.position.set(6.95, 4.0 + (i % 2) * 0.9, -3 + i * 1.6);
      g.rotation.y = -Math.PI / 2;
      g.rotation.z = (i - 1) * 0.06;
      room.add(g);
    });
    // Tranh trên tường sau
    [-4.8, 4.8].forEach((x, i) => {
      const g = new THREE.Group();
      const fr = roundedBox(1.3, 0.06, 1.0, 0.08, 0xffffff);
      fr.rotation.x = Math.PI / 2;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: emojiTexture(['🃏', '🐷'][i], 256), transparent: true }));
      pic.position.z = 0.12;
      g.add(fr, pic);
      g.position.set(x, 4.6, -6.94);
      room.add(g);
    });

    // Cây cảnh lớn ở góc
    room.add(plant(5.8, 0, -5.8, 1.1, T));
    room.add(plant(-5.9, 0, 3.5, 0.9, T));
    room.add(plant(5.9, 0, 3.0, 0.8, T));

    // Đèn treo trên bàn
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.6, 6), mat(0x555555));
    cord.position.set(0, 7.2, 0);
    room.add(cord);
    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(T.rug2, { side: THREE.DoubleSide }));
    shade.position.set(0, 5.35, 0);
    room.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d5 }));
    bulb.position.set(0, 5.3, 0);
    room.add(bulb);

    // Dây đèn nháy trên tường sau
    const bulbs = [];
    for (let i = 0; i <= 28; i++) {
      const x = -6.8 + i * (13.6 / 28);
      const y = 7.6 - Math.sin((i / 28) * Math.PI * 3) ** 2 * 0.6;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: T.bulbs[i % T.bulbs.length] }));
      b.position.set(x, y, -6.85);
      room.add(b);
      bulbs.push(b);
    }
    animated.push({ obj: null, fn: (t) => bulbs.forEach((b, i) => b.scale.setScalar(0.8 + 0.35 * Math.max(0, Math.sin(t * 2.5 + i * 0.9)))) });

    // Bóng bay
    T.balloons.forEach((c, i) => {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 18), mat(c, { roughness: 0.25, metalness: 0.05 }));
      ball.scale.y = 1.15; ball.castShadow = true;
      g.add(ball);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 8), mat(c));
      knot.position.y = -0.46; knot.rotation.x = Math.PI;
      g.add(knot);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2.2, 4), mat(0xffffff));
      str.position.y = -1.55;
      g.add(str);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
      hl.position.set(0.14, 0.18, 0.28);
      g.add(hl);
      const corner = i < 2 ? -1 : 1;
      const bx = corner * (5.2 + (i % 2) * 0.6), bz = -5.6 + (i % 2) * 0.8, by = 3.0 + (i % 2) * 0.5;
      g.position.set(bx, by, bz);
      room.add(g);
      animated.push({ obj: g, fn: (t) => { g.position.y = by + Math.sin(t * 0.9 + i) * 0.15; g.rotation.z = Math.sin(t * 0.7 + i) * 0.08; } });
    });

    // Gối & mèo ngủ ở góc
    const pillow = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.25, 24), mat(T.balloons[1]));
    pillow.position.set(-5.2, 0.13, -5.2); pillow.castShadow = true;
    room.add(pillow);
    const sleeper = makeCharacter(T.sleeper);
    sleeper.scale.set(0.7, 0.55, 0.7);
    sleeper.position.set(-5.2, 0.55, -5.2);
    sleeper.rotation.y = 0.6;
    room.add(sleeper);
    animated.push({ obj: sleeper, fn: (t) => { sleeper.scale.y = 0.55 + Math.sin(t * 1.6) * 0.03; } });
    const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('💤'), transparent: true }));
    zzz.scale.setScalar(0.5);
    room.add(zzz);
    animated.push({ obj: zzz, fn: (t) => { const k = (t * 0.4) % 1; zzz.position.set(-5.0 + k * 0.4, 1.1 + k * 0.8, -5.0); zzz.material.opacity = 1 - k; } });

    // Đồ trang trí riêng của từng phòng
    if (T.extra) buildExtra(T);

    // Hạt bay lơ lửng (emoji)
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(T.particles[i % T.particles.length]), transparent: true, opacity: 0.85, depthWrite: false }));
      const sc = 0.25 + Math.random() * 0.25;
      s.scale.setScalar(sc);
      const x0 = (Math.random() - 0.5) * 12, z0 = -6 + Math.random() * 9, sp = 0.15 + Math.random() * 0.25, ph = Math.random() * 10;
      room.add(s);
      animated.push({ obj: s, fn: (t) => {
        const y = ((t * sp + ph) % 7.5);
        s.position.set(x0 + Math.sin(t * 0.6 + ph) * 0.4, y + 0.3, z0);
        s.material.opacity = Math.min(1, y, 7.5 - y) * 0.85;
      } });
    }
  }

  function textTexture(text, color, bg, w = 1024, h = 160) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${h * 0.55}px "Baloo 2", system-ui, sans-serif`;
    ctx.fillText(text, w / 2, h / 2 + 4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function sprite(emoji, x, y, z, size) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true }));
    sp.position.set(x, y, z); sp.scale.setScalar(size);
    room.add(sp);
    return sp;
  }

  function tree(x, z, trunkColor, blossom, emojis, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 8), mat(trunkColor));
    trunk.position.y = 1.1; trunk.castShadow = true; g.add(trunk);
    for (const [bx, by, br] of [[-0.5, 2.0, 0.6], [0.5, 2.2, 0.55], [0, 2.7, 0.7], [-0.2, 2.3, 0.5], [0.3, 2.9, 0.45]]) {
      if (blossom) { const b = new THREE.Mesh(new THREE.SphereGeometry(br, 14, 10), mat(blossom)); b.position.set(bx, by, 0); b.castShadow = true; g.add(b); }
    }
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.5, 16), mat(0x8d6e63));
    pot.position.y = 0.25; g.add(pot);
    g.position.set(x, 0, z); g.scale.setScalar(scale);
    room.add(g);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.9;
      sprite(emojis[i % emojis.length], x + Math.cos(a) * r * scale, (1.9 + Math.random() * 1.3) * scale, z + Math.sin(a) * r * 0.6 * scale, 0.28 * scale);
    }
    return g;
  }

  function buildExtra(T) {
    if (T.extra === 'tet') {
      // Câu chúc trên tường
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.8), new THREE.MeshBasicMaterial({ map: textTexture('🧧 Chúc Mừng Năm Mới 🧧', '#ffd54f', '#c62828') }));
      banner.position.set(0, 6.45, -6.9); room.add(banner);
      // Đèn lồng đỏ đung đưa
      [[-3.2, -3], [3.2, -3], [-4.5, 1.5], [4.5, 1.5]].forEach(([x, z], i) => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshStandardMaterial({ color: 0xe53935, emissive: 0x8b0000, emissiveIntensity: 0.5 }));
        body.scale.y = 0.85; g.add(body);
        for (const y of [0.36, -0.36]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12), mat(0xffd54f)); cap.position.y = y; g.add(cap); }
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.4, 6), mat(0xffd54f)); tassel.position.y = -0.62; g.add(tassel);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2, 4), mat(0x5d4037)); rope.position.y = 1.4; g.add(rope);
        g.position.set(x, 5.6, z); room.add(g);
        animated.push({ obj: g, fn: (t) => { g.rotation.z = Math.sin(t * 1.2 + i) * 0.06; } });
      });
      // Cây mai vàng
      tree(-5.4, -1.2, 0x5d4037, null, ['🌼', '🌼', '🌼', '🧧'], 1.1);
      sprite('🍊', 5.0, 0.4, 2.4, 0.6); sprite('🍉', 5.6, 0.35, 1.8, 0.6);
    }
    if (T.extra === 'ocean') {
      // Phao tròn trên tường
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.16, 12, 24), mat(0xffffff));
      buoy.position.set(-6.9, 4.2, 1.5); buoy.rotation.y = Math.PI / 2; room.add(buoy);
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.17, 12, 6, Math.PI / 4), mat(0xe53935));
        seg.position.copy(buoy.position); seg.rotation.y = Math.PI / 2; seg.rotation.x = (i * Math.PI) / 2; room.add(seg);
      }
      // Rong biển đung đưa
      [[-5.6, 4.6], [5.5, -2.5], [-4.6, -5.8]].forEach(([x, z], i) => {
        for (let k = 0; k < 3; k++) {
          const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.1 + k * 0.3, 4, 8), mat(0x43a047));
          w.position.set(x + k * 0.18, 0.7 + k * 0.15, z); room.add(w);
          animated.push({ obj: w, fn: (t) => { w.rotation.z = Math.sin(t * 1.4 + i + k) * 0.25; } });
        }
      });
      sprite('🐚', 3.5, 0.2, 3.8, 0.45); sprite('⭐', -3.2, 0.15, 4.0, 0.4); sprite('🦀', 4.8, 0.25, 0.5, 0.5);
      sprite('🏖️', 6.0, 0.45, -4.5, 0.8);
    }
    if (T.extra === 'winter') {
      // Người tuyết
      const sm = new THREE.Group();
      [[0.55, 0.5], [0.4, 1.3], [0.28, 1.9]].forEach(([r, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(0xffffff)); b.position.y = y; b.castShadow = true; sm.add(b); });
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 8), mat(0xff8a00)); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.9, 0.38); sm.add(nose);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0x222222)); e.position.set(sx * 0.1, 2.0, 0.25); sm.add(e); }
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 14), mat(0x333333)); hat.position.y = 2.25; sm.add(hat);
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 16), mat(0xe53935)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.62; sm.add(scarf);
      sm.position.set(-5.2, 0, 1.4); sm.rotation.y = 0.8; room.add(sm);
      // Cây thông Noel
      const xt = new THREE.Group();
      [[1.0, 1.2, 0.9], [0.8, 1.0, 1.6], [0.55, 0.8, 2.2]].forEach(([r, h, y]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), mat(0x2e7d32)); c.position.y = y; c.castShadow = true; xt.add(c); });
      const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 12), mat(0x8d6e63)); pot2.position.y = 0.25; xt.add(pot2);
      const balls = [0xff5252, 0xffd740, 0x40c4ff, 0xffffff];
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4, y = 0.8 + (i / 12) * 1.6, r = 0.95 - (i / 12) * 0.6;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: balls[i % 4] }));
        b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); xt.add(b);
      }
      xt.position.set(5.3, 0, -3.6); room.add(xt);
      sprite('⭐', 5.3, 2.85, -3.6, 0.5);
      sprite('🎁', 4.5, 0.3, -2.6, 0.55); sprite('🎁', 6.0, 0.3, -2.8, 0.45);
    }
    if (T.extra === 'sakura') {
      tree(5.3, -4.0, 0x6d4c41, 0xf8bbd0, ['🌸', '🌸', '💮'], 1.15);
      tree(-5.6, 0.6, 0x6d4c41, 0xf3a6c8, ['🌸', '🌸'], 0.85);
      sprite('🎐', -3.5, 6.0, -6.5, 0.6); sprite('🎐', 3.5, 6.0, -6.5, 0.6);
      sprite('🍡', 4.6, 0.3, 2.6, 0.5);
    }
  }

  function plant(x, y, z, size, T) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.26, 0.55, 16), mat(T.pot));
    pot.position.y = 0.27; pot.castShadow = true;
    g.add(pot);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 8, 20), mat(T.rug2));
    band.rotation.x = Math.PI / 2; band.position.y = 0.45;
    g.add(band);
    const leafM = mat(T.leaf);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), leafM);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.22, 0.85 + (i % 2) * 0.25, Math.sin(a) * 0.22);
      leaf.scale.set(0.8, 1.3, 0.8);
      leaf.castShadow = true;
      g.add(leaf);
    }
    const topLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), leafM);
    topLeaf.position.y = 1.35;
    g.add(topLeaf);
    if (T.flower) {
      const flower = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(T.flower), transparent: true }));
      flower.position.set(0.15, 1.6, 0.2); flower.scale.setScalar(0.35);
      g.add(flower);
    }
    g.scale.setScalar(size);
    g.position.set(x, y, z);
    return g;
  }

  // ---------- Nhân vật người chơi ----------
  function setSeats(list) {
    // list[pos] = { avatar, active, passed, rank } hoặc null; pos 0 là mình (không vẽ)
    for (let pos = 1; pos < 4; pos++) {
      const info = list[pos];
      const st = charState[pos];
      if (!info) {
        if (chars[pos]) { scene.remove(chars[pos]); chars[pos] = null; st.avatar = null; }
        continue;
      }
      if (st.avatar !== info.avatar) {
        if (chars[pos]) scene.remove(chars[pos]);
        const c = makeCharacter(info.avatar);
        const p = SEAT_POS[pos].clone().multiplyScalar(1.12);
        c.position.set(p.x, 1.35, p.z);
        c.lookAt(0, 1.35, 0);
        scene.add(c);
        chars[pos] = c;
        st.avatar = info.avatar;
        st.hop = 1;
      }
      Object.assign(st, info);
    }
  }

  function hop(pos, power = 1) {
    if (charState[pos]) charState[pos].hop = power;
  }
  // Bị sét đánh: xoay tít + nhảy
  function zap(pos) {
    if (charState[pos]) { charState[pos].spin = 1; charState[pos].hop = 1.2; }
  }
  // Chớp đèn cả phòng (sét)
  let flashT = 0, flashColor = new THREE.Color(0xffffff), baseLamp = 14;
  function flashLights(color = 0xfff6b0, dur = 0.7) {
    flashColor.set(color); flashT = dur; flashDur = dur;
  }
  let flashDur = 0.7;

  function seatScreen(pos) {
    const p = SEAT_POS[pos].clone().multiplyScalar(1.12);
    p.y = pos === 0 ? 1.1 : 2.15;
    if (pos === 0) p.z = 1.6;
    p.project(camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight };
  }

  function tableScreen() {
    const p = new THREE.Vector3(0, 1.1, 0).project(camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight };
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ---------- Hạt bay tung toé (chặt heo, sảnh dài, thắng…) ----------
  const bursts = [];
  function burst(emojis, count = 14, power = 1) {
    for (let i = 0; i < count; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emojis[i % emojis.length]), transparent: true, depthWrite: false }));
      const a = Math.random() * Math.PI * 2;
      const r = (1.2 + Math.random() * 2.2) * power;
      sp.position.set(0, 1.4, 0);
      sp.userData = { v: new THREE.Vector3(Math.cos(a) * r, (3.5 + Math.random() * 3) * power, Math.sin(a) * r), life: 1.4 + Math.random() * 0.6, spin: (Math.random() - 0.5) * 6 };
      sp.scale.setScalar(0.45 + Math.random() * 0.3);
      scene.add(sp);
      bursts.push(sp);
    }
  }
  let lastT = 0, frameNo = 0;

  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  let onFrame = null;

  function frame() {
    requestAnimationFrame(frame);
    frameNo++;
    if (MOBILE && frameNo % 2) return;
    if (document.hidden) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(0.1, t - lastT); lastT = t;
    for (let i = bursts.length - 1; i >= 0; i--) {
      const sp = bursts[i], u = sp.userData;
      u.v.y -= 7 * dt;
      sp.position.addScaledVector(u.v, dt);
      if (sp.position.y < 1.15 && u.v.y < 0) { sp.position.y = 1.15; u.v.y *= -0.4; u.v.x *= 0.7; u.v.z *= 0.7; }
      sp.material.rotation += u.spin * dt;
      u.life -= dt;
      sp.material.opacity = Math.min(1, u.life * 2);
      if (u.life <= 0) { scene.remove(sp); sp.material.dispose(); bursts.splice(i, 1); }
    }
    const aspect = camera.aspect;
    if (mode === 'lobby') {
      const a = t * 0.08;
      camPos.set(Math.sin(a) * 8.5, 5.2, Math.cos(a) * 8.5 + 1);
      camTarget.set(0, 1.4, 0);
      camera.fov = 50;
    } else {
      // Nhìn từ trên xuống bàn, điện thoại dọc thì lùi xa hơn
      const portrait = aspect < 1;
      const dist = portrait ? 9.6 + (1 - aspect) * 4 : 7.2;
      const height = portrait ? 9.8 + (1 - aspect) * 3 : 7.0;
      camPos.set(mouseX * 0.35, height - mouseY * 0.2, dist);
      // Điện thoại dọc: tay bài chiếm nửa dưới màn hình -> đẩy bàn lên cao hơn
      camTarget.set(0, portrait ? -0.1 - (1 - aspect) * 0.9 : 0.7, portrait ? 0.8 : 0.2);
      camera.fov = portrait ? 52 : 45;
    }
    camera.position.lerp(camPos, mode === 'lobby' ? 1 : 0.06);
    camera.lookAt(camTarget);
    camera.updateProjectionMatrix();

    animated.forEach((a) => a.fn(t));
    for (let pos = 1; pos < 4; pos++) {
      const c = chars[pos]; const st = charState[pos];
      if (!c) continue;
      st.hop = Math.max(0, (st.hop || 0) - 0.03);
      const active = st.active;
      const bob = active ? Math.abs(Math.sin(t * 6)) * 0.18 : Math.sin(t * 2 + pos) * 0.03;
      const hopY = Math.sin(st.hop * Math.PI) * 0.6;
      c.position.y = 1.35 + bob + hopY;
      const squash = active ? 1 + Math.sin(t * 12) * 0.04 : 1;
      c.scale.set(1 / squash, squash, 1 / squash);
      c.rotation.z = st.passed ? Math.sin(t * 1.5) * 0.05 - 0.15 : 0;
      if (st.spin > 0) {
        st.spin = Math.max(0, st.spin - dt * 0.8);
        c.rotation.y = (1 - st.spin) * Math.PI * 6;
        if (st.spin === 0) { const p = SEAT_POS[pos].clone().multiplyScalar(1.12); c.lookAt(0, c.position.y, 0); c.position.x = p.x; c.position.z = p.z; }
      }
    }
    if (flashT > 0) {
      flashT = Math.max(0, flashT - dt);
      const k = flashT / flashDur;
      const flick = k * (0.6 + 0.4 * Math.abs(Math.sin(t * 60)));
      lamp.color.set(0xfff1d6).lerp(flashColor, flick);
      lamp.intensity = baseLamp + flick * 160;
    }
    renderer.render(scene, camera);
    if (onFrame) onFrame();
  }

  resize();
  build();
  frame();

  return {
    setTheme(k) { if (THEMES[k] && k !== themeKey) { themeKey = k; build(); } },
    setMode(m) { mode = m; if (m === 'lobby') setSeats([null, null, null, null]); },
    setSeats, hop, zap, flashLights, seatScreen, tableScreen, burst,
    set onFrame(fn) { onFrame = fn; },
  };
}
