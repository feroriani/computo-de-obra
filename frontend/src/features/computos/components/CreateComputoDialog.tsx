import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ToolButton } from "../../../components/ToolButton";
import type { ComputoCreateResultDTO } from "../api";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (result: ComputoCreateResultDTO) => void;
  createComputo: (
    descripcion: string,
    superficieMilli: number,
    fechaInicio: string
  ) => Promise<ComputoCreateResultDTO>;
};

export function CreateComputoDialog({
  open,
  onClose,
  onCreated,
  createComputo,
}: Props) {
  const [descripcion, setDescripcion] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const desc = descripcion.trim();
    if (!desc) {
      setError("Descripción es obligatoria.");
      return;
    }
    const sup = parseFloat(superficie.replace(",", "."));
    if (isNaN(sup) || sup <= 0) {
      setError("Superficie debe ser un número mayor a 0 (m²).");
      return;
    }
    if (!fechaInicio) {
      setError("Fecha de inicio es obligatoria.");
      return;
    }
    const superficieMilli = Math.round(sup * 1000);
    setLoading(true);
    try {
      const result = await createComputo(desc, superficieMilli, fechaInicio);
      setDescripcion("");
      setSuperficie("");
      setFechaInicio("");
      onCreated(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el cómputo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Nuevo cómputo
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Descripción (comitente)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
              placeholder="Ej. Obra Casa López"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Superficie (m²)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
              placeholder="Ej. 120.50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Fecha inicio del cómputo
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <ToolButton
              icon={X}
              label="Cancelar"
              onClick={onClose}
              variant="secondary"
              showLabel
            />
            <ToolButton
              icon={Plus}
              label={loading ? "Creando…" : "Crear"}
              type="submit"
              disabled={loading}
              variant="primary"
              showLabel
            />
          </div>
        </form>
      </div>
    </div>
  );
}
