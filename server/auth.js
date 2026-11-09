const express = require('express'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, 'data', 'users.json');
let db = { users: {}, tokens: {} };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
const save = () => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db)); };
const AV = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐲', '🐵', '🦉', '🐧', '🐺'];
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const pub = u => ({ id: u.id, name: u.name, avatar: u.avatar });
function issue(u) { const token = crypto.randomBytes(24).toString('hex'); db.tokens[token] = u.id; save(); return { token, user: pub(u) }; }
const userFromToken = t => { const id = db.tokens[t]; return id && db.users[id] ? pub(db.users[id]) : null; };

const router = express.Router();
router.post('/register', (req, res) => {
  const { username, password } = req.body || {}, name = String(username || '').trim();
  if (!/^\w{2,16}$/.test(name)) return res.status(400).json({ error: 'Username: 2–16 letters, numbers or underscores' });
  if (String(password || '').length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  if (Object.values(db.users).some(u => u.key === name.toLowerCase())) return res.status(409).json({ error: 'Username already taken' });
  const salt = crypto.randomBytes(8).toString('hex');
  const u = { id: crypto.randomUUID(), key: name.toLowerCase(), name, salt, hash: hash(String(password), salt), avatar: AV[Math.floor(Math.random() * AV.length)] };
  db.users[u.id] = u; res.json(issue(u));
});
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = Object.values(db.users).find(x => x.key === String(username || '').trim().toLowerCase());
  if (!u || hash(String(password || ''), u.salt) !== u.hash) return res.status(401).json({ error: 'Wrong username or password' });
  res.json(issue(u));
});
router.get('/me', (req, res) => {
  const u = userFromToken((req.headers.authorization || '').slice(7));
  u ? res.json({ user: u }) : res.status(401).json({ error: 'Not signed in' });
});
module.exports = { router, userFromToken };
