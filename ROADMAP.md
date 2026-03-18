# ROADMAP – Computo de obra

## 1. Objetivo de la sesión

Definir arquitectura, modelo de datos y flujo de la app de escritorio (Wails), e implementar la base: estructura Go + SQLite, pantalla principal con listado de cómputos y creación de un nuevo cómputo (primera versión en borrador).

---

## 2. Lo construido y decisiones técnicas

### Backend (Go)
- **Estructura:** `main.go` en raíz; `internal/app` (bindings Wails + DTOs); `internal/ports` (interfaces); `internal/usecase/computos`; `internal/infra/sqlite` (DB + repos); `internal/platform/paths` (AppDataDir para DB).
- **DB:** SQLite vía `modernc.org/sqlite` (pure Go, sin CGO). Ruta: `UserConfigDir()/computo-de-obra/computo.db`. Migraciones embebidas en `internal/infra/sqlite/migrations/` (0001 catálogos, 0002 series/versiones, 0003 snapshot, **0004 seed rubros** (`RUBROS.txt`), **0005 seed ítems** (`ITEMS_.txt`), **0006 seed mano de obra** (`MANODEOBRA.txt`)); tabla `_schema_version` para aplicar solo pendientes.
- **Escalas numéricas:** costos en **centavos** (2 decimales), cantidad y dosaje en **milli** (3 decimales). UUID para PKs (preparado para sync Turso).
- **Versionado:** `computo_series` (codigo CO-000001…), `computo_version` (version_n, estado borrador|confirmado, parent_version_id). Al confirmar se persiste snapshot; “volver a borrador” = nueva versión clonada.
- **Implementado:** `ComputoList()`, `ComputoCreate(descripcion, superficieMilli, fechaInicio)` en `internal/app`; repo en `internal/infra/sqlite/repositories/computo_repo.go`.

### Frontend (React + Vite + Tailwind)
- **Estructura:** `src/app/App.tsx` (HashRouter, rutas); `src/features/computos/` (api.ts, pages, components).
- **Rutas:** `/` → lista de cómputos; `/computo/:versionId` → editor (placeholder).
- **Pantalla principal:** tabla (código, versión, descripción, fecha, m², estado, total, costo/m²), botón “Nuevo cómputo”, “Abrir” por fila. Diálogo crear: descripción, superficie (m²), fecha inicio; al crear redirige a `/computo/:versionId`.
- **Bindings:** Wails genera `wailsjs/go/app/App` (funciones) y `wailsjs/go/models` (namespace `dto` con DTOs). En `features/computos/api.ts` se importan funciones de App y tipos de models; se reexportan tipos para el resto del frontend.

### Contrato API (definido, no todo implementado)
- Computos: List, Create, Get, **SetSuperficie(versionID, superficieMilli)** (actualiza costo/m² en snapshot si está confirmado), Confirm, CreateNewVersionFrom.
- Rubros del cómputo: CatalogList, ComputoRubrosAdd, Reorder; ítems por rubro: Add, SetCantidad, Trash, TrashList, Restore.
- Catálogos globales: CRUD rubros, ítems, componentes material/MO; ítem-composición (dosaje_milli).
- Consultas: MaterialsByItem, MaterialsAll, ManoObraAll.
- Export: CSV/Excel/PDF. Backup manual de DB.

### Entidades y flujo acordado
- **Global:** Rubro, ComponenteMaterial, ComponenteManoObra, Item, ItemMaterial, ItemManoObra (dosaje_milli).
- **Por computo:** Comitente (descripción, superficie_milli, fecha_inicio); selección/orden de rubros; por rubro: ítems con cantidad_milli. Totales en vivo; papelera por rubro (soft delete). Confirmar → snapshot congelado; nueva versión desde confirmado.

---

## 3. Pasos para continuar (chat nuevo)

1. **Editor de cómputo (borrador)**  
   Backend: `ComputoGet(versionID)` (header + rubros con ítems y totales); puertos/repo para `computo_rubro` y `computo_rubro_item`. Frontend: pantalla editor con panel rubros (ordenables), panel ítems del rubro seleccionado (cantidad editable), panel totales (material, MO, subtotal rubro, total obra, costo/m²). Undo/Redo de cantidades solo en memoria (frontend).

2. **Rubros e ítems en el computo**  
   Backend: `RubroCatalogList`, `ComputoRubrosAdd(versionID, rubroID)`, `ComputoRubrosReorder`; `ItemCatalogList`, `ComputoRubroItemsAdd`, `ComputoRubroItemsSetCantidad`, `ComputoRubroItemsTrash`, `ComputoRubroTrashList`, `ComputoRubroTrashRestore`. Frontend: selectores/diálogos para agregar rubro/ítem; papelera por rubro con lista y restaurar.

3. **Catálogos globales** ✅  
   Backend: CRUD rubros (Get, Create, Update, Delete), componentes material, componentes mano de obra, ítems; ítem-composición (dosaje_milli): ListMaterials/ListManoObra, Add, SetDosaje, Delete. **Listados paginados:** `RubroCatalogListPaged`, `ComponenteMaterialListPaged`, `ComponenteManoObraListPaged`, `ItemCatalogListPaged(q, limit, offset)` → `{ items, total }` (búsqueda en SQLite por subcadena). Frontend `/catalogos`: buscador + paginación por pestaña; tablas con **@tanstack/react-table** (columnas declarativas, misma paginación server-side); modal Composición carga catálogos completos al abrir. Editor: sigue `RubroCatalogList` / `ItemCatalogList`. Pendiente: carga masiva (formato a definir).

4. **Confirmar y nueva versión** ✅  
   Backend: `ComputoConfirm(versionID)` (calcular totales y persistir en tablas computo_snapshot*); `ComputoCreateNewVersionFrom(versionIDConfirmado)` (clonar desde snapshot a nuevo borrador). Frontend: botón Confirmar (solo borrador), botón “Nueva versión desde esta” (solo confirmados); barra de app con selector de tema claro/oscuro (persistido en localStorage).

5. **Consultas y export** ✅  
   Listados materiales/mano de obra (por ítem y por obra): **por ítem** ya existía; **por obra**: MaterialsAll(versionID), ManoObraAll(versionID); en el editor, sección «Listados por obra» con pestañas Materiales / Mano de obra. **Export CSV**: ExportComputoCSVAndSave(versionID) genera CSV (materiales + mano de obra) con separador `;`, abre diálogo «Guardar como» y escribe el archivo; botón «Exportar a CSV» en la sección listados. **Backup manual**: BackupDB() abre diálogo y copia `computo.db` a la ruta elegida; botón «Backup DB» en la barra superior. Pendiente opcional: export Excel/PDF (mismo contenido que CSV).

6. **Opcional (más adelante)**  
   Sync con Turso: pull en otro equipo, push de cambios; IDs y `updated_at` ya preparados.

---

**Referencias rápidas:** Esquema SQL en `internal/infra/sqlite/migrations/*.sql`. DTOs en `internal/app/dto/dto.go`. Rutas frontend en `src/app/App.tsx`. API de cómputos en `src/features/computos/api.ts` (importar tipos desde `wailsjs/go/models` namespace `dto`).
