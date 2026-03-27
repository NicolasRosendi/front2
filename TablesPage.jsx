import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../hooks/useAuth.jsx";
import { useToast } from "../hooks/useToast.jsx";

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
  const [charPick, setCharPick] = useState(null); // { tableId, chars }
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const [m, p] = await Promise.all([apiFetch("/tables"), apiFetch("/tables/public")]);
      setMyTables(m.tables || []); setPubTables(p.tables || []);
    } catch (e) { toast(e.message, true); }
    setLoading(false);
  };
  useEffect(() => { load(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const createTable = async () => {
    if (!newName.trim()) return;
    try {
      const d = await apiFetch("/tables", { method: "POST", body: JSON.stringify({ name: newName, visibility: newVis, password: newVis === "private" ? newPwd : undefined }) });
      setNewName(""); setCreating(false);
      const chars = await apiFetch("/characters");
      setCharPick({ tableId: d.tableId, chars: chars.characters || [] });
      load();
    } catch (e) { toast(e.message, true); }
  };

  const pickChar = async (tableId) => {
    try { const c = await apiFetch("/characters"); setCharPick({ tableId, chars: c.characters || [] }); } catch (e) { toast(e.message, true); }
  };

  const joinWithChar = async (charId) => {
    try {
      await apiFetch("/tables/" + charPick.tableId + "/join", { method: "POST", body: JSON.stringify({ character_id: charId }) });
      setCharPick(null); openRoom(charPick.tableId); load();
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

  const openRoom = async (tableId) => {
    try {
      const d = await apiFetch("/tables/" + tableId);
      setRoomData({ ...d, tableId });
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try { const fresh = await apiFetch("/tables/" + tableId); setRoomData({ ...fresh, tableId }); } catch (e) {}
      }, 3000);
    } catch (e) {
      if (e.message?.includes("no est")) { pickChar(tableId); }
      else toast(e.message, true);
    }
  };

  const leaveRoom = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } setRoomData(null); };

  const startCombat = async () => {
    try {
      await apiFetch("/tables/" + roomData.tableId + "/combat/start", { method: "POST" });
      toast("⚔ Combate iniciado!");
    } catch (e) { toast(e.message, true); }
  };

  const endCombat = async () => {
    const ok = await confirm("Terminar combate", "¿Estás seguro?");
    if (!ok) return;
    try { await apiFetch("/tables/" + roomData.tableId + "/combat/end", { method: "POST" }); toast("Combate finalizado"); } catch (e) { toast(e.message, true); }
  };

  // Character pick modal
  if (charPick) return (
    <div className="page anim-fade-up">
      <h2 className="page-title">Elegí tu Personaje</h2>
      {charPick.chars.map(c => <div key={c.id} className="char-card" onClick={() => joinWithChar(c.id)}><span className="char-card-name">{c.name}</span></div>)}
      <button className="btn-ghost full" onClick={() => setCharPick(null)}>Cancelar</button>
    </div>
  );

  // Room view
  if (roomData) {
    const t = roomData.table, players = roomData.players || [], inCombat = t.status === "combat", combat = roomData.combat;
    return (
      <div className="page anim-fade-up">
        <button className="btn-back" onClick={leaveRoom}>← Mesas</button>
        <h2 className="page-title">{t.name}</h2>
        <div className="room-code">Código: <strong>{t.code}</strong></div>
        {inCombat && <div className="combat-badge anim-pulse">⚔ Combate — Ronda {combat?.round || 1}</div>}
        <div className="card">
          <div className="sec-title">Jugadores ({players.length})</div>
          {players.map((p, i) => (
            <div key={i} className="player-row">
              <span className="player-n">{p.username}</span>
              <span className="player-c">{p.character_name || "—"}</span>
              {inCombat && (() => { const h = (combat?.hp_status||[]).find(x => x.character_id === p.character_id); return h ? <span className="player-hp">{h.hp_curr}/{h.hp_max}</span> : null; })()}
            </div>
          ))}
        </div>
        {inCombat && combat?.turn_order && (
          <div className="card">
            <div className="sec-title">Orden de Turnos</div>
            {combat.turn_order.map((to, i) => (
              <div key={i} className={"turn-row" + (i === combat.current_turn ? " active" : "")}>
                <span className="turn-init">{to.initiative}</span>
                <span className="turn-name">{to.character_name}</span>
                {i === combat.current_turn && <span className="turn-arrow">◄</span>}
              </div>
            ))}
          </div>
        )}
        {!inCombat && t.is_owner && players.length >= 2 && <button className="btn-primary full mt" onClick={startCombat}>⚔ Iniciar Combate</button>}
        {inCombat && t.is_owner && <button className="btn-danger full mt" onClick={endCombat}>⏹ Terminar Combate</button>}
      </div>
    );
  }

  if (loading) return <div className="loading">Cargando mesas...</div>;

  return (
    <div className="page anim-fade-up">
      <h2 className="page-title">Mesas</h2>
      <div className="sec-title">Mis Mesas</div>
      {myTables.length === 0 && <div className="empty">No estás en ninguna mesa</div>}
      {myTables.map((t, i) => (
        <div key={t.id} className="table-card anim-stagger" style={{animationDelay:i*60+"ms"}}>
          <div className="tc-top"><span className="tc-name">{t.name}</span><span className="tc-code">{t.code}</span></div>
          <div className="tc-info">{t.player_count} jugador(es) · {t.is_owner?"Dueño":"Miembro"} {t.status==="combat"?" · ⚔ Combate":""}</div>
          <div className="tc-acts">
            <button className="btn-sm" onClick={() => openRoom(t.id)}>Entrar</button>
            {t.is_owner && <button className="btn-sm danger" onClick={() => deleteTable(t.id)}>Borrar</button>}
          </div>
        </div>
      ))}
      {creating ? (
        <div className="card mt"><div className="sec-title">Nueva Mesa</div>
          <input className="inp" placeholder="Nombre de la mesa" value={newName} onChange={e => setNewName(e.target.value)} />
          <div className="vis-row">
            <button className={"btn-sm" + (newVis==="public"?" on":"")} onClick={() => setNewVis("public")}>Pública</button>
            <button className={"btn-sm" + (newVis==="private"?" on":"")} onClick={() => setNewVis("private")}>Privada</button>
          </div>
          {newVis === "private" && <input className="inp" placeholder="Contraseña" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />}
          <div className="row-btns"><button className="btn-primary" onClick={createTable}>Crear</button><button className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button></div>
        </div>
      ) : <button className="btn-add full mt" onClick={() => setCreating(true)}>+ Crear Mesa</button>}
      <div className="card mt"><div className="sec-title">Unirse por Código</div>
        <div className="code-row"><input className="inp code-inp" placeholder="CÓDIGO" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} /><button className="btn-primary" onClick={joinByCode}>Unirse</button></div>
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
