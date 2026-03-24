import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Trash2, FolderOpen, Book } from "lucide-react";
import { ToolButton } from "../../../components/ToolButton";
import { listComputos, createComputo, deleteComputoSeries } from "../api";
import type { ComputoListRowDTO, ComputoCreateResultDTO } from "../api";
import { CreateComputoDialog } from "../components/CreateComputoDialog";
import { ListadoPanel } from "../../../components/ListadoPanel";
import { ScrollArea } from "../../../components/ScrollArea";

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

function TrashIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function ComputosList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ComputoListRowDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ series_id: string; codigo: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteComputoSeries(deleteDialog.series_id);
      setDeleteDialog(null);
      await load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Error al eliminar el cómputo");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-50 p-6 dark:bg-slate-900">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Cómputo de obra
          </h1>
          <div className="flex items-center gap-3">
            <ToolButton
              icon={Book}
              label="Catálogos"
              onClick={() => navigate("/catalogos")}
              variant="ghost"
              showLabel
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            />
            <ToolButton
              icon={Plus}
              label="Nuevo cómputo"
              onClick={() => setDialogOpen(true)}
              variant="primary"
              showLabel
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <ScrollArea className="flex-none" style={{ flex: "1 1 auto" }}>
          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              No hay cómputos. Creá uno con &quot;Nuevo cómputo&quot;.
            </div>
          ) : (
            <ListadoPanel
              title="Listado"
              className="shadow"
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
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
                      <tr key={row.version_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
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
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ToolButton
                              icon={Trash2}
                              label="Eliminar cómputo"
                              onClick={() => setDeleteDialog({ series_id: row.series_id, codigo: row.codigo })}
                              variant="ghost"
                              className="h-8 w-8 !p-0 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                              disabled={deleteLoading}
                            />
                            <ToolButton
                              icon={FolderOpen}
                              label="Abrir"
                              onClick={() => navigate(`/computo/${row.version_id}`)}
                              variant="ghost"
                              showLabel
                              className="text-primary hover:underline"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ListadoPanel>
          )}
        </ScrollArea>
      </div>

      <CreateComputoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
        createComputo={createComputo}
      />

      {deleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-computo-title"
          onClick={() => {
            if (!deleteLoading) setDeleteDialog(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-computo-title" className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Eliminar cómputo
            </h2>

            <p className="text-sm text-slate-700 dark:text-slate-200">
              Vas a eliminar el cómputo <span className="font-medium">&quot;{deleteDialog.codigo}&quot;</span> y todas sus versiones.
            </p>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400">Esta acción no se puede deshacer.</p>

            {deleteError && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                disabled={deleteLoading}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteLoading}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                autoFocus
              >
                {deleteLoading ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
