import { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { ComputosList } from "../features/computos/pages/ComputosList";
import { ComputoEditor } from "../features/computos/pages/ComputoEditor";
import { CatalogosAdmin } from "../features/computos/pages/CatalogosAdmin";
import { backupDB } from "../features/computos/api";

export function App() {
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleBackup = async () => {
    setBackupMessage(null);
    try {
      await backupDB();
      setBackupMessage("Copia guardada");
      setTimeout(() => setBackupMessage(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBackupMessage(msg === "cancelado por el usuario" ? "Cancelado" : `Error: ${msg}`);
    }
  };

  return (
    <ThemeProvider>
      <HashRouter>
        <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/95">
            <Link
              to="/"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Cómputos de obra
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackup}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                title="Guardar copia de la base de datos"
              >
                Backup DB
              </button>
              {backupMessage && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{backupMessage}</span>
              )}
              <ThemeToggle />
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<ComputosList />} />
              <Route path="/computo/:versionId" element={<ComputoEditor />} />
              <Route path="/catalogos" element={<CatalogosAdmin />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </ThemeProvider>
  );
}
