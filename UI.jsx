import { useState, useEffect, useRef } from "react";

const mod = v => Math.floor((v - 10) / 2);
const fmt = v => (v >= 0 ? "+" + v : String(v));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export { mod, fmt, clamp };

export const STATS = ["str","dex","con","int","wis","cha"];
export const STAT_NAMES = {str:"FUE",dex:"DES",con:"CON",int:"INT",wis:"SAB",cha:"CAR"};
export const SKILLS = [
  {name:"Acrobacias",stat:"dex"},{name:"Atletismo",stat:"str"},{name:"Engaño",stat:"cha"},
  {name:"Historia",stat:"int"},{name:"Interpretación",stat:"cha"},{name:"Intimidación",stat:"cha"},
  {name:"Investigación",stat:"int"},{name:"Juego de Manos",stat:"dex"},{name:"Medicina",stat:"wis"},
  {name:"Naturaleza",stat:"int"},{name:"Percepción",stat:"wis"},{name:"Perspicacia",stat:"wis"},
  {name:"Persuasión",stat:"cha"},{name:"Religión",stat:"int"},{name:"Sigilo",stat:"dex"},
  {name:"Supervivencia",stat:"wis"},{name:"Trato con Animales",stat:"wis"}
];

export function InlineField({ value, onChange, className="", type="text", placeholder="—", style={}, min, max }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  if (editing) return (
    <input ref={ref} type={type} className={"il-edit " + className} value={value ?? ""}
      placeholder={placeholder} min={min} max={max} style={style}
      onChange={e => onChange(type === "number" ? +e.target.value : e.target.value)}
      onBlur={() => setEditing(false)} onKeyDown={e => e.key === "Enter" && setEditing(false)} />
  );
  return <span className={"il-disp " + className} style={{cursor:"pointer",...style}} onClick={() => setEditing(true)}>{value || placeholder}</span>;
}

export function InlineSelect({ value, onChange, options, className="", placeholder="—" }) {
  return (
    <select className={"il-select " + className} value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}
