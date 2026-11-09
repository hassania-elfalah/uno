// Pure UNO rules engine. All validation lives here; clients only send intents.
const COLORS = ['red', 'blue', 'green', 'yellow'];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function buildDeck() {
  const d = []; let n = 0; const add = (color, value) => d.push({ id: n++, color, value });
  for (const c of COLORS) {
    add(c, '0');
    for (let v = 1; v <= 9; v++) { add(c, String(v)); add(c, String(v)); }
    for (const s of ['skip', 'reverse', 'draw2']) { add(c, s); add(c, s); }
  }
  for (let i = 0; i < 4; i++) { add('wild', 'wild'); add('wild', 'wild4'); }
  return shuffle(d); // 108 cards
}

function create(ids) {
  const deck = buildDeck(), hands = {};
  ids.forEach(id => (hands[id] = deck.splice(0, 7)));
  const first = deck.splice(deck.findIndex(c => /^\d$/.test(c.value)), 1)[0];
  return { order: [...ids], hands, deck, discard: [first], color: first.color, turn: 0, dir: 1,
    drawn: null, winner: null, unoPending: null, called: {}, log: ['Game started'] };
}

const top = g => g.discard[g.discard.length - 1];
const canPlay = (g, c) => c.color === 'wild' || c.color === g.color || c.value === top(g).value;
const advance = (g, k = 1) => { const n = g.order.length; g.turn = (((g.turn + g.dir * k) % n) + n) % n; };
const nextId = g => g.order[(((g.turn + g.dir) % g.order.length) + g.order.length) % g.order.length];

function deal(g, id, n) {
  for (let i = 0; i < n; i++) {
    if (!g.deck.length) { const t = g.discard.pop(); g.deck = shuffle(g.discard); g.discard = [t]; }
    if (!g.deck.length) break;
    g.hands[id].push(g.deck.pop());
  }
}
const mine = (g, id) => g.order[g.turn] === id;
const guard = (g, id) => (g.winner ? 'Game is over' : !mine(g, id) ? 'Not your turn' : null);

function play(g, id, cardId, color) {
  const e = guard(g, id); if (e) return e;
  const hand = g.hands[id], i = hand.findIndex(c => c.id === cardId);
  if (i < 0) return 'You do not have that card';
  const card = hand[i];
  if (g.drawn !== null && g.drawn !== cardId) return 'You may only play the card you just drew';
  if (!canPlay(g, card)) return 'That card cannot be played now';
  const wild = card.color === 'wild';
  if (wild && !COLORS.includes(color)) return 'Choose a color';
  hand.splice(i, 1); g.discard.push(card); g.color = wild ? color : card.color; g.drawn = null;
  g.unoPending = hand.length === 1 && !g.called[id] ? id : null; delete g.called[id];
  const name = card.value, label = wild ? `${name} → ${color}` : `${card.color} ${name}`;
  g.log.push(`played ${label}`.padStart(0)); g.log[g.log.length - 1] = `${id}|played ${label}`;
  if (!hand.length) { g.winner = id; return null; }
  if (name === 'skip') advance(g, 2);
  else if (name === 'reverse') { g.dir *= -1; advance(g, g.order.length === 2 ? 2 : 1); }
  else if (name === 'draw2') { deal(g, nextId(g), 2); advance(g, 2); }
  else if (name === 'wild4') { deal(g, nextId(g), 4); advance(g, 2); }
  else advance(g, 1);
  return null;
}

function drawCard(g, id) {
  const e = guard(g, id); if (e) return e;
  if (g.drawn !== null) return 'You already drew this turn';
  g.unoPending = null; deal(g, id, 1);
  const c = g.hands[id][g.hands[id].length - 1];
  g.log.push(`${id}|drew a card`);
  if (c && canPlay(g, c)) g.drawn = c.id; else advance(g);
  return null;
}

function pass(g, id) {
  const e = guard(g, id); if (e) return e;
  if (g.drawn === null) return 'Draw a card before passing';
  g.drawn = null; g.unoPending = null; advance(g); return null;
}

function uno(g, id) {
  if (!g.order.includes(id)) return 'Not in game';
  if (g.unoPending === id) { g.unoPending = null; g.log.push(`${id}|shouted UNO!`); return null; }
  if (g.hands[id].length <= 2 && !g.winner) { g.called[id] = true; return null; }
  return 'You can only call UNO with 1–2 cards';
}

function catchUno(g, by) {
  if (!g.unoPending || g.unoPending === by) return 'Nobody to catch';
  const v = g.unoPending; deal(g, v, 2); g.unoPending = null; g.log.push(`${v}|forgot UNO and draws 2`); return null;
}

function forcePass(g) { // used when the current player is disconnected too long
  const id = g.order[g.turn]; if (g.winner) return;
  if (g.drawn === null) drawCard(g, id);
  if (g.drawn !== null && g.order[g.turn] === id) pass(g, id);
}

function remove(g, id) { // a player leaves mid-game
  const i = g.order.indexOf(id); if (i < 0) return;
  g.deck.unshift(...g.hands[id]); delete g.hands[id]; g.order.splice(i, 1);
  if (i < g.turn) g.turn--;
  else if (i === g.turn) { g.drawn = null; if (g.dir === -1) g.turn--; }
  g.turn = ((g.turn % g.order.length) + g.order.length) % g.order.length;
  if (g.unoPending === id) g.unoPending = null;
  g.log.push(`${id}|left the game`);
}

function view(g, id) {
  return { order: g.order, top: top(g), color: g.color, current: g.order[g.turn], dir: g.dir, hand: g.hands[id] || [],
    drawn: g.drawn !== null && mine(g, id) ? g.drawn : null, deckCount: g.deck.length, winner: g.winner,
    unoPending: g.unoPending, counts: Object.fromEntries(g.order.map(p => [p, g.hands[p].length])), log: g.log.slice(-4) };
}

module.exports = { create, play, drawCard, pass, uno, catchUno, forcePass, remove, view, buildDeck };
