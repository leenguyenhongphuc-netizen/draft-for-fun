# 🐷 Tiến Lên Cute

Game **Tiến Lên Miền Nam** chơi online nhiều người, giao diện pastel dễ thương, có **phòng chơi 3D** (Three.js) với bàn tròn, ghế đệm, nhân vật thú bông, bóng bay, đèn nháy, kệ sách, mèo ngủ, cửa sổ có mây/trăng…

## Tính năng
- 🃏 Đủ luật Tiến Lên Miền Nam: rác, đôi, sám, tứ quý, sảnh, đôi thông; **chặt heo** (3 đôi thông / tứ quý / 4 đôi thông); **tới trắng** (tứ quý heo, sảnh rồng, 6 đôi, 5 đôi thông); **cóng**, **thối heo**.
- 🌐 Chơi online theo phòng 2–4 người: tạo phòng, gửi **link mời**/mã 4 chữ, danh sách phòng công khai.
- 🤖 Thêm bot lấp chỗ trống; ai mất mạng thì bot đánh thay, vào lại trong 45 giây sẽ ngồi lại đúng chỗ.
- 🏠 3 kiểu trang trí phòng 3D: **Kẹo Hồng**, **Vườn Xanh**, **Đêm Sao** (chủ phòng đổi được bất cứ lúc nào).
- 🐱 12 avatar thú cưng — người chơi khác hiện thành nhân vật 3D ngồi quanh bàn, nhún nhảy khi tới lượt.
- 💬 Chat, thả emoji, hiệu ứng "CHẶT!", pháo giấy khi thắng, âm thanh nhỏ xinh, đếm giờ 25 giây/lượt.
- 💡 Nút gợi ý, xếp bài theo số/chất, kéo ngón tay để chọn nhiều lá (điện thoại), phím tắt Enter = đánh, Space = bỏ lượt.
- 🪙 Xu tích luỹ theo người chơi (lưu ở `data/coins.json` trên server).

## Chạy trên máy
```bash
npm install
npm start          # mở http://localhost:3000
npm test           # kiểm thử luật chơi + 20 ván bot tự đánh
```
Bạn bè cùng mạng Wi‑Fi vào `http://<IP-máy-bạn>:3000`.

## Đưa lên mạng để chơi online
Đây là app Node.js dùng WebSocket (Socket.IO), cần host chạy server liên tục:
- **Render.com** (miễn phí): New → Blueprint → chọn repo này (đã có `render.yaml`).
- **Railway / Fly.io / VPS**: có sẵn `Dockerfile`, hoặc chạy `npm ci && npm start` (đọc biến `PORT`).

> Lưu ý: gói miễn phí của Render ngủ sau 15 phút không dùng, lần mở đầu sẽ chậm ~30 giây; xu lưu trong file sẽ mất khi server khởi động lại.

## Cấu trúc
```
shared/rules.js   Luật chơi (dùng chung server + trình duyệt)
server/index.js   Express + Socket.IO, quản lý phòng, xu
server/room.js    Diễn biến 1 ván: chia bài, lượt, vòng, chặt, kết quả
server/bot.js     AI bot
public/           Giao diện: index.html, style.css, app.js, scene3d.js (phòng 3D)
test/             Kiểm thử
```
