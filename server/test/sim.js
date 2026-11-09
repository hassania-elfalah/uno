// Integration test: 3 real socket clients play a full game against the real server.
const { io } = require('socket.io-client'); const URL = process.env.TEST_URL || 'http://localhost:3001';
const assert = require('assert'), COLORS = ['red', 'blue', 'green', 'yellow'];
const post = (p, b) => fetch(URL + '/api' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
const run = async () => {
  const tag = Date.now().toString(36).slice(-5);
  const cl = [];
  for (const n of ['a', 'b', 'c']) {
    const { token, user } = await post('/register', { username: `${n}${tag}`, password: 'pass' });
    const s = io(URL, { auth: { token } }); const c = { s, user, room: null, id: user.id };
    s.on('room:update', r => { c.room = r; c.onUpdate?.(r); }); cl.push(c);
  }
  const em = (c, ev, d) => new Promise(r => c.s.emit(ev, d, r));
  const { code } = await em(cl[0], 'room:create');
  assert((await em(cl[1], 'room:join', { code: 'ZZZZZ' })).error, 'bad code rejected');
  await em(cl[1], 'room:join', { code }); await em(cl[2], 'room:join', { code });
  assert((await em(cl[1], 'game:start')).error, 'non-host cannot start');
  await em(cl[0], 'game:start'); await new Promise(r => setTimeout(r, 200));
  assert(cl.every(c => c.room.game.hand.length === 7), '7 cards each');
  const cur = cl.find(c => c.id === cl[0].room.game.current), other = cl.find(c => c !== cur);
  assert((await em(other, 'game:play', { cardId: other.room.game.hand[0].id, color: 'red' })).error, 'out-of-turn rejected');
  assert((await em(cur, 'game:play', { cardId: 99999 })).error, 'fake card rejected');
  // random legal-play bot loop driven only by server responses
  let moves = 0, done = false;
  const step = async c => {
    const g = c.room?.game; if (!g || g.winner || g.current !== c.id) return;
    moves++; if (g.hand.length <= 2) await em(c, 'game:uno');
    for (const card of g.hand) { if (g.drawn !== null && card.id !== g.drawn) continue;
      if ((await em(c, 'game:play', { cardId: card.id, color: COLORS[moves % 4] })).ok) return; }
    if (g.drawn === null) await em(c, 'game:draw'); else await em(c, 'game:pass');
  };
  cl.forEach(c => (c.onUpdate = r => { if (r.phase === 'finished') done = true; else setTimeout(() => step(c), 0); }));
  cl.forEach(step);
  for (let i = 0; i < 600 && !done; i++) await new Promise(r => setTimeout(r, 100));
  assert(done, 'game finished'); const w = cl[0].room.game.winner;
  assert(cl.find(c => c.id === w).room.game.hand.length === 0, 'winner has no cards');
  // reconnect: drop a client, reconnect with same token, state restored
  cl[1].s.disconnect(); await new Promise(r => setTimeout(r, 200));
  const t = Object.values(require('../data/users.json').tokens), re = io(URL, { auth: { token: Object.keys(require('../data/users.json').tokens).find(k => require('../data/users.json').tokens[k] === cl[1].id) } });
  const back = await new Promise(r => re.on('room:update', r));
  assert(back && back.code === code, 'reconnect restores room');
  cl.forEach(c => (c.onUpdate = null));
  assert((await em(cl[0], 'game:restart')).ok, 'host restarts'); await new Promise(r => setTimeout(r, 200));
  assert(cl[0].room.phase === 'playing' && cl[0].room.game.hand.length === 7, 'new game dealt');
  assert((await em(cl[0], 'room:computer')).ok, 'create computer game');
  await new Promise(r => setTimeout(r, 100));
  assert(cl[0].room.mode === 'computer' && cl[0].room.players.some(p => p.isComputer), 'computer game starts with an opponent');
  const humanId = cl[0].id;
  assert(cl[0].room.game.current === humanId, 'human starts the computer game');
  for (let turn = 0; turn < 8 && cl[0].room.game.current === humanId; turn++) {
    const g = cl[0].room.game, canPlay = c => c.color === 'wild' || c.color === g.color || c.value === g.top.value;
    if (g.hand.length <= 2) await em(cl[0], 'game:uno');
    const card = g.hand.find(c => canPlay(c) && !['skip', 'reverse', 'draw2', 'wild4'].includes(c.value)) || g.hand.find(canPlay);
    if (card) await em(cl[0], 'game:play', { cardId: card.id, color: card.color === 'wild' ? COLORS[0] : undefined });
    else {
      await em(cl[0], 'game:draw');
      if (cl[0].room.game.current === humanId && cl[0].room.game.drawn !== null) await em(cl[0], 'game:pass');
    }
  }
  assert(cl[0].room.game.current !== humanId, 'human action passes turn to computer');
  const priorLog = cl[0].room.game.log.join('|');
  for (let i = 0; i < 30 && cl[0].room.game.log.join('|') === priorLog; i++) await new Promise(r => setTimeout(r, 100));
  assert(cl[0].room.game.log.join('|') !== priorLog, 'computer takes its turn');
  console.log(`PASS — full game finished in ${moves} bot moves, winner ${w.slice(0, 6)}, restart + reconnect + computer game OK`); process.exit(0);
};
run().catch(e => { console.error('FAIL', e.message); process.exit(1); });
