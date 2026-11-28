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
