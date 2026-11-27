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
    if (g.phase === 'wait') { room.clearTimer('turn'); room.endTurn(g.dice === 6 && g.lastMove && g.lastMove.seat === g.turn ? true : g.dice === 6); return; }
    room.autoMove(g.turn);
  });
  assert.ok(r.g.horses.some((hs) => hs.every((x) => x === FINISH)));
});
