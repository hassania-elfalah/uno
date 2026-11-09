import { useState } from 'react'; import { api } from '../net.js'; import Logo from '../components/Logo.jsx';
export default function Auth({ onLogin, back }) {
  const [mode, setMode] = useState('login'), [f, setF] = useState({ username: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onLogin(await api('/' + mode, f)); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <main className="center">
      <Logo />
      <form className="panel" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <input placeholder="Username" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} autoFocus autoComplete="username" />
        <input type="password" placeholder="Password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {err && <p className="err">{err}</p>}
        <button className="btn primary" disabled={busy}>{mode === 'login' ? 'Log in' : 'Register'}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'No account? Register' : 'Have an account? Log in'}</button>
        <button type="button" className="link" onClick={back}>Back</button>
      </form>
    </main>
  );
}
