import { useState } from 'react'; import { emit } from '../net.js'; import Logo from '../components/Logo.jsx';
export default function Lobby({ user, notify, onLogout }) {
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  const go = async (ev, d) => { setBusy(true); const r = await emit(ev, d); setBusy(false); if (r.error) notify(r.error); };
  return (
    <main className="center">
      <Logo />
      <div className="me"><span className="avatar">{user.avatar}</span><b>{user.name}</b><button className="link" onClick={onLogout}>Log out</button></div>
      <div className="panel">
        <h2>Choose how to play</h2>
        <button className="btn primary" disabled={busy} onClick={() => go('room:computer')}>Player vs Computer</button>
        <div className="or">or play with 2–4 players</div>
        <button className="btn" disabled={busy} onClick={() => go('room:create')}>Create a room</button>
        <input className="code" placeholder="ROOM CODE" maxLength={5} value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && code && go('room:join', { code })} />
        <button className="btn" disabled={busy || code.length < 5} onClick={() => go('room:join', { code })}>Join room</button>
      </div>
    </main>
  );
}
