import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { listComputos, createComputo } from "../api";
import type { ComputoListRowDTO, ComputoCreateResultDTO } from "../api";
import { CreateComputoDialog } from "../components/CreateComputoDialog";

function formatCentavos(centavos: number | undefined): string {
  if (centavos == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(centavos / 100);
}

function formatM2(milli: number): string {
  return (milli / 1000).toFixed(2);
}

export function ComputosList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ComputoListRowDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listComputos()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreated = (result: ComputoCreateResultDTO) => {
    load();
    navigate(`/computo/${result.version_id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Cómputos de obra
          </h1>
          <div className="flex items-center gap-3">
            <Link
              to="/catalogos"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Catálogos
            </Link>
            <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
          >
            Nuevo cómputo
          </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            No hay cómputos. Creá uno con &quot;Nuevo cómputo&quot;.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Versión</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Fecha inicio</th>
                  <th className="px-4 py-3 font-medium">Superficie (m²)</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Costo/m²</th>
                  <th className="px-4 py-3 font-medium" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((row) => (
                  <tr
                    key={row.version_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">
                      {row.codigo}
                    </td>
                    <td className="px-4 py-2 text-slate-600">v{row.version_n}</td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                      {row.descripcion}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {row.fecha_inicio}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {formatM2(row.superficie_milli)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline rounded px-2 py-0.5 text-xs font-medium ${
                          row.estado === "confirmado"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {row.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {formatCentavos(row.total_centavos)}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {formatCentavos(row.costo_m2_centavos)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/computo/${row.version_id}`)}
                        className="text-primary hover:underline"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateComputoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
        createComputo={createComputo}
      />
    </div>
  );
}
