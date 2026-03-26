import React, { useEffect, useState } from "react";
import { Info, X, Github, ExternalLink } from "lucide-react";
import { ToolButton } from "./ToolButton";
import { getAppInfo, type AppInfoDTO } from "../features/computos/api";
import appIcon from "../assets/images/appicon.png";
import { useBlockBackgroundScroll } from "../hooks/useBlockBackgroundScroll";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [info, setAppInfo] = useState<AppInfoDTO | null>(null);
  useBlockBackgroundScroll(isOpen);

  useEffect(() => {
    if (isOpen) {
      getAppInfo().then(setAppInfo).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex flex-col items-center px-6 pt-10 pb-6 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>

          <div className="mb-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
            <img
              src={appIcon}
              alt={info?.name || "Cómputo de obra"}
              className="size-16 rounded-xl"
            />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            {info?.name || "Cómputo de Obra"}
          </h2>
          <p className="text-sm font-medium text-primary dark:text-teal-400">
            Versión {info?.version || "0.1.0"}
          </p>

          <div className="mt-6 w-full space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Desarrollado por
              </p>
              <p className="mt-1 text-slate-700 dark:text-slate-200 font-medium">
                {info?.author || "Fernando Oriani"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 px-4">
                Herramienta profesional para la gestión de presupuestos, rubros y cómputos métricos.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6 dark:border-slate-700 w-full justify-center">
             <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
               © 2024 · Hecho con Wails, Go y React
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
