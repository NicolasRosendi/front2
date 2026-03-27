import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "./useAuth.jsx";
import { useToast } from "./useToast.jsx";
import { useRouter } from "./useRouter.jsx";
import { InlineField, InlineSelect, mod, fmt, clamp, STATS, STAT_NAMES, SKILLS } from "./UI.jsx";
import DiceRoller from "./DiceRoller.jsx";
import { SPELLS_DATA, CLASS_PROGRESSION, ENCYCLOPEDIA_DATA, RACIAL_BONUSES, RACIAL_SPELLS } from "./encyclopedia-data.js";

const CLASS_NAMES = ["Bárbaro","Bardo","Brujo","Clérigo","Druida","Explorador","Guerrero","Hechicero","Mago","Monje","Paladín","Pícaro"];
const RACE_NAMES = ["Enano","Elfo","Mediano","Humano","Dracónido","Gnomo","Semielfo","Semiorco","Tiefling"];
const SPELL_KEY_MAP = {Bardo:"cha",Brujo:"cha",Clérigo:"wis",Druida:"wis",Explorador:"wis",Hechicero:"cha",Mago:"int",Paladín:"cha"};
const PROF_BY_LVL = {1:2,2:2,3:2,4:2,5:3,6:3,7:3,8:3,9:4,10:4,11:4,12:4,13:5,14:5,15:5,16:5,17:6,18:6,19:6,20:6};

export default function CharSheet() {
  const { id: charId, sub } = useRouter();
  const { go } = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const tab = sub || "general";
  const saveTimer = useRef(null);

  // State
  const [f, setF] = useState({ charName:"",class:"",level:"1",race:"",subrace:"",subclass:"",pactBoon:"",background:"",alignment:"",player:"",xp:"0",armorCA:"10",armorName:"Sin armadura",speed:"30",hitDice:"",hdTotal:"",coinPP:"0",coinPO:"0",coinPE:"0",coinPPT:"0",coinPC:"0",spellAbility:"INT",proficiencies:"",personality:"",ideals:"",bonds:"",flaws:"",backstory:"" });
  const [stats, setStats] = useState({str:10,dex:10,con:10,int:10,wis:10,cha:10});
  const [hp, setHp] = useState(10);
  const [hpMax, setHpMax] = useState(10);
  const [hpTemp, setHpTemp] = useState(0);
  const [profBonus, setProfBonus] = useState(2);
  const [saveProf, setSaveProf] = useState([]);
  const [skillProf, setSkillProf] = useState([]);
  const [skillExp, setSkillExp] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [spells, setSpells] = useState({});
  const [shieldBonus, setShieldBonus] = useState(0);
  const [deathSaves, setDeathSaves] = useState([false,false,false,false,false,false]);
  const [inspiration, setInspiration] = useState(false);
  const [spellKey, setSpellKey] = useState("int");

  const sf = (k, v) => setF(p => ({...p, [k]: v}));

  // Save ref
  const stateRef = useRef({});
  useEffect(() => { stateRef.current = { f,stats,hp,hpMax,hpTemp,profBonus,saveProf,skillProf,skillExp,attacks,inventory,spells,shieldBonus,deathSaves,inspiration,spellKey }; });

  const doSave = useCallback(async () => {
    if (!charId) return;
    setSaving(true);
    try {
      const s = stateRef.current;
      await apiFetch("/characters/" + charId, { method: "PUT", body: JSON.stringify({
        name: s.f.charName || "Sin nombre",
        data: { textFields: s.f, stats: s.stats, hpCurr: s.hp, hpMax: s.hpMax, hpTemp: s.hpTemp, profBonus: s.profBonus, savingThrowProf: s.saveProf, skillProf: s.skillProf, skillExpertise: s.skillExp, attacks: s.attacks, inventory: s.inventory, spells: s.spells, shieldBonus: s.shieldBonus, deathSaves: s.deathSaves, inspiration: s.inspiration, spellAbilityKey: s.spellKey, hasShield: s.shieldBonus > 0 }
      }) });
    } catch (e) { console.error("Save:", e); }
    setSaving(false);
  }, [charId]);

  const loaded = useRef(false);
  useEffect(() => {
    if (!charId || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 2000);
  }, [f,stats,hp,hpMax,hpTemp,profBonus,saveProf,skillProf,skillExp,attacks,inventory,spells,shieldBonus,deathSaves,inspiration]);

  // Load
  useEffect(() => {
    if (!charId) return;
    loaded.current = false;
    setLoading(true);
    apiFetch("/characters/" + charId).then(d => {
      const c = d.character;
      const data = typeof c.data === "string" ? JSON.parse(c.data) : (c.data || {});
      const tf = data.textFields || {};
      setF(p => { const n = {...p}; Object.keys(tf).forEach(k => { if (k in n) n[k] = tf[k]; }); n.charName = c.name || tf.charName || ""; return n; });
      if (data.stats) setStats(data.stats);
      setHp(data.hpCurr ?? 10); setHpMax(data.hpMax ?? 10); setHpTemp(data.hpTemp ?? 0);
      setProfBonus(data.profBonus ?? 2); setSaveProf(data.savingThrowProf || []);
      setSkillProf(data.skillProf || []); setSkillExp(data.skillExpertise || []);
      setAttacks(data.attacks || []); setInventory(data.inventory || []);
      setSpells(data.spells || {}); setShieldBonus(data.shieldBonus ?? 0);
      setDeathSaves(data.deathSaves || [false,false,false,false,false,false]);
      setInspiration(data.inspiration ?? false); setSpellKey(data.spellAbilityKey || "int");
      setLoading(false);
      setTimeout(() => { loaded.current = true; }, 500);
    }).catch(e => { console.error(e); setLoading(false); });
  }, [charId]);

  // Class change
  const onClassChange = (cls) => {
    sf("class", cls);
    if (SPELL_KEY_MAP[cls]) { setSpellKey(SPELL_KEY_MAP[cls]); sf("spellAbility", SPELL_KEY_MAP[cls].toUpperCase()); }
    const lvl = parseInt(f.level) || 1;
    setProfBonus(PROF_BY_LVL[lvl] || 2);
    if (CLASS_PROGRESSION) {
      const cd = CLASS_PROGRESSION.find(c => c.name === cls);
      if (cd?.saves) setSaveProf(cd.saves.slice());
      if (cd?.spell_slots?.[lvl]) {
        const sd = cd.spell_slots[lvl];
        if (Array.isArray(sd)) setSpells(p => { const n = {...p}; sd.forEach((s,i) => { n[i+1] = {...(n[i+1]||{list:[],prep:[],used:0}), slots:s}; }); return n; });
      }
    }
  };

  const getSubraces = () => { const r = ENCYCLOPEDIA_DATA?.races?.find(r => r.name === f.race); return r?.subraces ? Object.keys(r.subraces) : []; };
  const getSubclasses = () => { const c = CLASS_PROGRESSION?.find(c => c.name === f.class); return c?.subclasses_detail ? Object.keys(c.subclasses_detail) : []; };

  // Spell helpers
  const getSpellsFor = (lvl) => {
    if (!SPELLS_DATA || !f.class) return [];
    let list = SPELLS_DATA.filter(s => s.level === lvl && s.classes.includes(f.class));
    if (RACIAL_SPELLS) {
      const rd = RACIAL_SPELLS[f.subrace || f.race] || RACIAL_SPELLS[f.race];
      if (rd) Object.entries(rd).forEach(([reqLvl, names]) => {
        if ((parseInt(f.level)||1) >= parseInt(reqLvl)) names.forEach(sn => {
          if (!sn.startsWith("_")) { const found = SPELLS_DATA.find(s => s.name === sn && s.level === lvl); if (found && !list.find(x => x.name === found.name)) list.push({...found, racial:true}); }
        });
      });
    }
    return list.sort((a,b) => a.name.localeCompare(b.name));
  };

  const addSpell = (lvl, name) => { if (!name) return; setSpells(p => { const n={...p}; const d={...(n[lvl]||{slots:0,used:0,list:[],prep:[]})}; d.list=[...d.list,name]; d.prep=[...d.prep,false]; n[lvl]=d; return n; }); };
  const removeSpell = (lvl, i) => { setSpells(p => { const n={...p}; const d={...n[lvl]}; d.list=[...d.list]; d.prep=[...d.prep]; d.list.splice(i,1); d.prep.splice(i,1); n[lvl]=d; return n; }); };
  const toggleSlot = (lvl, i) => { setSpells(p => { const n={...p}; const d={...n[lvl]}; d.used = i < d.used ? i : i+1; n[lvl]=d; return n; }); };
  const togglePrep = (lvl, i) => { setSpells(p => { const n={...p}; const d={...n[lvl],prep:[...n[lvl].prep]}; d.prep[i]=!d.prep[i]; n[lvl]=d; return n; }); };

  // Max spell level
  let maxLvl = 0;
  if (CLASS_PROGRESSION && f.class) {
    const cls = CLASS_PROGRESSION.find(c => c.name === f.class);
    if (cls?.spell_slots?.[f.level]) {
      const sd = cls.spell_slots[f.level];
      if (Array.isArray(sd)) { for (let i=sd.length-1;i>=0;i--) if(sd[i]>0){maxLvl=i+1;break;} }
      else if (sd.level) maxLvl = sd.level;
    }
  }

  const shieldCycle = [0,2,3,4];
  const shieldLabels = {0:"Escudo ✗",2:"Escudo +2",3:"Escudo+1 (+3)",4:"Escudo+2 (+4)"};

  if (loading) return <div className="loading">Cargando ficha...</div>;

  const tabs = [{id:"general",label:"General"},{id:"combate",label:"Combate"},{id:"conjuros",label:"Conjuros"},{id:"inventario",label:"Inventario"},{id:"dados",label:"Dados"},{id:"historia",label:"Historia"}];
  const abilityMod = mod(stats[spellKey] || 10);

  return (
    <div className="sheet anim-fade-up">
      <div className="sheet-head">
        <button className="btn-back" onClick={() => go("#/personajes")}>←</button>
        <h1 className="sheet-name"><InlineField value={f.charName} onChange={v=>sf("charName",v)} placeholder="Nombre" className="name-input" /></h1>
        <span className={"save-dot" + (saving ? " on" : "")}>{saving ? "..." : "✓"}</span>
      </div>
      <div className="tab-bar">
        {tabs.map(t => <button key={t.id} className={"tab" + (tab===t.id?" on":"")} onClick={() => go("#/ficha/"+charId+"/"+t.id)}>{t.label}</button>)}
      </div>

      {/* GENERAL */}
      {tab === "general" && <div className="tab-body anim-fade-up">
        <div className="card">
          <div className="id-grid">
            <div className="id-f"><span className="id-l">Clase</span><InlineSelect value={f.class} onChange={onClassChange} options={CLASS_NAMES} placeholder="— Clase —" /></div>
            <div className="id-f"><span className="id-l">Nivel</span><InlineField value={f.level} onChange={v=>sf("level",String(clamp(+v,1,20)))} type="number" min={1} max={20} /></div>
            <div className="id-f"><span className="id-l">Raza</span><InlineSelect value={f.race} onChange={v=>sf("race",v)} options={RACE_NAMES} placeholder="— Raza —" /></div>
            {getSubraces().length > 0 && <div className="id-f"><span className="id-l">Subraza</span><InlineSelect value={f.subrace} onChange={v=>sf("subrace",v)} options={getSubraces()} /></div>}
            {getSubclasses().length > 0 && <div className="id-f"><span className="id-l">Subclase</span><InlineSelect value={f.subclass} onChange={v=>sf("subclass",v)} options={getSubclasses()} /></div>}
            {f.class==="Brujo"&&parseInt(f.level)>=3 && <div className="id-f"><span className="id-l">Pacto</span><InlineSelect value={f.pactBoon} onChange={v=>sf("pactBoon",v)} options={["Pacto del Tomo","Pacto de la Hoja","Pacto de la Cadena"]} /></div>}
            <div className="id-f"><span className="id-l">Transfondo</span><InlineField value={f.background} onChange={v=>sf("background",v)} /></div>
            <div className="id-f"><span className="id-l">Alineamiento</span><InlineField value={f.alignment} onChange={v=>sf("alignment",v)} /></div>
          </div>
        </div>
        <div className="stats-row">{STATS.map(s => <div key={s} className="stat-box"><div className="stat-lbl">{STAT_NAMES[s]}</div><div className="stat-mod">{fmt(mod(stats[s]))}</div><InlineField value={stats[s]} onChange={v=>setStats(p=>({...p,[s]:clamp(v,1,30)}))} type="number" className="stat-score" /></div>)}</div>
        <div className="prof-row">
          <div className="prof-box"><InlineField value={profBonus} onChange={v=>setProfBonus(clamp(v,1,10))} type="number" className="prof-val" /><span className="prof-lbl">Competencia</span></div>
          <div className={"insp-box"+(inspiration?" on":"")} onClick={()=>setInspiration(!inspiration)}><span className="insp-ico">{inspiration?"★":"☆"}</span><span className="insp-lbl">Inspiración</span></div>
        </div>
        <div className="ss-grid">
          <div className="card"><div className="sec-title">Salvaciones</div>
            {STATS.map(s => { const p = saveProf.includes(s); return <div key={s} className="row" onClick={()=>setSaveProf(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}><div className={"dot"+(p?" on":"")} /><span className="row-val">{fmt(mod(stats[s])+(p?profBonus:0))}</span><span className="row-name">{STAT_NAMES[s]}</span></div>; })}
          </div>
          <div className="card"><div className="sec-title">Habilidades</div>
            {SKILLS.map(sk => { const p=skillProf.includes(sk.name); const e=skillExp.includes(sk.name); const b=mod(stats[sk.stat])+(e?profBonus*2:p?profBonus:0);
              return <div key={sk.name} className="row"><div className={"dot"+(p?" on":"")+(e?" exp":"")} onClick={()=>{if(!p)setSkillProf(v=>[...v,sk.name]);else if(!e)setSkillExp(v=>[...v,sk.name]);else{setSkillExp(v=>v.filter(x=>x!==sk.name));setSkillProf(v=>v.filter(x=>x!==sk.name));}}}/><span className="row-val">{fmt(b)}</span><span className="row-name">{sk.name}</span><span className="row-stat">({STAT_NAMES[sk.stat]})</span></div>; })}
          </div>
        </div>
      </div>}

      {/* COMBATE */}
      {tab === "combate" && <div className="tab-body anim-fade-up">
        <div className="hp-sec">
          <div className="hp-track"><div className="hp-fill" style={{width:Math.max(0,Math.min(100,hp/hpMax*100))+"%",background:hp/hpMax>.5?"var(--green)":hp/hpMax>.25?"var(--yellow)":"var(--red)"}} /></div>
          <div className="hp-ctrls"><button className="hp-btn" onClick={()=>setHp(Math.max(0,hp-1))}>−</button><div className="hp-nums"><InlineField value={hp} onChange={v=>setHp(clamp(v,0,999))} type="number" className="hp-big" /><span className="hp-sep">/</span><InlineField value={hpMax} onChange={v=>setHpMax(clamp(v,1,999))} type="number" className="hp-big" /></div><button className="hp-btn" onClick={()=>setHp(Math.min(hpMax,hp+1))}>+</button></div>
          <div className="hp-temp"><span className="hp-temp-l">Temp</span><InlineField value={hpTemp} onChange={v=>setHpTemp(Math.max(0,v))} type="number" className="hp-temp-v" /></div>
        </div>
        <div className="ds-sec"><div className="ds-row"><span className="ds-l">Éxitos</span>{[0,1,2].map(i=><div key={i} className={"ds-dot"+(deathSaves[i]?" ok":"")} onClick={()=>{const n=[...deathSaves];n[i]=!n[i];setDeathSaves(n);}} />)}</div><div className="ds-row"><span className="ds-l">Fallos</span>{[3,4,5].map(i=><div key={i} className={"ds-dot"+(deathSaves[i]?" ko":"")} onClick={()=>{const n=[...deathSaves];n[i]=!n[i];setDeathSaves(n);}} />)}</div></div>
        <div className="combat-row">
          <div className="combat-box"><InlineField value={f.armorCA} onChange={v=>sf("armorCA",v)} type="number" className="combat-big" /><span className="combat-lbl">CA</span><span className={"shield"+(shieldBonus?" on":"")} onClick={()=>{const i=shieldCycle.indexOf(shieldBonus);setShieldBonus(shieldCycle[(i+1)%4]);}}>{shieldLabels[shieldBonus]}</span></div>
          <div className="combat-box"><span className="combat-big">{fmt(mod(stats.dex))}</span><span className="combat-lbl">Iniciativa</span></div>
          <div className="combat-box"><InlineField value={f.speed} onChange={v=>sf("speed",v)} type="number" className="combat-big" /><span className="combat-lbl">Velocidad</span></div>
        </div>
        <div className="card"><div className="sec-title">Ataques y Armas</div>
          {attacks.map((a,i)=><div key={i} className="atk-row"><InlineField value={a.name} onChange={v=>{const n=[...attacks];n[i]={...n[i],name:v};setAttacks(n);}} placeholder="Arma" className="atk-n" /><InlineField value={a.bonus} onChange={v=>{const n=[...attacks];n[i]={...n[i],bonus:v};setAttacks(n);}} placeholder="+0" className="atk-b" /><InlineField value={a.damage} onChange={v=>{const n=[...attacks];n[i]={...n[i],damage:v};setAttacks(n);}} placeholder="1d8" className="atk-d" /><button className="btn-del" onClick={()=>setAttacks(attacks.filter((_,j)=>j!==i))}>✕</button></div>)}
          <button className="btn-add" onClick={()=>setAttacks([...attacks,{name:"",bonus:"",damage:""}])}>+ Agregar arma</button>
        </div>
        <div className="card"><div className="sec-title">Dados de Golpe</div><div className="hd-row"><InlineField value={f.hitDice} onChange={v=>sf("hitDice",v)} placeholder="1d10" className="hd-v" /><span className="hd-sep">/</span><InlineField value={f.hdTotal} onChange={v=>sf("hdTotal",v)} placeholder="5" className="hd-v" /></div></div>
      </div>}

      {/* CONJUROS */}
      {tab === "conjuros" && <div className="tab-body anim-fade-up">
        <div className="spell-meta">
          <div className="spell-m-box"><span className="spell-m-val">{STAT_NAMES[spellKey]}</span><span className="spell-m-lbl">Aptitud</span></div>
          <div className="spell-m-box"><span className="spell-m-val">{8+abilityMod+profBonus}</span><span className="spell-m-lbl">CD</span></div>
          <div className="spell-m-box"><span className="spell-m-val">{fmt(abilityMod+profBonus)}</span><span className="spell-m-lbl">Ataque</span></div>
        </div>
        {Array.from({length:10},(_,lvl)=>{
          const d=spells[lvl]||{slots:0,used:0,list:[],prep:[]};
          if(!(d.list||[]).length && !d.slots && lvl>maxLvl) return null;
          const avail=getSpellsFor(lvl).filter(s=>!(d.list||[]).map(x=>(x||"").toLowerCase()).includes(s.name.toLowerCase()));
          return <div key={lvl} className="sp-block">
            <div className="sp-head"><span className="sp-num">{lvl}</span><span className="sp-title">{lvl===0?"Trucos":"Nivel "+lvl}</span>
              {lvl>0&&d.slots>0&&<div className="sp-slots">{Array.from({length:d.slots},(_,i)=><div key={i} className={"sp-dot"+(i<d.used?" on":"")} onClick={()=>toggleSlot(lvl,i)} />)}<span className="sp-cnt">{d.slots-d.used}/{d.slots}</span></div>}
            </div>
            {(d.list||[]).map((sp,i)=>sp?.trim()?<div key={i} className="sp-entry"><div className={"prep-dot"+((d.prep||[])[i]?" on":"")} onClick={()=>togglePrep(lvl,i)} /><span className="sp-name">{sp}</span><button className="btn-del-sm" onClick={()=>removeSpell(lvl,i)}>✕</button></div>:null)}
            {avail.length>0&&<select className="sp-add" defaultValue="" onChange={e=>{addSpell(lvl,e.target.value);e.target.value="";}}>
              <option value="">— Elegir {lvl===0?"truco":"conjuro"} —</option>
              {avail.map(s=><option key={s.name} value={s.name}>{s.name} ({s.school}){s.ritual?" [R]":""}{s.racial?" [Racial]":""}</option>)}
            </select>}
          </div>;
        })}
      </div>}

      {/* INVENTARIO */}
      {tab === "inventario" && <div className="tab-body anim-fade-up">
        <div className="card"><div className="sec-title">Monedas</div>
          <div className="coins">{[{k:"coinPP",l:"PP"},{k:"coinPO",l:"PO"},{k:"coinPE",l:"PE"},{k:"coinPPT",l:"PPT"},{k:"coinPC",l:"PC"}].map(c=><div key={c.k} className="coin"><InlineField value={f[c.k]||0} onChange={v=>sf(c.k,Math.max(0,+v))} type="number" className="coin-v" /><span className="coin-l">{c.l}</span></div>)}</div>
        </div>
        <div className="card"><div className="sec-title">Objetos</div>
          {inventory.map((it,i)=><div key={i} className="inv-row"><InlineField value={it.qty} onChange={v=>{const n=[...inventory];n[i]={...n[i],qty:Math.max(0,+v)};setInventory(n);}} type="number" className="inv-qty" /><InlineField value={it.name} onChange={v=>{const n=[...inventory];n[i]={...n[i],name:v};setInventory(n);}} placeholder="Objeto..." className="inv-name" /><button className="btn-del" onClick={()=>setInventory(inventory.filter((_,j)=>j!==i))}>✕</button></div>)}
          <button className="btn-add" onClick={()=>setInventory([...inventory,{name:"",qty:1}])}>+ Agregar objeto</button>
        </div>
        <div className="card"><div className="sec-title">Competencias</div><InlineField value={f.proficiencies} onChange={v=>sf("proficiencies",v)} placeholder="Idiomas, herramientas..." className="text-block" /></div>
      </div>}

      {/* DADOS */}
      {tab === "dados" && <div className="tab-body anim-fade-up"><DiceRoller /></div>}

      {/* HISTORIA */}
      {tab === "historia" && <div className="tab-body anim-fade-up">
        {[{k:"personality",l:"Rasgos de personalidad"},{k:"ideals",l:"Ideales"},{k:"bonds",l:"Vínculos"},{k:"flaws",l:"Defectos"},{k:"backstory",l:"Historia de fondo"}].map(x=><div key={x.k} className="card"><div className="sec-title">{x.l}</div><InlineField value={f[x.k]} onChange={v=>sf(x.k,v)} placeholder="Escribí aquí..." className="text-block" /></div>)}
      </div>}
    </div>
  );
}
