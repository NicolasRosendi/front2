import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { SPELLS_DATA, CLASS_PROGRESSION, ENCYCLOPEDIA_DATA, RACIAL_BONUSES, RACIAL_SPELLS } from "./encyclopedia-data.js";

// ═══════════════════════════════════════
//  CONFIG & CONSTANTS
// ═══════════════════════════════════════
const API = "https://backenddnd.onrender.com/api";
const STATS = ["str","dex","con","int","wis","cha"];
const STAT_NAMES = {str:"FUE",dex:"DES",con:"CON",int:"INT",wis:"SAB",cha:"CAR"};
const SKILLS = [
  {name:"Acrobacias",stat:"dex"},{name:"Atletismo",stat:"str"},{name:"Engaño",stat:"cha"},
  {name:"Historia",stat:"int"},{name:"Interpretación",stat:"cha"},{name:"Intimidación",stat:"cha"},
  {name:"Investigación",stat:"int"},{name:"Juego de Manos",stat:"dex"},{name:"Medicina",stat:"wis"},
  {name:"Naturaleza",stat:"int"},{name:"Percepción",stat:"wis"},{name:"Perspicacia",stat:"wis"},
  {name:"Persuasión",stat:"cha"},{name:"Religión",stat:"int"},{name:"Sigilo",stat:"dex"},
  {name:"Supervivencia",stat:"wis"},{name:"Trato con Animales",stat:"wis"}
];

// ═══════════════════════════════════════
//  AUTH CONTEXT
// ═══════════════════════════════════════
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("dnd_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

// ═══════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════
const mod = v => Math.floor((v - 10) / 2);
const fmt = v => (v >= 0 ? "+" + v : String(v));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ═══════════════════════════════════════
//  INLINE EDITABLE FIELD
// ═══════════════════════════════════════
function InlineField({ value, onChange, className = "", type = "text", placeholder = "—", style = {}, min, max }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  if (editing) {
    return (
      <input ref={ref} type={type} className={"inline-edit " + className} value={value || ""}
        placeholder={placeholder} min={min} max={max} style={style}
        onChange={e => onChange(type === "number" ? +e.target.value : e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === "Enter") setEditing(false); }} />
    );
  }
  return (
    <span className={"inline-display " + className} style={{cursor:"pointer",...style}}
      onClick={() => setEditing(true)}>
      {value || placeholder}
    </span>
  );
}

function InlineSelect({ value, onChange, options, className = "", placeholder = "—" }) {
  return (
    <select className={"inline-select " + className} value={value || ""}
      onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
        {typeof o === "string" ? o : o.label}
      </option>)}
    </select>
  );
}

// ═══════════════════════════════════════
//  STAT BLOCK
// ═══════════════════════════════════════
function StatBlock({ stat, value, onChange }) {
  return (
    <div className="stat-block">
      <div className="stat-label">{STAT_NAMES[stat]}</div>
      <div className="stat-mod">{fmt(mod(value))}</div>
      <div className="stat-score">
        <InlineField value={value} onChange={v => onChange(clamp(v, 1, 30))} type="number" className="stat-input" min={1} max={30} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  HP BAR
// ═══════════════════════════════════════
function HPBar({ hp, hpMax, hpTemp, onChange }) {
  const pct = hpMax > 0 ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : 0;
  const color = pct > 50 ? "var(--green)" : pct > 25 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="hp-section">
      <div className="hp-bar-track">
        <div className="hp-bar-fill" style={{ width: pct + "%", background: color }} />
      </div>
      <div className="hp-controls">
        <button className="hp-btn" onClick={() => onChange("hp", Math.max(0, hp - 1))}>−</button>
        <div className="hp-values">
          <InlineField value={hp} onChange={v => onChange("hp", clamp(v, 0, 999))} type="number" className="hp-num" />
          <span className="hp-sep">/</span>
          <InlineField value={hpMax} onChange={v => onChange("hpMax", clamp(v, 1, 999))} type="number" className="hp-num" />
        </div>
        <button className="hp-btn" onClick={() => onChange("hp", Math.min(hpMax, hp + 1))}>+</button>
      </div>
      <div className="hp-temp-row">
        <span className="hp-temp-label">Temp</span>
        <InlineField value={hpTemp} onChange={v => onChange("hpTemp", Math.max(0, v))} type="number" className="hp-temp-input" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  SAVING THROWS
// ═══════════════════════════════════════
function SavingThrows({ stats, profBonus, profList, onToggle }) {
  return (
    <div className="saves-section">
      <div className="section-title">Tiradas de Salvación</div>
      {STATS.map(s => {
        const prof = profList.includes(s);
        const val = mod(stats[s]) + (prof ? profBonus : 0);
        return (
          <div key={s} className="save-row" onClick={() => onToggle(s)}>
            <div className={"prof-dot" + (prof ? " active" : "")} />
            <span className="save-val">{fmt(val)}</span>
            <span className="save-name">{STAT_NAMES[s]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
//  SKILLS
// ═══════════════════════════════════════
function SkillsList({ stats, profBonus, profList, expertiseList, onToggleProf, onToggleExpertise }) {
  return (
    <div className="skills-section">
      <div className="section-title">Habilidades</div>
      {SKILLS.map(sk => {
        const prof = profList.includes(sk.name);
        const expert = expertiseList.includes(sk.name);
        const bonus = mod(stats[sk.stat]) + (expert ? profBonus * 2 : prof ? profBonus : 0);
        return (
          <div key={sk.name} className="skill-row">
            <div className={"prof-dot" + (prof ? " active" : "") + (expert ? " expert" : "")}
              onClick={() => {
                if (!prof) onToggleProf(sk.name);
                else if (prof && !expert) onToggleExpertise(sk.name);
                else { onToggleExpertise(sk.name); onToggleProf(sk.name); }
              }} />
            <span className="skill-val">{fmt(bonus)}</span>
            <span className="skill-name">{sk.name}</span>
            <span className="skill-stat">({STAT_NAMES[sk.stat]})</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
//  ATTACKS
// ═══════════════════════════════════════
function AttacksList({ attacks, onUpdate }) {
  const addAttack = () => onUpdate([...attacks, { name: "", bonus: "", damage: "" }]);
  const removeAttack = i => onUpdate(attacks.filter((_, idx) => idx !== i));
  const updateAttack = (i, field, val) => {
    const next = [...attacks];
    next[i] = { ...next[i], [field]: val };
    onUpdate(next);
  };
  return (
    <div className="attacks-section">
      <div className="section-title">Ataques y Armas</div>
      {attacks.map((a, i) => (
        <div key={i} className="attack-row">
          <InlineField value={a.name} onChange={v => updateAttack(i, "name", v)} placeholder="Nombre" className="atk-name" />
          <InlineField value={a.bonus} onChange={v => updateAttack(i, "bonus", v)} placeholder="+0" className="atk-bonus" />
          <InlineField value={a.damage} onChange={v => updateAttack(i, "damage", v)} placeholder="1d8+3" className="atk-dmg" />
          <button className="del-btn" onClick={() => removeAttack(i)}>✕</button>
        </div>
      ))}
      <button className="add-btn" onClick={addAttack}>+ Agregar arma</button>
    </div>
  );
}

// ═══════════════════════════════════════
//  INVENTORY
// ═══════════════════════════════════════
function Inventory({ items, coins, onUpdateItems, onUpdateCoins }) {
  const addItem = () => onUpdateItems([...items, { name: "", qty: 1 }]);
  const removeItem = i => onUpdateItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onUpdateItems(next);
  };
  const coinTypes = [
    { key: "coinPP", label: "PP" }, { key: "coinPO", label: "PO" },
    { key: "coinPE", label: "PE" }, { key: "coinPPT", label: "PP" }, { key: "coinPC", label: "PC" }
  ];
  return (
    <div className="inventory-section">
      <div className="section-title">Inventario</div>
      <div className="coins-row">
        {coinTypes.map(c => (
          <div key={c.key} className="coin-box">
            <InlineField value={coins[c.key] || 0} onChange={v => onUpdateCoins({ ...coins, [c.key]: Math.max(0, +v) })} type="number" className="coin-val" />
            <span className="coin-label">{c.label}</span>
          </div>
        ))}
      </div>
      {items.map((it, i) => (
        <div key={i} className="inv-row">
          <InlineField value={it.qty} onChange={v => updateItem(i, "qty", Math.max(0, +v))} type="number" className="inv-qty" />
          <InlineField value={it.name} onChange={v => updateItem(i, "name", v)} placeholder="Objeto..." className="inv-name" />
          <button className="del-btn" onClick={() => removeItem(i)}>✕</button>
        </div>
      ))}
      <button className="add-btn" onClick={addItem}>+ Agregar objeto</button>
    </div>
  );
}

// ═══════════════════════════════════════
//  SPELL SECTION
// ═══════════════════════════════════════
function SpellSection({ spells, charClass, charLevel, charRace, charSubrace, stats, profBonus, spellAbilityKey, onUpdate }) {
  const abilityMod = mod(stats[spellAbilityKey] || 10);
  const spellDC = 8 + abilityMod + profBonus;
  const atkBonus = abilityMod + profBonus;

  // Get available spells for a level
  const getAvailable = useCallback((lvl) => {
    if (!SPELLS_DATA || !charClass) return [];
    let list = SPELLS_DATA.filter(s => s.level === lvl && s.classes.includes(charClass));
    // Racial spells
    if (RACIAL_SPELLS) {
      const rk = charSubrace || charRace;
      const rd = RACIAL_SPELLS[rk] || RACIAL_SPELLS[charRace];
      if (rd) {
        const cl = parseInt(charLevel) || 1;
        Object.entries(rd).forEach(([reqLvl, names]) => {
          if (cl >= parseInt(reqLvl)) {
            names.forEach(sn => {
              if (sn.startsWith("_")) return;
              const found = SPELLS_DATA.find(s => s.name === sn && s.level === lvl);
              if (found && !list.find(x => x.name === found.name)) {
                list.push({ ...found, racial: true });
              }
            });
          }
        });
      }
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [charClass, charLevel, charRace, charSubrace]);

  const toggleSlot = (lvl, idx) => {
    const next = { ...spells };
    const d = { ...next[lvl] };
    d.used = idx < d.used ? idx : idx + 1;
    next[lvl] = d;
    onUpdate(next);
  };

  const addSpell = (lvl, name) => {
    if (!name) return;
    const next = { ...spells };
    const d = { ...next[lvl], list: [...(next[lvl]?.list || [])], prep: [...(next[lvl]?.prep || [])] };
    d.list.push(name);
    d.prep.push(false);
    next[lvl] = d;
    onUpdate(next);
  };

  const removeSpell = (lvl, idx) => {
    const next = { ...spells };
    const d = { ...next[lvl], list: [...next[lvl].list], prep: [...next[lvl].prep] };
    d.list.splice(idx, 1);
    d.prep.splice(idx, 1);
    next[lvl] = d;
    onUpdate(next);
  };

  const togglePrep = (lvl, idx) => {
    const next = { ...spells };
    const d = { ...next[lvl], prep: [...next[lvl].prep] };
    d.prep[idx] = !d.prep[idx];
    next[lvl] = d;
    onUpdate(next);
  };

  // Determine which levels to show
  let maxLvl = 2;
  if (CLASS_PROGRESSION && charClass) {
    const cls = CLASS_PROGRESSION.find(c => c.name === charClass);
    if (cls?.spell_slots?.[charLevel]) {
      const sd = cls.spell_slots[charLevel];
      if (Array.isArray(sd)) {
        for (let i = sd.length - 1; i >= 0; i--) { if (sd[i] > 0) { maxLvl = i + 1; break; } }
      } else if (sd.level) maxLvl = sd.level;
    }
  }

  const levelNames = ["Trucos","Nivel 1","Nivel 2","Nivel 3","Nivel 4","Nivel 5","Nivel 6","Nivel 7","Nivel 8","Nivel 9"];

  return (
    <div className="spell-section">
      <div className="spell-meta-bar">
        <div className="spell-meta-item">
          <span className="spell-meta-val">{STAT_NAMES[spellAbilityKey]}</span>
          <span className="spell-meta-lbl">Aptitud</span>
        </div>
        <div className="spell-meta-item">
          <span className="spell-meta-val">{spellDC}</span>
          <span className="spell-meta-lbl">CD Salvación</span>
        </div>
        <div className="spell-meta-item">
          <span className="spell-meta-val">{fmt(atkBonus)}</span>
          <span className="spell-meta-lbl">Bon. Ataque</span>
        </div>
      </div>

      {Array.from({ length: 10 }, (_, lvl) => {
        const d = spells[lvl] || { slots: 0, used: 0, list: [], prep: [] };
        const hasContent = d.list?.some(s => s?.trim());
        if (!hasContent && d.slots === 0 && lvl > maxLvl) return null;

        const available = getAvailable(lvl);
        const currentNames = (d.list || []).map(s => (s || "").toLowerCase().trim());
        const filtered = available.filter(s => !currentNames.includes(s.name.toLowerCase().trim()));

        return (
          <div key={lvl} className="spell-level-block">
            <div className="spell-level-header">
              <span className="spell-level-num">{lvl}</span>
              <span className="spell-level-title">{levelNames[lvl]}</span>
              {lvl > 0 && d.slots > 0 && (
                <div className="spell-slots">
                  {Array.from({ length: d.slots }, (_, i) => (
                    <div key={i} className={"spell-slot-dot" + (i < d.used ? " used" : "")}
                      onClick={() => toggleSlot(lvl, i)} />
                  ))}
                  <span className="spell-slots-count">{d.slots - d.used}/{d.slots}</span>
                </div>
              )}
            </div>
            <div className="spell-list">
              {(d.list || []).map((sp, i) => sp?.trim() ? (
                <div key={i} className="spell-entry">
                  <div className={"prep-dot" + ((d.prep || [])[i] ? " active" : "")}
                    onClick={() => togglePrep(lvl, i)} />
                  <span className="spell-name">{sp}</span>
                  <button className="del-btn-sm" onClick={() => removeSpell(lvl, i)}>✕</button>
                </div>
              ) : null)}
              {filtered.length > 0 && (
                <div className="spell-add-row">
                  <select className="spell-add-select" defaultValue=""
                    onChange={e => { addSpell(lvl, e.target.value); e.target.value = ""; }}>
                    <option value="">— Elegir {lvl === 0 ? "truco" : "conjuro"} —</option>
                    {filtered.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.school}){s.ritual ? " [R]" : ""}{s.racial ? " [Racial]" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
//  SHIELD TOGGLE
// ═══════════════════════════════════════
function ShieldToggle({ bonus, onChange }) {
  const cycle = [0, 2, 3, 4];
  const labels = { 0: "Escudo ✗", 2: "Escudo +2", 3: "Escudo+1 +3", 4: "Escudo+2 +4" };
  const next = () => { const i = cycle.indexOf(bonus); onChange(cycle[(i + 1) % cycle.length]); };
  return (
    <span className={"shield-badge" + (bonus > 0 ? " active" : "")} onClick={next}>
      {labels[bonus] || "Escudo ✗"}
    </span>
  );
}

// ═══════════════════════════════════════
//  DEATH SAVES
// ═══════════════════════════════════════
function DeathSaves({ saves, onChange }) {
  const toggle = i => { const n = [...saves]; n[i] = !n[i]; onChange(n); };
  return (
    <div className="death-saves">
      <div className="ds-row">
        <span className="ds-label">Éxitos</span>
        {[0,1,2].map(i => <div key={i} className={"ds-dot" + (saves[i] ? " success" : "")} onClick={() => toggle(i)} />)}
      </div>
      <div className="ds-row">
        <span className="ds-label">Fallos</span>
        {[3,4,5].map(i => <div key={i} className={"ds-dot" + (saves[i] ? " fail" : "")} onClick={() => toggle(i)} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  CHARACTER SHEET PAGE
// ═══════════════════════════════════════
function CharacterSheet() {
  const { token } = useAuth();
  const [charId, setCharId] = useState(null);
  const [charList, setCharList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // Character state
  const [fields, setFields] = useState({
    charName: "", class: "", level: "1", race: "", subrace: "", subclass: "", pactBoon: "",
    background: "", alignment: "", player: "", xp: "0",
    armorCA: "10", armorName: "Sin armadura", speed: "30", initiative: "",
    hitDice: "", hdTotal: "",
    coinPP: "0", coinPO: "0", coinPE: "0", coinPPT: "0", coinPC: "0",
    spellAbility: "INT", proficiencies: "",
    personality: "", ideals: "", bonds: "", flaws: "", backstory: "",
  });
  const [stats, setStats] = useState({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  const [hp, setHp] = useState(10);
  const [hpMax, setHpMax] = useState(10);
  const [hpTemp, setHpTemp] = useState(0);
  const [profBonus, setProfBonus] = useState(2);
  const [saveProf, setSaveProf] = useState([]);
  const [skillProf, setSkillProf] = useState([]);
  const [skillExpertise, setSkillExpertise] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [spells, setSpells] = useState({});
  const [shieldBonus, setShieldBonus] = useState(0);
  const [deathSaves, setDeathSaves] = useState([false,false,false,false,false,false]);
  const [inspiration, setInspiration] = useState(false);
  const [spellAbilityKey, setSpellAbilityKey] = useState("int");

  const setField = (key, val) => setFields(prev => ({ ...prev, [key]: val }));

  // Auto-save debounce
  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), 2000);
  }, [charId]);

  // Trigger save on any state change
  useEffect(() => { if (charId) triggerSave(); }, [fields, stats, hp, hpMax, hpTemp, profBonus, saveProf, skillProf, skillExpertise, attacks, inventory, spells, shieldBonus, deathSaves, inspiration]);

  // Load characters
  useEffect(() => {
    if (!token) return;
    apiFetch("/characters").then(d => {
      setCharList(d.characters || []);
      if (d.characters?.length > 0) loadChar(d.characters[0].id);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const loadChar = async (id) => {
    setLoading(true);
    try {
      const d = await apiFetch("/characters/" + id);
      const c = d.character;
      setCharId(c.id);
      const data = typeof c.data === "string" ? JSON.parse(c.data) : (c.data || {});
      // Load text fields
      const tf = data.textFields || {};
      setFields(prev => {
        const next = { ...prev };
        Object.keys(tf).forEach(k => { if (k in next) next[k] = tf[k]; });
        next.charName = c.name || tf.charName || "";
        return next;
      });
      // Load state
      if (data.stats) setStats(data.stats);
      setHp(data.hpCurr ?? 10);
      setHpMax(data.hpMax ?? 10);
      setHpTemp(data.hpTemp ?? 0);
      setProfBonus(data.profBonus ?? 2);
      setSaveProf(data.savingThrowProf || []);
      setSkillProf(data.skillProf || []);
      setSkillExpertise(data.skillExpertise || []);
      setAttacks(data.attacks || []);
      setInventory(data.inventory || []);
      setSpells(data.spells || {});
      setShieldBonus(data.shieldBonus ?? 0);
      setDeathSaves(data.deathSaves || [false,false,false,false,false,false]);
      setInspiration(data.inspiration ?? false);
      setSpellAbilityKey(data.spellAbilityKey || "int");
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const doSave = async () => {
    if (!charId) return;
    setSaving(true);
    try {
      await apiFetch("/characters/" + charId, {
        method: "PUT",
        body: JSON.stringify({
          name: fields.charName || "Sin nombre",
          data: {
            textFields: fields, stats, hpCurr: hp, hpMax, hpTemp, profBonus,
            savingThrowProf: saveProf, skillProf, skillExpertise,
            attacks, inventory, spells, shieldBonus, deathSaves, inspiration, spellAbilityKey,
            hasShield: shieldBonus > 0,
          }
        })
      });
    } catch (e) { console.error("Save failed:", e); }
    setSaving(false);
  };

  const createChar = async () => {
    try {
      const d = await apiFetch("/characters", { method: "POST", body: JSON.stringify({ name: "Nuevo Personaje" }) });
      setCharList(prev => [...prev, { id: d.id, name: "Nuevo Personaje" }]);
      loadChar(d.id);
    } catch (e) { console.error(e); }
  };

  const deleteChar = async (id) => {
    if (!confirm("¿Borrar este personaje?")) return;
    try {
      await apiFetch("/characters/" + id, { method: "DELETE" });
      setCharList(prev => prev.filter(c => c.id !== id));
      if (charId === id) { setCharId(null); setLoading(false); }
    } catch (e) { console.error(e); }
  };

  // Class change handler
  const onClassChange = (cls) => {
    setField("class", cls);
    const spellKeyMap = { Bardo:"cha", Brujo:"cha", Clérigo:"wis", Druida:"wis", Explorador:"wis", Hechicero:"cha", Mago:"int", Paladín:"cha" };
    if (spellKeyMap[cls]) {
      setSpellAbilityKey(spellKeyMap[cls]);
      setField("spellAbility", spellKeyMap[cls].toUpperCase());
    }
    const profByLevel = {1:2,2:2,3:2,4:2,5:3,6:3,7:3,8:3,9:4,10:4,11:4,12:4,13:5,14:5,15:5,16:5,17:6,18:6,19:6,20:6};
    const lvl = parseInt(fields.level) || 1;
    setProfBonus(profByLevel[lvl] || 2);
    // Auto-set saves
    if (CLASS_PROGRESSION) {
      const clsData = CLASS_PROGRESSION.find(c => c.name === cls);
      if (clsData?.saves) setSaveProf(clsData.saves.slice());
      // Auto-configure spell slots
      if (clsData?.spell_slots?.[lvl]) {
        const sd = clsData.spell_slots[lvl];
        setSpells(prev => {
          const next = { ...prev };
          if (Array.isArray(sd)) {
            sd.forEach((slots, i) => {
              next[i + 1] = { ...(next[i + 1] || { list: [], prep: [], used: 0 }), slots };
            });
          }
          return next;
        });
      }
    }
  };

  const handleHpChange = (key, val) => {
    if (key === "hp") setHp(val);
    else if (key === "hpMax") setHpMax(val);
    else if (key === "hpTemp") setHpTemp(val);
  };

  // Subclass options
  const getSubclasses = () => {
    if (!CLASS_PROGRESSION || !fields.class) return [];
    const cls = CLASS_PROGRESSION.find(c => c.name === fields.class);
    return cls?.subclasses_detail ? Object.keys(cls.subclasses_detail) : [];
  };

  // Subrace options
  const getSubraces = () => {
    if (!ENCYCLOPEDIA_DATA || !fields.race) return [];
    const race = ENCYCLOPEDIA_DATA.races.find(r => r.name === fields.race);
    return race?.subraces ? Object.keys(race.subraces) : [];
  };

  const classNames = ["Bárbaro","Bardo","Brujo","Clérigo","Druida","Explorador","Guerrero","Hechicero","Mago","Monje","Paladín","Pícaro"];
  const raceNames = ["Enano","Elfo","Mediano","Humano","Dracónido","Gnomo","Semielfo","Semiorco","Tiefling"];

  if (loading) return <div className="loading">Cargando...</div>;

  if (!charId) {
    return (
      <div className="char-select">
        <h2 className="page-title">Tus Personajes</h2>
        {charList.map(c => (
          <div key={c.id} className="char-card" onClick={() => loadChar(c.id)}>
            <span className="char-card-name">{c.name}</span>
            <button className="del-btn" onClick={e => { e.stopPropagation(); deleteChar(c.id); }}>✕</button>
          </div>
        ))}
        <button className="add-btn full" onClick={createChar}>+ Nuevo Personaje</button>
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "General" },
    { id: "combat", label: "Combate" },
    { id: "spells", label: "Conjuros" },
    { id: "inventory", label: "Inventario" },
    { id: "bio", label: "Historia" },
  ];

  return (
    <div className="sheet">
      {/* Header */}
      <div className="sheet-header">
        <button className="back-btn" onClick={() => setCharId(null)}>← Personajes</button>
        <h1 className="char-name-header">
          <InlineField value={fields.charName} onChange={v => setField("charName", v)} placeholder="Nombre del personaje" className="char-name-input" />
        </h1>
        <span className={"save-indicator" + (saving ? " saving" : "")}>
          {saving ? "Guardando..." : "✓"}
        </span>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={"tab-btn" + (tab === t.id ? " active" : "")}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: GENERAL */}
      {tab === "general" && (
        <div className="tab-content">
          {/* Identity */}
          <div className="card">
            <div className="id-grid">
              <div className="id-field">
                <span className="id-label">Clase</span>
                <InlineSelect value={fields.class} onChange={onClassChange} options={classNames} placeholder="— Clase —" />
              </div>
              <div className="id-field">
                <span className="id-label">Nivel</span>
                <InlineField value={fields.level} onChange={v => { setField("level", String(clamp(+v, 1, 20))); }} type="number" min={1} max={20} className="id-val" />
              </div>
              <div className="id-field">
                <span className="id-label">Raza</span>
                <InlineSelect value={fields.race} onChange={v => setField("race", v)} options={raceNames} placeholder="— Raza —" />
              </div>
              {getSubraces().length > 0 && (
                <div className="id-field">
                  <span className="id-label">Subraza</span>
                  <InlineSelect value={fields.subrace} onChange={v => setField("subrace", v)} options={getSubraces()} placeholder="— Subraza —" />
                </div>
              )}
              {getSubclasses().length > 0 && (
                <div className="id-field">
                  <span className="id-label">Subclase</span>
                  <InlineSelect value={fields.subclass} onChange={v => setField("subclass", v)} options={getSubclasses()} placeholder="— Subclase —" />
                </div>
              )}
              {fields.class === "Brujo" && parseInt(fields.level) >= 3 && (
                <div className="id-field">
                  <span className="id-label">Favor del Pacto</span>
                  <InlineSelect value={fields.pactBoon} onChange={v => setField("pactBoon", v)}
                    options={["Pacto del Tomo","Pacto de la Hoja","Pacto de la Cadena"]} placeholder="— Pacto —" />
                </div>
              )}
              <div className="id-field">
                <span className="id-label">Transfondo</span>
                <InlineField value={fields.background} onChange={v => setField("background", v)} placeholder="—" />
              </div>
              <div className="id-field">
                <span className="id-label">Alineamiento</span>
                <InlineField value={fields.alignment} onChange={v => setField("alignment", v)} placeholder="—" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {STATS.map(s => (
              <StatBlock key={s} stat={s} value={stats[s]} onChange={v => setStats(prev => ({ ...prev, [s]: v }))} />
            ))}
          </div>

          {/* Proficiency + Inspiration */}
          <div className="prof-row">
            <div className="prof-box">
              <InlineField value={profBonus} onChange={v => setProfBonus(clamp(v, 1, 10))} type="number" className="prof-val" />
              <span className="prof-label">Competencia</span>
            </div>
            <div className={"insp-box" + (inspiration ? " active" : "")} onClick={() => setInspiration(!inspiration)}>
              <span className="insp-icon">{inspiration ? "★" : "☆"}</span>
              <span className="insp-label">Inspiración</span>
            </div>
          </div>

          {/* Saves & Skills */}
          <div className="saves-skills-grid">
            <SavingThrows stats={stats} profBonus={profBonus} profList={saveProf}
              onToggle={s => setSaveProf(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
            <SkillsList stats={stats} profBonus={profBonus} profList={skillProf} expertiseList={skillExpertise}
              onToggleProf={s => setSkillProf(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
              onToggleExpertise={s => setSkillExpertise(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
          </div>
        </div>
      )}

      {/* TAB: COMBAT */}
      {tab === "combat" && (
        <div className="tab-content">
          <HPBar hp={hp} hpMax={hpMax} hpTemp={hpTemp} onChange={handleHpChange} />
          <DeathSaves saves={deathSaves} onChange={setDeathSaves} />
          <div className="combat-stats-row">
            <div className="combat-stat-box">
              <span className="combat-stat-val">
                <InlineField value={fields.armorCA} onChange={v => setField("armorCA", v)} type="number" className="combat-stat-input" />
              </span>
              <span className="combat-stat-lbl">CA</span>
              <ShieldToggle bonus={shieldBonus} onChange={setShieldBonus} />
            </div>
            <div className="combat-stat-box">
              <span className="combat-stat-val">{fmt(mod(stats.dex))}</span>
              <span className="combat-stat-lbl">Iniciativa</span>
            </div>
            <div className="combat-stat-box">
              <InlineField value={fields.speed} onChange={v => setField("speed", v)} type="number" className="combat-stat-val" />
              <span className="combat-stat-lbl">Velocidad</span>
            </div>
          </div>
          <AttacksList attacks={attacks} onUpdate={setAttacks} />
          <div className="card">
            <div className="section-title">Dados de Golpe</div>
            <div className="hd-row">
              <InlineField value={fields.hitDice} onChange={v => setField("hitDice", v)} placeholder="1d10" className="hd-dice" />
              <span className="hd-sep">/</span>
              <InlineField value={fields.hdTotal} onChange={v => setField("hdTotal", v)} placeholder="5" className="hd-total" />
            </div>
          </div>
        </div>
      )}

      {/* TAB: SPELLS */}
      {tab === "spells" && (
        <div className="tab-content">
          <SpellSection spells={spells} charClass={fields.class} charLevel={fields.level}
            charRace={fields.race} charSubrace={fields.subrace}
            stats={stats} profBonus={profBonus} spellAbilityKey={spellAbilityKey}
            onUpdate={setSpells} />
        </div>
      )}

      {/* TAB: INVENTORY */}
      {tab === "inventory" && (
        <div className="tab-content">
          <Inventory items={inventory} coins={fields} onUpdateItems={setInventory}
            onUpdateCoins={c => setFields(prev => ({ ...prev, ...c }))} />
          <div className="card">
            <div className="section-title">Competencias</div>
            <InlineField value={fields.proficiencies} onChange={v => setField("proficiencies", v)}
              placeholder="Idiomas, herramientas, armaduras..." className="text-area-field" />
          </div>
        </div>
      )}

      {/* TAB: BIO */}
      {tab === "bio" && (
        <div className="tab-content">
          {[
            { key: "personality", label: "Rasgos de personalidad" },
            { key: "ideals", label: "Ideales" },
            { key: "bonds", label: "Vínculos" },
            { key: "flaws", label: "Defectos" },
            { key: "backstory", label: "Historia de fondo" },
          ].map(f => (
            <div key={f.key} className="card">
              <div className="section-title">{f.label}</div>
              <InlineField value={fields[f.key]} onChange={v => setField(f.key, v)} placeholder="Escribí aquí..." className="text-area-field" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
//  AUTH SCREENS
// ═══════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const d = await apiFetch("/auth/" + mode, { method: "POST", body: JSON.stringify({ username: user, password: pass }) });
      localStorage.setItem("dnd_token", d.token);
      onAuth(d.token);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Digital Chronicle</h1>
        <p className="auth-subtitle">D&D 5e</p>
        <div className="auth-tabs">
          <button className={"auth-tab" + (mode === "login" ? " active" : "")} onClick={() => setMode("login")}>Entrar</button>
          <button className={"auth-tab" + (mode === "register" ? " active" : "")} onClick={() => setMode("register")}>Registrarse</button>
        </div>
        <input className="auth-input" placeholder="Usuario" value={user} onChange={e => setUser(e.target.value)} />
        <input className="auth-input" type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn" onClick={submit} disabled={loading}>
          {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  TABLES / MESAS
// ═══════════════════════════════════════
function TablesPage({ onOpenCombat }) {
  const [myTables, setMyTables] = useState([]);
  const [publicTables, setPublicTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVis, setNewVis] = useState("public");
  const [newPwd, setNewPwd] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [charSelectTable, setCharSelectTable] = useState(null);
  const [myChars, setMyChars] = useState([]);
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const [mine, pub] = await Promise.all([apiFetch("/tables"), apiFetch("/tables/public")]);
      setMyTables(mine.tables || []);
      setPublicTables(pub.tables || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const createTable = async () => {
    if (!newName.trim()) return;
    try {
      const d = await apiFetch("/tables", { method: "POST", body: JSON.stringify({ name: newName, visibility: newVis, password: newVis === "private" ? newPwd : undefined }) });
      setNewName(""); setCreating(false);
      // Auto-join: need to select character
      const chars = await apiFetch("/characters");
      setMyChars(chars.characters || []);
      setCharSelectTable({ id: d.tableId, action: "join" });
      load();
    } catch (e) { alert(e.message); }
  };

  const joinTable = async (tableId) => {
    try {
      const chars = await apiFetch("/characters");
      setMyChars(chars.characters || []);
      setCharSelectTable({ id: tableId, action: "join" });
    } catch (e) { alert(e.message); }
  };

  const confirmJoin = async (charId) => {
    if (!charSelectTable) return;
    try {
      await apiFetch("/tables/" + charSelectTable.id + "/join", { method: "POST", body: JSON.stringify({ character_id: charId }) });
      setCharSelectTable(null);
      load();
      openRoom(charSelectTable.id);
    } catch (e) { alert(e.message); }
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const d = await apiFetch("/tables/join", { method: "POST", body: JSON.stringify({ code: joinCode.toUpperCase() }) });
      setJoinCode("");
      const chars = await apiFetch("/characters");
      setMyChars(chars.characters || []);
      setCharSelectTable({ id: d.tableId, action: "join" });
      load();
    } catch (e) { alert(e.message); }
  };

  const deleteTable = async (id) => {
    if (!confirm("¿Borrar esta mesa?")) return;
    try { await apiFetch("/tables/" + id, { method: "DELETE" }); load(); } catch (e) { alert(e.message); }
  };

  const openRoom = async (tableId) => {
    try {
      const d = await apiFetch("/tables/" + tableId);
      if (d.table.status === "combat" && d.combat?.status === "active") {
        onOpenCombat(d);
      } else {
        setRoomData(d);
        startRoomPolling(tableId);
      }
    } catch (e) { alert(e.message); }
  };

  const startRoomPolling = (tableId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const d = await apiFetch("/tables/" + tableId);
        if (d.table.status === "combat" && d.combat?.status === "active") {
          clearInterval(pollRef.current); pollRef.current = null;
          onOpenCombat(d);
          setRoomData(null);
        } else {
          setRoomData(d);
        }
      } catch (e) { /* silence */ }
    }, 3000);
  };

  const startCombat = async (tableId) => {
    try {
      await apiFetch("/tables/" + tableId + "/combat/start", { method: "POST" });
      const d = await apiFetch("/tables/" + tableId);
      onOpenCombat(d);
      setRoomData(null);
    } catch (e) { alert(e.message); }
  };

  const leaveRoom = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setRoomData(null);
  };

  // Character select modal
  if (charSelectTable) {
    return (
      <div className="page-container">
        <h2 className="page-title">Elegí tu Personaje</h2>
        {myChars.map(c => (
          <div key={c.id} className="char-card" onClick={() => confirmJoin(c.id)}>
            <span className="char-card-name">{c.name}</span>
          </div>
        ))}
        <button className="add-btn full" onClick={() => setCharSelectTable(null)}>Cancelar</button>
      </div>
    );
  }

  // Room view
  if (roomData) {
    const t = roomData.table;
    const players = roomData.players || [];
    return (
      <div className="page-container">
        <button className="back-btn" onClick={leaveRoom}>← Mesas</button>
        <h2 className="page-title">{t.name}</h2>
        <div className="room-code">Código: <strong>{t.code}</strong></div>
        <div className="card">
          <div className="section-title">Jugadores ({players.length})</div>
          {players.map((p, i) => (
            <div key={i} className="player-row">
              <span className="player-name">{p.username}</span>
              <span className="player-char">{p.character_name || "Sin personaje"}</span>
            </div>
          ))}
        </div>
        {t.is_owner && (
          <button className="action-btn primary" onClick={() => startCombat(t.id)}>⚔ Iniciar Combate</button>
        )}
      </div>
    );
  }

  if (loading) return <div className="loading">Cargando mesas...</div>;

  return (
    <div className="page-container">
      <h2 className="page-title">Mesas</h2>

      {/* My tables */}
      <div className="section-title" style={{ padding: "0 0 8px" }}>Mis Mesas</div>
      {myTables.length === 0 && <div className="empty-msg">No estás en ninguna mesa</div>}
      {myTables.map(t => (
        <div key={t.id} className="table-card">
          <div className="table-card-top">
            <span className="table-card-name">{t.name}</span>
            <span className="table-card-code">{t.code}</span>
          </div>
          <div className="table-card-info">{t.player_count} jugador(es) · {t.is_owner ? "Dueño" : "Miembro"}</div>
          <div className="table-card-actions">
            <button className="action-btn" onClick={() => openRoom(t.id)}>Entrar</button>
            {t.is_owner && <button className="action-btn danger" onClick={() => deleteTable(t.id)}>Borrar</button>}
          </div>
        </div>
      ))}

      {/* Create */}
      {creating ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title">Nueva Mesa</div>
          <input className="auth-input" placeholder="Nombre de la mesa" value={newName} onChange={e => setNewName(e.target.value)} />
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            <button className={"tab-btn" + (newVis === "public" ? " active" : "")} onClick={() => setNewVis("public")}>Pública</button>
            <button className={"tab-btn" + (newVis === "private" ? " active" : "")} onClick={() => setNewVis("private")}>Privada</button>
          </div>
          {newVis === "private" && <input className="auth-input" placeholder="Contraseña" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="action-btn primary" onClick={createTable}>Crear</button>
            <button className="action-btn" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="add-btn full" onClick={() => setCreating(true)} style={{ marginTop: 12 }}>+ Crear Mesa</button>
      )}

      {/* Join by code */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="section-title">Unirse por Código</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="auth-input" placeholder="CÓDIGO" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            style={{ flex: 1, textAlign: "center", letterSpacing: 4, fontFamily: "Cinzel, serif", fontSize: 18 }} />
          <button className="action-btn primary" onClick={joinByCode}>Unirse</button>
        </div>
      </div>

      {/* Public tables */}
      <div className="section-title" style={{ padding: "16px 0 8px" }}>Mesas Públicas</div>
      {publicTables.length === 0 && <div className="empty-msg">No hay mesas públicas</div>}
      {publicTables.map(t => (
        <div key={t.id} className="table-card">
          <div className="table-card-top">
            <span className="table-card-name">{t.name}</span>
            <span className="table-card-code">{t.code}</span>
          </div>
          <div className="table-card-info">{t.player_count} jugador(es) · {t.owner_name}</div>
          <button className="action-btn" onClick={() => joinTable(t.id)}>Unirse</button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
//  ENCYCLOPEDIA
// ═══════════════════════════════════════
const SCHOOL_COLORS = {
  "Abjuración":"#4a9eff","Adivinación":"#c8c8c8","Conjuración":"#ffcc44","Encantamiento":"#ff69b4",
  "Evocación":"#ff6644","Ilusión":"#bf7fff","Nigromancia":"#66cc66","Transmutación":"#ff9933"
};

function EncyclopediaPage() {
  const [category, setCategory] = useState("spells");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [classView, setClassView] = useState(null);
  const [expandedFeature, setExpandedFeature] = useState(null);

  const categories = [
    { id: "spells", label: "Conjuros" }, { id: "classes", label: "Clases" },
    { id: "races", label: "Razas" }, { id: "combat", label: "Combate" }, { id: "spellrules", label: "Magia" }
  ];

  const classNames = ["Bardo","Brujo","Clérigo","Druida","Explorador","Hechicero","Mago","Paladín"];

  // Class full view
  if (classView && CLASS_PROGRESSION) {
    const cls = CLASS_PROGRESSION.find(c => c.name === classView);
    if (!cls) { setClassView(null); return null; }
    return (
      <div className="page-container">
        <button className="back-btn" onClick={() => setClassView(null)}>← Clases</button>
        <h2 className="page-title">{cls.name}</h2>
        <div className="card">
          <div className="enc-class-info">
            <span>Dado de golpe: {cls.hit_die}</span> · <span>Stat principal: {cls.primary}</span>
          </div>
          {cls.armor && <div className="enc-detail">Armaduras: {cls.armor}</div>}
          {cls.weapons && <div className="enc-detail">Armas: {cls.weapons}</div>}
        </div>

        {/* Subclasses */}
        {cls.subclasses_detail && Object.keys(cls.subclasses_detail).length > 0 && (
          <div className="card">
            <div className="section-title">Subclases</div>
            {Object.entries(cls.subclasses_detail).map(([name, sub]) => {
              const isExp = expandedFeature === "sub:" + name;
              return (
                <div key={name} className="enc-subclass-block">
                  <div className="enc-subclass-name" onClick={() => setExpandedFeature(isExp ? null : "sub:" + name)}>
                    {name} {isExp ? "▾" : "▸"}
                  </div>
                  {isExp && (
                    <div className="enc-subclass-content">
                      <p className="enc-desc">{sub.description}</p>
                      {sub.features && Object.entries(sub.features).sort((a,b) => +a[0] - +b[0]).map(([lvl, feat]) => (
                        <div key={lvl} className="enc-sub-feat">
                          <span className="enc-sub-feat-lvl">Nv{lvl}</span>
                          <span className="enc-sub-feat-name">{feat.name}</span>
                          <p className="enc-sub-feat-desc">{feat.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Progression */}
        <div className="card">
          <div className="section-title">Progresión por Nivel</div>
          {cls.progression.map(p => {
            if (p.features.length === 0) return null;
            return (
              <div key={p.level} className="enc-level-row">
                <div className="enc-level-num">{p.level}</div>
                <div className="enc-level-prof">+{p.prof_bonus}</div>
                <div className="enc-level-feats">
                  {p.features.map((f, i) => {
                    const baseName = f.replace(/\s*\(.*?\)\s*$/, "").trim();
                    const detail = cls.features_detail?.[f] || cls.features_detail?.[baseName];
                    if (detail) {
                      const key = cls.name + ":" + f + ":" + p.level;
                      const isExp = expandedFeature === key;
                      return (
                        <div key={i}>
                          <span className="enc-tag clickable" onClick={() => setExpandedFeature(isExp ? null : key)}>
                            {f} {isExp ? "▾" : "▸"}
                          </span>
                          {isExp && <div className="enc-feature-desc">{detail}</div>}
                        </div>
                      );
                    }
                    return <span key={i} className="enc-tag">{f}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Spell slots table */}
        {cls.spell_slots && (
          <div className="card">
            <div className="section-title">Espacios de Conjuro</div>
            <div className="enc-slots-table">
              <div className="enc-slots-header">
                <span>Nv</span>
                {Array.from({length: 9}, (_, i) => <span key={i}>{i+1}°</span>)}
              </div>
              {Object.entries(cls.spell_slots).filter(([k]) => +k <= 20).sort((a,b) => +a[0] - +b[0]).map(([lvl, slots]) => (
                <div key={lvl} className="enc-slots-row">
                  <span>{lvl}</span>
                  {Array.isArray(slots)
                    ? slots.map((s, i) => <span key={i} className={s > 0 ? "has-slots" : ""}>{s || "—"}</span>)
                    : <span style={{gridColumn:"2/-1",fontSize:11}}>{slots.slots} espacios de nv{slots.level}</span>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 className="page-title">Enciclopedia</h2>

      {/* Category tabs */}
      <div className="enc-cats">
        {categories.map(c => (
          <button key={c.id} className={"tab-btn" + (category === c.id ? " active" : "")}
            onClick={() => { setCategory(c.id); setExpanded(null); setSearch(""); setLevelFilter("all"); setClassFilter("all"); }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* SPELLS */}
      {category === "spells" && SPELLS_DATA && (
        <>
          <input className="enc-search" placeholder="Buscar conjuros..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="enc-filters">
            <select className="enc-filter-select" value={levelFilter} onChange={e => setLevelFilter(e.target.value === "all" ? "all" : +e.target.value)}>
              <option value="all">Todos los niveles</option>
              {Array.from({length:10},(_, i) => <option key={i} value={i}>{i === 0 ? "Trucos" : "Nivel " + i}</option>)}
            </select>
            <select className="enc-filter-select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="all">Todas las clases</option>
              {classNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(() => {
            const s = search.toLowerCase();
            const filtered = SPELLS_DATA.filter(sp =>
              (levelFilter === "all" || sp.level === levelFilter) &&
              (classFilter === "all" || sp.classes.includes(classFilter)) &&
              (!s || sp.name.toLowerCase().includes(s) || sp.school.toLowerCase().includes(s))
            );
            return (
              <>
                <div className="enc-count">{filtered.length} conjuro{filtered.length !== 1 ? "s" : ""}</div>
                {filtered.map((sp, i) => {
                  const isExp = expanded === sp.name;
                  return (
                    <div key={i} className="enc-spell-card" onClick={() => setExpanded(isExp ? null : sp.name)}>
                      <div className="enc-spell-top">
                        <span className="enc-spell-name">{sp.name}</span>
                        <span className="enc-spell-level">{sp.level === 0 ? "Truco" : "Nv" + sp.level}</span>
                      </div>
                      <div className="enc-spell-meta">
                        <span style={{color: SCHOOL_COLORS[sp.school] || "#999"}}>{sp.school}</span>
                        {sp.ritual && <span className="enc-ritual-tag">RITUAL</span>}
                        <span className="enc-spell-classes">{sp.classes.join(", ")}</span>
                      </div>
                      {isExp && (
                        <div className="enc-spell-detail">
                          <div className="enc-spell-props">
                            <span>⏱ {sp.casting_time || "1 acción"}</span>
                            <span>📏 {sp.range || "—"}</span>
                            <span>⏳ {sp.duration || "—"}</span>
                          </div>
                          {sp.components && <div className="enc-spell-comp">Componentes: {sp.components}</div>}
                          <p className="enc-spell-desc">{sp.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </>
      )}

      {/* CLASSES */}
      {category === "classes" && CLASS_PROGRESSION && (
        <div className="enc-class-list">
          {CLASS_PROGRESSION.map(cls => (
            <div key={cls.name} className="enc-class-card" onClick={() => setClassView(cls.name)}>
              <span className="enc-class-card-name">{cls.name}</span>
              <span className="enc-class-card-info">{cls.hit_die} · {cls.primary}</span>
              <span className="enc-class-card-arrow">▸</span>
            </div>
          ))}
        </div>
      )}

      {/* RACES */}
      {category === "races" && ENCYCLOPEDIA_DATA && (
        <div>
          {ENCYCLOPEDIA_DATA.races.map(r => {
            const isExp = expanded === "race:" + r.name;
            return (
              <div key={r.name} className="enc-race-card">
                <div className="enc-race-top" onClick={() => setExpanded(isExp ? null : "race:" + r.name)}>
                  <span className="enc-race-name">{r.name}</span>
                  <span className="enc-race-info">{r.ability_increase} · {r.speed}</span>
                  <span>{isExp ? "▾" : "▸"}</span>
                </div>
                {isExp && (
                  <div className="enc-race-detail">
                    {r.traits && Object.entries(r.traits).map(([name, desc]) => (
                      <div key={name} className="enc-trait">
                        <strong>{name}:</strong> {desc}
                      </div>
                    ))}
                    {r.subraces && Object.keys(r.subraces).length > 0 && (
                      <div className="enc-subraces">
                        <strong>Subrazas:</strong>
                        {Object.entries(r.subraces).map(([name, desc]) => (
                          <div key={name} className="enc-subrace-item"><strong>{name}:</strong> {desc}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COMBAT RULES */}
      {category === "combat" && ENCYCLOPEDIA_DATA && (
        <div>
          {ENCYCLOPEDIA_DATA.combat_rules.map((rule, i) => {
            const isExp = expanded === "rule:" + i;
            return (
              <div key={i} className="enc-rule-card" onClick={() => setExpanded(isExp ? null : "rule:" + i)}>
                <div className="enc-rule-name">{rule.title} {isExp ? "▾" : "▸"}</div>
                {isExp && <div className="enc-rule-content">{rule.content}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* SPELL RULES */}
      {category === "spellrules" && ENCYCLOPEDIA_DATA && (
        <div>
          {ENCYCLOPEDIA_DATA.spell_rules.map((rule, i) => {
            const isExp = expanded === "srule:" + i;
            return (
              <div key={i} className="enc-rule-card" onClick={() => setExpanded(isExp ? null : "srule:" + i)}>
                <div className="enc-rule-name">{rule.title} {isExp ? "▾" : "▸"}</div>
                {isExp && <div className="enc-rule-content">{rule.content}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
//  MAIN APP WITH NAVIGATION
// ═══════════════════════════════════════
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("dnd_token"));
  const [page, setPage] = useState("characters"); // characters, tables, encyclopedia

  const logout = () => { localStorage.removeItem("dnd_token"); setToken(null); };

  if (!token) return <AuthScreen onAuth={setToken} />;

  return (
    <AuthCtx.Provider value={{ token }}>
      <div className="app-root">
        {/* Bottom nav */}
        <div className="main-content">
          {page === "characters" && <CharacterSheet />}
          {page === "tables" && <TablesPage onOpenCombat={(d) => { /* TODO: combat view */ }} />}
          {page === "encyclopedia" && <EncyclopediaPage />}
        </div>
        <nav className="bottom-nav">
          <button className={"nav-btn" + (page === "characters" ? " active" : "")} onClick={() => setPage("characters")}>
            <span className="nav-icon">📜</span><span className="nav-label">Ficha</span>
          </button>
          <button className={"nav-btn" + (page === "tables" ? " active" : "")} onClick={() => setPage("tables")}>
            <span className="nav-icon">⚔</span><span className="nav-label">Mesas</span>
          </button>
          <button className={"nav-btn" + (page === "encyclopedia" ? " active" : "")} onClick={() => setPage("encyclopedia")}>
            <span className="nav-icon">📖</span><span className="nav-label">Enciclopedia</span>
          </button>
          <button className="nav-btn" onClick={logout}>
            <span className="nav-icon">🚪</span><span className="nav-label">Salir</span>
          </button>
        </nav>
      </div>
      <style>{`
/* ═══════════════════════════════════════
   DIGITAL CHRONICLE - D&D 5e
   Illuminated Manuscript Theme
   ═══════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;800&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Manrope:wght@300;400;600;800&display=swap');

:root {
  --bg: #0e0c0b; --surface: #161412; --surface-dim: #111010;
  --surface-container: #1a1816; --surface-container-low: #1e1b19;
  --surface-container-high: #252220;
  --primary: #c8a96e; --primary-dim: #8a7444; --primary-bright: #e8d5a3;
  --tertiary: #d2bcff; --tertiary-container: #4c2a8c;
  --on-surface: #e8e1dd; --on-surface-dim: #b0a89f; --on-surface-muted: #7a6f63;
  --outline-variant: #3a3530;
  --green: #4caf50; --yellow: #ff9800; --red: #f44336;
  --red-bright: #ff6b6b;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.app-root {
  font-family: 'Crimson Text', serif;
  background: var(--bg); color: var(--on-surface);
  min-height: 100vh; max-width: 600px; margin: 0 auto;
}

.loading { text-align: center; padding: 40px; color: var(--on-surface-muted); font-style: italic; }

/* ── AUTH ── */
.auth-screen { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
.auth-card { background: var(--surface); padding: 32px; width: 100%; max-width: 360px; }
.auth-title { font-family: 'Cinzel', serif; font-size: 24px; font-weight: 800; color: var(--primary); text-align: center; }
.auth-subtitle { font-family: 'Manrope', sans-serif; font-size: 11px; text-align: center; color: var(--on-surface-muted); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
.auth-tabs { display: flex; gap: 0; margin-bottom: 16px; }
.auth-tab { flex: 1; padding: 10px; background: var(--surface-container); border: none; color: var(--on-surface-muted); font-family: 'Cinzel', serif; font-size: 13px; cursor: pointer; }
.auth-tab.active { background: var(--primary-dim); color: var(--primary-bright); }
.auth-input { width: 100%; padding: 12px; background: var(--surface-dim); border: none; border-bottom: 1px solid var(--outline-variant); color: var(--on-surface); font-family: 'Crimson Text', serif; font-size: 16px; margin-bottom: 12px; outline: none; }
.auth-input:focus { border-bottom-color: var(--primary); }
.auth-btn { width: 100%; padding: 14px; background: var(--primary-dim); border: none; color: var(--primary-bright); font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.auth-btn:hover { background: var(--primary); color: var(--bg); }
.auth-error { color: var(--red-bright); font-size: 13px; text-align: center; margin-top: 8px; }

/* ── CHAR SELECT ── */
.char-select { padding: 20px; }
.page-title { font-family: 'Cinzel', serif; font-size: 20px; font-weight: 800; color: var(--primary); text-align: center; margin-bottom: 20px; }
.char-card { display: flex; justify-content: space-between; align-items: center; background: var(--surface); padding: 16px; margin-bottom: 8px; cursor: pointer; }
.char-card:hover { background: var(--surface-container); }
.char-card-name { font-family: 'Cinzel', serif; font-size: 15px; font-weight: 600; }

/* ── SHEET ── */
.sheet { padding-bottom: 40px; }
.sheet-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--outline-variant); position: sticky; top: 0; z-index: 10; }
.back-btn { background: none; border: none; color: var(--on-surface-muted); font-family: 'Manrope', sans-serif; font-size: 12px; cursor: pointer; white-space: nowrap; }
.char-name-header { flex: 1; text-align: center; }
.char-name-input { font-family: 'Cinzel', serif !important; font-size: 16px !important; font-weight: 800 !important; color: var(--primary-bright) !important; text-align: center; }
.save-indicator { font-family: 'Manrope', sans-serif; font-size: 10px; color: var(--green); white-space: nowrap; }
.save-indicator.saving { color: var(--yellow); }

/* ── TABS ── */
.tab-bar { display: flex; background: var(--surface); border-bottom: 1px solid var(--outline-variant); overflow-x: auto; }
.tab-btn { flex: 1; padding: 12px 8px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--on-surface-muted); font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; text-transform: uppercase; letter-spacing: 1px; }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
.tab-content { padding: 12px; }

/* ── CARD ── */
.card { background: var(--surface); padding: 14px; margin-bottom: 10px; }
.section-title { font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; color: var(--primary); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--outline-variant); }

/* ── INLINE FIELDS ── */
.inline-display { color: var(--on-surface); transition: all .15s; padding: 2px 4px; }
.inline-display:hover { background: var(--surface-container-high); }
.inline-edit { background: var(--surface-dim); border: none; border-bottom: 1px solid var(--primary); color: var(--on-surface); font-family: inherit; font-size: inherit; padding: 2px 4px; outline: none; width: 100%; }
.inline-select { background: var(--surface-dim); border: none; border-bottom: 1px solid var(--primary-dim); color: var(--on-surface); font-family: 'Cinzel', serif; font-size: 12px; padding: 6px; outline: none; width: 100%; appearance: auto; }
.text-area-field { display: block; width: 100%; min-height: 40px; font-size: 14px; line-height: 1.5; }

/* ── ID GRID ── */
.id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.id-field { }
.id-label { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px; }
.id-val { font-size: 14px; }

/* ── STATS ── */
.stats-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-bottom: 10px; }
.stat-block { background: var(--surface); text-align: center; padding: 8px 2px; }
.stat-label { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800; color: var(--primary); letter-spacing: 2px; }
.stat-mod { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 800; color: var(--on-surface); }
.stat-score { margin-top: 2px; }
.stat-input { width: 36px !important; text-align: center !important; font-size: 12px !important; color: var(--on-surface-dim) !important; }

/* ── PROF & INSPIRATION ── */
.prof-row { display: flex; gap: 8px; margin-bottom: 10px; }
.prof-box { flex: 1; background: var(--surface); display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
.prof-val { width: 40px !important; text-align: center !important; font-family: 'Cinzel', serif !important; font-size: 20px !important; font-weight: 800 !important; color: var(--primary) !important; }
.prof-label { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 1px; }
.insp-box { flex: 0 0 auto; background: var(--surface); display: flex; align-items: center; gap: 6px; padding: 10px 14px; cursor: pointer; }
.insp-box.active { background: var(--primary-dim); }
.insp-icon { font-size: 20px; color: var(--primary); }
.insp-label { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--on-surface-muted); text-transform: uppercase; }

/* ── SAVES & SKILLS ── */
.saves-skills-grid { display: grid; grid-template-columns: auto 1fr; gap: 10px; }
.saves-section, .skills-section { background: var(--surface); padding: 12px; }
.save-row, .skill-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; cursor: pointer; }
.prof-dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--on-surface-muted); flex-shrink: 0; }
.prof-dot.active { background: var(--primary); border-color: var(--primary); }
.prof-dot.expert { background: var(--tertiary); border-color: var(--tertiary); }
.save-val, .skill-val { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; min-width: 28px; }
.save-name, .skill-name { font-family: 'Crimson Text', serif; font-size: 13px; }
.skill-stat { font-family: 'Manrope', sans-serif; font-size: 8px; color: var(--on-surface-muted); margin-left: auto; }

/* ── HP ── */
.hp-section { background: var(--surface); padding: 14px; margin-bottom: 10px; }
.hp-bar-track { height: 8px; background: var(--surface-container-low); margin-bottom: 10px; overflow: hidden; }
.hp-bar-fill { height: 100%; transition: width .3s, background .3s; }
.hp-controls { display: flex; align-items: center; justify-content: center; gap: 12px; }
.hp-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--surface-container); border: 1px solid var(--outline-variant); color: var(--on-surface); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.hp-values { display: flex; align-items: baseline; gap: 2px; }
.hp-num { width: 50px !important; text-align: center !important; font-family: 'Cinzel', serif !important; font-size: 28px !important; font-weight: 800 !important; }
.hp-sep { font-family: 'Cinzel', serif; font-size: 20px; color: var(--on-surface-muted); }
.hp-temp-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; }
.hp-temp-label { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--tertiary); text-transform: uppercase; }
.hp-temp-input { width: 40px !important; text-align: center !important; font-size: 14px !important; color: var(--tertiary) !important; }

/* ── DEATH SAVES ── */
.death-saves { background: var(--surface); padding: 10px 14px; margin-bottom: 10px; }
.ds-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.ds-label { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 1px; min-width: 50px; }
.ds-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--on-surface-muted); cursor: pointer; }
.ds-dot.success { background: var(--green); border-color: var(--green); }
.ds-dot.fail { background: var(--red); border-color: var(--red); }

/* ── COMBAT STATS ── */
.combat-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
.combat-stat-box { background: var(--surface); text-align: center; padding: 12px 8px; }
.combat-stat-val { font-family: 'Cinzel', serif; font-size: 24px; font-weight: 800; display: block; }
.combat-stat-input { width: 50px !important; text-align: center !important; }
.combat-stat-lbl { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 2px; }
.shield-badge { display: inline-block; font-family: 'Manrope', sans-serif; font-size: 9px; padding: 3px 8px; margin-top: 4px; background: var(--surface-container); color: var(--on-surface-muted); cursor: pointer; }
.shield-badge.active { background: var(--tertiary-container); color: var(--tertiary); }

/* ── ATTACKS ── */
.attacks-section { background: var(--surface); padding: 14px; margin-bottom: 10px; }
.attack-row { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; padding: 6px; background: var(--surface-container-low); }
.atk-name { flex: 2 !important; font-size: 13px !important; }
.atk-bonus { width: 40px !important; text-align: center !important; font-size: 13px !important; color: var(--primary) !important; }
.atk-dmg { flex: 1 !important; font-size: 13px !important; }

/* ── INVENTORY ── */
.inventory-section { background: var(--surface); padding: 14px; margin-bottom: 10px; }
.coins-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 12px; }
.coin-box { text-align: center; background: var(--surface-container-low); padding: 6px; }
.coin-val { width: 100% !important; text-align: center !important; font-family: 'Cinzel', serif !important; font-size: 16px !important; font-weight: 800 !important; color: var(--primary) !important; }
.coin-label { font-family: 'Manrope', sans-serif; font-size: 8px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 1px; }
.inv-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; padding: 4px 6px; background: var(--surface-container-low); }
.inv-qty { width: 32px !important; text-align: center !important; font-size: 13px !important; }
.inv-name { flex: 1 !important; font-size: 13px !important; }

/* ── SPELLS ── */
.spell-section { }
.spell-meta-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 10px; }
.spell-meta-item { background: var(--surface); text-align: center; padding: 10px; }
.spell-meta-val { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 800; display: block; color: var(--tertiary); }
.spell-meta-lbl { font-family: 'Manrope', sans-serif; font-size: 8px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 1px; }
.spell-level-block { background: var(--surface); margin-bottom: 6px; padding: 10px 12px; }
.spell-level-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.spell-level-num { font-family: 'Cinzel', serif; font-size: 20px; font-weight: 800; color: var(--primary); min-width: 24px; }
.spell-level-title { font-family: 'Manrope', sans-serif; font-size: 10px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 2px; }
.spell-slots { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.spell-slot-dot { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid var(--tertiary); cursor: pointer; }
.spell-slot-dot.used { background: var(--tertiary); }
.spell-slots-count { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--on-surface-muted); }
.spell-list { }
.spell-entry { display: flex; align-items: center; gap: 6px; padding: 3px 0; }
.prep-dot { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--on-surface-muted); cursor: pointer; flex-shrink: 0; }
.prep-dot.active { background: var(--primary); border-color: var(--primary); }
.spell-name { font-family: 'Crimson Text', serif; font-size: 14px; flex: 1; }
.del-btn-sm { background: none; border: none; color: var(--red-bright); font-size: 12px; cursor: pointer; opacity: 0.5; padding: 2px 4px; }
.del-btn-sm:hover { opacity: 1; }
.spell-add-row { margin-top: 6px; }
.spell-add-select { width: 100%; padding: 8px; background: var(--surface-container-low); border: none; border-bottom: 1px solid var(--primary-dim); color: var(--on-surface); font-family: 'Crimson Text', serif; font-size: 13px; outline: none; appearance: auto; }

/* ── HIT DICE ── */
.hd-row { display: flex; align-items: center; justify-content: center; gap: 6px; }
.hd-dice { width: 60px !important; text-align: center !important; font-size: 16px !important; }
.hd-total { width: 40px !important; text-align: center !important; font-size: 16px !important; }
.hd-sep { color: var(--on-surface-muted); font-size: 16px; }

/* ── BUTTONS ── */
.add-btn { width: 100%; padding: 8px; background: none; border: 1px dashed var(--outline-variant); color: var(--on-surface-muted); font-family: 'Manrope', sans-serif; font-size: 11px; cursor: pointer; margin-top: 6px; }
.add-btn:hover { border-color: var(--primary); color: var(--primary); }
.add-btn.full { padding: 14px; font-size: 13px; margin-top: 12px; }
.del-btn { background: none; border: none; color: var(--red-bright); font-size: 14px; cursor: pointer; opacity: 0.5; padding: 4px; }
.del-btn:hover { opacity: 1; }

/* ── RESPONSIVE ── */
@media (max-width: 480px) {
  .stats-row { grid-template-columns: repeat(3, 1fr); }
  .saves-skills-grid { grid-template-columns: 1fr; }
  .id-grid { grid-template-columns: 1fr; }
}

/* ── BOTTOM NAV ── */
.main-content { padding-bottom: 64px; }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--surface); border-top: 1px solid var(--outline-variant); z-index: 100; max-width: 600px; margin: 0 auto; }
.nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; background: none; border: none; color: var(--on-surface-muted); cursor: pointer; }
.nav-btn.active { color: var(--primary); }
.nav-icon { font-size: 18px; }
.nav-label { font-family: 'Manrope', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }

/* ── PAGES ── */
.page-container { padding: 16px; }
.empty-msg { text-align: center; padding: 16px; color: var(--on-surface-muted); font-style: italic; font-size: 13px; }

/* ── TABLES ── */
.table-card { background: var(--surface); padding: 12px; margin-bottom: 6px; }
.table-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.table-card-name { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600; }
.table-card-code { font-family: 'Manrope', sans-serif; font-size: 11px; color: var(--tertiary); letter-spacing: 2px; }
.table-card-info { font-family: 'Manrope', sans-serif; font-size: 10px; color: var(--on-surface-muted); margin-bottom: 8px; }
.table-card-actions { display: flex; gap: 6px; }
.action-btn { padding: 8px 16px; background: var(--surface-container); border: none; color: var(--on-surface); font-family: 'Cinzel', serif; font-size: 11px; cursor: pointer; }
.action-btn:hover { background: var(--surface-container-high); }
.action-btn.primary { background: var(--primary-dim); color: var(--primary-bright); }
.action-btn.danger { background: #3a1515; color: var(--red-bright); }
.room-code { text-align: center; font-family: 'Manrope', sans-serif; font-size: 12px; color: var(--tertiary); margin-bottom: 12px; letter-spacing: 2px; }
.player-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--outline-variant); }
.player-name { font-family: 'Cinzel', serif; font-size: 13px; }
.player-char { font-family: 'Crimson Text', serif; font-size: 12px; color: var(--on-surface-muted); }

/* ── ENCYCLOPEDIA ── */
.enc-cats { display: flex; overflow-x: auto; margin-bottom: 12px; gap: 0; }
.enc-search { width: 100%; padding: 10px; background: var(--surface); border: none; border-bottom: 1px solid var(--outline-variant); color: var(--on-surface); font-family: 'Crimson Text', serif; font-size: 15px; outline: none; margin-bottom: 8px; }
.enc-filters { display: flex; gap: 6px; margin-bottom: 10px; }
.enc-filter-select { flex: 1; padding: 8px; background: var(--surface); border: none; border-bottom: 1px solid var(--outline-variant); color: var(--on-surface); font-family: 'Crimson Text', serif; font-size: 13px; outline: none; appearance: auto; }
.enc-count { font-family: 'Manrope', sans-serif; font-size: 10px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }

/* Spell cards */
.enc-spell-card { background: var(--surface); padding: 10px 12px; margin-bottom: 4px; cursor: pointer; }
.enc-spell-card:hover { background: var(--surface-container); }
.enc-spell-top { display: flex; justify-content: space-between; align-items: center; }
.enc-spell-name { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; }
.enc-spell-level { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--on-surface-muted); padding: 2px 6px; background: var(--surface-container-low); }
.enc-spell-meta { font-family: 'Manrope', sans-serif; font-size: 10px; display: flex; gap: 8px; margin-top: 2px; }
.enc-ritual-tag { color: var(--tertiary); font-weight: 600; font-size: 9px; }
.enc-spell-classes { color: var(--on-surface-muted); }
.enc-spell-detail { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--outline-variant); }
.enc-spell-props { display: flex; gap: 12px; font-size: 12px; color: var(--on-surface-dim); margin-bottom: 6px; }
.enc-spell-comp { font-size: 11px; color: var(--on-surface-muted); margin-bottom: 6px; }
.enc-spell-desc { font-size: 14px; line-height: 1.5; color: var(--on-surface-dim); white-space: pre-line; }

/* Class cards */
.enc-class-card { background: var(--surface); padding: 14px; margin-bottom: 4px; cursor: pointer; display: flex; align-items: center; gap: 10px; }
.enc-class-card:hover { background: var(--surface-container); }
.enc-class-card-name { font-family: 'Cinzel', serif; font-size: 15px; font-weight: 600; flex: 1; }
.enc-class-card-info { font-family: 'Manrope', sans-serif; font-size: 10px; color: var(--on-surface-muted); }
.enc-class-card-arrow { color: var(--primary); font-size: 14px; }
.enc-class-info { font-family: 'Manrope', sans-serif; font-size: 11px; color: var(--on-surface-dim); margin-bottom: 6px; }
.enc-detail { font-size: 12px; color: var(--on-surface-muted); margin-bottom: 2px; }

/* Subclasses */
.enc-subclass-block { margin-bottom: 4px; }
.enc-subclass-name { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; color: var(--primary); padding: 8px; cursor: pointer; background: var(--surface-container-low); }
.enc-subclass-name:hover { background: var(--surface-container-high); }
.enc-subclass-content { padding: 8px 12px; background: var(--surface-container-low); }
.enc-desc { font-size: 13px; color: var(--on-surface-dim); margin-bottom: 8px; font-style: italic; }
.enc-sub-feat { margin-bottom: 8px; padding: 6px; background: var(--surface-dim); }
.enc-sub-feat-lvl { font-family: 'Manrope', sans-serif; font-size: 9px; color: var(--tertiary); font-weight: 600; margin-right: 6px; }
.enc-sub-feat-name { font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; }
.enc-sub-feat-desc { font-size: 13px; color: var(--on-surface-dim); margin-top: 4px; line-height: 1.4; white-space: pre-line; }

/* Progression */
.enc-level-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--outline-variant); }
.enc-level-num { font-family: 'Cinzel', serif; font-size: 18px; font-weight: 800; color: var(--primary); min-width: 28px; text-align: center; }
.enc-level-prof { font-family: 'Manrope', sans-serif; font-size: 10px; color: var(--on-surface-muted); min-width: 24px; padding-top: 4px; }
.enc-level-feats { flex: 1; display: flex; flex-wrap: wrap; gap: 4px; }
.enc-tag { font-family: 'Manrope', sans-serif; font-size: 11px; padding: 4px 8px; background: var(--surface-container-low); color: var(--on-surface-dim); display: inline-block; }
.enc-tag.clickable { cursor: pointer; color: var(--primary-bright); }
.enc-tag.clickable:hover { background: var(--surface-container-high); }
.enc-feature-desc { font-size: 13px; color: var(--on-surface-dim); padding: 8px; background: var(--surface-dim); margin: 4px 0; line-height: 1.5; white-space: pre-line; width: 100%; }

/* Spell slots table */
.enc-slots-table { font-family: 'Manrope', sans-serif; font-size: 10px; overflow-x: auto; }
.enc-slots-header, .enc-slots-row { display: grid; grid-template-columns: 30px repeat(9, 1fr); gap: 2px; padding: 3px 0; }
.enc-slots-header { color: var(--primary); font-weight: 600; border-bottom: 1px solid var(--outline-variant); }
.enc-slots-row { color: var(--on-surface-muted); border-bottom: 1px solid var(--outline-variant); }
.enc-slots-row .has-slots { color: var(--on-surface); font-weight: 600; }

/* Races */
.enc-race-card { background: var(--surface); margin-bottom: 4px; }
.enc-race-top { display: flex; align-items: center; gap: 8px; padding: 12px; cursor: pointer; }
.enc-race-top:hover { background: var(--surface-container); }
.enc-race-name { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600; flex: 1; }
.enc-race-info { font-family: 'Manrope', sans-serif; font-size: 10px; color: var(--on-surface-muted); }
.enc-race-detail { padding: 8px 12px; }
.enc-trait { font-size: 13px; color: var(--on-surface-dim); margin-bottom: 6px; line-height: 1.4; }
.enc-subraces { margin-top: 8px; }
.enc-subrace-item { font-size: 13px; color: var(--on-surface-dim); margin-bottom: 4px; padding-left: 8px; border-left: 2px solid var(--tertiary); }

/* Rules */
.enc-rule-card { background: var(--surface); padding: 12px; margin-bottom: 4px; cursor: pointer; }
.enc-rule-card:hover { background: var(--surface-container); }
.enc-rule-name { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; color: var(--primary); }
.enc-rule-content { font-size: 14px; color: var(--on-surface-dim); margin-top: 8px; line-height: 1.5; white-space: pre-line; }
      `}</style>
    </AuthCtx.Provider>
  );
}
