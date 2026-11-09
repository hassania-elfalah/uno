import { useEffect, useState, useCallback } from 'react';
import { api, connect, emit } from './net.js';
import Home from './pages/Home.jsx'; import Auth from './pages/Auth.jsx'; import Lobby from './pages/Lobby.jsx';
import Room from './pages/Room.jsx'; import Winner from './pages/Winner.jsx';

export default function App() {
  const [user, setUser] = useState(null), [room, setRoom] = useState(null), [page, setPage] = useState('home');
  const [ready, setReady] = useState(false), [toast, setToast] = useState(''), [online, setOnline] = useState(true);
  const notify = useCallback(m => { setToast(m); setTimeout(() => setToast(''), 3200); }, []);
  const hook = token => {
    const s = connect(token);
    s.on('room:update', setRoom); s.on('connect', () => setOnline(true)); s.on('disconnect', () => setOnline(false));
    s.on('connect_error', e => e.message === 'Unauthorized' && logout());
  };
  useEffect(() => {
    if (!localStorage.token) return setReady(true);
    api('/me').then(d => { setUser(d.user); hook(localStorage.token); }).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);
  const login = d => { localStorage.token = d.token; setUser(d.user); hook(d.token); setPage('lobby'); };
  const logout = async () => { await emit('room:leave'); localStorage.removeItem('token'); setUser(null); setRoom(null); setPage('home'); };
  if (!ready) return <div className="center"><div className="spinner" /></div>;

  let view;
  if (!user) view = page === 'auth' ? <Auth onLogin={login} back={() => setPage('home')} /> : <Home onPlay={() => setPage('auth')} />;
  else if (room?.phase === 'finished') view = <Winner room={room} notify={notify} />;
  else if (room) view = <Room room={room} notify={notify} />;
  else view = <Lobby user={user} notify={notify} onLogout={logout} />;
  return <>{view}{!online && user && <div className="banner">Reconnecting to server…</div>}{toast && <div className="toast" role="alert">{toast}</div>}</>;
}
