# UNO Online

Real-time multiplayer UNO (2–4 players). React + Vite client, Node/Express + Socket.IO server. The server owns the deck, hands, turns and every rule check; clients only send intents (play / draw / pass / UNO / catch).

## Run (development, two terminals)
```bash
npm run install-all
cd server && npm run dev      # http://localhost:3001
cd client && npm run dev      # http://localhost:5173
```
Open http://localhost:5173, register an account, and choose Player vs Computer for a solo game or create/join a room to play with 2–4 players. Share the 5-letter room code with friends.

## Run (production, single port)
```bash
npm run install-all && npm run build && npm start   # http://localhost:3001
```
For play over the internet, deploy this folder to any Node host (Render, Railway, Fly.io, a VPS) and open the public URL, or tunnel locally with `npx localtunnel --port 3001`. If the client is hosted separately, set `VITE_SERVER_URL` in `client/.env`.

## Test
`cd server && npm start` then, in another terminal, `npm test` — three socket clients play a full game, verify rejected illegal moves, reconnect, and restart.

## Rules and behaviour
- Match color/number; Skip, Reverse (acts as Skip with 2 players), +2, Wild, Wild +4 (next player draws 4 and is skipped). Wild +4 may be played any time (no challenge rule).
- Draw a card: if playable you may play only that card, otherwise pass. Deck reshuffles from the discard pile.
- UNO: press UNO at 2 cards (before playing) or right after reaching 1 card. Others can press "Catch" before the next move; the player draws 2.
- Disconnects: refresh/reconnect restores you to your room and hand. If it's a disconnected player's turn for 15s they're auto-drawn/skipped; after 5 min away they're removed.
- Accounts are stored in `server/data/users.json` (scrypt-hashed passwords). MongoDB is not required; swap `auth.js` for a Mongoose model to add it.
