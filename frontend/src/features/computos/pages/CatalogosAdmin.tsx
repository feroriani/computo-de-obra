import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import type {
  Cell,
  CellContext,
  Header,
  HeaderGroup,
  Row,
} from "@tanstack/react-table";
import {
  rubroCatalogListPaged,
  rubroCatalogCreate,
  rubroCatalogUpdate,
  rubroCatalogDelete,
  componenteMaterialListPaged,
  componenteMaterialList,
  componenteMaterialCreate,
  componenteMaterialUpdate,
  componenteMaterialDelete,
  componenteManoObraListPaged,
  componenteManoObraList,
  componenteManoObraCreate,
  componenteManoObraUpdate,
  componenteManoObraDelete,
  itemCatalogListPaged,
  itemCatalogCreate,
  itemCatalogUpdate,
  itemCatalogDelete,
  itemCompositionListMaterials,
  itemCompositionListManoObra,
  itemCompositionAddMaterial,
  itemCompositionAddManoObra,
  itemCompositionSetMaterialDosaje,
  itemCompositionSetManoObraDosaje,
  itemCompositionDeleteMaterial,
  itemCompositionDeleteManoObra,
} from "../api";
import type {
  RubroCatalogItemDTO,
  ComponenteMaterialItemDTO,
  ComponenteManoObraItemDTO,
  ItemCatalogItemDTO,
  ItemMaterialRowDTO,
  ItemManoObraRowDTO,
} from "../api";

type TabId = "rubros" | "materiales" | "manoobra" | "items";

function formatCentavos(centavos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(centavos / 100);
}

function formatDosaje(milli: number): string {
  return (milli / 1000).toFixed(3).replace(/\.?0+$/, "") || "0";
}

function parseDosajeMilli(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 1000);
}

const PAGE_SIZE = 25;

// NOTA: en WebViews (Wails) `position: sticky` en tablas puede trabar el scroll.
// Para probar fluidez, dejamos el header NO-sticky. Si mejora, luego reintroducimos sticky con otra estrategia.
const thBase =
  "px-4 py-2 font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600";
function thClass(columnId: string): string {
  if (columnId === "acciones") return `${thBase} w-40 text-right`;
  if (columnId === "costo_centavos") return `${thBase} text-right`;
  return `${thBase} text-left`;
}

/** Scroll solo en filas; buscador y paginación quedan fuera (en el padre). */
function CatalogTableBodyScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={ref}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain"
      style={{
        scrollbarGutter: "stable",
        // En algunos WebViews `overscroll-behavior` por clase no alcanza.
        overscrollBehavior: "contain",
      }}
      onWheel={(e) => {
        // Evitar que el wheel “se escape” al scroll de la ventana (scroll chaining),
        // que en Wails se percibe como trabas + hover del scrollbar.
        e.stopPropagation();

        const el = ref.current;
        if (!el) return;

        // Si el contenedor puede scrollear en Y, prevenimos el default para que
        // el navegador no intente transferir el wheel al ancestro.
        const canScrollY = el.scrollHeight > el.clientHeight + 1;
        if (canScrollY) e.preventDefault();
      }}
      onPointerDown={() => {
        const ae = document.activeElement as HTMLElement | null;
        if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) ae.blur();
      }}
    >
      {children}
    </div>
  );
}

function rowClassName(): string {
  // Para diagnosticar jank: desactivamos hover en filas dentro del scroll.
  return "";
}

const rubroColumnHelper = createColumnHelper<RubroCatalogItemDTO>();
const materialColumnHelper = createColumnHelper<ComponenteMaterialItemDTO>();
const moColumnHelper = createColumnHelper<ComponenteManoObraItemDTO>();
const itemColumnHelper = createColumnHelper<ItemCatalogItemDTO>();

function CatalogPaginationBar({
  page,
  totalPages,
  total,
  canPrev,
  canNext,
  loading,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
      <span className="text-slate-600 dark:text-slate-400">
        {total === 0
          ? "Sin resultados"
          : `${total} registro${total !== 1 ? "s" : ""} · Página ${page} de ${totalPages}`}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={onPrev}
          className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={!canNext || loading}
          onClick={onNext}
          className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function useCatalogPage<T>(
  tabActive: boolean,
  fetchPaged: (q: string, limit: number, offset: number) => Promise<{ items: T[]; total: number }>,
  setGlobalError: (s: string) => void
) {
  const [qApplied, setQApplied] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refetchNonce, setRefetchNonce] = useState(0);
  const fetchRef = useRef(fetchPaged);
  fetchRef.current = fetchPaged;

  // Input uncontrolled: evita re-renders por tecla en WebView.
  const inputRef = useRef<HTMLInputElement | null>(null);

  const applySearch = useCallback(() => {
    const next = (inputRef.current?.value ?? "").trim();
    setQApplied(next);
    setPage(0);
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    if (!tabActive) return;
    let cancel = false;
    setLoading(true);
    fetchRef
      .current(qApplied, PAGE_SIZE, page * PAGE_SIZE)
      .then((p) => {
        if (!cancel) {
          if (p.items.length === 0 && p.total > 0) {
            const lastPage = Math.max(0, Math.ceil(p.total / PAGE_SIZE) - 1);
            if (page > lastPage) {
              setPage(lastPage);
              return;
            }
          }
          setItems(p.items);
          setTotal(p.total);
          setGlobalError("");
        }
      })
      .catch((e) => {
        if (!cancel) {
          setItems([]);
          setTotal(0);
          setGlobalError(e instanceof Error ? e.message : "Error");
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [tabActive, qApplied, page, refetchNonce, setGlobalError]);

  const refetch = useCallback(() => setRefetchNonce((n) => n + 1), []);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < total;

  return {
    inputRef,
    applySearch,
    qApplied,
    page: page + 1,
    totalPages,
    setPageIndex: setPage,
    items,
    total,
    loading,
    canPrev,
    canNext,
    refetch,
  };
}

const searchInputClass =
  "w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

const searchButtonClass =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700";

export function CatalogosAdmin() {
  const [tab, setTab] = useState<TabId>("rubros");
  const [error, setError] = useState("");

  // Evita scroll de ventana mientras esta pantalla está montada.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = (html.style as any).overscrollBehavior;
    const prevBodyOverscroll = (body.style as any).overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    (html.style as any).overscrollBehavior = "none";
    (body.style as any).overscrollBehavior = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      (html.style as any).overscrollBehavior = prevHtmlOverscroll;
      (body.style as any).overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  // Si clickeás en cualquier lugar fuera del input, que pierda foco.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      if (!ae || (ae.tagName !== "INPUT" && ae.tagName !== "TEXTAREA")) return;

      const target = e.target as Node | null;
      if (!target) return;

      // Si el click fue dentro del input enfocado, no hacemos nada.
      if (ae.contains(target)) return;

      ae.blur();
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
  }, []);

  const rubrosPg = useCatalogPage(tab === "rubros", rubroCatalogListPaged, setError);
  const matPg = useCatalogPage(tab === "materiales", componenteMaterialListPaged, setError);
  const moPg = useCatalogPage(tab === "manoobra", componenteManoObraListPaged, setError);
  const itemsPg = useCatalogPage(tab === "items", itemCatalogListPaged, setError);

  const [rubroModal, setRubroModal] = useState<{ open: boolean; id: string | null; nombre: string }>({
    open: false,
    id: null,
    nombre: "",
  });
  const [materialModal, setMaterialModal] = useState<{
    open: boolean;
    id: string | null;
    descripcion: string;
    unidad: string;
    costoCentavos: string;
  }>({ open: false, id: null, descripcion: "", unidad: "", costoCentavos: "" });
  const [manoObraModal, setManoObraModal] = useState<{
    open: boolean;
    id: string | null;
    descripcion: string;
    unidad: string;
    costoCentavos: string;
  }>({ open: false, id: null, descripcion: "", unidad: "", costoCentavos: "" });
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    id: string | null;
    tarea: string;
    unidad: string;
  }>({ open: false, id: null, tarea: "", unidad: "" });
  const [composicionModal, setComposicionModal] = useState<{
    open: boolean;
    item: ItemCatalogItemDTO | null;
    materials: ItemMaterialRowDTO[];
    manoObra: ItemManoObraRowDTO[];
    catalogMateriales: ComponenteMaterialItemDTO[];
    catalogManoObra: ComponenteManoObraItemDTO[];
  }>({
    open: false,
    item: null,
    materials: [],
    manoObra: [],
    catalogMateriales: [],
    catalogManoObra: [],
  });

  const openComposicion = (item: ItemCatalogItemDTO) => {
    Promise.all([
      itemCompositionListMaterials(item.id),
      itemCompositionListManoObra(item.id),
      componenteMaterialList(),
      componenteManoObraList(),
    ])
      .then(([mats, mo, catM, catMo]) => {
        setComposicionModal({
          open: true,
          item,
          materials: mats,
          manoObra: mo,
          catalogMateriales: catM,
          catalogManoObra: catMo,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  };

  const refreshComposicion = () => {
    const item = composicionModal.item;
    if (!item) return;
    Promise.all([
      itemCompositionListMaterials(item.id),
      itemCompositionListManoObra(item.id),
    ]).then(([mats, mo]) => {
      setComposicionModal((prev) => ({ ...prev, materials: mats, manoObra: mo }));
    });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "rubros", label: "Rubros" },
    { id: "materiales", label: "Componentes material" },
    { id: "manoobra", label: "Componentes mano de obra" },
    { id: "items", label: "Ítems" },
  ];

  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              aria-label="Volver"
            >
              ← Volver
            </Link>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              Catálogos globales
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                tab === id
                  ? "border-emerald-600 text-emerald-700 dark:border-teal-400 dark:text-teal-300"
                  : "border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1">
          {tab === "rubros" && (
            <div className="flex h-full flex-col gap-3">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  rubrosPg.applySearch();
                }}
              >
                <input
                  type="search"
                  placeholder="Buscar por nombre…"
                  ref={rubrosPg.inputRef}
                  className={searchInputClass}
                  aria-label="Buscar rubros"
                  onInput={(e: FormEvent<HTMLInputElement>) => {
                    // Click en la "X" del input search → valor vacío: listar todo.
                    if (e.currentTarget.value.trim() === "") rubrosPg.applySearch();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") (e.currentTarget as HTMLInputElement).blur();
                  }}
                />
                <button type="submit" className={searchButtonClass} disabled={rubrosPg.loading}>
                  Buscar
                </button>
              </form>
              <div className="min-h-0 flex-1">
              <RubrosTab
                items={rubrosPg.items}
                loading={rubrosPg.loading}
                emptyHint={
                  rubrosPg.qApplied
                    ? "Sin resultados para la búsqueda."
                    : "No hay rubros."
                }
                onAdd={() => setRubroModal({ open: true, id: null, nombre: "" })}
                onEdit={(r) => setRubroModal({ open: true, id: r.id, nombre: r.nombre })}
                onDelete={async (id) => {
                  await rubroCatalogDelete(id);
                  rubrosPg.refetch();
                }}
              />
              </div>
              <CatalogPaginationBar
                page={rubrosPg.page}
                totalPages={rubrosPg.totalPages}
                total={rubrosPg.total}
                canPrev={rubrosPg.canPrev}
                canNext={rubrosPg.canNext}
                loading={rubrosPg.loading}
                onPrev={() => rubrosPg.setPageIndex((p) => Math.max(0, p - 1))}
                onNext={() => rubrosPg.setPageIndex((p) => p + 1)}
              />
            </div>
          )}
          {tab === "materiales" && (
            <div className="flex h-full flex-col gap-3">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  matPg.applySearch();
                }}
              >
                <input
                  type="search"
                  placeholder="Buscar por descripción o unidad…"
                  ref={matPg.inputRef}
                  className={searchInputClass}
                  aria-label="Buscar componentes material"
                  onInput={(e: FormEvent<HTMLInputElement>) => {
                    if (e.currentTarget.value.trim() === "") matPg.applySearch();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") (e.currentTarget as HTMLInputElement).blur();
                  }}
                />
                <button type="submit" className={searchButtonClass} disabled={matPg.loading}>
                  Buscar
                </button>
              </form>
              <div className="min-h-0 flex-1">
              <MaterialesTab
                items={matPg.items}
                loading={matPg.loading}
                emptyHint={
                  matPg.qApplied
                    ? "Sin resultados para la búsqueda."
                    : "No hay componentes material."
                }
                onAdd={() =>
                  setMaterialModal({
                    open: true,
                    id: null,
                    descripcion: "",
                    unidad: "",
                    costoCentavos: "",
                  })
                }
                onEdit={(m) =>
                  setMaterialModal({
                    open: true,
                    id: m.id,
                    descripcion: m.descripcion,
                    unidad: m.unidad,
                    costoCentavos: String(m.costo_centavos),
                  })
                }
                onDelete={async (id) => {
                  await componenteMaterialDelete(id);
                  matPg.refetch();
                }}
              />
              </div>
              <CatalogPaginationBar
                page={matPg.page}
                totalPages={matPg.totalPages}
                total={matPg.total}
                canPrev={matPg.canPrev}
                canNext={matPg.canNext}
                loading={matPg.loading}
                onPrev={() => matPg.setPageIndex((p) => Math.max(0, p - 1))}
                onNext={() => matPg.setPageIndex((p) => p + 1)}
              />
            </div>
          )}
          {tab === "manoobra" && (
            <div className="flex h-full flex-col gap-3">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  moPg.applySearch();
                }}
              >
                <input
                  type="search"
                  placeholder="Buscar por descripción o unidad…"
                  ref={moPg.inputRef}
                  className={searchInputClass}
                  aria-label="Buscar mano de obra"
                  onInput={(e: FormEvent<HTMLInputElement>) => {
                    if (e.currentTarget.value.trim() === "") moPg.applySearch();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") (e.currentTarget as HTMLInputElement).blur();
                  }}
                />
                <button type="submit" className={searchButtonClass} disabled={moPg.loading}>
                  Buscar
                </button>
              </form>
              <div className="min-h-0 flex-1">
              <ManoObraTab
                items={moPg.items}
                loading={moPg.loading}
                emptyHint={
                  moPg.qApplied
                    ? "Sin resultados para la búsqueda."
                    : "No hay componentes mano de obra."
                }
                onAdd={() =>
                  setManoObraModal({
                    open: true,
                    id: null,
                    descripcion: "",
                    unidad: "",
                    costoCentavos: "",
                  })
                }
                onEdit={(m) =>
                  setManoObraModal({
                    open: true,
                    id: m.id,
                    descripcion: m.descripcion,
                    unidad: m.unidad,
                    costoCentavos: String(m.costo_centavos),
                  })
                }
                onDelete={async (id) => {
                  await componenteManoObraDelete(id);
                  moPg.refetch();
                }}
              />
              </div>
              <CatalogPaginationBar
                page={moPg.page}
                totalPages={moPg.totalPages}
                total={moPg.total}
                canPrev={moPg.canPrev}
                canNext={moPg.canNext}
                loading={moPg.loading}
                onPrev={() => moPg.setPageIndex((p) => Math.max(0, p - 1))}
                onNext={() => moPg.setPageIndex((p) => p + 1)}
              />
            </div>
          )}
          {tab === "items" && (
            <div className="flex h-full flex-col gap-3">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  itemsPg.applySearch();
                }}
              >
                <input
                  type="search"
                  placeholder="Buscar por tarea o unidad…"
                  ref={itemsPg.inputRef}
                  className={searchInputClass}
                  aria-label="Buscar ítems"
                  onInput={(e: FormEvent<HTMLInputElement>) => {
                    if (e.currentTarget.value.trim() === "") itemsPg.applySearch();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") (e.currentTarget as HTMLInputElement).blur();
                  }}
                />
                <button type="submit" className={searchButtonClass} disabled={itemsPg.loading}>
                  Buscar
                </button>
              </form>
              <div className="min-h-0 flex-1">
              <ItemsTab
                items={itemsPg.items}
                loading={itemsPg.loading}
                emptyHint={
                  itemsPg.qApplied
                    ? "Sin resultados para la búsqueda."
                    : "No hay ítems."
                }
                onAdd={() =>
                  setItemModal({ open: true, id: null, tarea: "", unidad: "" })
                }
                onEdit={(i) =>
                  setItemModal({
                    open: true,
                    id: i.id,
                    tarea: i.tarea,
                    unidad: i.unidad,
                  })
                }
                onDelete={async (id) => {
                  await itemCatalogDelete(id);
                  itemsPg.refetch();
                }}
                onComposicion={openComposicion}
              />
              </div>
              <CatalogPaginationBar
                page={itemsPg.page}
                totalPages={itemsPg.totalPages}
                total={itemsPg.total}
                canPrev={itemsPg.canPrev}
                canNext={itemsPg.canNext}
                loading={itemsPg.loading}
                onPrev={() => itemsPg.setPageIndex((p) => Math.max(0, p - 1))}
                onNext={() => itemsPg.setPageIndex((p) => p + 1)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Rubro */}
      {rubroModal.open && (
        <RubroFormModal
          id={rubroModal.id}
          nombre={rubroModal.nombre}
          onClose={() => setRubroModal((p) => ({ ...p, open: false }))}
          onSave={async (nombre) => {
            if (rubroModal.id) {
              await rubroCatalogUpdate(rubroModal.id, nombre);
            } else {
              await rubroCatalogCreate(nombre);
            }
            rubrosPg.refetch();
            setRubroModal((p) => ({ ...p, open: false }));
          }}
        />
      )}

      {/* Modal Material */}
      {materialModal.open && (
        <ComponenteMaterialFormModal
          id={materialModal.id}
          descripcion={materialModal.descripcion}
          unidad={materialModal.unidad}
          costoCentavos={materialModal.costoCentavos}
          onClose={() => setMaterialModal((p) => ({ ...p, open: false }))}
          onSave={async (descripcion, unidad, costoPesosStr) => {
            const centavos = Math.round(parseFloat(costoPesosStr) * 100);
            if (materialModal.id) {
              await componenteMaterialUpdate(
                materialModal.id,
                descripcion,
                unidad,
                centavos
              );
            } else {
              await componenteMaterialCreate(descripcion, unidad, centavos);
            }
            matPg.refetch();
            setMaterialModal((p) => ({ ...p, open: false }));
          }}
        />
      )}

      {/* Modal Mano de obra */}
      {manoObraModal.open && (
        <ComponenteManoObraFormModal
          id={manoObraModal.id}
          descripcion={manoObraModal.descripcion}
          unidad={manoObraModal.unidad}
          costoCentavos={manoObraModal.costoCentavos}
          onClose={() => setManoObraModal((p) => ({ ...p, open: false }))}
          onSave={async (descripcion, unidad, costoPesosStr) => {
            const centavos = Math.round(parseFloat(costoPesosStr) * 100);
            if (manoObraModal.id) {
              await componenteManoObraUpdate(
                manoObraModal.id,
                descripcion,
                unidad,
                centavos
              );
            } else {
              await componenteManoObraCreate(descripcion, unidad, centavos);
            }
            moPg.refetch();
            setManoObraModal((p) => ({ ...p, open: false }));
          }}
        />
      )}

      {/* Modal Ítem */}
      {itemModal.open && (
        <ItemFormModal
          id={itemModal.id}
          tarea={itemModal.tarea}
          unidad={itemModal.unidad}
          onClose={() => setItemModal((p) => ({ ...p, open: false }))}
          onSave={async (tarea, unidad) => {
            if (itemModal.id) {
              await itemCatalogUpdate(itemModal.id, tarea, unidad);
            } else {
              await itemCatalogCreate(tarea, unidad);
            }
            itemsPg.refetch();
            setItemModal((p) => ({ ...p, open: false }));
          }}
        />
      )}

      {/* Modal Composición ítem */}
      {composicionModal.open && composicionModal.item && (
        <ComposicionModal
          item={composicionModal.item}
          materials={composicionModal.materials}
          manoObra={composicionModal.manoObra}
          catalogMateriales={composicionModal.catalogMateriales}
          catalogManoObra={composicionModal.catalogManoObra}
          onClose={() => setComposicionModal((p) => ({ ...p, open: false }))}
          onRefresh={refreshComposicion}
          onAddMaterial={itemCompositionAddMaterial}
          onAddManoObra={itemCompositionAddManoObra}
          onSetMaterialDosaje={itemCompositionSetMaterialDosaje}
          onSetManoObraDosaje={itemCompositionSetManoObraDosaje}
          onDeleteMaterial={itemCompositionDeleteMaterial}
          onDeleteManoObra={itemCompositionDeleteManoObra}
        />
      )}
    </div>
  );
}

function RubrosTab({
  items,
  loading,
  emptyHint,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: RubroCatalogItemDTO[];
  loading: boolean;
  emptyHint: string;
  onAdd: () => void;
  onEdit: (r: RubroCatalogItemDTO) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const columns = useMemo(
    () => [
      rubroColumnHelper.accessor("nombre", {
        header: "Nombre",
        cell: (info: CellContext<RubroCatalogItemDTO, string>) => (
          <span className="text-slate-800 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      rubroColumnHelper.display({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }: { row: Row<RubroCatalogItemDTO> }) => {
          const r = row.original;
          return (
            <div className="text-right">
              <button
                type="button"
                onClick={() => onEdit(r)}
                className="text-emerald-600 hover:underline dark:text-teal-400"
              >
                Editar
              </button>
              {" · "}
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("¿Eliminar este rubro?")) return;
                  setDeleting(r.id);
                  await onDelete(r.id);
                  setDeleting(null);
                }}
                disabled={deleting === r.id}
                className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Eliminar
              </button>
            </div>
          );
        },
      }),
    ],
    [deleting, onEdit, onDelete]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: RubroCatalogItemDTO) => row.id,
  });

  const colCount = columns.length;

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-800">
      <div className="flex justify-end border-b border-slate-200 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          Nuevo rubro
        </button>
      </div>
      {!loading && items.length === 0 ? (
        <p className="p-6 text-center text-slate-500 dark:text-slate-400">{emptyHint}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header de columnas fuera del scroll (más fluido en WebViews) */}
          <div className="grid grid-cols-[minmax(0,1fr)_10rem] gap-0 border-b border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            <div className="px-4 py-2 text-left">Nombre</div>
            <div className="px-4 py-2 text-right">Acciones</div>
          </div>

          <CatalogTableBodyScroll>
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando…</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {table.getRowModel().rows.map((row: Row<RubroCatalogItemDTO>) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_10rem] items-center bg-white dark:bg-slate-800"
                  >
                    {row.getVisibleCells().map((cell: Cell<RubroCatalogItemDTO, unknown>) => (
                      <div
                        key={cell.id}
                        className={`px-4 py-2 ${cell.column.id === "acciones" ? "text-right" : "text-left"}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CatalogTableBodyScroll>
        </div>
      )}
    </div>
  );
}

function MaterialesTab({
  items,
  loading,
  emptyHint,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: ComponenteMaterialItemDTO[];
  loading: boolean;
  emptyHint: string;
  onAdd: () => void;
  onEdit: (m: ComponenteMaterialItemDTO) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const columns = useMemo(
    () => [
      materialColumnHelper.accessor("descripcion", {
        header: "Descripción",
        cell: (info: CellContext<ComponenteMaterialItemDTO, string>) => (
          <span className="text-slate-800 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      materialColumnHelper.accessor("unidad", {
        header: "Unidad",
        cell: (info: CellContext<ComponenteMaterialItemDTO, string>) => (
          <span className="text-slate-800 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      materialColumnHelper.accessor("costo_centavos", {
        header: "Costo",
        cell: (info: CellContext<ComponenteMaterialItemDTO, number>) => (
          <span className="text-right text-slate-800 dark:text-slate-200">
            {formatCentavos(info.getValue())}
          </span>
        ),
      }),
      materialColumnHelper.display({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }: { row: Row<ComponenteMaterialItemDTO> }) => {
          const m = row.original;
          return (
            <div className="text-right">
              <button
                type="button"
                onClick={() => onEdit(m)}
                className="text-emerald-600 hover:underline dark:text-teal-400"
              >
                Editar
              </button>
              {" · "}
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("¿Eliminar este componente?")) return;
                  setDeleting(m.id);
                  await onDelete(m.id);
                  setDeleting(null);
                }}
                disabled={deleting === m.id}
                className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Eliminar
              </button>
            </div>
          );
        },
      }),
    ],
    [deleting, onEdit, onDelete]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: ComponenteMaterialItemDTO) => row.id,
  });

  const colCount = columns.length;
  const tdAlign = (id: string) =>
    id === "acciones" || id === "costo_centavos" ? "text-right" : "";

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-800">
      <div className="flex justify-end border-b border-slate-200 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          Nuevo componente
        </button>
      </div>
      {!loading && items.length === 0 ? (
        <p className="p-6 text-center text-slate-500 dark:text-slate-400">{emptyHint}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem_8rem_10rem] items-center border-b border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            <div className="px-4 py-2 text-left">Descripción</div>
            <div className="px-4 py-2 text-left">Unidad</div>
            <div className="px-4 py-2 text-right">Costo</div>
            <div className="px-4 py-2 text-right">Acciones</div>
          </div>
          <CatalogTableBodyScroll>
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando…</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {table.getRowModel().rows.map((row: Row<ComponenteMaterialItemDTO>) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_8rem_8rem_10rem] items-center bg-white dark:bg-slate-800"
                  >
                    {row.getVisibleCells().map((cell: Cell<ComponenteMaterialItemDTO, unknown>) => (
                      <div key={cell.id} className={`px-4 py-2 ${tdAlign(cell.column.id)}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CatalogTableBodyScroll>
        </div>
      )}
    </div>
  );
}

function ManoObraTab({
  items,
  loading,
  emptyHint,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: ComponenteManoObraItemDTO[];
  loading: boolean;
  emptyHint: string;
  onAdd: () => void;
  onEdit: (m: ComponenteManoObraItemDTO) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const columns = useMemo(
    () => [
      moColumnHelper.accessor("descripcion", {
        header: "Descripción",
        cell: (info: CellContext<ComponenteManoObraItemDTO, string>) => (
          <span className="text-slate-800 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      moColumnHelper.accessor("unidad", {
        header: "Unidad",
        cell: (info: CellContext<ComponenteManoObraItemDTO, string>) => (
          <span className="text-slate-800 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      moColumnHelper.accessor("costo_centavos", {
        header: "Costo",
        cell: (info: CellContext<ComponenteManoObraItemDTO, number>) => (
          <span className="text-right text-slate-800 dark:text-slate-200">
            {formatCentavos(info.getValue())}
          </span>
        ),
      }),
      moColumnHelper.display({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }: { row: Row<ComponenteManoObraItemDTO> }) => {
          const m = row.original;
          return (
            <div className="text-right">
              <button
                type="button"
                onClick={() => onEdit(m)}
                className="text-emerald-600 hover:underline dark:text-teal-400"
              >
                Editar
              </button>
              {" · "}
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("¿Eliminar este componente?")) return;
                  setDeleting(m.id);
                  await onDelete(m.id);
                  setDeleting(null);
                }}
                disabled={deleting === m.id}
                className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Eliminar
              </button>
            </div>
          );
        },
      }),
    ],
    [deleting, onEdit, onDelete]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: ComponenteManoObraItemDTO) => row.id,
  });

  const colCount = columns.length;
  const tdAlign = (id: string) =>
    id === "acciones" || id === "costo_centavos" ? "text-right" : "";

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-800">
      <div className="flex justify-end border-b border-slate-200 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          Nuevo componente
        </button>
      </div>
      {!loading && items.length === 0 ? (
        <p className="p-6 text-center text-slate-500 dark:text-slate-400">{emptyHint}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem_8rem_10rem] items-center border-b border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            <div className="px-4 py-2 text-left">Descripción</div>
            <div className="px-4 py-2 text-left">Unidad</div>
            <div className="px-4 py-2 text-right">Costo</div>
            <div className="px-4 py-2 text-right">Acciones</div>
          </div>
          <CatalogTableBodyScroll>
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando…</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {table.getRowModel().rows.map((row: Row<ComponenteManoObraItemDTO>) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_8rem_8rem_10rem] items-center bg-white dark:bg-slate-800"
                  >
                    {row.getVisibleCells().map((cell: Cell<ComponenteManoObraItemDTO, unknown>) => (
                      <div key={cell.id} className={`px-4 py-2 ${tdAlign(cell.column.id)}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CatalogTableBodyScroll>
        </div>
      )}
    </div>
  );
}

function ItemsTab({
  items,
  loading,
  emptyHint,
  onAdd,
  onEdit,
  onDelete,
  onComposicion,
}: {
  items: ItemCatalogItemDTO[];
  loading: boolean;
  emptyHint: string;
  onAdd: () => void;
  onEdit: (i: ItemCatalogItemDTO) => void;
  onDelete: (id: string) => Promise<void>;
  onComposicion: (i: ItemCatalogItemDTO) => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const columns = useMemo(
    () => [
      itemColumnHelper.accessor("tarea", {
        header: "Tarea",
        cell: (info: CellContext<ItemCatalogItemDTO, string>) => (
          <span className="text-slate-800 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      itemColumnHelper.accessor("unidad", {
        header: "Unidad",
        cell: (info: CellContext<ItemCatalogItemDTO, string>) => (
          <span className="text-slate-800 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      itemColumnHelper.display({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }: { row: Row<ItemCatalogItemDTO> }) => {
          const i = row.original;
          return (
            <div className="text-right">
              <button
                type="button"
                onClick={() => onComposicion(i)}
                className="text-slate-600 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
              >
                Composición
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => onEdit(i)}
                className="text-emerald-600 hover:underline dark:text-teal-400"
              >
                Editar
              </button>
              {" · "}
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("¿Eliminar este ítem?")) return;
                  setDeleting(i.id);
                  await onDelete(i.id);
                  setDeleting(null);
                }}
                disabled={deleting === i.id}
                className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Eliminar
              </button>
            </div>
          );
        },
      }),
    ],
    [deleting, onEdit, onDelete, onComposicion]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: ItemCatalogItemDTO) => row.id,
  });

  const colCount = columns.length;

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-800">
      <div className="flex justify-end border-b border-slate-200 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          Nuevo ítem
        </button>
      </div>
      {!loading && items.length === 0 ? (
        <p className="p-6 text-center text-slate-500 dark:text-slate-400">{emptyHint}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem_14rem] items-center border-b border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            <div className="px-4 py-2 text-left">Tarea</div>
            <div className="px-4 py-2 text-left">Unidad</div>
            <div className="px-4 py-2 text-right">Acciones</div>
          </div>
          <CatalogTableBodyScroll>
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando…</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {table.getRowModel().rows.map((row: Row<ItemCatalogItemDTO>) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_8rem_14rem] items-center bg-white dark:bg-slate-800"
                  >
                    {row.getVisibleCells().map((cell: Cell<ItemCatalogItemDTO, unknown>) => (
                      <div
                        key={cell.id}
                        className={`px-4 py-2 ${cell.column.id === "acciones" ? "text-right" : "text-left"}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CatalogTableBodyScroll>
        </div>
      )}
    </div>
  );
}

function RubroFormModal({
  id,
  nombre,
  onClose,
  onSave,
}: {
  id: string | null;
  nombre: string;
  onClose: () => void;
  onSave: (nombre: string) => Promise<void>;
}) {
  const [value, setValue] = useState(nombre);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(nombre), [nombre]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          {id ? "Editar rubro" : "Nuevo rubro"}
        </h2>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nombre"
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!value.trim()) return;
              setSaving(true);
              await onSave(value.trim());
              setSaving(false);
            }}
            disabled={saving || !value.trim()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ComponenteMaterialFormModal({
  id,
  descripcion,
  unidad,
  costoCentavos,
  onClose,
  onSave,
}: {
  id: string | null;
  descripcion: string;
  unidad: string;
  costoCentavos: string;
  onClose: () => void;
  onSave: (
    descripcion: string,
    unidad: string,
    costoPesosStr: string
  ) => Promise<void>;
}) {
  const [desc, setDesc] = useState(descripcion);
  const [uni, setUni] = useState(unidad);
  const [costo, setCosto] = useState(
    costoCentavos ? (parseInt(costoCentavos, 10) / 100).toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDesc(descripcion);
    setUni(unidad);
    setCosto(costoCentavos ? (parseInt(costoCentavos, 10) / 100).toFixed(2) : "");
  }, [descripcion, unidad, costoCentavos]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          {id ? "Editar componente material" : "Nuevo componente material"}
        </h2>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Descripción"
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <input
          type="text"
          value={uni}
          onChange={(e) => setUni(e.target.value)}
          placeholder="Unidad"
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <input
          type="text"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          placeholder="Costo (pesos, ej. 150.50)"
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!desc.trim() || !uni.trim() || !costo.trim()) return;
              setSaving(true);
              await onSave(desc.trim(), uni.trim(), costo.trim());
              setSaving(false);
            }}
            disabled={saving || !desc.trim() || !uni.trim() || !costo.trim()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ComponenteManoObraFormModal({
  id,
  descripcion,
  unidad,
  costoCentavos,
  onClose,
  onSave,
}: {
  id: string | null;
  descripcion: string;
  unidad: string;
  costoCentavos: string;
  onClose: () => void;
  onSave: (
    descripcion: string,
    unidad: string,
    costoPesosStr: string
  ) => Promise<void>;
}) {
  const [desc, setDesc] = useState(descripcion);
  const [uni, setUni] = useState(unidad);
  const [costo, setCosto] = useState(
    costoCentavos ? (parseInt(costoCentavos, 10) / 100).toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDesc(descripcion);
    setUni(unidad);
    setCosto(costoCentavos ? (parseInt(costoCentavos, 10) / 100).toFixed(2) : "");
  }, [descripcion, unidad, costoCentavos]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          {id ? "Editar componente mano de obra" : "Nuevo componente mano de obra"}
        </h2>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Descripción"
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <input
          type="text"
          value={uni}
          onChange={(e) => setUni(e.target.value)}
          placeholder="Unidad"
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <input
          type="text"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          placeholder="Costo (pesos, ej. 150.50)"
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!desc.trim() || !uni.trim() || !costo.trim()) return;
              setSaving(true);
              await onSave(desc.trim(), uni.trim(), costo.trim());
              setSaving(false);
            }}
            disabled={saving || !desc.trim() || !uni.trim() || !costo.trim()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemFormModal({
  id,
  tarea,
  unidad,
  onClose,
  onSave,
}: {
  id: string | null;
  tarea: string;
  unidad: string;
  onClose: () => void;
  onSave: (tarea: string, unidad: string) => Promise<void>;
}) {
  const [t, setT] = useState(tarea);
  const [u, setU] = useState(unidad);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setT(tarea);
    setU(unidad);
  }, [tarea, unidad]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          {id ? "Editar ítem" : "Nuevo ítem"}
        </h2>
        <input
          type="text"
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="Tarea"
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <input
          type="text"
          value={u}
          onChange={(e) => setU(e.target.value)}
          placeholder="Unidad"
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!t.trim() || !u.trim()) return;
              setSaving(true);
              await onSave(t.trim(), u.trim());
              setSaving(false);
            }}
            disabled={saving || !t.trim() || !u.trim()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ComposicionModal({
  item,
  materials,
  manoObra,
  catalogMateriales,
  catalogManoObra,
  onClose,
  onRefresh,
  onAddMaterial,
  onAddManoObra,
  onSetMaterialDosaje,
  onSetManoObraDosaje,
  onDeleteMaterial,
  onDeleteManoObra,
}: {
  item: ItemCatalogItemDTO;
  materials: ItemMaterialRowDTO[];
  manoObra: ItemManoObraRowDTO[];
  catalogMateriales: ComponenteMaterialItemDTO[];
  catalogManoObra: ComponenteManoObraItemDTO[];
  onClose: () => void;
  onRefresh: () => void;
  onAddMaterial: (itemId: string, componenteId: string, dosajeMilli: number) => Promise<void>;
  onAddManoObra: (itemId: string, componenteId: string, dosajeMilli: number) => Promise<void>;
  onSetMaterialDosaje: (itemId: string, componenteId: string, dosajeMilli: number) => Promise<void>;
  onSetManoObraDosaje: (itemId: string, componenteId: string, dosajeMilli: number) => Promise<void>;
  onDeleteMaterial: (itemId: string, componenteId: string) => Promise<void>;
  onDeleteManoObra: (itemId: string, componenteId: string) => Promise<void>;
}) {
  const [addMaterialSelect, setAddMaterialSelect] = useState("");
  const [addMaterialDosaje, setAddMaterialDosaje] = useState("");
  const [addManoObraSelect, setAddManoObraSelect] = useState("");
  const [addManoObraDosaje, setAddManoObraDosaje] = useState("");
  const [editingDosaje, setEditingDosaje] = useState<{
    type: "material" | "mo";
    componenteId: string;
    value: string;
  } | null>(null);

  const handleAddMaterial = async () => {
    if (!addMaterialSelect || addMaterialDosaje === "") return;
    const milli = parseDosajeMilli(addMaterialDosaje);
    if (milli === null) return;
    await onAddMaterial(item.id, addMaterialSelect, milli);
    setAddMaterialSelect("");
    setAddMaterialDosaje("");
    onRefresh();
  };

  const handleAddManoObra = async () => {
    if (!addManoObraSelect || addManoObraDosaje === "") return;
    const milli = parseDosajeMilli(addManoObraDosaje);
    if (milli === null) return;
    await onAddManoObra(item.id, addManoObraSelect, milli);
    setAddManoObraSelect("");
    setAddManoObraDosaje("");
    onRefresh();
  };

  const saveDosaje = async () => {
    if (!editingDosaje) return;
    const milli = parseDosajeMilli(editingDosaje.value);
    if (milli === null) return;
    if (editingDosaje.type === "material") {
      await onSetMaterialDosaje(item.id, editingDosaje.componenteId, milli);
    } else {
      await onSetManoObraDosaje(item.id, editingDosaje.componenteId, milli);
    }
    setEditingDosaje(null);
    onRefresh();
  };

  const usedMaterialIds = new Set(materials.map((m) => m.componente_id));
  const usedManoObraIds = new Set(manoObra.map((m) => m.componente_id));
  const availableMateriales = catalogMateriales.filter((c) => !usedMaterialIds.has(c.id));
  const availableManoObra = catalogManoObra.filter((c) => !usedManoObraIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-slate-800">
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Composición: {item.tarea} ({item.unidad})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dosaje en unidades por ítem (3 decimales). Costo ítem = Σ(dosaje × costo componente).
          </p>
        </div>
        <div className="p-4 space-y-6">
          <section>
            <h3 className="mb-2 font-medium text-slate-700 dark:text-slate-200">Materiales</h3>
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Descripción</th>
                  <th className="px-3 py-1.5 text-left font-medium">Unidad</th>
                  <th className="px-3 py-1.5 text-right font-medium">Dosaje</th>
                  <th className="w-20 px-3 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {materials.map((row) => (
                  <tr key={row.componente_id} className={rowClassName()}>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">{row.descripcion}</td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">{row.unidad}</td>
                    <td className="px-3 py-1.5 text-right">
                      {editingDosaje?.type === "material" &&
                      editingDosaje?.componenteId === row.componente_id ? (
                        <input
                          type="text"
                          value={editingDosaje.value}
                          onChange={(e) =>
                            setEditingDosaje((p) => (p ? { ...p, value: e.target.value } : null))
                          }
                          onBlur={saveDosaje}
                          onKeyDown={(e) => e.key === "Enter" && saveDosaje()}
                          className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDosaje({
                              type: "material",
                              componenteId: row.componente_id,
                              value: formatDosaje(row.dosaje_milli),
                            })
                          }
                          className="text-slate-700 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                        >
                          {formatDosaje(row.dosaje_milli)}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteMaterial(item.id, row.componente_id);
                          onRefresh();
                        }}
                        className="text-red-600 hover:underline text-xs dark:text-red-400"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {availableMateriales.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={addMaterialSelect}
                  onChange={(e) => setAddMaterialSelect(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="">Agregar material…</option>
                  {availableMateriales.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descripcion} ({c.unidad})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={addMaterialDosaje}
                  onChange={(e) => setAddMaterialDosaje(e.target.value)}
                  placeholder="Dosaje"
                  className="w-24 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
                >
                  Agregar
                </button>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 font-medium text-slate-700 dark:text-slate-200">Mano de obra</h3>
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Descripción</th>
                  <th className="px-3 py-1.5 text-left font-medium">Unidad</th>
                  <th className="px-3 py-1.5 text-right font-medium">Dosaje</th>
                  <th className="w-20 px-3 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {manoObra.map((row) => (
                  <tr key={row.componente_id} className={rowClassName()}>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">{row.descripcion}</td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">{row.unidad}</td>
                    <td className="px-3 py-1.5 text-right">
                      {editingDosaje?.type === "mo" &&
                      editingDosaje?.componenteId === row.componente_id ? (
                        <input
                          type="text"
                          value={editingDosaje.value}
                          onChange={(e) =>
                            setEditingDosaje((p) => (p ? { ...p, value: e.target.value } : null))
                          }
                          onBlur={saveDosaje}
                          onKeyDown={(e) => e.key === "Enter" && saveDosaje()}
                          className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDosaje({
                              type: "mo",
                              componenteId: row.componente_id,
                              value: formatDosaje(row.dosaje_milli),
                            })
                          }
                          className="text-slate-700 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                        >
                          {formatDosaje(row.dosaje_milli)}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteManoObra(item.id, row.componente_id);
                          onRefresh();
                        }}
                        className="text-red-600 hover:underline text-xs dark:text-red-400"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {availableManoObra.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={addManoObraSelect}
                  onChange={(e) => setAddManoObraSelect(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="">Agregar mano de obra…</option>
                  {availableManoObra.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descripcion} ({c.unidad})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={addManoObraDosaje}
                  onChange={(e) => setAddManoObraDosaje(e.target.value)}
                  placeholder="Dosaje"
                  className="w-24 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddManoObra}
                  className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
                >
                  Agregar
                </button>
              </div>
            )}
          </section>
        </div>
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
