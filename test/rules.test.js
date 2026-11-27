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
