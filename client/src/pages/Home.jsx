import Logo from '../components/Logo.jsx'; import Card from '../components/Card.jsx';
const demo = [{ id: 1, color: 'red', value: '7' }, { id: 2, color: 'yellow', value: 'skip' }, { id: 3, color: 'wild', value: 'wild4' }, { id: 4, color: 'green', value: 'reverse' }, { id: 5, color: 'blue', value: 'draw2' }];
export default function Home({ onPlay }) {
  return (
    <main className="center home">
      <Logo big />
      <p className="lead">Create a room, share the code and play UNO with 2–4 friends in real time.</p>
      <div className="fan">{demo.map(c => <Card key={c.id} card={c} className="fan-card" />)}</div>
      <button className="btn primary xl" onClick={onPlay}>Play now</button>
      <ul className="rules"><li>Match color or number</li><li>Skip, Reverse, +2 and Wilds all work</li><li>Press UNO at one card — or get caught</li></ul>
    </main>
  );
}
