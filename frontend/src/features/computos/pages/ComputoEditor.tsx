import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getComputo,
  computoConfirm,
  computoCreateNewVersionFrom,
  rubroCatalogList,
  computoRubrosAdd,
  computoRubrosReorder,
  itemCatalogList,
  computoRubroItemsAdd,
  computoRubroItemsSetCantidad,
  computoRubroItemsTrash,
  computoRubroTrashList,
  computoRubroTrashRestore,
  materialsAll,
  manoObraAll,
  exportComputoCSVAndSave,
  computoSetSuperficie,
} from "../api";
import type {
  ComputoGetDTO,
  RubroCatalogItemDTO,
  ItemCatalogItemDTO,
  ComputoRubroItemTrashedDTO,
  ComputoCreateResultDTO,
  MaterialObraRowDTO,
  ManoObraObraRowDTO,
} from "../api";

// Shape-only types for derived state (avoid Wails DTO class instances).
interface EditorRubroItem {
  id: string;
  item_id: string;
  tarea: string;
  unidad: string;
  cantidad_milli: number;
  unit_material_centavos: number;
  unit_mo_centavos: number;
  line_material_centavos: number;
  line_mo_centavos: number;
  line_total_centavos: number;
}

interface EditorRubro {
  id: string;
  rubro_id: string;
  nombre: string;
  orden: number;
  items: EditorRubroItem[];
  subtotal_material_centavos: number;
  subtotal_mo_centavos: number;
  subtotal_centavos: number;
}

interface EditorTotales {
  total_material_centavos: number;
  total_mo_centavos: number;
  total_centavos: number;
  costo_m2_centavos: number;
}

function formatCentavos(centavos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(centavos / 100);
}

function formatCantidad(milli: number): string {
  return (milli / 1000).toFixed(3);
}

function parseCantidadMilli(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 1000);
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

// Recompute line and subtotals from cantidades (overrides applied).
function deriveTotals(
  rubros: { id: string; rubro_id: string; nombre: string; orden: number; items: EditorRubroItem[] }[],
  cantidadOverrides: Record<string, number>,
  superficieMilli: number
): { rubros: EditorRubro[]; totales: EditorTotales } {
  let totalMaterial = 0;
  let totalMO = 0;
  const outRubros: EditorRubro[] = rubros.map((rubro) => {
    let subMat = 0;
    let subMO = 0;
    const items: EditorRubroItem[] = rubro.items.map((it) => {
      const cant = cantidadOverrides[it.id] ?? it.cantidad_milli;
      const lineMat = Math.floor((cant * it.unit_material_centavos) / 1000);
      const lineMO = Math.floor((cant * it.unit_mo_centavos) / 1000);
      const lineTotal = lineMat + lineMO;
      subMat += lineMat;
      subMO += lineMO;
      return {
        ...it,
        cantidad_milli: cant,
        line_material_centavos: lineMat,
        line_mo_centavos: lineMO,
        line_total_centavos: lineTotal,
      };
    });
    totalMaterial += subMat;
    totalMO += subMO;
    const subtotal = subMat + subMO;
    return {
      ...rubro,
      items,
      subtotal_material_centavos: subMat,
      subtotal_mo_centavos: subMO,
      subtotal_centavos: subtotal,
    };
  });
  const totalCentavos = totalMaterial + totalMO;
  const costoM2 = superficieMilli > 0 ? Math.floor((totalCentavos * 1000) / superficieMilli) : 0;
  return {
    rubros: outRubros,
    totales: {
      total_material_centavos: totalMaterial,
      total_mo_centavos: totalMO,
      total_centavos: totalCentavos,
      costo_m2_centavos: costoM2,
    },
  };
}

export function ComputoEditor() {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();
  const [computo, setComputo] = useState<ComputoGetDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);
  const [cantidadOverrides, setCantidadOverrides] = useState<Record<string, number>>({});
  const [cantidadDraft, setCantidadDraft] = useState<Record<string, string>>({});
  const [undoStack, setUndoStack] = useState<Record<string, number>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, number>[]>([]);
  const [addRubroOpen, setAddRubroOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [rubroCatalog, setRubroCatalog] = useState<RubroCatalogItemDTO[]>([]);
  const [itemCatalog, setItemCatalog] = useState<ItemCatalogItemDTO[]>([]);
  const [trashedItems, setTrashedItems] = useState<ComputoRubroItemTrashedDTO[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [superficieM2Str, setSuperficieM2Str] = useState("");
  const [superficieSaving, setSuperficieSaving] = useState(false);
  const [superficieMsg, setSuperficieMsg] = useState<string | null>(null);
  const [superficieDialogOpen, setSuperficieDialogOpen] = useState(false);

  const loadComputo = useCallback((silent = false) => {
    if (!versionId) return;
    if (!silent) setLoading(true);
    getComputo(versionId)
      .then((data) => {
        setComputo(data ?? null);
        setCantidadOverrides({});
        setUndoStack([]);
        setRedoStack([]);
        if (data?.rubros?.length) setSelectedRubroId((prev) => (prev && data.rubros.some((r) => r.id === prev)) ? prev : data.rubros[0].id);
        else setSelectedRubroId(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => { if (!silent) setLoading(false); });
  }, [versionId]);

  useEffect(() => {
    if (!versionId) return;
    setLoading(true);
    setError("");
    getComputo(versionId)
      .then((data) => {
        setComputo(data ?? null);
        setCantidadOverrides({});
        setUndoStack([]);
        setRedoStack([]);
        if (data?.rubros?.length) setSelectedRubroId(data.rubros[0].id);
        else setSelectedRubroId(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [versionId]);

  // Load trashed items when selected rubro changes
  useEffect(() => {
    if (!selectedRubroId) {
      setTrashedItems([]);
      return;
    }
    computoRubroTrashList(selectedRubroId)
      .then(setTrashedItems)
      .catch(() => setTrashedItems([]));
  }, [selectedRubroId]);

  const openSuperficieDialog = useCallback(() => {
    if (computo?.header) {
      setSuperficieM2Str(
        (computo.header.superficie_milli / 1000).toFixed(3).replace(/\.?0+$/, "") || "0"
      );
    }
    setSuperficieMsg(null);
    setSuperficieDialogOpen(true);
  }, [computo?.header]);

  const handleSaveSuperficie = useCallback(async () => {
    if (!versionId) return;
    const n = parseFloat(superficieM2Str.replace(",", "."));
    if (Number.isNaN(n) || n <= 0) {
      setSuperficieMsg("Ingresá una superficie mayor a 0 (m²).");
      return;
    }
    const milli = Math.round(n * 1000);
    setSuperficieMsg(null);
    setSuperficieSaving(true);
    try {
      await computoSetSuperficie(versionId, milli);
      await loadComputo(true);
      setSuperficieDialogOpen(false);
    } catch (e) {
      setSuperficieMsg(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSuperficieSaving(false);
    }
  }, [versionId, superficieM2Str, loadComputo]);

  const { rubros, totales } = useMemo(() => {
    if (!computo) return { rubros: [], totales: { total_material_centavos: 0, total_mo_centavos: 0, total_centavos: 0, costo_m2_centavos: 0 } };
    return deriveTotals(computo.rubros, cantidadOverrides, computo.header.superficie_milli);
  }, [computo, cantidadOverrides]);

  const selectedRubro = useMemo(
    () => rubros.find((r) => r.id === selectedRubroId) ?? null,
    [rubros, selectedRubroId]
  );

  const setCantidad = useCallback((itemId: string, cantidadMilli: number) => {
    setCantidadOverrides((prev) => {
      if (prev[itemId] === cantidadMilli) return prev;
      const next = { ...prev, [itemId]: cantidadMilli };
      setUndoStack((u) => [...u, prev]);
      setRedoStack([]);
      return next;
    });
  }, []);

  const previewCantidad = useCallback((itemId: string, cantidadMilli: number) => {
    setCantidadOverrides((prev) => {
      if (prev[itemId] === cantidadMilli) return prev;
      return { ...prev, [itemId]: cantidadMilli };
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack((u) => {
      if (u.length === 0) return u;
      const prev = u[u.length - 1];
      setRedoStack((r) => [...r, cantidadOverrides]);
      setCantidadOverrides(prev);
      return u.slice(0, -1);
    });
  }, [cantidadOverrides]);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setUndoStack((u) => [...u, cantidadOverrides]);
      setCantidadOverrides(next);
      return r.slice(0, -1);
    });
  }, [cantidadOverrides]);

  const hasUndo = undoStack.length > 0;
  const hasRedo = redoStack.length > 0;
  const isBorrador = computo?.header?.estado === "borrador";
  const isConfirmado = computo?.header?.estado === "confirmado";

  const handleConfirm = useCallback(() => {
    if (!versionId) return;
    setActionLoading(true);
    computoConfirm(versionId)
      .then(() => loadComputo())
      .catch((e) => setError(e instanceof Error ? e.message : "Error al confirmar"))
      .finally(() => setActionLoading(false));
  }, [versionId, loadComputo]);

  const handleNewVersionFrom = useCallback(() => {
    if (!versionId) return;
    setActionLoading(true);
    computoCreateNewVersionFrom(versionId)
      .then((result: ComputoCreateResultDTO) => {
        if (result?.version_id) navigate(`/computo/${result.version_id}`);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al crear nueva versión"))
      .finally(() => setActionLoading(false));
  }, [versionId, navigate]);

  const handleAddRubroOpen = useCallback(() => {
    setAddRubroOpen(true);
    rubroCatalogList().then(setRubroCatalog).catch(() => setRubroCatalog([]));
  }, []);

  const handleAddRubroSelect = useCallback(
    (rubroId: string) => {
      if (!versionId) return;
      setActionLoading(true);
      computoRubrosAdd(versionId, rubroId)
        .then(() => {
          setAddRubroOpen(false);
          loadComputo();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Error al agregar rubro"))
        .finally(() => setActionLoading(false));
    },
    [versionId, loadComputo]
  );

  const handleReorderRubros = useCallback(
    (newOrder: EditorRubro[]) => {
      if (!versionId) return;
      setActionLoading(true);
      computoRubrosReorder(
        versionId,
        newOrder.map((r) => r.id)
      )
        .then(() => loadComputo(true))
        .catch((e) => setError(e instanceof Error ? e.message : "Error al reordenar"))
        .finally(() => setActionLoading(false));
    },
    [versionId, loadComputo]
  );

  const handleMoveRubro = useCallback(
    (index: number, dir: "up" | "down") => {
      if (dir === "up" && index <= 0) return;
      if (dir === "down" && index >= rubros.length - 1) return;
      const next = [...rubros];
      const j = dir === "up" ? index - 1 : index + 1;
      ;[next[index], next[j]] = [next[j], next[index]];
      handleReorderRubros(next);
    },
    [rubros, handleReorderRubros]
  );

  const handleAddItemOpen = useCallback(() => {
    setAddItemOpen(true);
    itemCatalogList().then(setItemCatalog).catch(() => setItemCatalog([]));
  }, []);

  const handleAddItemSelect = useCallback(
    (itemId: string) => {
      if (!selectedRubroId) return;
      setActionLoading(true);
      computoRubroItemsAdd(selectedRubroId, itemId, 0)
        .then(() => {
          setAddItemOpen(false);
          loadComputo();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Error al agregar ítem"))
        .finally(() => setActionLoading(false));
    },
    [selectedRubroId, loadComputo]
  );

  const handleTrashItem = useCallback(
    (computoRubroItemId: string) => {
      if (!selectedRubroId) return;
      setActionLoading(true);
      computoRubroItemsTrash(computoRubroItemId)
        .then(() => {
          loadComputo();
          return computoRubroTrashList(selectedRubroId);
        })
        .then(setTrashedItems)
        .catch((e) => setError(e instanceof Error ? e.message : "Error al enviar a papelera"))
        .finally(() => setActionLoading(false));
    },
    [selectedRubroId, loadComputo]
  );

  const handleRestoreItem = useCallback(
    (computoRubroItemId: string) => {
      if (!selectedRubroId) return;
      setActionLoading(true);
      computoRubroTrashRestore(computoRubroItemId)
        .then(() => {
          loadComputo();
          return computoRubroTrashList(selectedRubroId);
        })
        .then(setTrashedItems)
        .catch((e) => setError(e instanceof Error ? e.message : "Error al restaurar"))
        .finally(() => setActionLoading(false));
    },
    [selectedRubroId, loadComputo]
  );

  const handleCantidadBlur = useCallback(
    (itemId: string, cantidadMilli: number) => {
      setActionLoading(true);
      computoRubroItemsSetCantidad(itemId, cantidadMilli)
        .then(() => loadComputo(true))
        .catch((e) => setError(e instanceof Error ? e.message : "Error al guardar cantidad"))
        .finally(() => setActionLoading(false));
    },
    [loadComputo]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-500 dark:text-slate-400">Cargando cómputo…</p>
        </div>
      </div>
    );
  }

  if (error || !computo) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl">
          <button type="button" onClick={() => navigate("/")} className="text-primary hover:underline dark:text-teal-400">
            ← Volver a cómputos
          </button>
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error || "Cómputo no encontrado"}
          </div>
        </div>
      </div>
    );
  }

  const h = computo.header;

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-primary hover:underline dark:text-teal-400"
          >
            ← Volver a cómputos
          </button>
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {h.codigo} v{h.version_n}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              h.estado === "confirmado" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            }`}
          >
            {h.estado}
          </span>
          <span className="text-slate-600 dark:text-slate-400">{h.descripcion}</span>
          <span className="ml-auto flex items-center gap-2">
            {isBorrador && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={actionLoading}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            )}
            {isConfirmado && (
              <button
                type="button"
                onClick={handleNewVersionFrom}
                disabled={actionLoading}
                className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
              >
                Nueva versión desde esta
              </button>
            )}
            <button
              type="button"
              onClick={undo}
              disabled={!hasUndo}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Deshacer
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!hasRedo}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Rehacer
            </button>
          </span>
        </div>

        {actionLoading && (
          <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">Guardando…</div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Panel rubros */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="font-medium text-slate-800 dark:text-slate-200">Rubros</h2>
              {isBorrador && (
                <button
                  type="button"
                  onClick={handleAddRubroOpen}
                  className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primary-dark"
                >
                  + Rubro
                </button>
              )}
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {rubros.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Sin rubros. Agregá uno desde el catálogo.</li>
              ) : (
                rubros.map((r, idx) => (
                  <li key={r.id} className="flex items-center gap-1 border-b border-slate-100 last:border-0 dark:border-slate-700">
                    {isBorrador && (
                      <span className="flex shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveRubro(idx, "up")}
                          disabled={idx === 0}
                          className="px-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Subir"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveRubro(idx, "down")}
                          disabled={idx === rubros.length - 1}
                          className="px-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Bajar"
                        >
                          ↓
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedRubroId(r.id)}
                      className={`min-w-0 flex-1 px-2 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                        selectedRubroId === r.id ? "bg-primary/10 font-medium text-primary dark:bg-teal-900/30 dark:text-teal-300" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span className="block truncate">{r.nombre}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatCentavos(r.subtotal_centavos)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Panel ítems del rubro seleccionado */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="font-medium text-slate-800 dark:text-slate-200">
                {selectedRubro ? selectedRubro.nombre : "Seleccioná un rubro"}
              </h2>
              {isBorrador && selectedRubro && (
                <button
                  type="button"
                  onClick={handleAddItemOpen}
                  className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primary-dark"
                >
                  + Ítem
                </button>
              )}
            </div>
            {selectedRubro && selectedRubro.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="px-4 py-2 font-medium">Tarea</th>
                      <th className="px-4 py-2 font-medium">Unidad</th>
                      <th className="px-4 py-2 font-medium">Cantidad</th>
                      <th className="px-4 py-2 font-medium text-right">Material</th>
                      <th className="px-4 py-2 font-medium text-right">M.O.</th>
                      <th className="px-4 py-2 font-medium text-right">Total línea</th>
                      {isBorrador && <th className="px-2 py-2 font-medium" aria-label="Papelera" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {selectedRubro.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{it.tarea}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{it.unidad}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={cantidadDraft[it.id] ?? formatCantidad(it.cantidad_milli)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setCantidadDraft((prev) => ({ ...prev, [it.id]: raw }));
                              const v = parseCantidadMilli(raw);
                              if (v !== null) previewCantidad(it.id, v);
                            }}
                            onBlur={() => {
                              const raw = cantidadDraft[it.id];
                              const parsed = raw !== undefined ? parseCantidadMilli(raw) : null;
                              if (parsed === null) {
                                setCantidadDraft((prev) => {
                                  if (prev[it.id] === undefined) return prev;
                                  const next = { ...prev };
                                  delete next[it.id];
                                  return next;
                                });
                                return;
                              }

                              setCantidad(it.id, parsed);
                              handleCantidadBlur(it.id, parsed);
                              setCantidadDraft((prev) => {
                                if (prev[it.id] === undefined) return prev;
                                const next = { ...prev };
                                delete next[it.id];
                                return next;
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") {
                                setCantidadDraft((prev) => {
                                  if (prev[it.id] === undefined) return prev;
                                  const next = { ...prev };
                                  delete next[it.id];
                                  return next;
                                });
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                          {formatCentavos(it.line_material_centavos)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                          {formatCentavos(it.line_mo_centavos)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                          {formatCentavos(it.line_total_centavos)}
                        </td>
                        {isBorrador && (
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => handleTrashItem(it.id)}
                              className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                              title="Enviar a papelera"
                              aria-label="Enviar a papelera"
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedRubro ? (
              <p className="px-4 py-6 text-slate-500 dark:text-slate-400">Este rubro no tiene ítems. Agregá uno desde el catálogo.</p>
            ) : null}
            {/* Papelera del rubro */}
            {isBorrador && selectedRubro && trashedItems.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">Papelera</h3>
                <ul className="space-y-1 text-sm">
                  {trashedItems.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 dark:bg-slate-700">
                      <span className="truncate text-slate-700 dark:text-slate-200">{t.tarea}</span>
                      <span className="ml-2 shrink-0 text-slate-500 dark:text-slate-400">{(t.cantidad_milli / 1000).toFixed(3)} {t.unidad}</span>
                      <button
                        type="button"
                        onClick={() => handleRestoreItem(t.id)}
                        className="ml-2 shrink-0 text-primary hover:underline"
                      >
                        Restaurar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Diálogo Agregar rubro */}
        {addRubroOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
            <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg bg-white shadow-lg dark:bg-slate-800">
              <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200">Agregar rubro</div>
              <div className="p-4">
                {rubroCatalog.length === 0 ? (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      No hay rubros en el catálogo. Creá rubros en <strong>Catálogos</strong> y volvé a abrir este diálogo.
                    </p>
                    <Link
                      to="/catalogos"
                      className="mt-3 inline-block rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                      onClick={() => setAddRubroOpen(false)}
                    >
                      Ir a Catálogos
                    </Link>
                  </>
                    ) : (
                      <>
                        {rubros.length >= rubroCatalog.length ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Todos los rubros ya están en el cómputo.</p>
                        ) : (
                          <>
                            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Elegí un rubro para agregarlo al cómputo:</p>
                            <ul className="max-h-80 overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
                              {rubroCatalog
                                .filter((rub) => !rubros.some((r) => r.rubro_id === rub.id))
                                .map((rub) => (
                                  <li key={rub.id}>
                                    <button
                                      type="button"
                                      onClick={() => handleAddRubroSelect(rub.id)}
                                      disabled={actionLoading}
                                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700 dark:text-slate-200"
                                    >
                                      {rub.nombre}
                                    </button>
                                  </li>
                                ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="border-t border-slate-200 p-2 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAddRubroOpen(false)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diálogo Agregar ítem */}
        {addItemOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
            <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg bg-white shadow-lg dark:bg-slate-800">
              <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200">Agregar ítem al rubro</div>
              <div className="p-4">
                {itemCatalog.length === 0 ? (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      No hay ítems en el catálogo. Creá ítems en <strong>Catálogos</strong> y volvé a abrir este diálogo.
                    </p>
                    <Link
                      to="/catalogos"
                      className="mt-3 inline-block rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                      onClick={() => setAddItemOpen(false)}
                    >
                      Ir a Catálogos
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Elegí un ítem para agregarlo al rubro:</p>
                    <ul className="max-h-80 overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
                      {itemCatalog.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleAddItemSelect(item.id)}
                            disabled={actionLoading}
                            className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700 dark:text-slate-200"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">{item.tarea}</span>
                            <span className="ml-2 text-slate-500 dark:text-slate-400">{item.unidad}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="border-t border-slate-200 p-2 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAddItemOpen(false)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel totales */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 font-medium text-slate-800 dark:text-slate-200">Totales</h2>
          <div className="flex flex-wrap gap-8">
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Material </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatCentavos(totales.total_material_centavos)}</span>
            </div>
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Mano de obra </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatCentavos(totales.total_mo_centavos)}</span>
            </div>
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Total obra </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCentavos(totales.total_centavos)}</span>
            </div>
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Costo/m² </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCentavos(totales.costo_m2_centavos)}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-semiboldtext-slate-500 dark:text-slate-400">
                Superficie <span className="font-semibold text-slate-900 dark:text-slate-100">{(h.superficie_milli / 1000).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} m²</span>
              </span>
              <button
                type="button"
                onClick={openSuperficieDialog}
                className="text-sm text-primary hover:underline dark:text-teal-400"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        {superficieDialogOpen && (
          <div
            className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="superficie-dialog-title"
            onClick={() => !superficieSaving && setSuperficieDialogOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h2 id="superficie-dialog-title" className="text-lg font-medium text-slate-800 dark:text-slate-100">
                  Superficie (m²)
                </h2>
              </div>
              <div className="space-y-4 px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Al guardar la superficie se actualiza el costo/m² (y en versiones confirmadas, el costo/m² del listado principal). Al salir del campo cantidad se guarda en la base de datos. Deshacer/Rehacer solo en memoria hasta guardar.
                </p>
                <div>
                  <label htmlFor="superficie-m2-dialog" className="mb-1 block text-sm text-slate-700 dark:text-slate-300">
                    Superficie en m²
                  </label>
                  <input
                    id="superficie-m2-dialog"
                    type="text"
                    inputMode="decimal"
                    value={superficieM2Str}
                    onChange={(e) => setSuperficieM2Str(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    autoFocus
                  />
                </div>
                {superficieMsg && (
                  <p
                    className={`text-sm ${superficieMsg.includes("Error") || superficieMsg.includes("Ingresá") ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}
                  >
                    {superficieMsg}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSuperficieDialogOpen(false)}
                  disabled={superficieSaving}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSuperficie}
                  disabled={superficieSaving}
                  className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  {superficieSaving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listados por obra (materiales / mano de obra) */}
        <ListadosPorObra versionId={versionId!} formatCentavos={formatCentavos} formatCantidad={formatCantidad} />
      </div>
    </div>
  );
}

interface ListadosPorObraProps {
  versionId: string;
  formatCentavos: (c: number) => string;
  formatCantidad: (m: number) => string;
}

function ListadosPorObra({ versionId, formatCentavos, formatCantidad }: ListadosPorObraProps) {
  const [materiales, setMateriales] = useState<MaterialObraRowDTO[] | null>(null);
  const [manoObra, setManoObra] = useState<ManoObraObraRowDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"materiales" | "mano_obra">("materiales");

  const loadListados = useCallback(async () => {
    setLoading(true);
    try {
      const [mat, mo] = await Promise.all([materialsAll(versionId), manoObraAll(versionId)]);
      setMateriales(mat);
      setManoObra(mo);
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  const handleExportCSV = useCallback(async () => {
    setExportMessage(null);
    setExportLoading(true);
    try {
      await exportComputoCSVAndSave(versionId);
      setExportMessage("CSV guardado");
      setTimeout(() => setExportMessage(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExportMessage(msg === "cancelado por el usuario" ? "Cancelado" : `Error: ${msg}`);
    } finally {
      setExportLoading(false);
    }
  }, [versionId]);

  const hasData = (materiales?.length ?? 0) > 0 || (manoObra?.length ?? 0) > 0;

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="font-medium text-slate-800 dark:text-slate-200">Listados por obra</h2>
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
          {exportMessage && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{exportMessage}</span>
          )}
          <button
            type="button"
            onClick={loadListados}
            disabled={loading}
            className="rounded bg-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-500 dark:hover:bg-slate-600"
          >
            {loading ? "Cargando…" : "Cargar listados"}
          </button>
        </div>
      </div>
      {hasData && (
        <div className="p-4">
          <div className="mb-3 flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("materiales")}
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
              onClick={() => setActiveTab("mano_obra")}
              className={`border-b-2 px-2 py-1 text-sm ${
                activeTab === "mano_obra"
                  ? "border-primary text-primary dark:border-teal-400 dark:text-teal-400"
                  : "border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Mano de obra
            </button>
          </div>
          {activeTab === "materiales" && materiales && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-2 font-medium">Descripción</th>
                    <th className="px-4 py-2 font-medium">Unidad</th>
                    <th className="px-4 py-2 font-medium text-right">Cantidad</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {materiales.map((row) => (
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
            </div>
          )}
          {activeTab === "mano_obra" && manoObra && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-2 font-medium">Descripción</th>
                    <th className="px-4 py-2 font-medium">Unidad</th>
                    <th className="px-4 py-2 font-medium text-right">Cantidad</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {manoObra.map((row) => (
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
            </div>
          )}
        </div>
      )}
      {!hasData && !loading && materiales !== null && (
        <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          Sin datos. Agregá rubros e ítems con composición y pulsá &quot;Cargar listados&quot;.
        </p>
      )}
    </div>
  );
}
