// Nhạc nền + hiệu ứng âm thanh tự tổng hợp bằng WebAudio (không cần file nhạc).
// iPhone chỉ cho phát âm thanh sau lần chạm đầu tiên -> gọi unlock() trong sự kiện chạm.

let ctx = null;
let master, musicBus, sfxBus;
let musicOn = true, sfxOn = true;
let theme = 'candy';
let playing = false;
let nextTime = 0, step = 0, timer = null;
let noiseBuf = null;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.8 : 0; sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// ---------- Mở khoá âm thanh trên iPhone ----------
// 1) iPhone gạt "im lặng" thì WebAudio bị tắt tiếng. Phát kèm một thẻ <audio> im lặng (lặp lại)
//    để Safari chuyển sang chế độ "phát nhạc" -> vẫn nghe được dù đang bật im lặng.
// 2) Safari chỉ mở khoá khi nhấc tay (touchend / click), nên gọi unlock() ở các sự kiện đó.
let keepAlive = null;
function silentWavUrl() {
  const sr = 8000, n = sr / 2;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function startKeepAlive() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iOS 17+
  } catch { /* bỏ qua */ }
  if (!keepAlive) {
    keepAlive = document.createElement('audio');
    keepAlive.setAttribute('playsinline', '');
    keepAlive.setAttribute('x-webkit-airplay', 'deny');
    keepAlive.loop = true;
    keepAlive.preload = 'auto';
    keepAlive.src = silentWavUrl();
  }
  if (keepAlive.paused && (musicOn || sfxOn)) keepAlive.play().catch(() => {});
}

export function unlock() {
  if (!ensure()) return;
  startKeepAlive();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  // Phát 1 mẫu âm im lặng ngay trong thao tác chạm: cách mở khoá chắc ăn nhất trên Safari cũ
  try {
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, 22050);
    b.connect(ctx.destination);
    b.start(0);
  } catch { /* bỏ qua */ }
  if (musicOn && !playing) startMusic();
}
export const isRunning = () => !!ctx && ctx.state === 'running';

// ---------- Nhạc cụ nhỏ ----------
function tone(bus, freq, t, dur, { type = 'sine', vol = 0.2, attack = 0.005, release = null, glide = 0, cutoff = 0 } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (release ?? dur));
  let node = o;
  if (cutoff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; o.connect(f); node = f; }
  node.connect(g).connect(bus);
  o.start(t); o.stop(t + (release ?? dur) + 0.05);
}

function noise(bus, t, dur, { vol = 0.2, freq = 3000, type = 'highpass', q = 0.7, sweep = 0 } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t); s.stop(t + dur + 0.02);
}

// ---------- Nhạc nền theo chủ đề phòng ----------
// Mỗi bài: tempo, hợp âm (4 ô nhịp), giai điệu 32 nốt (null = nghỉ), âm sắc.
const SONGS = {
  candy: {
    bpm: 112, lead: 'square', leadVol: 0.05, padType: 'triangle', swing: 0,
    chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
    melody: [72, null, 76, 79, 77, null, 76, 72, 74, null, 72, 69, 72, null, null, null,
      69, null, 72, 77, 76, null, 74, 72, 74, null, 76, 79, 79, null, null, null],
    hat: true, kick: [0, 8], snare: [4, 12],
  },
  garden: {
    bpm: 92, lead: 'sine', leadVol: 0.09, padType: 'sine', swing: 0,
    chords: [[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]],
    melody: [77, null, null, 76, 74, null, 72, null, 74, null, 77, null, 81, null, null, null,
      79, null, 77, null, 74, null, 72, 74, 76, null, null, 74, 72, null, null, null],
    hat: false, kick: [0, 10], snare: [],
  },
  night: {
    bpm: 78, lead: 'triangle', leadVol: 0.08, padType: 'sine', swing: 0.12,
    chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]],
    melody: [76, null, null, 74, 72, null, 69, null, null, null, 67, 69, 72, null, null, null,
      74, null, 72, null, 71, null, 67, null, 69, null, null, null, null, null, null, null],
    hat: true, kick: [0, 7, 10], snare: [4, 12],
  },
};

function scheduleStep(t, i) {
  const S = SONGS[theme] || SONGS.candy;
  const bar = Math.floor(i / 16) % 4;
  const s16 = i % 16;
  const chord = S.chords[bar];
  const beat = 60 / S.bpm / 4;
  // Pad hợp âm đầu ô nhịp
  if (s16 === 0) chord.forEach((n) => tone(musicBus, midi(n), t, beat * 15, { type: S.padType, vol: 0.035, attack: 0.08, release: beat * 16 }));
  // Bass
  if (s16 === 0 || s16 === 8 || (s16 === 14 && theme === 'candy')) tone(musicBus, midi(chord[0] - 24), t, beat * 3, { type: 'triangle', vol: 0.16, release: beat * 4 });
  // Rải hợp âm leng keng
  if (s16 % 2 === 0) {
    const n = chord[(s16 / 2) % chord.length] + 12;
    tone(musicBus, midi(n), t, beat, { type: 'sine', vol: 0.025, release: beat * 2 });
  }
  // Giai điệu
  const m = S.melody[Math.floor(i / 2) % 32];
  if (i % 2 === 0 && m) tone(musicBus, midi(m), t, beat * 2, { type: S.lead, vol: S.leadVol, release: beat * 3.5, cutoff: S.lead === 'square' ? 2400 : 0 });
  // Trống nhẹ
  if (S.kick.includes(s16)) tone(musicBus, 120, t, 0.18, { type: 'sine', vol: 0.22, glide: 0.35 });
  if (S.snare.includes(s16)) noise(musicBus, t, 0.12, { vol: 0.06, freq: 1800 });
  if (S.hat && s16 % 2 === 0) noise(musicBus, t, 0.03, { vol: s16 % 4 === 2 ? 0.035 : 0.018, freq: 8000 });
}

function scheduler() {
  const S = SONGS[theme] || SONGS.candy;
  const beat = 60 / S.bpm / 4;
  while (nextTime < ctx.currentTime + 0.15) {
    const sw = step % 2 === 1 ? S.swing * beat : 0;
    scheduleStep(nextTime + sw, step);
    nextTime += beat;
    step = (step + 1) % 128;
  }
}

function startMusic() {
  if (!ctx || playing) return;
  playing = true;
  nextTime = ctx.currentTime + 0.1;
  step = 0;
  timer = setInterval(scheduler, 40);
}
function stopMusic() { playing = false; clearInterval(timer); }

export function setTheme(k) {
  if (k === theme || !SONGS[k]) return;
  theme = k;
  if (playing && ctx) {
    // chuyển bài mượt: nhỏ dần rồi bắt đầu lại
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => { step = 0; nextTime = ctx.currentTime + 0.05; if (musicOn) musicBus.gain.setTargetAtTime(0.32, ctx.currentTime, 0.3); }, 450);
  }
}

export function setMusic(on) {
  musicOn = on;
  if (!ctx) return;
  musicBus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.1);
  if (on && !playing) startMusic();
  if (!on) setTimeout(() => { if (!musicOn) stopMusic(); }, 400);
}
export function setSfx(on) { sfxOn = on; if (ctx) sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05); if (keepAlive && !musicOn && !sfxOn) keepAlive.pause(); }

// Nhạc nhỏ lại khi tab bị ẩn (đỡ tốn pin), lên lại khi quay về
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { ctx.suspend(); if (keepAlive) keepAlive.pause(); }
  else { ctx.resume().catch(() => {}); if (keepAlive && (musicOn || sfxOn)) keepAlive.play().catch(() => {}); }
});

// ---------- Hiệu ứng ----------
const now = () => (ensure() ? ctx.currentTime : 0);
const ok = () => ctx && sfxOn;

export const sfx = {
  select() { if (!ok()) return; const t = now(); tone(sfxBus, 1250 + Math.random() * 150, t, 0.05, { vol: 0.08 }); },
  deselect() { if (!ok()) return; tone(sfxBus, 900, now(), 0.05, { vol: 0.06 }); },
  play(n = 1) {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < Math.min(n, 6); i++) {
      noise(sfxBus, t + i * 0.035, 0.07, { vol: 0.25, freq: 2500, type: 'bandpass', q: 1.2 });
      tone(sfxBus, 180, t + i * 0.035, 0.06, { vol: 0.12, glide: 0.5 });
    }
    tone(sfxBus, 660, t + 0.02, 0.08, { type: 'triangle', vol: 0.06 });
  },
  bigCombo() {
    if (!ok()) return;
    const t = now();
    [72, 76, 79, 84, 88].forEach((n, i) => tone(sfxBus, midi(n), t + i * 0.06, 0.15, { type: 'triangle', vol: 0.09, release: 0.3 }));
    noise(sfxBus, t, 0.5, { vol: 0.05, freq: 6000, sweep: 12000 });
  },
  pig() {
    if (!ok()) return;
    const t = now();
    // "ụt ịt" 🐷
    tone(sfxBus, 420, t, 0.12, { type: 'sawtooth', vol: 0.07, glide: 1.5, cutoff: 1600 });
    tone(sfxBus, 520, t + 0.14, 0.14, { type: 'sawtooth', vol: 0.07, glide: 1.6, cutoff: 1800 });
  },
  pass() { if (!ok()) return; const t = now(); tone(sfxBus, 520, t, 0.1, { vol: 0.07, glide: 0.6 }); noise(sfxBus, t, 0.15, { vol: 0.04, freq: 800, type: 'lowpass' }); },
  turn() { if (!ok()) return; const t = now(); [880, 1175, 1568].forEach((f, i) => tone(sfxBus, f, t + i * 0.07, 0.12, { vol: 0.07, release: 0.25 })); },
  tick() { if (!ok()) return; tone(sfxBus, 1800, now(), 0.03, { type: 'square', vol: 0.03, cutoff: 3000 }); },
  chop() {
    if (!ok()) return;
    const t = now();
    noise(sfxBus, t, 0.25, { vol: 0.35, freq: 400, type: 'bandpass', sweep: 4000 });
    tone(sfxBus, 90, t + 0.2, 0.4, { type: 'sine', vol: 0.4, glide: 0.4 });
    noise(sfxBus, t + 0.2, 0.3, { vol: 0.2, freq: 200, type: 'lowpass' });
    [60, 63, 67, 72].forEach((n, i) => tone(sfxBus, midi(n + 12), t + 0.35 + i * 0.07, 0.2, { type: 'square', vol: 0.04, cutoff: 2500 }));
  },
  deal() {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < 13; i++) noise(sfxBus, t + i * 0.045, 0.04, { vol: 0.15, freq: 3000 + Math.random() * 1500, type: 'bandpass', q: 2 });
  },
  newRound() { if (!ok()) return; const t = now(); tone(sfxBus, 660, t, 0.1, { type: 'triangle', vol: 0.05 }); tone(sfxBus, 990, t + 0.08, 0.15, { type: 'triangle', vol: 0.05 }); },
  win() {
    if (!ok()) return;
    const t = now();
    [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => tone(sfxBus, midi(n + 12), t + i * 0.1, 0.18, { type: 'square', vol: 0.05, release: 0.3, cutoff: 3000 }));
    [48, 55, 60].forEach((n) => tone(sfxBus, midi(n), t + 0.4, 0.9, { type: 'triangle', vol: 0.12, release: 1.2 }));
  },
  lose() { if (!ok()) return; const t = now(); [67, 66, 65, 64].forEach((n, i) => tone(sfxBus, midi(n), t + i * 0.22, 0.25, { type: 'triangle', vol: 0.09, glide: i === 3 ? 0.9 : 0, release: i === 3 ? 0.8 : 0.3 })); },
  thunder(power = 1) {
    if (!ok()) return;
    const t = now();
    noise(sfxBus, t, 0.12, { vol: 0.5 * power, freq: 6000, type: 'highpass' });           // tiếng nổ "tạch"
    noise(sfxBus, t + 0.05, 1.6, { vol: 0.45 * power, freq: 900, type: 'lowpass', sweep: 80 }); // sấm rền
    tone(sfxBus, 55, t + 0.05, 1.2, { type: 'sine', vol: 0.35 * power, glide: 0.6 });
  },
  pigRun(n = 1) {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < 8; i++) noise(sfxBus, t + i * 0.13, 0.05, { vol: 0.12, freq: 600, type: 'bandpass', q: 3 }); // lộc cộc
    for (let k = 0; k < n; k++) {
      tone(sfxBus, 460 + k * 60, t + 0.15 + k * 0.25, 0.14, { type: 'sawtooth', vol: 0.07, glide: 1.6, cutoff: 1800 });
      tone(sfxBus, 560 + k * 60, t + 0.32 + k * 0.25, 0.16, { type: 'sawtooth', vol: 0.07, glide: 1.7, cutoff: 1900 });
    }
  },
  bump() {
    if (!ok()) return;
    const t = now();
    tone(sfxBus, 160, t, 0.25, { type: 'sine', vol: 0.4, glide: 0.4 });
    noise(sfxBus, t, 0.18, { vol: 0.3, freq: 1200, type: 'bandpass' });
    tone(sfxBus, 900, t + 0.05, 0.3, { type: 'square', vol: 0.04, glide: 0.5, cutoff: 2000 });
  },
  train() {
    if (!ok()) return;
    const t = now();
    // còi "tu tu"
    [0, 0.35].forEach((d) => { tone(sfxBus, 587, t + d, 0.28, { type: 'square', vol: 0.05, cutoff: 1800 }); tone(sfxBus, 740, t + d, 0.28, { type: 'square', vol: 0.04, cutoff: 1800 }); });
    for (let i = 0; i < 10; i++) noise(sfxBus, t + 0.2 + i * 0.12, 0.08, { vol: 0.12 + (i % 2) * 0.06, freq: 500, type: 'bandpass', q: 1.5 }); // xình xịch
  },
  stamp() {
    if (!ok()) return;
    const t = now();
    [0, 0.12, 0.24, 0.36].forEach((d) => { tone(sfxBus, 110, t + d, 0.15, { type: 'sine', vol: 0.3, glide: 0.5 }); noise(sfxBus, t + d, 0.08, { vol: 0.2, freq: 1500, type: 'bandpass' }); });
    tone(sfxBus, 70, t + 0.55, 0.9, { type: 'sine', vol: 0.5, glide: 0.5 });
    noise(sfxBus, t + 0.55, 0.6, { vol: 0.3, freq: 400, type: 'lowpass', sweep: 60 });
    [72, 76, 79, 84].forEach((n, i) => tone(sfxBus, midi(n), t + 0.75 + i * 0.07, 0.2, { type: 'triangle', vol: 0.07, release: 0.35 }));
  },
  pop() { if (!ok()) return; tone(sfxBus, 700, now(), 0.08, { vol: 0.08, glide: 2.2 }); },
  coin() { if (!ok()) return; const t = now(); tone(sfxBus, midi(83), t, 0.06, { type: 'square', vol: 0.04, cutoff: 4000 }); tone(sfxBus, midi(88), t + 0.07, 0.2, { type: 'square', vol: 0.04, cutoff: 4000, release: 0.3 }); },
  error() { if (!ok()) return; const t = now(); tone(sfxBus, 220, t, 0.1, { type: 'square', vol: 0.04, cutoff: 1200 }); tone(sfxBus, 180, t + 0.1, 0.15, { type: 'square', vol: 0.04, cutoff: 1200 }); },
};
