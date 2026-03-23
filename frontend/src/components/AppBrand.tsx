import { Link } from "react-router-dom";
import appIcon from "../assets/images/appicon.png";

export function AppBrand() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 rounded px-1 py-0.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-200 dark:hover:text-white"
      aria-label="Ir al listado de cómputos"
    >
      <img
        src={appIcon}
        alt="Icono de Cómputo de obra"
        className="size-7 shrink-0 rounded-sm"
      />
      <span>Cómputo de obra</span>
    </Link>
  );
}
