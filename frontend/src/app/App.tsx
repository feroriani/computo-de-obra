import { useState } from "react";
import { HashRouter, Link, Routes, Route, useLocation } from "react-router-dom";
import { Info } from "lucide-react";
import { ThemeProvider } from "../contexts/ThemeContext";
import { AppBrand } from "../components/AppBrand";
import { ThemeToggle } from "../components/ThemeToggle";
import { ToolButton } from "../components/ToolButton";
import { AboutModal } from "../components/AboutModal";
import { ComputosList } from "../features/computos/pages/ComputosList";
import { ComputoEditor } from "../features/computos/pages/ComputoEditor";
import { ComputoListados } from "../features/computos/pages/ComputoListados";
import { CatalogosAdmin } from "../features/computos/pages/CatalogosAdmin";
import { QuickItemCalculator } from "../features/computos/pages/QuickItemCalculator";
import { backupDB } from "../features/computos/api";

function SettingsIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2.4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36.48.9.78 1.51.84H21a2 2 0 1 1 0 4h-.09c-.61.06-1.15.36-1.51.84Z" />
    </svg>
  );
}

function Configuracion() {
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  const handleBackup = async () => {
    setBackupMessage(null);
    setBackupLoading(true);
    try {
      await backupDB();
      setBackupMessage("Copia guardada");
      setTimeout(() => setBackupMessage(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBackupMessage(msg === "cancelado por el usuario" ? "Cancelado" : `Error: ${msg}`);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Configuracion</h1>
          <Link to="/" className="text-primary hover:underline dark:text-teal-400">
            Volver a computos
          </Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-2 text-lg font-medium text-slate-800 dark:text-slate-100">Tema</h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Elegi el modo visual de la aplicacion.</p>
          <ThemeToggle />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-2 text-lg font-medium text-slate-800 dark:text-slate-100">Base de datos</h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Guarda una copia de seguridad del archivo local de datos.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackup}
              disabled={backupLoading}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              title="Guardar copia de la base de datos"
            >
            {backupLoading ? "Guardando..." : "Backup DB"}
            </button>
            {backupMessage && (
              <span
                className={`text-xs ${
                  backupMessage.startsWith("Error")
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {backupMessage}
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const [aboutOpen, setAboutOpen] = useState(false);
  const onSettingsPage = location.pathname === "/configuracion";

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <AppBrand />
        <div className="flex items-center gap-2">
          <ToolButton
            icon={Info}
            label="Acerca de"
            onClick={() => setAboutOpen(true)}
            variant="ghost"
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          />
          <Link
            to="/configuracion"
            className={`rounded border px-2 py-1 text-slate-700 transition-colors dark:text-slate-200 ${
              onSettingsPage
                ? "border-primary bg-slate-100 text-primary dark:border-teal-500 dark:bg-slate-700 dark:text-teal-300"
                : "border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
            }`}
            title="Configuración"
            aria-label="Configuración"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<ComputosList />} />
          <Route path="/computo/:versionId" element={<ComputoEditor />} />
          <Route path="/computo/:versionId/listados" element={<ComputoListados />} />
          <Route path="/consulta-rapida" element={<QuickItemCalculator />} />
          <Route path="/catalogos" element={<CatalogosAdmin />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Routes>
      </main>
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </ThemeProvider>
  );
}
