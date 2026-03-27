import { useState } from "react";

const DICE = [4, 6, 8, 10, 12, 20, 100];

function rollDice(sides, qty = 1, modifier = 0) {
  const rolls = [];
  for (let i = 0; i < qty; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0);
  const isCrit = sides === 20 && qty === 1 && rolls[0] === 20;
  const isFail = sides === 20 && qty === 1 && rolls[0] === 1;
  return { rolls, sum, total: sum + modifier, modifier, sides, qty, isCrit, isFail };
}

export default function DiceRoller() {
  const [selected, setSelected] = useState(20);
  const [qty, setQty] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  const doRoll = () => {
    setRolling(true);
    setTimeout(() => {
      setResult(rollDice(selected, qty, modifier));
      setRolling(false);
    }, 400);
  };

  return (
    <div className="dice-roller">
      <div className="dice-grid">
        {DICE.map(d => (
          <button key={d} className={"dice-btn" + (selected === d ? " active" : "")} onClick={() => setSelected(d)}>
            d{d}
          </button>
        ))}
      </div>
      <div className="dice-controls">
        <div className="dice-ctrl-group">
          <span className="dice-ctrl-label">Cantidad</span>
          <button className="dice-ctrl-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span className="dice-ctrl-val">{qty}</span>
          <button className="dice-ctrl-btn" onClick={() => setQty(Math.min(20, qty + 1))}>+</button>
        </div>
        <div className="dice-ctrl-group">
          <span className="dice-ctrl-label">Mod</span>
          <button className="dice-ctrl-btn" onClick={() => setModifier(modifier - 1)}>−</button>
          <span className="dice-ctrl-val">{modifier >= 0 ? "+" + modifier : modifier}</span>
          <button className="dice-ctrl-btn" onClick={() => setModifier(modifier + 1)}>+</button>
        </div>
      </div>
      <button className={"roll-btn" + (rolling ? " rolling" : "")} onClick={doRoll} disabled={rolling}>
        {rolling ? "🎲 ..." : `🎲 Tirar ${qty}d${selected}${modifier ? (modifier > 0 ? "+" : "") + modifier : ""}`}
      </button>
      {result && (
        <div className={"dice-result anim-pop" + (result.isCrit ? " crit" : "") + (result.isFail ? " fail" : "")}>
          <div className="dice-result-total">{result.total}</div>
          <div className="dice-result-detail">
            [{result.rolls.join(", ")}]{result.modifier ? ` ${result.modifier > 0 ? "+" : ""}${result.modifier}` : ""}
          </div>
          {result.isCrit && <div className="dice-result-tag crit">¡CRÍTICO!</div>}
          {result.isFail && <div className="dice-result-tag fail">¡PIFIA!</div>}
        </div>
      )}
    </div>
  );
}
