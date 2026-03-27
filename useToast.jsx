import { useState, createContext, useContext, useCallback } from "react";

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  const toast = useCallback((msg, isError = false) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, isError }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const confirm = useCallback((title, message) => {
    return new Promise(resolve => {
      setModal({ title, message, onOk: () => { setModal(null); resolve(true); }, onNo: () => { setModal(null); resolve(false); } });
    });
  }, []);

  return (
    <ToastCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-rack">
        {toasts.map(t => <div key={t.id} className={"toast-item" + (t.isError ? " err" : "")}>{t.msg}</div>)}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={modal.onNo}>
          <div className="modal-box anim-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal.title}</div>
            <p className="modal-msg">{modal.message}</p>
            <div className="modal-btns">
              <button className="btn-ghost" onClick={modal.onNo}>Cancelar</button>
              <button className="btn-primary" onClick={modal.onOk}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  );
}
