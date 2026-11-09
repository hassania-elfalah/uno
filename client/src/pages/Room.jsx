import { useState } from 'react'; import { emit } from '../net.js'; import Card from '../components/Card.jsx';
const COLORS = ['red', 'blue', 'green', 'yellow'];

function Seat({ p, g, pos }) {
  const active = g.current === p.id, n = g.counts[p.id] ?? p.count;
  return (
    <div className={`seat ${pos} ${active ? 'active' : ''} ${p.connected ? '' : 'off'}`}>
      <div className="who"><span className="avatar">{p.avatar}</span><b>{p.name}</b>{!p.connected && <em>offline</em>}</div>
      <div className="mini">{Array.from({ length: Math.min(n, 7) }, (_, i) => <Card key={i} back className="tiny" />)}<span className="cnt">{n}{n === 1 ? ' · UNO!' : ''}</span></div>
    </div>
  );
}

export default function Room({ room, notify }) {
  const { game: g, players, me } = room, [pick, setPick] = useState(null);
  const act = async (ev, d) => { const r = await emit(ev, d); r.error && notify(r.error); return r; };
  const leave = () => act('room:leave');

  if (room.phase === 'lobby') return (
    <main className="center">
      <div className="panel">
        <h2>Room code</h2>
        <button className="roomcode" onClick={() => { navigator.clipboard?.writeText(room.code); notify('Code copied'); }} title="Copy">{room.code}</button>
        <p className="muted">Share this code. {players.length}/4 players joined.</p>
        {players.map(p => <div key={p.id} className="row"><span className="avatar">{p.avatar}</span><b>{p.name}</b>{p.id === room.host && <em>host</em>}<span className="grow" />{!p.connected && <em>offline</em>}</div>)}
        {room.host === me ? <button className="btn primary" disabled={players.length < 2} onClick={() => act('game:start')}>{players.length < 2 ? 'Waiting for players…' : 'Start game'}</button> : <p className="muted">Waiting for the host to start…</p>}
        <button className="link" onClick={leave}>Leave room</button>
      </div>
    </main>
  );

  const by = Object.fromEntries(players.map(p => [p.id, p]));
  const my = g.order.indexOf(me), opps = g.order.map((_, i) => g.order[(my + 1 + i) % g.order.length]).filter(id => id !== me);
  const seats = { 1: ['top'], 2: ['left', 'right'], 3: ['left', 'top', 'right'] }[opps.length] || [];
  const myTurn = g.current === me, tv = g.top.value;
  const ok = c => myTurn && (g.drawn === null || g.drawn === c.id) && (c.color === 'wild' || c.color === g.color || c.value === tv);
  const play = c => c.color === 'wild' ? setPick(c) : act('game:play', { cardId: c.id });
  const name = id => (id === me ? 'You' : by[id]?.name || '?');
  const logLine = l => { const [id, t] = l.split('|'); return t ? `${name(id)} ${t}` : l; };

  return (
    <main className="game">
      <header className="bar"><span className="chip">{room.mode === 'computer' ? 'Vs computer' : `Room ${room.code}`}</span><span className={`turn ${myTurn ? 'mine' : ''}`}>{myTurn ? (g.drawn !== null ? 'Play the drawn card or pass' : 'Your turn') : `${name(g.current)}’s turn`}</span><button className="link" onClick={leave}>Leave</button></header>
      <section className="table">
        {opps.map((id, i) => by[id] && <Seat key={id} p={by[id]} g={g} pos={seats[i]} />)}
        <div className="center-pile">
          <button className="pile" disabled={!myTurn || g.drawn !== null} onClick={() => act('game:draw')} aria-label="Draw a card"><Card back className="big" /><span className="cnt">{g.deckCount}</span></button>
          <div className="disc"><Card key={g.top.id} card={g.top} className="big drop" /><span className={`dot ${g.color}`} title={`Current color: ${g.color}`} /></div>
          <span className="dir" aria-label="direction">{g.dir === 1 ? '↻' : '↺'}</span>
        </div>
        <div className="log">{g.log.map((l, i) => <div key={i}>{logLine(l)}</div>)}</div>
      </section>
      <footer className="me-area">
        <div className="actions">
          {g.unoPending && g.unoPending !== me && <button className="btn danger" onClick={() => act('game:catch')}>Catch {name(g.unoPending)}!</button>}
          {g.hand.length <= 2 && <button className="btn uno" onClick={() => act('game:uno')}>UNO!</button>}
          {myTurn && g.drawn !== null && <button className="btn" onClick={() => act('game:pass')}>Pass</button>}
        </div>
        <div className={`hand ${myTurn ? 'live' : ''}`}>{g.hand.map(c => <Card key={c.id} card={c} playable={ok(c)} dim={myTurn && !ok(c)} onClick={() => ok(c) ? play(c) : notify(myTurn ? 'That card can’t be played' : 'Wait for your turn')} className="pop" />)}</div>
        <div className="who me"><span className="avatar">{by[me]?.avatar}</span><b>{by[me]?.name}</b><span className="muted">{g.hand.length} cards</span></div>
      </footer>
      {pick && <div className="modal" onClick={() => setPick(null)}><div className="panel" onClick={e => e.stopPropagation()}><h2>Choose a color</h2>
        <div className="colors">{COLORS.map(c => <button key={c} className={`swatch ${c}`} aria-label={c} onClick={() => { act('game:play', { cardId: pick.id, color: c }); setPick(null); }} />)}</div></div></div>}
    </main>
  );
}
