// Đổi số phiên bản (dùng để báo "Có bản mới" cho người đang mở game). Chạy: npm run bump
import fs from 'node:fs';
const v = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-');
fs.writeFileSync('public/version.json', JSON.stringify({ v }) + '\n');
const p = 'public/app.js';
fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/const APP_VERSION = '[^']*';/, `const APP_VERSION = '${v}';`));
console.log('Phiên bản', v);
