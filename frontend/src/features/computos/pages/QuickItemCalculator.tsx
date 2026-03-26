import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileDown, Search } from "lucide-react";
import { ListadoPanel } from "../../../components/ListadoPanel";
import { ScrollArea } from "../../../components/ScrollArea";
import { ToolButton } from "../../../components/ToolButton";
import {
  exportQuickItemEstimateCSVAndSave,
  itemCatalogList,
  quickItemEstimate,
} from "../api";
import type { ItemCatalogItemDTO, QuickItemEstimateDTO } from "../api";

function formatCentavos(centavos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(centavos / 100);
}

function formatCantidad(milli: number): string {
  return (milli / 1000).toFixed(2);
}

function parseCantidadMilli(value: string): number | null {
  const n = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000);
}

export function QuickItemCalculator() {
  const [items, setItems] = useState<ItemCatalogItemDTO[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [cantidadInput, setCantidadInput] = useState("1");
  const [result, setResult] = useState<QuickItemEstimateDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    itemCatalogList()
      .then((rows) => {
        setItems(rows);
        if (rows.length > 0) setSelectedItemId(rows[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar catálogo de ítems"));
  }, []);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const onCalculate = async () => {
    setError("");
    setExportMessage(null);
    setResult(null);
    if (!selectedItemId) {
      setError("Seleccioná un ítem.");
      return;
    }
    const cantidadMilli = parseCantidadMilli(cantidadInput);
    if (cantidadMilli == null) {
      setError("Ingresá una cantidad válida mayor a 0.");
      return;
    }
    setLoading(true);
    try {
      const res = await quickItemEstimate(selectedItemId, cantidadMilli);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al calcular");
    } finally {
      setLoading(false);
    }
  };

  const onExport = async () => {
    if (!result) return;
    setExportMessage(null);
    setExporting(true);
    try {
      await exportQuickItemEstimateCSVAndSave(result.item_id, result.cantidad_milli);
      setExportMessage("CSV guardado");
      setTimeout(() => setExportMessage(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExportMessage(msg === "cancelado por el usuario" ? "Cancelado" : `Error: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Calculadora rápida de ítem
          </h1>
          <Link to="/" className="text-primary hover:underline dark:text-teal-400">
            Volver a cómputos
          </Link>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Herramienta de consulta: no guarda datos en la base.
        </p>

        <section className="shrink-0 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h2 className="font-medium text-slate-800 dark:text-slate-200">Consulta</h2>
          </div>
          <div className="p-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-end">
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ítem a calcular
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:light] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:[color-scheme:dark]"
              >
                {items.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.tarea}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Cantidad
              </label>
              <div className="relative">
                <input
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  placeholder="1,00"
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                />
                {selectedItem && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500">
                    {selectedItem.unidad}
                  </span>
                )}
              </div>
            </div>

              <div className="flex items-center gap-2 md:justify-end">
                <ToolButton
                  icon={Search}
                  label={loading ? "Calculando..." : "Calcular"}
                  onClick={() => void onCalculate()}
                  variant="primary"
                  showLabel
                  disabled={loading || items.length === 0}
                />
                <ToolButton
                  icon={FileDown}
                  label={exporting ? "Exportando..." : "Exportar CSV"}
                  onClick={() => void onExport()}
                  variant="ghost"
                  showLabel
                  disabled={!result || exporting}
                />
              </div>
            </div>
            {error && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                {error}
              </div>
            )}
            {exportMessage && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{exportMessage}</p>
            )}
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
          <ListadoPanel
            title={
              <div className="flex items-center gap-2">
                <span>Materiales</span>
                {result && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    {result.materiales.length}
                  </span>
                )}
              </div>
            }
            className="flex-1 overflow-hidden"
            bodyClassName="p-0"
          >
            <ScrollArea>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Descripción</th>
                      <th className="px-4 py-3 font-medium">Unidad</th>
                      <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {result ? (
                      result.materiales.map((row) => (
                        <tr key={row.componente_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.descripcion}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.unidad}</td>
                          <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                            {formatCantidad(row.cantidad_milli)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-200">
                            {formatCentavos(row.total_centavos)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-400 dark:text-slate-500" colSpan={4}>
                          Seleccioná un ítem y hacé clic en Calcular
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {result && (
                    <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200">
                          Subtotal materiales
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200">
                          {formatCentavos(result.subtotal_material_centavos)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </ScrollArea>
          </ListadoPanel>

          <ListadoPanel
            title={
              <div className="flex items-center gap-2">
                <span>Mano de obra</span>
                {result && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    {result.mano_obra.length}
                  </span>
                )}
              </div>
            }
            className="flex-1 overflow-hidden"
            bodyClassName="p-0"
          >
            <ScrollArea>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Descripción</th>
                      <th className="px-4 py-3 font-medium">Unidad</th>
                      <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {result ? (
                      result.mano_obra.map((row) => (
                        <tr key={row.componente_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.descripcion}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.unidad}</td>
                          <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                            {formatCantidad(row.cantidad_milli)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-200">
                            {formatCentavos(row.total_centavos)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-400 dark:text-slate-500" colSpan={4}>
                          Seleccioná un ítem y hacé clic en Calcular
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {result && (
                    <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200">
                          Subtotal mano de obra
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200">
                          {formatCentavos(result.subtotal_mo_centavos)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </ScrollArea>
          </ListadoPanel>
        </div>

        {result && (
          <div className="flex items-center justify-end rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total materiales + MO
                </span>
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {formatCentavos(result.total_centavos)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
