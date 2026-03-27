import { AuthProvider, useAuth } from "./useAuth.jsx";
import { ToastProvider } from "./useToast.jsx";
import { useRouter } from "./useRouter.jsx";
import LoginPage from "./LoginPage.jsx";
import CharListPage from "./CharListPage.jsx";
import CharSheet from "./CharSheet.jsx";
import TablesPage from "./TablesPage.jsx";
import EncyclopediaPage from "./EncyclopediaPage.jsx";

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
