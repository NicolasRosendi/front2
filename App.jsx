import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import { ToastProvider } from "./hooks/useToast.jsx";
import { useRouter } from "./hooks/useRouter.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CharListPage from "./pages/CharListPage.jsx";
import CharSheet from "./pages/CharSheet.jsx";
import TablesPage from "./pages/TablesPage.jsx";
import EncyclopediaPage from "./pages/EncyclopediaPage.jsx";

function AppRouter() {
  const { token, logout } = useAuth();
  const { path, go } = useRouter();

  if (!token) return <LoginPage />;

  const page = path === "ficha" ? "ficha" : path === "mesas" ? "mesas" : path === "enciclopedia" ? "enciclopedia" : "personajes";

  return (
    <div className="app-root">
      <div className="main-content">
        {page === "personajes" && <CharListPage />}
        {page === "ficha" && <CharSheet />}
        {page === "mesas" && <TablesPage />}
        {page === "enciclopedia" && <EncyclopediaPage />}
      </div>
      <nav className="bottom-nav">
        <button className={"nav-btn" + (page === "personajes" || page === "ficha" ? " on" : "")} onClick={() => go("#/personajes")}>
          <span className="nav-ico">📜</span><span className="nav-lbl">Fichas</span>
        </button>
        <button className={"nav-btn" + (page === "mesas" ? " on" : "")} onClick={() => go("#/mesas")}>
          <span className="nav-ico">⚔</span><span className="nav-lbl">Mesas</span>
        </button>
        <button className={"nav-btn" + (page === "enciclopedia" ? " on" : "")} onClick={() => go("#/enciclopedia")}>
          <span className="nav-ico">📖</span><span className="nav-lbl">Enciclopedia</span>
        </button>
        <button className="nav-btn" onClick={logout}>
          <span className="nav-ico">🚪</span><span className="nav-lbl">Salir</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  );
}
