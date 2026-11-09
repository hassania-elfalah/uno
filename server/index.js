const express = require('express'), http = require('http'), cors = require('cors'), path = require('path'), fs = require('fs');
const { Server } = require('socket.io');
const auth = require('./auth'), rooms = require('./rooms');

const app = express(); app.use(cors()); app.use(express.json());
app.use('/api', auth.router);
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (q, r) => r.sendFile(path.join(dist, 'index.html'))); }

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
rooms.setIO(io);
io.use((s, next) => { const u = auth.userFromToken(s.handshake.auth?.token); if (!u) return next(new Error('Unauthorized')); s.user = u; next(); });

io.on('connection', s => {
  rooms.reconnect(s.user, s.id); // restores the player to their room after a refresh / network drop
  const on = (ev, fn) => s.on(ev, (data, cb) => {
    cb = typeof cb === 'function' ? cb : () => {};
    try { cb(fn(data || {}) || { ok: true }); } catch (e) { console.error(e); cb({ error: 'Server error' }); }
  });
  on('room:create', () => rooms.create(s.user, s.id));
  on('room:computer', () => rooms.createComputer(s.user, s.id));
  on('room:join', d => rooms.join(s.user, s.id, String(d.code || '').toUpperCase().trim()));
  on('room:leave', () => rooms.leave(s.user.id));
  on('game:start', () => rooms.start(s.user.id));
  on('game:restart', () => rooms.restart(s.user.id));
  on('game:play', d => rooms.act(s.user.id, 'play', [d.cardId, d.color]));
  on('game:draw', () => rooms.act(s.user.id, 'drawCard', []));
  on('game:pass', () => rooms.act(s.user.id, 'pass', []));
  on('game:uno', () => rooms.act(s.user.id, 'uno', []));
  on('game:catch', () => rooms.act(s.user.id, 'catchUno', []));
  s.on('disconnect', () => rooms.disconnect(s.user.id, s.id));
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`UNO server on :${PORT}`));
