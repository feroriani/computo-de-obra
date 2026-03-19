import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { ListadoPanel } from "../../../components/ListadoPanel";
import { ScrollArea } from "../../../components/ScrollArea";
import {
  componenteManoObraList,
  componenteMaterialList,
  exportComputoCSVAndSave,
  getComputo,
  itemCompositionListManoObra,
  itemCompositionListMaterials,
  manoObraAll,
  materialsAll,
} from "../api";
import type {
  ItemManoObraRowDTO,
  ItemMaterialRowDTO,
  ManoObraObraRowDTO,
  MaterialObraRowDTO,
} from "../api";

type ListadosTab = "materiales" | "mano_obra";
const ALL_ITEMS_VALUE = "__all__";

function formatCentavos(centavos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(centavos / 100);
}

function formatCantidad(milli: number): string {
  return (milli / 1000).toFixed(3);
}

function parseTab(value: string | null): ListadosTab {
  return value === "mano_obra" ? "mano_obra" : "materiales";
}

export function ComputoListados() {
  const { versionId } = useParams<{ versionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [materiales, setMateriales] = useState<MaterialObraRowDTO[]>([]);
  const [manoObra, setManoObra] = useState<ManoObraObraRowDTO[]>([]);
  const [itemOptions, setItemOptions] = useState<Array<{ id: string; tarea: string }>>([]);
  const [itemCantidadById, setItemCantidadById] = useState<Record<string, number>>({});
  const [materialesByItem, setMaterialesByItem] = useState<Record<string, ItemMaterialRowDTO[]>>({});
  const [manoObraByItem, setManoObraByItem] = useState<Record<string, ItemManoObraRowDTO[]>>({});
  const [costoMaterialById, setCostoMaterialById] = useState<Record<string, number>>({});
  const [costoManoObraById, setCostoManoObraById] = useState<Record<string, number>>({});
  const [loadingItemData, setLoadingItemData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const activeTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);
  const selectedItemId = useMemo(() => {
    const itemParam = searchParams.get("item");
    if (!itemParam || itemParam.trim().length === 0) return ALL_ITEMS_VALUE;
    return itemParam;
  }, [searchParams]);

  const selectedItemTitle = useMemo(() => {
    if (selectedItemId === ALL_ITEMS_VALUE) return "";
    return itemOptions.find((it) => it.id === selectedItemId)?.tarea ?? selectedItemId;
  }, [itemOptions, selectedItemId]);

  const setTab = useCallback((tab: ListadosTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  }, [setSearchParams]);

  const setSelectedItem = useCallback((itemId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (itemId === ALL_ITEMS_VALUE) {
        next.delete("item");
      } else {
        next.set("item", itemId);
      }
      return next;
    });
  }, [setSearchParams]);

  const loadListados = useCallback(async () => {
    if (!versionId) return;
    setError("");
    setLoading(true);
    try {
      const [mat, mo, computo, compMat, compMo] = await Promise.all([
        materialsAll(versionId),
        manoObraAll(versionId),
        getComputo(versionId),
        componenteMaterialList(),
        componenteManoObraList(),
      ]);
      setMateriales(mat);
      setManoObra(mo);
      setCostoMaterialById(
        compMat.reduce<Record<string, number>>((acc, row) => {
          acc[row.id] = row.costo_centavos;
          return acc;
        }, {})
      );
      setCostoManoObraById(
        compMo.reduce<Record<string, number>>((acc, row) => {
          acc[row.id] = row.costo_centavos;
          return acc;
        }, {})
      );
      if (computo) {
        const itemMap = new Map<string, { id: string; tarea: string }>();
        const cantidadMap: Record<string, number> = {};
        for (const rubro of computo.rubros ?? []) {
          for (const item of rubro.items ?? []) {
            itemMap.set(item.item_id, { id: item.item_id, tarea: item.tarea });
            cantidadMap[item.item_id] = (cantidadMap[item.item_id] ?? 0) + item.cantidad_milli;
          }
        }
        setItemOptions(Array.from(itemMap.values()).sort((a, b) => a.tarea.localeCompare(b.tarea)));
        setItemCantidadById(cantidadMap);
      } else {
        setItemOptions([]);
        setItemCantidadById({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar listados");
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    void loadListados();
  }, [loadListados]);

  useEffect(() => {
    if (!itemOptions.length || selectedItemId === ALL_ITEMS_VALUE) {
      return;
    }
    const exists = itemOptions.some((item) => item.id === selectedItemId);
    if (!exists) {
      setSelectedItem(ALL_ITEMS_VALUE);
    }
  }, [itemOptions, selectedItemId, setSelectedItem]);

  useEffect(() => {
    if (selectedItemId === ALL_ITEMS_VALUE || !itemCantidadById[selectedItemId]) {
      return;
    }
    const hasMaterials = Boolean(materialesByItem[selectedItemId]);
    const hasManoObra = Boolean(manoObraByItem[selectedItemId]);
    if (hasMaterials && hasManoObra) {
      return;
    }
    setLoadingItemData(true);
    setError("");
    void Promise.all([
      hasMaterials ? Promise.resolve(materialesByItem[selectedItemId]) : itemCompositionListMaterials(selectedItemId),
      hasManoObra ? Promise.resolve(manoObraByItem[selectedItemId]) : itemCompositionListManoObra(selectedItemId),
    ])
      .then(([mat, mo]) => {
        if (!hasMaterials) {
          setMaterialesByItem((prev) => ({ ...prev, [selectedItemId]: mat }));
        }
        if (!hasManoObra) {
          setManoObraByItem((prev) => ({ ...prev, [selectedItemId]: mo }));
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error al cargar composiciones del ítem");
      })
      .finally(() => setLoadingItemData(false));
  }, [itemCantidadById, manoObraByItem, materialesByItem, selectedItemId]);

  const handleExportCSV = useCallback(async () => {
    if (!versionId) return;
    setExportMessage(null);
    setExportLoading(true);
    try {
      await exportComputoCSVAndSave(versionId, selectedItemId, selectedItemTitle);
      setExportMessage("CSV guardado");
      setTimeout(() => setExportMessage(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExportMessage(msg === "cancelado por el usuario" ? "Cancelado" : `Error: ${msg}`);
    } finally {
      setExportLoading(false);
    }
  }, [selectedItemId, selectedItemTitle, versionId]);

  const filteredMateriales = useMemo<MaterialObraRowDTO[]>(() => {
    if (selectedItemId === ALL_ITEMS_VALUE) {
      return materiales;
    }
    const qtyItemMilli = itemCantidadById[selectedItemId] ?? 0;
    if (!qtyItemMilli) {
      return [];
    }
    const itemRows = materialesByItem[selectedItemId] ?? [];
    return itemRows.map((row) => ({
      componente_id: row.componente_id,
      descripcion: row.descripcion,
      unidad: row.unidad,
      cantidad_milli: Math.floor((qtyItemMilli * row.dosaje_milli) / 1000),
      total_centavos: Math.floor(
        (qtyItemMilli * row.dosaje_milli * (costoMaterialById[row.componente_id] ?? 0)) / 1_000_000
      ),
    }));
  }, [costoMaterialById, itemCantidadById, materiales, materialesByItem, selectedItemId]);

  const filteredManoObra = useMemo<ManoObraObraRowDTO[]>(() => {
    if (selectedItemId === ALL_ITEMS_VALUE) {
      return manoObra;
    }
    const qtyItemMilli = itemCantidadById[selectedItemId] ?? 0;
    if (!qtyItemMilli) {
      return [];
    }
    const itemRows = manoObraByItem[selectedItemId] ?? [];
    return itemRows.map((row) => ({
      componente_id: row.componente_id,
      descripcion: row.descripcion,
      unidad: row.unidad,
      cantidad_milli: Math.floor((qtyItemMilli * row.dosaje_milli) / 1000),
      total_centavos: Math.floor(
        (qtyItemMilli * row.dosaje_milli * (costoManoObraById[row.componente_id] ?? 0)) / 1_000_000
      ),
    }));
  }, [costoManoObraById, itemCantidadById, manoObra, manoObraByItem, selectedItemId]);

  const displayedRows = activeTab === "materiales" ? filteredMateriales : filteredManoObra;
  const totalMontoCentavos = useMemo(
    () => displayedRows.reduce((acc, row) => acc + row.total_centavos, 0),
    [displayedRows]
  );
  const hasData = displayedRows.length > 0;

  if (!versionId) {
    return (
      <div className="h-full min-h-0 bg-slate-50 p-6 dark:bg-slate-900">
        <div className="w-full">
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            Versión de cómputo no encontrada
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-50 p-6 dark:bg-slate-900">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/computo/${versionId}`} className="text-primary hover:underline dark:text-teal-400">
              ← Volver al editor
            </Link>
            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">Versión {versionId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exportLoading}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              title="Exportar materiales y mano de obra a CSV"
            >
              {exportLoading ? "Exportando…" : "Exportar a CSV"}
            </button>
            <button
              type="button"
              onClick={() => void loadListados()}
              disabled={loading}
              className="rounded bg-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-500 dark:hover:bg-slate-600"
            >
              {loading ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
        </div>

        {exportMessage && <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{exportMessage}</p>}
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <ListadoPanel className="min-h-0 flex-1 overflow-hidden" bodyClassName="p-0">
          <div className="flex min-h-0 h-full flex-col p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab("materiales")}
                  className={`border-b-2 px-2 py-1 text-sm ${
                    activeTab === "materiales"
                      ? "border-primary text-primary dark:border-teal-400 dark:text-teal-400"
                      : "border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Materiales
                </button>
                <button
                  type="button"
                  onClick={() => setTab("mano_obra")}
                  className={`border-b-2 px-2 py-1 text-sm ${
                    activeTab === "mano_obra"
                      ? "border-primary text-primary dark:border-teal-400 dark:text-teal-400"
                      : "border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Mano de obra
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span>Ítem:</span>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full max-w-[26rem] rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:light] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:[color-scheme:dark]"
                >
                  <option value={ALL_ITEMS_VALUE}>Todos</option>
                  {itemOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.tarea}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loading || loadingItemData ? (
              <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">Cargando listados…</p>
            ) : hasData ? (
              <ScrollArea mode="auto" containWheel className="h-0 p-0">
                {activeTab === "materiales" && (
                  <table className="min-w-[720px] w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-medium">Descripción</th>
                        <th className="px-4 py-2 font-medium">Unidad</th>
                        <th className="px-4 py-2 font-medium text-right">Cantidad</th>
                        <th className="px-4 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredMateriales.map((row) => (
                        <tr key={row.componente_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.descripcion}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.unidad}</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                            {formatCantidad(row.cantidad_milli)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                            {formatCentavos(row.total_centavos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {activeTab === "mano_obra" && (
                  <table className="min-w-[720px] w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-medium">Descripción</th>
                        <th className="px-4 py-2 font-medium">Unidad</th>
                        <th className="px-4 py-2 font-medium text-right">Cantidad</th>
                        <th className="px-4 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredManoObra.map((row) => (
                        <tr key={row.componente_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.descripcion}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.unidad}</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                            {formatCantidad(row.cantidad_milli)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                            {formatCentavos(row.total_centavos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </ScrollArea>
            ) : (
              <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">
                {selectedItemId === ALL_ITEMS_VALUE
                  ? "Sin datos. Agregá rubros e ítems con composición y actualizá el listado."
                  : "Este ítem no tiene componentes para mostrar en este listado."}
              </p>
            )}
            <div className="mt-3 flex items-center justify-end border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Total monto:</span>
              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                {formatCentavos(totalMontoCentavos)}
              </span>
            </div>
          </div>
        </ListadoPanel>
      </div>
    </div>
  );
}
