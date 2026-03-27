import { useState, createContext, useContext, useCallback } from "react";

const API = "https://backenddnd.onrender.com/api";
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("dnd_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("dnd_token"));
  const login = (t) => { localStorage.setItem("dnd_token", t); setToken(t); };
  const logout = () => { localStorage.removeItem("dnd_token"); setToken(null); };
  return <AuthCtx.Provider value={{ token, login, logout }}>{children}</AuthCtx.Provider>;
}
