# 🐷 Tiến Lên Cute

Game **Tiến Lên Miền Nam** chơi online nhiều người, giao diện pastel dễ thương, có **phòng chơi 3D** (Three.js) với bàn tròn, ghế đệm, nhân vật thú bông, bóng bay, đèn nháy, kệ sách, mèo ngủ, cửa sổ có mây/trăng…

## Tính năng
- 🃏 Đủ luật Tiến Lên Miền Nam: rác, đôi, sám, tứ quý, sảnh, đôi thông; **chặt heo** (3 đôi thông / tứ quý / 4 đôi thông); **tới trắng** (tứ quý heo, sảnh rồng, 6 đôi, 5 đôi thông); **cóng**, **thối heo**.
- ⚙️ Luật tuỳ chỉnh theo phòng (chủ phòng bật/tắt): cấm về heo chót, cấm về bằng hàng, ván đầu phải đánh 3♠, chặt tính tiền (chặt chồng cộng dồn), thối heo/thối hàng, cóng, tới trắng, thời gian mỗi lượt.
- 📒 Chế độ ghi nợ (chơi cho vui): không trừ xu, ghi lại ai thắng/thua qua các ván, bảng tổng, gợi ý "ai trả ai" ít lần chuyển nhất, lịch sử ván, sao chép sổ để dán vào Zalo/Messenger.
- 🌐 Chơi online theo phòng 2–4 người: tạo phòng, gửi **link mời**/mã 4 chữ, danh sách phòng công khai.
- 🤖 Thêm bot lấp chỗ trống; ai mất mạng thì bot đánh thay, vào lại trong 45 giây sẽ ngồi lại đúng chỗ.
- 🏠 3 kiểu trang trí phòng 3D: **Kẹo Hồng**, **Vườn Xanh**, **Đêm Sao** (chủ phòng đổi được bất cứ lúc nào).
- 🐱 12 avatar thú cưng — người chơi khác hiện thành nhân vật 3D ngồi quanh bàn, nhún nhảy khi tới lượt.
- 🎵 Nhạc nền riêng cho từng kiểu phòng + hiệu ứng âm thanh (tiếng bài, "ụt ịt" khi đánh heo, chặt, tích tắc sắp hết giờ…), tự tổng hợp bằng WebAudio, bật/tắt riêng nhạc và tiếng.
- 💥 Hiệu ứng: bài bay từ người đánh vào bàn, rung màn hình + nổ hạt 3D khi chặt heo, chữ combo khi đánh sảnh dài/đôi thông/tứ quý, đếm xu khi kết thúc.
- 💬 Chat, thả emoji, pháo giấy khi thắng, đếm giờ 25 giây/lượt.
- 💡 Nút gợi ý, xếp bài theo số/chất. Điện thoại: bài xếp 2 hàng lá to, kéo ngón tay để chọn nhiều lá, nút to dễ bấm. Máy tính: Enter = đánh, Space = bỏ lượt.
- 🪙 Xu tích luỹ theo người chơi.

## Cách hoạt động (không cần server riêng)
- Web là **trang tĩnh** (thư mục `public/`), đưa lên **Vercel** là có link riêng.
- Chơi online qua **Supabase Realtime**: trình duyệt của **chủ phòng** chạy ván bài, mọi người gửi/nhận nước đi qua kênh realtime. Không tạo bảng, không đụng dữ liệu nào trong Supabase.
- Chủ phòng lỡ tải lại trang → ván được khôi phục. Người chơi mất mạng → bot đánh thay, vào lại trong 45 giây là ngồi đúng chỗ.
- Xu lưu trên máy từng người (localStorage).
- Cấu hình Supabase ở `public/config.js`.

## Đưa lên Vercel
1. vercel.com → **Add New… → Project** → chọn repo `draft-for-fun` → **Import**.
2. Framework Preset: **Other**, để nguyên các ô khác (đã có `vercel.json`) → **Deploy**.
3. Xong sẽ có link dạng `https://draft-for-fun.vercel.app` — gửi cho bạn bè là chơi.

## Chạy thử trên máy
```bash
npm install
npm start          # http://localhost:3000
npm test           # kiểm thử luật chơi + 20 ván bot tự đánh
```
Thử nhiều người trên 1 máy không cần mạng: mở nhiều tab `http://localhost:3000/?local=1`.

## Cấu trúc
```
public/shared/rules.js  Luật chơi
public/game/room.js     Diễn biến 1 ván: chia bài, lượt, vòng, chặt, kết quả
public/game/bot.js      AI bot
public/net.js           Kết nối online (Supabase Realtime / thử nhiều tab)
public/app.js           Giao diện, public/scene3d.js phòng 3D, public/vendor/ thư viện
server/index.js         Server tĩnh nhỏ để chạy thử trên máy
test/             Kiểm thử
```
