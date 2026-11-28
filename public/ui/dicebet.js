// Giao diện 🦀 Bầu Cua & 🎲 Tài Xỉu: chiếu đỏ ngày Tết, đĩa + bát lắc, ô đặt cược, chip 1/2/5.
import { avaHTML } from '../ava.js';
import { showDice } from '../dice.js';
import { BC_FACES, BC_ICON, BC_NAME } from '../game/dicebet.js';

const BC_LABELS = { 1: BC_ICON.nai, 2: BC_ICON.bau, 3: BC_ICON.ga, 4: BC_ICON.ca, 5: BC_ICON.cua, 6: BC_ICON.tom };
let ui = null;
let chip = 1;
let lastPhase = '';

export function reset() { ui = null; lastPhase = ''; }

function build(board, s, ctx) {
  const kind = s.game;
  const opts = kind === 'baucua'
    ? BC_FACES.map((f) => ({ id: f, icon: BC_ICON[f], name: BC_NAME[f] }))
    : [{ id: 'xiu', icon: '🔵', name: 'XỈU', sub: 'Tổng 4 – 10' }, { id: 'tai', icon: '🔴', name: 'TÀI', sub: 'Tổng 11 – 17' }];
  board.innerHTML = `
    <div class="db-players"></div>
    <div class="db-plate-wrap"><div class="db-plate"><div class="db-dice"></div><div class="db-bowl"><i></i></div></div><div class="db-sum"></div></div>
    <div class="db-mat ${kind}">${opts.map((o) => `<button class="db-opt" data-on="${o.id}"><span class="ic">${o.icon}</span><b>${o.name}</b>${o.sub ? `<small>${o.sub}</small>` : ''}<span class="tot"></span><span class="who"></span><span class="mine"></span></button>`).join('')}</div>`;
  const u = { board, kind, players: board.querySelector('.db-players'), bowl: board.querySelector('.db-bowl'), dice: board.querySelector('.db-dice'), sum: board.querySelector('.db-sum'), opts: {} };
  board.querySelectorAll('.db-opt').forEach((b) => {
    u.opts[b.dataset.on] = b;
    b.onclick = () => { ctx.socket.emit('act', { a: 'bet', on: b.dataset.on, amt: chip }); ctx.sfx.coin(); b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap'); };
  });
  return u;
}

export function render(s, prev, ctx) {
  const board = ctx.$('#board');
  const db = s.db;
  if (!db) { board.className = 'hidden'; board.innerHTML = ''; ui = null; ctx.banner('', false); return; }
  board.className = 'dicebet';
  if (!ui || !board.contains(ui.bowl) || ui.kind !== s.game) ui = build(board, s, ctx);
  const me = s.mySeat;
  const isDealer = me === db.dealer;

  // Người chơi
  ui.players.innerHTML = '';
  s.seats.forEach((p, k) => {
    if (!p || !db.players[k]) return;
    const d = document.createElement('div');
    d.className = 'db-p' + (k === db.dealer ? ' dealer' : '') + (k === me ? ' me' : '') + (db.players[k].done ? ' done' : '');
    const res = s.state === 'ended' && s.results ? s.results.find((r) => r.seat === k) : null;
    d.innerHTML = `<span class="av">${avaHTML(p.avatar, p.acc)}</span><span class="nm"></span><span class="bt">${k === db.dealer ? '🎩 Cái' : res ? (res.delta > 0 ? '+' : '') + res.delta : db.players[k].bet ? '🪙' + db.players[k].bet : '…'}</span>`;
    d.querySelector('.nm').textContent = p.name;
    if (res) d.classList.add(res.delta > 0 ? 'win' : res.delta < 0 ? 'lose' : 'even');
    ui.players.appendChild(d);
  });

  // Ô cược: tổng cả bàn + của mình; ô trúng sáng lên khi mở bát
  const dice = db.dice;
  const winSet = new Set();
  if (dice) {
    if (s.game === 'baucua') dice.forEach((d) => winSet.add(BC_FACES[d - 1]));
    else { const sum = dice[0] + dice[1] + dice[2]; if (!(dice[0] === dice[1] && dice[1] === dice[2])) winSet.add(sum >= 11 ? 'tai' : 'xiu'); }
  }
  Object.entries(ui.opts).forEach(([f, b]) => {
    b.querySelector('.tot').textContent = db.totals[f] ? `Tổng: ${db.totals[f]}` : '';
    // Ai đặt ô này: avatar + số tiền
    const who = b.querySelector('.who');
    const list = (db.by && db.by[f]) || [];
    const key = list.map((x) => x.seat + ':' + x.amt).join(',');
    if (who.dataset.key !== key) {
      who.dataset.key = key;
      who.innerHTML = '';
      list.sort((a, c) => c.amt - a.amt).forEach((x) => {
        const p = s.seats[x.seat];
        if (!p) return;
        const t = document.createElement('span');
        t.className = 'bettor' + (x.seat === me ? ' me' : '');
        t.title = p.name;
        t.innerHTML = `<i>${avaHTML(p.avatar, p.acc)}</i><b>${x.amt}</b>`;
        who.appendChild(t);
      });
    }
    b.querySelector('.mine').textContent = db.myBets[f] ? `🪙 ${db.myBets[f]}` : '';
    b.classList.toggle('has', !!db.myBets[f]);
    b.classList.toggle('win', !!dice && winSet.has(f));
    b.classList.toggle('lose', !!dice && !winSet.has(f));
    b.disabled = db.phase !== 'bet' || isDealer || s.state !== 'playing';
  });

  // Bát + hột
  const phase = s.state === 'ended' ? 'open' : db.phase;
  if (dice) showDice(ui.dice, dice, s.game === 'baucua' ? BC_LABELS : null);
  else if (!ui.dice.children.length) showDice(ui.dice, [1, 2, 3], s.game === 'baucua' ? BC_LABELS : null);
  ui.bowl.classList.toggle('shaking', phase === 'shake');
  ui.bowl.classList.toggle('lifted', phase === 'open');
  ui.dice.classList.toggle('hide', phase !== 'open');
  ui.sum.textContent = dice && s.game === 'taixiu' ? (dice[0] === dice[1] && dice[1] === dice[2] ? `Bộ ba ${dice[0]}! Nhà cái ăn hết 🎩` : `Tổng ${dice[0] + dice[1] + dice[2]} · ${dice[0] + dice[1] + dice[2] >= 11 ? 'TÀI' : 'XỈU'}`) : '';
  if (phase !== lastPhase) {
    lastPhase = phase;
    if (phase === 'shake') { ctx.sfx.diceShake(); setTimeout(() => ctx.sfx.diceShake(), 350); setTimeout(() => ctx.sfx.diceShake(), 700); }
  }

  // Nút
  const box = ctx.$('#stageMine');
  box.innerHTML = '';
  if (s.state !== 'playing') return ctx.banner('', false);
  const dealerName = s.seats[db.dealer] ? s.seats[db.dealer].name : '';
  if (db.phase === 'bet' && !isDealer) {
    const chips = document.createElement('div');
    chips.className = 'db-chips';
    [1, 5, 10, 50].forEach((v) => {
      const b = document.createElement('button');
      b.className = 'db-chip c' + v + (chip === v ? ' sel' : '');
      b.textContent = v;
      b.onclick = () => { chip = v; ctx.sfx.select(); render(s, prev, ctx); };
      chips.appendChild(b);
    });
    const clear = document.createElement('button'); clear.className = 'btn soft'; clear.textContent = '↩️ Xoá';
    clear.onclick = () => { ctx.socket.emit('act', { a: 'clear' }); ctx.sfx.deselect(); };
    const done = document.createElement('button'); done.className = 'btn big pink'; done.textContent = db.done ? '✅ Đã xong' : '👌 Xong';
    done.disabled = db.done;
    done.onclick = () => { ctx.socket.emit('act', { a: 'done' }); ctx.sfx.pop(); };
    chips.append(clear, done);
    box.appendChild(chips);
    ctx.banner(db.myCap <= 0 ? '🥲 Hết xu rồi · ra sảnh bấm 🧧 Nhận lì xì nha' : (db.myCap >= 100000 ? `🪙 Đã cược ${db.myTotal} phần` : `🪙 Đã cược ${db.myTotal}/${db.myCap} phần`) + ` · lắc sau <span class="db-left"></span>s`, true, true);
  } else if (db.phase === 'bet' && isDealer) {
    const b = document.createElement('button'); b.className = 'btn big pink'; b.textContent = '🥣 Lắc luôn';
    b.onclick = () => ctx.socket.emit('act', { a: 'shake' });
    box.appendChild(b);
    ctx.banner('🎩 Bạn làm nhà cái · chờ mọi người đặt cược… <span class="db-left"></span>s', true, true);
  } else if (db.phase === 'ready' && isDealer) {
    const b = document.createElement('button'); b.className = 'btn big pink db-open'; b.textContent = '🫣 Mở bát!';
    b.onclick = () => { ctx.socket.emit('act', { a: 'open' }); ctx.sfx.pop(); };
    box.appendChild(b);
    ctx.banner('🎩 Hồi hộp chưa? Mở bát đi nhà cái!', true);
  } else if (db.phase === 'shake') ctx.banner('🥣 Đang lắc bát… lốc cốc lốc cốc', false);
  else if (db.phase === 'ready') ctx.banner(`🫣 Chờ ${dealerName} mở bát…`, false);
  else ctx.banner('', false);
}

export function tick(s, ctx) {
  const el = document.querySelector('.db-left');
  if (el && s.db && s.db.phase === 'bet') el.textContent = Math.max(0, Math.ceil((s.deadline - ctx.now()) / 1000));
}

export function onEvent(ev, ctx) {
  if (ev.kind !== 'db') return;
  if (ev.what === 'bet') ctx.toast(`🎩 ${ctx.nameOf(ev.dealer)} làm nhà cái · đặt cược đi nào!`);
  if (ev.what === 'chip' && ev.seat !== ctx.mySeat()) ctx.sfx.select();
  if (ev.what === 'nobet') ctx.toast('Chưa ai đặt cược, chờ thêm chút nha 🪙');
  if (ev.what === 'open') {
    ctx.sfx.diceHit(0); setTimeout(() => ctx.sfx.diceHit(1), 120);
    const d = ev.dice;
    if (d[0] === d[1] && d[1] === d[2]) setTimeout(() => { ctx.bigText('BỘ BA! 🎉', true); ctx.sfx.bigCombo(); }, 500);
  }
}
