// Bản đồ Cờ Tỷ Phú Việt Nam: 28 ô, đi ngược chiều kim đồng hồ từ ô Xuất phát (góc dưới phải).
// type: start | city | air | chance | tax | jail | rest | gojail
export const GROUP_COLORS = {
  A: '#c8a27a', B: '#7fd3ff', C: '#ff9ec7', D: '#ffb74d', E: '#ef5350', F: '#ffe066', G: '#66bb6a', H: '#5c6bc0',
};

export const CELLS = [
  { type: 'start', name: 'Xuất phát', icon: '🏁' },
  { type: 'city', name: 'Cà Mau', icon: '🦀', group: 'A', price: 60 },
  { type: 'chance', name: 'Cơ hội', icon: '🎁' },
  { type: 'city', name: 'Cần Thơ', icon: '🛶', group: 'A', price: 60 },
  { type: 'tax', name: 'Đóng thuế', icon: '💸', amount: 100 },
  { type: 'air', name: 'SB Tân Sơn Nhất', icon: '✈️', price: 150 },
  { type: 'city', name: 'Phú Quốc', icon: '🏝️', group: 'B', price: 100 },
  { type: 'jail', name: 'Nhà tù', icon: '🔒' },
  { type: 'city', name: 'Vũng Tàu', icon: '🏖️', group: 'B', price: 100 },
  { type: 'chance', name: 'Khí vận', icon: '🧧' },
  { type: 'city', name: 'Đà Lạt', icon: '🌲', group: 'C', price: 140 },
  { type: 'city', name: 'Nha Trang', icon: '🐠', group: 'C', price: 140 },
  { type: 'chance', name: 'Cơ hội', icon: '🎁' },
  { type: 'city', name: 'Quy Nhơn', icon: '🌊', group: 'D', price: 180 },
  { type: 'rest', name: 'Chợ Tết', icon: '🌸' },
  { type: 'city', name: 'Hội An', icon: '🏮', group: 'D', price: 180 },
  { type: 'city', name: 'Huế', icon: '🏯', group: 'E', price: 220 },
  { type: 'chance', name: 'Khí vận', icon: '🧧' },
  { type: 'city', name: 'Đà Nẵng', icon: '🌉', group: 'E', price: 220 },
  { type: 'air', name: 'SB Nội Bài', icon: '✈️', price: 150 },
  { type: 'city', name: 'Ninh Bình', icon: '⛰️', group: 'F', price: 260 },
  { type: 'gojail', name: 'Vào tù', icon: '🚓' },
  { type: 'city', name: 'Hạ Long', icon: '🛳️', group: 'F', price: 260 },
  { type: 'city', name: 'Sa Pa', icon: '🌾', group: 'G', price: 300 },
  { type: 'city', name: 'Hà Giang', icon: '🏍️', group: 'G', price: 300 },
  { type: 'tax', name: 'Thuế xa xỉ', icon: '💎', amount: 150 },
  { type: 'city', name: 'TP.HCM', icon: '🏙️', group: 'H', price: 380 },
  { type: 'city', name: 'Hà Nội', icon: '🏛️', group: 'H', price: 400 },
];
export const JAIL = 7;
export const START_MONEY = 1500;
export const SALARY = 200;
export const MAX_LEVEL = 3;
export const MAX_ROUNDS = 15;

// Tiền thuê theo cấp nhà: 0 (đất trống), 1, 2 nhà, 3 = khách sạn
export function rentOf(cell, level, groupFull, airports) {
  if (cell.type === 'air') return 50 * airports;
  const mult = [0.1, 0.45, 1.0, 1.7][level];
  let r = Math.round((cell.price * mult) / 5) * 5;
  if (level === 0 && groupFull) r *= 2;
  return r;
}
export const buildCost = (cell) => Math.round(cell.price / 2 / 10) * 10;

// Vị trí ô trên lưới 8×8 (cột, hàng)
export function cellXY(i) {
  if (i === 0) return [7, 7];
  if (i < 7) return [7 - i, 7];
  if (i === 7) return [0, 7];
  if (i < 14) return [0, 7 - (i - 7)];
  if (i === 14) return [0, 0];
  if (i < 21) return [i - 14, 0];
  if (i === 21) return [7, 0];
  return [7, i - 21];
}

// Toạ độ thành phố trên bản đồ chữ S (khung 100×150)
export const MAP_XY = {
  'Hà Giang': [36, 8], 'Sa Pa': [22, 13], 'Hà Nội': [40, 22], 'Hạ Long': [55, 22], 'Ninh Bình': [41, 31],
  'Huế': [56, 62], 'Đà Nẵng': [62, 66], 'Hội An': [64, 71], 'Quy Nhơn': [74, 90], 'Nha Trang': [76, 103],
  'Đà Lạt': [66, 104], 'TP.HCM': [52, 117], 'Vũng Tàu': [59, 122], 'Cần Thơ': [42, 128], 'Phú Quốc': [20, 125], 'Cà Mau': [33, 142],
};

export const CARDS = [
  { text: 'Lì xì Tết từ ông bà 🧧', money: 150 },
  { text: 'Trúng vé số 🎫', money: 200 },
  { text: 'Đi chợ hoa ngày Tết 🌸', money: -50 },
  { text: 'Đóng học phí 📚', money: -100 },
  { text: 'Đi tàu thẳng ra Hà Nội 🚄', moveTo: 27 },
  { text: 'Về Xuất phát nhận lương 🏁', moveTo: 0 },
  { text: 'Đi du lịch Đà Lạt 🌲', moveTo: 10 },
  { text: 'Vượt đèn đỏ, vào tù 🚦', jail: true },
  { text: 'Sinh nhật: mỗi người tặng bạn 50 🎂', each: 50 },
  { text: 'Sửa nhà: mỗi căn trả 25 🔨', perHouse: 25 },
  { text: 'Lạc đường, lùi lại 3 ô 🧭', back: 3 },
  { text: 'Bán bánh chưng ngày Tết 🍙', money: 100 },
];
