import { useState } from "react";
import { SPELLS_DATA, CLASS_PROGRESSION, ENCYCLOPEDIA_DATA } from "./encyclopedia-data.js";

const SCHOOL_COLORS = {"Abjuración":"#4a9eff","Adivinación":"#c8c8c8","Conjuración":"#ffcc44","Encantamiento":"#ff69b4","Evocación":"#ff6644","Ilusión":"#bf7fff","Nigromancia":"#66cc66","Transmutación":"#ff9933"};
const CASTER_CLASSES = ["Bardo","Brujo","Clérigo","Druida","Explorador","Hechicero","Mago","Paladín"];

export default function EncyclopediaPage() {
  const [cat, setCat] = useState("spells");
  const [search, setSearch] = useState("");
  const [lvlF, setLvlF] = useState("all");
  const [clsF, setClsF] = useState("all");
  const [exp, setExp] = useState(null);
  const [classView, setClassView] = useState(null);
  const [expFeat, setExpFeat] = useState(null);

  const cats = [{id:"spells",l:"Conjuros"},{id:"classes",l:"Clases"},{id:"races",l:"Razas"},{id:"combat",l:"Combate"},{id:"spellrules",l:"Magia"}];

  // Class full view
  if (classView && CLASS_PROGRESSION) {
    const cls = CLASS_PROGRESSION.find(c => c.name === classView);
    if (!cls) { setClassView(null); return null; }
    return (
      <div className="page anim-fade-up">
        <button className="btn-back" onClick={() => setClassView(null)}>← Clases</button>
        <h2 className="page-title">{cls.name}</h2>
        <div className="card"><div className="enc-info">{cls.hit_die} · {cls.primary}</div>{cls.armor&&<div className="enc-det">Armaduras: {cls.armor}</div>}{cls.weapons&&<div className="enc-det">Armas: {cls.weapons}</div>}</div>
        {cls.subclasses_detail && Object.keys(cls.subclasses_detail).length > 0 && (
          <div className="card"><div className="sec-title">Subclases</div>
            {Object.entries(cls.subclasses_detail).map(([name, sub]) => {
              const on = expFeat === "sub:" + name;
              return <div key={name} className="enc-sub-block">
                <div className="enc-sub-name" onClick={() => setExpFeat(on ? null : "sub:" + name)}>{name} {on ? "▾" : "▸"}</div>
                {on && <div className="enc-sub-body anim-slide">
                  <p className="enc-desc">{sub.description}</p>
                  {sub.features && Object.entries(sub.features).sort((a,b)=>+a[0]-+b[0]).map(([lvl, ft]) => (
                    <div key={lvl} className="enc-sf"><span className="enc-sf-lvl">Nv{lvl}</span><span className="enc-sf-name">{ft.name}</span><p className="enc-sf-desc">{ft.desc}</p></div>
                  ))}
                </div>}
              </div>;
            })}
          </div>
        )}
        <div className="card"><div className="sec-title">Progresión por Nivel</div>
          {cls.progression.map(p => {
            if (!p.features.length) return null;
            return <div key={p.level} className="enc-lvl-row">
              <div className="enc-lvl-n">{p.level}</div><div className="enc-lvl-p">+{p.prof_bonus}</div>
              <div className="enc-lvl-feats">{p.features.map((f, i) => {
                const base = f.replace(/\s*\(.*?\)\s*$/, "").trim();
                const detail = cls.features_detail?.[f] || cls.features_detail?.[base];
                if (detail) {
                  const key = cls.name + ":" + f + ":" + p.level;
                  const on = expFeat === key;
                  return <div key={i}><span className="enc-tag click" onClick={() => setExpFeat(on ? null : key)}>{f} {on ? "▾" : "▸"}</span>{on && <div className="enc-feat-desc anim-slide">{detail}</div>}</div>;
                }
                return <span key={i} className="enc-tag">{f}</span>;
              })}</div>
            </div>;
          })}
        </div>
        {cls.spell_slots && <div className="card"><div className="sec-title">Espacios de Conjuro</div>
          <div className="enc-slots-tbl">
            <div className="enc-slots-h"><span>Nv</span>{Array.from({length:9},(_,i)=><span key={i}>{i+1}°</span>)}</div>
            {Object.entries(cls.spell_slots).filter(([k])=>+k<=20).sort((a,b)=>+a[0]-+b[0]).map(([lvl, slots])=>(
              <div key={lvl} className="enc-slots-r"><span>{lvl}</span>
                {Array.isArray(slots)?slots.map((s,i)=><span key={i} className={s>0?"has":""}>{s||"—"}</span>):<span style={{gridColumn:"2/-1",fontSize:11}}>{slots.slots} espacios nv{slots.level}</span>}
              </div>
            ))}
          </div>
        </div>}
      </div>
    );
  }

  return (
    <div className="page anim-fade-up">
      <h2 className="page-title">Enciclopedia</h2>
      <div className="enc-cats">{cats.map(c => <button key={c.id} className={"tab"+(cat===c.id?" on":"")} onClick={() => {setCat(c.id);setExp(null);setSearch("");setLvlF("all");setClsF("all");}}>{c.l}</button>)}</div>

      {cat === "spells" && SPELLS_DATA && <>
        <input className="inp full" placeholder="Buscar conjuros..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="enc-filters">
          <select className="inp" value={lvlF} onChange={e => setLvlF(e.target.value==="all"?"all":+e.target.value)}>
            <option value="all">Todos los niveles</option>{Array.from({length:10},(_,i)=><option key={i} value={i}>{i===0?"Trucos":"Nivel "+i}</option>)}
          </select>
          <select className="inp" value={clsF} onChange={e => setClsF(e.target.value)}>
            <option value="all">Todas las clases</option>{CASTER_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(() => {
          const s = search.toLowerCase();
          const list = SPELLS_DATA.filter(sp => (lvlF==="all"||sp.level===lvlF)&&(clsF==="all"||sp.classes.includes(clsF))&&(!s||sp.name.toLowerCase().includes(s)||sp.school.toLowerCase().includes(s)));
          return <>
            <div className="enc-count">{list.length} conjuro{list.length!==1?"s":""}</div>
            {list.map((sp, i) => {
              const on = exp === sp.name;
              return <div key={i} className="enc-spell anim-stagger" style={{animationDelay:Math.min(i*30,300)+"ms"}} onClick={() => setExp(on?null:sp.name)}>
                <div className="enc-sp-top"><span className="enc-sp-name">{sp.name}</span><span className="enc-sp-lvl">{sp.level===0?"Truco":"Nv"+sp.level}</span></div>
                <div className="enc-sp-meta"><span style={{color:SCHOOL_COLORS[sp.school]||"#999"}}>{sp.school}</span>{sp.ritual&&<span className="enc-ritual">RITUAL</span>}<span className="enc-sp-cls">{sp.classes.join(", ")}</span></div>
                {on && <div className="enc-sp-detail anim-slide">
                  <div className="enc-sp-props"><span>⏱ {sp.casting_time||"1 acción"}</span><span>📏 {sp.range||"—"}</span><span>⏳ {sp.duration||"—"}</span></div>
                  {sp.components&&<div className="enc-sp-comp">Componentes: {sp.components}</div>}
                  <p className="enc-sp-desc">{sp.description}</p>
                </div>}
              </div>;
            })}
          </>;
        })()}
      </>}

      {cat === "classes" && CLASS_PROGRESSION && <div>{CLASS_PROGRESSION.map((cls, i) => (
        <div key={cls.name} className="enc-cls-card anim-stagger" style={{animationDelay:i*60+"ms"}} onClick={() => setClassView(cls.name)}>
          <span className="enc-cls-name">{cls.name}</span><span className="enc-cls-info">{cls.hit_die} · {cls.primary}</span><span className="enc-arrow">▸</span>
        </div>
      ))}</div>}

      {cat === "races" && ENCYCLOPEDIA_DATA && <div>{ENCYCLOPEDIA_DATA.races.map((r, i) => {
        const on = exp === "race:" + r.name;
        return <div key={r.name} className="enc-race anim-stagger" style={{animationDelay:i*60+"ms"}}>
          <div className="enc-race-top" onClick={() => setExp(on?null:"race:"+r.name)}><span className="enc-race-name">{r.name}</span><span className="enc-race-info">{r.ability_increase}</span><span>{on?"▾":"▸"}</span></div>
          {on && <div className="enc-race-body anim-slide">
            {r.traits&&Object.entries(r.traits).map(([n,d])=><div key={n} className="enc-trait"><strong>{n}:</strong> {d}</div>)}
            {r.subraces&&Object.keys(r.subraces).length>0&&<div className="enc-subraces"><strong>Subrazas:</strong>{Object.entries(r.subraces).map(([n,d])=><div key={n} className="enc-subrace-it"><strong>{n}:</strong> {d}</div>)}</div>}
          </div>}
        </div>;
      })}</div>}

      {cat === "combat" && ENCYCLOPEDIA_DATA && <div>{ENCYCLOPEDIA_DATA.combat_rules.map((r, i) => {
        const on = exp === "rule:" + i;
        return <div key={i} className="enc-rule anim-stagger" style={{animationDelay:i*60+"ms"}} onClick={() => setExp(on?null:"rule:"+i)}>
          <div className="enc-rule-name">{r.title} {on?"▾":"▸"}</div>{on&&<div className="enc-rule-body anim-slide">{r.content}</div>}
        </div>;
      })}</div>}

      {cat === "spellrules" && ENCYCLOPEDIA_DATA && <div>{ENCYCLOPEDIA_DATA.spell_rules.map((r, i) => {
        const on = exp === "sr:" + i;
        return <div key={i} className="enc-rule anim-stagger" style={{animationDelay:i*60+"ms"}} onClick={() => setExp(on?null:"sr:"+i)}>
          <div className="enc-rule-name">{r.title} {on?"▾":"▸"}</div>{on&&<div className="enc-rule-body anim-slide">{r.content}</div>}
        </div>;
      })}</div>}
    </div>
  );
}
