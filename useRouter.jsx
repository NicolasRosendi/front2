import { useState, useEffect, useCallback } from "react";

export function useRouter() {
  const [hash, setHash] = useState(window.location.hash || "#/personajes");
  useEffect(() => {
    const fn = () => setHash(window.location.hash || "#/personajes");
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  const go = useCallback(h => { window.location.hash = h; }, []);
  // Parse: #/ficha/5/conjuros → { path: "ficha", id: "5", sub: "conjuros" }
  const parts = hash.replace("#/", "").split("/");
  return { hash, go, path: parts[0] || "personajes", id: parts[1], sub: parts[2], parts };
}
