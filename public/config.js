// Kết nối Supabase Realtime (chỉ dùng kênh phát tin, không đọc/ghi bảng nào).
// Khoá "publishable" được phép để công khai trên web.
export const SUPABASE_URL = 'https://lpiwmdomdzebzhmxzesn.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_6H1om-emHz6RrLBy1guQfg_PfGyseKE';

// Giọng Microsoft Neural (Azure Speech) qua hàm Supabase "tts". Để trống = chỉ dùng giọng có sẵn trong máy.
// Đã triển khai hàm 'tts'. Chỉ cần thêm khoá AZURE_SPEECH_KEY (+ AZURE_SPEECH_REGION) trong Supabase › Edge Functions › Secrets.
export const TTS_URL = SUPABASE_URL + '/functions/v1/tts';
// Khoá anon (JWT, được phép công khai) để gọi hàm Supabase
export const SUPABASE_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdtZG9tZHplYnpobXh6ZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MTU2NzMsImV4cCI6MjExMDM5MTY3M30.rt4sffMrh3I7XT4cNNApMI4mhWSWwa1k_IjMoVS4Nfg';
