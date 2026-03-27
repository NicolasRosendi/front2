import { useState } from "react";

const DICE = [4, 6, 8, 10, 12, 20, 100];

function rollDice(sides, qty = 1, modifier = 0, mode = "normal") {
  const rolls = [];
  for (let i = 0; i < qty; i++) rolls.push(Math.floor(Math.random() * sides) + 1);

  let advantageRolls = null;
  let finalRoll = rolls[0];

  if (sides === 20 && qty === 1 && mode !== "normal") {
    const roll2 = Math.floor(Math.random() * 20) + 1;
    advantageRolls = [rolls[0], roll2];
    finalRoll = mode === "ventaja"
      ? Math.max(rolls[0], roll2)
      : Math.min(rolls[0], roll2);
    rolls[0] = finalRoll;
  }

  const sum = rolls.reduce((a, b) => a + b, 0);
  const isCrit = sides === 20 && qty === 1 && finalRoll === 20;
  const isFail = sides === 20 && qty === 1 && finalRoll === 1;

  return { rolls, sum, total: sum + modifier, modifier, sides, qty, isCrit, isFail, advantageRolls, mode };
}

export default function DiceRoller() {
  const [selected, setSelected] = useState(20);
  const [qty, setQty] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState("normal");
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  const showModeSelector = selected === 20 && qty === 1;

  // Si cambia de d20 o qty > 1, resetear modo
  const handleDiceSelect = (d) => {
    setSelected(d);
    if (d !== 20) setMode("normal");
  };
  const handleQtyChange = (v) => {
    setQty(v);
    if (v !== 1) setMode("normal");
  };

  const doRoll = () => {
    setRolling(true);
    setTimeout(() => {
      setResult(rollDice(selected, qty, modifier, mode));
      setRolling(false);
    }, 400);
  };

  return (
    <div className="dice-roller">
      <div className="dice-grid">
        {DICE.map(d => (
          <button key={d} className={"dice-btn" + (selected === d ? " active" : "")} onClick={() => handleDiceSelect(d)}>
            d{d}
          </button>
        ))}
      </div>

      <div className="dice-controls">
        <div className="dice-ctrl-group">
          <span className="dice-ctrl-label">Cantidad</span>
          <button className="dice-ctrl-btn" onClick={() => handleQtyChange(Math.max(1, qty - 1))}>−</button>
          <span className="dice-ctrl-val">{qty}</span>
          <button className="dice-ctrl-btn" onClick={() => handleQtyChange(Math.min(20, qty + 1))}>+</button>
        </div>
        <div className="dice-ctrl-group">
          <span className="dice-ctrl-label">Mod</span>
          <button className="dice-ctrl-btn" onClick={() => setModifier(modifier - 1)}>−</button>
          <span className="dice-ctrl-val">{modifier >= 0 ? "+" + modifier : modifier}</span>
          <button className="dice-ctrl-btn" onClick={() => setModifier(modifier + 1)}>+</button>
        </div>
      </div>

      {showModeSelector && (
        <div className="dice-mode-row">
          {["normal", "ventaja", "desventaja"].map(m => (
            <button
              key={m}
              className={"dice-mode-btn" + (mode === m ? " active" : "")}
              onClick={() => setMode(m)}
            >
              {m === "normal" ? "Normal" : m === "ventaja" ? "⬆ Ventaja" : "⬇ Desventaja"}
            </button>
          ))}
        </div>
      )}

      <button className={"roll-btn" + (rolling ? " rolling" : "")} onClick={doRoll} disabled={rolling}>
        {rolling ? "🎲 ..." : `🎲 Tirar ${qty}d${selected}${modifier ? (modifier > 0 ? "+" : "") + modifier : ""}${mode !== "normal" ? ` (${mode})` : ""}`}
      </button>

      {result && (
        <div className={"dice-result anim-pop" + (result.isCrit ? " crit" : "") + (result.isFail ? " fail" : "")}>
          <div className="dice-result-total">{result.total}</div>
          <div className="dice-result-detail">
            {result.advantageRolls ? (
              <>
                [{result.advantageRolls.map((r, i) => (
                  <span key={i} style={{ fontWeight: r === result.rolls[0] ? "bold" : "normal", opacity: r === result.rolls[0] ? 1 : 0.45 }}>
                    {i > 0 ? ", " : ""}{r}
                  </span>
                ))}]
                {result.modifier ? ` ${result.modifier > 0 ? "+" : ""}${result.modifier}` : ""}
              </>
            ) : (
              <>[{result.rolls.join(", ")}]{result.modifier ? ` ${result.modifier > 0 ? "+" : ""}${result.modifier}` : ""}</>
            )}
          </div>
          {result.isCrit && <div className="dice-result-tag crit">¡CRÍTICO!</div>}
          {result.isFail && <div className="dice-result-tag fail">¡PIFIA!</div>}
          {result.advantageRolls && !result.isCrit && !result.isFail && (
            <div className="dice-result-tag" style={{ opacity: 0.7 }}>
              {result.mode === "ventaja" ? "⬆ con ventaja" : "⬇ con desventaja"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
