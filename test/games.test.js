import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XiDachRoom, judge, scoreHand } from '../public/game/xidach.js';
import { BaiCaoRoom, judgeCao } from '../public/game/baicao.js';
import { CaNguaRoom, FINISH } from '../public/game/cangua.js';

const c = (r, s = 0) => r * 4 + s; // r: 0='3' … 7='10', 8=J, 9=Q, 10=K, 11=A, 12='2'
const hooks = () => ({ emitState() {}, emitEvent() {}, getCoins: () => 1000, addCoins() {} });

test('xì dách: tính điểm và phân loại', () => {
  assert.equal(judge([c(11), c(11, 1)]).kind, 'xiban');
  assert.equal(judge([c(11), c(9)]).kind, 'xidach');
  assert.equal(scoreHand([c(11), c(5)]), 19);           // A + 8 = 11 + 8
  assert.equal(scoreHand([c(11), c(5), c(7)]), 19);     // 3 lá: A = 1 -> 1+8+10
  assert.equal(scoreHand([c(11), c(0), c(1)]), 17);     // A=10 + 3 + 4
  assert.equal(judge([c(7), c(8), c(0)]).kind, 'quac'); // 10+10+3
  assert.equal(judge([c(12), c(12, 1), c(0), c(0, 1), c(1)]).kind, 'ngulinh'); // 2+2+3+3+4 = 14
});

test('bài cào: điểm', () => {
  assert.equal(judgeCao([c(8), c(9), c(10)]).kind, 'batay');
  assert.equal(judgeCao([c(11), c(12), c(6)]).power, 2); // A + 2 + 9 = 12 -> 2
  assert.equal(judgeCao([c(7), c(8), c(9)]).power, 0);
});

async function playOut(Room, rounds, step) {
  const r = new Room({ code: 'T', name: 't', theme: 'candy', isPublic: false, hooks: hooks() });
  for (let i = 0; i < 4; i++) r.addBot();
  for (let k = 0; k < rounds; k++) {
    assert.equal(r.start(), null);
    let guard = 0;
    while (r.state === 'playing' && guard++ < 5000) step(r);
    assert.equal(r.state, 'ended', 'ván phải kết thúc');
    const sum = r.results.reduce((a, x) => a + x.delta, 0);
    assert.ok(Math.abs(sum) < 0.01, 'tổng tiền một ván phải bằng 0, đang là ' + sum);
  }
  r.destroy();
  return r;
}

test('xì dách: bot chơi 50 ván, nhà cái xoay vòng', async () => {
  const dealers = new Set();
  await playOut(XiDachRoom, 50, (r) => { dealers.add(r.g.dealer); r.autoMove(r.g.turn); });
  assert.ok(dealers.size >= 3);
});

test('bài cào: bot chơi 50 ván', async () => {
  await playOut(BaiCaoRoom, 50, (r) => { r.showdown(); });
});

test('cá ngựa: bot chơi 5 ván tới khi có người về đủ 4 ngựa', async () => {
  const r = await playOut(CaNguaRoom, 5, (room) => {
    const g = room.g;
    if (g.phase === 'wait') { room.clearTimer('turn'); room.endTurn(g.dice === 6 || g.dice === 1); return; }
    room.autoMove(g.turn);
  });
  assert.ok(r.g.horses.some((hs) => hs.every((x) => x === FINISH)));
});

import { TyPhuRoom } from '../public/game/typhu.js';
import { LoToRoom, makeTicket, ticketKinh } from '../public/game/loto.js';
import { CELLS, cellXY } from '../public/game/typhu-map.js';

test('tỷ phú: bản đồ 28 ô, vị trí không trùng', () => {
  assert.equal(CELLS.length, 28);
  const seen = new Set(CELLS.map((_, i) => cellXY(i).join(',')));
  assert.equal(seen.size, 28);
});

test('tỷ phú: bot chơi 10 ván tới khi hết vòng hoặc phá sản', async () => {
  await playOut(TyPhuRoom, 10, (r) => {
    const g = r.g;
    if (g.phase === 'moving') { r.clearTimer('turn'); if (g.moveTarget != null) { r.completeMove(g.turn); r.clearTimer('turn'); } r.land(g.turn); return; }
    r.autoMove(g.turn);
  });
});

test('lô tô: vé đúng 3 hàng × 5 số, số đúng cột', () => {
  for (let k = 0; k < 200; k++) {
    const t = makeTicket();
    t.forEach((row) => {
      assert.equal(row.filter((n) => n != null).length, 5);
      row.forEach((n, c) => { if (n != null) { assert.ok(n >= (c === 0 ? 1 : c * 10) && n <= (c === 8 ? 90 : c * 10 + 9)); } });
    });
    const nums = t.flat().filter((n) => n != null);
    assert.equal(new Set(nums).size, 15);
  }
});

test('lô tô: một vòng có người kinh, tiền vé chia đúng (tổng bằng 0)', () => {
  const r = new LoToRoom({ code: 'L', name: 'l', theme: 'candy', isPublic: false, hooks: hooks() });
  try {
  for (let i = 0; i < 6; i++) r.addBot();
  assert.equal(r.seats.length, 10);
  r.start();
  for (let s = 0; s < 6; s++) { r.action(s, { a: 'buy' }); if (s % 2) r.action(s, { a: 'buy' }); }
  while (r.g.tickets[0].length < 3) assert.equal(r.action(0, { a: 'buy' }), null);
  assert.ok(r.action(0, { a: 'buy' }));          // vé thứ 4 bị từ chối
  r.startCalling();
  let guard = 0;
  while (r.g.phase === 'call' && guard++ < 95) { r.callNext(); if (r.g.claimAt) r.settle(); }
  assert.equal(r.g.phase, 'win');
  const called = new Set(r.g.called);
  assert.ok(r.g.winners.seats.length >= 1);
  r.g.winners.seats.forEach((s) => assert.ok(r.g.tickets[s].some((t) => ticketKinh(t, called))));
  const sum = r.g.winners.rows.reduce((a, x) => a + x.delta, 0);
  assert.ok(Math.abs(sum) < 0.01);
  } finally { r.destroy(); }
});

import { PokerRoom, bestHand, cmpHand } from '../public/game/poker.js';
import { CaroRoom, winLine, N as CN } from '../public/game/caro.js';

test('poker: so bài', () => {
  // c(r,s): r 0='3'…11='A',12='2'
  const royal = bestHand([c(7, 3), c(8, 3), c(9, 3), c(10, 3), c(11, 3), c(0, 0), c(1, 1)]);
  assert.equal(royal.score[0], 8);
  const wheel = bestHand([c(11, 0), c(12, 1), c(0, 2), c(1, 3), c(2, 0), c(9, 1), c(8, 2)]);
  assert.deepEqual(wheel.score, [4, 5]);
  const full = bestHand([c(5, 0), c(5, 1), c(5, 2), c(9, 0), c(9, 1), c(0, 3), c(2, 2)]);
  assert.equal(full.score[0], 6);
  const twoPair = bestHand([c(5, 0), c(5, 1), c(9, 2), c(9, 0), c(11, 1), c(0, 3), c(2, 2)]);
  assert.ok(cmpHand(full.score, twoPair.score) > 0);
});

test('poker: bot chơi 60 ván, tổng chip luôn bằng 0', async () => {
  await playOut(PokerRoom, 60, (r) => {
    const g = r.g;
    if (g.turn == null) { r.clearTimer('turn'); r.finishHand(); return; }
    r.botMove(g.turn);
  });
});

test('caro: 5 quân thắng, bị chặn 2 đầu thì không', () => {
  const b = new Array(CN * CN).fill(0);
  for (let x = 3; x < 8; x++) b[7 * CN + x] = 1;
  assert.ok(winLine(b, 5, 7, true));
  b[7 * CN + 2] = 2; b[7 * CN + 8] = 2;
  assert.equal(winLine(b, 5, 7, true), null);
  assert.ok(winLine(b, 5, 7, false));
});

test('caro: 2 bot đánh tới khi có kết quả', async () => {
  const r = new CaroRoom({ code: 'C', name: 'c', theme: 'candy', isPublic: false, hooks: hooks() });
  r.addBot(); r.addBot();
  assert.equal(r.seats.length, 2);
  for (let k = 0; k < 5; k++) {
    r.start();
    let guard = 0;
    while (r.state === 'playing' && guard++ < 300) r.botMove(r.g.turn);
    assert.equal(r.state, 'ended');
    assert.equal(r.results.reduce((a, x) => a + x.delta, 0), 0);
  }
  r.destroy();
});

import { BauCuaRoom, TaiXiuRoom, settle } from '../public/game/dicebet.js';

test('bầu cua / tài xỉu: tính tiền', () => {
  // xúc xắc 1..6 = nai, bầu, gà, cá, cua, tôm
  assert.equal(settle('baucua', { cua: 2 }, [5, 5, 1]), 4);   // ra 2 con cua -> ăn 2 lần
  assert.equal(settle('baucua', { tom: 3 }, [1, 2, 3]), -3);
  assert.equal(settle('baucua', { nai: 1, ga: 1 }, [1, 4, 4]), 0);
  assert.equal(settle('taixiu', { tai: 5 }, [6, 5, 1]), 5);   // 12 = tài
  assert.equal(settle('taixiu', { xiu: 2 }, [6, 5, 1]), -2);
  assert.equal(settle('taixiu', { tai: 3 }, [4, 4, 4]), -3);  // bộ ba: nhà cái ăn
});

for (const [name, R] of [['bầu cua', BauCuaRoom], ['tài xỉu', TaiXiuRoom]]) {
  test(`${name}: 6 bot, 20 ván, nhà cái xoay vòng, tổng bằng 0`, () => {
    const r = new R({ code: 'D', name: 'd', theme: 'candy', isPublic: false, hooks: hooks() });
    for (let i = 0; i < 6; i++) r.addBot();
    const dealers = new Set();
    for (let k = 0; k < 20; k++) {
      r.start();
      dealers.add(r.g.dealer);
      r.seats.forEach((p, s) => { if (s !== r.g.dealer) r.botBet(s); });
      if (r.g.phase === 'bet') r.shake();
      r.ready(); r.open(); r.clearTimer('fin');
      r.finish(r.pendingRows);
      assert.equal(r.state, 'ended');
      assert.ok(Math.abs(r.results.reduce((a, x) => a + x.delta, 0)) < 0.01);
    }
    assert.ok(dealers.size >= 5);
    r.destroy();
  });
}

test('bầu cua: cược tối đa theo xu đang có', () => {
  const coins = { me: 35 };
  const r = new BauCuaRoom({ code: 'X', name: 'x', theme: 'candy', isPublic: false, hooks: { ...hooks(), getCoins: (id) => coins[id] ?? 1000 } });
  r.join({ id: 'host', name: 'H', avatar: '🐱' }); r.join({ id: 'me', name: 'M', avatar: '🐶' });
  r.start(); r.destroy();
  const me = r.seatOf('me') === r.g.dealer ? r.seatOf('host') : r.seatOf('me');
  if (r.seats[me].id === 'me') {
    assert.equal(r.action(me, { a: 'bet', on: 'cua', amt: 2 }), null);
    assert.ok(r.action(me, { a: 'bet', on: 'cua', amt: 2 }));   // 35 xu = 3 phần, đã 2 -> thêm 2 bị chặn
    assert.equal(r.action(me, { a: 'bet', on: 'tom', amt: 1 }), null);
  }
  r.destroy();
});

import { SpinRoom, SEGMENTS } from '../public/game/spin.js';
import { LiXiRoom, splitLixi } from '../public/game/lixi.js';

test('vòng quay: lần lượt quay, làm xong được sao', () => {
  const r = new SpinRoom({ code: 'S', name: 's', theme: 'candy', isPublic: false, hooks: hooks() });
  r.join({ id: 'host', name: 'H', avatar: '🐱' }); r.addBot(); r.addBot();
  assert.equal(r.start(), null);
  const order = [];
  for (let k = 0; k < 6; k++) {
    const s = r.g.turn; order.push(s);
    assert.ok(r.action((s + 1) % 3, { a: 'spin' }));       // chưa tới lượt
    assert.equal(r.action(s, { a: 'spin' }), null);
    assert.equal(r.g.phase, 'spinning');
    assert.ok(SEGMENTS[r.g.seg].list.includes(r.g.text));
    r.g.phase = 'task'; r.clearTimer('phase');
    r.action(s, { a: 'done' });
    assert.equal(r.g.stars[r.seats[s].id] >= 1, true);
  }
  assert.deepEqual(order, [0, 1, 2, 0, 1, 2]);
  r.destroy();
});

test('lì xì: chia đủ tổng, mỗi người 1 bao, tổng tiền bằng 0', () => {
  for (let k = 0; k < 200; k++) {
    const total = [200, 500, 1000, 37][k % 4], n = 2 + (k % 9);
    const a = splitLixi(total, n, total >= n * 10 ? 10 : 1);
    assert.equal(a.length, n);
    assert.equal(a.reduce((x, y) => x + y, 0), total);
    assert.ok(a.every((x) => x >= 1));
  }
  const coins = { host: 1000 };
  const r = new LiXiRoom({ code: 'L', name: 'l', theme: 'candy', isPublic: false, hooks: { ...hooks(), getCoins: (id) => coins[id] ?? 1000, addCoins: (id, d) => { coins[id] = (coins[id] ?? 1000) + d; } } });
  r.join({ id: 'host', name: 'H', avatar: '🐱' }); r.join({ id: 'me', name: 'M', avatar: '🐶' }); r.addBot();
  r.start();
  assert.ok(r.action(1, { a: 'deal' }));                  // không phải chủ phòng
  assert.ok(r.action(0, { a: 'setup', total: 5000, count: 4 }) === null && r.action(0, { a: 'deal' })); // quá số xu
  r.action(0, { a: 'setup', total: 500, count: 4 });
  assert.equal(r.action(0, { a: 'deal' }), null);
  assert.ok(r.action(0, { a: 'grab', i: 0 }));            // người phát không được giành
  assert.equal(r.action(1, { a: 'grab', i: 1 }), null);
  assert.ok(r.action(1, { a: 'grab', i: 2 }));            // 1 người 1 bao
  r.action(2, { a: 'grab', i: 3 });
  r.reveal();
  assert.equal(r.g.phase, 'done');
  const got = r.g.envs[1].amt + r.g.envs[3].amt;
  assert.equal(coins.host, 1000 - got);
  assert.equal(coins.me, 1000 + r.g.envs[1].amt);
  assert.ok(Math.abs(r.g.rows.reduce((a, x) => a + x.delta, 0)) < 0.01);
  assert.equal(r.action(0, { a: 'again' }), null);
  assert.equal(r.g.phase, 'setup');
  r.action(0, { a: 'auto' });
  assert.ok(r.g.total > 0 && r.g.count >= 1);
  // Tiền thật: mệnh giá 10k, mỗi bao chẵn 10k, ghi sổ, không trừ xu
  r.action(0, { a: 'setup', mode: 'tien', step: 10 });
  assert.equal(r.g.total % 10, 0);
  assert.ok(r.action(0, { a: 'setup', total: 25, count: 2 }) === null && r.action(0, { a: 'deal' })); // không chia hết 10k
  r.action(0, { a: 'setup', total: 200, count: 3 });
  const before = coins.host;
  assert.equal(r.action(0, { a: 'deal' }), null);
  assert.ok(r.g.envs.every((e) => e.amt % 10 === 0 && e.amt >= 10));
  r.action(1, { a: 'grab', i: 0 }); r.reveal();
  assert.equal(coins.host, before);
  assert.ok(r.ledger.games.length === 1 && r.ledger.games[0].label === 'k');
  r.destroy();
});

import { DuoiHinhRoom, PUZZLES, isRight, maskAnswer } from '../public/game/duoihinh.js';
import { DuaThuRoom, makeRace, progressAt, ANIMALS } from '../public/game/duathu.js';

test('đuổi hình bắt chữ: so đáp án không dấu, gợi ý, chấm điểm', () => {
  const p = ['🐟 ➡️ 🐉', 'cá chép hoá rồng', 'Thành ngữ'];
  assert.ok(isRight('Cá chép hóa rồng', p));
  assert.ok(isRight('ca chep hoa rong', p));
  assert.ok(!isRight('cá chép', p));
  assert.equal(maskAnswer('lì xì', 0, [0, 1, 3, 4]), '__ __');
  assert.ok(PUZZLES.every((x) => x[0] && x[1] && x[2]));
  const r = new DuoiHinhRoom({ code: 'D', name: 'd', theme: 'candy', isPublic: false, hooks: hooks() });
  r.join({ id: 'host', name: 'H', avatar: '🐱' }); r.join({ id: 'b', name: 'B', avatar: '🐶' });
  r.start(); r.destroy();
  const ans = PUZZLES[r.g.list[0]][1];
  r.action(1, { a: 'guess', text: 'sai bét' });
  assert.equal(r.g.feed[0].ok, false);
  r.action(1, { a: 'guess', text: ans }); r.action(0, { a: 'guess', text: ans });
  assert.equal(r.g.score.b, 6); assert.equal(r.g.score.host, 5); // người đầu +5 (+1 chưa gợi ý), người sau +4 (+1)
  r.destroy();
  while (r.state === 'playing') { r.reveal(); r.destroy(); r.next(); r.destroy(); }
  assert.equal(r.state, 'ended');
  assert.equal(r.results[0].seat, 1);
});

test('đua thú: đường chạy hợp lệ, chọn thú, người có thú về trước ăn hũ', () => {
  const race = makeRace(ANIMALS.length);
  race.forEach((x) => { assert.equal(progressAt(x, 0), 0); assert.equal(progressAt(x, x.T), 1); assert.ok(progressAt(x, x.T / 2) > 0 && progressAt(x, x.T / 2) < 1); });
  for (let k = 0; k < 10; k++) {
    const r = new DuaThuRoom({ code: 'R', name: 'r', theme: 'candy', isPublic: false, hooks: hooks() });
    r.join({ id: 'host', name: 'H', avatar: '🐱' }); r.addBot(); r.addBot();
    r.start(); r.destroy();
    assert.equal(r.action(0, { a: 'pick', i: 3 }), null);
    assert.ok(r.action(1, { a: 'pick', i: 3 }));              // con này có người chọn rồi
    r.go(); r.destroy();
    assert.equal(Object.keys(r.g.pick).length, 3);
    r.settle();
    assert.equal(r.state, 'ended');
    const sum = r.results.reduce((a, x) => a + x.delta, 0);
    assert.ok(Math.abs(sum) < 0.01);
    const best = r.results.find((x) => x.rank === 1);
    const firstOwned = r.g.order.find((i) => Object.values(r.g.pick).includes(i));
    assert.equal(r.g.pick[best.seat], firstOwned);
    assert.equal(best.parts, 2);
  }
});

test('lì xì: xin xăm mỗi vòng 1 quẻ', () => {
  const r = new LiXiRoom({ code: 'X', name: 'x', theme: 'candy', isPublic: false, hooks: hooks() });
  r.join({ id: 'host', name: 'H', avatar: '🐱' }); r.addBot();
  r.start();
  assert.equal(r.action(1, { a: 'xam' }), null);
  assert.ok(r.action(1, { a: 'xam' }));
  assert.ok(r.viewFor('host').lx.xam[1] != null);
  r.destroy();
});
