import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ListadoPanel } from "../../../components/ListadoPanel";
import { ScrollArea } from "../../../components/ScrollArea";
import {
  getComputo,
  computoConfirm,
  computoCreateNewVersionFrom,
  rubroCatalogList,
  computoRubrosAdd,
  computoRubrosDelete,
  computoRubrosReorder,
  itemCatalogList,
  computoRubroItemsAdd,
  computoRubroItemsSetCantidad,
  computoRubroItemsTrash,
  computoRubroTrashList,
  computoRubroTrashRestore,
  computoRubroTrashEmpty,
  computoSetComitenteDescripcion,
  computoSetSuperficie,
} from "../api";
import type {
  ComputoGetDTO,
  RubroCatalogItemDTO,
  ItemCatalogItemDTO,
  ComputoRubroItemTrashedDTO,
  ComputoCreateResultDTO,
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

function Modal({
  title,
  children,
  footer,
  onClose,
  zClassName = "z-30",
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose?: () => void;
  zClassName?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${zClassName} flex items-center justify-center bg-black/50 p-4`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
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

function ClearInputIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
  const [rubroDeleteMsg, setRubroDeleteMsg] = useState<string | null>(null);
  const [rubroTrashAction, setRubroTrashAction] = useState<{ id: string; nombre: string; count: number } | null>(null);
  const [rubroDeleteConfirm, setRubroDeleteConfirm] = useState<{ id: string; nombre: string } | null>(null);
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);
  const [cantidadOverrides, setCantidadOverrides] = useState<Record<string, number>>({});
  const [cantidadDraft, setCantidadDraft] = useState<Record<string, string>>({});
  const [undoStack, setUndoStack] = useState<Record<string, number>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, number>[]>([]);
  const [addRubroOpen, setAddRubroOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addRubroSearch, setAddRubroSearch] = useState("");
  const [addItemSearch, setAddItemSearch] = useState("");
  const [rubroCatalog, setRubroCatalog] = useState<RubroCatalogItemDTO[]>([]);
  const [itemCatalog, setItemCatalog] = useState<ItemCatalogItemDTO[]>([]);
  const [trashedItems, setTrashedItems] = useState<ComputoRubroItemTrashedDTO[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [superficieM2Str, setSuperficieM2Str] = useState("");
  const [superficieSaving, setSuperficieSaving] = useState(false);
  const [superficieMsg, setSuperficieMsg] = useState<string | null>(null);
  const [superficieDialogOpen, setSuperficieDialogOpen] = useState(false);
  const [comitenteStr, setComitenteStr] = useState("");
  const [comitenteSaving, setComitenteSaving] = useState(false);
  const [comitenteMsg, setComitenteMsg] = useState<string | null>(null);
  const [comitenteDialogOpen, setComitenteDialogOpen] = useState(false);

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

  const openComitenteDialog = useCallback(() => {
    setComitenteStr(computo?.header?.descripcion ?? "");
    setComitenteMsg(null);
    setComitenteDialogOpen(true);
  }, [computo?.header?.descripcion]);

  const handleSaveComitente = useCallback(async () => {
    if (!versionId) return;
    const value = comitenteStr.trim();
    if (!value) {
      setComitenteMsg("Ingresá una descripción de comitente.");
      return;
    }
    setComitenteMsg(null);
    setComitenteSaving(true);
    try {
      await computoSetComitenteDescripcion(versionId, value);
      await loadComputo(true);
      setComitenteDialogOpen(false);
    } catch (e) {
      setComitenteMsg(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setComitenteSaving(false);
    }
  }, [versionId, comitenteStr, loadComputo]);

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
  const availableRubros = useMemo(
    () => rubroCatalog.filter((rub) => !rubros.some((r) => r.rubro_id === rub.id)),
    [rubroCatalog, rubros]
  );
  const filteredRubros = useMemo(() => {
    const query = addRubroSearch.trim().toLowerCase();
    if (!query) return availableRubros;
    return availableRubros.filter((rub) => rub.nombre.toLowerCase().includes(query));
  }, [availableRubros, addRubroSearch]);
  const filteredItems = useMemo(() => {
    const query = addItemSearch.trim().toLowerCase();
    if (!query) return itemCatalog;
    return itemCatalog.filter((item) =>
      `${item.tarea} ${item.unidad}`.toLowerCase().includes(query)
    );
  }, [itemCatalog, addItemSearch]);

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
      .then(() => {
        setConfirmDialogOpen(false);
        loadComputo();
      })
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
    setAddRubroSearch("");
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

  const handleDeleteRubro = useCallback(
    async (computoRubroId: string) => {
      if (!isBorrador) return;
      const rubro = rubros.find((r) => r.id === computoRubroId);
      if (!rubro) return;

      if (rubro.items.length > 0) {
        setRubroDeleteMsg("Este rubro tiene ítems asociados. Primero eliminá o mové a papelera esos ítems.");
        return;
      }

      try {
        // If it's not the currently selected rubro, we still need to validate papelera.
        const trash = computoRubroId === selectedRubroId ? trashedItems : await computoRubroTrashList(computoRubroId);
        if (trash.length > 0) {
          setRubroTrashAction({ id: rubro.id, nombre: rubro.nombre, count: trash.length });
          return;
        }
      } catch {
        // If we can't validate trash, backend will still enforce it.
      }

      setRubroDeleteConfirm({ id: rubro.id, nombre: rubro.nombre });
    },
    [isBorrador, rubros, selectedRubroId, trashedItems, loadComputo]
  );

  const handleEmptyRubroTrash = useCallback(async () => {
    if (!rubroTrashAction) return;
    setActionLoading(true);
    try {
      await computoRubroTrashEmpty(rubroTrashAction.id);
      // Ensure UI reflects trash emptied (especially if rubro is selected).
      if (selectedRubroId === rubroTrashAction.id) {
        setTrashedItems([]);
      }
      setRubroTrashAction(null);
    } catch (e) {
      setRubroTrashAction(null);
      setRubroDeleteMsg(e instanceof Error ? e.message : "Error al vaciar la papelera");
    } finally {
      setActionLoading(false);
    }
  }, [rubroTrashAction, selectedRubroId]);

  const confirmDeleteRubro = useCallback(async () => {
    if (!rubroDeleteConfirm) return;
    setActionLoading(true);
    setRubroDeleteMsg(null);
    try {
      await computoRubrosDelete(rubroDeleteConfirm.id);
      setRubroDeleteConfirm(null);
      await loadComputo();
    } catch (e) {
      setRubroDeleteConfirm(null);
      setRubroDeleteMsg(e instanceof Error ? e.message : "Error al eliminar rubro");
    } finally {
      setActionLoading(false);
    }
  }, [rubroDeleteConfirm, loadComputo]);

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
    setAddItemSearch("");
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
      <div className="h-full min-h-0 bg-slate-50 p-6 dark:bg-slate-900">
        <div className="w-full">
          <p className="text-slate-500 dark:text-slate-400">Cargando cómputo…</p>
        </div>
      </div>
    );
  }

  if (error || !computo) {
    return (
      <div className="h-full min-h-0 bg-slate-50 p-6 dark:bg-slate-900">
        <div className="w-full">
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
    <div className="h-full min-h-0 overflow-hidden bg-slate-50 p-6 dark:bg-slate-900">
      <div className="flex h-full min-h-0 w-full flex-col">
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
          <span className="flex items-baseline gap-2 text-slate-600 dark:text-slate-400">
            <span>{h.descripcion}</span>
            <button
              type="button"
              onClick={openComitenteDialog}
              className="text-sm text-primary hover:underline dark:text-teal-400"
            >
              Editar
            </button>
          </span>
          <span className="ml-auto flex items-center gap-2">
            <Link
              to={`/computo/${versionId}/listados`}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Ver listados
            </Link>
            {isBorrador && (
              <button
                type="button"
                onClick={() => setConfirmDialogOpen(true)}
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

        <div className="min-h-0 flex flex-1 flex-col gap-6 overflow-hidden">
          <div className="min-h-0 flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
          {/* Panel rubros */}
          <ListadoPanel
            title="Rubros"
            right={
              isBorrador ? (
                <button
                  type="button"
                  onClick={handleAddRubroOpen}
                  className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primary-dark"
                >
                  + Rubro
                </button>
              ) : null
            }
            className="min-h-0 overflow-hidden lg:w-1/3"
            bodyClassName="p-0"
          >
            <ScrollArea mode="auto" containWheel className="h-0 p-0">
              {rubros.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Sin rubros. Agregá uno desde el catálogo.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {rubros.map((r, idx) => (
                    <li key={r.id} className="flex items-center gap-1">
                      {isBorrador && (
                        <span className="flex shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveRubro(idx, "up")}
                            disabled={idx === 0}
                            className="px-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-200"
                            aria-label="Subir"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRubro(idx, "down")}
                            disabled={idx === rubros.length - 1}
                            className="px-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-200"
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
                          selectedRubroId === r.id
                            ? "bg-primary/10 font-medium text-primary dark:bg-teal-900/30 dark:text-teal-300"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <span className="block truncate">{r.nombre}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatCentavos(r.subtotal_centavos)}
                        </span>
                      </button>
                      {isBorrador && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRubro(r.id)}
                          className="mr-2 shrink-0 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                          title="Eliminar rubro"
                          aria-label="Eliminar rubro"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </ListadoPanel>

          {/* Panel ítems del rubro seleccionado */}
          <ListadoPanel
            title={selectedRubro ? selectedRubro.nombre : "Seleccioná un rubro"}
            right={
              isBorrador && selectedRubro ? (
                <button
                  type="button"
                  onClick={handleAddItemOpen}
                  className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primary-dark"
                >
                  + Ítem
                </button>
              ) : null
            }
            className="min-h-0 overflow-hidden lg:flex-1"
            bodyClassName="p-0"
          >
            <ScrollArea mode="auto" containWheel className="h-0 p-0">
              {selectedRubro && selectedRubro.items.length > 0 ? (
                  <table className="min-w-[900px] w-full text-left text-sm">
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
              ) : selectedRubro ? (
                <p className="px-4 py-6 text-slate-500 dark:text-slate-400">Este rubro no tiene ítems. Agregá uno desde el catálogo.</p>
              ) : null}
              {/* Papelera del rubro */}
              {isBorrador && selectedRubro && trashedItems.length > 0 && (
                <div id="rubro-trash" className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
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
            </ScrollArea>
          </ListadoPanel>
          </div>

        {/* Diálogo Agregar rubro */}
        {addRubroOpen && (
          <Modal
            title="Agregar rubro"
            zClassName="z-10"
            onClose={() => {
              setAddRubroOpen(false);
              setAddRubroSearch("");
            }}
            footer={
              <button
                type="button"
                onClick={() => {
                  setAddRubroOpen(false);
                  setAddRubroSearch("");
                }}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cerrar
              </button>
            }
          >
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
                        {availableRubros.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Todos los rubros ya están en el cómputo.</p>
                        ) : (
                          <>
                            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Elegí un rubro para agregarlo al cómputo:</p>
                            <input
                              type="text"
                              value={addRubroSearch}
                              onChange={(e) => setAddRubroSearch(e.target.value)}
                              placeholder="Buscar rubro..."
                              className="w-full rounded border border-slate-300 px-3 py-2 pr-9 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              autoFocus
                            />
                            <div className="pointer-events-none relative -mt-9 mb-2 h-9">
                              {addRubroSearch.trim() && (
                                <button
                                  type="button"
                                  onClick={() => setAddRubroSearch("")}
                                  className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                                  aria-label="Limpiar búsqueda de rubros"
                                  title="Limpiar búsqueda"
                                >
                                  <ClearInputIcon />
                                </button>
                              )}
                            </div>
                            <ul className="max-h-80 overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
                              {filteredRubros.map((rub) => (
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
                              {filteredRubros.length === 0 && (
                                <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                  No hay rubros que coincidan con la búsqueda.
                                </li>
                              )}
                        </ul>
                      </>
                    )}
                  </>
                )}
          </Modal>
        )}

        {/* Diálogo Agregar ítem */}
        {addItemOpen && (
          <Modal
            title="Agregar ítem"
            zClassName="z-10"
            onClose={() => {
              setAddItemOpen(false);
              setAddItemSearch("");
            }}
            footer={
              <button
                type="button"
                onClick={() => {
                  setAddItemOpen(false);
                  setAddItemSearch("");
                }}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cerrar
              </button>
            }
          >
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
                    <input
                      type="text"
                      value={addItemSearch}
                      onChange={(e) => setAddItemSearch(e.target.value)}
                      placeholder="Buscar ítem o unidad..."
                      className="w-full rounded border border-slate-300 px-3 py-2 pr-9 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      autoFocus
                    />
                    <div className="pointer-events-none relative -mt-9 mb-2 h-9">
                      {addItemSearch.trim() && (
                        <button
                          type="button"
                          onClick={() => setAddItemSearch("")}
                          className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                          aria-label="Limpiar búsqueda de ítems"
                          title="Limpiar búsqueda"
                        >
                          <ClearInputIcon />
                        </button>
                      )}
                    </div>
                    <ul className="max-h-80 overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
                      {filteredItems.map((item) => (
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
                      {filteredItems.length === 0 && (
                        <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                          No hay ítems que coincidan con la búsqueda.
                        </li>
                      )}
                    </ul>
                  </>
                )}
          </Modal>
        )}

        {/* Panel totales */}
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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

        {comitenteDialogOpen && (
          <Modal
            title="Comitente"
            onClose={() => !comitenteSaving && setComitenteDialogOpen(false)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setComitenteDialogOpen(false)}
                  disabled={comitenteSaving}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveComitente}
                  disabled={comitenteSaving}
                  className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  {comitenteSaving ? "Guardando…" : "Guardar"}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="comitente-dialog" className="mb-1 block text-sm text-slate-700 dark:text-slate-300">
                  Descripción de comitente
                </label>
                <input
                  id="comitente-dialog"
                  type="text"
                  value={comitenteStr}
                  onChange={(e) => setComitenteStr(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  autoFocus
                />
              </div>
              {comitenteMsg && (
                <p
                  className={`text-sm ${comitenteMsg.includes("Error") || comitenteMsg.includes("Ingresá") ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}
                >
                  {comitenteMsg}
                </p>
              )}
            </div>
          </Modal>
        )}

        {confirmDialogOpen && (
          <Modal
            title="Confirmar versión"
            onClose={() => !actionLoading && setConfirmDialogOpen(false)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setConfirmDialogOpen(false)}
                  disabled={actionLoading}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                  autoFocus
                >
                  {actionLoading ? "Confirmando…" : "Sí, confirmar"}
                </button>
              </>
            }
          >
            <p className="text-sm text-slate-700 dark:text-slate-200">Vas a confirmar esta versión del cómputo.</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Al confirmar, la versión queda cerrada para edición y se habilita crear una nueva versión desde esta base.
            </p>
          </Modal>
        )}

        {rubroDeleteConfirm && (
          <Modal
            title="Eliminar rubro"
            onClose={() => !actionLoading && setRubroDeleteConfirm(null)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setRubroDeleteConfirm(null)}
                  disabled={actionLoading}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRubro}
                  disabled={actionLoading}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                  autoFocus
                >
                  {actionLoading ? "Eliminando…" : "Eliminar"}
                </button>
              </>
            }
          >
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Vas a eliminar el rubro <span className="font-medium">&quot;{rubroDeleteConfirm.nombre}&quot;</span> del cómputo.
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Esta acción no se puede deshacer.</p>
          </Modal>
        )}

        {rubroTrashAction && (
          <Modal
            title="Rubro con papelera"
            onClose={() => !actionLoading && setRubroTrashAction(null)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRubroId(rubroTrashAction.id);
                    setRubroTrashAction(null);
                    setTimeout(() => document.getElementById("rubro-trash")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                  }}
                  disabled={actionLoading}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Ver papelera
                </button>
                <button
                  type="button"
                  onClick={() => setRubroTrashAction(null)}
                  disabled={actionLoading}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEmptyRubroTrash}
                  disabled={actionLoading}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                  autoFocus
                >
                  {actionLoading ? "Vaciando…" : "Vaciar papelera"}
                </button>
              </>
            }
          >
            <p className="text-sm text-slate-700 dark:text-slate-200">
              El rubro <span className="font-medium">&quot;{rubroTrashAction.nombre}&quot;</span> tiene {rubroTrashAction.count} ítem(s) en la papelera.
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Para eliminar el rubro, primero restaurá esos ítems o vaciá la papelera (eliminación definitiva).
            </p>
          </Modal>
        )}

        {rubroDeleteMsg && (
          <Modal
            title="No se puede eliminar"
            onClose={() => setRubroDeleteMsg(null)}
            footer={
              <button
                type="button"
                onClick={() => setRubroDeleteMsg(null)}
                className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark dark:bg-teal-600 dark:hover:bg-teal-700"
                autoFocus
              >
                OK
              </button>
            }
          >
            <p className="text-sm text-slate-700 dark:text-slate-200">{rubroDeleteMsg}</p>
          </Modal>
        )}
        </div>
      </div>
    </div>
  );
}
