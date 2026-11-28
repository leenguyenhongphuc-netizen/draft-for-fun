// 🗣️ Giọng đọc (MC Lô Tô…)
// 1) Giọng có sẵn trong máy (speechSynthesis). Máy nào có giọng Microsoft (Edge trên Windows/Android:
//    "Microsoft HoaiMy/NamMinh Online (Natural)") thì tự ưu tiên.
// 2) Giọng Microsoft Neural qua Azure Speech (đọc hay trên mọi máy, kể cả iPhone) — chỉ bật khi
//    đã cấu hình TTS_URL (hàm Supabase giữ khoá Azure, xem supabase/functions/tts).
import { TTS_URL, SUPABASE_KEY } from './config.js';
import { playAudioBuffer } from './audio.js';

export const CLOUD_VOICES = [
  { id: 'vi-VN-HoaiMyNeural', name: 'Microsoft HoaiMy (nữ, giọng Nam)' },
  { id: 'vi-VN-NamMinhNeural', name: 'Microsoft NamMinh (nam, giọng Nam)' },
];

const KEY = 'tlc:voice';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let cfg = { engine: TTS_URL ? 'cloud' : 'device', voiceURI: '', cloudVoice: CLOUD_VOICES[0].id, rate: 1.05, pitch: 1.1, on: true, ...load() };
if (!TTS_URL && cfg.engine === 'cloud') cfg.engine = 'device';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* bỏ qua */ } };

export const getConfig = () => ({ ...cfg });
export const cloudAvailable = () => !!TTS_URL;
export function setConfig(patch) { cfg = { ...cfg, ...patch }; save(); }

// Danh sách giọng tiếng Việt trong máy, giọng Microsoft / Natural lên đầu
export function deviceVoices() {
  if (!window.speechSynthesis) return [];
  const all = speechSynthesis.getVoices();
  const vi = all.filter((v) => (v.lang || '').toLowerCase().startsWith('vi'));
  const score = (v) => (/natural|online/i.test(v.name) ? 2 : 0) + (/microsoft/i.test(v.name) ? 1 : 0) + (/google/i.test(v.name) ? 0.5 : 0);
  return vi.sort((a, b) => score(b) - score(a));
}
export function onVoicesChanged(fn) { if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', fn); }

function pickDeviceVoice() {
  const list = deviceVoices();
  return list.find((v) => v.voiceURI === cfg.voiceURI) || list[0] || null;
}

function speakDevice(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'vi-VN'; u.rate = cfg.rate; u.pitch = cfg.pitch;
  const v = pickDeviceVoice();
  if (v) u.voice = v;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// Giọng mây: nhớ đệm theo câu để đỡ gọi lại (câu hò lô tô lặp nhiều)
const cache = new Map();
let seq = 0;
async function speakCloud(text) {
  const my = ++seq;
  const key = cfg.cloudVoice + '|' + cfg.rate + '|' + cfg.pitch + '|' + text;
  try {
    let buf = cache.get(key);
    if (!buf) {
      const r = await fetch(TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify({ text, voice: cfg.cloudVoice, rate: cfg.rate, pitch: cfg.pitch }),
      });
      if (!r.ok) throw new Error('tts ' + r.status);
      buf = await r.arrayBuffer();
      if (cache.size > 120) cache.delete(cache.keys().next().value);
      cache.set(key, buf);
    }
    if (my !== seq) return; // đã có câu mới hơn
    await playAudioBuffer(buf.slice(0));
  } catch (e) {
    console.warn('Giọng Microsoft lỗi, dùng giọng máy', e);
    speakDevice(text);
  }
}

export function speak(text) {
  if (!cfg.on || !text) return;
  try { if (localStorage.getItem('tlc:muted') === 'true') return; } catch { /* bỏ qua */ }
  if (cfg.engine === 'cloud' && TTS_URL) speakCloud(text);
  else speakDevice(text);
}
