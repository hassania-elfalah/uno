import { io } from 'socket.io-client';
export const SERVER = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.PROD ? '' : `http://${location.hostname}:3001`);
export async function api(path, body) {
  const r = await fetch(SERVER + '/api' + path, { method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.token || '') }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed'); return d;
}
export let socket = null;
export function connect(token) { socket?.disconnect(); socket = io(SERVER || undefined, { auth: { token } }); return socket; }
export const emit = (ev, data) => new Promise(res => { if (!socket?.connected) return res({ error: 'Connection lost — reconnecting…' }); socket.emit(ev, data, res); });
