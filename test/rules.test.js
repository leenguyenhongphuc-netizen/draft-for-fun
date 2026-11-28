import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCombo, canBeat, checkInstantWin, allPlays } from '../public/shared/rules.js';
import { Room } from '../public/game/room.js';

// helper: rank index (0='3'..12='2'), suit (0..3)
const c = (r, s) => r * 4 + s;

test('nhận diện bộ', () => {
  assert.equal(getCombo([c(0, 0)]).type, 'single');
  assert.equal(getCombo([c(5, 0), c(5, 3)]).type, 'pair');
  assert.equal(getCombo([c(0, 0), c(1, 2), c(2, 1)]).type, 'straight');
  assert.equal(getCombo([c(10, 0), c(11, 2), c(12, 1)]), null, 'sảnh không có heo');
  assert.equal(getCombo([c(3, 0), c(3, 1), c(4, 0), c(4, 1), c(5, 2), c(5, 3)]).type, 'pairseq');
  assert.equal(getCombo([c(7, 0), c(7, 1), c(7, 2), c(7, 3)]).type, 'quad');
  assert.equal(getCombo([c(1, 0), c(2, 0)]), null);
});

test('so bài & chặt', () => {
  const two = getCombo([c(12, 0)]);
  assert.ok(canBeat(two, getCombo([c(12, 3)])));
  assert.ok(canBeat(getCombo([c(5, 0)]), getCombo([c(5, 1)])), 'cùng số khác chất');
  assert.ok(!canBeat(getCombo([c(5, 1)]), getCombo([c(5, 0)])));
  const threePairs = getCombo([c(3, 0), c(3, 1), c(4, 0), c(4, 1), c(5, 2), c(5, 3)]);
  const quad = getCombo([c(0, 0), c(0, 1), c(0, 2), c(0, 3)]);
  assert.ok(canBeat(two, threePairs));
  assert.ok(canBeat(two, quad));
  assert.ok(canBeat(threePairs, quad));
  assert.ok(!canBeat(getCombo([c(12, 0), c(12, 1)]), threePairs));
  const fourPairs = getCombo([c(0, 0), c(0, 1), c(1, 0), c(1, 1), c(2, 0), c(2, 1), c(3, 2), c(3, 3)]);
  assert.ok(canBeat(quad, fourPairs));
  assert.ok(canBeat(getCombo([c(12, 0), c(12, 1)]), fourPairs));
  assert.ok(!canBeat(getCombo([c(4, 0)]), quad), 'tứ quý không chặt rác');
  assert.ok(!canBeat(getCombo([c(0, 0), c(1, 0), c(2, 0)]), getCombo([c(1, 1), c(2, 1), c(3, 0), c(4, 0)])), 'sảnh khác độ dài');
});

test('tới trắng', () => {
  assert.equal(checkInstantWin([c(12, 0), c(12, 1), c(12, 2), c(12, 3), 0, 4, 8, 13, 17, 21, 25, 29, 33]), 'Tứ quý heo');
  const dragon = [...Array(12).keys()].map((r) => c(r, 0)).concat([c(0, 1)]);
  assert.equal(checkInstantWin(dragon), 'Sảnh rồng');
  assert.equal(checkInstantWin([0, 1, 8, 13, 17, 21, 26, 30, 34, 38, 42, 46, 51]), null);
});

test('gợi ý tìm được bộ đè', () => {
  const hand = [c(5, 0), c(6, 1), c(7, 2), c(8, 0), c(9, 0)];
  const plays = allPlays(hand, getCombo([c(0, 0), c(1, 0), c(2, 0)]));
  assert.ok(plays.length > 0 && plays.every((p) => p.type === 'straight' && p.len === 3));
});

test('ván 4 bot chơi đến hết', async () => {
  let ended = null;
  const coins = {};
  const room = new Room({
    code: 'TEST', name: 't', theme: 'candy', isPublic: false,
    hooks: { emitState() {}, emitEvent(_r, ev) { if (ev.kind === 'end') ended = ev; }, getCoins: (id) => (coins[id] ??= 1000), addCoins: (id, n) => (coins[id] = (coins[id] ?? 1000) + n) },
  });
  for (let i = 0; i < 4; i++) room.addBot();
  // Chơi nhanh: gọi autoMove trực tiếp thay vì chờ timer
  for (let g = 0; g < 20; g++) {
    ended = null;
    room.start();
    let guard = 0;
    while (room.state === 'playing' && guard++ < 2000) room.autoMove(room.game.turn);
    assert.equal(room.state, 'ended');
    assert.ok(ended && ended.results.length === 4);
    assert.equal(ended.results.reduce((s, r) => s + r.delta, 0) <= 0, true);
  }
  room.destroy();
});

import { finishViolation, chopValue, settleDebts, normalizeSettings, bombsInHand } from '../public/shared/rules.js';

test('luật về heo / về hàng', () => {
  const st = normalizeSettings({ noTwoLast: true, noBombLast: true });
  assert.ok(finishViolation(1, getCombo([c(12, 0)]), st));
  assert.equal(finishViolation(2, getCombo([c(12, 0)]), st), null, 'chưa phải lá cuối');
  assert.ok(finishViolation(4, getCombo([c(5, 0), c(5, 1), c(5, 2), c(5, 3)]), st));
  assert.equal(finishViolation(1, getCombo([c(11, 0)]), st), null);
});

test('giá trị chặt, thối hàng, trả nợ', () => {
  assert.equal(chopValue(getCombo([c(12, 0)])), 1);
  assert.equal(chopValue(getCombo([c(12, 3)])), 2);
  assert.equal(chopValue(getCombo([c(12, 1), c(12, 2)])), 3);
  assert.deepEqual(bombsInHand([c(4, 0), c(4, 1), c(4, 2), c(4, 3), c(0, 0)]), { quads: 1, pairSeqs: 0 });
  const plan = settleDebts({ a: 30, b: -10, c: -20 });
  assert.equal(plan.reduce((s, x) => s + x.amount, 0), 30);
  assert.ok(plan.every((x) => x.to === 'a'));
});

test('ván bot với đủ luật + ghi nợ: tổng luôn bằng 0, không ai về heo hợp lệ', () => {
  const room = new Room({
    code: 'DEBT', name: 't', theme: 'candy', isPublic: false,
    hooks: { emitState() {}, emitEvent() {}, getCoins: () => 1000, addCoins() {} },
  });
  for (let i = 0; i < 4; i++) room.addBot();
  room.setSettings({ debt: true, unit: 5, noTwoLast: true, noBombLast: true, mustStart3: true });
  for (let g = 0; g < 40; g++) {
    room.start();
    const lastPlays = {};
    const orig = room.hooks.emitEvent;
    room.hooks.emitEvent = (_r, ev) => { if (ev.kind === 'play') lastPlays[ev.seat] = ev; if (ev.kind === 'out' && !ev.bad) {
      const lp = lastPlays[ev.seat];
      assert.ok(!lp.cards.some((x) => Math.floor(x / 4) === 12), 'về bằng heo mà không bị phạt');
    } };
    let guard = 0;
    while (room.state === 'playing' && guard++ < 3000) room.autoMove(room.game.turn);
    room.hooks.emitEvent = orig;
    assert.equal(room.state, 'ended');
    assert.equal(room.results.reduce((s, r) => s + r.delta, 0), 0, 'tổng tiền một ván phải bằng 0');
  }
  const totals = Object.values(room.ledger.players).reduce((s, p) => s + p.total, 0);
  assert.equal(totals, 0);
  assert.equal(room.ledger.games.length, 30);
  room.destroy();
});

test('tiến lên 3 người: nhì được +1 (mặc định), tổng bằng 0', () => {
  const room = new Room({ code: 'P3', name: 't', theme: 'candy', isPublic: false, hooks: { emitState() {}, emitEvent() {}, getCoins: () => 1000, addCoins() {} } });
  for (let i = 0; i < 3; i++) room.addBot();
  room.setSettings({ cong: false, penalty: false, chopPay: false, instantWin: false });
  for (let g = 0; g < 10; g++) {
    room.start();
    let guard = 0;
    while (room.state === 'playing' && guard++ < 3000) room.autoMove(room.game.turn);
    const byRank = room.results.map((r) => r.delta);
    assert.deepEqual(byRank, [20, 10, -30]);
  }
  room.destroy();
});

test('chặt chồng: đè 3 đôi thông bằng 3 đôi thông lớn hơn, người bị chặt cuối trả hết', () => {
  const room = new Room({ code: 'CC', name: 't', theme: 'candy', isPublic: false, hooks: { emitState() {}, emitEvent() {}, getCoins: () => 1000, addCoins() {} } });
  for (let i = 0; i < 3; i++) room.addBot();
  room.start(); room.destroy();
  const g = room.game;
  // A (0) đánh heo cơ (2 phần), B (1) chặt bằng 3 đôi thông 3-4-5, A chặt lại bằng 3 đôi thông 6-7-8
  g.hands[0] = [c(12, 3), c(3, 0), c(3, 1), c(4, 0), c(4, 1), c(5, 0), c(5, 1), c(10, 0)];
  g.hands[1] = [c(0, 0), c(0, 1), c(1, 0), c(1, 1), c(2, 0), c(2, 1), c(9, 0)];
  g.hands[2] = [c(8, 0), c(8, 1)];
  g.turn = 0; g.lastPlay = null; g.passed = new Set(); g.startCard = null;
  assert.equal(room.play(0, [c(12, 3)]), null);
  room.destroy(); g.turn = 1;
  assert.equal(room.play(1, [c(0, 0), c(0, 1), c(1, 0), c(1, 1), c(2, 0), c(2, 1)]), null);
  room.destroy(); g.turn = 0;
  assert.equal(room.play(0, [c(3, 0), c(3, 1), c(4, 0), c(4, 1), c(5, 0), c(5, 1)]), null);
  room.destroy();
  assert.deepEqual(g.chops.map((x) => [x.from, x.to, x.parts]), [[1, 0, 5]]);
});
