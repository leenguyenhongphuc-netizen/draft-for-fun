// Hàm Supabase: chuyển chữ thành giọng Microsoft Neural (Azure Speech).
// Khoá Azure nằm ở biến môi trường của hàm, không lộ ra trình duyệt.
// Cần đặt: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (vd: southeastasia)
const VOICES = new Set(['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural']);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { text, voice, rate = 1, pitch = 1 } = await req.json();
    const t = String(text || '').slice(0, 300);
    if (!t) return new Response('missing text', { status: 400, headers: cors });
    const v = VOICES.has(voice) ? voice : 'vi-VN-HoaiMyNeural';
    const r = Math.round((Math.min(1.5, Math.max(0.6, Number(rate))) - 1) * 100);
    const p = Math.round((Math.min(1.5, Math.max(0.6, Number(pitch))) - 1) * 50);
    const ssml = `<speak version="1.0" xml:lang="vi-VN"><voice name="${v}"><prosody rate="${r}%" pitch="${p}%">${esc(t)}</prosody></voice></speak>`;
    const region = Deno.env.get('AZURE_SPEECH_REGION') || 'southeastasia';
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': Deno.env.get('AZURE_SPEECH_KEY') || '',
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'game-nha-pum',
      },
      body: ssml,
    });
    if (!res.ok) return new Response('azure ' + res.status, { status: 502, headers: cors });
    return new Response(res.body, { headers: { ...cors, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' } });
  } catch (e) {
    return new Response('error', { status: 500, headers: cors });
  }
});
