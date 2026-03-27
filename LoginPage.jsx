import { useState } from "react";
import { apiFetch, useAuth } from "../hooks/useAuth.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !pass) return;
    setError(""); setLoading(true);
    try {
      const d = await apiFetch("/auth/" + mode, { method: "POST", body: JSON.stringify({ username: user, password: pass }) });
      login(d.token);
      window.location.hash = "#/personajes";
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card anim-fade-up">
        <h1 className="auth-title">Digital Chronicle</h1>
        <p className="auth-sub">D&D 5e</p>
        <div className="auth-tabs">
          <button className={"auth-tab" + (mode === "login" ? " on" : "")} onClick={() => setMode("login")}>Entrar</button>
          <button className={"auth-tab" + (mode === "register" ? " on" : "")} onClick={() => setMode("register")}>Registrarse</button>
        </div>
        <input className="auth-inp" placeholder="Usuario" value={user} onChange={e => setUser(e.target.value)} />
        <input className="auth-inp" type="password" placeholder="Contraseña" value={pass}
          onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        {error && <div className="auth-err">{error}</div>}
        <button className="btn-primary full" onClick={submit} disabled={loading}>
          {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </div>
    </div>
  );
}
