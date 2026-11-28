// Bảng chọn giọng MC (dùng chung)
import { CLOUD_VOICES, cloudAvailable, deviceVoices, getConfig, onVoicesChanged, setConfig, speak } from './voice.js';

const SAMPLE = 'Lô tô đây bà con ơi! Con số sáu mươi tám, lộc phát lộc phát!';
let box = null;

function render() {
  const c = getConfig();
  const dev = deviceVoices();
  const list = box.querySelector('.vp-list');
  list.innerHTML = '';
  const add = (label, sub, selected, onPick, disabled = false) => {
    const b = document.createElement('button');
    b.className = 'vp-item' + (selected ? ' sel' : '');
    b.disabled = disabled;
    b.innerHTML = '<b></b><small></small>';
    b.querySelector('b').textContent = label;
    b.querySelector('small').textContent = sub;
    b.onclick = () => { onPick(); render(); speak(SAMPLE); };
    list.appendChild(b);
  };
  const head = (t) => { const h = document.createElement('div'); h.className = 'vp-head'; h.textContent = t; list.appendChild(h); };

  head('⭐ Giọng Microsoft Neural (hay nhất, chạy mọi máy)');
  CLOUD_VOICES.forEach((v) => add(v.name, cloudAvailable() ? 'Đọc qua mạng' : 'Chưa bật — chủ nhà cần cài khoá Azure', c.engine === 'cloud' && c.cloudVoice === v.id, () => setConfig({ engine: 'cloud', cloudVoice: v.id }), !cloudAvailable()));

  head('📱 Giọng có sẵn trong máy này');
  if (!dev.length) {
    const e = document.createElement('div'); e.className = 'vp-empty';
    e.textContent = 'Máy này chưa có giọng tiếng Việt. iPhone: Cài đặt › Trợ năng › Nội dung được đọc › Giọng nói › Tiếng Việt để tải thêm giọng.';
    list.appendChild(e);
  }
  dev.forEach((v, i) => add(v.name.replace(/\s*\(.*Vietnam.*\)/i, ''), (/microsoft/i.test(v.name) ? 'Microsoft · ' : '') + (v.localService ? 'trong máy' : 'qua mạng'),
    c.engine === 'device' && (c.voiceURI ? c.voiceURI === v.voiceURI : i === 0), () => setConfig({ engine: 'device', voiceURI: v.voiceURI })));

  box.querySelector('.vp-rate').value = c.rate;
  box.querySelector('.vp-pitch').value = c.pitch;
  box.querySelector('.vp-on').checked = c.on;
}

export function openVoicePicker() {
  if (!box) {
    box = document.createElement('div');
    box.className = 'modal vp-modal';
    box.innerHTML = `<div class="modal-card">
      <div class="modal-title">🗣️ Giọng MC</div>
      <label class="row-check vp-onrow"><input type="checkbox" class="vp-on"> MC đọc số thành tiếng</label>
      <div class="vp-list"></div>
      <div class="vp-sliders">
        <label>Tốc độ <input type="range" class="vp-rate" min="0.7" max="1.4" step="0.05"></label>
        <label>Độ cao <input type="range" class="vp-pitch" min="0.7" max="1.5" step="0.05"></label>
      </div>
      <div class="modal-actions"><button class="btn soft vp-test">🔊 Nghe thử</button><button class="btn big pink vp-close">Xong ✨</button></div>
    </div>`;
    document.getElementById('game').appendChild(box);
    box.querySelector('.vp-close').onclick = () => box.classList.add('hidden');
    box.addEventListener('pointerdown', (e) => { if (e.target === box) box.classList.add('hidden'); });
    box.querySelector('.vp-test').onclick = () => speak(SAMPLE);
    box.querySelector('.vp-rate').onchange = (e) => { setConfig({ rate: +e.target.value }); speak(SAMPLE); };
    box.querySelector('.vp-pitch').onchange = (e) => { setConfig({ pitch: +e.target.value }); speak(SAMPLE); };
    box.querySelector('.vp-on').onchange = (e) => setConfig({ on: e.target.checked });
    onVoicesChanged(() => { if (!box.classList.contains('hidden')) render(); });
  }
  box.classList.remove('hidden');
  render();
}
