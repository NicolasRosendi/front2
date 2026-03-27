import { useState, useEffect } from "react";
import { apiFetch } from "./useAuth.jsx";
import { useToast } from "./useToast.jsx";
import { useRouter } from "./useRouter.jsx";

export default function CharListPage() {
  const [chars, setChars] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useToast();
  const { go } = useRouter();

  useEffect(() => {
    apiFetch("/characters").then(d => { setChars(d.characters || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const create = async () => {
    try {
      const d = await apiFetch("/characters", { method: "POST", body: JSON.stringify({ name: "Nuevo Personaje" }) });
      go("#/ficha/" + d.id + "/general");
    } catch (e) { toast(e.message, true); }
  };

  const del = async (id, name) => {
    const ok = await confirm("Borrar personaje", `¿Eliminar "${name}"?`);
    if (!ok) return;
    try {
      await apiFetch("/characters/" + id, { method: "DELETE" });
      setChars(prev => prev.filter(c => c.id !== id));
      toast("Personaje eliminado");
    } catch (e) { toast(e.message, true); }
  };

  if (loading) return <div className="loading">Cargando personajes...</div>;

  return (
    <div className="page anim-fade-up">
      <h2 className="page-title">Mis Personajes</h2>
      {chars.length === 0 && <div className="empty">No tenés personajes aún</div>}
      {chars.map((c, i) => (
        <div key={c.id} className="char-card anim-stagger" style={{ animationDelay: i * 60 + "ms" }}
          onClick={() => go("#/ficha/" + c.id + "/general")}>
          <span className="char-card-name">{c.name}</span>
          <button className="btn-del" onClick={e => { e.stopPropagation(); del(c.id, c.name); }}>✕</button>
        </div>
      ))}
      <button className="btn-add full" onClick={create}>+ Nuevo Personaje</button>
    </div>
  );
}
