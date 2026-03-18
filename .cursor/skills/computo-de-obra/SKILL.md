---
name: computo-de-obra
description: Applies project conventions and technical decisions for the Computo de obra Wails app (Go backend, React frontend, SQLite). Use when working on this repository, adding features, or changing backend/frontend code. Follows ROADMAP.md as source of truth.
---

# Computo de obra – Convenciones del proyecto

## Cuándo usar esta skill

- Implementar pasos del ROADMAP o nuevas funcionalidades en este repo.
- Tocar backend (Go), frontend (React) o esquema SQL.
- Dudas sobre dónde va cada pieza (puertos, repos, DTOs, features).

## Estado actual (para continuar en otro chat)

**Hecho (ROADMAP pasos 1 a 5):**

- **Backend:** ComputoList, ComputoCreate, ComputoGet, **ComputoConfirm**, **ComputoCreateNewVersionFrom**; RubroCatalogList/ListPaged/Get/Create/Update/Delete, ComputoRubrosAdd, ComputoRubrosReorder; ItemCatalogList/ListPaged/Get/Create/Update/Delete, ComputoRubroItemsAdd, ComputoRubroItemsSetCantidad, ComputoRubroItemsTrash, ComputoRubroTrashList, ComputoRubroTrashRestore; ComponenteMaterialList/ListPaged/Get/Create/Update/Delete, ComponenteManoObraList/ListPaged/Get/Create/Update/Delete; ItemCompositionListMaterials/ListManoObra, AddMaterial/AddManoObra, SetMaterialDosaje/SetManoObraDosaje, DeleteMaterial/DeleteManoObra; **MaterialsAll(versionID)**, **ManoObraAll(versionID)** (listados por obra); **BackupDB()** (diálogo y copia de computo.db); **ExportComputoCSVAndSave(versionID)** (CSV materiales + MO, diálogo y guardar). Repos: computo_repo (con Confirm, GetSnapshotForVersion, CreateNewVersionFrom), computo_rubro_repo, computo_rubro_item_repo, rubro_catalog_repo, item_repo, componente_material_repo, componente_mano_obra_repo, item_composition_repo. Puertos en `internal/ports/repositories.go`, DTOs en `internal/app/dto/dto.go`, use cases en `internal/usecase/computos/` (catalogs.go, get.go, confirm.go, **queries.go**).
- **Frontend:** Lista de cómputos, crear cómputo, editor en `/computo/:versionId` con panel rubros, ítems, papelera, totales; **botón Confirmar** (borrador) y **Nueva versión desde esta** (confirmados); pantalla **Catálogos** en `/catalogos` (tablas **@tanstack/react-table**, paginación/búsqueda server-side); **tema claro/oscuro** (selector en barra superior, persistido en `localStorage` clave `computo-theme`); **listados por obra** (Materiales / Mano de obra) en el editor con pestañas; botón **Exportar a CSV** en listados; botón **Backup DB** en la barra superior. API en `src/features/computos/api.ts`; tipos desde `wailsjs/go/models` (dto). Contexto de tema en `src/contexts/ThemeContext.tsx`, componente `ThemeToggle` en `src/components/ThemeToggle.tsx`. **Iconos monocromáticos** (regla en frontend-react.mdc): ThemeToggle con SVG sol/luna; papelera en editor con SVG; preferir `currentColor` en SVGs.
- **Reglas Cursor:** `.cursor/rules/` (project-overview.mdc siempre; backend-go.mdc para *.go; frontend-react.mdc para frontend/**/*.{ts,tsx} – incluye regla de iconos monocromáticos).

**Siguiente paso recomendado:** ROADMAP.md sección 3, **punto 6** (opcional: sync Turso) o mejoras (export Excel/PDF si se desea).

## Decisiones inmutables (no cambiar sin acuerdo)

- **Escalas:** costos en **centavos** (2 decimales); cantidad y dosaje en **milli** (3 decimales). Cálculos en backend con enteros (centavos/milli).
- **PKs:** UUID. Preparado para sync Turso más adelante.
- **Versionado:** `computo_series` (código CO-000001…), `computo_version` (version_n, estado borrador|confirmado). Confirmar → snapshot; nueva versión = clonar desde confirmado.
- **Stack:** Wails v2, Go (internal), React + Vite + Tailwind, SQLite (modernc.org/sqlite, sin CGO).

## Estructura de referencia

| Capa | Ubicación |
|------|-----------|
| Bindings + DTOs | `internal/app/` (`app.go`, `dto/dto.go`) |
| Interfaces | `internal/ports/repositories.go` |
| Casos de uso | `internal/usecase/computos/` |
| DB + repos | `internal/infra/sqlite/` (db.go, migrations/, repositories/) |
| Rutas frontend | `frontend/src/app/App.tsx` |
| Feature cómputos | `frontend/src/features/computos/` (api.ts, pages/, components/) |
| Bindings generados | `frontend/wailsjs/go/app/App`, `wailsjs/go/models` (namespace `dto`) |

## Flujo de datos

- **Backend:** App llama use case → use case usa repos (puertos); DTOs solo en `internal/app/dto` y se exponen al frontend vía bindings.
- **Frontend:** En cada feature, `api.ts` importa funciones de `wailsjs/go/app/App` y tipos de `wailsjs/go/models`; reexporta tipos para el resto del feature. Para estado derivado (p. ej. editor con totales recalculados) usar interfaces locales (shape-only), no instancias de clases DTO de Wails.

## Fuente de verdad

- **ROADMAP.md:** pasos a seguir, contrato API, entidades y flujo. Actualizar cuando se avance o se cambien decisiones.
- **Esquema SQL:** `internal/infra/sqlite/migrations/*.sql`. Migraciones seed: **0004** rubros, **0005** ítems (`genitems`), **0006** mano de obra (`MANODEOBRA.txt`, pesos→centavos, id `…-6000-…`). Regenerar: `go run ./internal/infra/sqlite/cmd/genmanoobra`.
- **Contrato API y DTOs:** ROADMAP sección 2 + `internal/app/dto/dto.go`.

## Actualizar esta skill

Al avanzar el desarrollo: actualizar la sección **Estado actual** (qué está hecho y cuál es el siguiente paso); añadir decisiones o convenciones nuevas si las hay; mantener la skill concisa. El detalle del contrato API y pasos está en **ROADMAP.md**.
