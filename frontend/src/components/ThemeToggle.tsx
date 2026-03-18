import { useTheme } from "../contexts/ThemeContext";

const iconClass = "size-4 shrink-0";

function SunIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-600 dark:bg-slate-700">
      <button
        type="button"
        onClick={() => setTheme("light")}
        title="Modo claro"
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors ${
          theme === "light"
            ? "bg-white text-slate-800 shadow dark:bg-slate-700 dark:text-slate-200"
            : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        aria-pressed={theme === "light"}
      >
        <SunIcon />
        Claro
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        title="Modo oscuro"
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors ${
          theme === "dark"
            ? "bg-slate-700 text-white shadow dark:bg-slate-600 dark:text-white"
            : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        }`}
        aria-pressed={theme === "dark"}
      >
        <MoonIcon />
        Oscuro
      </button>
    </div>
  );
}
