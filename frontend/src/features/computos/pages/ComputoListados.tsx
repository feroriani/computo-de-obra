import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useParams, useNavigate } from "react-router-dom";
import { FileDown, RefreshCw, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { ToolButton } from "../../../components/ToolButton";
import { ListadoPanel } from "../../../components/ListadoPanel";
import { ScrollArea } from "../../../components/ScrollArea";
import { useBlockBackgroundScroll } from "../../../hooks/useBlockBackgroundScroll";
import {
  componenteManoObraList,
  componenteMaterialList,
  computoItemMaterialExtraAdd,
  computoItemMaterialExtraDelete,
  computoItemMaterialExtraList,
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
  ComputoItemMaterialExtraRowDTO,
  ComputoHeaderDTO,
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
  return (milli / 1000).toFixed(2);
}

function roundDiv(n: number, d: number): number {
  if (d === 0) return 0;
  if (n >= 0) return Math.floor((n + d / 2) / d);
  return Math.ceil((n - d / 2) / d);
}

function parseTab(value: string | null): ListadosTab {
  return value === "mano_obra" ? "mano_obra" : "materiales";
}

function parseCantidadMilli(value: string): number | null {
  const n = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000);
}

function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        <div className="p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">{footer}</div>
      </div>
    </div>
  );
}

export function ComputoListados() {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [materiales, setMateriales] = useState<MaterialObraRowDTO[]>([]);
  const [manoObra, setManoObra] = useState<ManoObraObraRowDTO[]>([]);
  const [header, setHeader] = useState<ComputoHeaderDTO | null>(null);
  const [itemOptions, setItemOptions] = useState<Array<{ id: string; tarea: string }>>([]);
  const [materialCatalog, setMaterialCatalog] = useState<Array<{ id: string; descripcion: string; unidad: string }>>(
    []
  );
  const [itemCantidadById, setItemCantidadById] = useState<Record<string, number>>({});
  const [materialesByItem, setMaterialesByItem] = useState<Record<string, ItemMaterialRowDTO[]>>({});
  const [extraMaterialesByItem, setExtraMaterialesByItem] = useState<
    Record<string, ComputoItemMaterialExtraRowDTO[]>
  >({});
  const [manoObraByItem, setManoObraByItem] = useState<Record<string, ItemManoObraRowDTO[]>>({});
  const [costoMaterialById, setCostoMaterialById] = useState<Record<string, number>>({});
  const [costoManoObraById, setCostoManoObraById] = useState<Record<string, number>>({});
  const [loadingItemData, setLoadingItemData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [addMaterialSelect, setAddMaterialSelect] = useState("");
  const [addMaterialCantidad, setAddMaterialCantidad] = useState("");
  const [addMaterialSaving, setAddMaterialSaving] = useState(false);
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const hasBlockingOverlay = addMaterialOpen;
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

  useBlockBackgroundScroll(hasBlockingOverlay);

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
      setHeader(computo?.header ?? null);
      setMaterialCatalog(compMat.map((row) => ({ id: row.id, descripcion: row.descripcion, unidad: row.unidad })));
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
        setHeader(null);
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
    if (!versionId || selectedItemId === ALL_ITEMS_VALUE) {
      return;
    }
    if (!(selectedItemId in itemCantidadById)) {
      return;
    }
    const hasMaterials = Boolean(materialesByItem[selectedItemId]);
    const hasExtraMaterials = Boolean(extraMaterialesByItem[selectedItemId]);
    const hasManoObra = Boolean(manoObraByItem[selectedItemId]);
    if (hasMaterials && hasExtraMaterials && hasManoObra) {
      return;
    }
    setLoadingItemData(true);
    setError("");
    void Promise.all([
      hasMaterials ? Promise.resolve(materialesByItem[selectedItemId]) : itemCompositionListMaterials(selectedItemId),
      hasExtraMaterials
        ? Promise.resolve(extraMaterialesByItem[selectedItemId])
        : computoItemMaterialExtraList(versionId, selectedItemId),
      hasManoObra ? Promise.resolve(manoObraByItem[selectedItemId]) : itemCompositionListManoObra(selectedItemId),
    ])
      .then(([mat, extraMat, mo]) => {
        if (!hasMaterials) {
          setMaterialesByItem((prev) => ({ ...prev, [selectedItemId]: mat }));
        }
        if (!hasExtraMaterials) {
          setExtraMaterialesByItem((prev) => ({ ...prev, [selectedItemId]: extraMat }));
        }
        if (!hasManoObra) {
          setManoObraByItem((prev) => ({ ...prev, [selectedItemId]: mo }));
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error al cargar composiciones del ítem");
      })
      .finally(() => setLoadingItemData(false));
  }, [extraMaterialesByItem, itemCantidadById, manoObraByItem, materialesByItem, selectedItemId, versionId]);

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
    const extraRows = extraMaterialesByItem[selectedItemId] ?? [];
    const byComponent = new Map<string, MaterialObraRowDTO>();
    const itemRows = materialesByItem[selectedItemId] ?? [];
    if (qtyItemMilli > 0) {
      for (const row of itemRows) {
        const qtyMilli = roundDiv(qtyItemMilli * row.dosaje_milli, 1000);
        const totalCentavos = roundDiv(qtyItemMilli * row.dosaje_milli * (costoMaterialById[row.componente_id] ?? 0), 1_000_000);
        byComponent.set(row.componente_id, {
          componente_id: row.componente_id,
          descripcion: row.descripcion,
          unidad: row.unidad,
          cantidad_milli: qtyMilli,
          total_centavos: totalCentavos,
        });
      }
    }
    for (const row of extraRows) {
      const prev = byComponent.get(row.componente_id);
      if (!prev) {
        byComponent.set(row.componente_id, {
          componente_id: row.componente_id,
          descripcion: row.descripcion,
          unidad: row.unidad,
          cantidad_milli: row.cantidad_milli,
          total_centavos: row.total_centavos,
        });
        continue;
      }
      byComponent.set(row.componente_id, {
        ...prev,
        cantidad_milli: prev.cantidad_milli + row.cantidad_milli,
        total_centavos: prev.total_centavos + row.total_centavos,
      });
    }
    return Array.from(byComponent.values()).sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [costoMaterialById, extraMaterialesByItem, itemCantidadById, materiales, materialesByItem, selectedItemId]);

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
      cantidad_milli: roundDiv(qtyItemMilli * row.dosaje_milli, 1000),
      total_centavos: roundDiv(
        qtyItemMilli * row.dosaje_milli * (costoManoObraById[row.componente_id] ?? 0),
        1_000_000
      ),
    }));
  }, [costoManoObraById, itemCantidadById, manoObra, manoObraByItem, selectedItemId]);

  const displayedRows = activeTab === "materiales" ? filteredMateriales : filteredManoObra;
  const selectedItemExtras = useMemo(
    () => (selectedItemId === ALL_ITEMS_VALUE ? [] : extraMaterialesByItem[selectedItemId] ?? []),
    [extraMaterialesByItem, selectedItemId]
  );
  const selectedItemExtraByComponente = useMemo(
    () => new Set(selectedItemExtras.map((row) => row.componente_id)),
    [selectedItemExtras]
  );
  const availableExtraMaterialOptions = useMemo(() => {
    if (selectedItemId === ALL_ITEMS_VALUE) return [];
    return materialCatalog.filter((mat) => !selectedItemExtraByComponente.has(mat.id));
  }, [materialCatalog, selectedItemExtraByComponente, selectedItemId]);
  const totalMontoCentavos = useMemo(
    () => displayedRows.reduce((acc, row) => acc + row.total_centavos, 0),
    [displayedRows]
  );
  const hasData = displayedRows.length > 0;
  const canEditExtras = header?.estado === "borrador";

  useEffect(() => {
    if (!addMaterialOpen) return;
    if (!availableExtraMaterialOptions.length) {
      setAddMaterialSelect("");
      return;
    }
    if (availableExtraMaterialOptions.some((opt) => opt.id === addMaterialSelect)) return;
    setAddMaterialSelect(availableExtraMaterialOptions[0].id);
  }, [addMaterialOpen, addMaterialSelect, availableExtraMaterialOptions]);

  const handleOpenAddMaterial = useCallback(() => {
    setError("");
    if (!availableExtraMaterialOptions.length) {
      setError("Este ítem ya tiene todos los materiales disponibles agregados.");
      return;
    }
    setAddMaterialCantidad("");
    setAddMaterialSelect(availableExtraMaterialOptions[0]?.id ?? "");
    setAddMaterialOpen(true);
  }, [availableExtraMaterialOptions]);

  const reloadSelectedItemExtras = useCallback(async () => {
    if (!versionId || selectedItemId === ALL_ITEMS_VALUE) return;
    const rows = await computoItemMaterialExtraList(versionId, selectedItemId);
    setExtraMaterialesByItem((prev) => ({ ...prev, [selectedItemId]: rows }));
  }, [selectedItemId, versionId]);

  const handleAddExtraMaterial = useCallback(async () => {
    if (!versionId || selectedItemId === ALL_ITEMS_VALUE) return;
    const cantidadMilli = parseCantidadMilli(addMaterialCantidad);
    if (!addMaterialSelect) {
      setError("Seleccioná un material.");
      return;
    }
    if (cantidadMilli == null) {
      setError("Ingresá una cantidad válida mayor a 0.");
      return;
    }
    setAddMaterialSaving(true);
    setError("");
    try {
      await computoItemMaterialExtraAdd(versionId, selectedItemId, addMaterialSelect, cantidadMilli);
      await reloadSelectedItemExtras();
      setAddMaterialOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al agregar material extra");
    } finally {
      setAddMaterialSaving(false);
    }
  }, [addMaterialCantidad, addMaterialSelect, reloadSelectedItemExtras, selectedItemId, versionId]);

  const handleDeleteExtraMaterial = useCallback(
    async (componenteId: string) => {
      if (!versionId || selectedItemId === ALL_ITEMS_VALUE) return;
      setDeleteMaterialId(componenteId);
      setError("");
      try {
        await computoItemMaterialExtraDelete(versionId, selectedItemId, componenteId);
        await reloadSelectedItemExtras();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar material extra");
      } finally {
        setDeleteMaterialId(null);
      }
    },
    [reloadSelectedItemExtras, selectedItemId, versionId]
  );

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
            <ToolButton
              icon={ChevronLeft}
              label="Volver al editor"
              onClick={() => navigate(`/computo/${versionId}`)}
              variant="ghost"
              showLabel
              className="!px-0 text-primary hover:underline dark:text-teal-400"
            />
            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">Versión {versionId}</span>
          </div>
          <div className="flex items-center gap-2">
            <ToolButton
              icon={FileDown}
              label={exportLoading ? "Exportando…" : "Exportar a CSV"}
              onClick={handleExportCSV}
              disabled={exportLoading}
              variant="secondary"
              showLabel
              title="Exportar materiales y mano de obra a CSV"
            />
            <ToolButton
              icon={RefreshCw}
              label={loading ? "Actualizando…" : "Actualizar"}
              onClick={() => void loadListados()}
              disabled={loading}
              variant="secondary"
              showLabel
            />
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
              {activeTab === "materiales" && selectedItemId !== ALL_ITEMS_VALUE && (
                <ToolButton
                  icon={Plus}
                  label="Agregar material"
                  onClick={handleOpenAddMaterial}
                  disabled={!canEditExtras || loadingItemData}
                  variant="secondary"
                  showLabel
                  title={
                    canEditExtras
                      ? "Agregar material extra para este ítem en este cómputo"
                      : "Solo disponible en versiones borrador"
                  }
                />
              )}
            </div>

            {loading || loadingItemData ? (
              <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">Cargando listados…</p>
            ) : hasData ? (
              <ScrollArea
                mode={hasBlockingOverlay ? "never" : "auto"}
                containWheel={!hasBlockingOverlay}
                className={`h-0 p-0 ${hasBlockingOverlay ? "pointer-events-none" : ""}`}
              >
                {activeTab === "materiales" && (
                  <table className="min-w-[720px] w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-medium">Descripción</th>
                        <th className="px-4 py-2 font-medium">Unidad</th>
                        <th className="px-4 py-2 font-medium text-right">Cantidad</th>
                        <th className="px-4 py-2 font-medium text-right">Total</th>
                        {selectedItemId !== ALL_ITEMS_VALUE && (
                          <th className="px-4 py-2 font-medium text-right">Acciones</th>
                        )}
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
                          {selectedItemId !== ALL_ITEMS_VALUE && (
                            <td className="px-4 py-2 text-right">
                              {selectedItemExtraByComponente.has(row.componente_id) ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteExtraMaterial(row.componente_id)}
                                  disabled={!canEditExtras || deleteMaterialId === row.componente_id}
                                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                                  title={canEditExtras ? "Quitar material extra" : "Solo disponible en borrador"}
                                >
                                  <Trash2 className="size-3.5" />
                                  {deleteMaterialId === row.componente_id ? "Quitando…" : "Quitar extra"}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                              )}
                            </td>
                          )}
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
      {addMaterialOpen && (
        <Modal
          title="Agregar material extra"
          onClose={() => (addMaterialSaving ? undefined : setAddMaterialOpen(false))}
          footer={
            <>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                onClick={() => setAddMaterialOpen(false)}
                disabled={addMaterialSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-teal-600 dark:hover:bg-teal-700"
                onClick={() => void handleAddExtraMaterial()}
                disabled={addMaterialSaving || !addMaterialSelect}
              >
                {addMaterialSaving ? "Agregando…" : "Agregar"}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              <span>Material</span>
              <select
                value={addMaterialSelect}
                onChange={(e) => setAddMaterialSelect(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:light] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:[color-scheme:dark]"
              >
                {availableExtraMaterialOptions.map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.descripcion} ({mat.unidad})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              <span>Cantidad</span>
              <input
                value={addMaterialCantidad}
                onChange={(e) => setAddMaterialCantidad(e.target.value)}
                placeholder="Ej: 1.50"
                className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
