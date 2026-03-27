import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "./useAuth.jsx";
import { useToast } from "./useToast.jsx";

// ══════════════════════════════════════
//  DICE HELPERS
// ══════════════════════════════════════
const DICE = [4, 6, 8, 10, 12, 20, 100];

function rollDice(sides, qty = 1, modifier = 0, mode = "normal") {
  const rolls = [];
  for (let i = 0; i < qty; i++) rolls.push(Math.floor(Math.random() * sides) + 1);

  let advantageRolls = null;
  let finalRoll = rolls[0];

  if (sides === 20 && qty === 1 && mode !== "normal") {
    const roll2 = Math.floor(Math.random() * 20) + 1;
    advantageRolls = [rolls[0], roll2];
    finalRoll = mode === "ventaja" ? Math.max(rolls[0], roll2) : Math.min(rolls[0], roll2);
    rolls[0] = finalRoll;
  }

  const sum = rolls.reduce((a, b) => a + b, 0);
  const isCrit = sides === 20 && qty === 1 && finalRoll === 20;
  const isFail = sides === 20 && qty === 1 && finalRoll === 1;

  return { rolls, sum, total: sum + modifier, modifier, sides, qty, isCrit, isFail, advantageRolls, mode };
}

function parseDamageFormula(str) {
  if (!str) return { count: 1, faces: 4, mod: 0 };
  const clean = str.replace(/\s*(slashing|piercing|bludgeoning|fire|cold|lightning|thunder|poison|acid|necrotic|radiant|force|psychic)\s*/gi, "").trim();
  const match = clean.match(/(\d+)?d(\d+)(?:\s*([+\-])\s*(\d+))?/i);
  if (!match) return { count: 1, faces: 6, mod: 0 };
  return {
    count: parseInt(match[1]) || 1,
    faces: parseInt(match[2]),
    mod: match[3] === "-" ? -(parseInt(match[4]) || 0) : parseInt(match[4]) || 0,
  };
}

function rollDamageFormula(parsed, isCrit = false) {
  const diceCount = isCrit ? parsed.count * 2 : parsed.count;
  const rolls = [];
  for (let i = 0; i < diceCount; i++) rolls.push(Math.floor(Math.random() * parsed.faces) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0);
  return { rolls, total: Math.max(0, sum + parsed.mod), mod: parsed.mod, formula: `${diceCount}d${parsed.faces}${parsed.mod !== 0 ? (parsed.mod > 0 ? "+" : "") + parsed.mod : ""}` };
}

// ══════════════════════════════════════
//  NOTIFICACIONES
// ══════════════════════════════════════
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotification(title, body, options = {}) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/dice-icon.png", badge: "/dice-icon.png", ...options });
  }
}

// ══════════════════════════════════════
//  SUBCOMPONENTES
// ══════════════════════════════════════

// ── Resultado de tirada flotante (centro) ──
function RollDisplay({ roll, onDismiss }) {
  if (!roll) return null;
  return (
    <div className="roll-display anim-pop" onClick={onDismiss}>
      <div className="roll-display-inner">
        <div className="roll-display-label">{roll.label}</div>
        <div className={"roll-display-total" + (roll.isCrit ? " crit" : "") + (roll.isFail ? " fail" : "")}>
          {roll.total}
        </div>
        {roll.advantageRolls && (
          <div className="roll-display-adv">
            {roll.advantageRolls.map((r, i) => (
              <span key={i} className={"adv-die" + (r === roll.rolls[0] ? " used" : " discarded")}>
                {i > 0 ? " / " : ""}{r}
              </span>
            ))}
            <span className="adv-label"> ({roll.mode})</span>
          </div>
        )}
        {!roll.advantageRolls && roll.rolls && (
          <div className="roll-display-detail">[{roll.rolls.join(", ")}]{roll.modifier ? ` ${roll.modifier > 0 ? "+" : ""}${roll.modifier}` : ""}</div>
        )}
        {roll.isCrit && <div className="roll-tag crit">¡CRÍTICO!</div>}
        {roll.isFail && <div className="roll-tag fail">¡PIFIA!</div>}
        {roll.subtitle && <div className="roll-display-sub">{roll.subtitle}</div>}
        <div className="roll-display-tap">Tocá para cerrar</div>
      </div>
    </div>
  );
}

// ── Mini DiceRoller embebido en combate ──
function CombatDiceRoller({ label, onResult, defaultSides = 20, defaultMod = 0, forceSides }) {
  const [selected, setSelected] = useState(forceSides || defaultSides);
  const [qty, setQty] = useState(1);
  const [modifier, setModifier] = useState(defaultMod);
  const [mode, setMode] = useState("normal");
  const [rolling, setRolling] = useState(false);
  const showMode = selected === 20 && qty === 1;

  const doRoll = () => {
    setRolling(true);
    setTimeout(() => {
      const result = rollDice(selected, qty, modifier, mode);
      setRolling(false);
      onResult({ ...result, label: label || `${qty}d${selected}` });
    }, 350);
  };

  return (
    <div className="combat-dice">
      {!forceSides && (
        <div className="dice-grid-sm">
          {DICE.map(d => (
            <button key={d} className={"dice-btn-sm" + (selected === d ? " active" : "")}
              onClick={() => { setSelected(d); if (d !== 20) setMode("normal"); }}>
              d{d}
            </button>
          ))}
        </div>
      )}
      <div className="dice-controls-sm">
        <div className="dice-ctrl-group">
          <span className="dice-ctrl-label">Cant</span>
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
      {showMode && (
        <div className="dice-mode-row">
          {["normal", "ventaja", "desventaja"].map(m => (
            <button key={m} className={"dice-mode-btn" + (mode === m ? " active" : "")} onClick={() => setMode(m)}>
              {m === "normal" ? "Normal" : m === "ventaja" ? "⬆ Ventaja" : "⬇ Desventaja"}
            </button>
          ))}
        </div>
      )}
      <button className={"roll-btn" + (rolling ? " rolling" : "")} onClick={doRoll} disabled={rolling}>
        {rolling ? "🎲 ..." : `🎲 Tirar ${qty}d${selected}${modifier ? (modifier > 0 ? "+" : "") + modifier : ""}${showMode && mode !== "normal" ? ` (${mode})` : ""}`}
      </button>
    </div>
  );
}

// ── Log lateral deslizable ──
function CombatLog({ log, open, onClose }) {
  return (
    <>
      {open && <div className="log-backdrop" onClick={onClose} />}
      <div className={"log-panel" + (open ? " open" : "")}>
        <div className="log-header">
          <span>📜 Log de Combate</span>
          <button className="log-close" onClick={onClose}>✕</button>
        </div>
        <div className="log-entries">
          {log.length === 0 && <div className="log-empty">Sin tiradas aún</div>}
          {[...log].reverse().map((entry, i) => (
            <div key={i} className={"log-entry" + (entry.isCrit ? " crit" : "") + (entry.isFail ? " fail" : "")}>
              <div className="log-entry-header">
                <span className="log-who">{entry.who}</span>
                <span className="log-time">{entry.time}</span>
              </div>
              <div className="log-entry-body">{entry.text}</div>
              {entry.detail && <div className="log-entry-detail">{entry.detail}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ══════════════════════════════════════
export default function TablesPage() {
  const { toast, confirm } = useToast();
  const [myTables, setMyTables] = useState([]);
  const [pubTables, setPubTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVis, setNewVis] = useState("public");
  const [newPwd, setNewPwd] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [charPick, setCharPick] = useState(null);

  // Estado de sala/combate
  const [currentRoll, setCurrentRoll] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [combatPhase, setCombatPhase] = useState(null);
  // Fases: null | "initiative" | "pick_target" | "roll_attack" | "roll_damage" | "saving_throw" | "waiting"
  const [initiativeRolled, setInitiativeRolled] = useState(false);
  const [pendingAttack, setPendingAttack] = useState(null); // { target, weapon, attackResult }
  const [pendingSavingThrow, setPendingSavingThrow] = useState(null); // { stat, dc, attackerInfo }
  const [myUserId, setMyUserId] = useState(null);

  const pollRef = useRef(null);
  const chatEndRef = useRef(null);
  const currentRollTimeout = useRef(null);

  // ── Obtener userId del token ──
  useEffect(() => {
    try {
      const token = localStorage.getItem("dnd_token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setMyUserId(payload.id || payload.userId || payload.sub);
      }
    } catch {}
    requestNotificationPermission();
  }, []);

  // ── Scroll chat ──
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // ── Mostrar tirada en pantalla ──
  const showRoll = useCallback((rollData) => {
    setCurrentRoll(rollData);
    if (currentRollTimeout.current) clearTimeout(currentRollTimeout.current);
    currentRollTimeout.current = setTimeout(() => setCurrentRoll(null), 8000);
  }, []);

  // ── Agregar al log ──
  const addLog = useCallback((who, text, detail, extra = {}) => {
    const entry = {
      who, text, detail,
      time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      ...extra
    };
    setCombatLog(prev => [...prev, entry]);
  }, []);

  const load = async () => {
    try {
      const [m, p] = await Promise.all([apiFetch("/tables"), apiFetch("/tables/public")]);
      setMyTables(m.tables || []);
      setPubTables(p.tables || []);
    } catch (e) { toast(e.message, true); }
    setLoading(false);
  };

  useEffect(() => { load(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  // ── Polling de sala ──
  const startPolling = useCallback((tableId, prevData) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await apiFetch("/tables/" + tableId);
        setRoomData(r => {
          if (!r) return r;
          const prevTurn = r.combat?.current_turn;
          const newTurn = fresh.combat?.current_turn;
          const prevRound = r.combat?.current_round;
          const newRound = fresh.combat?.current_round;
          const wasInCombat = r.table?.status === "combat";
          const nowInCombat = fresh.table?.status === "combat";

          // Detección de inicio de combate
          if (!wasInCombat && nowInCombat) {
            sendNotification("⚔ Combate iniciado", "¡El combate ha comenzado en " + fresh.table.name + "!");
            toast("⚔ ¡Combate iniciado!");
            setCombatPhase("initiative");
          }

          // Detección de cambio de turno
          if (nowInCombat && (prevTurn !== newTurn || prevRound !== newRound)) {
            const currentPlayer = fresh.combat?.turn_order?.[newTurn];
            if (currentPlayer?.user_id === myUserId) {
              sendNotification("🎲 ¡Es tu turno!", "Ronda " + newRound + " — ¡Te toca a vos!");
              toast("🎲 ¡Es tu turno!");
              setCombatPhase("pick_target");
            } else {
              setCombatPhase("waiting");
            }
          }

          // Fin de combate
          if (wasInCombat && !nowInCombat) {
            sendNotification("🏁 Combate finalizado", "El combate ha terminado.");
            toast("🏁 Combate finalizado");
            setCombatPhase(null);
            setPendingAttack(null);
            setPendingSavingThrow(null);
          }

          return { ...fresh, tableId };
        });
      } catch {}
    }, 2500);
  }, [myUserId, toast]);

  const openRoom = async (tableId) => {
    try {
      const d = await apiFetch("/tables/" + tableId);
      const data = { ...d, tableId };
      setRoomData(data);
      setCombatLog([]);
      setChatHistory([]);
      setCombatPhase(null);
      setPendingAttack(null);
      setPendingSavingThrow(null);
      setInitiativeRolled(false);

      // Detectar si ya estoy en combate
      if (d.table?.status === "combat") {
        const currentPlayer = d.combat?.turn_order?.[d.combat?.current_turn];
        if (currentPlayer?.user_id === myUserId) setCombatPhase("pick_target");
        else setCombatPhase("waiting");
      }

      startPolling(tableId, data);
    } catch (e) {
      if (e.message?.includes("no est")) { pickChar(tableId); }
      else toast(e.message, true);
    }
  };

  const leaveRoom = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setRoomData(null);
    setCombatPhase(null);
    setCombatLog([]);
    setChatHistory([]);
    setPendingAttack(null);
    setPendingSavingThrow(null);
  };

  // ── Crear mesa ──
  const createTable = async () => {
    if (!newName.trim()) return;
    try {
      const d = await apiFetch("/tables", { method: "POST", body: JSON.stringify({ name: newName, visibility: newVis, password: newVis === "private" ? newPwd : undefined }) });
      setNewName(""); setCreating(false);
      const chars = await apiFetch("/characters");
      setCharPick({ tableId: d.table?.id || d.tableId, chars: chars.characters || [] });
      load();
    } catch (e) { toast(e.message, true); }
  };

  const pickChar = async (tableId) => {
    try { const c = await apiFetch("/characters"); setCharPick({ tableId, chars: c.characters || [] }); } catch (e) { toast(e.message, true); }
  };

  const joinWithChar = async (charId) => {
    try {
      await apiFetch("/tables/" + charPick.tableId + "/join", { method: "POST", body: JSON.stringify({ character_id: charId }) });
      const tid = charPick.tableId;
      setCharPick(null);
      openRoom(tid);
      load();
    } catch (e) { toast(e.message, true); }
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const d = await apiFetch("/tables/join", { method: "POST", body: JSON.stringify({ code: joinCode.toUpperCase() }) });
      setJoinCode(""); pickChar(d.tableId); load();
    } catch (e) { toast(e.message, true); }
  };

  const deleteTable = async (id) => {
    const ok = await confirm("Borrar mesa", "¿Eliminar esta mesa para todos?");
    if (!ok) return;
    try { await apiFetch("/tables/" + id, { method: "DELETE" }); load(); toast("Mesa eliminada"); } catch (e) { toast(e.message, true); }
  };

  // ══════════════════════════════════════
  //  ACCIONES DE COMBATE
  // ══════════════════════════════════════

  // ── Iniciar combate (solo owner) ──
  const startCombat = async () => {
    try {
      await apiFetch("/tables/" + roomData.tableId + "/combat/start", { method: "POST" });
      toast("⚔ ¡Combate iniciado!");
      sendNotification("⚔ Combate iniciado", "El DM inició el combate. ¡Tirá tu iniciativa!");
      setCombatPhase("initiative");
      setInitiativeRolled(false);
      addLog("Sistema", "⚔ ¡Combate iniciado! Cada jugador debe tirar su iniciativa.");
    } catch (e) { toast(e.message, true); }
  };

  // ── Tirar iniciativa manual ──
  const handleInitiativeRoll = async (rollResult) => {
    const initiative = rollResult.total;
    showRoll({ ...rollResult, label: "🎯 Iniciativa", subtitle: `Total: ${initiative}` });
    addLog("Vos", `🎯 Iniciativa: ${initiative}`, `[${rollResult.rolls.join(", ")}]${rollResult.modifier ? (rollResult.modifier > 0 ? "+" : "") + rollResult.modifier : ""}`);

    try {
      // Usamos el endpoint de pass temporalmente para registrar, en un caso real
      // habría un endpoint /combat/initiative. Por ahora guardamos en log y esperamos.
      setInitiativeRolled(true);
      setCombatPhase("waiting");
      toast(`Iniciativa ${initiative} registrada. Esperando al DM...`);
    } catch (e) { toast(e.message, true); }
  };

  // ── Elegir objetivo ──
  const handlePickTarget = (player) => {
    const myChar = roomData.players?.find(p => p.user_id === myUserId);
    const attacks = myChar?.character_data?.attacks || [];
    setPendingAttack({ target: player, weapons: attacks, weapon: attacks[0] || { name: "Ataque", bonus: "+0", damage: "1d4" } });
    setCombatPhase("roll_attack");
  };

  // ── Tirada de ataque ──
  const handleAttackRoll = async (rollResult) => {
    const weapon = pendingAttack.weapon;
    const attackBonus = parseInt(weapon.bonus) || 0;
    const total = rollResult.rolls[0] + attackBonus; // usar el dado sin el mod (ya viene en result.total)
    const isCrit = rollResult.isCrit;
    const isFail = rollResult.isFail;

    showRoll({
      ...rollResult,
      label: `⚔ Ataque con ${weapon.name}`,
      subtitle: `vs ${pendingAttack.target.character_name}`,
    });
    addLog(
      "Vos",
      `⚔ Ataque con ${weapon.name} vs ${pendingAttack.target.character_name}: ${rollResult.total}`,
      `[${rollResult.rolls.join(", ")}]${rollResult.modifier ? (rollResult.modifier > 0 ? "+" : "") + rollResult.modifier : ""}${isCrit ? " ¡CRÍTICO!" : isFail ? " ¡PIFIA!" : ""}`,
      { isCrit, isFail }
    );

    if (isFail) {
      toast("¡Pifia! Turno perdido.");
      setPendingAttack(null);
      await passTurn();
      return;
    }

    // Guardamos resultado de ataque, esperamos ver si impacta (el defensor verá su CA)
    setPendingAttack(prev => ({ ...prev, attackResult: rollResult, isCrit }));
    setCombatPhase("roll_damage");
  };

  // ── Tirada de daño ──
  const handleDamageRoll = async (rollResult) => {
    const weapon = pendingAttack.weapon;
    const target = pendingAttack.target;

    showRoll({
      ...rollResult,
      label: `💥 Daño con ${weapon.name}`,
      subtitle: `→ ${target.character_name} recibe ${rollResult.total} de daño`,
    });
    addLog(
      "Vos",
      `💥 Daño a ${target.character_name}: ${rollResult.total}`,
      `[${rollResult.rolls.join(", ")}]${rollResult.modifier ? (rollResult.modifier > 0 ? "+" : "") + rollResult.modifier : ""}${pendingAttack.isCrit ? " ¡CRÍTICO×2!" : ""}`,
      { isCrit: pendingAttack.isCrit }
    );

    // Llamar al backend con el daño
    try {
      const res = await apiFetch("/tables/" + roomData.tableId + "/combat/attack", {
        method: "POST",
        body: JSON.stringify({
          defender_character_id: target.character_id,
          attack_index: pendingAttack.weapons?.indexOf(weapon) || 0,
        }),
      });

      if (res.combat_ended) {
        toast(`🏆 ¡${res.winner} gana el combate!`);
        addLog("Sistema", `🏆 ¡${res.winner} gana el combate!`);
        setCombatPhase(null);
      } else {
        setCombatPhase("waiting");
      }
    } catch (e) {
      // Si el backend maneja CA y rechaza, igual avanzamos turno
      toast(e.message, true);
    }

    setPendingAttack(null);
  };

  // ── Tirada de salvación (forzada al defensor) ──
  const handleSavingThrow = async (rollResult) => {
    const { stat, dc, attackerName } = pendingSavingThrow;
    const success = rollResult.total >= dc;

    showRoll({
      ...rollResult,
      label: `🛡 Salvación de ${stat.toUpperCase()}`,
      subtitle: success ? `✅ Supera CD ${dc}` : `❌ Falla CD ${dc}`,
    });
    addLog(
      "Vos",
      `🛡 Salvación de ${stat.toUpperCase()} (CD ${dc}): ${rollResult.total} → ${success ? "¡SUPERA!" : "FALLA"}`,
      `[${rollResult.rolls.join(", ")}]${rollResult.modifier ? (rollResult.modifier > 0 ? "+" : "") + rollResult.modifier : ""}`,
    );

    try {
      await apiFetch("/tables/" + roomData.tableId + "/combat/saving-throw", {
        method: "POST",
        body: JSON.stringify({
          defender_character_id: roomData.players?.find(p => p.user_id === myUserId)?.character_id,
          stat,
          spell_dc: dc,
        }),
      });
    } catch {}

    setPendingSavingThrow(null);
    setCombatPhase("waiting");
  };

  // ── Pasar turno ──
  const passTurn = async () => {
    try {
      await apiFetch("/tables/" + roomData.tableId + "/combat/pass", { method: "POST" });
      setPendingAttack(null);
      setCombatPhase("waiting");
      addLog("Vos", "⏭ Turno pasado");
    } catch (e) { toast(e.message, true); }
  };

  const endCombat = async () => {
    const ok = await confirm("Terminar combate", "¿Estás seguro?");
    if (!ok) return;
    try {
      await apiFetch("/tables/" + roomData.tableId + "/combat/end", { method: "POST" });
      toast("Combate finalizado");
      setCombatPhase(null);
    } catch (e) { toast(e.message, true); }
  };

  // ── Chat (real-time via polling) ──
  const lastChatId = useRef(0);

  const pollChat = useCallback(async (tableId) => {
    try {
      const d = await apiFetch("/tables/" + tableId + "/chat?since=" + lastChatId.current);
      if (d.messages && d.messages.length > 0) {
        const newMsgs = d.messages.map(m => ({
          who: m.username,
          text: m.message,
          time: new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
          id: m.id
        }));
        lastChatId.current = d.messages[d.messages.length - 1].id;
        setChatHistory(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = newMsgs.filter(m => !existingIds.has(m.id));
          return unique.length > 0 ? [...prev, ...unique] : prev;
        });
      }
    } catch {}
  }, []);

  // Start chat polling when room is open
  const chatPollRef = useRef(null);
  useEffect(() => {
    if (roomData?.tableId) {
      lastChatId.current = 0;
      pollChat(roomData.tableId);
      if (chatPollRef.current) clearInterval(chatPollRef.current);
      chatPollRef.current = setInterval(() => pollChat(roomData.tableId), 2500);
    }
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [roomData?.tableId]);

  const sendChat = async () => {
    if (!chatMsg.trim() || !roomData?.tableId) return;
    try {
      await apiFetch("/tables/" + roomData.tableId + "/chat", {
        method: "POST",
        body: JSON.stringify({ message: chatMsg })
      });
      setChatMsg("");
      pollChat(roomData.tableId); // Fetch immediately
    } catch (e) { toast(e.message, true); }
  };

  // ══════════════════════════════════════
  //  RENDERS
  // ══════════════════════════════════════

  if (charPick) return (
    <div className="page anim-fade-up">
      <h2 className="page-title">Elegí tu Personaje</h2>
      {charPick.chars.map(c => (
        <div key={c.id} className="char-card" onClick={() => joinWithChar(c.id)}>
          <span className="char-card-name">{c.name}</span>
        </div>
      ))}
      <button className="btn-ghost full" onClick={() => setCharPick(null)}>Cancelar</button>
    </div>
  );

  // ── Vista de sala ──
  if (roomData) {
    const t = roomData.table;
    const players = roomData.players || [];
    const inCombat = t?.status === "combat";
    const combat = roomData.combat;
    const turnOrder = combat?.turn_order || [];
    const currentTurnIdx = combat?.current_turn ?? 0;
    const currentPlayer = turnOrder[currentTurnIdx];
    const isMyTurn = currentPlayer?.user_id === myUserId;
    const myPlayer = players.find(p => p.user_id === myUserId);
    const otherPlayers = players.filter(p => p.user_id !== myUserId);

    return (
      <div className="page anim-fade-up room-page">

        {/* ── Log lateral ── */}
        <CombatLog log={combatLog} open={logOpen} onClose={() => setLogOpen(false)} />

        {/* ── Header ── */}
        <div className="room-header">
          <button className="btn-back" onClick={leaveRoom}>←</button>
          <div className="room-header-center">
            <h2 className="room-title">{t?.name}</h2>
            <span className="room-code">{t?.code}</span>
          </div>
          <button className="log-toggle-btn" onClick={() => setLogOpen(true)}>📜</button>
        </div>

        {/* ── Badge de combate ── */}
        {inCombat && (
          <div className="combat-badge anim-pulse">
            ⚔ Combate — Ronda {combat?.current_round || 1}
            {isMyTurn ? " — 🎲 ¡TU TURNO!" : ` — Turno de ${currentPlayer?.character_name || "..."}`}
          </div>
        )}

        {/* ── Resultado de tirada (centro) ── */}
        <RollDisplay roll={currentRoll} onDismiss={() => setCurrentRoll(null)} />

        {/* ── Panel principal ── */}
        <div className="room-body">

          {/* ── Jugadores & HP ── */}
          <div className="card">
            <div className="sec-title">Jugadores ({players.length})</div>
            {players.map((p, i) => {
              const hp = p.character_data?.hpCurr ?? "?";
              const hpMax = p.character_data?.hpMax ?? "?";
              const isTurn = turnOrder[currentTurnIdx]?.character_id === p.character_id;
              return (
                <div key={i} className={"player-row" + (isTurn ? " active-turn" : "")}>
                  <div className="player-info">
                    <span className="player-n">{p.username}</span>
                    <span className="player-c">{p.character_name || "—"}</span>
                  </div>
                  {inCombat && (
                    <div className="player-combat-info">
                      <span className="player-hp">{hp}/{hpMax} HP</span>
                      {isTurn && <span className="turn-arrow">◄</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Orden de turnos ── */}
          {inCombat && turnOrder.length > 0 && (
            <div className="card">
              <div className="sec-title">Orden de Iniciativa</div>
              {turnOrder.map((to, i) => (
                <div key={i} className={"turn-row" + (i === currentTurnIdx ? " active" : "")}>
                  <span className="turn-init">{to.total ?? to.initiative ?? "?"}</span>
                  <span className="turn-name">{to.character_name}</span>
                  {i === currentTurnIdx && <span className="turn-arrow">◄</span>}
                </div>
              ))}
            </div>
          )}

          {/* ══════════════════════════════
               FASES DE COMBATE
          ══════════════════════════════ */}

          {/* FASE: Tirar iniciativa */}
          {inCombat && combatPhase === "initiative" && !initiativeRolled && (
            <div className="card combat-action-card">
              <div className="sec-title">🎯 Tirá tu Iniciativa</div>
              <p className="combat-hint">Tirá 1d20 + tu modificador de Destreza</p>
              <CombatDiceRoller
                label="🎯 Iniciativa"
                defaultSides={20}
                defaultMod={myPlayer?.character_data?.stats ? Math.floor((myPlayer.character_data.stats.dex - 10) / 2) : 0}
                onResult={handleInitiativeRoll}
              />
            </div>
          )}

          {/* FASE: Esperando (no es mi turno) */}
          {inCombat && (combatPhase === "waiting" || (!isMyTurn && combatPhase !== "initiative")) && (
            <div className="card combat-waiting">
              <div className="waiting-icon">⏳</div>
              <div className="waiting-text">
                {isMyTurn ? "¡Preparate, es tu turno!" : `Esperando a ${currentPlayer?.character_name || "..."}...`}
              </div>
            </div>
          )}

          {/* FASE: Elegir objetivo */}
          {inCombat && isMyTurn && combatPhase === "pick_target" && (
            <div className="card combat-action-card">
              <div className="sec-title">⚔ Elegí tu objetivo</div>
              {otherPlayers.map((p, i) => (
                <button key={i} className="target-btn" onClick={() => handlePickTarget(p)}>
                  🎯 {p.character_name} — {p.character_data?.hpCurr ?? "?"}/{p.character_data?.hpMax ?? "?"} HP
                </button>
              ))}
              <button className="btn-ghost full mt" onClick={passTurn}>⏭ Pasar turno</button>
            </div>
          )}

          {/* FASE: Elegir arma y tirar ataque */}
          {inCombat && isMyTurn && combatPhase === "roll_attack" && pendingAttack && (
            <div className="card combat-action-card">
              <div className="sec-title">🎲 Tirá tu Ataque</div>
              <p className="combat-hint">vs {pendingAttack.target.character_name}</p>

              {pendingAttack.weapons?.length > 1 && (
                <div className="weapon-select">
                  {pendingAttack.weapons.map((w, i) => (
                    <button key={i}
                      className={"weapon-btn" + (pendingAttack.weapon === w ? " active" : "")}
                      onClick={() => setPendingAttack(prev => ({ ...prev, weapon: w }))}>
                      {w.name} ({w.bonus}) {w.damage}
                    </button>
                  ))}
                </div>
              )}

              <div className="weapon-info">
                <span className="weapon-name">{pendingAttack.weapon?.name}</span>
                <span className="weapon-stats">{pendingAttack.weapon?.bonus} · {pendingAttack.weapon?.damage}</span>
              </div>

              <CombatDiceRoller
                label={`⚔ Ataque con ${pendingAttack.weapon?.name}`}
                defaultSides={20}
                defaultMod={parseInt(pendingAttack.weapon?.bonus) || 0}
                onResult={handleAttackRoll}
              />
              <button className="btn-ghost full mt" onClick={() => { setPendingAttack(null); setCombatPhase("pick_target"); }}>
                ← Volver
              </button>
            </div>
          )}

          {/* FASE: Tirar daño */}
          {inCombat && isMyTurn && combatPhase === "roll_damage" && pendingAttack && (
            <div className="card combat-action-card">
              <div className="sec-title">💥 Tirá el Daño</div>
              <p className="combat-hint">
                {pendingAttack.weapon?.name} → {pendingAttack.target.character_name}
                {pendingAttack.isCrit && <span className="crit-label"> ¡CRÍTICO! (dados ×2)</span>}
              </p>

              {(() => {
                const parsed = parseDamageFormula(pendingAttack.weapon?.damage || "1d4");
                const critCount = pendingAttack.isCrit ? parsed.count * 2 : parsed.count;
                return (
                  <CombatDiceRoller
                    label={`💥 Daño${pendingAttack.isCrit ? " (CRÍTICO)" : ""}`}
                    forceSides={parsed.faces}
                    defaultMod={parsed.mod}
                    onResult={(r) => {
                      // Sobreescribir con count correcto si es crit
                      const rolls = [];
                      for (let i = 0; i < critCount; i++) rolls.push(Math.floor(Math.random() * parsed.faces) + 1);
                      const sum = rolls.reduce((a, b) => a + b, 0);
                      handleDamageRoll({ ...r, rolls, sum, total: Math.max(0, sum + parsed.mod) });
                    }}
                  />
                );
              })()}
            </div>
          )}

          {/* FASE: Salvación forzada (recibo un hechizo) */}
          {inCombat && !isMyTurn && combatPhase === "saving_throw" && pendingSavingThrow && (
            <div className="card combat-action-card">
              <div className="sec-title">🛡 ¡Tirada de Salvación!</div>
              <p className="combat-hint">
                {pendingSavingThrow.attackerName} te lanzó un hechizo.<br />
                Salvación de <strong>{pendingSavingThrow.stat?.toUpperCase()}</strong> — CD {pendingSavingThrow.dc}
              </p>
              <CombatDiceRoller
                label={`🛡 Salvación de ${pendingSavingThrow.stat?.toUpperCase()}`}
                defaultSides={20}
                defaultMod={pendingSavingThrow.statMod || 0}
                onResult={handleSavingThrow}
              />
            </div>
          )}

          {/* ── Controles owner ── */}
          {!inCombat && t?.is_owner && players.length >= 2 && (
            <button className="btn-primary full mt" onClick={startCombat}>⚔ Iniciar Combate</button>
          )}
          {inCombat && t?.is_owner && (
            <button className="btn-danger full mt" onClick={endCombat}>⏹ Terminar Combate</button>
          )}
          {inCombat && isMyTurn && combatPhase === "pick_target" && (
            <button className="btn-ghost full mt-sm" onClick={passTurn}>⏭ Pasar turno</button>
          )}
        </div>

        {/* ── Chat ── */}
        <div className="room-chat">
          <div className="chat-history">
            {chatHistory.map((m, i) => (
              <div key={i} className="chat-msg">
                <span className="chat-who">{m.who}</span>
                <span className="chat-time">{m.time}</span>
                <div className="chat-text">{m.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Decí algo..."
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
            />
            <button className="chat-send" onClick={sendChat}>➤</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Vista de lista de mesas ──
  if (loading) return <div className="loading">Cargando mesas...</div>;

  return (
    <div className="page anim-fade-up">
      <h2 className="page-title">Mesas</h2>

      <div className="sec-title">Mis Mesas</div>
      {myTables.length === 0 && <div className="empty">No estás en ninguna mesa</div>}
      {myTables.map((t, i) => (
        <div key={t.id} className="table-card anim-stagger" style={{ animationDelay: i * 60 + "ms" }}>
          <div className="tc-top">
            <span className="tc-name">{t.name}</span>
            <span className="tc-code">{t.code}</span>
          </div>
          <div className="tc-info">
            {t.player_count} jugador(es) · {t.is_owner ? "Dueño" : "Miembro"}{t.status === "combat" ? " · ⚔ Combate" : ""}
          </div>
          <div className="tc-acts">
            <button className="btn-sm" onClick={() => openRoom(t.id)}>Entrar</button>
            {t.is_owner && <button className="btn-sm danger" onClick={() => deleteTable(t.id)}>Borrar</button>}
          </div>
        </div>
      ))}

      {creating ? (
        <div className="card mt">
          <div className="sec-title">Nueva Mesa</div>
          <input className="inp" placeholder="Nombre de la mesa" value={newName} onChange={e => setNewName(e.target.value)} />
          <div className="vis-row">
            <button className={"btn-sm" + (newVis === "public" ? " on" : "")} onClick={() => setNewVis("public")}>Pública</button>
            <button className={"btn-sm" + (newVis === "private" ? " on" : "")} onClick={() => setNewVis("private")}>Privada</button>
          </div>
          {newVis === "private" && <input className="inp" placeholder="Contraseña" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />}
          <div className="row-btns">
            <button className="btn-primary" onClick={createTable}>Crear</button>
            <button className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="btn-add full mt" onClick={() => setCreating(true)}>+ Crear Mesa</button>
      )}

      <div className="card mt">
        <div className="sec-title">Unirse por Código</div>
        <div className="code-row">
          <input className="inp code-inp" placeholder="CÓDIGO" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
          <button className="btn-primary" onClick={joinByCode}>Unirse</button>
        </div>
      </div>

      <div className="sec-title mt">Mesas Públicas</div>
      {pubTables.length === 0 && <div className="empty">No hay mesas públicas</div>}
      {pubTables.map(t => (
        <div key={t.id} className="table-card">
          <div className="tc-top"><span className="tc-name">{t.name}</span><span className="tc-code">{t.code}</span></div>
          <div className="tc-info">{t.player_count} jugador(es) · {t.owner_name}</div>
          <button className="btn-sm" onClick={() => pickChar(t.id)}>Unirse</button>
        </div>
      ))}
    </div>
  );
}
