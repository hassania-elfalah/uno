const game = require('./game');
const rooms = new Map(), byUser = new Map(), botTimers = new Map(); let io;
const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { let s; do s = Array.from({ length: 5 }, () => CH[Math.floor(Math.random() * CH.length)]).join(''); while (rooms.has(s)); return s; };
const get = uid => rooms.get(byUser.get(uid));

function view(r, uid) {
  return { code: r.code, host: r.host, mode: r.mode, phase: r.phase, me: uid, game: r.g ? game.view(r.g, uid) : null,
    players: r.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, connected: p.connected, isComputer: !!p.isComputer, count: r.g?.hands[p.id]?.length ?? 0 })) };
}
const broadcast = r => r.players.forEach(p => p.sid && io.to(p.sid).emit('room:update', view(r, p.id)));
const addPlayer = (r, u, sid) => { r.players.push({ id: u.id, name: u.name, avatar: u.avatar, sid, connected: true }); byUser.set(u.id, r.code); broadcast(r); };

function create(u, sid) {
  leave(u.id);
  const r = { code: newCode(), host: u.id, mode: 'multiplayer', phase: 'lobby', players: [], g: null };
  rooms.set(r.code, r); addPlayer(r, u, sid); return { ok: true, code: r.code };
}
function createComputer(u, sid) {
  leave(u.id);
  const code = newCode(), botId = `computer-${code}`;
  const r = { code, host: u.id, mode: 'computer', phase: 'playing', g: null, players: [
    { id: u.id, name: u.name, avatar: u.avatar, sid, connected: true },
    { id: botId, name: 'Computer', avatar: '🤖', sid: null, connected: true, isComputer: true }
  ] };
  rooms.set(code, r); byUser.set(u.id, code);
  r.g = game.create([u.id, botId]);
  broadcast(r);
  return { ok: true, code };
}
function join(u, sid, code) {
  const r = rooms.get(code); if (!r) return { error: 'Room not found — check the code' };
  if (byUser.get(u.id) === code) { reconnect(u, sid); return { ok: true, code }; }
  if (r.phase !== 'lobby') return { error: 'That game has already started' };
  if (r.players.length >= 4) return { error: 'Room is full (4 players max)' };
  leave(u.id); addPlayer(r, u, sid); return { ok: true, code };
}
function reconnect(u, sid) {
  const r = get(u.id); if (!r) return;
  const p = r.players.find(x => x.id === u.id); p.sid = sid; p.connected = true; delete p.dcAt; broadcast(r);
}
function disconnect(uid, sid) {
  const r = get(uid), p = r?.players.find(x => x.id === uid);
  if (p && p.sid === sid) { p.connected = false; p.sid = null; p.dcAt = Date.now(); broadcast(r); }
}
function leave(uid) {
  const r = get(uid); if (!r) return;
  const p = r.players.find(x => x.id === uid); byUser.delete(uid);
  r.players = r.players.filter(x => x.id !== uid);
  if (p?.sid) io.to(p.sid).emit('room:update', null);
  if (!r.players.length || !r.players.some(x => !x.isComputer)) {
    clearTimeout(botTimers.get(r.code)); botTimers.delete(r.code); rooms.delete(r.code); return;
  }
  if (r.host === uid) r.host = r.players[0].id;
  if (r.phase === 'playing') {
    if (r.players.length < 2) { r.g.winner = r.players[0].id; r.g.log.push(`${r.g.winner}|wins — everyone else left`); r.phase = 'finished'; }
    else game.remove(r.g, uid);
  }
  broadcast(r);
}
function begin(r) {
  r.players.filter(p => !p.connected).forEach(p => byUser.delete(p.id));
  r.players = r.players.filter(p => p.connected);
  if (r.players.length < 2) return false;
  r.g = game.create(r.players.map(p => p.id)); r.phase = 'playing'; return true;
}
function botMove(r) {
  const g = r.g, id = g.order[g.turn], p = r.players.find(x => x.id === id);
  if (!p?.isComputer || r.phase !== 'playing') return;

  if (g.unoPending && g.unoPending !== id) {
    const err = game.catchUno(g, id);
    if (err) throw new Error(err);
    broadcast(r); scheduleBot(r); return;
  }

  const hand = g.hands[id];
  const playable = hand.filter(c => (g.drawn === null || g.drawn === c.id) &&
    (c.color === 'wild' || c.color === g.color || c.value === g.discard[g.discard.length - 1].value));
  if (!playable.length) {
    const err = g.drawn === null ? game.drawCard(g, id) : game.pass(g, id);
    if (err) throw new Error(err);
  } else {
    if (hand.length <= 2) {
      const err = game.uno(g, id);
      if (err) throw new Error(err);
    }
    const card = playable.sort((a, b) => {
      const colorCount = c => hand.filter(x => x.id !== c.id && x.color === c.color).length;
      return colorCount(b) - colorCount(a);
    })[0];
    const color = card.color === 'wild'
      ? ['red', 'blue', 'green', 'yellow'].map(c => [c, hand.filter(x => x.id !== card.id && x.color === c).length])
        .sort((a, b) => b[1] - a[1])[0][0]
      : undefined;
    const err = game.play(g, id, card.id, color);
    if (err) throw new Error(err);
  }

  if (g.winner) r.phase = 'finished';
  broadcast(r);
  scheduleBot(r);
}
function scheduleBot(r) {
  if (r.mode !== 'computer' || r.phase !== 'playing' || !r.g ||
      !r.players[r.g.turn]?.isComputer || botTimers.has(r.code)) return;
  const timer = setTimeout(() => {
    botTimers.delete(r.code);
    if (r.phase === 'playing' && r.g && r.players[r.g.turn]?.isComputer) {
      try { botMove(r); } catch (e) { console.error('Computer turn failed:', e); }
    }
  }, 650);
  botTimers.set(r.code, timer);
}
function start(uid) {
  const r = get(uid); if (!r) return { error: 'Not in a room' };
  if (r.host !== uid) return { error: 'Only the host can start' };
  if (r.phase !== 'lobby') return { error: 'Already started' };
  if (!begin(r)) return { error: 'Need at least 2 connected players' };
  broadcast(r);
}
function restart(uid) {
  const r = get(uid); if (!r) return { error: 'Not in a room' };
  if (r.host !== uid) return { error: 'Only the host can restart' };
  if (r.phase !== 'finished') return { error: 'Game is not finished' };
  if (!begin(r)) { r.phase = 'lobby'; r.g = null; }
  broadcast(r); scheduleBot(r);
}
function act(uid, fn, args) {
  const r = get(uid); if (!r || r.phase !== 'playing') return { error: 'No game in progress' };
  const err = game[fn](r.g, uid, ...args); if (err) return { error: err };
  if (r.g.winner) r.phase = 'finished';
  broadcast(r); scheduleBot(r);
}
function tick() { // handles long disconnects without blocking the table
  const now = Date.now();
  for (const r of [...rooms.values()]) {
    if (r.players.every(p => !p.connected) && now - Math.max(...r.players.map(p => p.dcAt || 0)) > 600000) {
      r.players.forEach(p => byUser.delete(p.id)); rooms.delete(r.code); continue;
    }
    for (const p of [...r.players]) {
      if (p.connected) continue; const away = now - p.dcAt;
      if (r.phase !== 'playing' && away > 60000) leave(p.id);
      else if (r.phase === 'playing' && away > 300000) leave(p.id);
      else if (r.phase === 'playing' && away > 15000 && r.g.order[r.g.turn] === p.id) {
        game.forcePass(r.g); if (r.g.winner) r.phase = 'finished'; broadcast(r);
      }
    }
  }
}
module.exports = { setIO: i => { io = i; setInterval(tick, 3000); }, create, createComputer, join, leave, start, restart, act, reconnect, disconnect };
