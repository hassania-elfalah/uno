const SYM = { skip: '⊘', reverse: '⇄', draw2: '+2', wild4: '+4', wild: '★' };
export default function Card({ card, back, onClick, playable, dim, className = '' }) {
  if (back) return <div className={`card back ${className}`}><span>UNO</span></div>;
  const s = SYM[card.value] || card.value;
  return (
    <button className={`card ${card.color} ${playable ? 'playable' : ''} ${dim ? 'dim' : ''} ${className}`} onClick={onClick} disabled={!onClick} aria-label={`${card.color} ${card.value}`}>
      <i className="c tl">{s}</i><b className="sym">{s}</b><i className="c br">{s}</i>
    </button>
  );
}
