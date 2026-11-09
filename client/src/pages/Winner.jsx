import { emit } from '../net.js'; import Logo from '../components/Logo.jsx';
export default function Winner({ room, notify }) {
  const { game, players, me } = room, w = players.find(p => p.id === game.winner), isHost = room.host === me;
  const rank = [...players].sort((a, b) => (a.id === w.id ? -1 : b.id === w.id ? 1 : a.count - b.count));
  const call = async ev => { const r = await emit(ev); r.error && notify(r.error); };
  return (
    <main className="center winner">
      <div className="confetti" aria-hidden>{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * .25}s`, background: ['#e63946', '#1d6fd6', '#2a9d4b', '#f4c20d'][i % 4] }} />)}</div>
      <Logo />
      <div className="trophy">🏆</div>
      <h1>{w.id === me ? 'You win!' : `${w.name} wins!`}</h1>
      <div className="panel">
        {rank.map(p => <div key={p.id} className="row"><span className="avatar">{p.avatar}</span><b>{p.name}</b><span className="grow" /><span>{p.id === w.id ? 'Winner' : `${p.count} cards left`}</span></div>)}
        {isHost ? <button className="btn primary" onClick={() => call('game:restart')}>Play again</button> : <p className="muted">Waiting for the host to restart…</p>}
        <button className="link" onClick={() => call('room:leave')}>Leave room</button>
      </div>
    </main>
  );
}
